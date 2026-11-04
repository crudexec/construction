// Explicit local browser-test transport. Never loaded by application code.
if (process.env.BUILDFLO_AI_TEST_MODE !== '1' || !['127.0.0.1', 'localhost'].includes(new URL(process.env.DATABASE_URL || 'https://invalid').hostname) || process.env.OPENROUTER_API_KEY !== 'local-provider-fixture') throw new Error('OpenRouter fixture requires an explicit disposable local test environment')
const original = globalThis.fetch
const model = 'qwen/buildflo-test-fixture'
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url || String(input)
  if (url === 'https://openrouter.ai/api/v1/models') return Response.json({ data: [{ id: model, name: 'Qwen (local test fixture)', context_length: 65536, supported_parameters: ['tools', 'tool_choice'], pricing: { prompt: '0', completion: '0' } }] })
  if (url === 'https://openrouter.ai/api/v1/chat/completions') {
    const body = JSON.parse(init.body), last = body.messages.at(-1)
    return Response.json(last.role === 'tool' ? { choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: `The company has ${JSON.parse(last.content).total} assets. This count includes all statuses, including retired assets.` } }], usage: { total_tokens: 42 } } : { choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: crypto.randomUUID(), type: 'function', function: { name: 'query_company_data', arguments: '{"dataset":"assets","operation":"summary"}' } }] } }], usage: { total_tokens: 15 } })
  }
  return original(input, init)
}
