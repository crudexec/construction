'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Trash2, Star } from 'lucide-react'

interface VendorContact {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  position?: string
  isPrimary: boolean
  isBilling: boolean
}

interface EditContactModalProps {
  vendorId: string
  contact: VendorContact | null
  isOpen: boolean
  onClose: () => void
}

interface ContactData {
  firstName: string
  lastName: string
  email: string
  phone: string
  position: string
  isPrimary: boolean
  isBilling: boolean
}

async function updateContact(contactId: string, data: ContactData) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendors/contacts/${contactId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update contact')
  }
  return response.json()
}

async function deleteContact(contactId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendors/contacts/${contactId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete contact')
  }
  return response.json()
}

export default function EditContactModal({ vendorId, contact, isOpen, onClose }: EditContactModalProps) {
  const queryClient = useQueryClient()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [formData, setFormData] = useState<ContactData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    isPrimary: false,
    isBilling: false
  })

  useEffect(() => {
    if (contact) {
      setFormData({
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        email: contact.email || '',
        phone: contact.phone || '',
        position: contact.position || '',
        isPrimary: contact.isPrimary || false,
        isBilling: contact.isBilling || false
      })
    }
    setShowDeleteConfirm(false)
  }, [contact])

  const updateContactMutation = useMutation({
    mutationFn: (data: ContactData) => updateContact(contact!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] })
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      onClose()
    }
  })

  const deleteContactMutation = useMutation({
    mutationFn: () => deleteContact(contact!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] })
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      onClose()
    }
  })

  const handleInputChange = (field: keyof ContactData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.firstName.trim() && !formData.lastName.trim()) {
      alert('Please provide at least a first or last name')
      return
    }

    updateContactMutation.mutate(formData)
  }

  const handleDelete = () => {
    deleteContactMutation.mutate()
  }

  if (!isOpen || !contact) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Edit Contact</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="contact@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Job title or position"
              />
            </div>

            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isPrimary}
                  onChange={(e) => handleInputChange('isPrimary', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">Primary Contact</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isBilling}
                  onChange={(e) => handleInputChange('isBilling', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">Billing Contact</span>
              </label>
            </div>

            {formData.isPrimary && !contact.isPrimary && (
              <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                Setting this contact as primary will remove the primary designation from the current primary contact.
              </p>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-800 mb-3">
                  Are you sure you want to delete this contact? This action cannot be undone.
                </p>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteContactMutation.isPending}
                    className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteContactMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="bg-white text-gray-700 px-3 py-1.5 rounded text-sm border hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
                {deleteContactMutation.isError && (
                  <p className="text-sm text-red-600 mt-2">
                    {(deleteContactMutation.error as Error).message}
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center text-sm text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Contact
              </button>
            )}

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="bg-white text-gray-700 px-4 py-2 rounded-md border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateContactMutation.isPending}
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateContactMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {updateContactMutation.isError && (
              <p className="text-sm text-red-600">
                {(updateContactMutation.error as Error).message}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
