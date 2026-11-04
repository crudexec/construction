import { NextRequest, NextResponse } from 'next/server'
import { failure, privateHeaders, requirePlatform } from '@/lib/platform/server'
import { keyConfigured, models } from '@/lib/data-chat/openrouter'
export async function GET(request: NextRequest) {
  try { await requirePlatform(request); return NextResponse.json({ items: await models(), keyConfigured: keyConfigured() }, { headers: privateHeaders }) }
  catch (error) { return failure(error) }
}
