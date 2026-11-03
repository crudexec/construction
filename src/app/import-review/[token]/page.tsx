'use client'

import { use, useEffect, useState } from 'react'
import { Check, ChevronRight, ClipboardList, HelpCircle, LockKeyhole, Search } from 'lucide-react'
import { KIND_LABELS, type ReviewField, type ReviewRow, type ReviewWorkspace } from '@/lib/import-review/types'

const control = 'w-full min-h-11 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100'
const decisionLabels = { resolve: 'Use these corrections', exclude: 'Exclude this row', question: 'I need help' }
const statusLabel = (row: ReviewRow) => row.decision === 'resolve' ? 'Corrected' : row.decision === 'exclude' ? 'Excluded' : row.decision === 'question' ? 'Question' : 'Needs review'
const initialValues = (row: ReviewRow) => row.decision ? row.values : Object.fromEntries(row.fields.map(field => [field.key, field.initial]))

export default function ImportReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [review, setReview] = useState<ReviewWorkspace | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState('')
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('all')
  const [status, setStatus] = useState('all')
  const [reviewer, setReviewer] = useState('')
  const [decision, setDecision] = useState<ReviewRow['decision']>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  function focusRow() {
    requestAnimationFrame(() => {
      const heading = document.getElementById('row-title')
      heading?.focus({ preventScroll: true })
      heading?.scrollIntoView({ block: 'start' })
    })
  }

  function selectRow(row: ReviewRow, force = false) {
    if (saving || (!force && dirty && !window.confirm('Discard the unsaved changes to this row?'))) return
    setActiveId(row.id); setDecision(row.decision); setValues(initialValues(row)); setNotes(row.notes)
    setDirty(false); setError(''); setMessage('')
    focusRow()
  }
  async function load() {
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/shared/import-review/${token}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setReview(data)
      const row = data.rows.find((item: ReviewRow) => !item.decision) ?? data.rows[0]
      if (row) { setActiveId(row.id); setDecision(row.decision); setValues(initialValues(row)); setNotes(row.notes) }
      setReviewer(data.submittedBy || '')
      setDirty(false)
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not load the review.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [token]) // One workspace per capability link.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const active = review?.rows.find(row => row.id === activeId)
  const remaining = review?.rows.filter(row => !row.decision).length ?? 0
  const questions = review?.rows.filter(row => row.decision === 'question').length ?? 0
  const filtered = review?.rows.filter(row => (kind === 'all' || row.kind === kind) &&
    (status === 'all' || (status === 'pending' ? !row.decision : row.decision === status)) &&
    `${row.title} ${row.reason} ${row.sourceId || ''}`.toLowerCase().includes(search.toLowerCase())) ?? []
  const readOnly = !!review?.submittedAt

  async function post(body: unknown) {
    const response = await fetch(`/api/shared/import-review/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Could not save. Your changes are still on this page.')
    return data
  }
  async function save(next: boolean) {
    if (!review || !active || saving) return
    setSaving(true); setError(''); setMessage('')
    try {
      const result = await post({ action: 'save', rowId: active.id, revision: active.revision, decision, values, notes, reviewer })
      const rows = review.rows.map(row => row.id === active.id ? result.row : row)
      setReview({ ...review, rows, revision: result.revision }); setDirty(false)
      if (next) {
        const candidates = [...rows.slice(active.position + 1), ...rows.slice(0, active.position)]
        const following = candidates.find(row => !row.decision)
        if (following) { setActiveId(following.id); setDecision(following.decision); setValues(initialValues(following)); setNotes(following.notes); setKind('all'); setStatus('all'); setSearch(''); focusRow() }
        else if (rows.every(row => row.decision)) requestAnimationFrame(() => { window.scrollTo({ top: 0 }); document.getElementById('submit-review')?.focus() })
      }
      setMessage('Response saved.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save. Please try again.') }
    finally { setSaving(false) }
  }
  async function submit() {
    if (!review || dirty || saving || remaining) return
    if (!window.confirm(`Submit all ${review.rows.length} decisions${questions ? `, including ${questions} question${questions === 1 ? '' : 's'}` : ''}? You can view them afterward; an administrator can reopen the review if needed.`)) return
    setSaving(true); setError('')
    try { const result = await post({ action: 'submit', revision: review.revision, reviewer }); setReview({ ...review, ...result }); setMessage('Review submitted. Your answers are ready for the final import review.') }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not submit. Please try again.') }
    finally { setSaving(false) }
  }
  function change(key: string, value: string) { setValues(previous => ({ ...previous, [key]: value })); setDirty(true); setMessage('') }
  function fieldControl(field: ReviewField) {
    const id = `correction-${field.key}`
    const options = field.options ?? review?.choices[field.choiceKey || ''] ?? []
    return <div key={field.key} className={field.type === 'checkbox' ? 'sm:col-span-2' : ''}>
      {field.type === 'checkbox' ? <label className="flex min-h-11 items-start gap-3 py-2 text-sm text-gray-800">
        <input id={id} type="checkbox" checked={values[field.key] === 'true'} disabled={readOnly || saving} onChange={event => change(field.key, String(event.target.checked))} className="mt-0.5 h-5 w-5 shrink-0 accent-primary-600 focus-visible:ring-2 focus-visible:ring-primary-500" />
        <span>{field.label}{field.required ? ' *' : ''}</span>
      </label> : <>
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-800">{field.label}{field.required ? ' *' : ''}</label>
        {field.type === 'select' ? <select id={id} className={control} value={values[field.key] || ''} disabled={readOnly || saving} onChange={event => change(field.key, event.target.value)}>
          <option value="">{field.required ? 'Choose an option' : 'None / not applicable'}</option>
          {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select> : <input id={id} type={field.type} className={control} value={values[field.key] || ''} disabled={readOnly || saving} min={field.type === 'number' ? '0' : undefined} step={field.type === 'number' ? '0.01' : undefined} maxLength={field.type === 'email' ? 254 : 1000} onChange={event => change(field.key, event.target.value)} />}
      </>}
      {field.hint && <p className="mt-1 text-xs leading-relaxed text-gray-600">{field.hint}</p>}
    </div>
  }

  if (loading) return <main className="min-h-screen bg-slate-50 p-8"><p role="status" className="mx-auto max-w-3xl text-gray-700">Loading your asset review…</p></main>
  if (!review) return <main className="min-h-screen bg-slate-50 px-5 py-16"><div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-6"><LockKeyhole className="mb-4 h-7 w-7 text-gray-500" /><h1 className="text-2xl font-semibold text-gray-900">Review unavailable</h1><p role="alert" className="mt-3 text-gray-700">{error}</p><button onClick={load} className="mt-5 min-h-11 rounded-md bg-primary-600 px-4 text-white hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500">Try again</button></div></main>

  return <main className="min-h-screen bg-slate-50 text-gray-900">
    <header className="border-b border-gray-200 bg-white px-4 py-5 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600"><span className="inline-flex items-center gap-2 font-semibold text-gray-800"><ClipboardList aria-hidden="true" className="h-5 w-5 text-primary-600" />Buildflo · {review.companyName}</span><span>Link expires {new Date(review.expiresAt).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">{review.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">Review the rows we held during your asset import. Correct the details, exclude a row, or leave a question. Your responses are saved for final review before anything changes in your live assets.</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p role="status" className="text-sm font-medium">{review.rows.length - remaining} of {review.rows.length} reviewed<span className="ml-3 font-normal text-gray-600">{remaining} remaining{questions ? ` · ${questions} questions` : ''}</span></p>
          {readOnly ? <p className="flex items-center gap-2 text-sm font-medium text-green-800"><Check className="h-4 w-4" />Submitted by {review.submittedBy}</p> : <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"><label className="text-sm text-gray-700" htmlFor="reviewer">Your name</label><input id="reviewer" maxLength={100} autoComplete="name" value={reviewer} onChange={event => setReviewer(event.target.value)} className={`${control} sm:w-48`} /><button id="submit-review" disabled={saving || dirty || remaining > 0 || !reviewer.trim()} onClick={submit} className="min-h-11 rounded-md bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-600 focus-visible:ring-2 focus-visible:ring-primary-500">Submit review</button></div>}
        </div>
        {readOnly && <p className="mt-3 text-sm text-green-800">Thank you. Your answers have been submitted for final import review. You can still browse them below.</p>}
      </div>
    </header>
    <div className="mx-auto grid max-w-7xl gap-5 p-4 sm:p-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <aside aria-label="Review rows" className="min-w-0">
        <div className="relative"><Search aria-hidden="true" className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" /><input aria-label="Search review rows" placeholder="Search asset, person, or source ID" value={search} onChange={event => setSearch(event.target.value)} className={`${control} pl-9`} /></div>
        <div className="my-3 grid grid-cols-2 gap-2"><select aria-label="Filter row type" value={kind} onChange={event => setKind(event.target.value)} className={control}><option value="all">All types</option>{Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="Filter review status" value={status} onChange={event => setStatus(event.target.value)} className={control}><option value="all">All statuses</option><option value="pending">Needs review</option><option value="resolve">Corrected</option><option value="exclude">Excluded</option><option value="question">Questions</option></select></div>
        <p className="mb-2 text-xs text-gray-600">{filtered.length} rows shown</p>
        <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-white lg:max-h-[calc(100vh-24rem)]">
          {!filtered.length && <p className="p-4 text-sm text-gray-600">No matching rows. Try another search or filter.</p>}
          {filtered.map(row => <button key={row.id} disabled={saving} onClick={() => selectRow(row)} aria-current={row.id === activeId ? 'true' : undefined} className={`block w-full border-b border-gray-100 px-4 py-3 text-left last:border-b-0 focus-visible:relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${row.id === activeId ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
            <span className="flex items-start justify-between gap-2"><span className="break-words text-sm font-medium">{row.title}</span><ChevronRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" /></span><span className="mt-1 block text-xs text-gray-600">{KIND_LABELS[row.kind]} · {statusLabel(row)}</span>
          </button>)}
        </div>
      </aside>
      {active && <section aria-labelledby="row-title" className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2 text-xs text-gray-600"><span>Row {active.position + 1} of {review.rows.length} · {KIND_LABELS[active.kind]}</span><span>{dirty ? 'Unsaved changes' : active.decision ? 'Saved' : 'Not reviewed'}</span></div>
        <h2 id="row-title" tabIndex={-1} className="mt-3 scroll-mt-4 break-words text-xl font-semibold focus:outline-none">{active.title}</h2>
        <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-amber-900"><HelpCircle aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />{active.reason}</p>
        <details className="mt-5 border-y border-gray-200 py-3" open><summary className="min-h-8 cursor-pointer text-sm font-medium text-gray-800">Original data and existing records</summary><dl className="mt-3 space-y-2">{active.context.map((entry, index) => <div key={index} className="grid gap-1 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]"><dt className="text-gray-600">{entry.label}</dt><dd className="whitespace-pre-wrap break-words text-gray-900">{entry.value || 'Not provided'}</dd></div>)}</dl><p className="mt-3 text-xs text-gray-500">Source: {active.sourceFile}.csv, row {active.sourceRow}{active.sourceId ? ` · ID ${active.sourceId}` : ''}</p></details>
        <fieldset disabled={readOnly || saving} className="mt-6"><legend className="text-sm font-semibold">How should we handle this row?</legend><div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">{Object.entries(decisionLabels).map(([value, label]) => <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm ${decision === value ? 'border-primary-500 bg-primary-50 text-primary-800' : 'border-gray-300 text-gray-700'}`}><input type="radio" name="decision" value={value} checked={decision === value} onChange={() => { setDecision(value as ReviewRow['decision']); setDirty(true); setMessage('') }} className="h-4 w-4 accent-primary-600 focus-visible:ring-2 focus-visible:ring-primary-500" />{label}</label>)}</div></fieldset>
        {decision === 'resolve' && <div className="mt-5"><p className="mb-4 text-xs leading-5 text-gray-600">Fields marked * are required. Dates and times are Pacific time. Matching a person here does not create a login.</p><div className="grid gap-4 sm:grid-cols-2">{active.fields.map(fieldControl)}</div></div>}
        {decision && <div className="mt-5"><label htmlFor="review-notes" className="mb-1.5 block text-sm font-medium">{decision === 'question' ? 'What do you need help with? *' : decision === 'exclude' ? 'Why should this row be excluded? *' : 'Additional notes'}</label><textarea id="review-notes" rows={3} maxLength={2000} disabled={readOnly || saving} value={notes} onChange={event => { setNotes(event.target.value); setDirty(true); setMessage('') }} className={control} /></div>}
        {error && <div role="alert" className="mt-4 text-sm text-red-700"><p>{error}</p><button className="mt-1 min-h-11 underline" onClick={() => { if (!dirty || window.confirm('Reload and discard unsaved changes?')) void load() }}>Reload saved review</button></div>}
        {message && <p role="status" className="mt-4 text-sm text-green-800">{message}</p>}
        {!readOnly && <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4"><button disabled={saving || !decision || !reviewer.trim()} onClick={() => save(true)} className="min-h-11 rounded-md bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-600 focus-visible:ring-2 focus-visible:ring-primary-500">{saving ? 'Saving…' : 'Save & next'}</button><button disabled={saving || !decision || !reviewer.trim()} onClick={() => save(false)} className="min-h-11 rounded-md border border-gray-300 px-4 text-sm text-gray-700 hover:bg-gray-50 disabled:text-gray-400 focus-visible:ring-2 focus-visible:ring-primary-500">Save response</button>{!reviewer.trim() && <p className="text-xs text-gray-600">Enter your name above to save.</p>}</div>}
      </section>}
    </div>
  </main>
}
