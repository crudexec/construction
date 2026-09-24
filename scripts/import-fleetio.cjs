#!/usr/bin/env node
// Defaults to a READ ONLY dry run. --apply requires the exact dry-run plan digest.
const fs = require('node:fs');
const path = require('node:path');
const Papa = require('papaparse');
const { Client } = require('pg');
const { buildPlan, hash } = require('./imports/fleetio-plan.cjs');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
const FILES = ['contacts', 'fuel_entries', 'issues', 'meter_entries', 'parts', 'purchase_orders', 'service_entries', 'vehicle_assignments', 'vehicles', 'vendors', 'work_order_line_items', 'work_order_sub_line_items', 'work_orders'];
const DIRECT = ['Asset', 'Vendor', 'Contact', 'AssetYard'];
const ASSET_CHILDREN = ['AssetRentalRate', 'AssetMeterReading', 'AssetIssue', 'AssetJobAssignment', 'AssetPersonAssignment'];
const WRITABLE = new Set(['Vendor', 'Contact', 'AssetYard', 'Asset', 'VendorContact', ...ASSET_CHILDREN]);
const COMPANY_ID = 'cmlerq90j000js6relyc2aetj';
const EMAIL = 'bdeller@alliedconstruction.net';

function readSources(directory, toolsFile) {
  const data = {}, fingerprints = {};
  const sourcePaths = Object.fromEntries(FILES.map(file => [file, path.join(directory, `${file}.csv`)]));
  if (toolsFile) sourcePaths.tools = path.resolve(toolsFile);
  const expectedHeaders = { vehicles: ['Fleetio ID', 'Name', 'Type', 'Status', 'VIN/SN'], vendors: ['Fleetio ID', 'Name'], contacts: ['Fleetio ID', 'Full Name'], meter_entries: ['Fleetio ID', 'Vehicle Name', 'Meter Value', 'Void', 'Date'], issues: ['Fleetio ID', 'Asset Name', 'Issue Status'], vehicle_assignments: ['fleetio_id (do not edit)', 'vehicle_name', 'contact_name', 'started_at', 'ended_at'] };
  expectedHeaders.tools = ['Fleetio ID', 'Name', 'Brand', 'Model', 'Serial Number', 'Status', 'Type', 'Purchase Date'];
  for (const [file, sourcePath] of Object.entries(sourcePaths)) {
    const input = fs.readFileSync(sourcePath, 'utf8');
    const parsed = Papa.parse(input, { header: true, skipEmptyLines: 'greedy' });
    if (parsed.errors.length || (expectedHeaders[file] || []).some(header => !parsed.meta.fields.includes(header))) throw new Error(`Invalid CSV or missing required headers: ${file}`);
    data[file] = parsed.data.map((row, index) => ({ ...row, __row: index + 2 }));
    fingerprints[file] = hash(input);
  }
  return { data, fingerprints, sourcePaths };
}

async function snapshot(db) {
  const accounts = (await db.query('SELECT u.id,u.email,u.role,u."isActive",u."companyId",c.name AS "companyName" FROM "User" u JOIN "Company" c ON c.id=u."companyId" WHERE lower(u.email)=lower($1)', [EMAIL])).rows;
  if (accounts.length !== 1 || accounts[0].companyId !== COMPANY_ID) throw new Error('Target company identity mismatch');
  const account = accounts[0], tables = {};
  for (const table of DIRECT) {
    // Authentication secrets are never read into a snapshot.
    const projection = table === 'Vendor' ? `to_jsonb(t) - ARRAY['portalPassword','portalToken','portalTokenExpiry']` : 'to_jsonb(t)';
    tables[table] = (await db.query(`SELECT ${projection} AS row FROM "${table}" t WHERE "companyId"=$1 ORDER BY id`, [COMPANY_ID])).rows.map(r => r.row);
  }
  for (const table of ASSET_CHILDREN) tables[table] = (await db.query(`SELECT to_jsonb(t) AS row FROM "${table}" t JOIN "Asset" a ON a.id=t."assetId" WHERE a."companyId"=$1 ORDER BY t.id`, [COMPANY_ID])).rows.map(r => r.row);
  tables.VendorContact = (await db.query('SELECT to_jsonb(t) AS row FROM "VendorContact" t JOIN "Vendor" v ON v.id=t."vendorId" WHERE v."companyId"=$1 ORDER BY t.id', [COMPANY_ID])).rows.map(r => r.row);
  tables.User = (await db.query('SELECT id,email,"firstName","lastName",role,"isActive" FROM "User" WHERE "companyId"=$1 ORDER BY id', [COMPANY_ID])).rows;
  return { account, tables };
}

