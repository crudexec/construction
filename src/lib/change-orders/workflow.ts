import { Prisma, type ChangeOrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export class ChangeOrderError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

type Actor = { id: string; companyId: string; firstName: string; lastName: string }
const person = { select: { id: true, firstName: true, lastName: true } }
export const changeOrderInclude = {
  lineItems: { orderBy: { order: 'asc' as const }, include: { costCode: { select: { id: true, code: true, name: true } } } },
  createdBy: person, approvedBy: person, rejectedBy: person,
  notes: { orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }] },
  history: { orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }] }
} satisfies Prisma.ChangeOrderInclude

type Order = Prisma.ChangeOrderGetPayload<{ include: typeof changeOrderInclude }>
type DB = Prisma.TransactionClient
const round = (n: number) => Math.round((n + Math.sign(n) * Number.EPSILON) * 100) / 100

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ChangeOrderError('Invalid change order data')
  return value as Record<string, unknown>
}
function text(value: unknown, name: string, required = false, max = 20000): string | null {
  if (value == null && !required) return null
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new ChangeOrderError(`Invalid ${name}`)
  return value.trim() || null
}
function number(value: unknown, name: string, min: number, max: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new ChangeOrderError(`Invalid ${name}`)
  return value
}
export function parseContent(value: unknown) {
  const body = object(value)
  if (!Array.isArray(body.lineItems) || body.lineItems.length > 500) throw new ChangeOrderError('Provide up to 500 line items')
  const lineItems = body.lineItems.map((raw, order) => {
    const item = object(raw)
    const quantity = number(item.quantity, 'quantity', 0, 1e9)
    const unitPrice = number(item.unitPrice, 'unit price', -1e12, 1e12)
    const totalPrice = round(quantity * unitPrice)
    number(totalPrice, 'line total', -1e12, 1e12)
    return {
      id: text(item.id, 'line item ID', false, 200) ?? undefined,
      description: text(item.description, 'line description', true)!, quantity,
      unit: text(item.unit, 'unit', true, 30)!, unitPrice, totalPrice, order,
      notes: text(item.notes, 'line notes'), costCodeId: text(item.costCodeId, 'cost code', false, 200),
      specSection: text(item.specSection, 'spec section', false, 200)
    }
  })
  const totalAmount = round(lineItems.reduce((sum, line) => sum + line.totalPrice, 0))
  number(totalAmount, 'total amount', -1e12, 1e12)
  return { title: text(body.title, 'title', true, 200)!, description: text(body.description, 'description'), reason: text(body.reason, 'reason'), lineItems, totalAmount }
}
function lineChanges(co: Order, content: ReturnType<typeof parseContent>) {
  const ids = content.lineItems.flatMap(line => line.id ? [line.id] : [])
  if (new Set(ids).size !== ids.length || ids.some(id => !co.lineItems.some(line => line.id === id))) throw new ChangeOrderError('Invalid line item reference')
  return {
    deleteMany: { id: { notIn: ids } },
    update: content.lineItems.filter(line => line.id).map(({ id, ...data }) => ({ where: { id: id! }, data })),
    create: content.lineItems.filter(line => !line.id).map(({ id: _id, ...data }) => data)
  }
}
async function validateCodes(db: DB, companyId: string, content: ReturnType<typeof parseContent>) {
  const ids = [...new Set(content.lineItems.flatMap(line => line.costCodeId ? [line.costCodeId] : []))]
  const codes = await db.costCode.findMany({ where: { id: { in: ids }, companyId }, select: { id: true, code: true, name: true } })
  if (ids.length !== codes.length) throw new ChangeOrderError('One or more cost codes not found', 404)
  return codes
}
function json(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) }
function snapshot(co: Order) {
  return json({ title: co.title, description: co.description, reason: co.reason, totalAmount: co.totalAmount,
    lineItems: co.lineItems.map(({ description, quantity, unit, unitPrice, totalPrice, notes, costCodeId, costCode, specSection, order }) => ({ description, quantity, unit, unitPrice, totalPrice, notes, costCodeId, costCode, specSection, order })),
    status: co.status, submittedAt: co.submittedAt, approvedAt: co.approvedAt, approvedBy: co.approvedBy,
    rejectedAt: co.rejectedAt, rejectedBy: co.rejectedBy, rejectionReason: co.rejectionReason,
    revisionNumber: co.revisionNumber, revisionStatus: co.revisionStatus, proposedRevision: co.proposedRevision, version: co.version })
}
async function event(db: DB, actor: Actor, id: string, action: string, before: Prisma.InputJsonValue | null, after: Prisma.InputJsonValue) {
  await db.changeOrderEvent.create({ data: { changeOrderId: id, action, actorId: actor.id, actorName: `${actor.firstName} ${actor.lastName}`, before: before ?? Prisma.DbNull, after } })
}
export async function requireContract(db: DB, companyId: string, contractId: string) {
  const contract = await db.vendorContract.findFirst({ where: { id: contractId, companyId, vendor: { companyId } }, select: { id: true } })
  if (!contract) throw new ChangeOrderError('Contract not found', 404)
}
async function lockContract(db: DB, actor: Actor, contractId: string) {
  await requireContract(db, actor.companyId, contractId)
  // All writes use the same lock, including numbering, approval and legacy line-item APIs.
  await db.$queryRaw`SELECT id FROM "VendorContract" WHERE id=${contractId} FOR UPDATE`
}
export async function getChangeOrder(actor: Actor, contractId: string, coId: string) {
  await requireContract(prisma, actor.companyId, contractId)
  const co = await prisma.changeOrder.findFirst({ where: { id: coId, contractId }, include: changeOrderInclude })
  if (!co) throw new ChangeOrderError('Change order not found', 404)
  return co
}
export async function createChangeOrder(actor: Actor, contractId: string, input: unknown) {
  const content = parseContent(input)
  if (content.lineItems.some(line => line.id)) throw new ChangeOrderError('New line items cannot specify an ID')
  return prisma.$transaction(async db => {
    await lockContract(db, actor, contractId)
    await validateCodes(db, actor.companyId, content)
    const last = await db.changeOrder.findFirst({ where: { contractId }, orderBy: { changeOrderNumber: 'desc' } })
    const { lineItems, ...fields } = content
    const co = await db.changeOrder.create({ data: { ...fields, contractId, changeOrderNumber: (last?.changeOrderNumber ?? 0) + 1, createdById: actor.id, lineItems: { create: lineItems } }, include: changeOrderInclude })
    await event(db, actor, co.id, 'Created', null, snapshot(co))
    return db.changeOrder.findUniqueOrThrow({ where: { id: co.id }, include: changeOrderInclude })
  })
}

