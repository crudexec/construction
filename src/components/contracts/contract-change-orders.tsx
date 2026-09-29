'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { GenerateDocumentButton } from '@/components/documents/generate-document-button'

type Status = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
type Line = { description: string; quantity: number; unit: string; unitPrice: number; notes?: string | null; costCodeId?: string | null; specSection?: string | null }
type Content = { title: string; description?: string | null; reason?: string | null; lineItems: Line[]; totalAmount: number }
type Event = { id: string; action: string; actorName: string; createdAt: string; before: Record<string, unknown> | null; after: Record<string, unknown> }
type ChangeOrder = Content & {
  id: string; changeOrderNumber: number; status: Status; version: number; revisionNumber: number;
  proposedRevision: Content | null; revisionStatus: Status | null; createdAt: string;
  approvedAt: string | null; approvedBy?: { firstName: string; lastName: string } | null; rejectionReason: string | null;
  notes: { id: string; body: string; actorName: string; createdAt: string }[]; history: Event[]
}
type CostCode = { id: string; code: string; name: string }
const statuses: Record<Status, string> = { DRAFT: 'Draft', PENDING_APPROVAL: 'Pending approval', APPROVED: 'Approved', REJECTED: 'Rejected' }
const money = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
const blankLine = (): Line => ({ description: '', quantity: 1, unit: 'EA', unitPrice: 0, notes: '', costCodeId: '', specSection: '' })
const blank = (): Content => ({ title: '', description: '', reason: '', totalAmount: 0, lineItems: [blankLine()] })
const button = 'rounded border px-3 py-1.5 text-xs disabled:opacity-50 hover:bg-gray-50'
const input = 'w-full rounded border px-2 py-1.5 text-sm'

