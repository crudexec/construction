// Creates a review workspace only. Never imports or updates assets.
// Usage: tsx scripts/create-asset-import-review.ts --report-dir PATH
//   --company-id ID --origin https://buildfloapp.com [--apply]
import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import { PrismaClient, Prisma } from '@prisma/client'
import Papa from 'papaparse'
import type { ReviewField, ReviewOption } from '../src/lib/import-review/types'

const args = process.argv.slice(2)
const argument = (key: string) => args[args.indexOf(key) + 1]
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--apply') continue
  if (!['--report-dir', '--company-id', '--origin'].includes(args[index]) || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error('Unknown or incomplete argument')
  index++
}
for (const key of ['--report-dir', '--company-id', '--origin']) if (!args.includes(key)) throw new Error(`Missing ${key}`)
const directory = path.resolve(argument('--report-dir'))
const companyId = argument('--company-id')
const origin = new URL(argument('--origin'))
if (origin.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(origin.hostname)) throw new Error('Review links require HTTPS')
const plan = JSON.parse(fs.readFileSync(path.join(directory, 'plan.json'), 'utf8'))
const verification = JSON.parse(fs.readFileSync(path.join(directory, 'verified-after-commit.json'), 'utf8'))
const summary = JSON.parse(fs.readFileSync(path.join(directory, 'import-summary.json'), 'utf8'))
if (plan.digest !== verification.digest || !verification.unchangedExistingRows) throw new Error('The import report is not verified')
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const data: Record<string, Record<string, string>[]> = {}
for (const file of [...new Set<string>(plan.dispositions.filter((row: { status: string; file: string }) => row.status === 'held' && row.file !== 'tools').map((row: { file: string }) => row.file))]) {
  const content = fs.readFileSync(path.join(directory, 'sources', `${file}.csv`), 'utf8')
  if (hash(JSON.stringify(content)) !== plan.fingerprints[file]) throw new Error(`Source fingerprint differs: ${file}`)
  const parsed = Papa.parse<Record<string, string>>(content, { header: true, skipEmptyLines: 'greedy' })
  if (parsed.errors.length) throw new Error(`Invalid CSV: ${file}`)
  data[file] = parsed.data
}
const field = (key: string, label: string, type: ReviewField['type'], initial = '', required = false, extra: Partial<ReviewField> = {}): ReviewField => ({ key, label, type, initial, required, ...extra })
const select = (key: string, label: string, choiceKey: string, initial = '', required = false) => field(key, label, 'select', initial, required, { choiceKey })
const pacific = (value: string) => {
  if (!value) return ''
  const date = /^\d{4}-\d{2}-\d{2} /.test(value) ? new Date(value.replace(' ', 'T').replace(' ', '')) : null
  if (!date || !Number.isFinite(date.getTime())) return ''
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(part => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
const amount = (value: string) => value?.replace(/[$,]/g, '').trim() || ''
const sourceDate = (value: string) => {
  // CSV service timestamps already use Pacific wall time.
  const match = value?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):\d{2} (AM|PM)$/)
  if (!match) return ''
  const [, month, day, year, hour, minute, half] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${String(Number(hour) % 12 + (half === 'PM' ? 12 : 0)).padStart(2, '0')}:${minute}`
}
const prisma = new PrismaClient()

async function main() {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true } })
  if (company.name !== summary.company) throw new Error('Company does not match the import report')
  const [assets, users, contacts, orders] = await Promise.all([
    prisma.asset.findMany({ where: { companyId }, select: { id: true, equipmentId: true, name: true, make: true, model: true, year: true, serialNumber: true, vin: true, currentLocation: true, currentAssignee: { select: { firstName: true, lastName: true } } }, orderBy: { equipmentId: 'asc' } }),
    prisma.user.findMany({ where: { companyId, isActive: true }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: 'asc' } }),
    prisma.contact.findMany({ where: { companyId }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: 'asc' } }),
    prisma.workOrder.findMany({ where: { companyId }, select: { id: true, title: true, assetId: true, actualCost: true, sourceData: true }, orderBy: { createdAt: 'desc' } }),
  ])
  const choices: Record<string, ReviewOption[]> = {
    assets: assets.map(asset => ({ value: asset.id, label: [asset.equipmentId, asset.name !== asset.equipmentId ? asset.name : '', [asset.year, asset.make, asset.model].filter(Boolean).join(' '), asset.serialNumber || asset.vin ? `Serial/VIN: ${asset.serialNumber || asset.vin}` : ''].filter(Boolean).join(' · ') })),
    users: users.map(user => ({ value: user.id, label: `${user.firstName} ${user.lastName}` })),
    contacts: contacts.map(contact => ({ value: contact.id, label: `${contact.firstName} ${contact.lastName}` })),
    orders: orders.map(order => ({ value: order.id, label: `${order.title} · $${Number(order.actualCost || 0).toFixed(2)}` })),
  }
  const held: { file: string; row: number; sourceId?: string; reason: string }[] = plan.dispositions.filter((row: { status: string; file: string }) => row.status === 'held' && row.file !== 'tools')
  const rows = held.map((heldRow: { file: string; row: number; sourceId?: string; reason: string }, position: number) => {
    const source = data[heldRow.file][heldRow.row - 2]
    if (!source) throw new Error('Source row missing')
    const context: { label: string; value: string }[] = []
    const show = (label: string, value: unknown) => context.push({ label, value: String(value || 'Not provided') })
    const showFields = (keys: string[]) => keys.forEach(key => show(key, source[key]))
    const assetName = source.vehicle_name || source['Vehicle Name'] || source['Asset Name']
    const matches = assets.filter(asset => asset.name.toLowerCase() === assetName?.toLowerCase() || asset.equipmentId?.toLowerCase() === assetName?.toLowerCase())
    const asset = matches.length === 1 ? matches[0] : null
    let kind = '', title = '', reason = '', fields: ReviewField[] = []
    if (heldRow.file === 'contacts') {
      kind = 'contact'; title = `${source['Full Name']} · ${heldRow.sourceId}`
      reason = 'This name appears more than once, or is a generic account. Identify the person, match an existing contact, or exclude this row.'
      showFields(['Full Name', 'Email', 'Job Title', 'Mobile Phone Number', 'Work Phone Number'])
      fields = [select('contactId', 'Match an existing contact (optional)', 'contacts'), field('firstName', 'First name', 'text', source['First Name'], true), field('lastName', 'Last name', 'text', source['Last Name']), field('email', 'Email', 'email', source.Email), field('phone', 'Phone', 'text', source['Mobile Phone Number'] || source['Work Phone Number'])]
    } else if (heldRow.file === 'vehicle_assignments') {
      kind = 'assignment'; title = `${source.vehicle_name} · ${source.contact_name}`
      const conflict = plan.heldOperations?.find((row: { sourceId: string }) => row.sourceId === heldRow.sourceId)
      reason = conflict ? 'This assignment would change current records. Confirm the intended person or location and dates, or exclude it to keep the current records.' : heldRow.reason.includes('date') ? 'The assignment dates are missing or out of order. Correct the dates or tell us what needs clarification.' : heldRow.reason.includes('asset') ? 'More than one asset could match this assignment. Choose the exact asset.' : 'This person does not have a matching Buildflo user. Confirm their name for historical records, or match an existing user. No login will be created.'
      showFields(['vehicle_name', 'contact_name', 'started_at', 'ended_at', 'starting_meter_entry_value', 'ending_meter_entry_value', 'jobsite'])
      if (asset) { show('Current Buildflo person', asset.currentAssignee ? `${asset.currentAssignee.firstName} ${asset.currentAssignee.lastName}` : 'Unassigned'); show('Current Buildflo location', asset.currentLocation || 'Unassigned') }
      for (const closure of summary.sourceAssignmentClosuresNotApplied.filter((row: { asset: string }) => row.asset === source.vehicle_name)) show(`Related previous assignment: ${closure.personOrLocation}`, `Export ends it at ${closure.incomingEnd}; Buildflo still has it open.`)
      const user = users.find(user => `${user.firstName} ${user.lastName}`.toLowerCase() === source.contact_name.toLowerCase())
      const isLocation = /^\d+\s*-/.test(source.contact_name)
      fields = [select('assetId', 'Asset', 'assets', heldRow.reason.includes('asset') ? '' : asset?.id || '', true), field('targetName', 'Person or location name', 'text', source.contact_name, true), field('assignmentKind', 'Assignment is for', 'select', isLocation ? 'location' : 'person', true, { options: [{ value: 'person', label: 'Person' }, { value: 'location', label: 'Location / jobsite' }] }), select('userId', 'Match an existing user (optional)', 'users', user?.id || ''), field('startedAt', 'Start date and time', 'datetime-local', pacific(source.started_at), true), field('endedAt', 'End date and time (blank if ongoing)', 'datetime-local', pacific(source.ended_at)), field('handling', 'How to use this assignment', 'select', source.ended_at ? 'history' : '', true, { options: [{ value: 'history', label: 'Historical record only' }, { value: 'current', label: 'Use as the current assignment' }], hint: 'Current assignment changes will be checked against existing history before import.' })]
      if (conflict) fields.push(field('confirmContext', 'I confirm these dates and the intended assignment, including the related previous assignment shown above.', 'checkbox', 'false', true))
    } else if (heldRow.file === 'issues') {
      kind = 'issue'; title = `${assetName} · ${source.Summary}`
      reason = 'We could not safely identify the asset for this issue. Choose the correct asset, or leave a question if it is missing from the list.'
      showFields(['Asset Name', 'Asset VIN/SN', 'Asset Make/Brand', 'Asset Model', 'Summary', 'Issue Status', 'Reported On (Pacific Time (US & Canada))'])
      fields = [select('assetId', 'Correct asset', 'assets', '', true), field('title', 'Issue title', 'text', source.Summary, true)]
    } else if (heldRow.file.startsWith('work_order_')) {
      kind = 'line_item'; title = `${source.summary || source.description || source.type || 'Work-order detail'} · row ${heldRow.row}`
      reason = 'This detail has no work-order number. Choose its parent work order. Its amount will be reconciled with the existing total, not counted a second time.'
      Object.entries(source).filter(([, value]) => value).forEach(([key, value]) => show(key.replaceAll('_', ' '), value))
      fields = [select('workOrderId', 'Parent work order', 'orders', '', true), field('description', 'Description / clarification', 'text', source.description || source.summary || '')]
    } else if (heldRow.file === 'service_entries') {
      kind = 'service'; title = `${assetName} · ${source['Service Tasks'] || `Service ${heldRow.sourceId}`}`
      reason = 'The asset, work-order reference, or service cost could not be matched uniquely. Confirm whether this is a separate service or belongs to a work order.'
      showFields(['Vehicle Name', 'Service Tasks', 'Work Order Number', 'Completed At', 'Total Cost (USD)', 'Vendor Name', 'Reference', 'Notes'])
      const workOrder = orders.find(order => (order.sourceData as { source?: { Number?: string } } | null)?.source?.Number === source['Work Order Number'])
      if (workOrder) show('Referenced Buildflo work order', choices.orders.find(option => option.value === workOrder.id)?.label)
      fields = [select('assetId', 'Asset', 'assets', asset?.id || '', true), field('title', 'Service description', 'text', source['Service Tasks'] || source.Description || 'Service entry', true), field('performedAt', 'Completed date and time', 'datetime-local', sourceDate(source['Completed At']), true), field('cost', 'Total service cost (USD)', 'number', amount(source['Total Cost (USD)']), true), field('serviceHandling', 'Relationship to work orders', 'select', '', true, { options: [{ value: 'standalone', label: 'Separate service entry' }, { value: 'link', label: 'Part of a work order' }] }), select('workOrderId', 'Related work order (if applicable)', 'orders', workOrder?.id || '')]
    } else if (heldRow.file === 'parts') {
      kind = 'part'; title = `${source.Part} · ${source.Description || 'Inventory part'}`
      reason = 'Stock tracking, quantity, unit cost, or location is missing or inconsistent. Confirm the opening stock details, or exclude this row if stock should not be imported.'
      showFields(['Part', 'Description', 'Track Inventory', 'Location', 'Total Quantity', 'Unit Cost (USD)', 'Measurement Unit', 'Category'])
      fields = [field('sku', 'Part / SKU', 'text', source.Part, true), field('name', 'Part name', 'text', source.Description || source.Part, true), field('location', 'Stock location', 'text', source.Location, true), field('quantity', 'Opening quantity', 'number', amount(source['Total Quantity']), true), field('unitCost', 'Unit cost (USD)', 'number', amount(source['Unit Cost (USD)']), true), field('unit', 'Measurement unit', 'text', source['Measurement Unit'], true), field('trackInventory', 'Track this part in inventory using these opening balances.', 'checkbox', source['Track Inventory'] === 'TRUE' ? 'true' : 'false', true)]
    } else throw new Error(`No review form for ${heldRow.file}`)
    return { position, sourceFile: heldRow.file, sourceRow: heldRow.row, sourceId: heldRow.sourceId || null, kind, title, reason, context, fields, source }
  })
  if (rows.length !== 67) throw new Error(`Expected this delivery's 67 held rows, got ${rows.length}`)
  const sourceDigest = hash(`${companyId}:${plan.digest}:held-review-v1`)
  const existing = await prisma.assetImportReview.findUnique({ where: { companyId_sourceDigest: { companyId, sourceDigest } }, select: { id: true } })
  if (existing) { console.log(JSON.stringify({ existingReviewId: existing.id, message: 'Already created. Use the admin interface to renew the link.' })); return }
  console.log(JSON.stringify({ mode: args.includes('--apply') ? 'create' : 'preview', company: company.name, rows: rows.length, byKind: Object.fromEntries(Object.entries(Object.groupBy(rows, row => row.kind)).map(([key, items]) => [key, items?.length ?? 0])), sourceDigest }))
  if (!args.includes('--apply')) return
  const token = randomBytes(32).toString('hex')
  const review = await prisma.assetImportReview.create({ data: { companyId, title: 'Asset import review', sourceDigest, tokenHash: hash(token), expiresAt: new Date(Date.now() + 14 * 86400000), choices: choices as unknown as Prisma.InputJsonValue, rows: { create: rows.map(row => ({ ...row, context: row.context as unknown as Prisma.InputJsonValue, fields: row.fields as unknown as Prisma.InputJsonValue, source: row.source as Prisma.InputJsonValue })) }, events: { create: { action: 'CREATE', actor: 'Import operator', payload: { importDigest: plan.digest, rowCount: rows.length } } } } })
  const destination = path.join(directory, 'client-review-link.json')
  fs.writeFileSync(destination, JSON.stringify({ reviewId: review.id, url: `${origin.origin}/import-review/${token}`, expiresAt: review.expiresAt, rows: rows.length }, null, 2), { mode: 0o600, flag: 'wx' })
  console.log(JSON.stringify({ reviewId: review.id, linkFile: destination, expiresAt: review.expiresAt, rows: rows.length }))
}
main().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
