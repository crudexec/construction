'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PurchaseOrderRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  useEffect(() => {
    router.replace(`/dashboard/vendors/purchase-orders/${id}`)
  }, [router, id])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  )
}
