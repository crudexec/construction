'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Building2,
  LayoutDashboard,
  Users,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Activity,
  Truck,
  Package,
  Warehouse,
  HelpCircle,
  Home
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAuthStore } from '@/store/auth'

// Create sidebar context
const SidebarContext = createContext<{
  isCollapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}>({
  isCollapsed: false,
  setCollapsed: () => {}
})

export const useSidebar = () => useContext(SidebarContext)

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Leads', href: '/dashboard/leads', icon: Users },
  { name: 'Projects', href: '/dashboard/projects', icon: FolderOpen },
  { name: 'Properties', href: '/dashboard/properties', icon: Home },
  { name: 'Vendors & Procurement', href: '/dashboard/vendors', icon: Truck },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Warehouse },
  { name: 'Assets', href: '/dashboard/assets', icon: Package },
  { name: 'Activity', href: '/dashboard/activity', icon: Activity },
  { name: 'Help', href: '/dashboard/help', icon: HelpCircle },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

// Provider component
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()

  // Check if we're on mobile and auto-collapse
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 // md breakpoint
      setIsMobile(mobile)
      if (mobile) {
        setCollapsed(true)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-collapse when viewing project detail pages
  useEffect(() => {
    const isProjectDetailPage = pathname?.match(/^\/dashboard\/projects\/[^/]+$/)
    if (isProjectDetailPage) {
      setCollapsed(true)
    }
  }, [pathname])

  const isCollapsed = collapsed || isMobile

  return (
    <SidebarContext.Provider value={{ isCollapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { isCollapsed, setCollapsed } = useSidebar()
  const [isMobile, setIsMobile] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 // md breakpoint
      setIsMobile(mobile)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-gray-900 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-white" />
            <span className="text-xl font-bold text-white">
              {user?.company?.appName || 'BuildFlo'}
            </span>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-white"
          >
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors relative",
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon
                className={cn(
                  "flex-shrink-0 h-5 w-5",
                  isCollapsed ? "mr-0" : "mr-3"
                )}
              />
              {!isCollapsed && item.name}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-700 p-4">
        {!isCollapsed && user && (
          <div className="mb-3">
            <p className="text-sm font-medium text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center text-sm font-medium text-gray-300 hover:text-white transition-colors group relative",
            isCollapsed ? "justify-center" : "justify-start"
          )}
          title={isCollapsed ? "Sign out" : undefined}
        >
          <LogOut className={cn("h-5 w-5", isCollapsed ? "mr-0" : "mr-3")} />
          {!isCollapsed && "Sign out"}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              Sign out
            </div>
          )}
        </button>
      </div>
    </div>
  )
}