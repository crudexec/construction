import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export class RelationshipError extends Error {
  constructor(message: string, public status = 400, public candidates?: { id: string; companyName: string }[]) { super(message) }
}

function text(body: Record<string, unknown>, key: string, required = false) {
  const value = body[key]
  if (value == null && !required) return null
  if (typeof value !== 'string' || value.length > (key === 'notes' ? 20000 : 300)) throw new RelationshipError(`Invalid ${key}`)
  const trimmed = value.trim()
  if (required && !trimmed) throw new RelationshipError(`${key} is required`)
  return trimmed || null
}

export async function saveVendorContact(companyId: string, vendorId: string, contactId: string | null, body: Record<string, unknown>) {
  const data: Prisma.VendorContactUncheckedUpdateInput = {}
  for (const key of ['firstName', 'lastName', 'email', 'phone', 'position', 'notes'] as const) {
    if (!contactId || key in body) {
      const value = text(body, key, key === 'firstName' || key === 'lastName')
      if (key === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new RelationshipError('Invalid email')
      data[key] = value as string
    }
  }
  for (const key of ['isPrimary', 'isBilling'] as const) if (key in body) {
    if (typeof body[key] !== 'boolean') throw new RelationshipError(`Invalid ${key}`)
    data[key] = body[key]
  }
  const destination = 'destinationVendorId' in body ? text(body, 'destinationVendorId', true)! : vendorId
  const moving = destination !== vendorId
  if (moving && !contactId) throw new RelationshipError('Create the contact at its intended company')
  return prisma.$transaction(async tx => {
    // Serialize primary-contact changes and transfers; lock both vendors in stable order.
    const ids = [...new Set([vendorId, destination])].sort()
    const vendors = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM "Vendor" WHERE "companyId"=${companyId} AND id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`)
    if (vendors.length !== ids.length) throw new RelationshipError('Vendor not found', 404)
    const existing = contactId ? await tx.vendorContact.findFirst({ where: { id: contactId, vendorId } }) : null
    if (contactId && !existing) throw new RelationshipError('Contact moved or not found. Reload the company.', 409)
    if (existing && body.updatedAt !== undefined && body.updatedAt !== existing.updatedAt.toISOString()) throw new RelationshipError('Contact changed. Reload before saving.', 409)
    if (moving) {
      data.vendorId = destination
      data.isPrimary = body.isPrimary === true
      data.isBilling = body.isBilling === true
    }
    if (data.isPrimary === true) await tx.vendorContact.updateMany({ where: { vendorId: destination, ...(contactId ? { id: { not: contactId } } : {}) }, data: { isPrimary: false } })
    if (contactId) return tx.vendorContact.update({ where: { id: contactId }, data })
    return tx.vendorContact.create({ data: { ...data, vendorId, firstName: data.firstName as string, lastName: data.lastName as string } as Prisma.VendorContactUncheckedCreateInput })
  })
}

export async function saveSupplierCompany(companyId: string, vendorId: string, body: Record<string, unknown>) {
  const selectedId = text(body, 'linkedVendorId')
  const supplierId = text(body, 'supplierId')
  const contractId = text(body, 'contractId')
  const name = text(body, 'name', !selectedId)
  const phone = text(body, 'phone'), notes = text(body, 'notes')
  return prisma.$transaction(async tx => {
    // A company-wide lock also prevents concurrent duplicate checks racing each other.
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Company" WHERE id=${companyId} FOR UPDATE`)
    const parent = await tx.vendor.findFirst({ where: { id: vendorId, companyId }, select: { id: true } })
    if (!parent) throw new RelationshipError('Vendor not found', 404)
    if (contractId && !await tx.vendorContract.findFirst({ where: { id: contractId, vendorId, companyId } })) throw new RelationshipError('Contract not found', 404)
    const legacy = supplierId ? await tx.vendorSupplier.findFirst({ where: { id: supplierId, vendorId } }) : null
    if (supplierId && !legacy) throw new RelationshipError('Supplier not found', 404)
    if (legacy?.linkedVendorId) throw new RelationshipError('Supplier already has a linked vendor', 409)
    if (selectedId === vendorId) throw new RelationshipError('A vendor cannot be its own supplier')
    let linked = selectedId ? await tx.vendor.findFirst({ where: { id: selectedId, companyId }, select: { id: true, companyName: true, phone: true } }) : null
    if (selectedId && !linked) throw new RelationshipError('Selected vendor not found', 404)
    if (!linked) {
      const candidates = await tx.vendor.findMany({ where: { companyId, companyName: { equals: name!, mode: 'insensitive' } }, select: { id: true, companyName: true } })
      if (candidates.length && body.confirmDuplicate !== true) throw new RelationshipError('A company with this name already exists. Select it or confirm this is a different company.', 409, candidates)
      linked = await tx.vendor.create({ data: { companyId, name: name!, companyName: name!, phone, notes }, select: { id: true, companyName: true, phone: true } })
    }
    const existingLink = await tx.vendorSupplier.findUnique({ where: { vendorId_linkedVendorId: { vendorId, linkedVendorId: linked.id } } })
    if (legacy && existingLink) throw new RelationshipError('This vendor is already linked to another supplier record; review rather than merging histories.', 409)
    const supplier = legacy
      ? await tx.vendorSupplier.update({ where: { id: legacy.id }, data: { linkedVendorId: linked.id } })
      : existingLink ?? await tx.vendorSupplier.create({ data: { vendorId, linkedVendorId: linked.id, name: linked.companyName, phone: phone ?? linked.phone, notes } })
    if (contractId) await tx.contractSupplier.upsert({ where: { contractId_vendorSupplierId: { contractId, vendorSupplierId: supplier.id } }, create: { contractId, vendorSupplierId: supplier.id }, update: {} })
    return supplier
  })
}

export async function removeSupplier(companyId: string, vendorId: string, supplierId: string) {
  return prisma.$transaction(async tx => {
    const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT s.id FROM "VendorSupplier" s JOIN "Vendor" v ON v.id=s."vendorId" WHERE s.id=${supplierId} AND s."vendorId"=${vendorId} AND v."companyId"=${companyId} FOR UPDATE OF s`)
    if (!locked.length) throw new RelationshipError('Supplier not found', 404)
    const history = await tx.vendorSupplier.findUniqueOrThrow({ where: { id: supplierId }, select: { _count: { select: { contractLinks: true, lienReleases: true } } } })
    if (history._count.contractLinks || history._count.lienReleases) throw new RelationshipError('Supplier is referenced by contracts or lien releases and cannot be removed.', 409)
    // Delete only the association, never the linked vendor company.
    await tx.vendorSupplier.delete({ where: { id: supplierId } })
  })
}
