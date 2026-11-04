import { NextRequest, NextResponse } from 'next/server'
import { failure, input, privateHeaders, requirePlatform } from '@/lib/platform/server'
import { validateModel } from '@/lib/data-chat/openrouter'
import { prompt, runQuestion, settings } from '@/lib/data-chat/server'
export const maxDuration = 90
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePlatform(request), { id } = await context.params, body = await input(request), current = await settings(id)
    const model = await validateModel(body.model), systemPrompt = prompt(body.systemPrompt)
    return NextResponse.json(await runQuestion(request, user, id, { ...current, model, systemPrompt }, body, true), { headers: privateHeaders })
  } catch (error) { return failure(error) }
}
