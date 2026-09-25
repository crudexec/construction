'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { vendorRequest, type VendorOption } from './vendor-contacts'

export function SupplierCompanyDialog({ vendorId, contractId, supplier, onClose, onSaved }: {
  vendorId: string; contractId?: string; supplier?: { id: string; name: string; phone?: string | null; notes?: string | null }
  onClose: () => void; onSaved: () => void
}) {
  const cache = useQueryClient()
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [selected, setSelected] = useState(''), [name, setName] = useState(supplier?.name ?? '')
  const [phone, setPhone] = useState(supplier?.phone ?? ''), [notes, setNotes] = useState(supplier?.notes ?? '')
  const [confirmDuplicate, setConfirmDuplicate] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const options = useQuery<VendorOption[]>({ queryKey: ['vendor-options'], queryFn: () => vendorRequest('/api/vendors/options') })
  const matches = name.trim() ? options.data?.filter(v => v.companyName.toLowerCase().includes(name.trim().toLowerCase()) || name.trim().toLowerCase().includes(v.companyName.toLowerCase())) ?? [] : []
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      await vendorRequest(`/api/vendors/${vendorId}/suppliers`, { linkedVendorId: mode === 'existing' ? selected : null, name, phone, notes, confirmDuplicate, supplierId: supplier?.id, contractId })
      await Promise.all([cache.invalidateQueries({ queryKey: ['vendor'] }), cache.invalidateQueries({ queryKey: ['vendors'] }), cache.invalidateQueries({ queryKey: ['vendor-options'] }), cache.invalidateQueries({ queryKey: ['vendor-suppliers'] }), cache.invalidateQueries({ queryKey: ['contract'] })])
      onSaved(); onClose()
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to link supplier') } finally { setBusy(false) }
  }
  return <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"><form onSubmit={save} role="dialog" aria-modal="true" aria-label="Supplier vendor company" className="bg-white rounded-lg p-5 max-w-lg w-full max-h-[90vh] overflow-auto space-y-4">
    <div className="flex justify-between"><h3 className="font-semibold">{supplier ? `Link ${supplier.name} to a vendor` : 'Add Supplier / Subtier'}</h3><button type="button" disabled={busy} onClick={onClose}>Close</button></div>
    <p className="text-sm text-gray-500">Links a vendor company record. No portal access, passwords or invitations are created.</p>
    <label className="block">Company choice<select className="block w-full border p-2 rounded" value={mode} onChange={e => { setMode(e.target.value as 'existing' | 'new'); setError('') }}><option value="existing">Select existing vendor</option><option value="new">Create new vendor company</option></select></label>
    {options.isError && <p role="alert">Could not load vendors. <button type="button" onClick={() => options.refetch()}>Retry</button></p>}
    {mode === 'existing' ? <label className="block">Vendor company<select required value={selected} onChange={e => setSelected(e.target.value)} className="block w-full border p-2 rounded"><option value="">Choose a vendor</option>{options.data?.filter(v => v.id !== vendorId).map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}</select></label> : <>
      <label className="block">Company name<input required className="block w-full border p-2 rounded" value={name} onChange={e => { setName(e.target.value); setConfirmDuplicate(false) }} /></label>
      {!!matches.length && <div className="p-3 bg-amber-50 text-sm"><p>Possible existing companies:</p>{matches.map(v => <button type="button" key={v.id} disabled={v.id === vendorId} onClick={() => { setSelected(v.id); setMode('existing') }} className="block underline py-1">{v.companyName}{v.id === vendorId ? ' (current company)' : ''}</button>)}<label><input type="checkbox" checked={confirmDuplicate} onChange={e => setConfirmDuplicate(e.target.checked)} /> This is a different company; create a separate record.</label></div>}
      <label className="block">Phone<input className="block w-full border p-2 rounded" value={phone} onChange={e => setPhone(e.target.value)} /></label>
    </>}
    {!supplier && <label className="block">Supplier notes<textarea className="block w-full border p-2 rounded" value={notes} onChange={e => setNotes(e.target.value)} /></label>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <button disabled={busy || options.isPending || options.isError} className="px-4 py-2 rounded bg-primary-600 text-white disabled:opacity-50">{busy ? 'Saving…' : supplier ? 'Link Vendor Company' : 'Add Supplier'}</button>
  </form></div>
}
