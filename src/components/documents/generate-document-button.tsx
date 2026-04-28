'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { FileText, Loader2, X, Download, Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Undo, Redo, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

interface Template {
  id: string
  name: string
  isDefault: boolean
}

interface GenerateDocumentButtonProps {
  recordType: 'change-order' | 'lien-release' | 'purchase-order' | 'vendor-contract' | 'estimate' | 'bid'
  recordId: string
  templateType: string
  variant?: 'button' | 'icon' | 'dropdown'
  size?: 'sm' | 'md'
  className?: string
  autoSaveMode?: 'default' | 'vendor-files' | 'lien-release-document' | 'none'
  autoSaveTargetId?: string
  autoSaveDocumentKind?: string
  onAutoSaveSuccess?: () => void
}

interface PreviewData {
  html: string
  filename: string
  vendorId?: string
  templateId: string
}

export function GenerateDocumentButton({
  recordType,
  recordId,
  templateType,
  variant = 'button',
  size = 'md',
  className = '',
  autoSaveMode = 'default',
  autoSaveTargetId,
  autoSaveDocumentKind = 'DRAFT_RELEASE',
  onAutoSaveSuccess,
}: GenerateDocumentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)

  // Dropdown state
  const [templates, setTemplates] = useState<Template[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Fetch templates for dropdown
  const fetchTemplates = async () => {
    if (templates.length > 0) return

    setIsLoadingTemplates(true)
    try {
      const response = await fetch(`/api/document-templates?type=${templateType}&activeOnly=true`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  // Handle dropdown click with fixed positioning
  const handleDropdownClick = () => {
    if (!showDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.right - 224, // 224 = w-56 (14rem)
      })
      fetchTemplates()
    }
    setShowDropdown(!showDropdown)
  }

  // Generate document with specific template (for dropdown)
  const generateWithTemplate = async (templateId: string) => {
    setIsGenerating(true)
    setShowDropdown(false)

    try {
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          recordType,
          recordId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate document')
      }

      const { html, filename, vendorId } = await response.json()

      setPreviewData({
        html,
        filename,
        vendorId,
        templateId,
      })
      setShowPreview(true)
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate document')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePreview = async () => {
    setIsLoading(true)

    try {
      // Fetch templates and find the active/default one
      const templatesResponse = await fetch(`/api/document-templates?type=${templateType}&activeOnly=true`)
      if (!templatesResponse.ok) {
        throw new Error('Failed to fetch templates')
      }

      const data = await templatesResponse.json()
      const templates = data.templates || []

      if (templates.length === 0) {
        toast.error('No templates available. Please create a template first.')
        return
      }

      // Use default template, or first one if no default is set
      const activeTemplate = templates.find((t: { isDefault: boolean }) => t.isDefault) || templates[0]

      // Generate HTML preview
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: activeTemplate.id,
          recordType,
          recordId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate preview')
      }

      const { html, filename, vendorId } = await response.json()

      setPreviewData({
        html,
        filename,
        vendorId,
        templateId: activeTemplate.id,
      })
      setShowPreview(true)
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate preview')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async (finalHtml: string) => {
    if (!previewData) return

    setIsGenerating(true)

    try {
      // Use html2pdf.js to convert HTML to PDF
      const html2pdf = (await import('html2pdf.js')).default

      // Create a temporary container for the HTML
      const container = document.createElement('div')
      container.innerHTML = finalHtml
      // Match the printable content area for letter paper with 0.5in margins.
      container.style.width = '7.5in'
      container.style.maxWidth = '7.5in'
      container.style.padding = '0'
      container.style.margin = '0 auto'
      container.style.boxSizing = 'border-box'
      container.style.backgroundColor = '#ffffff'
      container.style.overflowWrap = 'anywhere'
      container.style.fontFamily = 'Arial, sans-serif'
      container.style.fontSize = '12px'
      container.style.lineHeight = '1.5'
      document.body.appendChild(container)

      // Generate PDF and get blob for auto-save
      const pdfBlob = await html2pdf()
        .set({
          margin: [0.5, 0.5, 0.5, 0.5],
          filename: previewData.filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        })
        .from(container)
        .outputPdf('blob')

      // Download the PDF
      const url = window.URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = previewData.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      // Clean up
      document.body.removeChild(container)

      if (autoSaveMode === 'lien-release-document' && autoSaveTargetId) {
        try {
          const formData = new FormData()
          formData.append('file', pdfBlob, previewData.filename)
          formData.append('kind', autoSaveDocumentKind)

          const saveResponse = await fetch(`/api/lien-releases/${autoSaveTargetId}/documents`, {
            method: 'POST',
            body: formData,
          })

          if (saveResponse.ok) {
            toast.success('Document generated and saved to lien release')
            onAutoSaveSuccess?.()
          } else {
            toast.success('Document generated (auto-save failed)')
          }
        } catch (saveError) {
          console.error('Error auto-saving lien release document:', saveError)
          toast.success('Document generated (auto-save failed)')
        }
      } else if ((autoSaveMode === 'vendor-files' || autoSaveMode === 'default') && previewData.vendorId) {
        try {
          const formData = new FormData()
          formData.append('file', pdfBlob, previewData.filename)
          formData.append('filename', previewData.filename)
          formData.append('documentType', recordType)

          const saveResponse = await fetch(`/api/vendor/${previewData.vendorId}/files/auto-save`, {
            method: 'POST',
            body: formData,
          })

          if (saveResponse.ok) {
            toast.success('Document generated and saved to vendor files')
            onAutoSaveSuccess?.()
          } else {
            toast.success('Document generated (auto-save to vendor failed)')
          }
        } catch (saveError) {
          console.error('Error auto-saving document:', saveError)
          toast.success('Document generated (auto-save to vendor failed)')
        }
      } else {
        toast.success('Document generated successfully')
      }

      setShowPreview(false)
      setPreviewData(null)
    } catch (error) {
      console.error('Error generating document:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate document')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClose = () => {
    setShowPreview(false)
    setPreviewData(null)
  }

  // Icon variant
  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handlePreview}
          disabled={isLoading}
          className={`p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-50 ${className}`}
          title="Generate Document"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
        </button>
        {showPreview && previewData && (
          <PreviewModal
            previewData={previewData}
            isGenerating={isGenerating}
            onDownload={handleDownload}
            onClose={handleClose}
          />
        )}
      </>
    )
  }

  // Dropdown variant with fixed positioning to prevent clipping
  if (variant === 'dropdown') {
    return (
      <>
        <div className="relative inline-block">
          <button
            ref={buttonRef}
            onClick={handleDropdownClick}
            disabled={isGenerating}
            className={`inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 ${className}`}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Generate
            <ChevronDown className="h-4 w-4 ml-1" />
          </button>

          {showDropdown && (
            <>
              {/* Backdrop to close dropdown */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdown(false)}
              />
              {/* Dropdown menu with fixed positioning */}
              <div
                className="fixed w-56 bg-white rounded-md shadow-lg z-50 border py-1"
                style={{
                  top: dropdownPosition.top,
                  left: Math.max(8, dropdownPosition.left) // Prevent going off-screen
                }}
              >
                {isLoadingTemplates ? (
                  <div className="px-4 py-2 text-sm text-gray-500 flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading templates...
                  </div>
                ) : templates.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-gray-500">
                    No templates available
                  </div>
                ) : (
                  templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => generateWithTemplate(template.id)}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <FileText className="h-4 w-4 mr-3 text-gray-400" />
                      {template.name}
                      {template.isDefault && (
                        <span className="ml-auto text-xs text-gray-400">Default</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
        {showPreview && previewData && (
          <PreviewModal
            previewData={previewData}
            isGenerating={isGenerating}
            onDownload={handleDownload}
            onClose={handleClose}
          />
        )}
      </>
    )
  }

  // Default button variant
  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-1.5 text-xs'
    : 'px-3 py-2 text-sm'

  return (
    <>
      <button
        onClick={handlePreview}
        disabled={isLoading}
        className={`inline-flex items-center ${sizeClasses} font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 ${className}`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileText className="h-4 w-4 mr-2" />
        )}
        {isLoading ? 'Loading...' : 'Generate PDF'}
      </button>
      {showPreview && previewData && (
        <PreviewModal
          previewData={previewData}
          isGenerating={isGenerating}
          onDownload={handleDownload}
          onClose={handleClose}
        />
      )}
    </>
  )
}

// Editor Toolbar Component
function EditorToolbar({ onFormat }: { onFormat: (command: string, value?: string) => void }) {
  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b bg-gray-50">
      <select
        onChange={(e) => onFormat('formatBlock', e.target.value)}
        className="px-2 py-1 border rounded text-sm bg-white"
        defaultValue=""
      >
        <option value="">Normal</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
      <div className="w-px h-6 bg-gray-300 mx-1" />
      <button
        type="button"
        onClick={() => onFormat('bold')}
        className="p-1.5 rounded hover:bg-gray-200"
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onFormat('italic')}
        className="p-1.5 rounded hover:bg-gray-200"
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onFormat('underline')}
        className="p-1.5 rounded hover:bg-gray-200"
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1" />
      <button
        type="button"
        onClick={() => onFormat('insertUnorderedList')}
        className="p-1.5 rounded hover:bg-gray-200"
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onFormat('insertOrderedList')}
        className="p-1.5 rounded hover:bg-gray-200"
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1" />
      <button
        type="button"
        onClick={() => onFormat('justifyLeft')}
        className="p-1.5 rounded hover:bg-gray-200"
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onFormat('justifyCenter')}
        className="p-1.5 rounded hover:bg-gray-200"
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onFormat('justifyRight')}
        className="p-1.5 rounded hover:bg-gray-200"
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1" />
      <button
        type="button"
        onClick={() => onFormat('undo')}
        className="p-1.5 rounded hover:bg-gray-200"
        title="Undo (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onFormat('redo')}
        className="p-1.5 rounded hover:bg-gray-200"
        title="Redo (Ctrl+Y)"
      >
        <Redo className="h-4 w-4" />
      </button>
    </div>
  )
}

