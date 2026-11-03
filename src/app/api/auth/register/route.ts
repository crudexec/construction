import { auditedRoute } from '@/lib/platform/route-audit'
import { NextResponse } from 'next/server'

// Company provisioning is no longer public. Keep this response for old clients
// and bookmarks; team members create accounts only through a valid invitation.
 async function POSTHandler() {
  return NextResponse.json(
    {
      error: 'Public registration is disabled. Ask your company administrator for an invitation.',
      code: 'PUBLIC_REGISTRATION_DISABLED',
    },
    { status: 403 }
  )
}


export const POST = auditedRoute('/api/auth/register', 'POST', POSTHandler)
