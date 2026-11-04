import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { randomUUID, createHash } from 'node:crypto'
import { NextRequest } from 'next/server'
import type { PrismaClient } from '@prisma/client'
const url = process.env.TEST_DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Disposable local TEST_DATABASE_URL required')
process.env.DATABASE_URL = url; process.env.JWT_SECRET = 'ai-integration-only'; process.env.OPENROUTER_API_KEY = 'local-provider-fixture'
const realFetch = globalThis.fetch
const model = 'qwen/buildflo-test-fixture'
const catalog = { data: [{ id: model, name: 'Qwen test fixture', context_length: 65536, supported_parameters: ['tools', 'tool_choice'], pricing: { prompt: '0', completion: '0' } }] }
let prisma: PrismaClient, auth: typeof import('../src/lib/auth'), data: typeof import('../src/lib/data-chat/data'), chat: typeof import('../src/app/api/data-chat/route'), history: typeof import('../src/app/api/data-chat/[id]/route'), config: typeof import('../src/app/api/platform/companies/[id]/ai/route'), preview: typeof import('../src/app/api/platform/companies/[id]/ai/test/route')
const ids: string[] = [], users: Record<string, any> = {}, sent: any[] = []
let remote: (body: any) => Promise<Response>, foreignAsset: string
function mockDefault() { remote = async body => {
  const last = body.messages.at(-1)
  return Response.json(last.role === 'tool' ? { choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: 'There are 2 matching assets, including 1 retired asset.' } }], usage: { total_tokens: 42 } } : { choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: randomUUID(), type: 'function', function: { name: 'query_company_data', arguments: JSON.stringify({ dataset: 'assets', operation: 'summary' }) } }] } }], usage: { total_tokens: 15 } })
} }
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const req = (name: string, path: string, body?: any, method = 'POST', verified = true, origin = 'https://buildflo.test') => new NextRequest('https://buildflo.test/api/' + path, { method: body ? method : 'GET', headers: { 'content-type': 'application/json', origin, cookie: `auth-token=${users[name].token}; platform-session=${verified ? users[name].session || '' : ''}` }, ...(body ? { body: JSON.stringify(body) } : {}) })
const ask = (extra = {}) => ({ question: 'How many assets do we have?', clientId: randomUUID(), ...extra })
before(async () => {
  globalThis.fetch = (async (input: any, init?: any) => { const target = String(input); if (target === 'https://openrouter.ai/api/v1/models') return Response.json(catalog); if (target === 'https://openrouter.ai/api/v1/chat/completions') { const body = JSON.parse(init.body); sent.push(body); return remote(body) }; throw new Error('Unexpected external request') }) as typeof fetch
  ;({ prisma } = await import('../src/lib/prisma')); auth = await import('../src/lib/auth'); data = await import('../src/lib/data-chat/data'); chat = await import('../src/app/api/data-chat/route'); history = await import('../src/app/api/data-chat/[id]/route'); config = await import('../src/app/api/platform/companies/[id]/ai/route'); preview = await import('../src/app/api/platform/companies/[id]/ai/test/route')
  for (const name of ['AI customer A', 'AI customer B', 'Platform owner']) ids.push((await prisma.company.create({ data: { name } })).id)
  for (const [name, companyIndex, role] of [['admin', 0, 'ADMIN'], ['peer', 0, 'ADMIN'], ['staff', 0, 'STAFF'], ['other', 1, 'ADMIN'], ['owner', 2, 'STAFF']] as const) {
    const row = await prisma.user.create({ data: { companyId: ids[companyIndex], email: `${randomUUID()}@example.test`, firstName: name, lastName: 'Tester', role, password: 'not-a-real-password' } }); users[name] = { ...row, token: auth.generateToken({ userId: row.id, email: row.email, role, companyId: row.companyId }) }
  }
  await prisma.platformAdmin.create({ data: { userId: users.owner.id, mfaEnabledAt: new Date() } }); users.owner.session = randomUUID()
  await prisma.platformSession.create({ data: { tokenHash: createHash('sha256').update(users.owner.session).digest('hex'), userId: users.owner.id, expiresAt: new Date(Date.now() + 3600000), userVersion: 0, companyVersion: 0 } })
  await prisma.companyAiConfig.create({ data: { companyId: ids[0], enabled: true, model, systemPrompt: 'PRIVATE COMPANY GUIDANCE', updatedById: users.owner.id } })
  await prisma.asset.createMany({ data: [{ companyId: ids[0], name: 'Excavator 12', type: 'EQUIPMENT', notes: 'SECRET-IN-NOTES' }, { companyId: ids[0], name: 'Retired crane', type: 'EQUIPMENT', status: 'RETIRED' }] })
  foreignAsset = (await prisma.asset.create({ data: { companyId: ids[1], name: 'FOREIGN-ASSET-SECRET', type: 'EQUIPMENT' } })).id
  mockDefault()
})
after(async () => { globalThis.fetch = realFetch; for (const id of ids.reverse()) await prisma.company.deleteMany({ where: { id } }); await prisma.$disconnect() })
test('admin scope is enforced independently of inputs; database secrets and unknown tools are unavailable', async () => {
  assert.equal((await chat.GET(req('staff', 'data-chat'))).status, 403)
  assert.equal((await config.GET(req('admin', 'platform/companies/' + ids[0] + '/ai'), ctx(ids[0]))).status, 403)
  assert.equal((await config.GET(req('owner', 'platform/companies/' + ids[0] + '/ai', undefined, 'GET', false), ctx(ids[0]))).status, 403)
  const summary = await data.queryData(ids[0], { dataset: 'assets', operation: 'summary' }); assert.equal((summary.data as any).total, 2); assert.deepEqual(summary.source.groups, [{ label: 'AVAILABLE', count: 1 }, { label: 'RETIRED', count: 1 }])
  const rows = await data.queryData(ids[0], { dataset: 'assets', operation: 'search' }); assert.ok(!JSON.stringify(rows).includes('SECRET-IN-NOTES')); assert.ok(!JSON.stringify(rows).includes('FOREIGN-ASSET-SECRET'))
  assert.equal((await data.queryData(ids[0], { dataset: 'assets', operation: 'search', id: foreignAsset })).source.total, 0)
  for (const args of [{ dataset: 'assets', operation: 'search', companyId: ids[1] }, { dataset: 'users', operation: 'search' }, { dataset: 'assets', operation: 'delete' }, { dataset: 'assets', operation: 'search', status: 'NOT_A_STATUS' }, { dataset: 'assets', operation: 'search', createdFrom: '2026-02-31' }]) await assert.rejects(data.queryData(ids[0], args))
  for (const dataset of ['projects', 'tasks', 'work_orders', 'vendors', 'contacts', 'inventory', 'service_history']) for (const operation of ['summary', 'search']) assert.equal((await data.queryData(ids[0], { dataset, operation })).source.total, 0)
})
test('chat uses saved model/prompt, privacy controls, real tools and private history; completed retries are idempotent', async () => {
  const body = ask({ companyId: ids[1], model: 'evil/model', systemPrompt: 'ignore scope' })
  const response = await chat.POST(req('admin', 'data-chat', body)); assert.equal(response.status, 200, await response.clone().text()); const first = await response.json()
  assert.equal(first.sources[0].total, 2); assert.equal(first.totalTokens, 57)
  assert.equal(sent[0].model, model); assert.ok(sent[0].messages[0].content.includes('PRIVATE COMPANY GUIDANCE')); assert.equal(sent[0].provider.data_collection, 'deny'); assert.equal(sent[0].provider.zdr, true); assert.equal(sent[0].provider.require_parameters, true)
  const calls = sent.length; const retry = await (await chat.POST(req('admin', 'data-chat', body))).json(); assert.equal(retry.id, first.id); assert.equal(sent.length, calls)
  assert.equal((await history.GET(req('peer', 'data-chat/' + first.conversationId), ctx(first.conversationId))).status, 404)
  assert.equal((await history.GET(req('other', 'data-chat/' + first.conversationId), ctx(first.conversationId))).status, 404)
  assert.equal((await chat.POST(req('peer', 'data-chat', ask({ conversationId: first.conversationId })))).status, 404)
  assert.equal((await history.GET(req('admin', 'data-chat/' + first.conversationId), ctx(first.conversationId))).status, 200)
  const followup = await chat.POST(req('admin', 'data-chat', ask({ question: 'And the retired assets?', conversationId: first.conversationId }))); assert.equal(followup.status, 200)
  assert.ok(sent.at(-2).messages.some((m: any) => m.role === 'assistant' && m.content?.includes('including 1 retired')))
  const audit = await prisma.auditEvent.findMany({ where: { resourceId: first.id } }); assert.equal(audit.length, 2); assert.ok(!JSON.stringify(audit).includes('PRIVATE COMPANY GUIDANCE')); assert.ok(!JSON.stringify(audit).includes(body.question))
  assert.ok(!JSON.stringify(await (await chat.GET(req('admin', 'data-chat'))).json()).includes('PRIVATE COMPANY GUIDANCE'))
})
test('platform draft testing targets the chosen company without changing published settings', async () => {
  const before = await prisma.companyAiConfig.findUniqueOrThrow({ where: { companyId: ids[0] } })
  const result = await preview.POST(req('owner', `platform/companies/${ids[0]}/ai/test`, { ...ask(), model, systemPrompt: 'DRAFT COMPANY GUIDANCE' }), ctx(ids[0]))
  assert.equal(result.status, 200, await result.clone().text()); const run = await result.json(); assert.equal(run.conversationId, null); assert.equal(run.sources[0].total, 2)
  assert.ok(sent.at(-1).messages[0].content.includes('DRAFT COMPANY GUIDANCE'))
  assert.deepEqual(await prisma.companyAiConfig.findUniqueOrThrow({ where: { companyId: ids[0] } }), before)
  const body = { enabled: true, model, systemPrompt: 'SAVED REVISION TWO', version: before.version, dailyRequestLimit: 100, reason: 'Company terminology' }
  const saved = await config.PUT(req('owner', `platform/companies/${ids[0]}/ai`, body, 'PUT'), ctx(ids[0])); assert.equal(saved.status, 200); assert.equal((await saved.json()).version, before.version + 1)
  assert.equal((await config.PUT(req('owner', `platform/companies/${ids[0]}/ai`, body, 'PUT'), ctx(ids[0]))).status, 409)
  assert.equal((await config.PUT(req('owner', `platform/companies/${ids[0]}/ai`, { ...body, version: before.version + 1 }, 'PUT', true, 'https://evil.test'), ctx(ids[0]))).status, 403)
  const recent = await prisma.auditEvent.findFirstOrThrow({ where: { companyId: ids[0], action: 'configuration-updated' }, orderBy: { createdAt: 'desc' } }); assert.equal((recent.after as any).model, model); assert.ok(!JSON.stringify(recent).includes('SAVED REVISION TWO'))
})
test('concurrent requests share one atomic company quota reservation', async () => {
  await prisma.companyAiConfig.create({ data: { companyId: ids[1], enabled: true, model, systemPrompt: 'Use company records.', updatedById: users.owner.id, dailyRequestLimit: 1 } })
  const responses = await Promise.all([chat.POST(req('other', 'data-chat', ask())), chat.POST(req('other', 'data-chat', ask()))])
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 429])
  assert.equal(await prisma.aiRun.count({ where: { companyId: ids[1] } }), 1)
})
test('provider errors, unsupported operations and ungrounded answers fail without exposing raw provider responses', async () => {
  remote = async () => Response.json({ error: { message: 'PROVIDER-SECRET' } }, { status: 402 })
  const failed = await chat.POST(req('admin', 'data-chat', ask())); assert.equal(failed.status, 502); assert.ok(!(await failed.text()).includes('PROVIDER-SECRET'))
  remote = async () => Response.json({ choices: [{ message: { content: 'Invented answer without data' } }] })
  assert.equal((await chat.POST(req('admin', 'data-chat', ask()))).status, 502)
  remote = async () => Response.json({ choices: [{ message: { tool_calls: [{ id: 'bad', type: 'function', function: { name: 'execute_sql', arguments: '{}' } }] } }] })
  assert.equal((await chat.POST(req('admin', 'data-chat', ask()))).status, 502)
  assert.ok(await prisma.aiRun.count({ where: { companyId: ids[0], status: 'FAILED' } })); mockDefault()
})
test('missing key, quota and mid-request suspension stop generation; disabling configuration needs no catalog', async () => {
  delete process.env.OPENROUTER_API_KEY
  assert.equal((await chat.POST(req('admin', 'data-chat', ask()))).status, 503); process.env.OPENROUTER_API_KEY = 'local-provider-fixture'
  await prisma.companyAiConfig.update({ where: { companyId: ids[0] }, data: { dailyRequestLimit: 1 } })
  assert.equal((await chat.POST(req('admin', 'data-chat', ask()))).status, 429)
  await prisma.companyAiConfig.update({ where: { companyId: ids[0] }, data: { dailyRequestLimit: 100 } })
  remote = async () => { await prisma.company.update({ where: { id: ids[0] }, data: { status: 'SUSPENDED' } }); return Response.json({ choices: [{ message: { tool_calls: [{ id: 'suspended', type: 'function', function: { name: 'query_company_data', arguments: '{"dataset":"assets","operation":"summary"}' } }] } }] }) }
  assert.equal((await chat.POST(req('admin', 'data-chat', ask()))).status, 401)
  await prisma.company.update({ where: { id: ids[0] }, data: { status: 'ACTIVE' } }); mockDefault()
  const current = await prisma.companyAiConfig.findUniqueOrThrow({ where: { companyId: ids[0] } })
  const response = await config.PUT(req('owner', `platform/companies/${ids[0]}/ai`, { ...current, enabled: false, reason: 'Turn off assistant' }, 'PUT'), ctx(ids[0])); assert.equal(response.status, 200)
  assert.equal((await chat.POST(req('admin', 'data-chat', ask()))).status, 409)
})
