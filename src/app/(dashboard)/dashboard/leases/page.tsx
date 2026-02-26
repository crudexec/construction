'use client'

import { Suspense } from 'react'
import { FileText } from 'lucide-react'
import { LeaseList } from '@/components/leases/lease-list'

function LeasesContent() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <FileText className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leases</h1>
            <p className="text-sm text-gray-600">Manage tenant leases and agreements</p>
          </div>
        </div>
      </div>

      {/* Lease List */}
      <LeaseList />
    </div>
  )
}

export default function LeasesPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <LeasesContent />
    </Suspense>
  )
}
