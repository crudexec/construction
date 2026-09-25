const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPlan } = require('./fleetio-plan.cjs');
const { readSources, verify } = require('../import-fleetio.cjs');
const { moneyCents } = require('./fleetio-maintenance.cjs');
const path = require('node:path');
const fs = require('node:fs');
const times = { 'Created On (Pacific Time (US & Canada))': '01/05/2023 03:36:30 PM', 'Updated On (Pacific Time (US & Canada))': '09/21/2026 06:55:20 AM' };
const initial = () => ({ account: { id: 'admin', email: 'bdeller@alliedconstruction.net', companyId: 'company', companyName: 'Allied Construction', role: 'ADMIN', isActive: true }, tables: { User: [] } });
function fixture() {
  const data = Object.fromEntries(['contacts','fuel_entries','issues','meter_entries','parts','purchase_orders','service_entries','vehicle_assignments','vehicles','vendors','work_order_line_items','work_order_sub_line_items','work_orders'].map(k => [k, []]));
  data.vehicles = [{ 'Fleetio ID': 'asset1', Name: 'EX1', Type: 'Excavator', Status: 'Active', __row: 2, ...times }];
  data.work_orders = [{ 'Fleetio ID': 'wo1', Number: '1', 'Vehicle Name': 'EX1', Status: 'Completed', 'Actual Completion Date (Pacific Time (US & Canada))': '09/21/2026', 'Total Cost (USD)': '10.00', 'Created By First Name': 'Original', 'Created By Last Name': 'Author', __row: 2, ...times }];
  data.service_entries = [{ 'Fleetio ID': 'service1', 'Vehicle Name': 'EX1', 'Work Order Number': '1', 'Completed At': '09/21/2026', 'Total Cost (USD)': '10.00', __row: 2, ...times }];
  return data;
}
const run = (data, state = initial()) => buildPlan(data, state, { maintenance: true });

test('work-order service costs are linked, not counted twice; original creator is not a new user', () => {
  const plan = run(fixture());
  assert.equal(plan.summary.reconciliation.combinedMaintenanceCostCents, 1000);
  assert.equal(plan.summary.reconciliation.standaloneServiceCostCents, 0);
  const order = plan.operations.find(op => op.table === 'WorkOrder').row;
  const service = plan.operations.find(op => op.table === 'AssetServiceEntry').row;
  assert.equal(service.workOrderId, order.id);
  assert.equal(order.sourceCreatedByName, 'Original Author');
  assert.equal(order.createdById, 'admin');
  assert.equal(plan.operations.some(op => ['User', 'MaintenanceRecord'].includes(op.table)), false);
});
test('unreconciled service references and orphan details are held without invented parents', () => {
  const data = fixture();
  data.service_entries[0]['Total Cost (USD)'] = '11';
  data.work_order_line_items = [{ work_order_number: '1', __row: 2, description: 'Original detail' }, { work_order_number: 'missing', __row: 3 }];
  data.work_order_sub_line_items = [{ work_order_number: '', __row: 2 }];
  const plan = run(data);
  assert.equal(plan.summary.byFile.service_entries.held, 1);
  assert.equal(plan.summary.byFile.work_order_line_items.embedded, 1);
  assert.equal(plan.summary.byFile.work_order_line_items.held, 1);
  assert.equal(plan.summary.byFile.work_order_sub_line_items.held, 1);
  assert.deepEqual(plan.operations.find(op => op.table === 'WorkOrder').row.sourceData.lineItems, [{ work_order_number: '1', description: 'Original detail' }]);
  data.service_entries[0]['Work Order Number'] = 'missing';
  assert.equal(run(data).summary.byFile.service_entries.held, 1);
});
test('part locations share a master; zero is known and blank stock is not zero', () => {
  const data = fixture();
  const part = { 'Fleetio ID': 'part1', Part: 'SKU1', Description: 'Filter', Category: 'Filters', 'Measurement Unit': '', 'Unit Cost (USD)': '2.50', 'Track Inventory': 'TRUE', ...times };
  data.parts = [{ ...part, Location: 'Farm', 'Total Quantity': '0', __row: 2 }, { ...part, Location: 'Shop', 'Total Quantity': '2', __row: 3 }, { ...part, 'Fleetio ID': 'unknown', Part: 'UNKNOWN', Location: 'Farm', 'Total Quantity': '', __row: 4 }];
  const plan = run(data), material = plan.operations.find(op => op.table === 'InventoryMaterial').row;
  assert.equal(plan.summary.byTable.InventoryMaterial, 1);
  assert.equal(plan.summary.byTable.InventoryTransaction, 1);
  assert.equal(material.quantity, 2); assert.equal(material.unit, 'unspecified');
  assert.equal(material.sourceData.locations.length, 2);
  assert.equal(plan.summary.byFile.parts.held, 1);
  assert.equal(plan.summary.reconciliation.inventoryValueCents, 500);
  const state = initial();
  for (const op of plan.operations) (state.tables[op.table] ||= []).push(op.row);
  assert.equal(run(data, state).operations.length, 0);
});
test('currency uses cents and verification compares JSONB structurally', () => {
  assert.equal(moneyCents('11,897.36'), 1189736);
  assert.equal(moneyCents(''), null); assert.throws(() => moneyCents('0.001'));
  verify({ tables: { WorkOrder: [] } }, { tables: { WorkOrder: [{ id: '1', sourceData: { b: [], a: 0 } }] } }, { operations: [{ table: 'WorkOrder', row: { id: '1', sourceData: { a: 0, b: [] } } }] });
});
test('actual maintenance exports reconcile and rerun adds nothing', { skip: !process.env.FLEETIO_TOOL_EXPORT || !fs.existsSync(process.env.FLEETIO_TOOL_EXPORT) }, () => {
  const { data } = readSources(path.resolve(__dirname, '../../Attachments'), process.env.FLEETIO_TOOL_EXPORT);
  const state = initial(), followup = require('./allied-followup-2026-09-23.cjs');
  for (const op of buildPlan(data, state, followup).operations) (state.tables[op.table] ||= []).push(op.row);
  const original = JSON.stringify(data);
  const options = { ...followup, maintenance: true }, plan = buildPlan(data, state, options);
  assert.equal(JSON.stringify(data), original);
  assert.deepEqual(plan.summary.byTable, { WorkOrder: 99, WorkOrderIssue: 82, AssetServiceEntry: 204, InventoryCategory: 2, InventoryMaterial: 3, InventoryTransaction: 3 });
  assert.deepEqual(plan.summary.reconciliation, { orderCostCents: 0, standaloneServiceCostCents: 1189736, combinedMaintenanceCostCents: 1189736, linkedServices: 97, inventoryQuantity: 40, inventoryValueCents: 583998 });
  assert.equal(plan.summary.byFile.service_entries.held, 4);
  assert.equal(plan.summary.byFile.parts.held, 2);
  for (const op of plan.operations) (state.tables[op.table] ||= []).push(op.row);
  assert.equal(buildPlan(data, state, options).operations.length, 0);
});
