'use client'

import { Children, cloneElement, isValidElement, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { api, button, primary, control, ErrorMessage } from '@/components/feedback/shared'
export { api, button, primary, control, ErrorMessage }

export type PageResult<T> = { items: T[]; total: number; page: number; pageSize: number }
export type Company = {
  id: string; name: string; appName: string; email: string | null; phone: string | null; website: string | null;
  address: string | null; city: string | null; state: string | null; zipCode: string | null; country: string | null; currency: string;
  status: 'ACTIVE' | 'SUSPENDED'; createdAt: string; suspendedAt: string | null; suspensionReason: string | null;
  lastActivity?: string | null; lastLogin?: string | null; activeUsers?: number; pendingInvites?: number;
  _count: { users: number; assets: number; cards: number; feedbackRequests: number };
  users: { id: string; firstName: string; lastName: string; email: string }[];
}
export type UserRow = { id: string; email: string; firstName: string; lastName: string; role: string; isActive: boolean; lastLogin: string | null; createdAt: string; platformAdmin: unknown }
export type InviteRow = { id: string; email: string; firstName: string; lastName: string; role: string; expiresAt: string; createdAt: string }
export type AuditRow = { id: string; createdAt: string; companyId: string; companyName: string; actorId: string | null; actorName: string; actorType: string; scope: string; module: string; action: string; summary: string; resourceId: string | null; outcome: string; reason: string | null; before: Record<string, unknown> | null; after: Record<string, unknown> | null }
export function usePlatformQuery<T>(key: unknown[], url: string, enabled = true) {
  const userId = useAuthStore(s => s.user?.id)
  return useQuery({ queryKey: ['platform', userId, ...key], queryFn: () => api<T>(url), enabled: !!userId && enabled, retry: false, refetchOnWindowFocus: true, refetchInterval: key[0] === 'access' ? 30000 : false })
}
export function usePlatformMutation<T = unknown>(url: string, method = 'POST') {
  const client = useQueryClient()
  return useMutation({ mutationFn: (body: unknown) => api<T>(url, body, method), onSuccess: () => { void client.invalidateQueries({ queryKey: ['platform'] }); void client.invalidateQueries({ queryKey: ['feedback'] }) } })
}
export function useDebounced(value: string) {
  const [result, setResult] = useState(value)
  useEffect(() => { const timer = setTimeout(() => setResult(value), 300); return () => clearTimeout(timer) }, [value])
  return result
}
export const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString() : 'Not recorded'
function fieldControl(children: ReactNode, id: string): ReactNode {
  return Children.map(children, child => {
    if (!isValidElement(child)) return child
    const element = child as ReactElement<{ id?: string; children?: ReactNode }>
    if (typeof element.type === 'string' && ['input', 'select', 'textarea'].includes(element.type)) return cloneElement(element, { id })
    return element.props.children ? cloneElement(element, { children: fieldControl(element.props.children, id) }) : element
  })
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId()
  return <div className="min-w-0 space-y-2 text-sm font-medium text-gray-800"><label className="block" htmlFor={id}>{label}</label>{fieldControl(children, id)}</div>
}
export function Loading() { return <p role="status" className="py-8 text-sm text-gray-600">Loading…</p> }
export function Empty({ children }: { children: React.ReactNode }) { return <p className="py-10 text-center text-sm leading-6 text-gray-600">{children}</p> }
export function Pager({ page, total, pageSize = 25, change }: { page: number; total: number; pageSize?: number; change: (page: number) => void }) {
  if (!total) return null
  return <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600"><span>{Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total.toLocaleString()}</span><div className="flex gap-2"><button className={button} disabled={page <= 1} onClick={() => change(page - 1)}>Previous</button><button className={button} disabled={page * pageSize >= total} onClick={() => change(page + 1)}>Next</button></div></nav>
}
export function CompanyStatus({ status }: { status: string }) { return <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${status === 'ACTIVE' ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-900'}`}>{status === 'ACTIVE' ? 'Active' : 'Suspended'}</span> }
export type Action = { title: string; description: string; url: string; method?: string; body: Record<string, unknown>; destructive?: boolean }
export function ActionDialog({ action, close }: { action: Action | null; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const mutation = usePlatformMutation(action?.url || '', action?.method || 'PATCH')
  useEffect(() => { mutation.reset(); if (action && !ref.current?.open) ref.current?.showModal(); else if (!action) ref.current?.close() }, [action]) // eslint-disable-line react-hooks/exhaustive-deps
  return <dialog ref={ref} aria-labelledby="platform-confirm-title" onCancel={event => { event.preventDefault(); if (!mutation.isPending) close() }} className="m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-xl border border-gray-200 bg-white p-6 backdrop:bg-slate-900/30">
    {action && <form onSubmit={async event => { event.preventDefault(); const reason = String(new FormData(event.currentTarget).get('reason')); try { await mutation.mutateAsync({ ...action.body, reason }); close() } catch {} }} className="space-y-4"><h2 id="platform-confirm-title" className="text-lg font-semibold">{action.title}</h2><p className="text-sm leading-6 text-gray-600">{action.description}</p><Field label="Reason"><textarea autoFocus className={control} name="reason" required maxLength={500} rows={3} disabled={mutation.isPending} placeholder="Explain why this change is needed" /></Field><ErrorMessage error={mutation.error} /><div className="flex flex-wrap justify-end gap-2"><button type="button" className={button} disabled={mutation.isPending} onClick={close}>Cancel</button><button className={`${primary} ${action.destructive ? 'bg-red-700 hover:bg-red-800' : ''}`} disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Confirm change'}</button></div></form>}
  </dialog>
}
