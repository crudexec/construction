'use client'

import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Paperclip, Upload, Trash2, FileText, Image, File, Download, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface Attachment {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  uploader?: {
    id: string
    firstName: string
    lastName: string
  } | null
  uploadedByVendor?: {
    id: string
    name: string
    companyName: string
  } | null
  createdAt: string
}

interface TaskAttachmentsProps {
  taskId: string
  attachments: Attachment[]
  onUpdate?: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return <Image className="h-4 w-4 text-blue-500" />
  }
  if (mimeType.includes('pdf')) {
    return <FileText className="h-4 w-4 text-red-500" />
  }
  return <File className="h-4 w-4 text-gray-500" />
}

export function TaskAttachments({ taskId, attachments, onUpdate }: TaskAttachmentsProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/task/${taskId}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to upload file')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      toast.success('File uploaded successfully')
      setIsUploading(false)
      onUpdate?.()
    },
    onError: (error: Error) => {
      toast.error(error.message)
      setIsUploading(false)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/task/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to delete attachment')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      toast.success('Attachment deleted')
      onUpdate?.()
    },
    onError: () => {
      toast.error('Failed to delete attachment')
    }
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setIsUploading(true)
    uploadMutation.mutate(file)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDelete = (attachmentId: string, fileName: string) => {
    if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
      deleteMutation.mutate(attachmentId)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-purple-600" />
          Attachments ({attachments.length})
        </h4>
        <label className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 cursor-pointer">
          <Upload className="h-4 w-4" />
          Upload File
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
        </label>
      </div>

      {isUploading && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span className="text-sm text-blue-700">Uploading...</span>
        </div>
      )}

      {attachments.length === 0 && !isUploading ? (
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <Paperclip className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No attachments yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload files up to 10MB</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {getFileIcon(attachment.mimeType)}
                <div className="min-w-0 flex-1">
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-primary-600 truncate block"
                  >
                    {attachment.fileName}
                  </a>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatFileSize(attachment.fileSize)}</span>
                    <span>•</span>
                    <span>
                      {attachment.uploader
                        ? `${attachment.uploader.firstName} ${attachment.uploader.lastName}`
                        : attachment.uploadedByVendor
                          ? `${attachment.uploadedByVendor.name} (Vendor)`
                          : 'Unknown'}
                    </span>
                    <span>•</span>
                    <span>{format(new Date(attachment.createdAt), 'MMM dd')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={attachment.url}
                  download={attachment.fileName}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={() => handleDelete(attachment.id, attachment.fileName)}
                  disabled={deleteMutation.isPending}
                  className="p-1 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
