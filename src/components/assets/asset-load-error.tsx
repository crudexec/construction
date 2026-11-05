'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { AssetFetchError } from '@/lib/assets/client'

export function AssetLoadError({ error, retry }: { error: Error | null; retry: () => void }) {
  const client = useQueryClient()
  if (!error) return null
  const expired = error instanceof AssetFetchError && error.status === 401
  return <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
    <p>{error.name === 'TimeoutError' ? 'Loading took too long. Please try again.' : error.message}</p>
    <button type="button" className="mt-1 min-h-11 font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" onClick={() => {
      if (!expired) { retry(); return }
      const destination = window.location.pathname + window.location.search
      useAuthStore.getState().logout()
      client.clear()
      window.location.assign(`/login?redirect=${encodeURIComponent(destination)}`)
    }}>{expired ? 'Sign in again' : 'Try again'}</button>
  </div>
}
