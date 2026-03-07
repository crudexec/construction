'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { DocumentTemplateType } from '@prisma/client'
import { TemplateList, Template } from '@/components/documents/template-list'
import { TemplateEditor } from '@/components/documents/template-builder'
import { useAuthStore } from '@/store/auth'

export default function DocumentTemplatesPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      toast.error('Access denied. Admin only.')
      router.push('/dashboard')
    }
  }, [user, router])

  // Fetch templates
  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/document-templates')
      if (!response.ok) throw new Error('Failed to fetch templates')
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = () => {
    setIsCreating(true)
    setEditingTemplate(null)
  }

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setIsCreating(false)
  }

  const handleSave = async (data: {
    name: string
    description: string
    type: DocumentTemplateType
    content: string
  }) => {
    try {
      const url = editingTemplate
        ? `/api/document-templates/${editingTemplate.id}`
        : '/api/document-templates'
      const method = editingTemplate ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save template')
      }

      toast.success(editingTemplate ? 'Template updated' : 'Template created')
      setEditingTemplate(null)
      setIsCreating(false)
      fetchTemplates()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save template')
      throw error
    }
  }

  const handleCancel = () => {
    setEditingTemplate(null)
    setIsCreating(false)
  }

  const handleDelete = async (templateId: string) => {
    try {
      const response = await fetch(`/api/document-templates/${templateId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete template')
      }

      toast.success('Template deleted')
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete template')
    }
  }

  const handleSetDefault = async (templateId: string) => {
    try {
      const response = await fetch(`/api/document-templates/${templateId}/set-default`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to set default template')
      }

      toast.success('Default template updated')
      fetchTemplates()
    } catch (error) {
      console.error('Error setting default:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to set default')
    }
  }

  const handleDuplicate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/document-templates/${templateId}/duplicate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to duplicate template')
      }

      toast.success('Template duplicated')
      fetchTemplates()
    } catch (error) {
      console.error('Error duplicating template:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate template')
    }
  }

  // Show editor if creating or editing
  if (isCreating || editingTemplate) {
    return (
      <div className="max-w-7xl mx-auto">
        <TemplateEditor
          initialName={editingTemplate?.name}
          initialDescription={editingTemplate?.description || ''}
          initialType={editingTemplate?.type || 'CHANGE_ORDER'}
          initialContent={editingTemplate?.content || ''}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <TemplateList
          templates={templates}
          onEdit={handleEdit}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onSetDefault={handleSetDefault}
          onDuplicate={handleDuplicate}
        />
      )}
    </div>
  )
}
