import { NextRequest, NextResponse } from 'next/server'
import { validateUser } from '@/lib/auth'
import { ChangeOrderError } from './workflow'

export async function changeOrderRequest(request: NextRequest, run: (user: NonNullable<Awaited<ReturnType<typeof validateUser>>>) => Promise<unknown>, status = 200) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value
    const user = token ? await validateUser(token) : null
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json(await run(user), { status })
  } catch (error) {
    if (error instanceof ChangeOrderError) return NextResponse.json({ error: error.message }, { status: error.status })
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    console.error('Change order request failed:', error)
    return NextResponse.json({ error: 'Unable to save or load the change order' }, { status: 500 })
  }
}
