'use client'
import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Building2, LayoutDashboard, ListChecks, LockKeyhole, MessageSquare, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import FeedbackBoard from '@/components/feedback/board'
import { ActivityFeed } from './activity'
import { CompanyWorkspace } from './company'
import { Companies } from './companies'
import { Overview } from './overview'
import { SecurityGate } from './security'
import { Company, PageResult, button, control, ErrorMessage, Field, Loading, Pager, useDebounced, usePlatformMutation, usePlatformQuery } from './shared'

function PlatformFeedback({ unanswered }: { unanswered: boolean }) {
  const [search, setSearch] = useState(''), [companyId, setCompanyId] = useState(''), [companyName, setCompanyName] = useState(''), [page, setPage] = useState(1)
  const delayed = useDebounced(search)
  const companies = usePlatformQuery<PageResult<Company>>(['feedback-company-options', delayed, page], `/api/platform/companies?search=${encodeURIComponent(delayed)}&page=${page}`)
  return <div><div className="mb-4 max-w-2xl space-y-3"><div className="grid gap-3 sm:grid-cols-2"><Field label="Find a company"><input className={control} value={search} placeholder="Search company names" onChange={e => { setSearch(e.target.value); setPage(1) }} /></Field><Field label="Filter feedback by company"><select className={control} value={companyId} onChange={e => { setCompanyId(e.target.value); setCompanyName(e.target.selectedOptions[0]?.text || '') }}><option value="">All companies</option>{companyId && !companies.data?.items.some(c => c.id === companyId) && <option value={companyId}>{companyName}</option>}{companies.data?.items.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field></div>{companies.data && companies.data.total > 25 && <Pager page={page} total={companies.data.total} change={setPage} />}<ErrorMessage error={companies.error} /></div>{unanswered && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">Showing open requests older than seven days without a team reply. <Link className="underline" href="/dashboard/platform?view=feedback">Show all feedback</Link></p>}<FeedbackBoard companyId={companyId} companyName={companyName} unanswered={unanswered} /></div>
}
function WorkspaceContent() {
  const params = useSearchParams(), companyId = params.get('company'), requested = params.get('view') || 'overview'
  const access = usePlatformQuery<{ isPlatformAdmin: boolean; mfaEnabled: boolean; verified: boolean }>(['access'], '/api/platform/access')
  const lock = usePlatformMutation('/api/platform/security')
  const nav = [{ id: 'overview', name: 'Overview', icon: LayoutDashboard }, { id: 'companies', name: 'Companies', icon: Building2 }, { id: 'feedback', name: 'Feedback', icon: MessageSquare }, { id: 'audit', name: 'Audit', icon: ListChecks }]
  const view = companyId ? 'companies' : nav.some(n => n.id === requested) ? requested : 'overview'
  const initial = Object.fromEntries(params.entries())
  return <div className="mx-auto max-w-[1600px] space-y-5 pb-20"><div className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/dashboard/settings" className="inline-flex min-h-8 items-center text-sm text-primary-700 hover:underline">← Settings</Link><h1 className="mt-1 flex items-center gap-2 text-xl font-semibold"><ShieldCheck className="h-5 w-5 text-primary-600" />Platform administration</h1></div>{access.data?.verified && <button className={button} disabled={lock.isPending} onClick={() => lock.mutate({ action: 'lock' })}><LockKeyhole className="h-4 w-4" />Lock workspace</button>}</div><ErrorMessage error={access.error || lock.error} retry={() => { void access.refetch(); lock.reset() }} />
    {access.isPending ? <Loading /> : access.data && (!access.data.verified ? <SecurityGate enrolled={access.data.mfaEnabled} /> : <><nav aria-label="Platform sections" className="flex flex-wrap gap-1 border-b border-gray-200 bg-white px-2">{nav.map(n => <Link key={n.id} href={`/dashboard/platform?view=${n.id}`} aria-current={view === n.id ? 'page' : undefined} className={`inline-flex min-h-12 items-center gap-2 border-b-2 px-4 text-sm font-medium ${view === n.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-600 hover:text-gray-900'}`}><n.icon className="h-4 w-4" />{n.name}</Link>)}</nav><div key={companyId ? `${companyId}:${params.get('tab')}` : params.toString()}>{companyId ? <CompanyWorkspace id={companyId} tab={params.get('tab') || 'overview'} /> : view === 'companies' ? <Companies initial={initial} /> : view === 'feedback' ? <PlatformFeedback unanswered={params.get('unanswered') === 'true'} /> : view === 'audit' ? <ActivityFeed initial={initial} /> : <Overview />}</div></>)}
  </div>
}
export function PlatformWorkspace() {
  const userId = useAuthStore(s => s.user?.id)
  return <Suspense fallback={<Loading />}><WorkspaceContent key={userId || 'anonymous'} /></Suspense>
}
