'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { initializeAuth } = useAuthStore()

  useEffect(() => {
    // Initialize auth from cookies on mount
    initializeAuth()
  }, [initializeAuth])

  // The middleware handles authentication, so we don't need to check here
  // This prevents client-side redirects that cause flashing

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="pl-16 lg:pl-64">
        <Header />
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}