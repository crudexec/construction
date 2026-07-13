'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  Briefcase,
  Building,
  Save,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useModal } from '@/components/ui/modal-provider'
import { ContactNotesSection } from '@/components/contacts/contact-notes-section'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  position: string | null
  companyName: string | null
  vendorId: string | null
  createdAt: string
  updatedAt: string
  vendor: {
    id: string
    companyName: string
  } | null
}

interface VendorOption {
  id: string
  companyName: string
}

async function fetchContact(contactId: string): Promise<Contact> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/contacts/${contactId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch contact')
  return response.json()
}

async function fetchVendors(): Promise<VendorOption[]> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/vendors', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch vendors')
  return response.json()
}

async function updateContact(contactId: string, data: Record<string, unknown>): Promise<Contact> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/contacts/${contactId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) throw new Error('Failed to update contact')
  return response.json()
}

async function deleteContact(contactId: string): Promise<void> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/contacts/${contactId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to delete contact')
}

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { showConfirm } = useModal()

  const contactId = params.id as string

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    companyName: '',
    vendorId: ''
  })

  const { data: contact, isLoading, error } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => fetchContact(contactId)
  })

  const { data: vendors = [] } = useQuery<VendorOption[]>({
    queryKey: ['vendors'],
    queryFn: fetchVendors,
    enabled: isEditing
  })

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateContact(contactId, data),
    onSuccess: () => {
      toast.success('Contact updated successfully')
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setIsEditing(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteContact(contactId),
    onSuccess: () => {
      toast.success('Contact deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      router.push('/dashboard/contacts')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleEdit = () => {
    if (contact) {
      setEditForm({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email || '',
        phone: contact.phone || '',
        position: contact.position || '',
        companyName: contact.companyName || '',
        vendorId: contact.vendorId || ''
      })
      setIsEditing(true)
    }
  }

  const handleSave = () => {
    updateMutation.mutate({
      ...editForm,
      vendorId: editForm.vendorId || null
    })
  }

  const handleDelete = async () => {
    const confirmed = await showConfirm(
      'Are you sure you want to delete this contact? This action cannot be undone.',
      'Delete Contact'
    )
    if (confirmed) {
      deleteMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !contact) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load contact</p>
        <Link
          href="/dashboard/contacts"
          className="text-primary-600 hover:text-primary-700 mt-4 inline-block"
        >
          Back to Contacts
        </Link>
      </div>
    )
  }

  const companyLabel = contact.vendor?.companyName || contact.companyName

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/contacts"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {contact.firstName} {contact.lastName}
            </h1>
            {companyLabel ? (
              <p className="text-sm text-gray-500 flex items-center mt-1">
                <Building className="h-3 w-3 mr-1" />
                {companyLabel}
              </p>
            ) : (
              <p className="text-sm text-gray-400 mt-1">No company</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEdit}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Contact Details */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Contact Information</h2>
        </div>
        <div className="p-6">
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={editForm.companyName}
                  onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Leave blank if not tied to a company"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link to Vendor <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  value={editForm.vendorId}
                  onChange={(e) => setEditForm({ ...editForm, vendorId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">None</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>{vendor.companyName}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-xl font-semibold text-primary-700">
                      {contact.firstName[0]}{contact.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {contact.firstName} {contact.lastName}
                    </h3>
                    {contact.position && (
                      <p className="text-sm text-gray-500 flex items-center">
                        <Briefcase className="h-4 w-4 mr-1" />
                        {contact.position}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {contact.email && (
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 text-gray-400 mr-3" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 text-gray-400 mr-3" />
                    <a
                      href={`tel:${contact.phone}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}
                {!contact.email && !contact.phone && (
                  <p className="text-sm text-gray-400">No contact information available</p>
                )}
                {contact.vendor && (
                  <Link
                    href={`/dashboard/vendors/${contact.vendor.id}`}
                    className="flex items-center text-sm text-primary-600 hover:text-primary-700"
                  >
                    <Building className="h-4 w-4 mr-3" />
                    {contact.vendor.companyName}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {!isEditing && (contact.email || contact.phone) && (
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-3">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contact Notes */}
      <ContactNotesSection contactId={contactId} />
    </div>
  )
}
