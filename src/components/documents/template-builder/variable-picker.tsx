'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { DocumentTemplateType } from '@prisma/client'
import { getVariablesForType, VariableCategory, TemplateVariable } from '@/lib/documents'

interface VariablePickerProps {
  documentType: DocumentTemplateType
  onInsert: (variable: string) => void
}

export function VariablePicker({ documentType, onInsert }: VariablePickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Change Order', 'Company', 'Tables'])
  )
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const categories = useMemo(() => {
    return getVariablesForType(documentType)
  }, [documentType])

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories

    const query = searchQuery.toLowerCase()
    return categories
      .map((category) => ({
        ...category,
        variables: category.variables.filter(
          (v) =>
            v.label.toLowerCase().includes(query) ||
            v.key.toLowerCase().includes(query) ||
            v.description.toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.variables.length > 0)
  }, [categories, searchQuery])

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName)
    } else {
      newExpanded.add(categoryName)
    }
    setExpandedCategories(newExpanded)
  }

  const handleCopy = async (variable: TemplateVariable) => {
    await navigator.clipboard.writeText(variable.key)
    setCopiedKey(variable.key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleInsert = (variable: TemplateVariable) => {
    onInsert(variable.key)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-2 py-1.5 border-b bg-white">
        <div className="relative">
          <Search className="absolute left-1.5 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search variables..."
            className="w-full pl-6 pr-2 py-1 text-[10px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Variable List */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {filteredCategories.map((category) => (
          <div key={category.name} className="mb-1">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.name)}
              className="w-full flex items-center gap-0.5 px-1.5 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-100 rounded"
            >
              {expandedCategories.has(category.name) ? (
                <ChevronDown className="h-3 w-3 text-gray-400" />
              ) : (
                <ChevronRight className="h-3 w-3 text-gray-400" />
              )}
              {category.name}
              <span className="ml-auto text-[9px] text-gray-400">
                {category.variables.length}
              </span>
            </button>

            {/* Variables */}
            {expandedCategories.has(category.name) && (
              <div className="ml-1 space-y-0.5">
                {category.variables.map((variable) => (
                  <div
                    key={variable.key}
                    className="group bg-white border border-gray-100 rounded px-1.5 py-1 hover:border-primary-200 hover:bg-primary-50/50 cursor-pointer"
                    onClick={() => handleInsert(variable)}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-gray-800 truncate">
                          {variable.label}
                        </p>
                        <code className="text-[9px] text-primary-600 bg-primary-50 px-0.5 rounded">
                          {variable.key}
                        </code>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopy(variable)
                        }}
                        className="p-0.5 text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Copy variable"
                      >
                        {copiedKey === variable.key ? (
                          <Check className="h-2.5 w-2.5 text-green-500" />
                        ) : (
                          <Copy className="h-2.5 w-2.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="text-center py-4 text-[10px] text-gray-400">
            No variables found
          </div>
        )}
      </div>

      {/* Footer Hint */}
      <div className="px-2 py-1 border-t bg-white">
        <p className="text-[9px] text-gray-400 text-center">
          Click to insert at cursor
        </p>
      </div>
    </div>
  )
}
