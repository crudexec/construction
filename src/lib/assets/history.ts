// Shared by the read-only history endpoint and its table/CSV presentation.
export const HISTORY_TYPES = {
  PURCHASE: 'Purchase',
  METER_READING: 'Meter reading',
  ASSIGNMENT: 'Assignment',
  LOCATION: 'Location',
  ISSUE: 'Issue',
  WORK_ORDER: 'Work order',
} as const

export type AssetHistoryType = keyof typeof HISTORY_TYPES

export interface AssetHistoryEvent {
  id: string
  type: AssetHistoryType
  occurredAt: string
  dateOnly?: boolean
  action: string
  details: string
  actor: string | null
  person?: string | null
  location?: string | null
  reference: { id: string; label: string; href: string }
}

export interface AssetHistory {
  asset: { id: string; name: string; equipmentId: string | null }
  events: AssetHistoryEvent[]
  notices: string[]
}

export function selectHistoryEvents(events: AssetHistoryEvent[], type: AssetHistoryType | 'ALL', order: 'asc' | 'desc') {
  const direction = order === 'asc' ? 1 : -1
  return events.filter(event => type === 'ALL' || event.type === type).sort((a, b) => {
    const byDate = Date.parse(a.occurredAt) - Date.parse(b.occurredAt)
    // Stable ordering for events with identical timestamps, including transfers.
    const byId = a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    return (byDate || byId) * direction
  })
}

function csvCell(value: string) {
  // Quoting alone does not stop spreadsheet formulas; protect user-entered cells.
  const safe = /^[\s\u0000-\u001f]*[=+\-@]|^[\t\r\n]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export function assetHistoryCsv(asset: AssetHistory['asset'], events: AssetHistoryEvent[]) {
  const rows = [
    ['Asset record ID', 'Equipment ID', 'Asset name', 'Event ID', 'Date (UTC; purchase is date-only)', 'Event type', 'Action', 'Details', 'Assignment (person)', 'Location', 'Actor', 'Related record ID', 'Related record link'],
    ...events.map(event => [
      asset.id, asset.equipmentId || '', asset.name, event.id,
      event.dateOnly ? event.occurredAt.slice(0, 10) : event.occurredAt,
      HISTORY_TYPES[event.type], event.action, event.details, event.person || '', event.location || '',
      event.actor || 'Not recorded', event.reference.id, event.reference.href,
    ]),
  ]
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
