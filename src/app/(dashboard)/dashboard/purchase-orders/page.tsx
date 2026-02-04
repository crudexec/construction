'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PurchaseOrdersRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/vendors?tab=purchase-orders')
  }, [router])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  )
}
