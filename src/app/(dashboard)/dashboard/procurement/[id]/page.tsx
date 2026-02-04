'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProcurementItemRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  useEffect(() => {
    router.replace(`/dashboard/vendors/catalog/${id}`)
  }, [router, id])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  )
}
