import Link from 'next/link'
import { Building2 } from 'lucide-react'

export default function RegisterPage() {
  return (
    <div className="text-center">
      <Building2 className="mx-auto h-12 w-12 text-primary-600" aria-hidden="true" />
      <h1 className="mt-6 text-3xl font-extrabold text-gray-900">Join your team by invitation</h1>
      <p className="mt-4 text-sm leading-6 text-gray-600">
        Open the invitation link sent by your company administrator to create your account.
        If you need an invitation, ask your administrator to send one.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
      >
        Sign in to an existing account
      </Link>
    </div>
  )
}
