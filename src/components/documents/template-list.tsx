'use client'

import { useState } from 'react'
import {
  Plus,
  FileText,
  MoreVertical,
  Edit,
  Trash2,
  Star,
  StarOff,
  Copy,
  Check
} from 'lucide-react'
import { DocumentTemplateType } from '@prisma/client'
import { formatDistanceToNow } from 'date-fns'

export interface Template {
  id: string
  name: string
  description: string | null
  type: DocumentTemplateType
  content: string
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy: {
    firstName: string
    lastName: string
  }
}

interface TemplateListProps {
  templates: Template[]
  onEdit: (template: Template) => void
  onCreate: () => void
  onDelete: (templateId: string) => Promise<void>
  onSetDefault: (templateId: string) => Promise<void>
  onDuplicate: (templateId: string) => Promise<void>
  isLoading?: boolean
}

const TYPE_LABELS: Record<DocumentTemplateType, string> = {
  CHANGE_ORDER: 'Change Order',
  PURCHASE_ORDER: 'Purchase Order',
  VENDOR_CONTRACT: 'Vendor Contract',
  ESTIMATE: 'Estimate',
  BID: 'Bid',
  INTENT_TO_AWARD: 'Intent to Award',
  NON_COMPLIANCE_NOTICE: 'Non-Compliance Notice',
  CUSTOM: 'Custom',
}

const TYPE_COLORS: Record<DocumentTemplateType, string> = {
  CHANGE_ORDER: 'bg-blue-100 text-blue-700',
  PURCHASE_ORDER: 'bg-green-100 text-green-700',
  VENDOR_CONTRACT: 'bg-purple-100 text-purple-700',
  ESTIMATE: 'bg-orange-100 text-orange-700',
  BID: 'bg-yellow-100 text-yellow-700',
  INTENT_TO_AWARD: 'bg-indigo-100 text-indigo-700',
  NON_COMPLIANCE_NOTICE: 'bg-red-100 text-red-700',
  CUSTOM: 'bg-gray-100 text-gray-700',
}

export function TemplateList({
  templates,
  onEdit,
  onCreate,
  onDelete,
  onSetDefault,
  onDuplicate,
  isLoading = false,
}: TemplateListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return
    }
    setDeletingId(templateId)
    try {
      await onDelete(templateId)
    } finally {
      setDeletingId(null)
      setOpenMenuId(null)
    }
  }

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.type]) {
      acc[template.type] = []
    }
    acc[template.type].push(template)
    return acc
  }, {} as Record<DocumentTemplateType, Template[]>)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage templates for generating documents
          </p>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </button>
      </div>

      {/* Template List */}
      {templates.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No templates yet
          </h3>
          <p className="text-gray-500 mb-4">
            Create your first document template to get started
          </p>
          <button
            onClick={onCreate}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedTemplates).map(([type, typeTemplates]) => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-1 text-xs font-medium rounded ${TYPE_COLORS[type as DocumentTemplateType]}`}>
                  {TYPE_LABELS[type as DocumentTemplateType]}
                </span>
                <span className="text-sm text-gray-500">
                  {typeTemplates.length} template{typeTemplates.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="bg-white rounded-lg border divide-y">
                {typeTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {template.name}
                          </h3>
                          {template.isDefault && (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                              <Star className="h-3 w-3 mr-1" />
                              Default
                            </span>
                          )}
                          {!template.isActive && (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-gray-500 mt-1 truncate">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>
                            Created by {template.createdBy.firstName} {template.createdBy.lastName}
                          </span>
                          <span>
                            Updated {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => onEdit(template)}
                          className="p-2 text-gray-400 hover:text-blue-600 rounded"
                          title="Edit template"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === template.id ? null : template.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {openMenuId === template.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-20 border py-1">
                                <button
                                  onClick={() => {
                                    onDuplicate(template.id)
                                    setOpenMenuId(null)
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <Copy className="h-4 w-4 mr-3 text-gray-400" />
                                  Duplicate
                                </button>
                                {!template.isDefault && (
                                  <button
                                    onClick={() => {
                                      onSetDefault(template.id)
                                      setOpenMenuId(null)
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <Star className="h-4 w-4 mr-3 text-gray-400" />
                                    Set as Default
                                  </button>
                                )}
                                <div className="border-t my-1" />
                                <button
                                  onClick={() => handleDelete(template.id)}
                                  disabled={deletingId === template.id}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-3" />
                                  {deletingId === template.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
