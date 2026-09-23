'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Gauge, Plus } from 'lucide-react'
import { fetchReadings } from './asset-meter-readings-tab'

interface AssetOverviewTilesProps {
  assetId: string
  openIssueCount: number
  onViewIssues: () => void
  onViewReadings: () => void
  onAddReading: () => void
}

export function AssetOverviewTiles({ assetId, openIssueCount, onViewIssues, onViewReadings, onAddReading }: AssetOverviewTilesProps) {
  const { data: readings = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['asset-meter-readings', assetId],
    queryFn: () => fetchReadings(assetId),
  })
  // The API returns readings newest first; keep the latest of each meter type.
  const latestReadings = ['HOURS', 'MILES'].flatMap(type => {
    const reading = readings.find(item => item.readingType === type)
    return reading ? [reading] : []
  })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:col-span-2">
      <button
        type="button"
        onClick={onViewIssues}
        className="bg-white rounded-lg shadow border p-5 text-left hover:border-primary-400 focus-visible:outline-primary-600"
        aria-label={`View issues: ${openIssueCount} open`}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-700"><AlertCircle className="h-4 w-4 text-orange-600" />Open Issues</span>
        <span className="block mt-2 text-2xl font-semibold text-gray-900">{openIssueCount}</span>
        <span className="block mt-1 text-xs text-gray-500">{openIssueCount ? 'Open or in progress · View issues' : 'No open issues · View issue history'}</span>
      </button>
      <section aria-label="Latest meter readings" className="bg-white rounded-lg shadow border p-5">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={onViewReadings} aria-label="View meter reads" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary-600">
            <Gauge className="h-4 w-4" />Meter Reads
          </button>
          <button type="button" onClick={onAddReading} aria-label="Add meter reading" className="rounded border p-1.5 text-primary-600 hover:bg-primary-50">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {isLoading ? <p className="mt-3 text-sm text-gray-500">Loading readings…</p> : isError ? (
          <p className="mt-3 text-sm text-red-600">Could not load readings. <button type="button" onClick={() => refetch()} className="underline">Retry</button></p>
        ) : latestReadings.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No readings yet. Add the first reading with +.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            {latestReadings.map(reading => (
              <div key={reading.id}>
                <p className="text-xl font-semibold text-gray-900">{reading.value.toLocaleString()} <span className="text-sm font-normal text-gray-500">{reading.readingType === 'HOURS' ? 'hours' : 'miles'}</span></p>
                <p className="text-xs text-gray-500">{new Date(reading.recordedAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
