import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { actorFor, failure, input, PlatformError, privateHeaders, requirePlatform, text } from '@/lib/platform/server'
import { lockCompany } from '@/lib/platform/companies'
import { auditData } from '@/lib/platform/audit'
import { keyConfigured, validateModel } from '@/lib/data-chat/openrouter'
import { prompt, settings, startOfDay } from '@/lib/data-chat/server'
type Context = { params: Promise<{ id: string }> }
export async function GET(request: NextRequest, context: Context) {
  try {
    await requirePlatform(request); const { id } = await context.params
    if (!await prisma.company.findUnique({ where: { id }, select: { id: true } })) throw new PlatformError('Company not found.', 404)
    const config = await settings(id), usedToday = await prisma.aiRun.count({ where: { companyId: id, createdAt: { gte: startOfDay() } } })
    return NextResponse.json({ ...config, keyConfigured: keyConfigured(), usedToday }, { headers: privateHeaders })
  } catch (error) { return failure(error) }
}
export async function PUT(request: NextRequest, context: Context) {
  try {
    const user = await requirePlatform(request), { id } = await context.params, body = await input(request)
    const systemPrompt = prompt(body.systemPrompt), reason = text(body.reason, 'Reason for change', 500)
    if (typeof body.enabled !== 'boolean' || !Number.isInteger(body.version) || Number(body.version) < 0) throw new PlatformError('Invalid settings version or enabled state.')
    if (!Number.isInteger(body.dailyRequestLimit) || Number(body.dailyRequestLimit) < 1 || Number(body.dailyRequestLimit) > 1000) throw new PlatformError('Daily limit must be between 1 and 1,000 requests.')
    // Disabling remains possible even if the catalog/provider is down.
    const current = await settings(id)
    const model = body.model === current.model && !body.enabled ? current.model : await validateModel(body.model)
    if (body.enabled && !keyConfigured()) throw new PlatformError('Configure the server’s OPENROUTER_API_KEY before enabling company data chat.', 503)
    const saved = await prisma.$transaction(async tx => {
      const company = await lockCompany(tx, id)
      const previous = await tx.companyAiConfig.findUnique({ where: { companyId: id } })
      if ((previous?.version || 0) !== body.version) throw new PlatformError('Settings changed in another window. Reload before saving.', 409)
      const data = { enabled: body.enabled as boolean, model, systemPrompt, dailyRequestLimit: Number(body.dailyRequestLimit), updatedById: user.id }
      const result = await tx.companyAiConfig.upsert({ where: { companyId: id }, create: { companyId: id, ...data }, update: { ...data, version: { increment: 1 } } })
      await tx.auditEvent.create({ data: auditData({ ...actorFor(user), companyId: id, companyName: company.name, module: 'data-chat', action: 'configuration-updated', resourceId: id, summary: 'Updated company data assistant configuration', reason, before: previous, after: result }) })
      return result
    })
    return NextResponse.json(saved, { headers: privateHeaders })
  } catch (error) { return failure(error) }
}
