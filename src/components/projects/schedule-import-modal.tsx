'use client'

import { useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  X,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Trash2,
  Info,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface ScheduleImportModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onImportSuccess?: () => void
}

interface ImportResult {
  success: boolean
  message: string
  activitiesCount: number
  relationshipsCount: number
  wbsCount: number
  xerProjectName?: string
  warnings?: string[]
}

interface ScheduleInfo {
  latestImport: {
    id: string
    fileName: string
    importedAt: string
    activitiesCount: number
    xerProjectName: string | null
  } | null
  stats: {
    totalActivities: number
    completedActivities: number
    criticalActivities: number
    overallProgress: number
  }
}

export function ScheduleImportModal({
  projectId,
  isOpen,
  onClose,
  onImportSuccess,
}: ScheduleImportModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find((row) => row.startsWith('auth-token='))
      ?.split('=')[1]
  }

  // Fetch current schedule info when modal opens
  const fetchScheduleInfo = useCallback(async () => {
    setLoadingInfo(true)
    try {
      const token = getToken()
      const response = await fetch(`/api/project/${projectId}/schedule`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: document.cookie,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setScheduleInfo({
          latestImport: data.latestImport,
          stats: data.stats,
        })
      }
    } catch (error) {
      console.error('Error fetching schedule info:', error)
    } finally {
      setLoadingInfo(false)
    }
  }, [projectId])

  // Fetch info when modal opens
  useState(() => {
    if (isOpen) {
      fetchScheduleInfo()
    }
  })

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.name.toLowerCase().endsWith('.xer')) {
      setSelectedFile(file)
      setImportResult(null)
    } else {
      toast.error('Please upload an XER file')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.name.toLowerCase().endsWith('.xer')) {
        setSelectedFile(file)
        setImportResult(null)
      } else {
        toast.error('Please upload an XER file')
      }
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return

    setImporting(true)
    setImportResult(null)

    try {
      const token = getToken()
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(`/api/project/${projectId}/schedule/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: document.cookie,
        },
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setImportResult({
          success: true,
          message: data.message,
          activitiesCount: data.activitiesCount,
          relationshipsCount: data.relationshipsCount,
          wbsCount: data.wbsCount,
          xerProjectName: data.xerProjectName,
          warnings: data.warnings,
        })

        // Invalidate queries to refresh schedule data
        queryClient.invalidateQueries({ queryKey: ['project-schedule', projectId] })

        // Refresh schedule info
        fetchScheduleInfo()

        toast.success('Schedule imported successfully!')
        onImportSuccess?.()
      } else {
        setImportResult({
          success: false,
          message: data.error || 'Import failed',
          activitiesCount: 0,
          relationshipsCount: 0,
          wbsCount: 0,
          warnings: data.details ? [data.details] : undefined,
        })
        toast.error(data.error || 'Failed to import schedule')
      }
    } catch (error) {
      console.error('Error importing schedule:', error)
      setImportResult({
        success: false,
        message: 'An unexpected error occurred',
        activitiesCount: 0,
        relationshipsCount: 0,
        wbsCount: 0,
      })
      toast.error('Failed to import schedule')
    } finally {
      setImporting(false)
    }
  }

  const handleDeleteSchedule = async () => {
    if (!confirm('Are you sure you want to delete all schedule data? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const token = getToken()
      const response = await fetch(`/api/project/${projectId}/schedule`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: document.cookie,
        },
      })

      if (response.ok) {
        toast.success('Schedule data deleted')
        queryClient.invalidateQueries({ queryKey: ['project-schedule', projectId] })
        fetchScheduleInfo()
        setImportResult(null)
        setSelectedFile(null)
      } else {
        toast.error('Failed to delete schedule')
      }
    } catch (error) {
      console.error('Error deleting schedule:', error)
      toast.error('Failed to delete schedule')
    } finally {
      setDeleting(false)
    }
  }

  const resetState = () => {
    setSelectedFile(null)
    setImportResult(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="relative bg-white rounded-lg shadow-xl max-w-xl w-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6 text-primary-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Import Schedule</h3>
                <p className="text-sm text-gray-500">Import a Primavera P6 XER file</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            {/* Current Schedule Info */}
            {loadingInfo ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : scheduleInfo?.latestImport ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Current Schedule</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      {scheduleInfo.latestImport.xerProjectName || scheduleInfo.latestImport.fileName}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-blue-600">
                      <span>{scheduleInfo.stats.totalActivities} activities</span>
                      <span>{scheduleInfo.stats.overallProgress}% complete</span>
                      <span>
                        Imported {format(new Date(scheduleInfo.latestImport.importedAt), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleDeleteSchedule}
                    disabled={deleting}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                    title="Delete schedule"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Info className="h-4 w-4" />
                  <p className="text-sm">No schedule data imported yet</p>
                </div>
              </div>
            )}

            {/* Warning about replacing */}
            {scheduleInfo?.latestImport && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  Importing a new XER file will <strong>replace</strong> the existing schedule data.
                </p>
              </div>
            )}

            {/* File Upload Area */}
            {!importResult?.success && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                  ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
                  ${selectedFile ? 'bg-green-50 border-green-300' : ''}
                `}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xer"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <FileText className="h-10 w-10 text-green-600 mx-auto" />
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        resetState()
                      }}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 text-gray-400 mx-auto" />
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-primary-600">Click to upload</span> or drag and
                      drop
                    </p>
                    <p className="text-xs text-gray-500">Primavera P6 XER files only</p>
                  </div>
                )}
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <div
                className={`rounded-lg p-4 ${
                  importResult.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h4
                      className={`text-sm font-medium ${
                        importResult.success ? 'text-green-900' : 'text-red-900'
                      }`}
                    >
                      {importResult.success ? 'Import Successful' : 'Import Failed'}
                    </h4>
                    <p
                      className={`text-sm mt-1 ${
                        importResult.success ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {importResult.message}
                    </p>

                    {importResult.success && (
                      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                        <div className="bg-white rounded p-2">
                          <p className="text-lg font-semibold text-gray-900">
                            {importResult.activitiesCount}
                          </p>
                          <p className="text-xs text-gray-500">Activities</p>
                        </div>
                        <div className="bg-white rounded p-2">
                          <p className="text-lg font-semibold text-gray-900">
                            {importResult.relationshipsCount}
                          </p>
                          <p className="text-xs text-gray-500">Dependencies</p>
                        </div>
                        <div className="bg-white rounded p-2">
                          <p className="text-lg font-semibold text-gray-900">{importResult.wbsCount}</p>
                          <p className="text-xs text-gray-500">WBS Items</p>
                        </div>
                      </div>
                    )}

                    {importResult.warnings && importResult.warnings.length > 0 && (
                      <div className="mt-3 p-2 bg-white rounded text-xs text-amber-700">
                        <p className="font-medium mb-1">Warnings:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {importResult.warnings.map((warning, idx) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end items-center gap-3 p-5 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {importResult?.success ? 'Close' : 'Cancel'}
            </button>

            {!importResult?.success && (
              <button
                onClick={handleImport}
                disabled={!selectedFile || importing}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Import Schedule
                  </>
                )}
              </button>
            )}

            {importResult?.success && (
              <button
                onClick={() => {
                  resetState()
                }}
                className="px-4 py-2 text-sm font-medium text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50"
              >
                Import Another
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
