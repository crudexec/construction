'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { assetHistoryCsv, HISTORY_TYPES, selectHistoryEvents, type AssetHistory, type AssetHistoryType } from '@/lib/assets/history'

const PAGE_SIZE = 50

export function AssetHistoryTab({ assetId }: { assetId: string }) {
  const [type, setType] = useState<AssetHistoryType | 'ALL'>('ALL')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  const { data, isPending, isFetching, isError, refetch } = useQuery<AssetHistory>({
    queryKey: ['asset-history', assetId],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/assets/${assetId}/history`, { signal, cache: 'no-store' })
      if (!response.ok) throw new Error('Unable to load asset history')
      return response.json()
    },
    // Mutations happen in other tabs and screens. Re-entering History always
    // checks the source records, independently of their other query caches.
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1,
  })
  const events = useMemo(() => selectHistoryEvents(data?.events || [], type, order), [data, type, order])
  const lastPage = Math.max(0, Math.ceil(events.length / PAGE_SIZE) - 1)
  const currentPage = Math.min(page, lastPage)
  const visibleEvents = events.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  function downloadCsv() {
    if (!data || isFetching || isError) return
    try {
      const blob = new Blob([assetHistoryCsv(data.asset, events)], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      const identifier = (data.asset.equipmentId || data.asset.id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)
      anchor.href = url
      anchor.download = `asset-${identifier}-history.csv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      toast.error('Unable to export history. Please try again.')
    }
  }

  return (
    <section aria-label="Asset history" className="bg-white rounded-lg shadow border p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900">History</h3>
          <p className="text-sm text-gray-500">Purchase, meter readings, assignments, locations, issues, and work orders.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void refetch()} disabled={isFetching} className="border rounded-md px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />Refresh
          </button>
          <button type="button" onClick={downloadCsv} disabled={!events.length || isFetching || isError} className="bg-primary-600 text-white rounded-md px-3 py-2 text-sm flex items-center gap-2 hover:bg-primary-700 disabled:opacity-50">
            <Download aria-hidden="true" className="h-4 w-4" />Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="history-type" className="block text-sm font-medium text-gray-700 mb-1">Event type</label>
          <select id="history-type" value={type} onChange={event => { setType(event.target.value as AssetHistoryType | 'ALL'); setPage(0) }} className="border rounded-md px-3 py-2 text-sm">
            <option value="ALL">All event types</option>
            {Object.entries(HISTORY_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="history-order" className="block text-sm font-medium text-gray-700 mb-1">Date order</label>
          <select id="history-order" value={order} onChange={event => { setOrder(event.target.value as 'asc' | 'desc'); setPage(0) }} className="border rounded-md px-3 py-2 text-sm">
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
        <p className="text-xs text-gray-500 pb-2">CSV includes all matching events in the selected order, not just this page.</p>
      </div>

      {data && <details className="text-xs text-gray-500 rounded-md bg-gray-50 p-3">
        <summary className="cursor-pointer font-medium">History coverage — retained records, not a complete audit log</summary>
        <div className="mt-2 space-y-1">{data.notices.map(notice => <p key={notice}>{notice}</p>)}</div>
      </details>}

      {isError && <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
        History could not be refreshed. {data ? 'Previously loaded events are shown; export is disabled until refresh succeeds.' : 'Please try again.'}
        <button type="button" onClick={() => void refetch()} disabled={isFetching} className="ml-2 underline">Retry</button>
      </div>}
      {isPending && !isError && <p role="status" className="py-8 text-center text-sm text-gray-500">Loading history…</p>}
      {data && <>
        <p role="status" className="text-xs text-gray-500">
          {events.length ? `Showing ${currentPage * PAGE_SIZE + 1}–${Math.min((currentPage + 1) * PAGE_SIZE, events.length)} of ${events.length} matching events` : '0 matching events'}
          {' · Times shown in your local timezone; CSV timestamps use UTC.'}
        </p>
        {events.length === 0 ? <p className="py-8 text-center text-sm text-gray-500">
          {data.events.length ? 'No events match this event type.' : 'No history events have been recorded yet.'}
        </p> : <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm" aria-label="Asset history events">
            <thead className="bg-gray-50"><tr>
              <th scope="col" className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
              <th scope="col" className="px-3 py-2 text-left font-medium text-gray-500">Type</th>
              <th scope="col" className="px-3 py-2 text-left font-medium text-gray-500">Event / details</th>
              <th scope="col" className="px-3 py-2 text-left font-medium text-gray-500">Actor</th>
              <th scope="col" className="px-3 py-2 text-left font-medium text-gray-500">Related record</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {visibleEvents.map(event => <tr key={event.id}>
                <td className="px-3 py-3 whitespace-nowrap align-top text-gray-600">
                  <time dateTime={event.occurredAt}>{event.dateOnly ? event.occurredAt.slice(0, 10) : new Date(event.occurredAt).toLocaleString()}</time>
                </td>
                <td className="px-3 py-3 whitespace-nowrap align-top text-gray-600">{HISTORY_TYPES[event.type]}</td>
                <td className="px-3 py-3 align-top min-w-[220px] max-w-lg break-words [overflow-wrap:anywhere]">
                  <p className="font-medium text-gray-900">{event.action}</p>
                  {event.details && <p className="text-gray-600 whitespace-pre-wrap mt-1">{event.details}</p>}
                  {event.person && <p className="text-xs text-gray-500 mt-1">Assignment: {event.person}</p>}
                  {event.location && <p className="text-xs text-gray-500 mt-1">Location: {event.location}</p>}
                </td>
                <td className="px-3 py-3 align-top text-gray-600">{event.actor || 'Not recorded'}</td>
                <td className="px-3 py-3 align-top max-w-[200px] break-words [overflow-wrap:anywhere]">
                  {/* Native navigation also honors the detail page's initial tab query. */}
                  <a href={event.reference.href} className="text-primary-600 hover:underline">{event.reference.label}</a>
                  <p className="text-xs text-gray-400 mt-1">{event.reference.id}</p>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>}
        {lastPage > 0 && <div className="flex items-center justify-end gap-3 text-sm">
          <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0} className="border rounded-md px-3 py-1 disabled:opacity-50">Previous page</button>
          <span>Page {currentPage + 1} of {lastPage + 1}</span>
          <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage === lastPage} className="border rounded-md px-3 py-1 disabled:opacity-50">Next page</button>
        </div>}
      </>}
    </section>
  )
}
