'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { Sidebar, SidebarProvider, useSidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar()

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <div
        className={`transition-all duration-200 ${
          isCollapsed ? 'pl-12' : 'pl-48'
        }`}
      >
        <Header />
        <main className="py-3 px-3 sm:px-4 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  )
}

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
    <SidebarProvider>
      <DashboardContent>
        {children}
      </DashboardContent>
    </SidebarProvider>
  )
}