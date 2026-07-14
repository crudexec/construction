'use client'

import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  X,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  ListTree,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface CostCodeImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess?: () => void
}

interface ImportResult {
  success: boolean
  message: string
  createdCount: number
  updatedCount: number
  skippedCount: number
  warnings?: string[]
}

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls']

function isAcceptedFile(fileName: string) {
  const lower = fileName.toLowerCase()
  return ACCEPTED_EXTENSIONS.some(ext => lower.endsWith(ext))
}

export function CostCodeImportModal({ isOpen, onClose, onImportSuccess }: CostCodeImportModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find((row) => row.startsWith('auth-token='))
      ?.split('=')[1]
  }

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
    if (file && isAcceptedFile(file.name)) {
      setSelectedFile(file)
      setImportResult(null)
    } else {
      toast.error('Please upload a .csv or .xlsx file')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (isAcceptedFile(file.name)) {
        setSelectedFile(file)
        setImportResult(null)
      } else {
        toast.error('Please upload a .csv or .xlsx file')
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

      const response = await fetch('/api/cost-codes/import', {
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
          message: `${data.createdCount} created, ${data.updatedCount} updated${data.skippedCount ? `, ${data.skippedCount} skipped` : ''}`,
          createdCount: data.createdCount,
          updatedCount: data.updatedCount,
          skippedCount: data.skippedCount,
          warnings: data.warnings,
        })

        queryClient.invalidateQueries({ queryKey: ['cost-codes'] })
        toast.success('Cost code directory imported successfully!')
        onImportSuccess?.()
      } else {
        setImportResult({
          success: false,
          message: data.error || 'Import failed',
          createdCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          warnings: data.warnings,
        })
        toast.error(data.error || 'Failed to import cost codes')
      }
    } catch (error) {
      console.error('Error importing cost codes:', error)
      setImportResult({
        success: false,
        message: 'An unexpected error occurred',
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
      })
      toast.error('Failed to import cost codes')
    } finally {
      setImporting(false)
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
              <ListTree className="h-6 w-6 text-primary-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Import Cost Code Directory</h3>
                <p className="text-sm text-gray-500">Upload a CSV or Excel file of cost codes</p>
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
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-900 mb-1">Expected columns</p>
              <p><span className="font-mono text-xs bg-white px-1 py-0.5 rounded border">code</span> and <span className="font-mono text-xs bg-white px-1 py-0.5 rounded border">name</span> are required. <span className="font-mono text-xs bg-white px-1 py-0.5 rounded border">description</span> and <span className="font-mono text-xs bg-white px-1 py-0.5 rounded border">csiDivision</span> are optional.</p>
              <p className="mt-1 text-xs text-gray-500">Codes that already exist in your directory will be updated; new codes will be added.</p>
            </div>

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
                  accept=".csv,.xlsx,.xls"
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
                    <p className="text-xs text-gray-500">CSV or Excel (.xlsx) files</p>
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
                            {importResult.createdCount}
                          </p>
                          <p className="text-xs text-gray-500">Created</p>
                        </div>
                        <div className="bg-white rounded p-2">
                          <p className="text-lg font-semibold text-gray-900">
                            {importResult.updatedCount}
                          </p>
                          <p className="text-xs text-gray-500">Updated</p>
                        </div>
                        <div className="bg-white rounded p-2">
                          <p className="text-lg font-semibold text-gray-900">{importResult.skippedCount}</p>
                          <p className="text-xs text-gray-500">Skipped</p>
                        </div>
                      </div>
                    )}

                    {importResult.warnings && importResult.warnings.length > 0 && (
                      <div className="mt-3 p-2 bg-white rounded text-xs text-amber-700 max-h-32 overflow-y-auto">
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
                    Import Directory
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
