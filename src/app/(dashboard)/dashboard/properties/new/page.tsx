'use client'

import { Suspense } from 'react'
import { ArrowLeft, Building2 } from 'lucide-react'
import Link from 'next/link'
import { PropertyForm } from '@/components/properties/property-form'

function NewPropertyContent() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard/properties"
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex items-center space-x-3">
          <Building2 className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Property</h1>
            <p className="text-sm text-gray-600">Create a new property in your portfolio</p>
          </div>
        </div>
      </div>

      {/* Property Form */}
      <div className="bg-white rounded-lg shadow border p-6">
        <PropertyForm />
      </div>
    </div>
  )
}

export default function NewPropertyPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <NewPropertyContent />
    </Suspense>
  )
}
