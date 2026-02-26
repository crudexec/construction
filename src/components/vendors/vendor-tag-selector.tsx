'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Check, ChevronDown } from 'lucide-react'

interface ServiceTag {
  id: string
  name: string
  description: string | null
  color: string
  category: string | null
  vendorCount?: number
}

interface VendorTagSelectorProps {
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
  disabled?: boolean
}

async function fetchTags(): Promise<ServiceTag[]> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/vendor-tags', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch tags')
  return response.json()
}

export function VendorTagSelector({
  selectedTagIds,
  onChange,
  disabled = false
}: VendorTagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['vendor-tags'],
    queryFn: fetchTags
  })

  const toggleTag = (tagId: string) => {
    if (disabled) return

    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId))
    } else {
      onChange([...selectedTagIds, tagId])
    }
  }

  const removeTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    onChange(selectedTagIds.filter(id => id !== tagId))
  }

  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id))

  // Group tags by category
  const groupedTags = tags.reduce((acc, tag) => {
    const cat = tag.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(tag)
    return acc
  }, {} as Record<string, ServiceTag[]>)

  if (isLoading) {
    return (
      <div className="h-10 bg-gray-100 rounded-md animate-pulse"></div>
    )
  }

  if (tags.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No service tags available. Add tags in Settings &gt; Service Tags.
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Selected tags display / trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`min-h-[42px] w-full border rounded-md px-3 py-2 flex flex-wrap gap-2 cursor-pointer ${
          disabled
            ? 'bg-gray-100 cursor-not-allowed'
            : 'border-gray-300 hover:border-gray-400 focus:border-primary-500'
        } ${isOpen ? 'border-primary-500 ring-1 ring-primary-500' : ''}`}
      >
        {selectedTags.length > 0 ? (
          selectedTags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color
              }}
            >
              {tag.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => removeTag(tag.id, e)}
                  className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))
        ) : (
          <span className="text-gray-400 text-sm">Select service tags...</span>
        )}
        <ChevronDown className={`h-4 w-4 text-gray-400 ml-auto self-center transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown panel */}
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto">
            {Object.entries(groupedTags).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryTags]) => (
              <div key={category}>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50 sticky top-0">
                  {category}
                </div>
                {categoryTags.map(tag => {
                  const isSelected = selectedTagIds.includes(tag.id)
                  return (
                    <div
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-50 ${
                        isSelected ? 'bg-primary-50' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-sm text-gray-900">{tag.name}</span>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary-600" />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
