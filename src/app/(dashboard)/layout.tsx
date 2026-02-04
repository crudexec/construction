'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { Sidebar, SidebarProvider, useSidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar()

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div 
        className={`transition-all duration-300 ${
          isCollapsed ? 'pl-16' : 'pl-64'
        }`}
      >
        <Header />
        <main className="py-6 px-4 sm:px-6 lg:px-8">
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