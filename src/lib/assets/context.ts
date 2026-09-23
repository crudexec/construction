import { Prisma } from '@prisma/client'

export class AssetContextError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

type Actor = { id: string; companyId: string }
type ContextPatch = { currentProjectId?: unknown; currentYardId?: unknown; currentAssigneeId?: unknown; currentLocation?: unknown }

function optionalId(value: unknown): string | null {
  if (value === null || value === '') return null
  if (typeof value !== 'string') throw new AssetContextError('Select a valid person, project, or yard')
  return value
}

export async function lockAsset(tx: Prisma.TransactionClient, assetId: string, companyId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Asset" WHERE "id" = ${assetId} AND "companyId" = ${companyId} FOR UPDATE`
  const asset = await tx.asset.findFirst({ where: { id: assetId, companyId } })
  if (!asset) throw new AssetContextError('Asset not found', 404)
  return asset
}

export async function resolveLocation(tx: Prisma.TransactionClient, companyId: string, projectInput: unknown, yardInput: unknown) {
  const projectId = optionalId(projectInput ?? null)
  const yardId = optionalId(yardInput ?? null)
  if (projectId && yardId) throw new AssetContextError('Choose a job or a yard, not both')
  if (projectId) {
    const project = await tx.card.findFirst({ where: { id: projectId, companyId }, select: { title: true } })
    if (!project) throw new AssetContextError('Project not found', 404)
    return { currentProjectId: projectId, currentYardId: null, currentLocation: project.title }
  }
  if (yardId) {
    const yard = await tx.assetYard.findFirst({ where: { id: yardId, companyId }, select: { name: true } })
    if (!yard) throw new AssetContextError('Yard not found', 404)
    return { currentProjectId: null, currentYardId: yardId, currentLocation: yard.name }
  }
  return { currentProjectId: null, currentYardId: null, currentLocation: null }
}

export async function resolvePerson(tx: Prisma.TransactionClient, companyId: string, input: unknown) {
  const id = optionalId(input)
  if (!id) return null
  const person = await tx.user.findFirst({ where: { id, companyId }, select: { id: true, firstName: true, lastName: true } })
  if (!person) throw new AssetContextError('Person not found', 404)
  return person
}

// One transaction/row lock keeps current context and its history consistent across entry points.
export async function applyAssetContext(tx: Prisma.TransactionClient, assetId: string, actor: Actor, patch: ContextPatch, changedAt?: Date) {
  const asset = await lockAsset(tx, assetId, actor.companyId)
  changedAt ||= new Date()
  const data: Prisma.AssetUncheckedUpdateInput = {}
  if (patch.currentLocation !== undefined && patch.currentLocation !== null && typeof patch.currentLocation !== 'string') throw new AssetContextError('Location must be text')
  const hasLocation = patch.currentProjectId !== undefined || patch.currentYardId !== undefined
  if (hasLocation || patch.currentLocation !== undefined) {
    const legacyText = typeof patch.currentLocation === 'string' ? patch.currentLocation.trim() || null : null
    const location = hasLocation
      ? await resolveLocation(tx, actor.companyId, patch.currentProjectId, patch.currentYardId)
      : legacyText === asset.currentLocation
        ? { currentProjectId: asset.currentProjectId, currentYardId: asset.currentYardId, currentLocation: legacyText }
        : { currentProjectId: null, currentYardId: null, currentLocation: legacyText }
    const changed = location.currentProjectId !== asset.currentProjectId || location.currentYardId !== asset.currentYardId || (!location.currentProjectId && !location.currentYardId && location.currentLocation !== asset.currentLocation)
    if (changed) {
      const future = await tx.assetJobAssignment.findFirst({ where: { assetId, removedAt: null, assignedAt: { gt: changedAt } } })
      if (future) throw new AssetContextError('Location date cannot precede the current location period')
      await tx.assetJobAssignment.updateMany({ where: { assetId, removedAt: null }, data: { removedAt: changedAt } })
      if (location.currentProjectId || location.currentYardId) {
        await tx.assetJobAssignment.create({ data: { assetId, projectId: location.currentProjectId, yardId: location.currentYardId, locationName: location.currentLocation, assignedAt: changedAt, createdById: actor.id } })
      }
    }
    Object.assign(data, location)
  }
  if (patch.currentAssigneeId !== undefined) {
    const person = await resolvePerson(tx, actor.companyId, patch.currentAssigneeId)
    if ((person?.id || null) !== asset.currentAssigneeId) {
      const future = await tx.assetPersonAssignment.findFirst({ where: { assetId, removedAt: null, assignedAt: { gt: changedAt } } })
      if (future) throw new AssetContextError('Assignment date cannot precede the current assignment period')
      await tx.assetPersonAssignment.updateMany({ where: { assetId, removedAt: null }, data: { removedAt: changedAt } })
      if (person) await tx.assetPersonAssignment.create({ data: { assetId, assigneeId: person.id, assignedAt: changedAt, createdById: actor.id } })
      data.currentAssigneeId = person?.id || null
    }
  }
  return tx.asset.update({ where: { id: assetId }, data })
}

export async function meterContext(tx: Prisma.TransactionClient, assetId: string, companyId: string, input: { assigneeId?: unknown; projectId?: unknown; yardId?: unknown } = {}) {
  const asset = await lockAsset(tx, assetId, companyId)
  const person = await resolvePerson(tx, companyId, input.assigneeId === undefined ? asset.currentAssigneeId : input.assigneeId)
  const explicitLocation = input.projectId !== undefined || input.yardId !== undefined
  const location = await resolveLocation(tx, companyId, explicitLocation ? input.projectId : asset.currentProjectId, explicitLocation ? input.yardId : asset.currentYardId)
  return {
    contextRecorded: true,
    assignedPersonId: person?.id || null,
    assignedPersonName: person ? `${person.firstName} ${person.lastName}` : null,
    locationProjectId: location.currentProjectId,
    locationYardId: location.currentYardId,
    locationName: location.currentLocation || (!explicitLocation ? asset.currentLocation : null),
  }
}
