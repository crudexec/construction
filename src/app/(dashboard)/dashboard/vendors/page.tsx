'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Plus, Truck, Package, FileText } from 'lucide-react'
import Link from 'next/link'
import { VendorListTab } from '@/components/vendors/vendor-list-tab'
import { CatalogTab } from '@/components/vendors/catalog-tab'
import { PurchaseOrdersTab } from '@/components/vendors/purchase-orders-tab'

type TabType = 'vendors' | 'catalog' | 'purchase-orders'

function VendorsHubContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as TabType | null
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'vendors')

  // Fetch stats for quick dashboard
  const { data: stats } = useQuery({
    queryKey: ['vendor-hub-stats'],
    queryFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const [vendorsRes, itemsRes, posRes] = await Promise.all([
        fetch('/api/vendors', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/procurement/items', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/purchase-orders?limit=1', {
          credentials: 'include'
        })
      ])

      const vendors = await vendorsRes.json()
      const items = await itemsRes.json()
      const pos = await posRes.json()

      return {
        vendorCount: vendors?.length || 0,
        itemCount: items?.items?.length || 0,
        pendingPOCount: pos?.data?.filter((po: any) =>
          po.status === 'DRAFT' || po.status === 'PENDING_APPROVAL'
        ).length || 0
      }
    }
  })

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    router.push(`/dashboard/vendors?tab=${tab}`)
  }

  const tabs = [
    { id: 'vendors' as TabType, label: 'Vendors', icon: Truck },
    { id: 'catalog' as TabType, label: 'Catalog', icon: Package },
    { id: 'purchase-orders' as TabType, label: 'Purchase Orders', icon: FileText }
  ]

  const getQuickAction = () => {
    switch (activeTab) {
      case 'vendors':
        return (
          <Link
            href="/dashboard/vendors/new"
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Vendor</span>
          </Link>
        )
      case 'catalog':
        return (
          <Link
            href="/dashboard/vendors/catalog/new"
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Item</span>
          </Link>
        )
      case 'purchase-orders':
        return (
          <Link
            href="/dashboard/vendors/purchase-orders/new"
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create PO</span>
          </Link>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Truck className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendors & Procurement</h1>
            <p className="text-sm text-gray-600">Manage vendors, catalog items, and purchase orders</p>
          </div>
        </div>
        {getQuickAction()}
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Vendors</p>
                <p className="text-2xl font-bold text-gray-900">{stats.vendorCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Catalog Items</p>
                <p className="text-2xl font-bold text-gray-900">{stats.itemCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending POs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingPOCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors
                    ${
                      activeTab === tab.id
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'vendors' && <VendorListTab />}
          {activeTab === 'catalog' && <CatalogTab />}
          {activeTab === 'purchase-orders' && <PurchaseOrdersTab />}
        </div>
      </div>
    </div>
  )
}

export default function VendorsHubPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <VendorsHubContent />
    </Suspense>
  )
}
