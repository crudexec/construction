'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProcurementRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/vendors?tab=catalog')
  }, [router])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  )
}
