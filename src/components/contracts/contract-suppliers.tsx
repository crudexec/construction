'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Phone, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface VendorSupplierOption {
  id: string
  name: string
  phone?: string | null
  notes?: string | null
}

interface ContractSupplierLink {
  id: string
  supplier: VendorSupplierOption
}

interface ContractSuppliersProps {
  contractId: string
  vendorId: string
  suppliers: ContractSupplierLink[]
  onRefresh: () => void
}

function getToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
}

async function fetchVendorSuppliers(vendorId: string): Promise<VendorSupplierOption[]> {
  const token = getToken()
  const response = await fetch(`/api/vendors/${vendorId}/suppliers`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!response.ok) throw new Error('Failed to fetch vendor suppliers')
  return response.json()
}

async function linkSupplier(contractId: string, vendorSupplierId: string) {
  const token = getToken()
  const response = await fetch(`/api/contracts/${contractId}/suppliers`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ vendorSupplierId })
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to link supplier')
  return result
}

async function unlinkSupplier(contractId: string, supplierId: string) {
  const token = getToken()
  const response = await fetch(`/api/contracts/${contractId}/suppliers?supplierId=${supplierId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!response.ok) {
    const result = await response.json()
    throw new Error(result.error || 'Failed to remove supplier')
  }
  return response.json()
}

async function createAndLinkSupplier(vendorId: string, contractId: string, data: { name: string; phone: string }) {
  const token = getToken()
  const createResponse = await fetch(`/api/vendors/${vendorId}/suppliers`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  const created = await createResponse.json()
  if (!createResponse.ok) throw new Error(created.error || 'Failed to create supplier')

  return linkSupplier(contractId, created.id)
}

export function ContractSuppliers({ contractId, vendorId, suppliers, onRefresh }: ContractSuppliersProps) {
  const queryClient = useQueryClient()
  const [isPicking, setIsPicking] = useState(false)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newSupplier, setNewSupplier] = useState({ name: '', phone: '' })

  const { data: vendorSuppliers = [] } = useQuery<VendorSupplierOption[]>({
    queryKey: ['vendor-suppliers', vendorId],
    queryFn: () => fetchVendorSuppliers(vendorId),
    enabled: isPicking
  })

  const linkedIds = new Set(suppliers.map(link => link.supplier.id))
  const availableToLink = vendorSuppliers.filter(s => !linkedIds.has(s.id))

  const refreshAll = () => {
    onRefresh()
    queryClient.invalidateQueries({ queryKey: ['contract', contractId] })
  }

  const linkMutation = useMutation({
    mutationFn: (vendorSupplierId: string) => linkSupplier(contractId, vendorSupplierId),
    onSuccess: () => {
      toast.success('Supplier linked')
      refreshAll()
      setIsPicking(false)
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const unlinkMutation = useMutation({
    mutationFn: (supplierId: string) => unlinkSupplier(contractId, supplierId),
    onSuccess: () => {
      toast.success('Supplier removed')
      refreshAll()
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; phone: string }) => createAndLinkSupplier(vendorId, contractId, data),
    onSuccess: () => {
      toast.success('Supplier added')
      refreshAll()
      queryClient.invalidateQueries({ queryKey: ['vendor-suppliers', vendorId] })
      setNewSupplier({ name: '', phone: '' })
      setIsAddingNew(false)
      setIsPicking(false)
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSupplier.name.trim()) {
      toast.error('Supplier name is required')
      return
    }
    createMutation.mutate({ name: newSupplier.name.trim(), phone: newSupplier.phone.trim() })
  }

  return (
    <div className="bg-white rounded border overflow-hidden">
      <div className="px-3 py-1.5 border-b bg-gray-50 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-gray-500" />
          Subtiers / Suppliers
        </h3>
        <button
          type="button"
          onClick={() => setIsPicking(true)}
          className="inline-flex items-center gap-0.5 text-[10px] text-primary-600 hover:text-primary-800"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {suppliers.length === 0 ? (
        <div className="px-3 py-3 text-center text-[10px] text-gray-500">No suppliers linked to this contract</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {suppliers.map(link => (
            <li key={link.id} className="px-3 py-1.5 flex items-center justify-between text-xs">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{link.supplier.name}</p>
                {link.supplier.phone && (
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Phone className="h-2.5 w-2.5" />
                    {link.supplier.phone}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => unlinkMutation.mutate(link.supplier.id)}
                disabled={unlinkMutation.isPending}
                className="p-0.5 text-gray-400 hover:text-red-600"
                title="Remove from this contract"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {isPicking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Link a Supplier</h3>
              <button onClick={() => { setIsPicking(false); setIsAddingNew(false) }} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {!isAddingNew ? (
                <>
                  {availableToLink.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">
                      {vendorSuppliers.length === 0 ? "This vendor has no suppliers yet." : 'All of this vendor\'s suppliers are already linked.'}
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {availableToLink.map(supplier => (
                        <button
                          key={supplier.id}
                          type="button"
                          onClick={() => linkMutation.mutate(supplier.id)}
                          disabled={linkMutation.isPending}
                          className="w-full text-left border border-gray-200 rounded p-2 hover:bg-gray-50 text-xs disabled:opacity-50"
                        >
                          <p className="font-medium text-gray-900">{supplier.name}</p>
                          {supplier.phone && <p className="text-[10px] text-gray-500">{supplier.phone}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(true)}
                    className="mt-3 w-full text-xs text-primary-600 hover:text-primary-800 flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    New supplier
                  </button>
                </>
              ) : (
                <form onSubmit={handleCreateSubmit} className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={newSupplier.phone}
                      onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setIsAddingNew(false)} className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800">Back</button>
                    <button type="submit" disabled={createMutation.isPending} className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50">
                      {createMutation.isPending ? 'Adding...' : 'Add & Link'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
