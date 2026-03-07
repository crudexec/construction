'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Loader2, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

interface Template {
  id: string
  name: string
  isDefault: boolean
}

interface GenerateDocumentButtonProps {
  recordType: 'change-order' | 'purchase-order' | 'vendor-contract' | 'estimate' | 'bid'
  recordId: string
  templateType: string
  variant?: 'button' | 'icon' | 'dropdown'
  size?: 'sm' | 'md'
  className?: string
}

export function GenerateDocumentButton({
  recordType,
  recordId,
  templateType,
  variant = 'button',
  size = 'md',
  className = '',
}: GenerateDocumentButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)

  // Fetch templates when dropdown is opened
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

  const generateDocument = async (templateId: string) => {
    setIsGenerating(true)
    setShowDropdown(false)

    try {
      // Call the generate API
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

      const { html, filename } = await response.json()

      // Use html2pdf.js to convert HTML to PDF
      const html2pdf = (await import('html2pdf.js')).default

      // Create a temporary container for the HTML
      const container = document.createElement('div')
      container.innerHTML = html
      container.style.width = '8.5in'
      container.style.padding = '0.5in'
      container.style.fontFamily = 'Arial, sans-serif'
      container.style.fontSize = '12px'
      container.style.lineHeight = '1.5'
      document.body.appendChild(container)

      // Generate PDF
      await html2pdf()
        .set({
          margin: [0.5, 0.5, 0.5, 0.5],
          filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        })
        .from(container)
        .save()

      // Clean up
      document.body.removeChild(container)

      toast.success('Document generated successfully')
    } catch (error) {
      console.error('Error generating document:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate document')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClick = async () => {
    // If we have templates cached and there's a default, use it directly
    if (templates.length > 0) {
      const defaultTemplate = templates.find((t) => t.isDefault)
      if (defaultTemplate) {
        await generateDocument(defaultTemplate.id)
        return
      }
    }

    // Otherwise, fetch templates first
    await fetchTemplates()

    // After fetching, try to find default or show dropdown
    if (templates.length === 0) {
      toast.error('No templates available. Please create a template first.')
      return
    }

    if (templates.length === 1) {
      await generateDocument(templates[0].id)
    } else {
      setShowDropdown(true)
    }
  }

  const handleDropdownClick = () => {
    if (!showDropdown) {
      fetchTemplates()
    }
    setShowDropdown(!showDropdown)
  }

  // Icon variant
  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={isGenerating}
        className={`p-1.5 text-gray-400 hover:text-blue-600 disabled:opacity-50 ${className}`}
        title="Generate Document"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
      </button>
    )
  }

  // Dropdown variant
  if (variant === 'dropdown') {
    return (
      <div className="relative">
        <button
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
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 mt-1 w-56 bg-white rounded-md shadow-lg z-20 border py-1">
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
                    onClick={() => generateDocument(template.id)}
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
    )
  }

  // Default button variant
  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-1.5 text-xs'
    : 'px-3 py-2 text-sm'

  return (
    <button
      onClick={handleClick}
      disabled={isGenerating}
      className={`inline-flex items-center ${sizeClasses} font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 ${className}`}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileText className="h-4 w-4 mr-2" />
      )}
      {isGenerating ? 'Generating...' : 'Generate PDF'}
    </button>
  )
}