const transitions: Record<ChangeOrderStatus, ChangeOrderStatus[]> = {
  DRAFT: ['PENDING_APPROVAL', 'APPROVED'], PENDING_APPROVAL: ['DRAFT', 'APPROVED', 'REJECTED'], REJECTED: ['DRAFT'], APPROVED: []
}
export async function updateChangeOrder(actor: Actor, contractId: string, coId: string, input: unknown) {
  const body = object(input)
  return prisma.$transaction(async db => {
    await lockContract(db, actor, contractId)
    const co = await db.changeOrder.findFirst({ where: { id: coId, contractId }, include: changeOrderInclude })
    if (!co) throw new ChangeOrderError('Change order not found', 404)
    const action = body.action ?? ('status' in body ? 'status' : 'edit')
    if (action === 'note') {
      const note = await db.changeOrderNote.create({ data: { changeOrderId: coId, body: text(body.body, 'note', true)!, actorId: actor.id, actorName: `${actor.firstName} ${actor.lastName}` } })
      await event(db, actor, coId, 'Note added', null, json({ note: note.body }))
      return db.changeOrder.findUniqueOrThrow({ where: { id: coId }, include: changeOrderInclude })
    }
    if (!Number.isInteger(body.version)) throw new ChangeOrderError('Reload the change order before saving (version required)', 409)
    if (body.version !== co.version) throw new ChangeOrderError('Change order changed. Reload before saving.', 409)
    const before = snapshot(co)
    if (action === 'delete') {
      if (co.status !== 'DRAFT' || co.approvedAt || co.revisionNumber) throw new ChangeOrderError('Only unapproved draft change orders can be deleted', 409)
      await db.changeOrder.delete({ where: { id: coId } })
      return null
    }
    let data: Prisma.ChangeOrderUncheckedUpdateInput = { version: { increment: 1 } }
    let label: string
    if (action === 'edit' || action === 'line-add' || action === 'line-edit' || action === 'line-delete') {
      if (co.status === 'APPROVED' && action !== 'edit') throw new ChangeOrderError('Create a revision to change approved line items', 409)
      if (co.status === 'REJECTED') throw new ChangeOrderError('Return the rejected order to draft before editing', 409)
      if ('status' in body) throw new ChangeOrderError('Save edits separately from approval')
      let source: Record<string, unknown> = { ...co, ...body }
      if (co.status === 'APPROVED') source = { ...object(co.proposedRevision ?? co), ...body }
      if (action !== 'edit') {
        const itemIndex = co.lineItems.findIndex(item => item.id === body.itemId)
        if (action !== 'line-add' && itemIndex < 0) throw new ChangeOrderError('Line item not found', 404)
        source.lineItems = action === 'line-add' ? [...co.lineItems, body.item] : action === 'line-delete'
          ? co.lineItems.filter((_, i) => i !== itemIndex)
          : co.lineItems.map((item, i) => i === itemIndex ? { ...item, ...object(body.item) } : item)
      }
      const content = parseContent(source)
      const codes = await validateCodes(db, actor.companyId, content)
      const lines = lineChanges(co, content)
      if (co.status === 'APPROVED') {
        const revision = { ...content, lineItems: content.lineItems.map(line => ({ ...line, costCode: codes.find(code => code.id === line.costCodeId) ?? null })) }
        data = { ...data, proposedRevision: json(revision), revisionStatus: 'DRAFT', ...(!co.proposedRevision && { revisionNumber: { increment: 1 } }) }
        label = co.proposedRevision ? 'Revision edited' : 'Revision created'
      } else {
        const { lineItems, ...fields } = content
        data = { ...data, ...fields, lineItems: lines }
        label = 'Edited'
      }
    } else if (action === 'status' || action === 'revision-status') {
      // A decision must always refer to the content/version the user reviewed.
      if (['title', 'description', 'reason', 'lineItems', 'totalAmount'].some(key => key in body)) throw new ChangeOrderError('Save edits separately from approval')
      const revision = action === 'revision-status'
      if (revision && (co.status !== 'APPROVED' || !co.proposedRevision || !co.revisionStatus)) throw new ChangeOrderError('No revision to review', 409)
      const previous = revision ? co.revisionStatus! : co.status
      const status = body.status as ChangeOrderStatus
      if (!transitions[previous]?.includes(status)) throw new ChangeOrderError(`Cannot transition from ${previous} to ${String(status)}`)
      // Replacement approvals always require a submitted revision.
      if (revision && previous === 'DRAFT' && status === 'APPROVED') throw new ChangeOrderError('Submit the revision before approving it')
      label = `${revision ? 'Revision ' : ''}${{ DRAFT: 'Returned to draft', PENDING_APPROVAL: 'Submitted', APPROVED: 'Approved', REJECTED: 'Rejected' }[status]}`
      if (revision) {
        data.revisionStatus = status
        if (status === 'APPROVED') {
          const content = parseContent(co.proposedRevision)
          await validateCodes(db, actor.companyId, content)
          const { lineItems, ...fields } = content
          data = { ...data, ...fields, lineItems: lineChanges(co, content), proposedRevision: Prisma.DbNull, revisionStatus: null, approvedAt: new Date(), approvedById: actor.id }
        }
      } else {
        data.status = status
        if (status === 'PENDING_APPROVAL') data.submittedAt = new Date()
        if (status === 'APPROVED') Object.assign(data, { approvedAt: new Date(), approvedById: actor.id, rejectedAt: null, rejectedById: null, rejectionReason: null })
        if (status === 'REJECTED') Object.assign(data, { rejectedAt: new Date(), rejectedById: actor.id, rejectionReason: text(body.rejectionReason, 'rejection reason') })
        if (status === 'DRAFT') Object.assign(data, { submittedAt: null, rejectedAt: null, rejectedById: null, rejectionReason: null })
      }
    } else if (action === 'discard-revision') {
      if (!co.proposedRevision) throw new ChangeOrderError('No revision to discard', 409)
      data = { ...data, proposedRevision: Prisma.DbNull, revisionStatus: null }
      label = 'Revision discarded'
    } else throw new ChangeOrderError('Unknown change order action')
    const updated = await db.changeOrder.update({ where: { id: coId }, data, include: changeOrderInclude })
    const after = action === 'revision-status' && body.status === 'REJECTED'
      ? json({ ...object(snapshot(updated)), revisionRejectionReason: text(body.rejectionReason, 'rejection reason') }) : snapshot(updated)
    await event(db, actor, coId, label, before, after)
    return db.changeOrder.findUniqueOrThrow({ where: { id: coId }, include: changeOrderInclude })
  })
}