// Preview Modal Component with Editing
function PreviewModal({
  previewData,
  isGenerating,
  onDownload,
  onClose,
}: {
  previewData: PreviewData
  isGenerating: boolean
  onDownload: (html: string) => void
  onClose: () => void
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isEditorMounted, setIsEditorMounted] = useState(false)

  // Initialize editor content after mount
  useEffect(() => {
    setIsEditorMounted(true)
  }, [])

  useEffect(() => {
    if (isEditorMounted && editorRef.current) {
      editorRef.current.innerHTML = previewData.html
    }
  }, [isEditorMounted, previewData.html])

  // Handle formatting commands
  const handleFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }, [])

  // Get current content for download
  const handleDownloadClick = () => {
    if (editorRef.current) {
      onDownload(editorRef.current.innerHTML)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-4 md:inset-6 lg:inset-8 bg-white rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-lg">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Edit & Preview Document</h3>
            <p className="text-sm text-gray-500">{previewData.filename}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDownloadClick}
              disabled={isGenerating}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <EditorToolbar onFormat={handleFormat} />

        {/* Editable Content */}
        <div className="flex-1 overflow-auto bg-gray-100 p-2">
          <div className="mx-auto bg-white shadow-lg rounded min-h-full" style={{ maxWidth: '100%' }}>
            {isEditorMounted ? (
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="px-6 py-4 focus:outline-none document-editor"
                style={{
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '11px',
                  lineHeight: '1.4',
                  minHeight: '100%',
                }}
              />
            ) : (
              <div className="p-6 flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Document editor styling */}
        <style jsx global>{`
          .document-editor table {
            width: 100% !important;
            border-collapse: collapse;
            margin: 1rem 0;
            table-layout: auto !important;
          }
          .document-editor table th,
          .document-editor table td {
            border: 1px solid #d1d5db;
            padding: 8px;
            white-space: nowrap;
          }
          .document-editor table th:first-child,
          .document-editor table td:first-child {
            white-space: normal;
            word-wrap: break-word;
          }
          .document-editor table th {
            background-color: #f3f4f6;
            font-weight: 600;
          }
        `}</style>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t bg-gray-50 rounded-b-lg">
          <p className="text-xs text-gray-500 text-center">
            Click anywhere in the document to edit. Use the toolbar above for formatting. Changes will be included in the downloaded PDF.
          </p>
        </div>
      </div>
    </div>
  )
}
