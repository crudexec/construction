'use client'

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/** Read-only source snapshots: never confused with current editable balances. */
export function ImportSourceDetails({ value, label = 'Fleetio source details' }: { value: unknown; label?: string }) {
  if (!object(value) || value.system !== 'Fleetio') return null
  const groups: { title: string; rows: Record<string, unknown>[] }[] = []
  if (object(value.source)) groups.push({ title: 'Original record', rows: [value.source] })
  for (const [key, title] of [['lineItems', 'Work-order line items'], ['subLineItems', 'Work-order sub-line items'], ['locations', 'Opening stock by location (import snapshot)']]) {
    const rows = value[key]
    if (Array.isArray(rows)) groups.push({ title, rows: rows.filter(object) })
  }
  return <details className="mt-2 text-sm text-gray-700">
    <summary className="cursor-pointer text-primary-700">{label}</summary>
    <div className="mt-2 max-h-96 overflow-auto space-y-4 rounded border p-3 bg-white">
      {groups.map(group => <section key={group.title} aria-label={group.title}>
        <h4 className="font-medium">{group.title} ({group.rows.length})</h4>
        {group.rows.map((row, index) => <dl key={index} className="my-2 border-t pt-2 space-y-1">
          {Object.entries(row).filter(([, v]) => v !== '' && v !== null && ['string', 'number', 'boolean'].includes(typeof v)).map(([key, v]) => <div key={key} className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 break-words">
            <dt className="text-gray-500">{key}</dt><dd className="whitespace-pre-wrap">{String(v)}</dd>
          </div>)}
        </dl>)}
      </section>)}
    </div>
  </details>
}
