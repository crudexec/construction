const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPlan, date, number, idFor, resolveAsset } = require('./fleetio-plan.cjs');
const { readSources, verify, insertOperations, validateSchema } = require('../import-fleetio.cjs');
const path = require('node:path');
const fs = require('node:fs');
const emptyData = () => Object.fromEntries(['contacts','fuel_entries','issues','meter_entries','parts','purchase_orders','service_entries','vehicle_assignments','vehicles','vendors','work_order_line_items','work_order_sub_line_items','work_orders'].map(k=>[k,[]]));
const account = { id:'admin', email:'bdeller@alliedconstruction.net', companyId:'company', companyName:'Allied Construction', role:'ADMIN', isActive:true };
const snapshot = () => ({ account, tables: { User:[{ id:'admin',firstName:'Brian',lastName:'Deller',email:account.email }] } });
const times = { 'Created On (Pacific Time (US & Canada))':'01/05/2023 03:36:30 PM', 'Updated On (Pacific Time (US & Canada))':'09/21/2026 06:55:20 AM' };
const vehicle = (overrides={}) => ({ 'Fleetio ID':'1',Name:'EX1',Type:'Excavator',Status:'Active', __row:2,...times,...overrides });

test('strict numeric parsing preserves blanks, zero, currency and integer bounds',()=>{
  assert.equal(number(''),null); assert.equal(number('0.00'),0); assert.equal(number('$1,200.50'),1200.5);
  assert.throws(()=>number('1,20')); assert.throws(()=>number('1e6')); assert.throws(()=>number('3.5',{integer:true}));
});
test('Pacific dates respect DST and date-only purchase dates do not shift',()=>{
  assert.equal(date('01/05/2023 03:36:30 PM'),'2023-01-05T23:36:30.000Z');
  assert.equal(date('09/21/2026 06:55:20 AM'),'2026-09-21T13:55:20.000Z');
  assert.equal(date('09/21/2026'),'2026-09-21T07:00:00.000Z');
  assert.equal(date('09/21/2026',true),'2026-09-21T00:00:00.000Z');
  assert.equal(date('2024-01-26 14:00:00 -0600'),'2024-01-26T20:00:00.000Z');
  assert.throws(()=>date('02/30/2026')); assert.throws(()=>date('03/08/2026 02:30:00 AM'));
  assert.throws(()=>date('11/01/2026 01:30:00 AM'));
});
test('identifiers are deterministic and isolated by company and table',()=>{
  assert.equal(idFor('a','Asset','001'),idFor('a','Asset','001'));
  assert.notEqual(idFor('a','Asset','001'),idFor('b','Asset','001'));
  assert.notEqual(idFor('a','Asset','001'),idFor('a','Vendor','001'));
  assert.notEqual(idFor('a','Asset','001'),idFor('a','Asset','1'));
});
test('tool-export dates with single-digit month/day remain date-only',()=>{
  assert.equal(date('5/7/2013',true),'2013-05-07T00:00:00.000Z');
  assert.throws(()=>date('2/29/2013',true));
});
test('renamed duplicate assets use serial or year/make, never first name match',()=>{
  const candidates=[{id:'jlg',sourceKind:'Vehicle',requiresDisambiguation:true,source:{'VIN/SN':'030012964',Year:'2008',Make:'JLG',Model:'600AJ'}},{id:'snorkel',sourceKind:'Vehicle',requiresDisambiguation:true,source:{'VIN/SN':'',Year:'1999',Make:'Snorkel',Model:''}}];
  assert.equal(resolveAsset(candidates),null);
  assert.equal(resolveAsset(candidates,{serial:'030012964',kind:'Vehicle'}).id,'jlg');
  assert.equal(resolveAsset(candidates,{year:'1999',make:'Snorkel',kind:'Vehicle'}).id,'snorkel');
  assert.equal(resolveAsset([candidates[0]],{kind:'Vehicle'}),null);
  assert.equal(resolveAsset(candidates,{serial:'wrong'}),null);
});
test('tools use a separate source-ID namespace and hold descriptive statuses',()=>{
  const data=emptyData(); data.vehicles=[vehicle()];
  data.tools=[{'Fleetio ID':'1',Name:'TOOL1',Type:'Compressor',Status:'In-Service',__row:2},{'Fleetio ID':'2',Name:'TOOL2',Type:'Attachment',Status:'On Dozer',__row:3}];
  const plan=buildPlan(data,snapshot(),{toolsReceivedAt:'2026-09-23T22:34:37.000Z'});
  const assets=plan.operations.filter(op=>op.table==='Asset');
  assert.equal(assets.length,2); assert.notEqual(assets[0].row.id,assets[1].row.id);
  assert.equal(assets[1].row.type,'TOOL'); assert.equal(plan.summary.byFile.tools.held,1);
  assert.equal(plan.operations.some(op=>op.table==='AssetPersonAssignment'),false);
});
test('a contradictory issue serial is held even with a unique tool name',()=>{
  assert.equal(resolveAsset([{sourceKind:'Tool',source:{'Serial Number':'123'}}],{serial:'456',kind:'Tool'}),null);
});
test('target identity and admin status are mandatory',()=>{
  assert.throws(()=>buildPlan(emptyData(),{ account:{...account,role:'STAFF'},tables:{} }));
  assert.throws(()=>buildPlan(emptyData(),{ account:{...account,companyName:'Other'},tables:{} }));
});
test('duplicate asset names and dependencies held without choosing first match',()=>{
  const data=emptyData(); data.vehicles=[vehicle(),vehicle({'Fleetio ID':'2',__row:3})];
  data.meter_entries=[{'Fleetio ID':'3','Vehicle Name':'EX1',Void:'FALSE',__row:2}];
  const plan=buildPlan(data,snapshot()); assert.equal(plan.operations.length,0);
  assert.equal(plan.dispositions.filter(d=>d.status==='held').length,3);
});
test('void readings never enter active data and zeros remain real readings',()=>{
  const data=emptyData(); data.vehicles=[vehicle()];
  data.meter_entries=[{'Fleetio ID':'3','Vehicle Name':'EX1',Void:'TRUE',__row:2}, {'Fleetio ID':'4','Vehicle Name':'EX1',Void:'FALSE','Meter Value':'0','Meter Unit':'hr',Date:'09/21/2026',...times,__row:3}];
  const plan=buildPlan(data,snapshot());
  assert.equal(plan.operations.filter(op=>op.table==='AssetMeterReading').length,1);
  assert.equal(plan.operations.find(op=>op.table==='AssetMeterReading').row.value,0);
});
test('existing assets are not overwritten or used as uncertain history targets',()=>{
  const data=emptyData(); data.vehicles=[vehicle()];
  const before=snapshot(); before.tables.Asset=[{id:'existing',name:'EX1'}];
  assert.equal(buildPlan(data,before).operations.length,0);
});
test('archived assets cannot appear available',()=>{
  const data=emptyData(); data.vehicles=[vehicle({'Archived At (Pacific Time (US & Canada))':'09/21/2026 06:55:20 AM'})];
  assert.equal(buildPlan(data,snapshot()).operations[0].row.status,'RETIRED');
});
test('location contacts do not become users or synthetic projects',()=>{
  const data=emptyData(); data.contacts=[{'Fleetio ID':'2','Full Name':'1 - Farm',...times,__row:2}]; data.vehicles=[vehicle()];
  data.vehicle_assignments=[{'fleetio_id (do not edit)':'3',vehicle_name:'EX1',contact_name:'1 - Farm',started_at:'2024-01-26 14:00:00 -0600',ended_at:'',__row:2}];
  const plan=buildPlan(data,snapshot());
  assert.deepEqual(plan.operations.map(op=>op.table),['AssetYard','Asset','AssetJobAssignment']);
  assert.equal(plan.operations.find(op=>op.table==='Asset').row.currentLocation,'1 - Farm');
});
test('unmatched people are contacts only; historical assignments held',()=>{
  const data=emptyData(); data.contacts=[{'Fleetio ID':'2','Full Name':'Test Person','First Name':'Test','Last Name':'Person',...times,__row:2}]; data.vehicles=[vehicle()];
  data.vehicle_assignments=[{'fleetio_id (do not edit)':'3',vehicle_name:'EX1',contact_name:'Test Person',__row:2}];
  const plan=buildPlan(data,snapshot()); assert.equal(plan.operations.some(op=>op.table==='User'),false);
  assert.equal(plan.summary.byFile.vehicle_assignments.held,1);
});
test('vendor export duplicates collapse but distinct same-named vendors remain distinct on rerun',()=>{
  const data=emptyData(); const v={'Fleetio ID':'1',Name:'Same name',...times,__row:2};
  data.vendors=[v,{...v,__row:3},{...v,'Fleetio ID':'2',__row:4}];
  const before=snapshot(); const first=buildPlan(data,before);
  assert.equal(first.summary.byTable.Vendor,2); assert.equal(first.summary.byFile.vendors.duplicate,1);
  before.tables.Vendor=first.operations.filter(op=>op.table==='Vendor').map(op=>op.row);
  assert.equal(buildPlan(data,before).operations.length,0);
});
test('insert order satisfies foreign keys and unexpected SQL errors propagate',async()=>{
  const called=[]; const db={query:async sql=>called.push(sql)};
  await insertOperations(db,[{table:'Asset',row:{id:'a'}},{table:'Vendor',row:{id:'v'}},{table:'AssetYard',row:{id:'y'}},{table:'AssetIssue',row:{id:'i'}}]);
  assert.match(called[0],/^INSERT INTO "Vendor"/); assert.match(called[1],/^INSERT INTO "AssetYard"/); assert.match(called[2],/^INSERT INTO "Asset"/);
  await assert.rejects(()=>insertOperations({query:async()=>{throw new Error('collision');}},[{table:'Asset',row:{id:'a'}}]));
});
test('verification rejects any changed preexisting row or missing imported value',()=>{
  const before={tables:{Asset:[{id:'old',name:'Original'}]}};
  assert.throws(()=>verify(before,{tables:{Asset:[{id:'old',name:'Changed'}]}},{operations:[]}));
  assert.throws(()=>verify(before,{tables:{Asset:[...before.tables.Asset,{id:'new',name:'Wrong'}]}},{operations:[{table:'Asset',row:{id:'new',name:'Expected'}}]}));
});
test('verification interprets PostgreSQL timezone-less timestamps as UTC',()=>{
  verify({tables:{Asset:[]}},{tables:{Asset:[{id:'new',createdAt:'2026-09-21T07:00:00'}]}},{operations:[{table:'Asset',row:{id:'new',createdAt:'2026-09-21T07:00:00.000Z'}}]});
});
test('schema preflight rejects nonexistent columns and missing required fields',()=>{
  const columns=[{table_name:'AssetYard',column_name:'id',is_nullable:'NO',column_default:null},{table_name:'AssetYard',column_name:'createdAt',is_nullable:'NO',column_default:'now()'}];
  validateSchema([{table:'AssetYard',row:{id:'a'}}],columns);
  assert.throws(()=>validateSchema([{table:'AssetYard',row:{id:'a',updatedAt:'2026-01-01'}}],columns));
  assert.throws(()=>validateSchema([{table:'AssetYard',row:{createdAt:null}}],columns));
});
test('assignment with missing start date is held, never assigned an invented date',()=>{
  const data=emptyData(); data.vehicles=[vehicle()];
  data.vehicle_assignments=[{'fleetio_id (do not edit)':'3',vehicle_name:'EX1',contact_name:'1 - Farm',started_at:'',ended_at:'2024-01-26 14:00:00 -0600',__row:2}];
  const plan=buildPlan(data,snapshot()); assert.equal(plan.summary.byFile.vehicle_assignments.held,1);
});
test('actual source exports reconcile completely and simulated rerun is a no-op', {skip: !fs.existsSync(path.resolve(__dirname,'../../Attachments/vehicles.csv'))},()=>{
  const {data}=readSources(path.resolve(__dirname,'../../Attachments'));
  const before=snapshot(), original=JSON.stringify(data), plan=buildPlan(data,before);
  assert.equal(JSON.stringify(data),original);
  assert.equal(plan.summary.byTable.Asset,126); assert.equal(plan.summary.byTable.Vendor,90);
  assert.equal(plan.summary.byFile.issues.held,23); assert.equal(plan.summary.byFile.meter_entries.excluded_void,47);
  assert.equal(plan.summary.byFile.vehicles.held,2);
  for(const op of plan.operations) (before.tables[op.table] ||= []).push(op.row);
  assert.equal(buildPlan(data,before).operations.length,0);
  assert.equal(plan.operations.some(op=>['User','Card','MaintenanceRecord','WorkOrder'].includes(op.table)),false);
});

