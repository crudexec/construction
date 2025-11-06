'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  User,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { CompactFilters } from '@/components/ui/compact-filters'

interface ProjectCalendarProps {
  projectId: string
}

interface Task {
  id: string
  title: string
  description?: string
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  completedAt?: string
  assignee?: {
    id: string
    firstName: string
    lastName: string
  }
  creator: {
    id: string
    firstName: string
    lastName: string
  }
  createdAt: string
}

async function fetchProjectTasks(projectId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/project/${projectId}/tasks`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch tasks')
  return response.json()
}

export function ProjectCalendar({ projectId }: ProjectCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedPriority, setSelectedPriority] = useState('all')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: () => fetchProjectTasks(projectId),
    enabled: !!projectId
  })

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const firstDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  // Filter tasks with due dates
  const tasksWithDueDates = useMemo(() => {
    return tasks.filter((task: Task) => {
      if (!task.dueDate) return false
      
      const matchesStatus = selectedStatus === 'all' || task.status === selectedStatus
      const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority
      
      return matchesStatus && matchesPriority
    })
  }, [tasks, selectedStatus, selectedPriority])

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: { [key: string]: Task[] } = {}
    
    tasksWithDueDates.forEach((task: Task) => {
      if (task.dueDate) {
        const date = new Date(task.dueDate).toDateString()
        if (!grouped[date]) {
          grouped[date] = []
        }
        grouped[date].push(task)
      }
    })
    
    return grouped
  }, [tasksWithDueDates])

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getTasksForDate = (date: number) => {
    const dateString = new Date(year, month, date).toDateString()
    return tasksByDate[dateString] || []
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500'
      case 'HIGH': return 'bg-orange-500'
      case 'MEDIUM': return 'bg-blue-500'
      case 'LOW': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'IN_PROGRESS': return <Clock className="h-3 w-3 text-blue-500" />
      default: return null
    }
  }

  const isToday = (date: number) => {
    const today = new Date()
    return today.getFullYear() === year && 
           today.getMonth() === month && 
           today.getDate() === date
  }

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'COMPLETED') return false
    return new Date(task.dueDate) < new Date()
  }

  // Generate calendar days
  const calendarDays = []
  
  // Previous month's trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, lastDayOfMonth.getDate() - i)
    calendarDays.push({ date: date.getDate(), isCurrentMonth: false, fullDate: date })
  }
  
  // Current month's days
  for (let date = 1; date <= daysInMonth; date++) {
    const fullDate = new Date(year, month, date)
    calendarDays.push({ date, isCurrentMonth: true, fullDate })
  }
  
  // Next month's leading days
  const remainingDays = 42 - calendarDays.length // 6 weeks * 7 days
  for (let date = 1; date <= remainingDays; date++) {
    const fullDate = new Date(year, month + 1, date)
    calendarDays.push({ date, isCurrentMonth: false, fullDate })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Compact Filters */}
      <CompactFilters
        searchValue=""
        onSearchChange={() => {}}
        searchPlaceholder="Calendar view"
        resultsCount={tasksWithDueDates.length}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: selectedStatus,
            onChange: setSelectedStatus,
            options: [
              { value: 'all', label: 'All Status' },
              { value: 'TODO', label: 'To Do' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'COMPLETED', label: 'Completed' }
            ]
          },
          {
            key: 'priority',
            label: 'Priority',
            value: selectedPriority,
            onChange: setSelectedPriority,
            options: [
              { value: 'all', label: 'All Priorities' },
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
              { value: 'URGENT', label: 'Urgent' }
            ]
          }
        ]}
        className="mb-3"
      />

      {/* Calendar Header */}
      <div className="bg-white p-3 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Calendar</h3>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1 rounded-md hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-gray-900">
                {monthNames[month]} {year}
              </h3>
              <button
                onClick={goToToday}
                className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
              >
                Today
              </button>
            </div>
            
            <button
              onClick={() => navigateMonth('next')}
              className="p-1 rounded-md hover:bg-gray-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow">
        {/* Week days header */}
        <div className="grid grid-cols-7 border-b">
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium text-gray-500 bg-gray-50">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="p-2">
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dayTasks = day.isCurrentMonth ? getTasksForDate(day.date) : []
              const isCurrentDay = day.isCurrentMonth && isToday(day.date)
              
              return (
                <div
                  key={index}
                  className={`min-h-[80px] p-1.5 border rounded ${
                    day.isCurrentMonth 
                      ? isCurrentDay 
                        ? 'bg-primary-50 border-primary-200' 
                        : 'bg-white border-gray-200'
                      : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className={`text-xs font-medium mb-1 ${
                    day.isCurrentMonth 
                      ? isCurrentDay 
                        ? 'text-primary-600' 
                        : 'text-gray-900'
                      : 'text-gray-400'
                  }`}>
                    {day.date}
                  </div>
                  
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 2).map((task: Task) => (
                      <div
                        key={task.id}
                        className={`text-xs p-1 rounded border-l-2 ${getPriorityColor(task.priority)} ${
                          task.status === 'COMPLETED' 
                            ? 'bg-green-50 text-green-700' 
                            : isOverdue(task)
                            ? 'bg-red-50 text-red-700'
                            : 'bg-gray-50 text-gray-700'
                        }`}
                        title={task.description || task.title}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate text-xs">{task.title}</span>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(task.status)}
                            {isOverdue(task) && <AlertCircle className="h-2.5 w-2.5 text-red-500" />}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {dayTasks.length > 2 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayTasks.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Compact Legend */}
      <div className="bg-white p-2 rounded-lg shadow">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded"></div>
            <span>Urgent</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-orange-500 rounded"></div>
            <span>High</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-gray-500 rounded"></div>
            <span>Low</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircle className="h-2.5 w-2.5 text-green-500" />
            <span>Done</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-2.5 w-2.5 text-blue-500" />
            <span>Progress</span>
          </div>
          <div className="flex items-center space-x-1">
            <AlertCircle className="h-2.5 w-2.5 text-red-500" />
            <span>Overdue</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-primary-100 border border-primary-200 rounded"></div>
            <span>Today</span>
          </div>
        </div>
      </div>

      {tasksWithDueDates.length === 0 && (
        <div className="text-center py-12">
          <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-500 mb-4">
            {selectedStatus !== 'all' || selectedPriority !== 'all'
              ? 'No tasks match your filters'
              : 'No tasks with due dates found'}
          </div>
          <p className="text-sm text-gray-400">
            Add due dates to your tasks to see them on the calendar
          </p>
        </div>
      )}
    </div>
  )
}