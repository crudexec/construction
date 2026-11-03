import { PrismaClient } from '@prisma/client'
import { auditData } from '../src/lib/platform/audit'

// Explicit operator action; never runs during migration, build, or application startup.
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL explicitly for the intended environment.')
  const args = process.argv.slice(2)
  const option = (name: string) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined }
  const email = option('--email')?.trim().toLowerCase(), action = option('--action'), reason = option('--reason')
  if (!email || !['grant', 'revoke', 'reset-mfa'].includes(action || '') || !reason?.trim()) throw new Error('Usage: tsx scripts/platform-admin.ts --action grant|revoke|reset-mfa --email owner@example.com --reason "Approved by the owner"')
  const prisma = new PrismaClient()
  try {
    await prisma.$transaction(async tx => {
      // Serialize operator grant changes so concurrent revocations cannot both
      // pass the last-administrator check.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('buildflo-platform-admin-grants'))`
      const user = await tx.user.findUniqueOrThrow({ where: { email }, include: { company: true } })
      if (action === 'grant') {
        if (!user.isActive || user.company.status !== 'ACTIVE') throw new Error('Choose an active account in an active company.')
        await tx.platformAdmin.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} })
      } else {
        const admin = await tx.platformAdmin.findUniqueOrThrow({ where: { userId: user.id } })
        await tx.platformSession.deleteMany({ where: { userId: admin.userId } })
        if (action === 'revoke') {
          if (await tx.platformAdmin.count() <= 1) throw new Error('Grant a replacement platform administrator before revoking the last one.')
          await tx.platformAdmin.delete({ where: { userId: user.id } })
        } else await tx.platformAdmin.update({ where: { userId: user.id }, data: { secret: null, pendingSecret: null, pendingExpiresAt: null, mfaEnabledAt: null, lastCounter: -1, failedAttempts: 0, lockedUntil: null } })
      }
      await tx.auditEvent.create({ data: auditData({ companyId: user.companyId, companyName: user.company.name, actorName: 'Server administrator', actorType: 'OPERATOR', scope: 'PLATFORM', module: 'security', action: action!, resourceId: user.id, summary: `Platform administrator ${action}: ${email}`, reason }) })
    })
    console.log(`Platform administrator ${action} completed for ${email}.`)
  } finally { await prisma.$disconnect() }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Operation failed'); process.exitCode = 1 })
