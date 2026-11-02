import { NextResponse } from 'next/server'

// Company provisioning is no longer public. Keep this response for old clients
// and bookmarks; team members create accounts only through a valid invitation.
export async function POST() {
  return NextResponse.json(
    {
      error: 'Public registration is disabled. Ask your company administrator for an invitation.',
      code: 'PUBLIC_REGISTRATION_DISABLED',
    },
    { status: 403 }
  )
}
