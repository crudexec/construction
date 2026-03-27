'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { DocumentTemplateType } from '@prisma/client'
import { Save, X, Eye, Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, FileText, ChevronLeft } from 'lucide-react'
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

// Compact rich text editor toolbar component
function EditorToolbar({ onFormat }: { onFormat: (command: string, value?: string) => void }) {
  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border-b bg-gray-50">
      <select
        onChange={(e) => onFormat('formatBlock', e.target.value)}
        className="px-1.5 py-0.5 border rounded text-[10px] bg-white"
        defaultValue=""
      >
        <option value="">Normal</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
      <div className="w-px h-4 bg-gray-300 mx-1" />
      <button
        type="button"
        onClick={() => onFormat('bold')}
        className="p-1 rounded hover:bg-gray-200"
        title="Bold"
      >
        <Bold className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => onFormat('italic')}
        className="p-1 rounded hover:bg-gray-200"
        title="Italic"
      >
        <Italic className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => onFormat('underline')}
        className="p-1 rounded hover:bg-gray-200"
        title="Underline"
      >
        <Underline className="h-3 w-3" />
      </button>
      <div className="w-px h-4 bg-gray-300 mx-1" />
      <button
        type="button"
        onClick={() => onFormat('insertUnorderedList')}
        className="p-1 rounded hover:bg-gray-200"
        title="Bullet List"
      >
        <List className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => onFormat('insertOrderedList')}
        className="p-1 rounded hover:bg-gray-200"
        title="Numbered List"
      >
        <ListOrdered className="h-3 w-3" />
      </button>
      <div className="w-px h-4 bg-gray-300 mx-1" />
      <button
        type="button"
        onClick={() => onFormat('justifyLeft')}
        className="p-1 rounded hover:bg-gray-200"
        title="Align Left"
      >
        <AlignLeft className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => onFormat('justifyCenter')}
        className="p-1 rounded hover:bg-gray-200"
        title="Align Center"
      >
        <AlignCenter className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => onFormat('justifyRight')}
        className="p-1 rounded hover:bg-gray-200"
        title="Align Right"
      >
        <AlignRight className="h-3 w-3" />
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
    <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
      {/* Compact Header */}
      <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Back to list"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <FileText className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-medium text-gray-900">
            {initialName ? 'Edit Template' : 'New Template'}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border ${
              showPreview
                ? 'bg-primary-50 text-primary-700 border-primary-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Eye className="h-3 w-3" />
            Preview
          </button>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-white bg-primary-600 rounded hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-3 w-3" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Form Fields - Compact Grid */}
      <div className="px-3 py-2 border-b bg-white">
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2">
            <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
              Template Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Change Order - Standard"
              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
              Document Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DocumentTemplateType)}
              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {DOCUMENT_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Editor and Variable Picker */}
      <div className="flex" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
        {/* Editor */}
        <div className="flex-1 flex flex-col border-r">
          <div className="px-2 py-1 border-b bg-gray-50 flex items-center justify-between">
            <span className="text-[10px] font-medium text-gray-600">Template Content</span>
            <span className="text-[10px] text-gray-400">Use {'{{variable}}'} to insert dynamic content</span>
          </div>
          <EditorToolbar onFormat={handleFormat} />
          <div className="flex-1 overflow-auto">
            {isEditorMounted ? (
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorInput}
                suppressContentEditableWarning
                className="p-3 bg-white h-full focus:outline-none prose prose-sm max-w-none text-xs"
              />
            ) : (
              <div className="p-3 bg-white h-full flex items-center justify-center">
                <span className="text-[10px] text-gray-400">Loading editor...</span>
              </div>
            )}
          </div>
        </div>

        {/* Variable Picker - More Compact */}
        <div className="w-56 flex-shrink-0 overflow-auto bg-gray-50">
          <VariablePicker
            documentType={type}
            onInsert={handleInsertVariable}
          />
        </div>
      </div>

      {/* Preview Panel */}
      {showPreview && (
        <div className="border-t">
          <div className="px-3 py-1.5 bg-gray-50 border-b">
            <span className="text-[10px] font-medium text-gray-600">Preview (with sample data)</span>
          </div>
          <div className="p-3 bg-gray-100 max-h-64 overflow-auto">
            <TemplatePreview content={content} documentType={type} />
          </div>
        </div>
      )}
    </div>
  )
}