async function insertOperations(db, operations) {
  if (operations.some(op => !WRITABLE.has(op.table))) throw new Error('Unsupported write target');
  for (const table of WRITABLE) {
    const planned = operations.filter(op => op.table === table);
    if (!planned.length) continue;
    // Operations may have different optional fields. Group by shape, use small batches.
    const shapes = new Map();
    for (const operation of planned) {
      const columns = Object.keys(operation.row).sort();
      const key = columns.join(',');
      shapes.set(key, { columns, rows: [...(shapes.get(key)?.rows || []), operation.row] });
    }
    for (const { columns, rows } of shapes.values()) {
      if (columns.some(c => !/^[A-Za-z][A-Za-z0-9]*$/.test(c))) throw new Error('Invalid SQL column');
      for (let start = 0; start < rows.length; start += 100) {
        const values = [];
        const tuples = rows.slice(start, start + 100).map(row => `(${columns.map(column => { values.push(row[column]); return `$${values.length}`; }).join(',')})`);
        // No ON CONFLICT overwrite or silent skip. Unexpected collisions abort the transaction.
        await db.query(`INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(',')}) VALUES ${tuples.join(',')}`, values);
      }
    }
  }
}

function validateSchema(operations, columns) {
  for (const op of operations) {
    const schema = columns.filter(column => column.table_name === op.table);
    if (!schema.length || Object.keys(op.row).some(key => !schema.some(column => column.column_name === key))) throw new Error(`Column mismatch: ${op.table}`);
    for (const column of schema) {
      if (column.is_nullable === 'NO' && (op.row[column.column_name] === null || (!(column.column_name in op.row) && column.column_default === null))) throw new Error(`Missing required field: ${op.table}.${column.column_name}`);
    }
  }
}

