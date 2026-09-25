const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { Client } = require('pg');
const { readSources, snapshot, insertOperations, validateSchema, verify } = require('../import-fleetio.cjs');
const { buildPlan } = require('./fleetio-plan.cjs');

test('real PostgreSQL import preserves existing rows, source JSON and idempotency; transaction rolls back', { skip: process.env.FLEETIO_TEST_DB !== '1' }, async () => {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
  assert.equal(url.pathname, '/fleetio_maintenance_verify');
  assert.ok(process.env.FLEETIO_TOOL_EXPORT);
  const db = new Client({ connectionString: url.toString() });
  await db.connect();
  try {
    await db.query('BEGIN');
    const companyId = 'cmlerq90j000js6relyc2aetj';
    await db.query('INSERT INTO "Company" (id,name,"updatedAt") VALUES ($1,$2,now())', [companyId, 'Allied Construction']);
    await db.query('INSERT INTO "User" (id,email,password,"firstName","lastName",role,"companyId","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,now())', ['import-test-admin', 'bdeller@alliedconstruction.net', 'NON_LOGIN_TEST_VALUE', 'Brian', 'Deller', 'ADMIN', companyId]);
    await db.query('INSERT INTO "InventoryMaterial" (id,name,unit,quantity,"companyId","updatedAt") VALUES ($1,$2,$3,7,$4,now())', ['existing-material', 'Existing material', 'Each', companyId]);
    const { data } = readSources(path.resolve(__dirname, '../../Attachments'), process.env.FLEETIO_TOOL_EXPORT);
    const options = require('./allied-followup-2026-09-23.cjs');
    const empty = await snapshot(db, true);
    await insertOperations(db, buildPlan(data, empty, options).operations);
    const before = await snapshot(db, true);
    const plan = buildPlan(data, before, { ...options, maintenance: true });
    const columns = (await db.query('SELECT table_name,column_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema=current_schema()')).rows;
    validateSchema(plan.operations, columns);
    assert.equal(plan.summary.byTable.WorkOrder, 99);
    assert.equal(plan.summary.byTable.AssetServiceEntry, 204);
    await insertOperations(db, plan.operations);
    const after = await snapshot(db, true);
    verify(before, after, plan);
    assert.equal(after.tables.InventoryMaterial.find(r => r.id === 'existing-material').quantity, 7);
    assert.equal(after.tables.User.length, 1);
    assert.equal(buildPlan(data, after, { ...options, maintenance: true }).operations.length, 0);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM "MaintenanceRecord"')).rows[0].count, 0);
    assert.equal(after.tables.AssetServiceEntry.filter(r => r.workOrderId).length, 97);
    assert.equal(after.tables.WorkOrder.reduce((n, r) => n + r.sourceData.lineItems.length, 0), 251);
    await db.query('ROLLBACK');
    assert.equal((await db.query('SELECT count(*)::int AS count FROM "Company" WHERE id=$1', [companyId])).rows[0].count, 0);
  } finally {
    await db.query('ROLLBACK');
    await db.end();
  }
});
