'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { 
  Calendar,
  Cloud,
  CloudRain,
  Sun,
  CloudSnow,
  Wind,
  Users,
  Package,
  AlertTriangle,
  Camera,
  Edit,
  Trash2,
  Plus,
  FileText,
  Thermometer,
  Clock,
  User
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Formik, Form, Field } from 'formik'
import * as Yup from 'yup'
import { useModal } from '@/components/ui/modal-provider'

interface DailyLog {
  id: string
  date: string
  weatherCondition: string | null
  temperature: number | null
  weatherNotes: string | null
  workCompleted: string
  materialsUsed: string | null
  equipment: string | null
  workersOnSite: number
  workerDetails: string | null
  issues: string | null
  delays: string | null
  safetyIncidents: string | null
  photos: string[]
  notes: string | null
  createdAt: string
  updatedAt: string
  author: {
    id: string
    firstName: string
    lastName: string
    email: string
    avatar: string | null
  }
}

const weatherOptions = [
  { value: 'sunny', label: 'Sunny', icon: Sun },
  { value: 'cloudy', label: 'Cloudy', icon: Cloud },
  { value: 'rainy', label: 'Rainy', icon: CloudRain },
  { value: 'snowy', label: 'Snowy', icon: CloudSnow },
  { value: 'windy', label: 'Windy', icon: Wind },
]

const DailyLogSchema = Yup.object().shape({
  date: Yup.date().required('Date is required'),
  weatherCondition: Yup.string().nullable(),
  temperature: Yup.number().nullable(),
  weatherNotes: Yup.string().nullable(),
  workCompleted: Yup.string().required('Work completed is required'),
  materialsUsed: Yup.string().nullable(),
  equipment: Yup.string().nullable(),
  workersOnSite: Yup.number().min(0).required('Number of workers is required'),
  workerDetails: Yup.string().nullable(),
  issues: Yup.string().nullable(),
  delays: Yup.string().nullable(),
  safetyIncidents: Yup.string().nullable(),
  notes: Yup.string().nullable(),
})

