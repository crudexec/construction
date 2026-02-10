'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
  Loader,
  ChevronDown,
  X
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import { DatePicker } from '@/components/ui/date-picker'

// Dynamically import PDF component to avoid SSR issues
const ProgressReportPDF = dynamic(
  () => import('@/components/reports/progress-report-pdf').then(mod => mod.ProgressReportPDF),
  { ssr: false }
)

interface ProgressReportProps {
  projectId: string
}

interface ReportFilters {
  startDate: string
  endDate: string
  priority: string
  categoryId: string
  includePhotos: boolean
}

async function fetchReportData(projectId: string, filters: ReportFilters) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
  
  const params = new URLSearchParams()
  if (filters.startDate) params.append('startDate', filters.startDate)
  if (filters.endDate) params.append('endDate', filters.endDate)
  if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority)
  if (filters.categoryId && filters.categoryId !== 'all') params.append('categoryId', filters.categoryId)
  params.append('includePhotos', filters.includePhotos.toString())
  
  const response = await fetch(`/api/project/${projectId}/report?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  
  if (!response.ok) throw new Error('Failed to fetch report data')
  return response.json()
}

async function fetchProjectCategories(projectId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/project/${projectId}/categories`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch categories')
  return response.json()
}

export function ProgressReport({ projectId }: ProgressReportProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    priority: 'all',
    categoryId: 'all',
    includePhotos: false
  })

  // Quick date presets
  const datePresets = [
    { label: 'Last 7 Days', value: () => ({ 
      startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd')
    })},
    { label: 'Last 30 Days', value: () => ({ 
      startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd')
    })},
    { label: 'This Month', value: () => ({ 
      startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    })},
    { label: 'Last Month', value: () => {
      const lastMonth = subDays(startOfMonth(new Date()), 1)
      return {
        startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd')
      }
    }}
  ]

  const { data: categories = [] } = useQuery({
    queryKey: ['project-categories', projectId],
    queryFn: () => fetchProjectCategories(projectId)
  })

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['progress-report', projectId, filters],
    queryFn: () => fetchReportData(projectId, filters),
    enabled: showPreview
  })

  const handleGenerateReport = () => {
    setShowPreview(true)
  }

  const handleFilterChange = (key: keyof ReportFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setShowPreview(false)
  }

  const applyDatePreset = (preset: any) => {
    const dates = preset.value()
    setFilters(prev => ({ ...prev, ...dates }))
    setShowPreview(false)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FileText className="h-6 w-6 mr-2 text-primary-600" />
              Progress Reports
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Generate comprehensive construction progress reports
            </p>
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            <ChevronDown className={`h-4 w-4 ml-2 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="space-y-4">
            {/* Date Presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Date Ranges
              </label>
              <div className="flex flex-wrap gap-2">
                {datePresets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyDatePreset(preset)}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <DatePicker
                  value={filters.startDate}
                  onChange={(date) => handleFilterChange('startDate', date)}
                  placeholder="Select start date"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                  End Date
                </label>
                <DatePicker
                  value={filters.endDate}
                  onChange={(date) => handleFilterChange('endDate', date)}
                  placeholder="Select end date"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Priority and Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                  Priority Filter
                </label>
                <select
                  id="priority"
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="URGENT">Urgent Only</option>
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="LOW">Low Priority</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
                  Category Filter
                </label>
                <select
                  id="categoryId"
                  value={filters.categoryId}
                  onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category: any) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Options */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.includePhotos}
                  onChange={(e) => handleFilterChange('includePhotos', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">Include project photos in report</span>
              </label>
            </div>

            {/* Generate Button */}
            <div className="flex justify-end">
              <button
                onClick={handleGenerateReport}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Report Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Preview */}
      {showPreview && (
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader className="h-8 w-8 animate-spin text-primary-600" />
              <span className="ml-3 text-gray-600">Generating report...</span>
            </div>
          ) : reportData ? (
            <div className="space-y-6">
              {/* Report Summary */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Summary</h3>
                
                {/* Statistics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">Completion Rate</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {reportData.statistics.completionRate}%
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-blue-400" />
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-900">Completed</p>
                        <p className="text-2xl font-bold text-green-600">
                          {reportData.statistics.completedTasks}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-400" />
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-900">In Progress</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {reportData.statistics.inProgressTasks}
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-400" />
                    </div>
                  </div>
                  
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-900">Overdue</p>
                        <p className="text-2xl font-bold text-red-600">
                          {reportData.statistics.overdueTasks}
                        </p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-red-400" />
                    </div>
                  </div>
                </div>

                {/* Work by Category */}
                {reportData.tasksByCategory && reportData.tasksByCategory.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Work by Category</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <table className="min-w-full">
                        <thead>
                          <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <th className="text-left py-2">Category</th>
                            <th className="text-center py-2">Completed</th>
                            <th className="text-center py-2">In Progress</th>
                            <th className="text-center py-2">Pending</th>
                            <th className="text-center py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {reportData.tasksByCategory.map((category: any, index: number) => (
                            <tr key={index} className="text-sm text-gray-900">
                              <td className="py-2 font-medium">{category.name}</td>
                              <td className="text-center py-2">{category.completed}</td>
                              <td className="text-center py-2">{category.inProgress}</td>
                              <td className="text-center py-2">{category.todo}</td>
                              <td className="text-center py-2 font-semibold">{category.tasks.length}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Report Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Report Period: </span>
                      <span className="text-gray-900">
                        {reportData.reportPeriod.startDate} - {reportData.reportPeriod.endDate}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Total Activities: </span>
                      <span className="text-gray-900">{reportData.statistics.activitiesCount}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Daily Logs: </span>
                      <span className="text-gray-900">{reportData.statistics.dailyLogsCount}</span>
                    </div>
                    {filters.includePhotos && (
                      <div>
                        <span className="font-medium text-gray-700">Photos Included: </span>
                        <span className="text-gray-900">{reportData.statistics.photosCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Download Button */}
              <div className="flex justify-center pt-6 border-t border-gray-200">
                <ProgressReportPDF reportData={reportData} />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}