'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Clock, AlertTriangle, Calendar, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  metadata?: string
}

async function fetchNotifications(unreadOnly = false) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/notifications?unread=${unreadOnly}&limit=20`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch notifications')
  return response.json()
}

async function markNotificationsAsRead(notificationIds?: string[]) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/notifications', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify({
      action: 'markAsRead',
      notificationIds
    })
  })

  if (!response.ok) throw new Error('Failed to mark notifications as read')
  return response.json()
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const queryClient = useQueryClient()

  // Fetch unread count and recent notifications
  const { data: notificationData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications(false),
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleMarkAllAsRead = () => {
    markAsReadMutation.mutate(undefined)
  }

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      markAsReadMutation.mutate([notification.id])
    }

    // Navigate to task if metadata contains task info
    try {
      const metadata = JSON.parse(notification.metadata || '{}')
      if (metadata.taskId && metadata.projectId) {
        setIsOpen(false)
        router.push(`/dashboard/projects/${metadata.projectId}?tab=tasks`)
      }
    } catch (error) {
      console.error('Error parsing notification metadata:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_due_soon':
        return <Clock className="h-3 w-3 text-yellow-500" />
      case 'task_due_today':
        return <Calendar className="h-3 w-3 text-orange-500" />
      case 'task_overdue':
        return <AlertTriangle className="h-3 w-3 text-red-500" />
      default:
        return <Bell className="h-3 w-3 text-blue-500" />
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
    }
  }

  const notifications = notificationData?.notifications || []
  const unreadCount = notificationData?.unreadCount || 0

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-80 bg-white rounded border border-gray-200 shadow-lg z-50 max-h-80 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
            <h3 className="text-xs font-semibold text-gray-700">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <Bell className="h-5 w-5 text-gray-300 mx-auto mb-1" />
                <p className="text-[10px] text-gray-400">No notifications</p>
              </div>
            ) : (
              notifications.map((notification: Notification, idx: number) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-3 py-2 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.isRead ? 'bg-blue-50/50' : ''
                  } ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-tight ${!notification.isRead ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {getTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="flex-shrink-0">
                        <div className="h-1.5 w-1.5 bg-blue-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-3 py-1.5 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setIsOpen(false)
                  router.push('/dashboard/notifications')
                }}
                className="text-[10px] text-gray-500 hover:text-gray-700 flex items-center"
              >
                View all
                <ExternalLink className="h-2.5 w-2.5 ml-1" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