async function fetchDailyLogs(projectId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/project/${projectId}/dailylogs`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch daily logs')
  return response.json()
}

async function createDailyLog(projectId: string, data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/project/${projectId}/dailylogs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create daily log')
  }
  return response.json()
}

async function updateDailyLog(logId: string, data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/dailylog/${logId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error('Failed to update daily log')
  return response.json()
}

async function deleteDailyLog(logId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/dailylog/${logId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to delete daily log')
  return response.json()
}

export function DailyLogs({ projectId }: { projectId: string }) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const queryClient = useQueryClient()
  const { showConfirm } = useModal()

  const { data: dailyLogs = [], isLoading } = useQuery<DailyLog[]>({
    queryKey: ['daily-logs', projectId],
    queryFn: () => fetchDailyLogs(projectId)
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => createDailyLog(projectId, data),
    onSuccess: () => {
      toast.success('Daily log created successfully!')
      queryClient.invalidateQueries({ queryKey: ['daily-logs', projectId] })
      setIsFormOpen(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create daily log')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ logId, data }: { logId: string, data: any }) => updateDailyLog(logId, data),
    onSuccess: () => {
      toast.success('Daily log updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['daily-logs', projectId] })
      setEditingLog(null)
      setIsFormOpen(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update daily log')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDailyLog,
    onSuccess: () => {
      toast.success('Daily log deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['daily-logs', projectId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete daily log')
    }
  })

  const handleDelete = async (log: DailyLog) => {
    const confirmed = await showConfirm(
      `Are you sure you want to delete the daily log for ${format(new Date(log.date), 'MMMM d, yyyy')}? This action cannot be undone.`,
      'Delete Daily Log'
    )
    if (confirmed) {
      deleteMutation.mutate(log.id)
    }
  }

  const getWeatherIcon = (condition: string | null) => {
    if (!condition) return Cloud
    const weather = weatherOptions.find(w => w.value === condition)
    return weather?.icon || Cloud
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center">
          <FileText className="h-5 w-5 mr-2 text-primary-600" />
          Daily Logs
          <span className="ml-2 text-sm text-gray-500">({dailyLogs.length} entries)</span>
        </h3>
        <button
          onClick={() => {
            setEditingLog(null)
            setIsFormOpen(true)
          }}
          className="flex items-center px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Daily Log
        </button>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4">
              <h2 className="text-xl font-semibold">
                {editingLog ? 'Edit Daily Log' : 'Create Daily Log'}
              </h2>
            </div>
            
            <div className="p-6">
              <Formik
                initialValues={{
                  date: editingLog ? format(new Date(editingLog.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                  weatherCondition: editingLog?.weatherCondition || '',
                  temperature: editingLog?.temperature || '',
                  weatherNotes: editingLog?.weatherNotes || '',
                  workCompleted: editingLog?.workCompleted || '',
                  materialsUsed: editingLog?.materialsUsed || '',
                  equipment: editingLog?.equipment || '',
                  workersOnSite: editingLog?.workersOnSite || 0,
                  workerDetails: editingLog?.workerDetails || '',
                  issues: editingLog?.issues || '',
                  delays: editingLog?.delays || '',
                  safetyIncidents: editingLog?.safetyIncidents || '',
                  notes: editingLog?.notes || ''
                }}
                validationSchema={DailyLogSchema}
                onSubmit={(values) => {
                  if (editingLog) {
                    updateMutation.mutate({ logId: editingLog.id, data: values })
                  } else {
                    createMutation.mutate(values)
                  }
                }}
              >
                {({ errors, touched, values }) => (
                  <Form className="space-y-6">
                    {/* Date and Weather */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date *
                        </label>
                        <Field
                          type="date"
                          name="date"
                          disabled={!!editingLog}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
                        />
                        {errors.date && touched.date && (
                          <p className="text-red-500 text-sm mt-1">{errors.date}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Weather Condition
                        </label>
                        <Field
                          as="select"
                          name="weatherCondition"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          <option value="">Select weather</option>
                          {weatherOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Field>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Temperature (°F)
                        </label>
                        <Field
                          type="number"
                          name="temperature"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Weather Notes
                        </label>
                        <Field
                          type="text"
                          name="weatherNotes"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="e.g., Light rain in morning"
                        />
                      </div>
                    </div>

                    {/* Work Information */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Work Completed *
                      </label>
                      <Field
                        as="textarea"
                        name="workCompleted"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="Describe the work completed today..."
                      />
                      {errors.workCompleted && touched.workCompleted && (
                        <p className="text-red-500 text-sm mt-1">{errors.workCompleted}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Materials Used
                        </label>
                        <Field
                          as="textarea"
                          name="materialsUsed"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="List materials used today..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Equipment on Site
                        </label>
                        <Field
                          as="textarea"
                          name="equipment"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="List equipment used..."
                        />
                      </div>
                    </div>

                    {/* Workers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Workers on Site *
                        </label>
                        <Field
                          type="number"
                          name="workersOnSite"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                        {errors.workersOnSite && touched.workersOnSite && (
                          <p className="text-red-500 text-sm mt-1">{errors.workersOnSite}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Worker Details
                        </label>
                        <Field
                          type="text"
                          name="workerDetails"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="e.g., 2 carpenters, 1 electrician"
                        />
                      </div>
                    </div>

                    {/* Issues and Safety */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Issues
                        </label>
                        <Field
                          as="textarea"
                          name="issues"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="Any issues encountered..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Delays
                        </label>
                        <Field
                          as="textarea"
                          name="delays"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="Any delays and reasons..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Safety Incidents
                        </label>
                        <Field
                          as="textarea"
                          name="safetyIncidents"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="Any safety incidents..."
                        />
                      </div>
                    </div>

                    {/* Additional Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Notes
                      </label>
                      <Field
                        as="textarea"
                        name="notes"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="Any additional notes or observations..."
                      />
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsFormOpen(false)
                          setEditingLog(null)
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                      >
                        {editingLog ? 'Update' : 'Create'} Log
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
        </div>
      )}

      {/* Daily Logs List */}
      <div className="space-y-4">
        {dailyLogs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No daily logs yet</p>
            <p className="text-sm text-gray-400 mt-1">Create your first daily log to track site progress</p>
          </div>
        ) : (
          dailyLogs.map((log) => {
            const WeatherIcon = getWeatherIcon(log.weatherCondition)
            return (
              <div key={log.id} className="bg-white border rounded-lg p-5 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-primary-600" />
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {format(new Date(log.date), 'EEEE, MMMM d, yyyy')}
                      </h4>
                      <p className="text-xs text-gray-500">
                        by {log.author.firstName} {log.author.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setEditingLog(log)
                        setIsFormOpen(true)
                      }}
                      className="text-gray-400 hover:text-primary-600 p-1"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(log)}
                      className="text-gray-400 hover:text-red-600 p-1"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Weather Info */}
                {(log.weatherCondition || log.temperature) && (
                  <div className="flex items-center space-x-4 mb-3 text-sm">
                    {log.weatherCondition && (
                      <div className="flex items-center space-x-1">
                        <WeatherIcon className="h-4 w-4 text-gray-500" />
                        <span className="capitalize text-gray-600">{log.weatherCondition}</span>
                      </div>
                    )}
                    {log.temperature && (
                      <div className="flex items-center space-x-1">
                        <Thermometer className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">{log.temperature}°F</span>
                      </div>
                    )}
                    {log.weatherNotes && (
                      <span className="text-gray-500 italic">{log.weatherNotes}</span>
                    )}
                  </div>
                )}

                {/* Work Completed */}
                <div className="mb-4">
                  <h5 className="text-sm font-semibold text-gray-700 mb-1">Work Completed</h5>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">{log.workCompleted}</p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Workers</p>
                      <p className="font-medium text-gray-900">{log.workersOnSite}</p>
                    </div>
                  </div>

                  {log.materialsUsed && (
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Materials</p>
                        <p className="text-sm text-gray-700">Used</p>
                      </div>
                    </div>
                  )}

                  {(log.issues || log.delays) && (
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <div>
                        <p className="text-xs text-gray-500">Issues</p>
                        <p className="text-sm text-gray-700">Reported</p>
                      </div>
                    </div>
                  )}

                  {log.safetyIncidents && (
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <div>
                        <p className="text-xs text-gray-500">Safety</p>
                        <p className="text-sm text-gray-700">Incident</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Details */}
                {(log.materialsUsed || log.equipment || log.issues || log.delays || log.notes) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {log.materialsUsed && (
                      <div>
                        <span className="font-medium text-gray-700">Materials: </span>
                        <span className="text-gray-600">{log.materialsUsed}</span>
                      </div>
                    )}
                    {log.equipment && (
                      <div>
                        <span className="font-medium text-gray-700">Equipment: </span>
                        <span className="text-gray-600">{log.equipment}</span>
                      </div>
                    )}
                    {log.issues && (
                      <div>
                        <span className="font-medium text-gray-700">Issues: </span>
                        <span className="text-gray-600">{log.issues}</span>
                      </div>
                    )}
                    {log.delays && (
                      <div>
                        <span className="font-medium text-gray-700">Delays: </span>
                        <span className="text-gray-600">{log.delays}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {log.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-gray-600 italic">{log.notes}</p>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}