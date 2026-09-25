import type { Prisma } from '@prisma/client'
import { selectHistoryEvents, type AssetHistory, type AssetHistoryEvent } from './history'

const personSelect = { firstName: true, lastName: true } as const
function personName(person: { firstName: string; lastName: string } | null) {
  return person ? `${person.firstName} ${person.lastName}`.trim() || null : null
}
function details(...parts: (string | null | undefined)[]) {
  return parts.filter(Boolean).join(' · ')
}

// This is a projection of retained source records, not a reconstructed audit log.
// Use a consistent read transaction so a transfer cannot appear half-completed.
export async function getAssetHistory(db: Prisma.TransactionClient, assetId: string, companyId: string): Promise<AssetHistory | null> {
  const asset = await db.asset.findFirst({
    where: { id: assetId, companyId },
    select: {
      id: true, name: true, equipmentId: true, purchaseDate: true, purchaseCost: true, poNumber: true, invoiceNumber: true,
      purchasedFromVendor: { select: { name: true, companyName: true } },
      company: { select: { currency: true } },
      meterReadings: { select: {
        id: true, recordedAt: true, readingType: true, value: true, notes: true, event: true,
        contextRecorded: true, assignedPersonName: true, locationName: true,
        recordedBy: { select: personSelect },
      } },
      personAssignments: { select: {
        id: true, assignedAt: true, removedAt: true, notes: true,
        assignee: { select: personSelect }, createdBy: { select: personSelect },
      } },
      jobAssignments: { select: {
        id: true, assignedAt: true, removedAt: true, locationName: true, notes: true,
        project: { select: { title: true } }, yard: { select: { name: true } }, createdBy: { select: personSelect },
      } },
      issues: { select: {
        id: true, title: true, description: true, createdAt: true, resolvedAt: true,
        reporterName: true, reportedBy: { select: personSelect }, resolvedBy: { select: personSelect },
      } },
    },
  })
  if (!asset) return null

  // A work order can have multiple issues on this asset. Fetch orders once,
  // explicitly scoped to the company, rather than emitting one per issue link.
  const workOrders = await db.workOrder.findMany({
    where: { companyId, OR: [{ assetId }, { issues: { some: { issue: { assetId } } } }] },
    select: {
      id: true, title: true, description: true, createdAt: true, completedAt: true, sourceData: true, sourceCreatedByName: true,
      createdBy: { select: personSelect },
    },
  })

  const events: AssetHistoryEvent[] = []
  const baseUrl = `/dashboard/assets/${encodeURIComponent(assetId)}`
  const reference = (id: string, label: string, tab: string) => ({ id, label, href: `${baseUrl}?tab=${tab}` })

  if (asset.purchaseDate) {
    events.push({
      id: `purchase:${asset.id}`, type: 'PURCHASE', occurredAt: asset.purchaseDate.toISOString(), dateOnly: true,
      action: 'Asset purchased', actor: null,
      details: details(
        asset.purchasedFromVendor && `Vendor: ${asset.purchasedFromVendor.companyName || asset.purchasedFromVendor.name}`,
        asset.purchaseCost !== null ? `Cost: ${asset.purchaseCost} ${asset.company.currency}` : null,
        asset.poNumber && `PO: ${asset.poNumber}`, asset.invoiceNumber && `Invoice: ${asset.invoiceNumber}`,
      ) || 'Purchase date recorded on the asset.',
      reference: reference(asset.id, 'Purchase details', 'purchase'),
    })
  }

  for (const reading of asset.meterReadings) {
    const eventLabel = reading.event === 'ARRIVAL' ? 'Arrival reading' : reading.event === 'DEPARTURE' ? 'Departure reading' : 'Meter reading recorded'
    events.push({
      id: `meter:${reading.id}`, type: 'METER_READING', occurredAt: reading.recordedAt.toISOString(),
      action: eventLabel, details: details(`${reading.value} ${reading.readingType === 'HOURS' ? 'hours' : 'miles'}`, reading.notes),
      actor: personName(reading.recordedBy),
      person: reading.contextRecorded ? reading.assignedPersonName || 'Unassigned' : 'Not recorded',
      location: reading.contextRecorded ? reading.locationName || 'No location' : 'Not recorded',
      reference: reference(reading.id, 'Meter reads', 'meter'),
    })
  }

  for (const assignment of asset.personAssignments) {
    const common = {
      type: 'ASSIGNMENT' as const, person: personName(assignment.assignee), details: assignment.notes || '',
      reference: reference(assignment.id, 'Assignments', 'people'),
    }
    events.push({ ...common, id: `assignment:${assignment.id}:start`, occurredAt: assignment.assignedAt.toISOString(), action: 'Person assigned', actor: personName(assignment.createdBy) })
    if (assignment.removedAt) {
      // createdBy identifies who opened the period, not who ended it.
      events.push({ ...common, id: `assignment:${assignment.id}:end`, occurredAt: assignment.removedAt.toISOString(), action: 'Person assignment ended', actor: null })
    }
  }

  for (const assignment of asset.jobAssignments) {
    const common = {
      type: 'LOCATION' as const,
      location: assignment.locationName || assignment.project?.title || assignment.yard?.name || 'Not recorded',
      details: assignment.notes || '', reference: reference(assignment.id, 'Locations', 'assignments'),
    }
    events.push({ ...common, id: `location:${assignment.id}:start`, occurredAt: assignment.assignedAt.toISOString(), action: 'Arrived at location', actor: personName(assignment.createdBy) })
    if (assignment.removedAt) {
      events.push({ ...common, id: `location:${assignment.id}:end`, occurredAt: assignment.removedAt.toISOString(), action: 'Left location', actor: null })
    }
  }

  for (const issue of asset.issues) {
    const common = { type: 'ISSUE' as const, details: details(issue.title, issue.description), reference: reference(issue.id, issue.title, 'issues') }
    events.push({ ...common, id: `issue:${issue.id}:reported`, occurredAt: issue.createdAt.toISOString(), action: 'Issue reported', actor: personName(issue.reportedBy) || (issue.reporterName ? `${issue.reporterName} (public report)` : null) })
    if (issue.resolvedAt) {
      events.push({ ...common, id: `issue:${issue.id}:resolved`, occurredAt: issue.resolvedAt.toISOString(), action: 'Issue resolved / closed', actor: personName(issue.resolvedBy) })
    }
  }

  for (const order of workOrders) {
    const common = {
      type: 'WORK_ORDER' as const, details: details(order.title, order.description),
      reference: { id: order.id, label: order.title, href: `/dashboard/assets/work-orders/${encodeURIComponent(order.id)}` },
    }
    events.push({ ...common, id: `work-order:${order.id}:created`, occurredAt: order.createdAt.toISOString(), action: 'Work order created', actor: order.sourceData ? order.sourceCreatedByName : personName(order.createdBy) })
    if (order.completedAt) {
      // No completedBy is stored; neither creator nor assignee proves who finished it.
      events.push({ ...common, id: `work-order:${order.id}:completed`, occurredAt: order.completedAt.toISOString(), action: 'Work order completed', actor: null })
    }
  }

  const notices = [
    'History is assembled from retained records, not a complete audit log. Deleted records, past edits, reopened issue resolutions, and removed work-order links may be unavailable. Work orders are included through direct asset links or currently linked issues.',
    'Meter-reading context and saved location labels are snapshots. Other names, descriptions, and purchase details reflect current records. Actors are shown only where recorded.',
  ]
  if (!asset.purchaseDate) notices.push('No purchase date is recorded, so no purchase event is shown.')
  return { asset: { id: asset.id, name: asset.name, equipmentId: asset.equipmentId }, events: selectHistoryEvents(events, 'ALL', 'desc'), notices }
}
