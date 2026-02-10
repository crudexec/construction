'use client'

import { Suspense } from 'react'
import { Plus, Truck } from 'lucide-react'
import Link from 'next/link'
import { VendorListTab } from '@/components/vendors/vendor-list-tab'

function VendorsContent() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Truck className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
            <p className="text-sm text-gray-600">Manage your vendors and subcontractors</p>
          </div>
        </div>
        <Link
          href="/dashboard/vendors/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Vendor</span>
        </Link>
      </div>

      {/* Vendor List */}
      <div className="bg-white rounded-lg shadow border p-6">
        <VendorListTab />
      </div>
    </div>
  )
}

export default function VendorsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <VendorsContent />
    </Suspense>
  )
}
