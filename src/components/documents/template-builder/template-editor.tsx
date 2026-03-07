'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { DocumentTemplateType } from '@prisma/client'
import { Save, X, Eye, Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { VariablePicker } from './variable-picker'
import { TemplatePreview } from './template-preview'

interface TemplateEditorProps {
  initialName?: string
  initialDescription?: string
  initialType?: DocumentTemplateType
  initialContent?: string
  onSave: (data: {
    name: string
    description: string
    type: DocumentTemplateType
    content: string
  }) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const DOCUMENT_TYPES: { value: DocumentTemplateType; label: string }[] = [
  { value: 'CHANGE_ORDER', label: 'Change Order' },
  { value: 'PURCHASE_ORDER', label: 'Purchase Order' },
  { value: 'VENDOR_CONTRACT', label: 'Vendor Contract' },
  { value: 'ESTIMATE', label: 'Estimate' },
  { value: 'BID', label: 'Bid' },
  { value: 'INTENT_TO_AWARD', label: 'Intent to Award' },
  { value: 'NON_COMPLIANCE_NOTICE', label: 'Non-Compliance Notice' },
  { value: 'CUSTOM', label: 'Custom' },
]

// Simple rich text editor toolbar component
function EditorToolbar({ onFormat }: { onFormat: (command: string, value?: string) => void }) {
  return (
    <div className="flex items-center gap-1 p-2 border-b bg-gray-50">
      <select
        onChange={(e) => onFormat('formatBlock', e.target.value)}
        className="px-2 py-1 border rounded text-sm"
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
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onFormat('italic')}
        className="p-1.5 rounded hover:bg-gray-200"
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onFormat('underline')}
        className="p-1.5 rounded hover:bg-gray-200"
        title="Underline"
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
    </div>
  )
}

export function TemplateEditor({
  initialName = '',
  initialDescription = '',
  initialType = 'CHANGE_ORDER',
  initialContent = '',
  onSave,
  onCancel,
  isLoading = false,
}: TemplateEditorProps) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [type, setType] = useState<DocumentTemplateType>(initialType)
  const [content, setContent] = useState(initialContent)
  const [showPreview, setShowPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditorMounted, setIsEditorMounted] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)

  // Initialize editor content after mount
  useEffect(() => {
    setIsEditorMounted(true)
  }, [])

  useEffect(() => {
    if (isEditorMounted && editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent
    }
  }, [isEditorMounted, initialContent])

  // Handle formatting commands
  const handleFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }, [])

  // Insert variable at cursor position
  const handleInsertVariable = useCallback((variable: string) => {
    const editor = editorRef.current
    if (!editor) return

    editor.focus()
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.deleteContents()
      const textNode = document.createTextNode(variable)
      range.insertNode(textNode)
      range.setStartAfter(textNode)
      range.setEndAfter(textNode)
      selection.removeAllRanges()
      selection.addRange(range)
    } else {
      editor.innerHTML += variable
    }
    // Update content state
    setContent(editor.innerHTML)
  }, [])

  // Handle content changes in the editor
  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML)
    }
  }, [])

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a template name')
      return
    }
    if (!content.trim()) {
      alert('Please add content to the template')
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        type,
        content,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {initialName ? 'Edit Template' : 'Create Template'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Hide Preview' : 'Preview'}
            </button>
            <button
              onClick={onCancel}
              disabled={isSaving}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Change Order - Standard"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DocumentTemplateType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DOCUMENT_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this template"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Editor and Variable Picker */}
        <div className="flex gap-6">
          {/* Editor */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Content *
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Use variables like {'{{changeOrder.title}}'} to insert dynamic content.
              Click variables from the panel to insert them.
            </p>
            <div className="border rounded-md overflow-hidden">
              <EditorToolbar onFormat={handleFormat} />
              {isEditorMounted ? (
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleEditorInput}
                  suppressContentEditableWarning
                  className="p-4 bg-white min-h-[400px] focus:outline-none prose prose-sm max-w-none"
                  style={{ minHeight: '400px' }}
                />
              ) : (
                <div className="p-4 bg-white min-h-[400px] flex items-center justify-center">
                  <span className="text-gray-400">Loading editor...</span>
                </div>
              )}
            </div>
          </div>

          {/* Variable Picker */}
          <div className="w-72 flex-shrink-0">
            <VariablePicker
              documentType={type}
              onInsert={handleInsertVariable}
            />
          </div>
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <div className="mt-6">
            <TemplatePreview content={content} documentType={type} />
          </div>
        )}
      </div>
    </div>
  )
}
