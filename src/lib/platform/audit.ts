import { randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type AuditActor = { companyId: string; companyName: string; actorId?: string; actorName: string; actorType: string }
export type AuditInput = AuditActor & {
  requestId?: string; scope?: 'COMPANY' | 'PLATFORM'; module: string; action: string;
  resourceId?: string; summary: string; outcome?: 'STARTED' | 'SUCCEEDED' | 'FAILED';
  reason?: string; before?: unknown; after?: unknown;
}

// An allowlist, not a secret-name denylist: arbitrary metadata never reaches the log.
const fields = new Set(['id', 'name', 'title', 'status', 'role', 'isActive', 'firstName', 'lastName',
  'equipmentId', 'assetType', 'category', 'priority', 'dueDate', 'completedAt', 'isAccepted',
  'expiresAt', 'emailSent', 'renewed', 'resent', 'count', 'imported', 'skipped', 'failed', 'total',
  'appName', 'currency', 'website', 'phone', 'email', 'city', 'state', 'country', 'zipCode',
  'address', 'currentAssigneeId', 'currentYardId', 'currentProjectId', 'currentLocation', 'assetId', 'yardId', 'assignedToId', 'version', 'action', 'companyId', 'userId'])
export function safeSnapshot(value: unknown): Prisma.InputJsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: Record<string, Prisma.InputJsonValue | null> = {}
  for (const [key, item] of Object.entries(value)) {
    if (!fields.has(key)) continue
    if (item instanceof Date) result[key] = item.toISOString()
    else if (item === null || typeof item === 'boolean' || typeof item === 'number') result[key] = item
    else if (typeof item === 'string') result[key] = item.slice(0, 300)
  }
  return result
}

export function auditData(input: AuditInput): Prisma.AuditEventCreateInput {
  return {
    ...input, requestId: input.requestId || randomUUID(), scope: input.scope || 'COMPANY',
    outcome: input.outcome || 'SUCCEEDED', summary: input.summary.slice(0, 500),
    before: input.before === undefined ? undefined : safeSnapshot(input.before),
    after: input.after === undefined ? undefined : safeSnapshot(input.after),
  }
}
export async function recordAudit(input: AuditInput) {
  return prisma.auditEvent.create({ data: auditData(input) })
}
