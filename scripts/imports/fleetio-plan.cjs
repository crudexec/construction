// Insert-only Fleetio import. No accounts, invitations, or synthetic projects.
const { createHash } = require('node:crypto');
const norm = value => String(value ?? '').trim().toLowerCase();
const optional = value => String(value ?? '').trim() || null;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const idFor = (companyId, entity, sourceId) => `fleetio_${hash([companyId, entity, String(sourceId)]).slice(0, 32)}`;
const groups = (rows, key) => {
  const map = new Map();
  for (const row of rows) { const k = key(row); map.set(k, [...(map.get(k) || []), row]); }
  return map;
};

function number(value, { integer = false } = {}) {
  if (!optional(value)) return null;
  const text = String(value).trim().replace(/^\$/, '');
  if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text)) throw new Error(`Invalid numeric value: ${value}`);
  const result = Number(text.replaceAll(',', ''));
  if (!Number.isFinite(result) || (integer && !Number.isSafeInteger(result))) throw new Error('Invalid numeric range');
  return result;
}

// Fleetio's slash dates are Pacific local time. ISO assignments carry their own offset.
// Reject ambiguous/nonexistent DST wall times rather than guessing.
function date(value, dateOnly = false) {
  if (!optional(value)) return null;
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [+-]\d{4}$/.test(text)) {
    const result = new Date(text.replace(' ', 'T').replace(' ', ''));
    if (!Number.isFinite(result.getTime())) throw new Error('Invalid offset timestamp');
    return result.toISOString();
  }
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{2}):(\d{2}):(\d{2}) (AM|PM))?$/);
  if (!match) throw new Error(`Invalid date format: ${value}`);
  const [, mo, day, year, hour, minute, second, ampm] = match;
  if (hour && (+hour < 1 || +hour > 12)) throw new Error('Invalid clock hour');
  const h = hour ? +hour % 12 + (ampm === 'PM' ? 12 : 0) : 0;
  const parts = [+year, +mo, +day, h, +(minute || 0), +(second || 0)];
  const utc = Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
  const d = new Date(utc);
  if (d.getUTCFullYear() !== parts[0] || d.getUTCMonth() + 1 !== parts[1] || d.getUTCDate() !== parts[2] || d.getUTCHours() !== h || d.getUTCMinutes() !== parts[4] || d.getUTCSeconds() !== parts[5]) throw new Error('Invalid calendar date');
  if (dateOnly) return d.toISOString();
  const format = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const candidates = [7, 8].map(offset => new Date(utc + offset * 3600000)).filter(candidate => {
    const p = Object.fromEntries(format.formatToParts(candidate).map(x => [x.type, x.value]));
    return [p.year, p.month, p.day, p.hour, p.minute, p.second].map(Number).every((v, i) => v === parts[i]);
  });
  if (candidates.length !== 1) throw new Error('Ambiguous or nonexistent Pacific date');
  return candidates[0].toISOString();
}

