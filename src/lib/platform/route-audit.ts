import { randomUUID, createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { requestOrigin } from '@/lib/import-review/server'
import { validateVendor } from '@/lib/vendor-auth'
import { AuditActor, recordAudit, safeSnapshot } from './audit'

type Handler = (...args: any[]) => Promise<any>
const anonymous = new Set(['/api/auth/login', '/api/auth/register', '/api/vendor-portal/login', '/api/health'])
// Legacy reads which initialize preferences, mark messages read, or record visits.
const statefulReads = new Set(['/api/asset-issue-notification-settings', '/api/notifications/preferences', '/api/project/[id]/messages', '/api/project/[id]/portal-settings', '/api/shared/task/[token]', '/api/vendor-portal/notification-preferences'])
const denied = () => NextResponse.json({ error: 'This account or link is unavailable. Please sign in again or contact support.' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } })

async function companyActor(companyId: string, actorName: string, actorType: string, actorId?: string): Promise<AuditActor | null> {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true, status: true } })
  return company?.status === 'ACTIVE' ? { companyId, companyName: company.name, actorName, actorType, actorId } : null
}

async function resolveActor(request: NextRequest, route: string, params: Record<string, string>): Promise<AuditActor | null> {
  if (route.startsWith('/api/cron/')) {
    return process.env.CRON_SECRET && request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}` ? { companyId: 'platform', companyName: 'Buildflo', actorName: 'Scheduled job', actorType: 'SYSTEM' } : null
  }
  if (route.startsWith('/api/invite/')) {
    const invite = await prisma.teamInvite.findFirst({ where: { token: params.token, isAccepted: false, expiresAt: { gt: new Date() } } })
    return invite ? companyActor(invite.companyId, 'Invitation recipient', 'INVITEE', invite.id) : null
  }
  if (route.startsWith('/api/shared/import-review/')) {
    const tokenHash = createHash('sha256').update(params.token || '').digest('hex')
    const review = await prisma.assetImportReview.findUnique({ where: { tokenHash } })
    return review && !review.revokedAt && review.expiresAt > new Date() ? companyActor(review.companyId, 'Import reviewer', 'SHARED_LINK', review.id) : null
  }
  if (route.startsWith('/api/shared/asset/')) {
    const asset = await prisma.asset.findFirst({ where: { shareToken: params.token, isShareable: true }, select: { id: true, companyId: true } })
    return asset ? companyActor(asset.companyId, 'Shared asset visitor', 'SHARED_LINK', asset.id) : null
  }
  if (route.startsWith('/api/shared/task/')) {
    const task = await prisma.task.findFirst({ where: { shareToken: params.token, isShareable: true }, select: { id: true, card: { select: { companyId: true } } } })
    return task ? companyActor(task.card.companyId, 'Shared task visitor', 'SHARED_LINK', task.id) : null
  }
  if (route.startsWith('/api/client/project/')) {
    if (!params.token || params.token.length < 16 || params.token.length > 200) return null
    const candidates = await prisma.card.findMany({ where: { customFields: { contains: params.token } }, select: { id: true, customFields: true, companyId: true } })
    const project = candidates.find(c => { try { const fields = JSON.parse(c.customFields || '{}'); return fields.clientAccessToken === params.token && fields.clientAccessEnabled === true } catch { return false } })
    return project ? companyActor(project.companyId, 'Client portal visitor', 'CLIENT', project.id) : null
  }
  const bearer = request.headers.get('authorization')?.replace(/^Bearer /, '')
  if (route.startsWith('/api/vendor-portal/')) {
    const token = request.cookies.get('vendor-auth-token')?.value || bearer
    const vendor = token ? await validateVendor(token) : null
    return vendor ? companyActor(vendor.companyId, vendor.name, 'VENDOR', vendor.id) : null
  }
  const token = request.cookies.get('auth-token')?.value || bearer || (route === '/api/files/[id]' ? request.nextUrl.searchParams.get('t') : null)
  const user = token ? await validateUser(token) : null
  return user ? { companyId: user.companyId, companyName: user.company.name, actorId: user.id, actorName: `${user.firstName} ${user.lastName}`.trim(), actorType: 'USER' } : null
}

// Only bounded, company-scoped record fields are read for before/after details.
async function snapshot(route: string, params: Record<string, string>, actor: AuditActor) {
  if (actor.actorType !== 'USER') return {}
  if (route === '/api/company/settings') return safeSnapshot(await prisma.company.findUnique({ where: { id: actor.companyId } }))
  if (!params.id) return {}
  const where = { id: params.id, companyId: actor.companyId }
  if (/^\/api\/assets\/\[id\](?:\/|$)/.test(route)) return safeSnapshot(await prisma.asset.findFirst({ where }))
  if (/^\/api\/(project|projects|card)\/\[id\]$/.test(route)) return safeSnapshot(await prisma.card.findFirst({ where }))
  if (/^\/api\/contacts\/\[id\]$/.test(route)) return safeSnapshot(await prisma.contact.findFirst({ where }))
  if (/^\/api\/vendors\/\[id\]$/.test(route)) return safeSnapshot(await prisma.vendor.findFirst({ where }))
  if (/^\/api\/team\/\[id\]$/.test(route)) return safeSnapshot(await prisma.user.findFirst({ where }))
  if (route.startsWith('/api/work-orders/[id]')) return safeSnapshot(await prisma.workOrder.findFirst({ where }))
  if (route === '/api/feedback/[id]') return safeSnapshot(await prisma.feedbackRequest.findFirst({ where }))
  if (route.startsWith('/api/task/[id]')) return safeSnapshot(await prisma.task.findFirst({ where: { id: params.id, card: { companyId: actor.companyId } } }))
  return {}
}

/** Shared coverage for every existing API handler. Permission checks precede the handler.
 * An immutable STARTED record precedes each mutation; the outcome is appended after it.
 * A process crash therefore leaves an observable incomplete attempt, never a false success.
 */
export function auditedRoute<T extends Handler>(route: string, method: string, handler: T): T {
  return (async (...args: Parameters<T>) => {
    const original = args[0] as Request | undefined
    if (!original) return handler(...args)
    const request = original instanceof NextRequest ? original : new NextRequest(original)
    const params = args[1]?.params ? await args[1].params : {}
    let actor: AuditActor | null = null
    const requestId = randomUUID()
    const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(method)
    const download = method === 'GET' && (/\/(files|export|download|report|pdf)(\/|$)/.test(route) || route.startsWith('/api/cron/'))
    const shouldAudit = mutation || download || (method === 'GET' && statefulReads.has(route))
    let started = false
    let before: unknown = {}
    const pieces = route.split('/').filter(p => p && p !== 'api' && !p.startsWith('['))
    const module = pieces[0] || 'application'
    const action = method === 'GET' ? 'view-or-export' : method === 'POST' ? 'create-or-submit' : method === 'DELETE' ? 'delete' : 'update'
    const summary = `${method === 'POST' ? 'Submitted' : method === 'DELETE' ? 'Removed' : method === 'GET' ? 'Accessed' : 'Updated'} ${pieces.join(' / ').replaceAll('-', ' ')}`
    const resourceId = route.split('/').reverse().filter(p => p.startsWith('[') && p !== '[token]').map(p => params[p.slice(1, -1)]).find(Boolean)
    const event = () => ({ ...actor!, requestId, module, action, resourceId, summary, scope: actor?.actorType === 'SYSTEM' ? 'PLATFORM' as const : 'COMPANY' as const })
    try {
      if (mutation && (request.headers.get('sec-fetch-site') === 'cross-site' || (request.headers.get('origin') && request.headers.get('origin') !== requestOrigin(request)))) return NextResponse.json({ error: 'Open Buildflo to make this change.' }, { status: 403 })
      if (!anonymous.has(route)) {
        actor = await resolveActor(request, route, params)
        if (!actor) return route.startsWith('/api/shared/') || route.startsWith('/api/client/') || route.startsWith('/api/invite/') ? NextResponse.json({ error: 'This link is unavailable or expired.' }, { status: 404 }) : denied()
      }
      if (actor && shouldAudit) {
        before = await snapshot(route, params, actor)
        await recordAudit({ ...event(), outcome: 'STARTED', before })
        started = true
      }
      const response: Response = await handler(...args)
      // Login attribution comes exclusively from a successful server response.
      if (response.ok && (route === '/api/auth/login' || route === '/api/vendor-portal/login')) {
        const result = await response.clone().json()
        if (result.user?.id) {
          const user = await prisma.user.findUnique({ where: { id: result.user.id }, select: { id: true, firstName: true, lastName: true, companyId: true } })
          if (user) actor = await companyActor(user.companyId, `${user.firstName} ${user.lastName}`, 'USER', user.id)
        } else if (result.vendor?.id) actor = await companyActor(result.vendor.companyId, result.vendor.name, 'VENDOR', result.vendor.id)
      }
      if (actor && shouldAudit) {
        let after = response.ok ? await snapshot(route, params, actor) : {}
        if (response.ok && method === 'POST' && ['/api/assets', '/api/project', '/api/card', '/api/contacts', '/api/vendors', '/api/work-orders', '/api/feedback'].includes(route)) {
          const result = await response.clone().json().catch(() => ({}))
          after = safeSnapshot(result.asset || result.project || result.card || result.contact || result.vendor || result.workOrder || result)
        }
        const previous = safeSnapshot(before), current = safeSnapshot(after)
        const label = current.name || current.title || previous.name || previous.title
        const change = previous.status && current.status && previous.status !== current.status ? ` from ${previous.status} to ${current.status}` : ''
        const detailSummary = label ? `${actor.actorName} ${method === 'DELETE' ? 'removed' : method === 'POST' && pieces.length > 1 ? 'submitted ' + pieces.slice(1).join(' / ') + ' for' : method === 'POST' ? 'created' : 'updated'} ${label}${change}` : summary
        await recordAudit({ ...event(), resourceId: resourceId || (typeof current.id === 'string' ? current.id : undefined), summary: detailSummary, outcome: response.ok ? 'SUCCEEDED' : 'FAILED', before, after, ...(route.endsWith('/login') ? { action: 'signed-in', summary: `${actor.actorName} signed in` } : {}) })
      }
      return response
    } catch (error) {
      if (actor && started) {
        try { await recordAudit({ ...event(), outcome: 'FAILED', summary: `${summary} — operation or audit completion failed` }) } catch { /* STARTED remains durable and surfaces in the attention queue. */ }
      }
      console.error('Audited request failed', route, error instanceof Error ? error.name : 'unknown')
      return NextResponse.json({ error: 'Could not complete the request. Refresh to check the result before retrying.' }, { status: 500 })
    }
  }) as T
}
