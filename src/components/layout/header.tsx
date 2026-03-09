'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown, User, Settings, LogOut, Users } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { NotificationBell } from './notification-bell'

export function Header() {
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = () => {
    logout()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex h-10 items-center justify-between px-3 sm:px-4 lg:px-6">
        <div className="flex flex-1 items-center">
          <div className="relative w-full max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
              <Search className="h-3.5 w-3.5 text-gray-400" />
            </div>
            <input
              type="search"
              placeholder="Search..."
              className="block w-full rounded border border-gray-200 bg-gray-50 py-1 pl-7 pr-2 text-xs placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="ml-3 flex items-center gap-2">
          <NotificationBell />

          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 focus:outline-none rounded p-0.5 hover:bg-gray-100 transition-colors"
            >
              <div className="h-6 w-6 rounded bg-slate-700 flex items-center justify-center text-white text-[10px] font-semibold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded border border-gray-200 shadow-lg py-1 z-50">
                {/* User Info */}
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate" title={user?.email}>
                    {user?.email}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{user?.role?.toLowerCase()}</p>
                </div>

                {/* Activity Link */}
                <button
                  onClick={() => {
                    setShowDropdown(false)
                    router.push('/dashboard/activity')
                  }}
                  className="flex items-center w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <User className="h-3 w-3 mr-2 text-gray-400" />
                  My Activity
                </button>

                {/* Team Link */}
                <button
                  onClick={() => {
                    setShowDropdown(false)
                    router.push('/dashboard/settings?tab=team')
                  }}
                  className="flex items-center w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <Users className="h-3 w-3 mr-2 text-gray-400" />
                  Team
                </button>

                {/* Settings Link */}
                <button
                  onClick={() => {
                    setShowDropdown(false)
                    router.push('/dashboard/settings')
                  }}
                  className="flex items-center w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="h-3 w-3 mr-2 text-gray-400" />
                  Settings
                </button>

                <div className="border-t border-gray-100 my-0.5"></div>

                {/* Sign Out */}
                <button
                  onClick={() => {
                    setShowDropdown(false)
                    handleSignOut()
                  }}
                  className="flex items-center w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-3 w-3 mr-2" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
