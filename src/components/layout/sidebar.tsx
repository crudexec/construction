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
  FileText
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
  { name: 'Vendors', href: '/dashboard/vendors', icon: Truck },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Warehouse },
  { name: 'Assets', href: '/dashboard/assets', icon: Package },
  { name: 'Activity', href: '/dashboard/activity', icon: Activity },
  { name: 'Help', href: '/dashboard/help', icon: HelpCircle },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

const adminNavigation = [
  { name: 'Doc Templates', href: '/dashboard/admin/document-templates', icon: FileText },
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
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-800 border-r border-slate-700 transition-all duration-200",
        isCollapsed ? "w-12" : "w-48"
      )}
    >
      {/* Compact Header */}
      <div className={cn(
        "flex items-center justify-between h-10 border-b border-slate-700",
        isCollapsed ? "px-2" : "px-3"
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-1.5 min-w-0">
            <Building2 className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-white truncate">
              {user?.company?.appName || 'BuildFlo'}
            </span>
          </div>
        )}
        {isCollapsed && (
          <Building2 className="h-4 w-4 text-amber-400 mx-auto" />
        )}
        {!isMobile && !isCollapsed && (
          <button
            onClick={() => setCollapsed(!isCollapsed)}
            className="p-0.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {!isMobile && isCollapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center h-6 border-b border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-1 overflow-y-auto">
        {navigation.map((item, idx) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center px-2 py-1.5 text-xs transition-colors relative",
                isCollapsed ? "justify-center" : "mx-1",
                isActive
                  ? "bg-slate-700 text-white font-medium"
                  : "text-slate-300 hover:bg-slate-700/50 hover:text-white",
                !isCollapsed && "rounded"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon
                className={cn(
                  "flex-shrink-0 h-3.5 w-3.5",
                  isCollapsed ? "" : "mr-2",
                  isActive ? "text-amber-400" : "text-slate-400 group-hover:text-slate-300"
                )}
              />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-1 px-1.5 py-0.5 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-slate-700">
                  {item.name}
                </div>
              )}
            </Link>
          )
        })}

        {/* Admin Navigation */}
        {user?.role === 'ADMIN' && (
          <>
            {!isCollapsed && (
              <div className="mt-2 mb-1 mx-2 pt-2 border-t border-slate-700">
                <span className="px-1 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                  Admin
                </span>
              </div>
            )}
            {isCollapsed && (
              <div className="my-1 mx-2 border-t border-slate-700" />
            )}
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-2 py-1.5 text-xs transition-colors relative",
                    isCollapsed ? "justify-center" : "mx-1",
                    isActive
                      ? "bg-slate-700 text-white font-medium"
                      : "text-slate-300 hover:bg-slate-700/50 hover:text-white",
                    !isCollapsed && "rounded"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon
                    className={cn(
                      "flex-shrink-0 h-3.5 w-3.5",
                      isCollapsed ? "" : "mr-2",
                      isActive ? "text-amber-400" : "text-slate-400 group-hover:text-slate-300"
                    )}
                  />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                  {isCollapsed && (
                    <div className="absolute left-full ml-1 px-1.5 py-0.5 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-slate-700">
                      {item.name}
                    </div>
                  )}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User & Logout - Compact */}
      <div className="border-t border-slate-700 p-1.5">
        {!isCollapsed && user && (
          <div className="px-1.5 py-1 mb-1 bg-slate-700/50 rounded">
            <p className="text-[10px] font-medium text-white truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center text-xs text-slate-300 hover:text-white hover:bg-slate-700/50 rounded transition-colors group relative",
            isCollapsed ? "justify-center p-1.5" : "px-2 py-1.5"
          )}
          title={isCollapsed ? "Sign out" : undefined}
        >
          <LogOut className={cn("h-3.5 w-3.5 text-slate-400 group-hover:text-slate-300", isCollapsed ? "" : "mr-2")} />
          {!isCollapsed && "Sign out"}
          {isCollapsed && (
            <div className="absolute left-full ml-1 px-1.5 py-0.5 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-slate-700">
              Sign out
            </div>
          )}
        </button>
      </div>
    </div>
  )
}
