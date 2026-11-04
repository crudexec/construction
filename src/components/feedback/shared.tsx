'use client'

import { useEffect, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { FeedbackCard, FeedbackList, FeedbackStatus, FeedbackThread, statusLabels, statuses } from '@/lib/feedback/types'

export const control = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100'
export const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60'
export const primary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-600'
export async function api<T>(url: string, body?: unknown, method = 'POST'): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...(body ? { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Could not connect. Please try again.')
  return data as T
}
export function useFeedbackAccess() {
  const id = useAuthStore(s => s.user?.id)
  return useQuery({ queryKey: ['feedback-access', id], queryFn: () => api<{ canManage: boolean; global: boolean; userId: string }>('/api/feedback/access'), enabled: !!id, retry: false, staleTime: 60000 })
}
export function useFeedbackList(view: 'mine' | 'board', status?: FeedbackStatus, search = '', enabled = true, companyId = '', unanswered = false) {
  const userId = useAuthStore(s => s.user?.id)
  return useInfiniteQuery({
    queryKey: ['feedback', 'list', userId, view, status, search, companyId, unanswered], initialPageParam: '', enabled: enabled && !!userId,
    queryFn: ({ pageParam }) => api<FeedbackList>(`/api/feedback?${new URLSearchParams({ view, ...(companyId ? { companyId } : {}), ...(unanswered ? { unanswered: 'true' } : {}), ...(status ? { status } : {}), ...(search ? { search } : {}), ...(pageParam ? { cursor: pageParam } : {}) })}`),
    getNextPageParam: last => last.nextCursor || undefined, refetchInterval: enabled ? 30000 : false, refetchOnWindowFocus: true, retry: false,
  })
}
export function Status({ value }: { value: FeedbackStatus }) {
  return <span className={`inline-flex whitespace-nowrap rounded px-2 py-1 text-xs font-medium ${value === 'DONE' ? 'bg-green-50 text-green-800' : value === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>{statusLabels[value]}</span>
}
export function ErrorMessage({ error, retry }: { error: Error | null; retry?: () => void }) {
  if (!error) return null
  return <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800"><p>{error.message}</p>{retry && <button className="mt-2 min-h-11 font-medium underline underline-offset-4" onClick={retry}>Try again</button>}</div>
}
export function FeedbackDialog({ open, close, title, children, back, spacious = false, headerContent }: { open: boolean; close: () => void; title: string; children: React.ReactNode; back?: () => void; spacious?: boolean; headerContent?: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { if (open && !ref.current?.open) ref.current?.showModal(); else if (!open && ref.current?.open) ref.current?.close() }, [open])
  return <dialog ref={ref} aria-label={title} onCancel={event => { event.preventDefault(); close() }} className={`fixed inset-auto bottom-4 right-4 m-0 max-h-none w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-white p-0 text-gray-900 shadow-xl backdrop:bg-slate-900/20 sm:bottom-6 sm:right-6 ${spacious ? 'h-[calc(100dvh-2rem)] max-w-[640px] sm:h-[min(800px,calc(100dvh-3rem))]' : 'h-[min(680px,calc(100dvh-2rem))] max-w-[440px]'}`}>
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-4 py-3">{back && <button className={`${button} shrink-0 border-0 px-2`} aria-label="Back to feedback" onClick={back}><ArrowLeft className="h-5 w-5" /></button>}<div className="min-w-0 flex-1">{headerContent || <h2 className="truncate text-base font-semibold">{title}</h2>}</div><button className={`${button} shrink-0 border-0 px-2`} onClick={close} aria-label={headerContent ? 'Close chat' : 'Close feedback'}><X className="h-5 w-5" /></button></header>
      {children}
    </div>
  </dialog>
}
export function useMoveFeedback() {
  const client = useQueryClient()
  return useMutation({ mutationFn: ({ request, status }: { request: FeedbackCard; status: FeedbackStatus }) => api(`/api/feedback/${request.id}`, { status, version: request.version }, 'PATCH'), onSettled: () => client.invalidateQueries({ queryKey: ['feedback'] }) })
}
export function StatusMenu({ request, disabled = false }: { request: FeedbackCard; disabled?: boolean }) {
  const move = useMoveFeedback()
  return <div><select aria-label={`Status for ${request.title}`} className={`${control} min-h-11`} value={request.status} disabled={move.isPending || disabled} onChange={event => move.mutate({ request, status: event.target.value as FeedbackStatus })}>{statuses.map(status => <option value={status} key={status}>{statusLabels[status]}</option>)}</select><ErrorMessage error={move.error} /></div>
}
export function Conversation({ id, active = true }: { id: string; active?: boolean }) {
  const userId = useAuthStore(s => s.user?.id), client = useQueryClient()
  const draftKey = ['feedback-draft', userId, id]
  const [draft, setDraft] = useState(() => client.getQueryData<string>(draftKey) || '')
  const nonce = useRef<string | null>(null), bottom = useRef<HTMLDivElement>(null), scroll = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true), lastMessage = useRef('')
  const query = useInfiniteQuery({ queryKey: ['feedback', 'thread', userId, id], initialPageParam: '', queryFn: ({ pageParam }) => api<FeedbackThread>(`/api/feedback/${id}${pageParam ? `?before=${encodeURIComponent(pageParam)}` : ''}`), getNextPageParam: page => page.nextCursor || undefined, enabled: active, refetchInterval: active ? 15000 : false, retry: false, refetchOnWindowFocus: true })
  const request = query.data?.pages[0].request
  const messages = [...new Map((query.data?.pages.slice().reverse().flatMap(p => p.messages) || []).map(m => [m.id, m])).values()]
  const latest = messages.at(-1)?.id
  useEffect(() => { if (latest && latest !== lastMessage.current && nearBottom.current) bottom.current?.scrollIntoView({ block: 'end' }); lastMessage.current = latest || '' }, [latest])
  const send = useMutation({ mutationFn: () => { nonce.current ||= crypto.randomUUID(); return api(`/api/feedback/${id}`, { body: draft, clientId: nonce.current }) }, onSuccess: async () => { setDraft(''); client.removeQueries({ queryKey: draftKey, exact: true }); nonce.current = null; nearBottom.current = true; await client.invalidateQueries({ queryKey: ['feedback'] }) } })
  return <>
    {request && <div className="shrink-0 border-b border-gray-200 px-4 py-3"><h3 className="break-words text-sm font-semibold">{request.title}</h3><div className="mt-2 flex flex-wrap items-center gap-2"><Status value={request.status} /><span className="text-xs text-gray-600">{request.createdByName}</span></div>{query.data?.pages[0].canManage && <div className="mt-3"><StatusMenu request={request} /></div>}{request.pagePath && <p className="mt-2 break-all text-xs text-gray-600">Reported from {request.pagePath.replace('/dashboard', '') || 'Dashboard'}</p>}</div>}
    <div ref={scroll} onScroll={() => { const el = scroll.current; if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100 }} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4" aria-label="Feedback messages">
      {query.isPending && <p role="status" className="text-sm text-gray-600">Loading conversation…</p>}
      <ErrorMessage error={query.error} retry={() => { void query.refetch() }} />
      {query.hasNextPage && <button className={`${button} w-full`} disabled={query.isFetchingNextPage} onClick={async () => { const oldHeight = scroll.current?.scrollHeight || 0; await query.fetchNextPage(); requestAnimationFrame(() => { if (scroll.current) scroll.current.scrollTop += scroll.current.scrollHeight - oldHeight }) }}>Load earlier messages</button>}
      {messages.map(message => message.kind === 'STATUS' ? <p key={message.id} className="text-center text-xs leading-5 text-gray-600">{message.body} <span className="block">{message.authorName} · {new Date(message.createdAt).toLocaleString()}</span></p> : <div key={message.id} className={`flex ${message.authorId === userId ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[92%] rounded-lg px-3 py-2.5 ${message.authorId === userId ? 'bg-primary-600 text-white' : 'border border-gray-200 bg-white text-gray-900'}`}><p className={`mb-1 text-xs font-medium ${message.authorId === userId ? 'text-white' : 'text-gray-600'}`}>{message.authorName}{message.fromTeam ? ' · Team' : ''}</p><p className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{message.body}</p><p className={`mt-1 text-[11px] ${message.authorId === userId ? 'text-white' : 'text-gray-600'}`}>{new Date(message.createdAt).toLocaleString()}</p></div></div>)}
      <div ref={bottom} />
    </div>
    <form className="shrink-0 space-y-2 border-t border-gray-200 bg-white p-4" onSubmit={event => { event.preventDefault(); if (draft.trim() && !send.isPending) send.mutate() }}>
      <ErrorMessage error={send.error} />
      <label htmlFor={`reply-${id}`} className="block text-sm font-medium">Reply</label>
      <textarea id={`reply-${id}`} rows={2} maxLength={4000} className={`${control} resize-none`} placeholder="Add a detail or ask a question…" value={draft} disabled={send.isPending} onChange={event => { setDraft(event.target.value); client.setQueryData(draftKey, event.target.value); nonce.current = null; send.reset() }} />
      <div className="flex items-center justify-between gap-2"><span className="text-xs text-gray-600">{draft.length.toLocaleString()}/4,000</span><button className={primary} disabled={!draft.trim() || send.isPending || !request}><Send className="h-4 w-4" />{send.isPending ? 'Sending…' : 'Send reply'}</button></div>
    </form>
  </>
}
