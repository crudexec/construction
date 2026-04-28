'use client'

import { useState } from 'react'
import {
  Plus,
  FileText,
  Edit,
  Trash2,
  Star,
  Copy,
  MoreHorizontal
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
  LIEN_RELEASE: 'Lien Release',
  PURCHASE_ORDER: 'Purchase Order',
  VENDOR_CONTRACT: 'Vendor Contract',
  ESTIMATE: 'Estimate',
  BID: 'Bid',
  INTENT_TO_AWARD: 'Intent to Award',
  NON_COMPLIANCE_NOTICE: 'Non-Compliance',
  CUSTOM: 'Custom',
}

const TYPE_COLORS: Record<DocumentTemplateType, string> = {
  CHANGE_ORDER: 'bg-blue-100 text-blue-700',
  LIEN_RELEASE: 'bg-cyan-100 text-cyan-700',
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
  const [filterType, setFilterType] = useState<DocumentTemplateType | 'ALL'>('ALL')

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
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

  const filteredTemplates = filterType === 'ALL'
    ? templates
    : templates.filter(t => t.type === filterType)

  // Get unique types from templates for filter
  const availableTypes = [...new Set(templates.map(t => t.type))]

  return (
    <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
      {/* Compact Header */}
      <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-500" />
          <h1 className="text-sm font-medium text-gray-900">Document Templates</h1>
          <span className="text-[10px] text-gray-500">({templates.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as DocumentTemplateType | 'ALL')}
            className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-white"
          >
            <option value="ALL">All Types</option>
            {availableTypes.map(type => (
              <option key={type} value={type}>{TYPE_LABELS[type]}</option>
            ))}
          </select>
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium text-white bg-primary-600 rounded hover:bg-primary-700"
          >
            <Plus className="h-3 w-3" />
            New Template
          </button>
        </div>
      </div>

      {/* Template Table */}
      {templates.length === 0 ? (
        <div className="px-3 py-8 text-center">
          <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-500 mb-2">No templates yet</p>
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium text-white bg-primary-600 rounded hover:bg-primary-700"
          >
            <Plus className="h-3 w-3" />
            Create First Template
          </button>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-600 uppercase">Name</th>
              <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-600 uppercase w-28">Type</th>
              <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-600 uppercase w-24">Status</th>
              <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-600 uppercase w-28">Created By</th>
              <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-gray-600 uppercase w-24">Updated</th>
              <th className="px-2 py-1.5 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filteredTemplates.map((template, idx) => (
              <tr
                key={template.id}
                className={`border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                onClick={() => onEdit(template)}
              >
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-900">{template.name}</span>
                    {template.isDefault && (
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  {template.description && (
                    <p className="text-[10px] text-gray-500 truncate max-w-xs">{template.description}</p>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded ${TYPE_COLORS[template.type]}`}>
                    {TYPE_LABELS[template.type]}
                  </span>
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1">
                    {template.isDefault && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-100 text-yellow-700 rounded">
                        Default
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${template.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-1.5 text-[10px] text-gray-600">
                  {template.createdBy.firstName} {template.createdBy.lastName}
                </td>
                <td className="px-3 py-1.5 text-[10px] text-gray-500">
                  {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true }).replace('about ', '')}
                </td>
                <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(template) }}
                      className="p-1 text-gray-400 hover:text-primary-600 rounded"
                      title="Edit"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDuplicate(template.id) }}
                      className="p-1 text-gray-400 hover:text-primary-600 rounded"
                      title="Duplicate"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    {!template.isDefault && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSetDefault(template.id) }}
                        className="p-1 text-gray-400 hover:text-yellow-600 rounded"
                        title="Set as Default"
                      >
                        <Star className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(template.id) }}
                      disabled={deletingId === template.id}
                      className="p-1 text-gray-400 hover:text-red-600 rounded disabled:opacity-50"
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
      )}

      {/* Footer with count */}
      {templates.length > 0 && (
        <div className="px-3 py-1.5 border-t bg-gray-50 text-[10px] text-gray-500">
          Showing {filteredTemplates.length} of {templates.length} templates
        </div>
      )}
    </div>
  )
}
