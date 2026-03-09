'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileViewer } from '@/components/files/file-viewer'
import { FileTagFilter } from '@/components/files/file-tag-filter'
import { FileTagPills } from '@/components/files/file-tag-pills'
import { FileTagSelector } from '@/components/files/file-tag-selector'
import {
  Upload,
  Search,
  Download,
  Eye,
  Share2,
  Trash2,
  FileText,
  Image,
  File,
  X,
  Folder,
  FolderPlus,
  ChevronRight,
  ArrowLeft,
  Home,
  Tag
} from 'lucide-react'
import toast from 'react-hot-toast'

interface VendorFilesProps {
  vendorId: string
}

interface VendorFolder {
  id: string
  name: string
  description?: string
  color: string
  parentId?: string
  parent?: {
    id: string
    name: string
  }
  _count: {
    documents: number
    children: number
  }
  createdAt: string
  updatedAt: string
}

interface FileTag {
  id: string
  name: string
  color: string
  category?: string
}

interface Document {
  id: string
  name: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  folderId?: string
  folder?: {
    id: string
    name: string
    color: string
  }
  isShared: boolean
  tags?: FileTag[]
  uploader: {
    id: string
    firstName: string
    lastName: string
  }
  createdAt: string
  updatedAt: string
}

async function fetchVendorFiles(vendorId: string, tagIds?: string[]) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  let url = `/api/vendor/${vendorId}/files`
  if (tagIds && tagIds.length > 0) {
    url += `?tagIds=${tagIds.join(',')}`
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch files')
  return response.json()
}

async function uploadFile(vendorId: string, file: File, name?: string, folderId?: string | null, tagIds?: string[]) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const formData = new FormData()
  formData.append('file', file)
  if (name) formData.append('name', name)
  if (folderId) formData.append('folderId', folderId)
  if (tagIds && tagIds.length > 0) formData.append('tagIds', JSON.stringify(tagIds))

  const response = await fetch(`/api/vendor/${vendorId}/files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: formData
  })
  if (!response.ok) throw new Error('Failed to upload file')
  return response.json()
}

async function deleteFile(fileId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendor-document/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to delete file')
  return response.json()
}

async function toggleFileSharing(fileId: string, isShared: boolean) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendor-document/${fileId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify({ isShared })
  })
  if (!response.ok) throw new Error('Failed to update file sharing')
  return response.json()
}

async function updateFileTags(fileId: string, tagIds: string[]) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendor-document/${fileId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify({ tagIds })
  })
  if (!response.ok) throw new Error('Failed to update file tags')
  return response.json()
}

async function fetchVendorFolders(vendorId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendor/${vendorId}/folders`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch folders')
  return response.json()
}

async function createFolder(vendorId: string, data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendor/${vendorId}/folders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create folder')
  return response.json()
}

