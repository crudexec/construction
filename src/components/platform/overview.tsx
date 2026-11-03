'use client'
import Link from 'next/link'
import { ArrowRight, RefreshCw } from 'lucide-react'
import { ActivityRows } from './activity'
import { AuditRow, button, dateTime, Empty, ErrorMessage, Loading, usePlatformQuery } from './shared'

type Overview = { companies: number; activeCompanies: number; suspendedCompanies: number; activeUsers: number; newCompanies: number; openFeedback: number; attention: { expiredInvites: number; failedActions: number; missingAdmin: number; inactive: number; unanswered: number; incomplete: number }; recent: AuditRow[]; asOf: string }
export function Overview() {
  const query = usePlatformQuery<Overview>(['overview'], '/api/platform/overview'), data = query.data
  if (query.isPending) return <Loading />
  if (!data) return <ErrorMessage error={query.error} retry={() => { void query.refetch() }} />
  const day = new Date(Date.now() - 86400000).toISOString().slice(0, 10), week = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), month = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const metrics = [
    { label: 'Companies', value: data.companies, href: '?view=companies' },
    { label: 'Active companies', value: data.activeCompanies, href: '?view=companies&status=ACTIVE' },
    { label: 'Suspended companies', value: data.suspendedCompanies, href: '?view=companies&status=SUSPENDED' },
    { label: 'Users signed in · 7 days', value: data.activeUsers, href: `?view=audit&scope=all&module=auth&from=${week}` },
    { label: 'New companies · 30 days', value: data.newCompanies, href: `?view=companies&createdAfter=${month}` },
    { label: 'Open feedback', value: data.openFeedback, href: '?view=feedback' },
  ]
  const attention = [
    { label: 'Companies without an active administrator', value: data.attention.missingAdmin, href: '?view=companies&attention=missing-admin' },
    { label: 'Expired invitations', value: data.attention.expiredInvites, href: '?view=companies&attention=expired-invites' },
    { label: 'Feedback unanswered for over 7 days', value: data.attention.unanswered, href: '?view=feedback&unanswered=true' },
    { label: 'Failed operations · past 24 hours', value: data.attention.failedActions, href: `?view=audit&scope=all&outcome=FAILED&from=${day}` },
    { label: 'Operations missing a completion record', value: data.attention.incomplete, href: '?view=audit&scope=all&incomplete=true' },
    { label: 'Companies without a sign-in in 30 days', value: data.attention.inactive, href: '?view=companies&attention=inactive' },
  ]
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Platform overview</h2><p className="mt-1 text-sm text-gray-600">Company accounts, customer activity, and requests that need attention.</p></div><button className={button} disabled={query.isFetching} onClick={() => { void query.refetch() }}><RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />Refresh</button></div>
    <dl className="grid grid-cols-2 divide-x divide-gray-200 rounded-xl border border-gray-200 bg-white lg:grid-cols-3 xl:grid-cols-6">{metrics.map(m => <div key={m.label} className="p-4"><dt className="text-xs leading-5 text-gray-600">{m.label}</dt><dd className="mt-2 text-2xl font-semibold tabular-nums"><Link href={`/dashboard/platform${m.href}`} className="text-primary-700 hover:underline">{m.value.toLocaleString()}</Link></dd></div>)}</dl>
    <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]"><section className="self-start rounded-xl border border-gray-200 bg-white p-5"><h3 className="text-base font-semibold">Needs attention</h3><p className="mt-1 text-sm text-gray-600">Open a queue to review the affected accounts or requests.</p><ul className="mt-4 divide-y divide-gray-200">{attention.map(a => <li key={a.label}><Link href={`/dashboard/platform${a.href}`} className="flex min-h-14 items-center gap-3 py-3 text-sm hover:text-primary-700"><span className="flex-1">{a.label}</span><span className={`font-semibold tabular-nums ${a.value ? 'text-amber-900' : 'text-gray-500'}`}>{a.value.toLocaleString()}</span><ArrowRight className="h-4 w-4 shrink-0 text-gray-400" /></Link></li>)}</ul></section><section className="min-w-0 rounded-xl border border-gray-200 bg-white p-5"><div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold">Recent activity</h3><Link className="text-sm text-primary-700 hover:underline" href="/dashboard/platform?view=audit&scope=all">View all</Link></div>{data.recent.length ? <ActivityRows items={data.recent} /> : <Empty>New activity will appear here as companies use Buildflo.</Empty>}</section></div><p className="text-xs text-gray-500">Updated {dateTime(data.asOf)}. Activity totals reflect recorded events from the audit rollout.</p>
  </div>
}
