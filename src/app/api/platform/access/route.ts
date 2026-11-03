import { NextRequest, NextResponse } from 'next/server'
import { failure, hasPlatformSession, platformIdentity, privateHeaders } from '@/lib/platform/server'

export async function GET(request: NextRequest) {
  try {
    const { user, admin } = await platformIdentity(request)
    return NextResponse.json({ isPlatformAdmin: true, mfaEnabled: !!admin.mfaEnabledAt, verified: !!admin.mfaEnabledAt && await hasPlatformSession(request, user) }, { headers: privateHeaders })
  } catch (error) { return failure(error) }
}
