'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, 
  Settings, 
  Trash2, 
  Edit, 
  Copy, 
  FileText, 
  Building,
  Home,
  Wrench,
  Store,
  Briefcase,
  Package,
  HardHat,
  Palette,
  Zap,
  Hammer
} from 'lucide-react'
import toast from 'react-hot-toast'
import { CreateTemplateModal } from './create-template-modal'
import { EditTemplateModal } from './edit-template-modal'

interface Template {
  id: string
  name: string
  description?: string
  icon?: string
  taskCategories: Array<{
    id: string
    name: string
    color?: string
    tasks: any[]
  }>
  budgetItems: any[]
  folders: any[]
}

const iconMap: Record<string, any> = {
  'building': Building,
  'home': Home,
  'wrench': Wrench,
  'store': Store,
  'briefcase': Briefcase,
  'package': Package,
  'hardhat': HardHat,
  'palette': Palette,
  'zap': Zap,
  'hammer': Hammer,
  'filetext': FileText
}

async function fetchTemplates() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch('/api/templates', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch templates')
  return response.json()
}

async function deleteTemplate(id: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/templates/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to delete template')
  return response.json()
}

export function TemplateManager() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const queryClient = useQueryClient()
  
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: fetchTemplates
  })
  
  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Template deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete template')
    }
  })
  
  const handleDelete = (template: Template) => {
    if (confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      deleteMutation.mutate(template.id)
    }
  }
  
  const getIcon = (iconName?: string) => {
    if (!iconName) return FileText
    const Icon = iconMap[iconName.toLowerCase()] || FileText
    return Icon
  }
  
  const getStats = (template: Template) => {
    const taskCount = template.taskCategories.reduce(
      (acc, cat) => acc + cat.tasks.length, 
      0
    )
    const categoryCount = template.taskCategories.length
    const budgetCount = template.budgetItems.length
    const folderCount = template.folders.length
    
    return { taskCount, categoryCount, budgetCount, folderCount }
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Templates</h2>
          <p className="text-gray-600 mt-1">
            Create and manage reusable project templates with prefilled information
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Template
        </button>
      </div>
      
      {templates?.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first project template to speed up project creation
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates?.map((template: Template) => {
            const Icon = getIcon(template.icon)
            const stats = getStats(template)
            
            return (
              <div
                key={template.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        {template.description && (
                          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setEditingTemplate(template)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Edit template"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Categories:</span>
                      <span className="ml-2 font-medium">{stats.categoryCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Tasks:</span>
                      <span className="ml-2 font-medium">{stats.taskCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Budget Items:</span>
                      <span className="ml-2 font-medium">{stats.budgetCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Folders:</span>
                      <span className="ml-2 font-medium">{stats.folderCount}</span>
                    </div>
                  </div>
                  
                  {template.taskCategories.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-2">Task Categories:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.taskCategories.slice(0, 3).map(cat => (
                          <span
                            key={cat.id}
                            className="inline-block px-2 py-1 text-xs rounded-full"
                            style={{
                              backgroundColor: `${cat.color || '#6366f1'}20`,
                              color: cat.color || '#6366f1'
                            }}
                          >
                            {cat.name}
                          </span>
                        ))}
                        {template.taskCategories.length > 3 && (
                          <span className="inline-block px-2 py-1 text-xs text-gray-500">
                            +{template.taskCategories.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {isCreateModalOpen && (
        <CreateTemplateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false)
            queryClient.invalidateQueries({ queryKey: ['templates'] })
          }}
        />
      )}
      
      {editingTemplate && (
        <EditTemplateModal
          template={editingTemplate}
          isOpen={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSuccess={() => {
            setEditingTemplate(null)
            queryClient.invalidateQueries({ queryKey: ['templates'] })
          }}
        />
      )}
    </div>
  )
}