const LOCATION_CONTACTS = new Set(['0 - Office', '1 - Farm', "2 - Kris' Shop", '3 - NC Machinery', '894 - West Woodland Elementary School', '898 - 132nd Square Park', '900 - Wallace River Hatchery', '901- Airport Recycling & Transfer Station Scale Repl', '902 - Kirkland Heights Building Renovations', '903 - Fire Station 22', '904 - Scriber Lake Village', '905 - Seaway Clear & Grade', '906 - Kirkland Heights Redevelopment', '910 - Edmonds Boys and Girls Club Demo', '911 - Lee Forest Reservoir']);
const YARDS = new Set(['0 - Office', '1 - Farm', "2 - Kris' Shop", '3 - NC Machinery']);
const VEHICLE_CATEGORIES = new Set(['Car', 'Dump Truck', 'Pickup', 'Pickup Truck', 'Jetter Truck', 'Service Truck', 'Sweeper', 'Vactor Truck', 'Water Truck', 'Water Trailer']);
const EQUIPMENT_CATEGORIES = new Set(['Articulated Dump Truck', 'Backhoe', 'Boom Lift', 'Articulated Boom Lift', 'Crane', 'Bulldozer', 'Excavator', 'Forklift', 'Mower', 'Mini Excavator', 'Motor Grader', 'Other', 'Roller', 'Scissor Lift', 'Wheel Loader']);
const STATUS = { Active: 'AVAILABLE', Sold: 'RETIRED', 'Out of Service': 'UNDER_MAINTENANCE', 'In Shop': 'UNDER_MAINTENANCE', 'Ready for Auction': 'RETIRED', Stolen: 'LOST_DAMAGED', 'Waiting on Parts': 'UNDER_MAINTENANCE' };
const CREATED = 'Created On (Pacific Time (US & Canada))';
const UPDATED = 'Updated On (Pacific Time (US & Canada))';
const ARCHIVED = 'Archived At (Pacific Time (US & Canada))';
const timestampFields = row => ({ createdAt: date(row[CREATED]), updatedAt: date(row[UPDATED]) });
const sourceNotes = (file, row, omit = []) => `Imported from Fleetio ${file}. Source fields (historical snapshot):\n${Object.entries(row).filter(([key, value]) => optional(value) && !omit.includes(key)).map(([key, value]) => `${key}: ${value}`).join('\n')}`;

function resolveAsset(candidates, metadata = {}) {
  const matches = (candidates || []).filter(asset => !metadata.kind || asset.sourceKind === metadata.kind);
  if (matches.length === 1 && !matches[0].requiresDisambiguation) {
    const source = matches[0].source;
    const serial = source['VIN/SN'] || source['Serial Number'];
    if (optional(metadata.serial) && optional(serial) && norm(metadata.serial) !== norm(serial)) return null;
    return matches[0];
  }
  if (optional(metadata.serial)) {
    const exact = matches.filter(a => norm(a.source['VIN/SN'] || a.source['Serial Number']) === norm(metadata.serial));
    return exact.length === 1 ? exact[0] : null;
  }
  // A name alone cannot disambiguate the two historical BL1 records.
  if (optional(metadata.year) && optional(metadata.make)) {
    const exact = matches.filter(a => norm(a.source.Year) === norm(metadata.year) && norm(a.source.Make || a.source.Brand) === norm(metadata.make) && (!optional(metadata.model) || norm(a.source.Model) === norm(metadata.model)));
    return exact.length === 1 ? exact[0] : null;
  }
  return null;
}

