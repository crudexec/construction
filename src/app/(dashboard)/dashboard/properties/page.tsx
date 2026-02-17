'use client'

import { Suspense } from 'react'
import { Plus, Building2 } from 'lucide-react'
import Link from 'next/link'
import { PropertyList } from '@/components/properties/property-list'

function PropertiesContent() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Building2 className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
            <p className="text-sm text-gray-600">Manage your property portfolio</p>
          </div>
        </div>
        <Link
          href="/dashboard/properties/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Property</span>
        </Link>
      </div>

      {/* Property List */}
      <PropertyList />
    </div>
  )
}

export default function PropertiesPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <PropertiesContent />
    </Suspense>
  )
}
