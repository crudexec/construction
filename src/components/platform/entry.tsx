'use client'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { usePlatformQuery } from './shared'

export function PlatformEntry() {
  const access = usePlatformQuery<{ isPlatformAdmin: boolean }>(['access-link'], '/api/platform/access')
  if (!access.data?.isPlatformAdmin) return null
  return <Link href="/dashboard/platform" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-primary-700 hover:bg-gray-50"><ShieldCheck className="h-4 w-4" />Platform administration</Link>
}