test('actual follow-up adds only the newly cleared records and preserves assignment holds', {skip: !process.env.FLEETIO_TOOL_EXPORT || !fs.existsSync(process.env.FLEETIO_TOOL_EXPORT)},()=>{
  const directory=path.resolve(__dirname,'../../Attachments');
  const first=readSources(directory).data, state=snapshot();
  for(const op of buildPlan(first,state).operations) (state.tables[op.table] ||= []).push(op.row);
  const {data}=readSources(directory,process.env.FLEETIO_TOOL_EXPORT);
  const options=require('./allied-followup-2026-09-23.cjs');
  const original=JSON.stringify(state), plan=buildPlan(data,state,options);
  assert.equal(JSON.stringify(state),original);
  assert.deepEqual(plan.summary.byTable,{Asset:246,AssetRentalRate:148,AssetMeterReading:5,AssetIssue:20});
  assert.equal(plan.summary.byFile.tools.held,5);
  assert.equal(plan.summary.byFile.vehicle_assignments.held,32);
  assert.equal(plan.summary.byFile.issues.held,3);
  assert.equal(plan.summary.byFile.contacts.held,5);
  for(const op of plan.operations) (state.tables[op.table] ||= []).push(op.row);
  assert.equal(buildPlan(data,state,options).operations.length,0);
});