async function requestOrder(url: string, method = 'GET', body?: unknown) {
  const response = await fetch(url, { method, credentials: 'include', ...(body !== undefined && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Unable to load or save change order')
  return result
}

function Editor({ initial, costCodes, busy, onSave, onCancel }: { initial: Content; costCodes: CostCode[]; busy: boolean; onSave: (value: Content) => void; onCancel: () => void }) {
  const [value, setValue] = useState<Content>(() => ({ title: initial.title, description: initial.description, reason: initial.reason, lineItems: initial.lineItems, totalAmount: initial.totalAmount }))
  function updateLine(index: number, fields: Partial<Line>) {
    setValue({ ...value, lineItems: value.lineItems.map((line, i) => i === index ? { ...line, ...fields } : line) })
  }
  return <form aria-label="Change order editor" onSubmit={e => { e.preventDefault(); onSave(value) }} className="space-y-3">
    <fieldset disabled={busy} className="space-y-3">
      <label className="block text-xs">Title<input required maxLength={200} className={input} value={value.title} onChange={e => setValue({ ...value, title: e.target.value })} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs">Description<textarea className={input} value={value.description ?? ''} onChange={e => setValue({ ...value, description: e.target.value })} /></label>
        <label className="text-xs">Reason<textarea className={input} value={value.reason ?? ''} onChange={e => setValue({ ...value, reason: e.target.value })} /></label>
      </div>
      <div className="flex items-center justify-between"><h4 className="text-sm font-medium">Line items</h4><button className={button} type="button" onClick={() => setValue({ ...value, lineItems: [...value.lineItems, blankLine()] })}>Add line item</button></div>
      {value.lineItems.map((line, index) => <fieldset key={index} aria-label={`Line item ${index + 1}`} className="rounded border p-3 space-y-2">
        <div className="flex gap-2 items-end"><label className="flex-1 text-xs">Description<input required className={input} value={line.description} onChange={e => updateLine(index, { description: e.target.value })} /></label><button className={button} type="button" aria-label={`Remove line item ${index + 1}`} onClick={() => setValue({ ...value, lineItems: value.lineItems.filter((_, i) => i !== index) })}>Remove</button></div>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs">Quantity<input required type="number" min="0" max="1000000000" step="any" className={input} value={Number.isFinite(line.quantity) ? line.quantity : ''} onChange={e => updateLine(index, { quantity: e.target.valueAsNumber })} /></label>
          <label className="text-xs">Unit<input required maxLength={30} className={input} value={line.unit} onChange={e => updateLine(index, { unit: e.target.value })} /></label>
          <label className="text-xs">Unit price<input required type="number" step="any" className={input} value={Number.isFinite(line.unitPrice) ? line.unitPrice : ''} onChange={e => updateLine(index, { unitPrice: e.target.valueAsNumber })} /></label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs">Cost code<select className={input} value={line.costCodeId ?? ''} onChange={e => updateLine(index, { costCodeId: e.target.value })}><option value="">No cost code</option>{costCodes.map(code => <option key={code.id} value={code.id}>{code.code} — {code.name}</option>)}</select></label>
          <label className="text-xs">Spec section<input className={input} value={line.specSection ?? ''} onChange={e => updateLine(index, { specSection: e.target.value })} /></label>
        </div>
        <label className="block text-xs">Line notes<textarea className={input} value={line.notes ?? ''} onChange={e => updateLine(index, { notes: e.target.value })} /></label>
        <p className="text-right text-xs tabular-nums">{money(Math.round(line.quantity * line.unitPrice * 100) / 100 || 0)}</p>
      </fieldset>)}
      <p className="text-right text-sm font-semibold">Total: {money(value.lineItems.reduce((sum, line) => sum + (Math.round(line.quantity * line.unitPrice * 100) / 100 || 0), 0))}</p>
      <p className="text-xs text-gray-500">Use a negative unit price for a credit. Saving a revision does not change the approved contract value.</p>
      <div className="flex justify-end gap-2"><button type="button" className={button} onClick={onCancel}>Cancel editing</button><button type="submit" className={`${button} bg-primary-600 text-white hover:bg-primary-700`}>{busy ? 'Saving…' : 'Save changes'}</button></div>
    </fieldset>
  </form>
}

function ContentView({ value, costCodes }: { value: Content; costCodes: CostCode[] }) {
  return <div className="space-y-2 text-sm">
    <h4 className="font-semibold break-words">{value.title}</h4>
    {value.description && <p className="whitespace-pre-wrap break-words">{value.description}</p>}
    {value.reason && <p className="whitespace-pre-wrap break-words"><span className="text-gray-500">Reason: </span>{value.reason}</p>}
    <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b"><th className="text-left py-2">Description</th><th className="text-right p-2">Qty / unit</th><th className="text-right p-2">Unit price</th><th className="text-right p-2">Amount</th></tr></thead><tbody>
      {value.lineItems.map((line, i) => <tr key={i} className="border-b"><td className="py-2"><p className="break-words">{line.description}</p>{(line.costCodeId || line.specSection) && <p className="text-gray-500">{costCodes.find(code => code.id === line.costCodeId)?.code} {line.specSection}</p>}{line.notes && <p className="text-gray-500 whitespace-pre-wrap break-words">{line.notes}</p>}</td><td className="text-right p-2 whitespace-nowrap">{line.quantity} {line.unit}</td><td className="text-right p-2 tabular-nums">{money(line.unitPrice)}</td><td className="text-right p-2 tabular-nums">{money(Math.round(line.quantity * line.unitPrice * 100) / 100)}</td></tr>)}
    </tbody></table></div>
    <p className="text-right font-semibold tabular-nums">Total: {money(value.totalAmount)}</p>
  </div>
}

const fieldLabels: Record<string, string> = { title: 'Title', description: 'Description', reason: 'Reason', totalAmount: 'Amount', lineItems: 'Line items', status: 'Status', submittedAt: 'Submitted', approvedAt: 'Approved', approvedBy: 'Approved by', rejectedAt: 'Rejected', rejectedBy: 'Rejected by', rejectionReason: 'Rejection reason', revisionNumber: 'Revision number', revisionStatus: 'Revision status', proposedRevision: 'Proposed revision', note: 'Note', revisionRejectionReason: 'Revision rejection reason' }
function display(value: unknown, key = ''): string {
  if (value == null) return '—'
  if (typeof value === 'number') return key === 'totalAmount' ? money(value) : String(value)
  if (typeof value === 'string') return statuses[value as Status] || (key.endsWith('At') ? new Date(value).toLocaleString() : value)
  if (Array.isArray(value)) return value.map((line, i) => `${i + 1}. ${line.description}: ${line.quantity} ${line.unit} × ${money(line.unitPrice)}${line.notes ? `\nNotes: ${line.notes}` : ''}${line.costCodeId ? `\nCost code: ${line.costCode?.code ?? line.costCodeId}` : ''}${line.specSection ? `\nSpec: ${line.specSection}` : ''}`).join('\n\n') || 'No line items'
  const obj = value as Record<string, unknown>
  if ('firstName' in obj) return `${obj.firstName} ${obj.lastName}`
  return Object.entries(obj).filter(([field]) => fieldLabels[field]).map(([field, item]) => `${fieldLabels[field]}: ${display(item, field)}`).join('\n')
}
function History({ events }: { events: Event[] }) {
  return <section aria-label="Update history" className="space-y-2 border-t pt-3"><h4 className="font-semibold text-sm">Update history</h4>
    {!events.length && <p className="text-xs text-gray-500">History is recorded for changes made after this update. Earlier changes are not available.</p>}
    {events.map(event => <details key={event.id} className="border rounded p-2 text-xs"><summary className="cursor-pointer"><strong>{event.action}</strong> · {event.actorName} · {new Date(event.createdAt).toLocaleString()}</summary>
      <div className="overflow-x-auto mt-2"><table className="w-full table-fixed"><thead><tr><th className="text-left w-1/5">Field</th><th className="text-left">Before</th><th className="text-left">After</th></tr></thead><tbody>{Object.keys(event.after).filter(key => fieldLabels[key] && JSON.stringify(event.before?.[key]) !== JSON.stringify(event.after[key])).map(key => <tr key={key} className="border-t align-top"><th className="text-left py-2 pr-2">{fieldLabels[key]}</th><td className="whitespace-pre-wrap break-words p-2">{display(event.before?.[key], key)}</td><td className="whitespace-pre-wrap break-words p-2">{display(event.after[key], key)}</td></tr>)}</tbody></table></div>
    </details>)}
  </section>
}

export function ContractChangeOrders({ contractId, readonly = false }: { contractId: string; readonly?: boolean }) {
  const queryClient = useQueryClient()
  const endpoint = `/api/contracts/${contractId}/change-orders`
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<{ version: number; content: Content } | null>(null)
  const [note, setNote] = useState('')
  const [rejection, setRejection] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const { data, isLoading, error } = useQuery<{ changeOrders: ChangeOrder[]; approvedTotal: number; pendingTotal: number }>({ queryKey: ['contract-change-orders', contractId], queryFn: () => requestOrder(endpoint) })
  const { data: costCodes = [] } = useQuery<CostCode[]>({ queryKey: ['cost-codes'], queryFn: () => requestOrder('/api/cost-codes') })
  const selected = data?.changeOrders.find(co => co.id === selectedId)
  const mutation = useMutation({
    mutationFn: ({ id, body, remove }: { id?: string; body?: Record<string, unknown>; remove?: boolean }) => requestOrder(id ? `${endpoint}/${id}${remove ? `?version=${body?.version}` : ''}` : endpoint, remove ? 'DELETE' : id ? 'PATCH' : 'POST', remove ? undefined : body),
    onSuccess: async (result, variables) => {
      setMessage(''); setEditing(null); setRejection(null)
      if (variables.body?.action === 'note') setNote('')
      if (!variables.id) { setCreating(false); setSelectedId(result.id) }
      if (variables.remove) setSelectedId(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['contract-change-orders', contractId] }),
        queryClient.invalidateQueries({ queryKey: ['contract', contractId] }),
        queryClient.invalidateQueries({ queryKey: ['contract-summary', contractId] }),
        queryClient.invalidateQueries({ queryKey: ['vendor-contracts'] }),
        queryClient.invalidateQueries({ queryKey: ['contracts'] })
      ])
    },
    onError: error => setMessage(error.message)
  })
  const busy = mutation.isPending
  function act(body: Record<string, unknown>) { if (selected) mutation.mutate({ id: selected.id, body: { version: selected.version, ...body } }) }
  function close() { setSelectedId(null); setEditing(null); setNote(''); setRejection(null); setMessage('') }
  function decision(status: Status) { act({ action: selected?.proposedRevision ? 'revision-status' : 'status', status, rejectionReason: rejection }) }
  if (isLoading) return <p className="p-3 text-sm">Loading change orders…</p>
  if (error) return <div role="alert" className="p-3 text-sm text-red-700">{error.message}<button className={`${button} ml-2`} onClick={() => queryClient.invalidateQueries({ queryKey: ['contract-change-orders', contractId] })}>Retry</button></div>
  const reviewStatus = selected?.proposedRevision ? selected.revisionStatus : selected?.status
  return <div data-testid="contract-change-orders">
    <div className="p-3 border-b flex flex-wrap items-center justify-between gap-2 text-xs"><div>Approved: <strong>{money(data?.approvedTotal ?? 0)}</strong> · Pending new orders: <strong>{money(data?.pendingTotal ?? 0)}</strong></div>{!readonly && <button className={button} disabled={creating || busy} onClick={() => { setMessage(''); setCreating(true) }}><Plus className="inline h-3 w-3 mr-1" />Add CO</button>}</div>
    {message && !selected && <p role="alert" className="p-3 text-sm text-red-700">{message}</p>}
    {creating && !readonly && <div className="p-3 border-b bg-gray-50"><Editor initial={blank()} costCodes={costCodes} busy={busy} onSave={content => mutation.mutate({ body: { ...content } })} onCancel={() => setCreating(false)} /></div>}
    {!data?.changeOrders.length && <p className="p-4 text-xs text-gray-500">No change orders</p>}
    {!!data?.changeOrders.length && <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-gray-50"><tr><th className="text-left p-3">Change order</th><th className="text-left p-3">Status</th><th className="text-right p-3">Amount</th></tr></thead><tbody>{data.changeOrders.map(co => <tr key={co.id} className="border-t"><td className="p-3"><button className="text-primary-700 text-left hover:underline" onClick={() => { close(); setSelectedId(co.id) }}>CO #{co.changeOrderNumber} — {co.title}</button></td><td className="p-3">{statuses[co.status]}{co.proposedRevision && <p className="text-amber-700">Revision {co.revisionNumber}: {statuses[co.revisionStatus!]}</p>}</td><td className="p-3 text-right tabular-nums">{money(co.totalAmount)}{co.proposedRevision && <p className="text-amber-700">Proposed: {money(co.proposedRevision.totalAmount)}</p>}</td></tr>)}</tbody></table></div>}
    {selected && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3" onKeyDown={e => { if (e.key === 'Escape' && !busy && !editing) close() }}>
      <div role="dialog" aria-modal="true" aria-label={`Change order ${selected.changeOrderNumber}`} className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10"><h3 className="text-sm font-semibold">CO #{selected.changeOrderNumber} · {statuses[selected.status]}</h3><button className={button} aria-label="Close change order" disabled={busy} onClick={close}><X className="h-4 w-4" /></button></div>
        <div className="p-4 space-y-4">
          {message && <div role="alert" className="text-sm text-red-700">{message}<button className={`${button} ml-2`} disabled={busy} onClick={async () => { await queryClient.invalidateQueries({ queryKey: ['contract-change-orders', contractId] }); setEditing(null); setMessage('') }}>Reload change order</button></div>}
          {editing ? <Editor initial={editing.content} costCodes={costCodes} busy={busy} onSave={content => mutation.mutate({ id: selected.id, body: { ...content, action: 'edit', version: editing.version } })} onCancel={() => setEditing(null)} /> : <>
            <ContentView value={selected} costCodes={costCodes} />
            {selected.approvedAt && <p className="text-xs text-green-700">Approved by {selected.approvedBy?.firstName} {selected.approvedBy?.lastName} · {new Date(selected.approvedAt).toLocaleString()}</p>}
            {selected.rejectionReason && <p className="text-xs text-red-700">Rejection reason: {selected.rejectionReason}</p>}
            {selected.proposedRevision && <section aria-label="Proposed revision" className="rounded border border-amber-300 bg-amber-50 p-3 space-y-3"><h4 className="font-semibold text-sm">Revision {selected.revisionNumber} · {statuses[selected.revisionStatus!]}</h4><p className="text-xs">The approved {money(selected.totalAmount)} remains in contract and payment totals until this revision is approved. Approval replaces it with {money(selected.proposedRevision.totalAmount)} (difference: {money(selected.proposedRevision.totalAmount - selected.totalAmount)}).</p><ContentView value={selected.proposedRevision} costCodes={costCodes} /></section>}
            {!readonly && <div className="flex flex-wrap gap-2 border-t pt-3">
              {selected.status !== 'REJECTED' && <button className={button} disabled={busy} onClick={() => { setMessage(''); setEditing({ version: selected.version, content: selected.proposedRevision ?? selected }) }}>{selected.status === 'APPROVED' ? selected.proposedRevision ? 'Edit revision' : 'Create revision' : 'Edit change order'}</button>}
              {reviewStatus === 'DRAFT' && <><button className={button} disabled={busy} onClick={() => decision('PENDING_APPROVAL')}>{selected.proposedRevision ? 'Submit revision' : 'Submit for approval'}</button>{!selected.proposedRevision && <button className={button} disabled={busy} onClick={() => decision('APPROVED')}>Approve directly</button>}</>}
              {reviewStatus === 'PENDING_APPROVAL' && <><button className={`${button} text-green-700`} disabled={busy} onClick={() => decision('APPROVED')}>{selected.proposedRevision ? 'Approve revision' : 'Approve'}</button><button className={button} disabled={busy} onClick={() => setRejection('')}>Reject</button></>}
              {(reviewStatus === 'REJECTED' || reviewStatus === 'PENDING_APPROVAL') && <button className={button} disabled={busy} onClick={() => decision('DRAFT')}>Return to draft</button>}
              {selected.proposedRevision && <button className={`${button} text-red-700`} disabled={busy} onClick={() => { if (confirm('Discard this proposed revision? Its history will be kept.')) act({ action: 'discard-revision' }) }}>Discard revision</button>}
              {selected.status === 'DRAFT' && <button className={`${button} text-red-700`} disabled={busy} onClick={() => { if (confirm('Delete this unapproved draft and its notes/history?')) mutation.mutate({ id: selected.id, remove: true, body: { version: selected.version } }) }}>Delete draft</button>}
            </div>}
            {rejection !== null && !readonly && <form onSubmit={e => { e.preventDefault(); decision('REJECTED') }} className="space-y-2"><label className="block text-xs">Rejection reason<textarea className={input} value={rejection} onChange={e => setRejection(e.target.value)} /></label><button className={button} disabled={busy}>Confirm rejection</button><button type="button" className={`${button} ml-2`} onClick={() => setRejection(null)}>Cancel rejection</button></form>}
            <div className="border-t pt-3"><GenerateDocumentButton recordType="change-order" recordId={selected.id} templateType="CHANGE_ORDER" variant="dropdown" />{selected.proposedRevision && <p className="mt-1 text-xs text-gray-500">Documents use the current approved order. The proposed revision is shown above.</p>}</div>
            <section aria-label="Change order notes" className="border-t pt-3 space-y-3"><h4 className="font-semibold text-sm">Notes</h4>
              {!readonly && <form onSubmit={e => { e.preventDefault(); act({ action: 'note', body: note }) }} className="space-y-2"><label className="block text-xs">New note<textarea required maxLength={20000} className={input} value={note} onChange={e => setNote(e.target.value)} /></label><button className={button} disabled={busy || !note.trim()}>Add note</button></form>}
              {!selected.notes.length && <p className="text-xs text-gray-500">No notes yet.</p>}{selected.notes.map(note => <article key={note.id} className="rounded bg-gray-50 p-3 text-xs"><p className="text-gray-500">{note.actorName} · {new Date(note.createdAt).toLocaleString()}</p><p className="mt-1 whitespace-pre-wrap break-words">{note.body}</p></article>)}
            </section>
            <History events={selected.history} />
          </>}
        </div>
      </div>
    </div>}
  </div>
}
