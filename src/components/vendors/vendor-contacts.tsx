'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ContactCommentsSection } from './contact-comments-section'

interface Contact {
  id: string; vendorId: string; firstName: string; lastName: string; email: string | null; phone: string | null
  position: string | null; notes: string | null; isPrimary: boolean; isBilling: boolean; updatedAt: string
}
export async function vendorRequest(url: string, data?: unknown, method = 'POST') {
  const response = await fetch(url, { credentials: 'include', ...(data !== undefined ? { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Request failed')
  return result
}
export interface VendorOption { id: string; companyName: string; name: string }

const empty = { firstName: '', lastName: '', email: '', phone: '', position: '', notes: '', isPrimary: false, isBilling: false }
export function VendorContacts({ vendorId }: { vendorId: string }) {
  const cache = useQueryClient()
  const [selected, setSelected] = useState<Contact | null>(null)
  const [mode, setMode] = useState<'view' | 'edit' | 'create' | 'move' | null>(null)
  const [form, setForm] = useState(empty)
  const [destination, setDestination] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const contacts = useQuery<Contact[]>({ queryKey: ['vendor-contacts', vendorId], queryFn: () => vendorRequest(`/api/vendors/${vendorId}/contacts`) })
  const options = useQuery<VendorOption[]>({ queryKey: ['vendor-options'], queryFn: () => vendorRequest('/api/vendors/options'), enabled: mode === 'move' })
  const open = (contact: Contact | null, next: typeof mode) => {
    setSelected(contact); setMode(next); setError(''); setDestination('')
    setForm(contact ? { firstName: contact.firstName, lastName: contact.lastName, email: contact.email ?? '', phone: contact.phone ?? '', position: contact.position ?? '', notes: contact.notes ?? '', isPrimary: contact.isPrimary, isBilling: contact.isBilling } : empty)
  }
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const moved = mode === 'move'
      const data = moved ? { destinationVendorId: destination, updatedAt: selected?.updatedAt } : { ...form, updatedAt: selected?.updatedAt }
      const saved = await vendorRequest(`/api/vendors/${vendorId}/contacts${selected ? `/${selected.id}` : ''}`, data, selected ? 'PUT' : 'POST')
      await Promise.all([cache.invalidateQueries({ queryKey: ['vendor'] }), cache.invalidateQueries({ queryKey: ['vendor-contacts'] }), cache.invalidateQueries({ queryKey: ['contact'] })])
      if (moved) { setMode(null); setSelected(null) } else { setSelected(saved); setMode('view') }
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save') } finally { setBusy(false) }
  }
  return <section className="bg-white border rounded p-4" aria-label="Company contacts">
    <div className="flex justify-between items-center"><h2 className="font-semibold">Contacts</h2><button onClick={() => open(null, 'create')} className="text-primary-700">Add Contact</button></div>
    <p className="text-xs text-gray-500 my-2">Contact records do not create logins or send invitations.</p>
    {contacts.isPending ? <p>Loading contacts…</p> : contacts.isError ? <p role="alert">Could not load contacts. <button onClick={() => contacts.refetch()}>Retry</button></p> : !contacts.data?.length ? <p>No contacts yet.</p> : <ul className="divide-y">
      {contacts.data.map(contact => <li key={contact.id} className="py-3 flex flex-wrap justify-between gap-2">
        <div><button className="font-medium text-primary-700 hover:underline" onClick={() => open(contact, 'view')}>{contact.firstName} {contact.lastName}</button>
          {contact.isPrimary && <span className="ml-2 text-xs">Primary</span>}<p className="text-sm text-gray-500">{[contact.position, contact.email, contact.phone].filter(Boolean).join(' · ')}</p></div>
        <div className="flex gap-3 text-sm"><button onClick={() => open(contact, 'edit')}>Edit</button><button onClick={() => open(contact, 'move')}>Move</button></div>
      </li>)}
    </ul>}
    {mode && <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-label={mode === 'create' ? 'Add Contact' : mode === 'move' ? 'Move Contact' : mode === 'edit' ? 'Edit Contact' : 'Contact Details'} className="bg-white rounded-lg p-5 max-w-xl w-full max-h-[90vh] overflow-auto">
      <div className="flex justify-between mb-4"><h3 className="font-semibold">{mode === 'create' ? 'Add Contact' : selected ? `${selected.firstName} ${selected.lastName}` : 'Contact'}</h3><button aria-label="Close contact" disabled={busy} onClick={() => setMode(null)}>Close</button></div>
      {mode === 'view' && selected ? <div className="space-y-3">
        <dl>{(['position', 'email', 'phone', 'notes'] as const).map(key => <div key={key} className="mb-2"><dt className="capitalize text-xs text-gray-500">{key}</dt><dd className="whitespace-pre-wrap break-words">{selected[key] || 'Not provided'}</dd></div>)}</dl>
        <div className="flex gap-4"><button onClick={() => open(selected, 'edit')}>Edit Contact</button><button onClick={() => open(selected, 'move')}>Move Contact</button><Link href={`/dashboard/vendors/${vendorId}/contacts/${selected.id}`}>Full contact page</Link></div>
        <ContactCommentsSection vendorId={vendorId} contactId={selected.id} />
      </div> : <form onSubmit={save} className="space-y-3">
        {mode === 'move' ? <>
          <label className="block">Destination company<select required value={destination} onChange={e => setDestination(e.target.value)} className="block w-full border p-2 rounded"><option value="">Select company</option>{options.data?.filter(v => v.id !== vendorId).map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}</select></label>
          {options.isError && <p role="alert">Could not load companies. <button type="button" onClick={() => options.refetch()}>Retry</button></p>}
          <p className="text-sm">Confirm moving this person to the selected company. Their notes and identity stay intact. Existing project and contract records are not reassigned. Primary/billing designations will be cleared; the destination's existing primary remains unchanged.</p>
        </> : <>
          {(['firstName', 'lastName', 'email', 'phone', 'position', 'notes'] as const).map(key => <label className="block text-sm" key={key}>{({ firstName: 'First name', lastName: 'Last name', email: 'Email', phone: 'Phone', position: 'Title / position', notes: 'Notes' })[key]}
            {key === 'notes' ? <textarea className="block w-full border p-2 rounded" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /> : <input className="block w-full border p-2 rounded" type={key === 'email' ? 'email' : 'text'} required={key === 'firstName' || key === 'lastName'} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />}
          </label>)}
          <label className="block"><input type="checkbox" checked={form.isPrimary} onChange={e => setForm({ ...form, isPrimary: e.target.checked })} /> Primary contact</label>
          <label className="block"><input type="checkbox" checked={form.isBilling} onChange={e => setForm({ ...form, isBilling: e.target.checked })} /> Billing contact</label>
        </>}
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <button disabled={busy || (mode === 'move' && !destination)} className="bg-primary-600 text-white rounded px-4 py-2">{busy ? 'Saving…' : mode === 'move' ? 'Confirm Move' : 'Save Contact'}</button>
      </form>}
    </div></div>}
  </section>
}
