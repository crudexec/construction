import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { tokenHash } from './crypto'
import { requestOrigin } from '@/lib/import-review/server'

export const privateHeaders = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' }
export class PlatformError extends Error { constructor(message: string, public status = 400) { super(message) } }
export function failure(error: unknown) {
  if (error instanceof PlatformError) return NextResponse.json({ error: error.message }, { status: error.status, headers: privateHeaders })
  console.error('Platform request failed', error instanceof Error ? error.name : 'unknown')
  return NextResponse.json({ error: 'Could not complete this operation. Please try again.' }, { status: 500, headers: privateHeaders })
}
export async function platformIdentity(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace(/^Bearer /, '')
  const user = token ? await validateUser(token) : null
  if (!user) throw new PlatformError('Please sign in to continue.', 401)
  const admin = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
  if (!admin) throw new PlatformError('Platform administrator access required.', 403)
  return { user, admin }
}
export async function hasPlatformSession(request: NextRequest, user: Awaited<ReturnType<typeof platformIdentity>>['user']) {
  const token = request.cookies.get('platform-session')?.value
  if (!token) return false
  const session = await prisma.platformSession.findUnique({ where: { tokenHash: tokenHash(token) } })
  return !!session && session.userId === user.id && session.expiresAt > new Date() &&
    session.userVersion === user.sessionVersion && session.companyVersion === user.company.accessVersion
}
export async function requirePlatform(request: NextRequest) {
  const identity = await platformIdentity(request)
  if (!identity.admin.mfaEnabledAt || !await hasPlatformSession(request, identity.user)) throw new PlatformError('Verify your authenticator to continue.', 403)
  return identity.user
}
export const actorFor = (user: Awaited<ReturnType<typeof requirePlatform>>) => ({
  companyId: user.companyId, companyName: user.company.name, actorId: user.id,
  actorName: `${user.firstName} ${user.lastName}`.trim(), actorType: 'PLATFORM_ADMIN', scope: 'PLATFORM' as const,
})
export async function input(request: NextRequest) {
  if (request.headers.get('origin') !== requestOrigin(request) || request.headers.get('sec-fetch-site') === 'cross-site') throw new PlatformError('Open Buildflo to make this change.', 403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new PlatformError('Expected JSON.', 415)
  const reader = request.body?.getReader(); if (!reader) throw new PlatformError('Missing request body.')
  let length = 0; const chunks: Uint8Array[] = []
  while (true) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.length; if (length > 16384) { await reader.cancel(); throw new PlatformError('Request is too large.', 413) } chunks.push(chunk.value) }
  try { const result = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error(); return result as Record<string, unknown> } catch { throw new PlatformError('Invalid request body.') }
}
export function text(value: unknown, name: string, max = 160) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new PlatformError(`${name} is required (up to ${max} characters).`)
  return value.trim()
}
export function email(value: unknown) {
  const result = text(value, 'Email', 254).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new PlatformError('Enter a valid email address.')
  return result
}
export function pageArgs(request: NextRequest) {
  const params = request.nextUrl.searchParams, page = Number(params.get('page') || 1)
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new PlatformError('Invalid page.')
  return { params, page, take: 25, skip: (page - 1) * 25, search: (params.get('search') || '').trim().slice(0, 160) }
}
