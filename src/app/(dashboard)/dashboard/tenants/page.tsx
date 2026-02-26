'use client'

import { Suspense } from 'react'
import { Plus, Users } from 'lucide-react'
import { TenantList } from '@/components/tenants/tenant-list'

function TenantsContent() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
            <p className="text-sm text-gray-600">Manage your tenant database</p>
          </div>
        </div>
      </div>

      {/* Tenant List */}
      <TenantList />
    </div>
  )
}

export default function TenantsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <TenantsContent />
    </Suspense>
  )
}