function verify(before, after, plan) {
  for (const [table, oldRows] of Object.entries(before.tables)) {
    const byId = new Map(after.tables[table].map(row => [row.id, row]));
    for (const row of oldRows) if (hash(byId.get(row.id)) !== hash(row)) throw new Error(`Existing record changed in ${table}`);
    const inserted = plan.operations.filter(op => op.table === table);
    if (after.tables[table].length !== oldRows.length + inserted.length) throw new Error(`Count reconciliation failed: ${table}`);
    for (const op of inserted) {
      const actual = byId.get(op.row.id);
      if (!actual) throw new Error(`Missing inserted record in ${table}`);
      for (const [key, value] of Object.entries(op.row)) {
        const got = actual[key];
        // Prisma stores UTC in PostgreSQL timestamp-without-time-zone columns.
        const storedDate = typeof got === 'string' && !/(?:Z|[+-]\d{2}:?\d{2})$/.test(got) ? `${got}Z` : got;
        const same = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) ? new Date(storedDate).getTime() === new Date(value).getTime() : got === value;
        if (!same) throw new Error(`Value reconciliation failed: ${table}.${key}`);
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (Object.hasOwn(parsed, flag)) throw new Error('Duplicate argument');
    if (['--apply', '--client-followup'].includes(flag)) parsed[flag] = true;
    else if (['--expect-plan', '--tools'].includes(flag) && args[i + 1] && !args[i + 1].startsWith('--')) parsed[flag] = args[++i];
    else throw new Error('Unknown argument or missing value');
  }
  const apply = !!parsed['--apply'], expectedDigest = parsed['--expect-plan'];
  if (parsed['--tools'] && !parsed['--client-followup']) throw new Error('Tools require the reviewed --client-followup mapping');
  const options = parsed['--client-followup'] ? require('./imports/allied-followup-2026-09-23.cjs') : {};
  if (apply && !/^[a-f0-9]{64}$/.test(expectedDigest || '')) throw new Error('--apply requires --expect-plan <dry-run digest>');
  const url = new URL(process.env.DATABASE_URL);
  if (url.hostname !== '89.116.44.96' || url.pathname !== '/postgres') throw new Error('Unexpected database endpoint');
  const { data, fingerprints, sourcePaths } = readSources(path.join(root, 'Attachments'), parsed['--tools']);
  const db = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 10000, statement_timeout: 30000, application_name: 'allied-fleetio-import' });
  const reportDirectory = fs.mkdtempSync(path.join(root, '.import-reports', apply ? 'apply-' : 'preview-'));
  fs.chmodSync(reportDirectory, 0o700);
  const report = (name, value) => fs.writeFileSync(path.join(reportDirectory, name), JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' });
  let transaction = false;
  try {
    await db.connect();
    await db.query(apply ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    transaction = true;
    if (apply) await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`fleetio:${COMPANY_ID}`]);
    const before = await snapshot(db);
    const plan = buildPlan(data, before, options);
    const columns = (await db.query('SELECT table_name,column_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=ANY($1::text[])', [[...WRITABLE]])).rows;
    validateSchema(plan.operations, columns);
    const digest = hash({ version: 2, fingerprints, options, account: before.account, operations: plan.operations, dispositions: plan.dispositions });
    report('plan.json', { digest, fingerprints, options, ...plan });
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'preview', company: before.account.companyName, digest, summary: plan.summary, warnings: plan.warnings, reportDirectory }, null, 2));
    if (!apply) { await db.query('ROLLBACK'); transaction = false; return; }
    if (digest !== expectedDigest) throw new Error('Plan changed since dry run; no writes performed');
    report('before.json', before);
    const archiveDirectory = path.join(reportDirectory, 'sources');
    fs.mkdirSync(archiveDirectory, { mode: 0o700 });
    for (const [file, sourcePath] of Object.entries(sourcePaths)) {
      const input = fs.readFileSync(sourcePath, 'utf8');
      if (hash(input) !== fingerprints[file]) throw new Error('Source changed during preview');
      fs.writeFileSync(path.join(archiveDirectory, `${file}.csv`), input, { mode: 0o600, flag: 'wx' });
    }
    await insertOperations(db, plan.operations);
    const after = await snapshot(db);
    verify(before, after, plan);
    // Must be a no-op when rerun against the resulting state.
    if (buildPlan(data, after, options).operations.length !== 0) throw new Error('Import is not idempotent');
    report('verified-before-commit.json', { digest, counts: Object.fromEntries(Object.entries(after.tables).map(([table, rows]) => [table, rows.length])), inserted: plan.operations.map(op => ({ table: op.table, id: op.row.id })) });
    await db.query('COMMIT'); transaction = false;
    report('committed.json', { digest, committedAt: new Date().toISOString(), inserted: plan.summary.byTable });
    // Separate read verifies persisted state, not just the in-transaction image.
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'); transaction = true;
    const persisted = await snapshot(db);
    verify(before, persisted, plan);
    await db.query('ROLLBACK'); transaction = false;
    report('verified-after-commit.json', { digest, verifiedAt: new Date().toISOString(), unchangedExistingRows: true, idempotent: true });
    console.log('COMMITTED_AND_VERIFIED');
  } finally {
    if (transaction) await db.query('ROLLBACK').catch(() => {});
    await db.end();
  }
}
if (require.main === module) {
  fs.mkdirSync(path.join(root, '.import-reports'), { recursive: true, mode: 0o700 });
  main().catch(error => { console.error('Import stopped:', error.code || error.message); if (error.code === '42703') console.error(error.message); process.exitCode = 1; });
}
module.exports = { readSources, verify, insertOperations, validateSchema };