function buildPlan(data, snapshot, options = {}) {
  const { account, tables } = snapshot;
  const companyId = account.companyId;
  if (account.email !== 'bdeller@alliedconstruction.net' || account.companyName !== 'Allied Construction' || account.role !== 'ADMIN' || !account.isActive) throw new Error('Target account guard failed');
  const operations = [], dispositions = [], warnings = [];
  const existing = table => tables[table] || [];
  const disposition = (file, row, status, reason) => dispositions.push({ file, row: row.__row, sourceId: row['Fleetio ID'] || row['fleetio_id (do not edit)'] || null, status, reason });
  const hold = (file, row, reason) => disposition(file, row, 'held', reason);
  const add = (table, sourceId, fields) => {
    const id = idFor(companyId, table, sourceId);
    if (existing(table).some(row => row.id === id)) return { id, isNew: false };
    if (operations.some(op => op.table === table && op.row.id === id)) throw new Error('Duplicate planned key');
    operations.push({ table, row: { id, ...fields } });
    return { id, isNew: true };
  };
  const record = (file, row, ref) => disposition(file, row, ref.isNew ? 'import' : 'already_imported', null);
  const uniqueSource = file => {
    const result = [];
    for (const [key, rows] of groups(data[file] || [], r => r['Fleetio ID'])) {
      if (!key) throw new Error(`Missing source ID in ${file}`);
      const signatures = new Set(rows.map(({ __row, ...rest }) => hash(rest)));
      if (signatures.size !== 1) { rows.forEach(r => hold(file, r, 'Conflicting source ID')); continue; }
      result.push(rows[0]);
      rows.slice(1).forEach(r => disposition(file, r, 'duplicate', 'Identical exported row'));
    }
    return result;
  };
  const userFor = (name, email) => {
    const matches = existing('User').filter(u => (optional(email) && norm(u.email) === norm(email)) || norm(`${u.firstName} ${u.lastName}`) === norm(name));
    return matches.length === 1 ? matches[0] : null;
  };
  const vendors = new Map();
  const vendorImportIds = new Set((data.vendors || []).map(r => idFor(companyId, 'Vendor', r['Fleetio ID'])));
  for (const row of uniqueSource('vendors')) {
    const matches = existing('Vendor').filter(v => !vendorImportIds.has(v.id) && (norm(v.name) === norm(row.Name) || norm(v.companyName) === norm(row.Name)));
    if (matches.length) { hold('vendors', row, 'Existing vendor name requires review; not overwritten or merged'); continue; }
    const supplies = ['Tools', 'Parts', 'Vehicle', 'Fuel', 'Charging'].some(k => row[k] === 'TRUE');
    const ref = add('Vendor', row['Fleetio ID'], { companyId, name: row.Name, companyName: row.Name, phone: optional(row.Phone), address: [row['Street Address'], row['Street Address Line 2']].filter(Boolean).join('\n') || null, city: optional(row.City), state: optional(row['State/Province/Region']), zipCode: optional(row['Postal Code']), website: optional(row.Website), type: row.Service === 'TRUE' ? (supplies ? 'SUPPLY_AND_INSTALLATION' : 'INSTALLATION') : (supplies ? 'SUPPLY' : 'SUPPLY_AND_INSTALLATION'), status: row[ARCHIVED] ? 'INACTIVE' : 'PENDING_VERIFICATION', isActive: !row[ARCHIVED], notes: sourceNotes('vendors.csv', row, ['__row']), ...timestampFields(row) });
    vendors.set(norm(row.Name), [...(vendors.get(norm(row.Name)) || []), ref.id]);
    record('vendors', row, ref);
    if (row['Contact Name'] || row['Contact Email'] || row['Contact Phone']) {
      // Keep unsplit names intact; no invented surname.
      add('VendorContact', row['Fleetio ID'], { vendorId: ref.id, firstName: row['Contact Name'] || 'Fleetio contact', lastName: '', email: optional(row['Contact Email']), phone: optional(row['Contact Phone']), isPrimary: true, ...timestampFields(row) });
    }
  }
  const contacts = uniqueSource('contacts');
  const contactNames = groups(contacts, r => norm(r['Full Name']));
  const yards = new Map();
  for (const row of contacts) {
    const name = row['Full Name'];
    if (LOCATION_CONTACTS.has(name)) {
      if (YARDS.has(name)) {
        const matches = existing('AssetYard').filter(y => norm(y.name) === norm(name));
        const ref = matches.length === 1 ? { id: matches[0].id, isNew: false } : add('AssetYard', row['Fleetio ID'], { companyId, name, createdAt: date(row[CREATED]) });
        yards.set(name, ref.id); record('contacts', row, ref);
      } else disposition('contacts', row, 'location_snapshot', 'Job name retained in location history; no synthetic project created');
      continue;
    }
    if (contactNames.get(norm(name)).length > 1 || name === 'Guest User') { hold('contacts', row, 'Duplicate or generic person requires review'); continue; }
    if (userFor(name, row.Email)) { disposition('contacts', row, 'existing_user', 'Existing user retained without modification'); continue; }
    const matches = existing('Contact').filter(c => c.id !== idFor(companyId, 'Contact', row['Fleetio ID']) && ((row.Email && norm(c.email) === norm(row.Email)) || norm(`${c.firstName} ${c.lastName}`) === norm(name)));
    if (matches.length) { hold('contacts', row, 'Existing contact requires review'); continue; }
    const ref = add('Contact', row['Fleetio ID'], { companyId, firstName: row['First Name'], lastName: row['Last Name'], email: optional(row.Email), phone: optional(row['Mobile Phone Number'] || row['Work Phone Number'] || row['Home Phone Number'] || row['Other Phone Number']), position: optional(row['Job Title']), ...timestampFields(row) });
    record('contacts', row, ref);
  }
  const vehicles = uniqueSource('vehicles');
  const equipmentName = row => options.equipmentNames?.[row['Fleetio ID']] || row.Name;
  const assetNames = groups(vehicles, r => norm(equipmentName(r)));
  const originalAssetNames = groups(vehicles, r => norm(r.Name));
  const assets = new Map();
  const registerAsset = (name, asset) => assets.set(norm(name), [...(assets.get(norm(name)) || []), asset]);
  for (const row of vehicles) {
    const name = equipmentName(row);
    if (assetNames.get(norm(name)).length !== 1) { hold('vehicles', row, 'Duplicate Equipment ID/name'); continue; }
    if (!name || name.length > 100 || row.Type.length > 100) throw new Error('Invalid asset identity');
    const matches = existing('Asset').filter(a => a.id !== idFor(companyId, 'Asset', row['Fleetio ID']) && (norm(a.name) === norm(name) || norm(a.equipmentId) === norm(name) || (row['VIN/SN'] && [norm(a.vin), norm(a.serialNumber)].includes(norm(row['VIN/SN'])))));
    if (matches.length) { hold('vehicles', row, 'Existing asset requires review'); continue; }
    const type = VEHICLE_CATEGORIES.has(row.Type) ? 'VEHICLE' : EQUIPMENT_CATEGORIES.has(row.Type) ? 'EQUIPMENT' : null;
    if (!type || !STATUS[row.Status]) throw new Error('Unmapped asset type or status');
    const status = row[ARCHIVED] && row.Status !== 'Stolen' ? 'RETIRED' : STATUS[row.Status];
    const vendorMatches = vendors.get(norm(row['Purchase Vendor Name'])) || [];
    if (row['Purchase Vendor Name'] && vendorMatches.length !== 1) warnings.push({ file: 'vehicles', row: row.__row, reason: 'Purchase vendor link unresolved; original retained in notes' });
    const fields = { companyId, equipmentId: row.Name, name: row.Name, type, category: row.Type, status, customStatusNote: `Fleetio: ${row.Status}${row[ARCHIVED] ? `; archived ${row[ARCHIVED]}` : ''}`, make: optional(row.Make), model: optional(row.Model), year: number(row.Year, { integer: true }), vin: type === 'VEHICLE' ? optional(row['VIN/SN']) : null, serialNumber: type === 'EQUIPMENT' ? optional(row['VIN/SN']) : null, licensePlate: optional(row['License Plate']), purchaseDate: date(row['Purchase Date'], true), purchaseCost: number(row['Purchase Price (USD)']), purchasedFromVendorId: vendorMatches.length === 1 ? vendorMatches[0] : null, notes: sourceNotes('vehicles.csv', row, ['__row']), ...timestampFields(row) };
    fields.equipmentId = name; fields.name = name;
    const ref = add('Asset', row['Fleetio ID'], fields);
    registerAsset(row.Name, { ...ref, source: row, sourceKind: 'Vehicle', requiresDisambiguation: originalAssetNames.get(norm(row.Name)).length > 1, fields }); record('vehicles', row, ref);
    if (['Hourly Rental Rate', 'Daily Rental Rate', 'Weekly Rental Rate', 'Monthly Rental Rate'].some(k => optional(row[k]))) {
      add('AssetRentalRate', row['Fleetio ID'], { assetId: ref.id, hourlyRate: number(row['Hourly Rental Rate']), dailyRate: number(row['Daily Rental Rate']), monthlyRate: number(row['Monthly Rental Rate']), notes: `Fleetio rental snapshot. Weekly rate: ${row['Weekly Rental Rate'] || 'not recorded'}. ${row['Rental Rate Description'] || ''}`, createdById: account.id, createdAt: fields.updatedAt });
    }
  }
  const toolNames = groups(data.tools || [], r => norm(r.Name));
  const toolImportIds = new Set((data.tools || []).map(r => idFor(companyId, 'Asset', `tool:${r['Fleetio ID']}`)));
  for (const row of uniqueSource('tools')) {
    if (!options.toolsReceivedAt || !Number.isFinite(Date.parse(options.toolsReceivedAt))) throw new Error('Tools require an explicit batch receipt timestamp');
    if (!row.Name || row.Name.length > 100 || !row.Type || row.Type.length > 100) { hold('tools', row, 'Missing or oversized tool identity/category'); continue; }
    if (toolNames.get(norm(row.Name)).length !== 1 || vehicles.some(v => norm(equipmentName(v)) === norm(row.Name))) { hold('tools', row, 'Conflicting equipment name'); continue; }
    const baseStatus = { 'In-Service': 'AVAILABLE', Available: 'AVAILABLE', 'Out-of-Service': 'UNDER_MAINTENANCE' }[row.Status];
    if (!baseStatus) { hold('tools', row, 'Source status is a description/location; operational status needs confirmation'); continue; }
    const sourceId = `tool:${row['Fleetio ID']}`;
    const matches = existing('Asset').filter(a => a.id !== idFor(companyId, 'Asset', sourceId) && (norm(a.name) === norm(row.Name) || norm(a.equipmentId) === norm(row.Name) || (!toolImportIds.has(a.id) && row['Serial Number'] && [norm(a.vin), norm(a.serialNumber)].includes(norm(row['Serial Number'])))));
    if (matches.length) { hold('tools', row, 'Existing asset identity requires review'); continue; }
    const vendorMatches = vendors.get(norm(row['Purchase Vendor'])) || [];
    if (row['Purchase Vendor'] && vendorMatches.length !== 1) warnings.push({ file: 'tools', row: row.__row, reason: 'Purchase vendor link unresolved; original retained in notes' });
    if (/^[+-]?\d+(?:\.\d+)?e[+-]?\d+$/i.test(row['Serial Number'])) warnings.push({ file: 'tools', row: row.__row, reason: 'Serial number is scientific notation in the source; original text preserved, exact serial needs confirmation' });
    const fields = { companyId, equipmentId: row.Name, name: row.Name, type: 'TOOL', category: row.Type, make: optional(row.Brand), model: optional(row.Model), serialNumber: optional(row['Serial Number']), year: number(row.Year, { integer: true }), licensePlate: optional(row['License Plate']), status: row['Archived At'] ? 'RETIRED' : baseStatus, customStatusNote: `Fleetio: ${row.Status}${row['Archived At'] ? `; archived ${row['Archived At']}` : ''}`, purchaseDate: date(row['Purchase Date'], true), purchaseCost: number(row['Purchase Price (USD)']), warrantyExpiry: date(row['Warranty Expiration Date'], true), salvageValue: number(row['Estimated Resale Value (USD)']), purchasedFromVendorId: vendorMatches.length === 1 ? vendorMatches[0] : null, createdAt: options.toolsReceivedAt, updatedAt: options.toolsReceivedAt, notes: `Tool export has no creation/update timestamps. App timestamps identify import batch receipt, not historical acquisition or assignment.\n${sourceNotes('tools.csv', row, ['__row', 'QR Code'])}` };
    // Preserve the observed current location/person only. No historical start date is supplied.
    const assigneeName = [row['Current Assignee First Name'], row['Current Assignee Last Name']].filter(Boolean).join(' ');
    if (fields.status !== 'RETIRED') {
      if (LOCATION_CONTACTS.has(assigneeName)) Object.assign(fields, { currentLocation: assigneeName, currentYardId: yards.get(assigneeName) || null });
      else if (assigneeName && userFor(assigneeName)) fields.currentAssigneeId = userFor(assigneeName).id;
    }
    const ref = add('Asset', sourceId, fields);
    registerAsset(row.Name, { ...ref, source: row, sourceKind: 'Tool', fields }); record('tools', row, ref);
    if (['Hourly Rental Rate', 'Daily Rental Rate', 'Weekly Rental Rate', 'Monthly Rental Rate'].some(k => optional(row[k]))) add('AssetRentalRate', sourceId, { assetId: ref.id, hourlyRate: number(row['Hourly Rental Rate']), dailyRate: number(row['Daily Rental Rate']), monthlyRate: number(row['Monthly Rental Rate']), notes: `Fleetio tool rental snapshot. Weekly rate: ${row['Weekly Rental Rate'] || 'not recorded'}. Imported snapshot; effective date not provided.`, createdById: account.id, createdAt: options.toolsReceivedAt });
  }
  for (const row of uniqueSource('meter_entries')) {
    if (!['TRUE', 'FALSE'].includes(row.Void)) throw new Error('Unknown void flag');
    if (row.Void === 'TRUE') { disposition('meter_entries', row, 'excluded_void', 'Voided source reading retained only in original export'); continue; }
    const asset = resolveAsset(assets.get(norm(row['Vehicle Name'])), { kind: 'Vehicle', serial: row['Vehicle VIN/SN'], year: row['Vehicle Year'], make: row['Vehicle Make'], model: row['Vehicle Model'] });
    if (!asset) { hold('meter_entries', row, 'Missing, conflicting, or held asset'); continue; }
    const readingType = { hr: 'HOURS', mi: 'MILES' }[row['Meter Unit']];
    const value = number(row['Meter Value']);
    if (!readingType || value === null || value < 0) throw new Error('Invalid meter value/unit');
    const ref = add('AssetMeterReading', row['Fleetio ID'], { assetId: asset.id, readingType, value, recordedAt: date(row.Date), createdAt: date(row[CREATED]), notes: `Fleetio meter ${row['Fleetio ID']}; ${row['Meter Type']} meter; source: ${row['Meter Source']}. Source reading date has no time; stored at Pacific midnight.`, contextRecorded: false, event: 'READING' });
    record('meter_entries', row, ref);
  }
  for (const row of uniqueSource('issues')) {
    const asset = resolveAsset(assets.get(norm(row['Asset Name'])), { kind: row['Asset Record Type'], serial: row['Asset VIN/SN'], year: row['Asset Year'], make: row['Asset Make/Brand'], model: row['Asset Model'] });
    if (!asset) { hold('issues', row, 'Missing, conflicting, or held asset'); continue; }
    const status = { Open: 'OPEN', Resolved: 'RESOLVED', Closed: 'CLOSED' }[row['Issue Status']];
    const urgency = { 'No Priority': 'MEDIUM', Low: 'LOW', Medium: 'MEDIUM', High: 'HIGH', Critical: 'URGENT' }[row.Priority];
    if (!status || !urgency || !row.Summary) throw new Error('Unmapped issue state or missing title');
    const reporterName = [row['Reported By First Name'], row['Reported By Last Name']].filter(Boolean).join(' ');
    const resolverName = [row['Resolved By First Name'], row['Resolved By Last Name']].filter(Boolean).join(' ');
    const ref = add('AssetIssue', row['Fleetio ID'], { assetId: asset.id, title: row.Summary, description: sourceNotes('issues.csv', row, ['__row']), status, urgency, reporterName: optional(reporterName), reportedById: userFor(reporterName)?.id || null, resolvedById: userFor(resolverName)?.id || null, resolvedAt: date(row['Resolved On (Pacific Time (US & Canada))'] || row['Closed On (Pacific Time (US & Canada))']), createdAt: date(row['Reported On (Pacific Time (US & Canada))'] || row[CREATED]), updatedAt: date(row[UPDATED]) });
    record('issues', row, ref);
  }
  const assignmentKeys = new Set();
  for (const row of data.vehicle_assignments || []) {
    const sourceId = row['fleetio_id (do not edit)'];
    if (!sourceId || assignmentKeys.has(sourceId)) throw new Error('Invalid assignment source ID');
    assignmentKeys.add(sourceId);
    const asset = resolveAsset(assets.get(norm(row.vehicle_name)), { kind: 'Vehicle' });
    if (!asset) { hold('vehicle_assignments', row, 'Missing, conflicting, or held asset'); continue; }
    const isLocation = LOCATION_CONTACTS.has(row.contact_name);
    const person = isLocation ? null : userFor(row.contact_name, row.contact_email);
    if (!isLocation && !person) { hold('vehicle_assignments', row, 'Person has no matching app user; no login created'); continue; }
    const assignedAt = date(row.started_at), removedAt = date(row.ended_at);
    if (!assignedAt || (removedAt && removedAt < assignedAt)) { hold('vehicle_assignments', row, 'Missing start date or assignment ends before it starts'); continue; }
    const notes = `Imported by account administrator from Fleetio assignment ${sourceId}. Original assignment actor not provided. Source person/location: ${row.contact_name}. Starting meter: ${row.starting_meter_entry_value || 'not recorded'}; ending meter: ${row.ending_meter_entry_value || 'not recorded'}. Jobsite: ${row.jobsite || 'not recorded'}.`;
    const ref = isLocation
      ? add('AssetJobAssignment', sourceId, { assetId: asset.id, locationName: row.contact_name, yardId: yards.get(row.contact_name) || null, assignedAt, removedAt, notes, createdById: account.id })
      : add('AssetPersonAssignment', sourceId, { assetId: asset.id, assigneeId: person.id, assignedAt, removedAt, notes, createdById: account.id });
    // Set initial context only on assets newly inserted in this batch. Never overwrite existing state.
    if (!removedAt && asset.isNew && asset.fields.status !== 'RETIRED' && asset.fields.status !== 'LOST_DAMAGED') {
      const op = operations.find(o => o.table === 'Asset' && o.row.id === asset.id);
      if (isLocation) {
        if (op.row.currentLocation) throw new Error('Overlapping current location');
        Object.assign(op.row, { currentLocation: row.contact_name, currentYardId: yards.get(row.contact_name) || null });
      } else {
        if (op.row.currentAssigneeId) throw new Error('Overlapping current person assignment');
        op.row.currentAssigneeId = person.id;
      }
    }
    record('vehicle_assignments', row, ref);
  }
  // These require data-model support or choices. Do not invent performers, issue links,
  // project stock allocations, quantities, or collapse cost-bearing service records.
  const maintenance = options.maintenance ? require('./fleetio-maintenance.cjs').buildMaintenance(data, { account, existing, add, hold, record, disposition, uniqueSource, warnings, categoryIds: new Map(), resolveVehicle: row => resolveAsset(assets.get(norm(row['Vehicle Name'])), { kind: 'Vehicle', serial: row['Vehicle VIN/SN'], year: row['Vehicle Year'], make: row['Vehicle Make'], model: row['Vehicle Model'] }) }) : null;
  const heldReasons = options.maintenance ? {} : { work_orders: 'Needs direct asset link and original-actor preservation', work_order_line_items: 'Needs work-order line-item support', work_order_sub_line_items: 'Needs work-order sub-line-item support', service_entries: 'Needs original performer support and reconciliation with work orders', parts: 'Needs per-location inventory mapping; blank quantities must remain unknown' };
  for (const [file, reason] of Object.entries(heldReasons)) for (const row of data[file] || []) hold(file, row, !row.work_order_number && file.startsWith('work_order_') ? 'Missing work-order number' : reason);
  for (const file of ['fuel_entries', 'purchase_orders']) {
    if (data[file]?.length) throw new Error(`Unexpected nonempty ${file}; import mapping required`);
  }
  const sourceCounts = Object.fromEntries(Object.entries(data).map(([file, rows]) => [file, rows.length]));
  for (const [file, count] of Object.entries(sourceCounts)) {
    if (dispositions.filter(d => d.file === file).length !== count) throw new Error(`Unaccounted source rows: ${file}`);
  }
  const byTable = Object.fromEntries([...groups(operations, op => op.table)].map(([table, rows]) => [table, rows.length]));
  const byFile = Object.fromEntries([...groups(dispositions, d => d.file)].map(([file, rows]) => [file, Object.fromEntries([...groups(rows, r => r.status)].map(([status, values]) => [status, values.length]))]));
  return { operations, dispositions, warnings, summary: { sourceCounts, byTable, byFile, ...(maintenance ? { reconciliation: maintenance } : {}) } };
}

module.exports = { buildPlan, date, number, idFor, hash, norm, resolveAsset };
