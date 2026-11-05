'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { fetchAssetJson } from '@/lib/assets/client'
import type { AssetListResponse } from '@/lib/assets/list'
import { AssetLoadError } from './asset-load-error'

export function AssetRequestPicker({ close }: { close: () => void }) {
  const userId = useAuthStore(state => state.user?.id)
  const [input, setInput] = useState(''), [search, setSearch] = useState(''), [page, setPage] = useState(1)
  useEffect(() => { const timer = setTimeout(() => { setSearch(input.trim()); setPage(1) }, 300); return () => clearTimeout(timer) }, [input])
  const query = useQuery({
    queryKey: ['assets', 'request-picker', userId, search, page], enabled: !!userId, retry: false,
    queryFn: ({ signal }) => fetchAssetJson<AssetListResponse>(`/api/assets?${new URLSearchParams({ page: String(page), pageSize: '25', status: 'AVAILABLE', search, sortField: 'equipmentId', sortDirection: 'asc' })}`, signal),
  })
  const result = query.data
  return <section aria-labelledby="new-request-heading" className="rounded-lg border bg-white p-4 sm:p-6">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div><h2 id="new-request-heading" className="font-semibold text-gray-900">New asset request</h2><p className="mt-1 text-sm text-gray-600">Choose an available asset, then enter your request details.</p></div>
      <button type="button" aria-label="Close asset picker" onClick={close} className="flex h-11 w-11 shrink-0 items-center justify-center rounded hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary-500"><X aria-hidden="true" className="h-4 w-4" /></button>
    </div>
    <div className="relative mb-3 max-w-md"><Search aria-hidden="true" className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" /><input autoFocus aria-label="Search available assets" placeholder="Search equipment ID or asset name" value={input} maxLength={200} onChange={event => setInput(event.target.value)} className="min-h-11 w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
    <AssetLoadError error={query.error} retry={() => { void query.refetch() }} />
    {query.isPending && <p role="status" className="py-4 text-sm text-gray-600">Loading available assets…</p>}
    {!query.isPending && !query.error && result?.data.length === 0 && <p className="py-4 text-sm text-gray-600">{search ? 'No available assets match your search.' : 'No assets are currently available to request.'}</p>}
    {!query.error && result && <>
      <ul className="divide-y divide-gray-200 rounded border border-gray-200">
        {result.data.map(asset => <li key={asset.id}><Link href={`/dashboard/assets/${asset.id}?tab=requests&request=new`} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500">
          <span className="min-w-0 break-words"><span className="mr-2 font-semibold text-gray-900">{asset.equipmentId || '—'}</span><span className="text-gray-700">{asset.name}</span></span><span className="shrink-0 text-primary-700">Request</span>
        </Link></li>)}
      </ul>
      <nav aria-label="Available asset pages" className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
        <span>{result.pagination.total} available {result.pagination.total === 1 ? 'asset' : 'assets'} · Page {result.pagination.page} of {result.pagination.totalPages}</span>
        <div className="flex gap-2">{['Previous', 'Next'].map((label, index) => <button key={label} type="button" disabled={query.isFetching || (index === 0 ? result.pagination.page === 1 : result.pagination.page >= result.pagination.totalPages)} onClick={() => setPage(result.pagination.page + (index === 0 ? -1 : 1))} className="min-h-11 rounded border border-gray-300 px-3 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50">{label}</button>)}</div>
      </nav>
    </>}
  </section>
}
