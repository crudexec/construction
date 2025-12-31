'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  X,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Info,
  FileText,
  Image as ImageIcon,
  File,
  Film,
  Music,
  Copy,
  Check,
  ExternalLink,
  Printer
} from 'lucide-react'
import toast from 'react-hot-toast'

interface FileViewerProps {
  file: {
    id: string
    name: string
    fileName: string
    fileSize: number
    mimeType: string
    url: string
    isShared: boolean
    uploader: {
      firstName: string
      lastName: string
    }
    createdAt: string
    updatedAt: string
  }
  files?: Array<any>
  currentIndex?: number
  onClose: () => void
  onNavigate?: (index: number) => void
  onShare?: (fileId: string, isShared: boolean) => void
  onDownload?: (file: any) => void
}

export function FileViewer({ 
  file, 
  files = [], 
  currentIndex = 0,
  onClose, 
  onNavigate,
  onShare,
  onDownload
}: FileViewerProps) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get secure file URL with auth token
  const getFileUrl = useCallback(() => {
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-token='))
      ?.split('=')[1]
    
    return `/api/files/${file.id}?t=${token}`
  }, [file.id])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          if (onNavigate && currentIndex > 0) {
            onNavigate(currentIndex - 1)
          }
          break
        case 'ArrowRight':
          if (onNavigate && currentIndex < files.length - 1) {
            onNavigate(currentIndex + 1)
          }
          break
        case '+':
        case '=':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            handleZoomIn()
          }
          break
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            handleZoomOut()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onNavigate, currentIndex, files.length])

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
    setIsFullscreen(!isFullscreen)
  }

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/api/files/${file.id}/share`
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Link copied to clipboard')
  }

  const handlePrint = () => {
    window.print()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const renderFileContent = () => {
    const fileUrl = getFileUrl()
    
    // Image files
    if (file.mimeType.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-900">
          <img
            src={fileUrl}
            alt={file.name}
            className="max-w-full max-h-full object-contain transition-transform duration-300"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            }}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false)
              setError('Failed to load image')
            }}
          />
        </div>
      )
    }
    
    // PDF files
    if (file.mimeType === 'application/pdf') {
      return (
        <div className="w-full h-full bg-gray-100">
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            title={file.name}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false)
              setError('Failed to load PDF')
            }}
          />
        </div>
      )
    }
    
    // Video files
    if (file.mimeType.startsWith('video/')) {
      return (
        <div className="flex items-center justify-center h-full bg-black">
          <video
            controls
            className="max-w-full max-h-full"
            style={{
              transform: `scale(${zoom / 100})`,
            }}
            onLoadedData={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false)
              setError('Failed to load video')
            }}
          >
            <source src={fileUrl} type={file.mimeType} />
            Your browser does not support the video tag.
          </video>
        </div>
      )
    }
    
    // Audio files
    if (file.mimeType.startsWith('audio/')) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="bg-white rounded-lg p-8 shadow-xl">
            <Music className="h-24 w-24 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 text-center mb-4">{file.name}</h3>
            <audio
              controls
              className="w-full"
              onLoadedData={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false)
                setError('Failed to load audio')
              }}
            >
              <source src={fileUrl} type={file.mimeType} />
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      )
    }
    
    // Text files (including code)
    if (file.mimeType.startsWith('text/') || 
        file.fileName.match(/\.(txt|md|json|js|jsx|ts|tsx|css|html|xml|yaml|yml)$/i)) {
      return (
        <div className="w-full h-full bg-gray-50 p-4 overflow-auto">
          <iframe
            src={fileUrl}
            className="w-full h-full bg-white rounded border border-gray-200 font-mono text-sm"
            title={file.name}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false)
              setError('Failed to load text file')
            }}
          />
        </div>
      )
    }
    
    // Unsupported file type
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <File className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Preview not available
          </h3>
          <p className="text-gray-500 mb-4">
            {file.name}
          </p>
          <button
            onClick={() => onDownload?.(file)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Download File
          </button>
        </div>
      </div>
    )
  }

  const getFileIcon = () => {
    if (file.mimeType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />
    if (file.mimeType === 'application/pdf') return <FileText className="h-4 w-4" />
    if (file.mimeType.startsWith('video/')) return <Film className="h-4 w-4" />
    if (file.mimeType.startsWith('audio/')) return <Music className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const showZoomControls = file.mimeType.startsWith('image/') || 
                           file.mimeType === 'application/pdf' ||
                           file.mimeType.startsWith('video/')

  const showRotateControl = file.mimeType.startsWith('image/')

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {getFileIcon()}
            <div>
              <h2 className="text-lg font-medium text-gray-900">{file.name}</h2>
              <p className="text-sm text-gray-500">
                {formatFileSize(file.fileSize)} • {new Date(file.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Navigation */}
            {files.length > 1 && onNavigate && (
              <>
                <button
                  onClick={() => onNavigate(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous file"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-sm text-gray-500">
                  {currentIndex + 1} / {files.length}
                </span>
                <button
                  onClick={() => onNavigate(currentIndex + 1)}
                  disabled={currentIndex === files.length - 1}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next file"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="w-px h-6 bg-gray-300 mx-2" />
              </>
            )}
            
            {/* Zoom controls */}
            {showZoomControls && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Zoom out"
                >
                  <ZoomOut className="h-5 w-5" />
                </button>
                <span className="text-sm text-gray-500 w-12 text-center">
                  {zoom}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Zoom in"
                >
                  <ZoomIn className="h-5 w-5" />
                </button>
                <div className="w-px h-6 bg-gray-300 mx-2" />
              </>
            )}
            
            {/* Rotate control */}
            {showRotateControl && (
              <>
                <button
                  onClick={handleRotate}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Rotate"
                >
                  <RotateCw className="h-5 w-5" />
                </button>
                <div className="w-px h-6 bg-gray-300 mx-2" />
              </>
            )}
            
            {/* Actions */}
            <button
              onClick={handlePrint}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Print"
            >
              <Printer className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`p-2 ${showInfo ? 'text-primary-600' : 'text-gray-400'} hover:text-gray-600`}
              title="File info"
            >
              <Info className="h-5 w-5" />
            </button>
            <button
              onClick={handleCopyLink}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Copy link"
            >
              {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
            </button>
            {onShare && (
              <button
                onClick={() => onShare(file.id, !file.isShared)}
                className={`p-2 ${file.isShared ? 'text-blue-500' : 'text-gray-400'} hover:text-blue-600`}
                title="Share"
              >
                <Share2 className="h-5 w-5" />
              </button>
            )}
            {onDownload && (
              <button
                onClick={() => onDownload(file)}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Download"
              >
                <Download className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-400 hover:text-gray-600"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 ml-2"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Content area */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <File className="h-24 w-24 text-gray-400 mx-auto mb-4" />
              <p className="text-red-500 mb-4">{error}</p>
              {onDownload && (
                <button
                  onClick={() => onDownload(file)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Instead
                </button>
              )}
            </div>
          </div>
        )}
        
        {!error && renderFileContent()}
        
        {/* Info sidebar */}
        {showInfo && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-lg p-4 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">File Information</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-xs text-gray-500">Name</dt>
                    <dd className="text-sm text-gray-900">{file.fileName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Type</dt>
                    <dd className="text-sm text-gray-900">{file.mimeType}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Size</dt>
                    <dd className="text-sm text-gray-900">{formatFileSize(file.fileSize)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Uploaded by</dt>
                    <dd className="text-sm text-gray-900">
                      {file.uploader.firstName} {file.uploader.lastName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Uploaded on</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(file.createdAt).toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Last modified</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(file.updatedAt).toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Sharing</dt>
                    <dd className="text-sm text-gray-900">
                      {file.isShared ? 'Shared' : 'Private'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}