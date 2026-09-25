const { date, number, idFor, norm } = require('./fleetio-plan.cjs');
const CREATED = 'Created On (Pacific Time (US & Canada))';
const UPDATED = 'Updated On (Pacific Time (US & Canada))';
const clean = ({ __row, ...row }) => row;
const name = (row, prefix) => [row[`${prefix} First Name`], row[`${prefix} Last Name`]].filter(Boolean).join(' ') || null;
const group = (rows, key) => Object.groupBy(rows, key);
const moneyCents = value => {
  const amount = number(value);
  if (amount === null) return null;
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) throw new Error('Currency has sub-cent precision');
  return Math.round(amount * 100);
};

function buildMaintenance(data, ctx) {
  const { account, existing, add, hold, record, disposition, uniqueSource, resolveVehicle, warnings } = ctx;
  const orders = new Map(), sourceOrders = group(data.work_orders, r => r.Number);
  const details = { work_order_line_items: group(data.work_order_line_items, r => r.work_order_number), work_order_sub_line_items: group(data.work_order_sub_line_items, r => r.work_order_number) };
  let orderCostCents = 0, standaloneServiceCostCents = 0, linkedServices = 0;
  for (const row of uniqueSource('work_orders')) {
    if (!row.Number || sourceOrders[row.Number].length !== 1) { hold('work_orders', row, 'Missing or duplicate work-order number'); continue; }
    const asset = resolveVehicle(row);
    if (!asset) { hold('work_orders', row, 'Missing or ambiguous asset'); continue; }
    const completedAt = date(row['Actual Completion Date (Pacific Time (US & Canada))']);
    const status = { Completed: 'COMPLETED', Open: 'SCHEDULED' }[row.Status];
    if (!status || (status === 'COMPLETED' && !completedAt)) { hold('work_orders', row, 'Unknown status or missing completion date'); continue; }
    const total = moneyCents(row['Total Cost (USD)']);
    if (total === null) { hold('work_orders', row, 'Missing total cost'); continue; }
    const sourceCreatedByName = name(row, 'Created By');
    const ref = add('WorkOrder', row['Fleetio ID'], {
      companyId: account.companyId, assetId: asset.id, title: `Fleetio WO #${row.Number} — ${row['Vehicle Name']}`, status,
      description: [row.Description, row.Summary, `Imported Fleetio work order. Original creator: ${sourceCreatedByName || 'not recorded'}. Original assignee: ${name(row, 'Assigned To') || 'not recorded'}. The app creator identifies the importing administrator.`].filter(Boolean).join('\n'),
      sourceCreatedByName, createdById: account.id,
      sourceData: { system: 'Fleetio', sourceId: row['Fleetio ID'], source: clean(row), lineItems: (details.work_order_line_items[row.Number] || []).map(clean), subLineItems: (details.work_order_sub_line_items[row.Number] || []).map(clean) },
      scheduledDate: date(row['Scheduled Start Date (Pacific Time (US & Canada))']), completedAt,
      actualCost: total / 100, createdAt: date(row[CREATED]), updatedAt: date(row[UPDATED]),
    });
    orders.set(row.Number, { ...ref, assetId: asset.id, total }); record('work_orders', row, ref); orderCostCents += total;
  }
  for (const file of Object.keys(details)) for (const row of data[file]) {
    const order = orders.get(row.work_order_number);
    if (!row.work_order_number || !order) hold(file, row, !row.work_order_number ? 'Missing work-order number' : 'Parent work order missing or held');
    else disposition(file, row, order.isNew ? 'embedded' : 'already_imported', 'Preserved as structured source detail on its work order; not added to parent cost again');
  }
  for (const row of data.issues) {
    const issue = existing('AssetIssue').find(i => i.id === idFor(account.companyId, 'AssetIssue', row['Fleetio ID']));
    if (!issue) continue;
    for (const number of (row['Work Orders'] || '').split(/[|,]/).map(x => x.trim()).filter(Boolean)) {
      const order = orders.get(number);
      if (!order) continue;
      if (issue.assetId !== order.assetId) { warnings.push({ file: 'issues', row: row.__row, reason: 'Work-order issue asset differs; no new link added' }); continue; }
      if (!existing('WorkOrderIssue').some(link => link.workOrderId === order.id && link.issueId === issue.id)) add('WorkOrderIssue', `${number}:${row['Fleetio ID']}`, { workOrderId: order.id, issueId: issue.id });
    }
  }
  const serviceOrderCounts = group(data.service_entries.filter(r => r['Work Order Number']), r => r['Work Order Number']);
  for (const row of uniqueSource('service_entries')) {
    const asset = resolveVehicle(row);
    if (!asset) { hold('service_entries', row, 'Missing or ambiguous asset'); continue; }
    const orderNumber = row['Work Order Number'], order = orders.get(orderNumber);
    const total = moneyCents(row['Total Cost (USD)']);
    if (total === null || !row['Completed At']) { hold('service_entries', row, 'Missing service completion date or cost'); continue; }
    if (orderNumber && (!order || serviceOrderCounts[orderNumber].length !== 1 || order.assetId !== asset.id || order.total !== total)) { hold('service_entries', row, 'Work-order reference/asset/cost cannot be reconciled uniquely'); continue; }
    const ref = add('AssetServiceEntry', row['Fleetio ID'], { assetId: asset.id, sourceId: row['Fleetio ID'], title: row['Service Tasks'] || row.Summary || row.Description || `Fleetio service ${row['Fleetio ID']}`, performedDate: date(row['Completed At']), cost: total / 100, recordedByName: name(row, 'Created By'), workOrderId: order?.id || null, sourceData: { system: 'Fleetio', source: clean(row) }, createdAt: date(row[CREATED]) });
    record('service_entries', row, ref);
    if (order) linkedServices++; else standaloneServiceCostCents += total;
  }
  let inventoryQuantity = 0, inventoryValueCents = 0;
  for (const [sourceId, rows] of Object.entries(group(data.parts, r => r['Fleetio ID']))) {
    const row = rows[0];
    const fields = ['Part', 'Category', 'Measurement Unit', 'Unit Cost (USD)', 'Track Inventory'];
    const invalid = !sourceId || rows.some(r => r['Track Inventory'] !== 'TRUE' || !r.Location || number(r['Total Quantity']) === null || moneyCents(r['Unit Cost (USD)']) === null) || fields.some(k => new Set(rows.map(r => r[k])).size !== 1) || new Set(rows.map(r => norm(r.Location))).size !== rows.length;
    if (invalid) { rows.forEach(r => hold('parts', r, 'Unknown stock/cost/location, untracked part, or conflicting duplicate location')); continue; }
    const quantity = rows.reduce((sum, r) => sum + number(r['Total Quantity']), 0), unitCost = moneyCents(row['Unit Cost (USD)']);
    if (quantity < 0 || unitCost < 0 || rows.some(r => number(r['Total Quantity']) < 0)) throw new Error('Negative inventory opening balance');
    const plannedId = idFor(account.companyId, 'InventoryMaterial', sourceId);
    if (existing('InventoryMaterial').some(m => m.id !== plannedId && (norm(m.sku) === norm(row.Part) || norm(m.name) === norm(row.Description || row.Part)))) { rows.forEach(r => hold('parts', r, 'Existing SKU or material name requires review')); continue; }
    let categoryId = null;
    if (row.Category) {
      const matches = existing('InventoryCategory').filter(c => norm(c.name) === norm(row.Category));
      if (matches.length > 1) { rows.forEach(r => hold('parts', r, 'Ambiguous inventory category')); continue; }
      categoryId = matches[0]?.id || ctx.categoryIds.get(norm(row.Category));
      if (!categoryId) { categoryId = add('InventoryCategory', norm(row.Category), { companyId: account.companyId, name: row.Category, updatedAt: date(row[UPDATED]) }).id; ctx.categoryIds.set(norm(row.Category), categoryId); }
    }
    const ref = add('InventoryMaterial', sourceId, { companyId: account.companyId, sku: row.Part, name: row.Description || row.Part, description: `Fleetio opening stock snapshot. ${rows.map(r => `${r.Location}: ${r['Total Quantity']}${r['Aisle/Row/Bin'] ? ` (aisle/row/bin ${r['Aisle/Row/Bin']})` : ''}`).join('; ')}. Location figures are historical import quantities, not live location balances.${row['Measurement Unit'] ? '' : ' Source unit was not supplied; shown as unspecified.'}`, unit: row['Measurement Unit'] || 'unspecified', unitCost: unitCost / 100, quantity, categoryId, sourceData: { system: 'Fleetio', sourceId, locations: rows.map(clean) }, createdAt: date(row[CREATED]), updatedAt: date(row[UPDATED]) });
    rows.forEach(r => record('parts', r, ref));
    add('InventoryTransaction', `opening:${sourceId}`, { materialId: ref.id, type: 'STOCK_IN', quantity, previousQty: 0, newQty: quantity, reason: 'Fleetio opening stock import; not a new purchase. See source details for import-time location quantities.', userId: account.id });
    inventoryQuantity += quantity; inventoryValueCents += Math.round(quantity * unitCost);
  }
  return { orderCostCents, standaloneServiceCostCents, combinedMaintenanceCostCents: orderCostCents + standaloneServiceCostCents, linkedServices, inventoryQuantity, inventoryValueCents };
}
module.exports = { buildMaintenance, moneyCents };
