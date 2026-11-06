'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X, Package, ChevronUp, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { fetchAssetJson } from '@/lib/assets/client'
import type { AssetListItem, AssetListResponse } from '@/lib/assets/list'
import { useCurrency } from '@/hooks/useCurrency'
import { assetTypeLabel, defaultAssetTypes } from '@/lib/assets/type-options'
import { useAssetTypes } from './asset-type-select'
import { AssetFilterSelect } from './asset-filter-select'
import { fetchAssetCategories } from './asset-category-field'
import { AssetLoadError } from './asset-load-error'
import { AssetIssueDialog } from './asset-issue-dialog'
import { AssetRequestDialog, assetButton, assetPrimary } from './asset-request-dialog'

const columns = [
  ['equipmentId', 'Equipment ID'], ['name', 'Asset'], ['makeModel', 'Make / Model'],
  ['type', 'Type'], ['category', 'Category'], ['status', 'Status'],
  ['location', 'Location'], ['assignee', 'Assignment'], ['cost', 'Cost'],
]
const cell = 'border-r border-gray-200 px-2 py-1'

export function AssetRequestPicker({ close, created, purpose = 'request' }: { close: () => void; created?: () => void; purpose?: 'request' | 'issue' }) {
  const isIssue = purpose === 'issue'
  const assetLabel = isIssue ? 'assets' : 'available assets'
  const userId = useAuthStore(state => state.user?.id), types = useAssetTypes(), currency = useCurrency()
  const [input, setInput] = useState(''), [search, setSearch] = useState(''), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(25)
  const [filterType, setFilterType] = useState<string[] | null>(null), [filterCategory, setFilterCategory] = useState<string[] | null>(null)
  const [sortField, setSortField] = useState('equipmentId'), [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selected, setSelected] = useState<AssetListItem | null>(null)
  useEffect(() => { const timer = setTimeout(() => { setSearch(input.trim()); setPage(1) }, 300); return () => clearTimeout(timer) }, [input])
  const categories = useQuery({ queryKey: ['asset-categories', userId, 'all'], queryFn: () => fetchAssetCategories(), enabled: !!userId, retry: false })
  const query = useQuery({
    queryKey: ['assets', 'request-picker', purpose, userId, search, page, pageSize, filterType, filterCategory, sortField, sortDirection], enabled: !!userId, retry: false,
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search, sortField, sortDirection })
      if (isIssue) params.set('statuses', JSON.stringify(['AVAILABLE', 'IN_USE', 'UNDER_MAINTENANCE', 'RETIRED', 'LOST_DAMAGED']))
      else params.set('status', 'AVAILABLE')
      if (filterType !== null) params.set('types', JSON.stringify(filterType))
      if (filterCategory !== null) params.set('categories', JSON.stringify(filterCategory))
      return fetchAssetJson<AssetListResponse>(`/api/assets?${params}`, signal)
    },
  })
  const result = query.data, updating = query.isFetching || input.trim() !== search
  const pageStart = ((result?.pagination.page || 1) - 1) * pageSize
  function sort(field: string) { setSortField(field); setSortDirection(sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'); setPage(1) }
  return <section aria-labelledby="new-request-heading" className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div><h2 id="new-request-heading" className="text-sm font-semibold text-gray-900">{isIssue ? 'Add issue' : 'New asset request'}</h2><p className="mt-1 text-xs text-gray-600">{isIssue ? 'Choose the affected asset, then describe the issue.' : 'Choose an available asset, then enter your request details.'}</p></div>
      <button type="button" aria-label="Close asset picker" onClick={close} className={`${assetButton} border-0 px-2`}><X aria-hidden="true" className="h-4 w-4" /></button>
    </div>
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-48"><Search aria-hidden="true" className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" /><input autoFocus aria-label={`Search ${assetLabel}`} placeholder="Search ID, name..." value={input} maxLength={200} onChange={event => setInput(event.target.value)} className="min-h-11 w-full rounded border border-gray-300 py-1 pl-7 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 sm:min-h-8" /></div>
      <AssetFilterSelect label="Type" ariaLabel={`Filter ${assetLabel} by type`} options={(types.data || defaultAssetTypes).map(type => ({ value: type.key, label: type.name }))} selected={filterType} onChange={values => { setFilterType(values); setPage(1) }} />
      <AssetFilterSelect label="Category" ariaLabel={`Filter ${assetLabel} by category`} options={[...(categories.data || []).map(value => ({ value, label: value })), { value: '', label: 'Uncategorized' }]} selected={filterCategory} onChange={values => { setFilterCategory(values); setPage(1) }} />
      {(input || filterType !== null || filterCategory !== null) && <button type="button" className={`${assetButton} border-0`} onClick={() => { setInput(''); setSearch(''); setFilterType(null); setFilterCategory(null); setPage(1) }}><X aria-hidden="true" className="h-3 w-3" />Reset filters</button>}
    </div>
    <p className="mb-2 text-xs text-gray-600">{isIssue ? 'All asset statuses are included, including assets in use or under maintenance.' : 'Available assets only. Assets in use, retired or under maintenance cannot be requested.'}</p>
    <AssetLoadError error={query.error || categories.error || types.error} retry={() => { void query.refetch(); void categories.refetch(); void types.refetch() }} />
    <div className="overflow-hidden rounded border border-gray-300"><div className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500" role="region" aria-label={isIssue ? "Assets table" : "Available assets table"} tabIndex={0}>
      <table aria-busy={updating} className="w-full min-w-[1100px] border-collapse text-xs">
        <thead><tr className="border-b border-gray-300 bg-gray-100"><th className={`${cell} text-center font-medium text-gray-600`}>#</th>{columns.map(([field, label]) => <th key={field} scope="col" aria-sort={sortField === field ? sortDirection === 'asc' ? 'ascending' : 'descending' : 'none'} className={`${cell} text-left font-semibold text-gray-700`}><button type="button" className="flex min-h-8 items-center gap-1 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary-500" onClick={() => sort(field)}>{label}{sortField === field && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</button></th>)}<th scope="col" className="sticky right-0 border-l border-gray-200 px-2 py-1 text-left font-semibold text-gray-700">Action</th></tr></thead>
        <tbody>{query.isPending || query.isError || !result?.data.length ? <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-600">{query.isPending ? `Loading ${assetLabel}…` : query.isError ? 'Assets could not be loaded.' : `No ${assetLabel} match these filters.`}</td></tr> : result.data.map((asset, index) => <tr key={asset.id} className={`border-b border-gray-200 hover:bg-blue-50 ${index % 2 ? 'bg-gray-50' : 'bg-white'}`}>
          <td className={`${cell} text-center text-gray-500`}>{pageStart + index + 1}</td>
          <td className={`${cell} font-semibold text-gray-900`}>{asset.equipmentId || '—'}</td>
          <td className={cell}><div className="flex items-center gap-1.5"><Package aria-hidden="true" className="h-3 w-3 shrink-0 text-gray-500" /><div><span className="block max-w-48 truncate font-medium text-gray-900" title={asset.name}>{asset.name}</span>{asset.serialNumber && <span className="text-[10px] text-gray-600">SN: {asset.serialNumber}</span>}</div></div></td>
          <td className={`${cell} text-gray-700`}>{[asset.make, asset.model, asset.year].filter(Boolean).join(' ') || '—'}</td>
          <td className={`${cell} text-gray-600`}>{assetTypeLabel(asset.type, types.data)}</td><td className={`${cell} text-gray-600`}>{asset.category || '—'}</td>
          <td className={cell}><span className="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700">{asset.statusDefinition?.name || asset.status.replaceAll('_', ' ').toLowerCase().replace(/^./, char => char.toUpperCase())}</span></td>
          <td className={`${cell} text-gray-600`}>{asset.currentProject?.title || asset.currentYard?.name || asset.currentLocation || '—'}</td>
          <td className={`${cell} text-gray-600`}>{asset.currentAssignee ? `${asset.currentAssignee.firstName} ${asset.currentAssignee.lastName}` : '—'}</td>
          <td className={`${cell} text-right text-gray-700`}>{asset.purchaseCost ? currency.format(asset.purchaseCost) : '—'}</td>
          <td className="sticky right-0 border-l border-gray-200 bg-white px-2 py-1"><button type="button" aria-label={`${isIssue ? 'Select' : 'Request'} ${asset.equipmentId || asset.name}`} disabled={updating} className={assetPrimary} onClick={() => setSelected(asset)}>{isIssue ? 'Select' : 'Request'}</button></td>
        </tr>)}</tbody>
      </table>
    </div></div>
    {result && !query.error && <nav aria-label={isIssue ? "Asset pages" : "Available asset pages"} className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
      <span role="status">{updating ? 'Loading assets…' : `Showing ${result.pagination.total ? pageStart + 1 : 0}–${pageStart + result.data.length} of ${result.pagination.total} ${assetLabel}`}</span>
      <div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2">Rows per page<select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1) }} className={`${assetButton} bg-white`}>{[25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select></label><button type="button" disabled={updating || result.pagination.page === 1} onClick={() => setPage(result.pagination.page - 1)} className={assetButton}>Previous</button><span>Page {result.pagination.page} of {result.pagination.totalPages}</span><button type="button" disabled={updating || result.pagination.page >= result.pagination.totalPages} onClick={() => setPage(result.pagination.page + 1)} className={assetButton}>Next</button></div>
    </nav>}
    {selected && (isIssue ? <AssetIssueDialog assetId={selected.id} assetName={[selected.equipmentId, selected.name].filter(Boolean).join(" · ")} close={() => setSelected(null)} created={created} /> : <AssetRequestDialog asset={selected} close={() => setSelected(null)} created={created} />)}
  </section>
}
