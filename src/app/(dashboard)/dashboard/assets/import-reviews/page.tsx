'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Download, ExternalLink } from 'lucide-react'
import type { ReviewOption, ReviewRow } from '@/lib/import-review/types'

interface ReviewSummary { id: string; title: string; total: number; reviewed: number; questions: number; expiresAt: string; revokedAt: string | null; submittedAt: string | null; submittedBy: string | null }
interface ReviewDetail extends ReviewSummary { rows: ReviewRow[]; choices: Record<string, ReviewOption[]> }
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50'

export default function ImportReviewsAdminPage() {
  const [reviews, setReviews] = useState<ReviewSummary[]>([])
  const [detail, setDetail] = useState<ReviewDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  async function request(url: string, body?: unknown) {
    const response = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)
    return data
  }
  async function load() {
    try { setReviews(await request('/api/asset-import-reviews')) }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not load reviews.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  async function open(id: string) {
    setBusy(true); setError(''); setLink('')
    try { setDetail(await request(`/api/asset-import-reviews/${id}`)) }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not load review.') }
    finally { setBusy(false) }
  }
  async function action(value: string) {
    if (!detail || busy) return
    const confirmation = value === 'renew' ? 'Create a new 14-day link? The old link will stop working. Saved answers will be preserved.' : value === 'revoke' ? 'Disable the client link now? Saved answers will be preserved.' : 'Reopen this review so the client can edit their submitted answers?'
    if (!window.confirm(confirmation)) return
    setBusy(true); setError(''); setCopied(false)
    try {
      const result = await request(`/api/asset-import-reviews/${detail.id}`, { action: value })
      setLink(result.link || '')
      setDetail(await request(`/api/asset-import-reviews/${detail.id}`))
      await load()
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not update review.') }
    finally { setBusy(false) }
  }
  const state = (review: ReviewSummary) => review.revokedAt ? 'Link revoked' : new Date(review.expiresAt) <= new Date() ? 'Link expired' : review.submittedAt ? 'Submitted' : 'Open'
  return <div className="space-y-5">
    <Link href="/dashboard/assets" className="inline-flex min-h-11 items-center gap-2 text-sm text-primary-700 hover:underline"><ArrowLeft className="h-4 w-4" />Back to assets</Link>
    <div><h1 className="text-2xl font-bold text-gray-900">Import reviews</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">Track client corrections and manage temporary review links. Export the answers for reconciliation before applying changes to assets.</p></div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {loading ? <p role="status">Loading reviews…</p> : !reviews.length ? <p className="rounded-lg border bg-white p-6 text-gray-600">No import reviews have been created for this company.</p> : <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white"><table className="w-full text-left text-sm"><thead className="border-b bg-gray-50 text-gray-700"><tr>{['Review', 'Progress', 'Status', 'Expires', ''].map((label, index) => <th key={index} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{reviews.map(review => <tr key={review.id} className="border-b last:border-b-0"><td className="px-4 py-3 font-medium">{review.title}</td><td className="px-4 py-3">{review.reviewed}/{review.total} reviewed{review.questions > 0 && <span className="block text-xs text-amber-800">{review.questions} questions</span>}</td><td className="px-4 py-3">{state(review)}</td><td className="whitespace-nowrap px-4 py-3">{new Date(review.expiresAt).toLocaleDateString()}</td><td className="px-4 py-3"><button disabled={busy} onClick={() => open(review.id)} className={button}>View responses</button></td></tr>)}</tbody></table></div>}
    {detail && <section className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6">
      <h2 className="text-xl font-semibold">{detail.title}</h2><p className="mt-1 text-sm text-gray-600">{state(detail)}{detail.submittedBy ? ` · Submitted by ${detail.submittedBy}` : ''}</p>
      <div className="my-4 flex flex-wrap gap-2"><a href={`/api/asset-import-reviews/${detail.id}?download=1`} className={button}><Download className="h-4 w-4" />Export answers</a><button disabled={busy} onClick={() => action('renew')} className={button}>Create new link</button><button disabled={busy || !!detail.revokedAt} onClick={() => action('revoke')} className={button}>Revoke link</button>{detail.submittedAt && <button disabled={busy} onClick={() => action('reopen')} className={button}>Reopen review</button>}</div>
      {link && <div className="mb-5 rounded-md bg-primary-50 p-4"><p className="mb-2 text-sm text-primary-900">New link created. Copy it before leaving this page. The previous link no longer works.</p><label htmlFor="client-link" className="sr-only">Client review link</label><input id="client-link" readOnly value={link} className="min-h-11 w-full rounded border border-primary-200 bg-white px-3 text-sm" /><div className="mt-2 flex gap-2"><button onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true) } catch { setError('Copy the link from the field above.') } }} className={button}><Copy className="h-4 w-4" />{copied ? 'Copied' : 'Copy link'}</button><a href={link} target="_blank" rel="noreferrer" className={button}><ExternalLink className="h-4 w-4" />Preview</a></div></div>}
      <div className="divide-y divide-gray-200">{detail.rows.map(row => <details key={row.id} className="py-3"><summary className="min-h-11 cursor-pointer text-sm font-medium">{row.position + 1}. {row.title}<span className="ml-2 font-normal text-gray-600">{row.decision === 'resolve' ? 'Corrected' : row.decision === 'exclude' ? 'Excluded' : row.decision === 'question' ? 'Question' : 'Not reviewed'}</span></summary><div className="mt-2 space-y-3 pl-2 text-sm"><p className="text-gray-600">{row.reason}</p><dl className="space-y-2">{row.fields.map(field => { const value = row.values[field.key]; const options = field.options ?? detail.choices[field.choiceKey || ''] ?? []; return <div key={field.key} className="grid gap-1 sm:grid-cols-2"><dt className="text-gray-600">{field.label}</dt><dd className="break-words">{value ? options.find(option => option.value === value)?.label || (field.type === 'checkbox' ? value === 'true' ? 'Confirmed' : 'Not confirmed' : value) : 'No answer'}</dd></div> })}</dl>{row.notes && <p className="whitespace-pre-wrap rounded bg-gray-50 p-3">{row.notes}</p>}<p className="text-xs text-gray-600">{row.reviewer ? `Saved by ${row.reviewer} · ` : ''}{row.sourceFile}.csv, row {row.sourceRow}</p></div></details>)}</div>
    </section>}
  </div>
}
