'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api, button, control, Company, ErrorMessage, Field } from './shared'

export function DeleteCompany({ company }: { company: Company }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [confirmationName, setConfirmationName] = useState('')
  const router = useRouter(), client = useQueryClient()
  const mutation = useMutation({ mutationFn: (body: unknown) => api(`/api/platform/companies/${company.id}`, body, 'DELETE') })
  return <section className="mt-10 max-w-3xl border-t border-gray-200 pt-6" aria-labelledby="delete-company-heading">
    <h2 id="delete-company-heading" className="text-lg font-semibold text-gray-900">Delete company</h2>
    <p className="mt-2 text-sm leading-6 text-gray-600">Permanently remove this company, its users, invitations and business records. To temporarily block access while keeping records, use Suspend company instead.</p>
    <button type="button" className={`${button} mt-4 text-red-700 hover:bg-red-50`} onClick={() => { mutation.reset(); setConfirmationName(''); dialog.current?.showModal() }}>Delete company</button>
    <dialog ref={dialog} aria-labelledby="delete-company-title" aria-describedby="delete-company-description" onCancel={event => { if (mutation.isPending) event.preventDefault() }} className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 backdrop:bg-slate-900/30">
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault()
        const reason = String(new FormData(event.currentTarget).get('reason'))
        try {
          await mutation.mutateAsync({ confirmationName, reason })
          dialog.current?.close()
          router.replace('/dashboard/platform?view=companies')
          void client.invalidateQueries({ queryKey: ['platform'], refetchType: 'none' })
          void client.invalidateQueries({ queryKey: ['feedback'] })
          toast.success(`${company.name} deleted`)
        } catch { /* Keep the dialog and input visible for correction or retry. */ }
      }}>
        <h2 id="delete-company-title" className="break-words text-lg font-semibold">Delete {company.name}?</h2>
        <p id="delete-company-description" className="text-sm leading-6 text-gray-600">This permanently removes {company._count.users} users, {company._count.assets} assets, {company._count.cards} projects, and all other company records, including invitations, feedback and AI conversations. This cannot be undone.</p>
        <p className="text-sm leading-6 text-gray-600">Audit history, backups and separately stored uploaded files are retained. Companies containing a platform administrator cannot be deleted.</p>
        <p className="break-words text-sm text-gray-800">To confirm, type <strong>{company.name}</strong> below.</p>
        <Field label="Company name to confirm"><input autoFocus autoComplete="off" className={control} value={confirmationName} onChange={event => setConfirmationName(event.target.value)} required disabled={mutation.isPending} /></Field>
        <Field label="Reason for deletion"><textarea className={control} name="reason" required maxLength={500} rows={2} disabled={mutation.isPending} /></Field>
        <ErrorMessage error={mutation.error} />
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={button} disabled={mutation.isPending} onClick={() => dialog.current?.close()}>Cancel</button>
          <button className="inline-flex min-h-11 items-center justify-center rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 disabled:opacity-50" disabled={confirmationName !== company.name || mutation.isPending}>{mutation.isPending ? 'Deleting company…' : 'Permanently delete company'}</button>
        </div>
      </form>
    </dialog>
  </section>
}
