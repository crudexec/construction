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
    new Set(['Change Order', 'Vendor', 'Company'])
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
    <div className="bg-gray-50 border rounded-md h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b bg-white rounded-t-md">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Variables</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search variables..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Variable List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredCategories.map((category) => (
          <div key={category.name} className="mb-2">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.name)}
              className="w-full flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
            >
              {expandedCategories.has(category.name) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {category.name}
              <span className="ml-auto text-xs text-gray-400">
                {category.variables.length}
              </span>
            </button>

            {/* Variables */}
            {expandedCategories.has(category.name) && (
              <div className="ml-2 mt-1 space-y-1">
                {category.variables.map((variable) => (
                  <div
                    key={variable.key}
                    className="group bg-white border border-gray-200 rounded p-2 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {variable.label}
                        </p>
                        <code className="text-xs text-blue-600 bg-blue-50 px-1 rounded">
                          {variable.key}
                        </code>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopy(variable)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Copy variable"
                        >
                          {copiedKey === variable.key ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {variable.description}
                    </p>
                    <button
                      onClick={() => handleInsert(variable)}
                      className="mt-2 w-full text-xs text-center py-1 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                    >
                      Insert
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No variables found matching "{searchQuery}"
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="p-3 border-t bg-white rounded-b-md">
        <p className="text-xs text-gray-500">
          Click "Insert" to add a variable at your cursor position, or copy it to
          paste manually.
        </p>
      </div>
    </div>
  )
}
