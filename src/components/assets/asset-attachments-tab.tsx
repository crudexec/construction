'use client'

import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Upload, Trash2, FileText, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'

interface Attachment {
  id: string
  category: 'PHOTO' | 'DOCUMENT'
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  createdAt: string
}

function getToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AssetAttachmentsTab({ assetId, attachments }: { assetId: string; attachments: Attachment[] }) {
  const queryClient = useQueryClient()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const [uploadingCategory, setUploadingCategory] = useState<'PHOTO' | 'DOCUMENT' | null>(null)

  const uploadMutation = useMutation({
    mutationFn: async ({ file, category }: { file: File; category: 'PHOTO' | 'DOCUMENT' }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)

      const response = await fetch(`/api/assets/${assetId}/attachments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to upload')
      return result
    },
    onSuccess: () => {
      toast.success('Uploaded successfully')
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
      setUploadingCategory(null)
    },
    onError: (error: Error) => {
      toast.error(error.message)
      setUploadingCategory(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const response = await fetch(`/api/assets/${assetId}/attachments?attachmentId=${attachmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to delete')
      return result
    },
    onSuccess: () => {
      toast.success('Deleted')
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, category: 'PHOTO' | 'DOCUMENT') => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadingCategory(category)
      uploadMutation.mutate({ file, category })
    }
    e.target.value = ''
  }

  const photos = attachments.filter(a => a.category === 'PHOTO')
  const documents = attachments.filter(a => a.category === 'DOCUMENT')

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-gray-400" />
            Photos
          </h3>
          <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={(e) => handleFileSelect(e, 'PHOTO')} />
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingCategory === 'PHOTO'}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2 disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
            <span>{uploadingCategory === 'PHOTO' ? 'Uploading...' : 'Upload Photo'}</span>
          </button>
        </div>
        {photos.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No photos uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square">
                <img src={photo.url} alt={photo.fileName} className="w-full h-full object-cover rounded-lg" />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                  <button
                    onClick={() => deleteMutation.mutate(photo.id)}
                    disabled={deleteMutation.isPending}
                    className="opacity-0 group-hover:opacity-100 bg-red-600 text-white p-2 rounded-full"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-400" />
            Documents
          </h3>
          <input ref={docInputRef} type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'DOCUMENT')} />
          <button
            onClick={() => docInputRef.current?.click()}
            disabled={uploadingCategory === 'DOCUMENT'}
            className="bg-white text-gray-700 px-4 py-2 rounded-md border hover:bg-gray-50 flex items-center space-x-2 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            <span>{uploadingCategory === 'DOCUMENT' ? 'Uploading...' : 'Upload Document'}</span>
          </button>
        </div>
        {documents.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No documents uploaded yet</div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <a href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary-600 hover:text-primary-800">
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      {doc.fileName}
                    </a>
                  </td>
                  <td className="px-6 py-3 text-gray-500 text-right w-24">{formatFileSize(doc.fileSize)}</td>
                  <td className="px-6 py-3 text-gray-500 text-right w-28">{new Date(doc.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-right w-16">
                    <button onClick={() => deleteMutation.mutate(doc.id)} disabled={deleteMutation.isPending} className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
