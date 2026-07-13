'use client'

import { Suspense, useState } from 'react'
import { Plus, Contact as ContactIcon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { ContactListTab } from '@/components/contacts/contact-list-tab'
import { AddContactModal } from '@/components/contacts/add-contact-modal'

function ContactsContent() {
  const [showAddModal, setShowAddModal] = useState(false)
  const queryClient = useQueryClient()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <ContactIcon className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
            <p className="text-sm text-gray-600">Manage people you work with, with or without a company</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Contact</span>
        </button>
      </div>

      {/* Contact List */}
      <div className="bg-white rounded-lg shadow border p-6">
        <ContactListTab />
      </div>

      {showAddModal && (
        <AddContactModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            queryClient.invalidateQueries({ queryKey: ['contacts'] })
          }}
        />
      )}
    </div>
  )
}

export default function ContactsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <ContactsContent />
    </Suspense>
  )
}
