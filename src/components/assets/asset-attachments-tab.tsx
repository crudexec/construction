'use client'

import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Upload, Trash2, FileText, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { assetButton } from './asset-request-dialog'

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

type Category = 'PHOTO' | 'DOCUMENT'
type FailedUpload = { file: File; category: Category; message: string; retryable: boolean }
const photoTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const maxFileSize = 10 * 1024 * 1024

function AttachmentDropzone({ category, disabled, browse, upload }: { category: Category; disabled: boolean; browse: () => void; upload: (files: File[], category: Category) => void }) {
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)
  const label = category === 'PHOTO' ? 'photos' : 'documents'
  return <button type="button" aria-label={`Drop ${label} or browse files`} aria-disabled={disabled}
    onClick={() => { if (!disabled) browse() }}
    onDragEnter={event => { if (!event.dataTransfer.types.includes('Files')) return; event.preventDefault(); depth.current++; if (!disabled) setDragging(true) }}
    onDragOver={event => { if (!event.dataTransfer.types.includes('Files')) return; event.preventDefault(); event.dataTransfer.dropEffect = disabled ? 'none' : 'copy' }}
    onDragLeave={event => { event.preventDefault(); depth.current = Math.max(0, depth.current - 1); if (!depth.current) setDragging(false) }}
    onDrop={event => { if (!event.dataTransfer.types.includes('Files')) return; event.preventDefault(); depth.current = 0; setDragging(false); if (!disabled) upload(Array.from(event.dataTransfer.files), category) }}
    className={`flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-4 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${dragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-gray-50 hover:border-primary-400'} ${disabled ? 'opacity-50' : ''}`}>
    <Upload aria-hidden="true" className="mb-1 h-5 w-5 text-gray-500" />
    <span className="font-medium text-gray-800">{dragging ? `Drop ${label} here` : `Drag and drop ${label}, or browse files`}</span>
    <span className="text-gray-600">{category === 'PHOTO' ? 'JPEG, PNG, GIF or WebP · ' : ''}Up to 10 MB per file · Multiple files supported</span>
  </button>
}

export function AssetAttachmentsTab({ assetId, attachments }: { assetId: string; attachments: Attachment[] }) {
  const queryClient = useQueryClient()
  const photoInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const busy = useRef(false)
  const [progress, setProgress] = useState<{ index: number; total: number; name: string } | null>(null)
  const [failures, setFailures] = useState<FailedUpload[]>([])
  const uploading = progress !== null

  async function uploadFiles(items: { file: File; category: Category }[]) {
    if (busy.current || !items.length) return
    busy.current = true
    const failed: FailedUpload[] = []
    let succeeded = 0
    try {
      for (const [index, item] of items.entries()) {
        const { file, category } = item
        setProgress({ index: index + 1, total: items.length, name: file.name })
        const validation = file.size > maxFileSize ? 'Maximum file size is 10 MB.' : category === 'PHOTO' && !photoTypes.includes(file.type) ? 'Use JPEG, PNG, GIF or WebP for photos.' : null
        if (validation) { failed.push({ ...item, message: validation, retryable: false }); continue }
        try {
          const body = new FormData()
          body.append('file', file); body.append('category', category)
          const response = await fetch(`/api/assets/${assetId}/attachments`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error || 'Upload failed. Please try again.')
          succeeded++
        } catch (error) {
          failed.push({ ...item, message: error instanceof Error ? error.message : 'Upload failed. Please try again.', retryable: true })
        }
      }
      setFailures(previous => [...previous, ...failed])
      if (succeeded) {
        toast.success(`${succeeded} ${succeeded === 1 ? 'file' : 'files'} uploaded`)
        await queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
      }
    } finally { busy.current = false; setProgress(null) }
  }
  function upload(files: File[], category: Category) { void uploadFiles(files.map(file => ({ file, category }))) }
  function retryFailed() {
    if (busy.current) return
    const retryable = failures.filter(item => item.retryable)
    setFailures(previous => previous.filter(item => !item.retryable))
    void uploadFiles(retryable)
  }

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
    upload(Array.from(e.target.files || []), category)
    e.target.value = ''
  }

  const photos = attachments.filter(a => a.category === 'PHOTO')
  const documents = attachments.filter(a => a.category === 'DOCUMENT')

  return (
    <div className="space-y-6">
      <div role="status" aria-live="polite" className={progress ? 'rounded border border-primary-200 bg-primary-50 p-3 text-xs text-primary-800 break-words' : 'sr-only'}>{progress ? `Uploading ${progress.index} of ${progress.total}: ${progress.name}` : 'Uploads ready'}</div>
      {failures.length > 0 && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800">
        <p className="font-medium">Some files could not be uploaded</p>
        <ul className="mt-2 space-y-1">{failures.map((item, index) => <li className="break-words" key={index}>{item.file.name}: {item.message}</li>)}</ul>
        <div className="mt-3 flex flex-wrap gap-2">{failures.some(item => item.retryable) && <button type="button" disabled={uploading} onClick={retryFailed} className={`${assetButton} bg-white`}>Retry failed uploads</button>}<button type="button" disabled={uploading} onClick={() => setFailures([])} className={assetButton}>Dismiss</button></div>
      </div>}
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-gray-400" />
            Photos
          </h3>
          <input ref={photoInputRef} type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={(e) => handleFileSelect(e, 'PHOTO')} />
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={uploading}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2 disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
            <span>Upload Photo</span>
          </button>
        </div>
        <div className="mb-4"><AttachmentDropzone category="PHOTO" disabled={uploading} browse={() => photoInputRef.current?.click()} upload={upload} /></div>
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
                    aria-label={`Delete ${photo.fileName}`}
                    onClick={() => deleteMutation.mutate(photo.id)}
                    disabled={deleteMutation.isPending}
                    className="sm:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 bg-red-600 text-white p-2 rounded-full"
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
        <div className="px-6 py-4 border-b flex flex-wrap gap-3 justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-400" />
            Documents
          </h3>
          <input ref={docInputRef} type="file" multiple className="hidden" onChange={(e) => handleFileSelect(e, 'DOCUMENT')} />
          <button
            onClick={() => docInputRef.current?.click()}
            disabled={uploading}
            className="bg-white text-gray-700 px-4 py-2 rounded-md border hover:bg-gray-50 flex items-center space-x-2 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Document</span>
          </button>
        </div>
        <div className="p-4 sm:p-6"><AttachmentDropzone category="DOCUMENT" disabled={uploading} browse={() => docInputRef.current?.click()} upload={upload} /></div>
        {documents.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No documents uploaded yet</div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
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
                    <button aria-label={`Delete ${doc.fileName}`} onClick={() => deleteMutation.mutate(doc.id)} disabled={deleteMutation.isPending} className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  )
}
