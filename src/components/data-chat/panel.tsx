'use client'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowUp, History, Plus } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api, button, ErrorMessage } from '@/components/feedback/shared'
import { Answer } from './answer'
import type { ChatRun } from '@/lib/data-chat/types'

type Index = { available: boolean; reason: string | null; items: { id: string; title: string; updatedAt: string }[]; total: number; page: number }
const quietButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60'
const suggestions = ['How many assets do we have by status?', 'Which tasks are overdue?']

export function DataChatPanel({ active }: { active: boolean }) {
  const userId = useAuthStore(s => s.user?.id), client = useQueryClient()
  const [threadId, setThreadId] = useState<string | null>(null), [list, setList] = useState(false), [page, setPage] = useState(1), [question, setQuestion] = useState('')
  const messageId = useRef<string | null>(null), log = useRef<HTMLDivElement>(null), input = useRef<HTMLTextAreaElement>(null)
  const nearBottom = useRef(true)
  const index = useQuery({ queryKey: ['data-chat', userId, 'index', page], queryFn: () => api<Index>(`/api/data-chat?page=${page}`), enabled: active, retry: false, refetchInterval: active ? 30000 : false })
  const thread = useQuery({ queryKey: ['data-chat', userId, threadId], queryFn: () => api<{ id: string; title: string; runs: ChatRun[] }>(`/api/data-chat/${threadId}`), enabled: active && !!threadId && !list, retry: false, refetchInterval: query => active && query.state.data?.runs.some(run => run.status === 'RUNNING' && Date.now() - new Date(run.createdAt).getTime() < 120000) ? 3000 : false })
  const send = useMutation({ mutationFn: () => { messageId.current ||= crypto.randomUUID(); return api<ChatRun>('/api/data-chat', { question, conversationId: threadId, clientId: messageId.current }) }, onSuccess: run => { setThreadId(run.conversationId); setList(false); setQuestion(''); messageId.current = null; void client.invalidateQueries({ queryKey: ['data-chat', userId] }) }, onError: () => { void client.invalidateQueries({ queryKey: ['data-chat', userId] }) } })
  useEffect(() => { if (log.current && nearBottom.current) log.current.scrollTop = log.current.scrollHeight }, [thread.data, send.isPending, list, active])
  useEffect(() => { if (input.current) { input.current.style.height = 'auto'; input.current.style.height = `${Math.min(input.current.scrollHeight, 144)}px` } }, [question, list, active])
  const fresh = () => { setThreadId(null); setList(false); setQuestion(''); messageId.current = null; nearBottom.current = true; send.reset() }
  const submit = () => { if (!send.isPending && question.trim() && index.data?.available) { nearBottom.current = true; send.mutate() } }

  return <div className="flex min-h-0 flex-1 flex-col selection:bg-primary-100 selection:text-primary-900">
    <div className="flex shrink-0 items-center justify-between px-3 py-1 sm:px-5">
      <button className={quietButton} disabled={send.isPending} onClick={() => setList(value => !value)}>
        {list ? <ArrowLeft className="h-4 w-4" aria-hidden="true" /> : <History className="h-4 w-4" aria-hidden="true" />}{list ? 'Back to chat' : 'Conversations'}
      </button>
      <button className={quietButton} disabled={send.isPending || !index.data?.available} onClick={fresh}><Plus className="h-4 w-4" aria-hidden="true" />New chat</button>
    </div>
    {(index.error || (index.data && !index.data.available)) && <div className="max-h-[30%] shrink-0 overflow-y-auto px-5 pb-3">
      {index.data && !index.data.available && <p role="status" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">{index.data.reason} Contact the platform administrator.</p>}
      <ErrorMessage error={index.error} retry={() => { void index.refetch() }} />
    </div>}
    {list ? <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-7">
      <h3 className="py-4 text-base font-semibold">Conversations</h3>
      {index.isPending && <p role="status" className="py-6 text-sm text-gray-600">Loading conversations…</p>}
      {index.data?.items.length === 0 && <p className="py-6 text-sm text-gray-600">Your conversations will appear here.</p>}
      <ul className="divide-y divide-gray-100">{index.data?.items.map(item => <li key={item.id}>
        <button className="w-full rounded-md px-2 py-4 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500" onClick={() => { setThreadId(item.id); setList(false); setQuestion(''); send.reset(); messageId.current = null; nearBottom.current = true }}>
          <p className="break-words text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-gray-500">{new Date(item.updatedAt).toLocaleDateString()}</p>
        </button>
      </li>)}</ul>
      {index.data && index.data.total > 25 && <div className="mt-3 flex justify-between gap-2"><button className={button} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button><button className={button} disabled={page * 25 >= index.data.total} onClick={() => setPage(p => p + 1)}>Next</button></div>}
    </div> : <>
      <div ref={log} role="log" aria-label="Buildflo Assist conversation" aria-live="polite" onScroll={() => { const el = log.current; if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100 }} className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
        <ErrorMessage error={thread.error} retry={() => { void thread.refetch() }} />
        {threadId && thread.isPending && <p role="status" className="text-sm text-gray-600">Loading conversation…</p>}
        {!threadId && !send.isPending && <div className="flex min-h-full flex-col justify-center py-8">
          <h3 className="text-2xl font-semibold tracking-tight">What would you like to know?</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">Ask about your assets, projects, and day-to-day work.</p>
          <div className="mt-6 flex flex-col items-start gap-1">{suggestions.map(suggestion => <button key={suggestion} disabled={!index.data?.available} className="min-h-11 rounded-md py-2 text-left text-sm text-primary-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:text-gray-500" onClick={() => { setQuestion(suggestion); input.current?.focus() }}>{suggestion}</button>)}</div>
        </div>}
        {thread.data?.runs.map(run => <div key={run.id} className="space-y-5">
          <div className="ml-auto w-fit max-w-[90%] rounded-2xl bg-gray-100 px-4 py-3"><span className="sr-only">You: </span><p className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{run.question}</p></div>
          <div><span className="sr-only">Buildflo Assist: </span><Answer run={run} /></div>
        </div>)}
        {send.isPending && <div role="status" className="space-y-5 text-sm"><p className="ml-auto w-fit max-w-[90%] whitespace-pre-wrap break-words rounded-2xl bg-gray-100 px-4 py-3 leading-6 [overflow-wrap:anywhere]">{question}</p><p className="text-gray-600">Thinking…</p></div>}
      </div>
      <form className="max-h-[45%] shrink-0 space-y-2 overflow-y-auto px-4 pb-4 pt-2 sm:px-5 sm:pb-5" onSubmit={event => { event.preventDefault(); submit() }}>
        <ErrorMessage error={send.error} />
        {send.isError && <button type="button" className="min-h-11 text-xs text-primary-700 underline underline-offset-2" onClick={() => { messageId.current = null; send.reset() }}>Start a new attempt</button>}
        <div className="flex items-end gap-2 rounded-2xl border border-gray-300 bg-white p-2 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
          <label className="sr-only" htmlFor="company-data-question">Message Buildflo Assist</label>
          <textarea ref={input} id="company-data-question" className="min-h-11 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-3 text-sm leading-5 text-gray-900 caret-primary-600 placeholder:text-gray-600 focus:outline-none disabled:opacity-60" rows={1} maxLength={3000} required value={question} disabled={send.isPending || !index.data?.available} placeholder="Ask Buildflo Assist…" onChange={event => { setQuestion(event.target.value); messageId.current = null; send.reset() }} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit() } }} />
          <button aria-label={send.isPending ? 'Thinking' : 'Send question'} title="Send question" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500" disabled={send.isPending || !question.trim() || !index.data?.available}><ArrowUp className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        {question.length >= 2700 && <p className="text-right text-xs text-gray-600">{(3000 - question.length).toLocaleString()} characters remaining</p>}
      </form>
    </>}
  </div>
}