async function deleteFolder(folderId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendor-folder/${folderId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to delete folder')
  return response.json()
}

export function VendorFiles({ vendorId }: VendorFilesProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [editingTagsFile, setEditingTagsFile] = useState<Document | null>(null)
  const [editingTagIds, setEditingTagIds] = useState<string[]>([])
  const [uploadName, setUploadName] = useState('')
  const [uploadTagIds, setUploadTagIds] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<Array<{id: string | null, name: string}>>([
    { id: null, name: 'Root' }
  ])
  const [viewerFile, setViewerFile] = useState<Document | null>(null)
  const [viewerFileIndex, setViewerFileIndex] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['vendor-files', vendorId, selectedTagIds],
    queryFn: () => fetchVendorFiles(vendorId, selectedTagIds),
    enabled: !!vendorId
  })

  const { data: folders = [] } = useQuery({
    queryKey: ['vendor-folders', vendorId],
    queryFn: () => fetchVendorFolders(vendorId),
    enabled: !!vendorId
  })

  const uploadMutation = useMutation({
    mutationFn: ({ file, name, tagIds }: { file: File, name?: string, tagIds?: string[] }) =>
      uploadFile(vendorId, file, name, currentFolderId, tagIds),
    onSuccess: () => {
      toast.success('File uploaded successfully!')
      queryClient.invalidateQueries({ queryKey: ['vendor-files', vendorId] })
      queryClient.invalidateQueries({ queryKey: ['vendor-folders', vendorId] })
      setIsUploadModalOpen(false)
      setSelectedFile(null)
      setUploadName('')
      setUploadTagIds([])
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to upload file')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      toast.success('File deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['vendor-files', vendorId] })
      queryClient.invalidateQueries({ queryKey: ['vendor-folders', vendorId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete file')
    }
  })

  const shareMutation = useMutation({
    mutationFn: ({ fileId, isShared }: { fileId: string, isShared: boolean }) =>
      toggleFileSharing(fileId, isShared),
    onSuccess: () => {
      toast.success('File sharing updated!')
      queryClient.invalidateQueries({ queryKey: ['vendor-files', vendorId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update sharing')
    }
  })

  const tagsMutation = useMutation({
    mutationFn: ({ fileId, tagIds }: { fileId: string, tagIds: string[] }) =>
      updateFileTags(fileId, tagIds),
    onSuccess: () => {
      toast.success('File tags updated!')
      queryClient.invalidateQueries({ queryKey: ['vendor-files', vendorId] })
      setEditingTagsFile(null)
      setEditingTagIds([])
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update tags')
    }
  })

  const handleDownload = async (file: Document) => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/files/${file.id}?download=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': document.cookie
        }
      })

      if (!response.ok) throw new Error('Failed to download file')

      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.fileName

      document.body.appendChild(link)
      link.click()

      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success(`Downloaded ${file.name}`)
    } catch (error) {
      toast.error('Failed to download file')
      console.error('Download error:', error)
    }
  }

  const handleView = (file: Document, index?: number) => {
    setViewerFile(file)
    if (index !== undefined) {
      setViewerFileIndex(index)
    } else {
      const idx = filteredFiles.findIndex((f: Document) => f.id === file.id)
      setViewerFileIndex(idx >= 0 ? idx : 0)
    }
  }

  const handleViewerNavigate = (index: number) => {
    if (index >= 0 && index < filteredFiles.length) {
      setViewerFile(filteredFiles[index])
      setViewerFileIndex(index)
    }
  }

  const handleViewerClose = () => {
    setViewerFile(null)
    setViewerFileIndex(0)
  }

  const createFolderMutation = useMutation({
    mutationFn: (data: any) => createFolder(vendorId, data),
    onSuccess: () => {
      toast.success('Folder created successfully!')
      queryClient.invalidateQueries({ queryKey: ['vendor-folders', vendorId] })
      setIsFolderModalOpen(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create folder')
    }
  })

  const deleteFolderMutation = useMutation({
    mutationFn: deleteFolder,
    onSuccess: () => {
      toast.success('Folder deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['vendor-folders', vendorId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete folder')
    }
  })

  const navigateToFolder = (folderId: string | null, folderName: string) => {
    setCurrentFolderId(folderId)
    if (folderId === null) {
      setFolderPath([{ id: null, name: 'Root' }])
    } else {
      const newPath = [...folderPath, { id: folderId, name: folderName }]
      setFolderPath(newPath)
    }
  }

  const navigateUp = () => {
    if (folderPath.length > 1) {
      const newPath = folderPath.slice(0, -1)
      setFolderPath(newPath)
      setCurrentFolderId(newPath[newPath.length - 1].id)
    }
  }

  const navigateToPath = (index: number) => {
    const newPath = folderPath.slice(0, index + 1)
    setFolderPath(newPath)
    setCurrentFolderId(newPath[newPath.length - 1].id)
  }

  const currentFolders = folders.filter((folder: VendorFolder) =>
    folder.parentId === currentFolderId
  )

  const currentFiles = files.filter((file: Document) =>
    file.folderId === currentFolderId
  )

  const filteredFiles = currentFiles.filter((file: Document) => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.fileName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = selectedType === 'all' ||
      (selectedType === 'images' && file.mimeType.startsWith('image/')) ||
      (selectedType === 'documents' && (file.mimeType.includes('document') || file.mimeType.includes('text'))) ||
      (selectedType === 'spreadsheets' && file.mimeType.includes('sheet')) ||
      (selectedType === 'pdfs' && file.mimeType.includes('pdf'))

    return matchesSearch && matchesType
  })

  const filteredFolders = currentFolders.filter((folder: VendorFolder) =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />
    if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />
    if (mimeType.includes('document') || mimeType.includes('text')) return <FileText className="h-8 w-8 text-blue-500" />
    if (mimeType.includes('sheet')) return <FileText className="h-8 w-8 text-green-500" />
    return <File className="h-8 w-8 text-gray-500" />
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadName(file.name.split('.').slice(0, -1).join('.'))
      setIsUploadModalOpen(true)
    }
  }

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate({
        file: selectedFile,
        name: uploadName || selectedFile.name,
        tagIds: uploadTagIds.length > 0 ? uploadTagIds : undefined
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Compact Combined Header - Excel Style */}
      <div className="bg-white border border-gray-200 rounded">
        {/* Top Row: Title, Breadcrumb, Actions */}
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-100">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Folder className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-xs font-medium text-gray-900">Files</span>
              <span className="text-[10px] text-gray-400">
                {filteredFolders.length} folders, {filteredFiles.length} files
              </span>
            </div>
            <div className="h-3 w-px bg-gray-200" />
            <div className="flex items-center space-x-1 text-[10px] min-w-0">
              <Home className="h-2.5 w-2.5 text-gray-400 flex-shrink-0" />
              {folderPath.map((pathItem, index) => (
                <div key={index} className="flex items-center space-x-1">
                  {index > 0 && <ChevronRight className="h-2.5 w-2.5 text-gray-300" />}
                  <button
                    onClick={() => navigateToPath(index)}
                    className={`hover:text-primary-600 truncate max-w-[80px] ${
                      index === folderPath.length - 1
                        ? 'text-gray-700 font-medium'
                        : 'text-gray-500'
                    }`}
                  >
                    {pathItem.name}
                  </button>
                </div>
              ))}
              {folderPath.length > 1 && (
                <button
                  onClick={navigateUp}
                  className="ml-1 text-gray-400 hover:text-gray-600"
                  title="Go up"
                >
                  <ArrowLeft className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsFolderModalOpen(true)}
              className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[10px] hover:bg-gray-200 flex items-center space-x-1"
            >
              <FolderPlus className="h-2.5 w-2.5" />
              <span>Folder</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary-600 text-white px-2 py-1 rounded text-[10px] hover:bg-primary-700 flex items-center space-x-1"
            >
              <Upload className="h-2.5 w-2.5" />
              <span>Upload</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Filters */}
        <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50">
          {/* Search */}
          <div className="relative flex-1 max-w-[200px]">
            <Search className="absolute left-2 top-1.5 h-3 w-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 w-full rounded border border-gray-300 py-1 px-2 text-[11px] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded border border-gray-300 py-1 px-2 text-[11px] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
          >
            <option value="all">All Types</option>
            <option value="images">Images</option>
            <option value="documents">Documents</option>
            <option value="spreadsheets">Spreadsheets</option>
            <option value="pdfs">PDFs</option>
          </select>

          {/* Tag Filter */}
          <FileTagFilter
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          multiple={false}
        />
      </div>

      {/* Folders - Compact Grid */}
      {filteredFolders.length > 0 && (
        <div className="bg-white border border-gray-200 rounded">
          <div className="px-2 py-1 border-b border-gray-100 bg-gray-50">
            <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wide">Folders ({filteredFolders.length})</span>
          </div>
          <div className="p-1.5">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1.5">
              {filteredFolders.map((folder: VendorFolder) => (
                <div
                  key={folder.id}
                  className="border border-gray-100 rounded px-2 py-1.5 hover:bg-gray-50 hover:border-gray-200 transition-colors cursor-pointer group"
                  onClick={() => navigateToFolder(folder.id, folder.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                      <Folder
                        className="h-3 w-3 flex-shrink-0"
                        style={{ color: folder.color }}
                      />
                      <span className="text-[11px] font-medium text-gray-900 truncate">{folder.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (folder._count.documents === 0 && folder._count.children === 0) {
                          deleteFolderMutation.mutate(folder.id)
                        } else {
                          toast.error('Cannot delete folder with contents')
                        }
                      }}
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  <div className="text-[9px] text-gray-400 mt-0.5">
                    {folder._count.documents} files
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Files - Excel-like Table */}
      {filteredFiles.length > 0 && (
        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-2 py-1 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-2 py-1 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wide w-20">Size</th>
                <th className="px-2 py-1 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wide w-24">Date</th>
                <th className="px-2 py-1 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wide w-28">Uploader</th>
                <th className="px-2 py-1 text-left text-[9px] font-medium text-gray-500 uppercase tracking-wide">Tags</th>
                <th className="px-2 py-1 text-right text-[9px] font-medium text-gray-500 uppercase tracking-wide w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file: Document, index: number) => (
                <tr
                  key={file.id}
                  className={`border-b border-gray-50 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <td className="px-2 py-1">
                    <div className="flex items-center space-x-1.5">
                      <div className="flex-shrink-0">
                        {file.mimeType.startsWith('image/') ? <Image className="h-3 w-3 text-blue-500" /> :
                         file.mimeType.includes('pdf') ? <FileText className="h-3 w-3 text-red-500" /> :
                         file.mimeType.includes('document') ? <FileText className="h-3 w-3 text-blue-500" /> :
                         file.mimeType.includes('sheet') ? <FileText className="h-3 w-3 text-green-500" /> :
                         <File className="h-3 w-3 text-gray-400" />}
                      </div>
                      <span className="text-[11px] font-medium text-gray-900 truncate max-w-[200px]">{file.name}</span>
                      {file.isShared && <Share2 className="h-2.5 w-2.5 text-blue-500 flex-shrink-0" />}
                    </div>
                  </td>
                  <td className="px-2 py-1 text-[10px] text-gray-500">{formatFileSize(file.fileSize)}</td>
                  <td className="px-2 py-1 text-[10px] text-gray-500">{new Date(file.createdAt).toLocaleDateString()}</td>
                  <td className="px-2 py-1 text-[10px] text-gray-500 truncate">{file.uploader.firstName} {file.uploader.lastName}</td>
                  <td className="px-2 py-1">
                    {file.tags && file.tags.length > 0 ? (
                      <FileTagPills tags={file.tags} maxVisible={2} size="xs" />
                    ) : (
                      <span className="text-[9px] text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex items-center justify-end space-x-0.5">
                      <button
                        onClick={() => {
                          setEditingTagsFile(file)
                          setEditingTagIds(file.tags?.map(t => t.id) || [])
                        }}
                        className={`p-0.5 rounded ${file.tags && file.tags.length > 0 ? 'text-primary-500' : 'text-gray-400'} hover:text-primary-600 hover:bg-primary-50`}
                        title="Tags"
                      >
                        <Tag className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleView(file, filteredFiles.indexOf(file))}
                        className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        title="View"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDownload(file)}
                        className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        title="Download"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => shareMutation.mutate({ fileId: file.id, isShared: !file.isShared })}
                        className={`p-0.5 rounded ${file.isShared ? 'text-blue-500' : 'text-gray-400'} hover:text-blue-600 hover:bg-blue-50`}
                        title="Share"
                      >
                        <Share2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(file.id)}
                        className="p-0.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredFiles.length === 0 && filteredFolders.length === 0 && (
        <div className="bg-white border border-gray-200 rounded p-4 text-center">
          <Folder className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <div className="text-xs text-gray-500 mb-2">
            {searchTerm || selectedType !== 'all' || selectedTagIds.length > 0
              ? 'No files or folders match your filters'
              : 'No files or folders in this directory'}
          </div>
          {(!searchTerm && selectedType === 'all' && selectedTagIds.length === 0) && (
            <div className="space-x-2">
              <button
                onClick={() => setIsFolderModalOpen(true)}
                className="text-[10px] text-gray-600 hover:text-gray-700 font-medium"
              >
                Create folder
              </button>
              <span className="text-[10px] text-gray-400">or</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] text-primary-600 hover:text-primary-700 font-medium"
              >
                Upload file
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && selectedFile && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => { setIsUploadModalOpen(false); setUploadTagIds([]) }} />

            <div className="relative transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={() => { setIsUploadModalOpen(false); setUploadTagIds([]) }}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">
                    Upload File
                  </h3>

                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      {getFileIcon(selectedFile.type)}
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="fileName" className="block text-sm font-medium text-gray-700">
                        Display Name
                      </label>
                      <input
                        id="fileName"
                        type="text"
                        value={uploadName}
                        onChange={(e) => setUploadName(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="Enter a display name for this file"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tags
                      </label>
                      <FileTagSelector
                        selectedTagIds={uploadTagIds}
                        onChange={setUploadTagIds}
                        size="md"
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => { setIsUploadModalOpen(false); setUploadTagIds([]) }}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleUpload}
                        disabled={uploadMutation.isPending}
                        className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                      >
                        {uploadMutation.isPending ? 'Uploading...' : 'Upload File'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsFolderModalOpen(false)} />

            <div className="relative transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={() => setIsFolderModalOpen(false)}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">
                    Create New Folder
                  </h3>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      const formData = new FormData(e.currentTarget)
                      createFolderMutation.mutate({
                        name: formData.get('name') as string,
                        description: formData.get('description') as string,
                        color: formData.get('color') as string,
                        parentId: currentFolderId
                      })
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label htmlFor="folderName" className="block text-sm font-medium text-gray-700">
                        Folder Name *
                      </label>
                      <input
                        id="folderName"
                        name="name"
                        type="text"
                        required
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="e.g., Contracts, Invoices, Licenses"
                      />
                    </div>

                    <div>
                      <label htmlFor="folderDescription" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        id="folderDescription"
                        name="description"
                        rows={3}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="Optional description for this folder..."
                      />
                    </div>

                    <div>
                      <label htmlFor="folderColor" className="block text-sm font-medium text-gray-700">
                        Color
                      </label>
                      <div className="mt-1 flex items-center space-x-3">
                        <input
                          id="folderColor"
                          name="color"
                          type="color"
                          defaultValue="#6366f1"
                          className="h-10 w-16 rounded-md border border-gray-300 cursor-pointer"
                        />
                        <span className="text-sm text-gray-500">Choose a color to identify this folder</span>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsFolderModalOpen(false)}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={createFolderMutation.isPending}
                        className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                      >
                        {createFolderMutation.isPending ? 'Creating...' : 'Create Folder'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tags Modal */}
      {editingTagsFile && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setEditingTagsFile(null)} />

            <div className="relative transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={() => setEditingTagsFile(null)}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mt-3 sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Edit File Tags
                </h3>
                <div className="mb-2 text-sm text-gray-600 truncate">
                  {editingTagsFile.name}
                </div>

                <div className="space-y-4">
                  <FileTagSelector
                    selectedTagIds={editingTagIds}
                    onChange={setEditingTagIds}
                    size="md"
                  />

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingTagsFile(null)}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => tagsMutation.mutate({ fileId: editingTagsFile.id, tagIds: editingTagIds })}
                      disabled={tagsMutation.isPending}
                      className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      {tagsMutation.isPending ? 'Saving...' : 'Save Tags'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Viewer */}
      {viewerFile && (
        <FileViewer
          file={viewerFile}
          files={filteredFiles}
          currentIndex={viewerFileIndex}
          onClose={handleViewerClose}
          onNavigate={handleViewerNavigate}
          onShare={(fileId, isShared) => shareMutation.mutate({ fileId, isShared })}
          onDownload={handleDownload}
        />
      )}
    </div>
  )
}
