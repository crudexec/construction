import { randomBytes } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { comparePassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { auditData } from '@/lib/platform/audit'
import { matchingCounter, newTotpSecret, seal, tokenHash, unseal } from '@/lib/platform/crypto'
import { actorFor, failure, input, platformIdentity, privateHeaders } from '@/lib/platform/server'

export async function POST(request: NextRequest) {
  try {
    const { user } = await platformIdentity(request), body = await input(request)
    const sessionToken = randomBytes(32).toString('hex')
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT "userId" FROM "PlatformAdmin" WHERE "userId"=${user.id} FOR UPDATE`)
      const admin = await tx.platformAdmin.findUniqueOrThrow({ where: { userId: user.id } })
      if (body.action === 'lock') {
        await tx.platformSession.deleteMany({ where: { tokenHash: tokenHash(request.cookies.get('platform-session')?.value || '') } })
        return { locked: true }
      }
      if (admin.lockedUntil && admin.lockedUntil > new Date()) return { error: 'Too many attempts. Try again in 15 minutes.', status: 429 }
      const reject = async () => {
        const failures = admin.lockedUntil ? 1 : admin.failedAttempts + 1
        await tx.platformAdmin.update({ where: { userId: user.id }, data: { failedAttempts: failures, lockedUntil: failures >= 5 ? new Date(Date.now() + 15 * 60000) : null } })
        await tx.auditEvent.create({ data: auditData({ ...actorFor(user), module: 'security', action: 'verification', summary: 'Platform verification failed', outcome: 'FAILED' }) })
        return { error: 'Verification failed. Check your password or authenticator code.', status: 400 }
      }
      if (body.action === 'setup') {
        if (admin.mfaEnabledAt) return { error: 'An authenticator is already configured.', status: 409 }
        if (typeof body.password !== 'string' || !await comparePassword(body.password, user.password)) return reject()
        const secret = newTotpSecret()
        await tx.platformAdmin.update({ where: { userId: user.id }, data: { pendingSecret: seal(secret), pendingExpiresAt: new Date(Date.now() + 10 * 60000), failedAttempts: 0, lockedUntil: null } })
        return { secret, uri: `otpauth://totp/${encodeURIComponent('Buildflo:' + user.email)}?secret=${secret}&issuer=Buildflo&algorithm=SHA1&digits=6&period=30` }
      }
      if (body.action !== 'verify') return { error: 'Unknown security action.', status: 400 }
      const encrypted = admin.mfaEnabledAt ? admin.secret : admin.pendingExpiresAt && admin.pendingExpiresAt > new Date() ? admin.pendingSecret : null
      if (!encrypted || typeof body.code !== 'string') return reject()
      const counter = matchingCounter(unseal(encrypted), body.code, admin.lastCounter)
      if (counter === null) return reject()
      await tx.platformAdmin.update({ where: { userId: user.id }, data: { secret: encrypted, pendingSecret: null, pendingExpiresAt: null, mfaEnabledAt: admin.mfaEnabledAt || new Date(), lastCounter: counter, failedAttempts: 0, lockedUntil: null } })
      await tx.platformSession.deleteMany({ where: { userId: user.id, expiresAt: { lte: new Date() } } })
      await tx.platformSession.create({ data: { tokenHash: tokenHash(sessionToken), userId: user.id, userVersion: user.sessionVersion, companyVersion: user.company.accessVersion, expiresAt: new Date(Date.now() + 2 * 3600000) } })
      await tx.auditEvent.create({ data: auditData({ ...actorFor(user), module: 'security', action: admin.mfaEnabledAt ? 'verified' : 'enrolled', summary: admin.mfaEnabledAt ? 'Platform workspace unlocked' : 'Platform authenticator enrolled' }) })
      return { verified: true }
    })
    const response = NextResponse.json(result, { status: 'status' in result ? result.status : 200, headers: privateHeaders })
    if ('verified' in result) response.cookies.set('platform-session', sessionToken, { httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'strict', path: '/', maxAge: 7200 })
    if ('locked' in result) response.cookies.set('platform-session', '', { httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'strict', path: '/', maxAge: 0 })
    return response
  } catch (error) { return failure(error) }
}
