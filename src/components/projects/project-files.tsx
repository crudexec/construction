'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileViewer } from '@/components/files/file-viewer'
import { 
  Upload,
  Search,
  Filter,
  Download,
  Eye,
  Share2,
  Trash2,
  FileText,
  Image,
  File,
  Calendar,
  User,
  MoreHorizontal,
  X,
  Plus,
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Home
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ProjectFilesProps {
  projectId: string
}

interface ProjectFolder {
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
  uploader: {
    id: string
    firstName: string
    lastName: string
  }
  createdAt: string
  updatedAt: string
}

async function fetchProjectFiles(projectId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/project/${projectId}/files`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch files')
  return response.json()
}

async function uploadFile(projectId: string, file: File, name?: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const formData = new FormData()
  formData.append('file', file)
  if (name) formData.append('name', name)
  
  const response = await fetch(`/api/project/${projectId}/files`, {
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
    
  const response = await fetch(`/api/document/${fileId}`, {
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
    
  const response = await fetch(`/api/document/${fileId}`, {
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

async function fetchProjectFolders(projectId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/project/${projectId}/folders`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch folders')
  return response.json()
}

async function createFolder(projectId: string, data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/project/${projectId}/folders`, {
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
    
  const response = await fetch(`/api/folder/${folderId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to delete folder')
  return response.json()
}

export function ProjectFiles({ projectId }: ProjectFilesProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [uploadName, setUploadName] = useState('')
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
    queryKey: ['project-files', projectId],
    queryFn: () => fetchProjectFiles(projectId),
    enabled: !!projectId
  })

  const { data: folders = [] } = useQuery({
    queryKey: ['project-folders', projectId],
    queryFn: () => fetchProjectFolders(projectId),
    enabled: !!projectId
  })

  const uploadMutation = useMutation({
    mutationFn: ({ file, name }: { file: File, name?: string }) => uploadFile(projectId, file, name),
    onSuccess: () => {
      toast.success('File uploaded successfully!')
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      setIsUploadModalOpen(false)
      setSelectedFile(null)
      setUploadName('')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to upload file')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      toast.success('File deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
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
      queryClient.invalidateQueries({ queryKey: ['project-files', projectId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update sharing')
    }
  })

  const handleDownload = async (file: Document) => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]
      
      // Use our secure file serving endpoint
      const response = await fetch(`/api/files/${file.id}?download=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': document.cookie
        }
      })
      
      if (!response.ok) throw new Error('Failed to download file')
      
      const blob = await response.blob()
      
      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.fileName
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success(`Downloaded ${file.name}`)
    } catch (error) {
      toast.error('Failed to download file')
      console.error('Download error:', error)
    }
  }

  const handleView = (file: Document, index?: number) => {
    // Open file in the new viewer
    setViewerFile(file)
    if (index !== undefined) {
      setViewerFileIndex(index)
    } else {
      // Find the index of the file in the filtered list
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
    mutationFn: (data: any) => createFolder(projectId, data),
    onSuccess: () => {
      toast.success('Folder created successfully!')
      queryClient.invalidateQueries({ queryKey: ['project-folders', projectId] })
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
      queryClient.invalidateQueries({ queryKey: ['project-folders', projectId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete folder')
    }
  })

  const fileTypes = ['images', 'documents', 'spreadsheets', 'pdfs']

  // Navigation helpers
  const navigateToFolder = (folderId: string | null, folderName: string) => {
    setCurrentFolderId(folderId)
    if (folderId === null) {
      setFolderPath([{ id: null, name: 'Root' }])
    } else {
      const folder = folders.find((f: ProjectFolder) => f.id === folderId)
      if (folder) {
        const newPath = [...folderPath, { id: folderId, name: folderName }]
        setFolderPath(newPath)
      }
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

  // Filter files and folders for current directory
  const currentFolders = folders.filter((folder: ProjectFolder) => 
    folder.parentId === currentFolderId
  )

  const currentFiles = files.filter((file: Document) => 
    file.folderId === currentFolderId
  )

  // Apply search and type filters (moved declaration before handleView)
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

  const filteredFolders = currentFolders.filter((folder: ProjectFolder) =>
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
        name: uploadName || selectedFile.name 
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
    <div className="space-y-3">
      {/* Compact Header with Actions */}
      <div className="bg-white p-3 rounded-lg shadow">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-sm font-semibold text-gray-900">Files</h2>
            <div className="text-xs text-gray-500">
              {filteredFolders.length} folders, {filteredFiles.length} files
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFolderModalOpen(true)}
              className="bg-gray-600 text-white px-3 py-1.5 rounded text-xs hover:bg-gray-700 flex items-center space-x-1"
            >
              <FolderPlus className="h-3 w-3" />
              <span>Folder</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary-600 text-white px-3 py-1.5 rounded text-xs hover:bg-primary-700 flex items-center space-x-1"
            >
              <Upload className="h-3 w-3" />
              <span>Upload</span>
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          multiple={false}
        />
      </div>

      {/* Compact Navigation & Filters */}
      <div className="bg-white p-3 rounded-lg shadow">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center space-x-2 text-xs">
            <Home className="h-3 w-3 text-gray-400" />
            {folderPath.map((pathItem, index) => (
              <div key={index} className="flex items-center space-x-1">
                {index > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
                <button
                  onClick={() => navigateToPath(index)}
                  className={`hover:text-primary-600 ${
                    index === folderPath.length - 1 
                      ? 'text-gray-900 font-medium' 
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
                className="ml-2 text-gray-400 hover:text-gray-600"
                title="Go up"
              >
                <ArrowLeft className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full rounded-md border border-gray-300 py-1.5 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-md border border-gray-300 py-1.5 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All Types</option>
            <option value="images">Images</option>
            <option value="documents">Documents</option>
            <option value="spreadsheets">Spreadsheets</option>
            <option value="pdfs">PDFs</option>
          </select>
        </div>
      </div>

      {/* Compact Files and Folders Grid */}
      <div className="space-y-2">
        {/* Folders */}
        {filteredFolders.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-2 border-b">
              <h3 className="text-xs font-medium text-gray-700">Folders ({filteredFolders.length})</h3>
            </div>
            <div className="p-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {filteredFolders.map((folder: ProjectFolder) => (
                  <div 
                    key={folder.id} 
                    className="bg-gray-50 rounded p-2 hover:bg-gray-100 transition-colors cursor-pointer group"
                    onClick={() => navigateToFolder(folder.id, folder.name)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2 flex-1">
                        <div 
                          className="w-5 h-5 rounded flex items-center justify-center"
                          style={{ backgroundColor: folder.color + '20' }}
                        >
                          <Folder 
                            className="h-3 w-3" 
                            style={{ color: folder.color }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-medium text-gray-900 truncate">{folder.name}</h4>
                        </div>
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
                        className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">
                      {folder._count.documents} files, {folder._count.children} folders
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Files */}
        {filteredFiles.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-2 border-b">
              <h3 className="text-xs font-medium text-gray-700">Files ({filteredFiles.length})</h3>
            </div>
            <div className="p-2">
              <div className="space-y-1">
                {filteredFiles.map((file: Document) => (
                  <div key={file.id} className="bg-gray-50 rounded p-2 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1">
                        <div className="flex-shrink-0">
                          {file.mimeType.startsWith('image/') ? <Image className="h-4 w-4 text-blue-500" /> :
                           file.mimeType.includes('pdf') ? <FileText className="h-4 w-4 text-red-500" /> :
                           file.mimeType.includes('document') ? <FileText className="h-4 w-4 text-blue-500" /> :
                           file.mimeType.includes('sheet') ? <FileText className="h-4 w-4 text-green-500" /> :
                           <File className="h-4 w-4 text-gray-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-xs font-medium text-gray-900 truncate">{file.name}</h4>
                            {file.isShared && <Share2 className="h-3 w-3 text-blue-500" />}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>{formatFileSize(file.fileSize)}</span>
                            <span>•</span>
                            <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{file.uploader.firstName} {file.uploader.lastName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleView(file, filteredFiles.indexOf(file))}
                          className="text-gray-400 hover:text-gray-600"
                          title="View"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDownload(file)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Download"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => shareMutation.mutate({ fileId: file.id, isShared: !file.isShared })}
                          className={`${file.isShared ? 'text-blue-500' : 'text-gray-400'} hover:text-blue-600`}
                          title="Share"
                        >
                          <Share2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(file.id)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {filteredFiles.length === 0 && filteredFolders.length === 0 && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <Folder className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <div className="text-sm text-gray-500 mb-3">
            {searchTerm || selectedType !== 'all'
              ? 'No files or folders match your filters'
              : 'No files or folders in this directory'}
          </div>
          {(!searchTerm && selectedType === 'all') && (
            <div className="space-x-3">
              <button
                onClick={() => setIsFolderModalOpen(true)}
                className="text-xs text-gray-600 hover:text-gray-700 font-medium"
              >
                Create folder
              </button>
              <span className="text-gray-400">or</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
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
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsUploadModalOpen(false)} />
            
            <div className="relative transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={() => setIsUploadModalOpen(false)}
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

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsUploadModalOpen(false)}
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
                        placeholder="e.g., Contracts, Plans, Photos"
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