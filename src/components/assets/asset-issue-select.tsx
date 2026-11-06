'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { fetchAssetJson } from '@/lib/assets/client'
import type { AssetListItem, AssetListResponse } from '@/lib/assets/list'
import { assetButton, assetControl } from './asset-request-dialog'
import { AssetLoadError } from './asset-load-error'

type AssetOption = Pick<AssetListItem, 'id' | 'name' | 'equipmentId'>
const label = (asset: AssetOption) => [asset.equipmentId, asset.name].filter(Boolean).join(' · ')

export function AssetIssueSelect({ value, onChange, disabled }: { value: AssetOption | null; onChange: (asset: AssetOption | null) => void; disabled: boolean }) {
  const userId = useAuthStore(state => state.user?.id)
  const id = useId(), input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false), [text, setText] = useState(''), [search, setSearch] = useState('')
  const [active, setActive] = useState(-1)
  useEffect(() => { const timer = setTimeout(() => { setSearch(text.trim()); setActive(-1) }, 250); return () => clearTimeout(timer) }, [text])
  const query = useInfiniteQuery({
    queryKey: ['assets', 'issue-select', userId, search], enabled: open && !!userId, initialPageParam: 1, retry: false,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ page: String(pageParam), pageSize: '25', search, sortField: 'equipmentId', sortDirection: 'asc', statuses: JSON.stringify(['AVAILABLE', 'IN_USE', 'UNDER_MAINTENANCE', 'RETIRED', 'LOST_DAMAGED']) })
      return fetchAssetJson<AssetListResponse>(`/api/assets?${params}`, signal)
    },
    getNextPageParam: last => last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
  })
  const assets = query.data?.pages.flatMap(page => page.data) || []
  const waiting = text.trim() !== search || query.isPending
  useEffect(() => { if (open && active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' }) }, [active, open, id])
  function choose(asset: AssetOption) { onChange(asset); setText(''); input.current?.focus(); setOpen(false); setActive(-1) }
  return <div className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setActive(-1) } }}>
    <label htmlFor={id} className="mb-1 block text-xs font-medium text-gray-700">Asset *</label>
    <div className="relative">
      <input ref={input} id={id} autoFocus role="combobox" aria-expanded={open} aria-controls={`${id}-options`} aria-autocomplete="list" aria-required="true" aria-activedescendant={open && active >= 0 && !waiting ? `${id}-option-${active}` : undefined}
        autoComplete="off" maxLength={200} disabled={disabled} placeholder="Select an asset or search ID, name…" value={value ? label(value) : text}
        className={`${assetControl} w-full pr-9`} onClick={() => setOpen(true)} onFocus={() => setOpen(true)}
        onChange={event => { onChange(null); setText(event.target.value); setActive(-1); setOpen(true) }}
        onKeyDown={event => {
          if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); setActive(-1) }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); if (!waiting && assets.length) setActive(index => event.key === 'ArrowDown' ? Math.min(index + 1, assets.length - 1) : Math.max(index - 1, 0)) }
          if (event.key === 'Enter' && open) { event.preventDefault(); if (!waiting && assets[active]) choose(assets[active]) }
        }} />
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
    </div>
    {open && <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded border border-gray-300 bg-white shadow-lg">
      <div id={`${id}-options`} role="listbox" aria-label="Assets" aria-busy={waiting || query.isFetchingNextPage} className="max-h-48 overflow-y-auto">
        {!waiting && !query.isError && assets.map((asset, index) => <div key={asset.id} id={`${id}-option-${index}`} role="option" aria-selected={value?.id === asset.id} onMouseDown={event => event.preventDefault()} onClick={() => choose(asset)} onMouseMove={() => setActive(index)} className={`cursor-pointer px-3 py-2 text-xs ${active === index || value?.id === asset.id ? 'bg-primary-50 text-primary-900' : 'text-gray-900 hover:bg-gray-50'}`}>
          <span className="block break-words font-medium">{label(asset)}</span><span className="mt-0.5 block text-gray-600">{asset.statusDefinition?.name || asset.status.replaceAll('_', ' ').toLowerCase()}</span>
        </div>)}
      </div>
      {waiting ? <p role="status" className="p-3 text-xs text-gray-600">Loading assets…</p> : query.isError ? <AssetLoadError error={query.error} retry={() => { void query.refetch() }} /> : !assets.length ? <p role="status" className="p-3 text-xs text-gray-600">No assets match your search.</p> : <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-3 py-2 text-xs text-gray-600"><span>{assets.length} of {query.data?.pages[0].pagination.total} assets</span>{query.hasNextPage && <button type="button" disabled={query.isFetchingNextPage} className={assetButton} onClick={() => { void query.fetchNextPage() }}>{query.isFetchingNextPage ? 'Loading…' : 'Load more'}</button>}</div>}
    </div>}
  </div>
}
