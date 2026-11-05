import { Prisma } from '@prisma/client'

// Delete dependent business records before users, stages, vendors and cost codes.
// Their restrictive foreign keys intentionally protect individual-record deletion.
// Keep all steps in the caller's transaction: any failure restores the company.
export async function deleteCompanyRecords(tx: Prisma.TransactionClient, companyId: string) {
  const projects = await tx.card.findMany({ where: { companyId }, select: { id: true } })
  const projectIds = new Set(projects.map(project => project.id))
  // Legacy access records store project IDs as JSON rather than foreign keys.
  if (projectIds.size) {
    for (const access of await tx.subcontractorAccess.findMany()) {
      let ids: unknown
      try { ids = JSON.parse(access.projectIds) } catch { continue }
      if (!Array.isArray(ids) || !ids.some(id => projectIds.has(id))) continue
      const remaining = ids.filter(id => !projectIds.has(id))
      if (remaining.length) await tx.subcontractorAccess.update({ where: { id: access.id }, data: { projectIds: JSON.stringify(remaining) } })
      else await tx.subcontractorAccess.delete({ where: { id: access.id } })
    }
  }
  await tx.tenantApplication.deleteMany({ where: { companyId } })
  await tx.lease.deleteMany({ where: { companyId } })
  await tx.changeOrder.deleteMany({ where: { contract: { companyId } } })
  await tx.vendorContract.deleteMany({ where: { companyId } })
  await tx.purchaseOrder.deleteMany({ where: { companyId } })
  await tx.asset.deleteMany({ where: { companyId } })
  await tx.workOrder.deleteMany({ where: { companyId } })
  await tx.card.deleteMany({ where: { companyId } })
  await tx.bidRequest.deleteMany({ where: { companyId } })
  await tx.procurementItem.deleteMany({ where: { companyId } })
  await tx.inventoryMaterial.deleteMany({ where: { companyId } })
  await tx.vendorSupplier.deleteMany({ where: { vendor: { companyId } } })
  await tx.vendor.deleteMany({ where: { companyId } })
  await tx.contact.deleteMany({ where: { companyId } })
  await tx.documentTemplate.deleteMany({ where: { companyId } })
  await tx.teamInvite.deleteMany({ where: { companyId } })
  // Remaining owned rows cascade; AuditEvent deliberately has no company FK.
  await tx.company.delete({ where: { id: companyId } })
}
