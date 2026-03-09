'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Tag, X, ChevronDown, Check } from 'lucide-react'

interface FileTag {
  id: string
  name: string
  color: string
  category: string | null
}

interface FileTagFilterProps {
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
}

async function fetchTags(): Promise<FileTag[]> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/file-tags', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch tags')
  return response.json()
}

export function FileTagFilter({
  selectedTagIds,
  onChange
}: FileTagFilterProps) {
  const [isOpen, setIsOpen] = useState(false)

  const { data: tags = [] } = useQuery({
    queryKey: ['file-tags'],
    queryFn: fetchTags
  })

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId))
    } else {
      onChange([...selectedTagIds, tagId])
    }
  }

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id))

  // Group tags by category
  const groupedTags = tags.reduce((acc, tag) => {
    const cat = tag.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(tag)
    return acc
  }, {} as Record<string, FileTag[]>)

  if (tags.length === 0) {
    return null
  }

  return (
    <div className="relative">
      {/* Filter trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs ${
          selectedTagIds.length > 0
            ? 'bg-primary-50 border-primary-200 text-primary-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Tag className="h-3 w-3" />
        {selectedTagIds.length > 0 ? (
          <>
            <span>{selectedTagIds.length} tag{selectedTagIds.length > 1 ? 's' : ''}</span>
            <button
              onClick={clearAll}
              className="ml-0.5 hover:bg-primary-200 rounded-full p-0.5"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </>
        ) : (
          <>
            <span>Tags</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {/* Selected tags pills */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selectedTags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color
              }}
            >
              {tag.name}
              <button
                onClick={() => toggleTag(tag.id)}
                className="hover:bg-black/10 rounded-full"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-1 left-0 w-48 bg-white border border-gray-200 rounded shadow-lg max-h-56 overflow-auto">
            {Object.entries(groupedTags).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryTags]) => (
              <div key={category}>
                <div className="px-2 py-1 text-[9px] font-medium text-gray-500 uppercase tracking-wide bg-gray-50 sticky top-0">
                  {category}
                </div>
                {categoryTags.map(tag => {
                  const isSelected = selectedTagIds.includes(tag.id)
                  return (
                    <div
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`px-2 py-1 cursor-pointer flex items-center justify-between hover:bg-gray-50 ${
                        isSelected ? 'bg-primary-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-[10px] text-gray-900">{tag.name}</span>
                      </div>
                      {isSelected && (
                        <Check className="h-3 w-3 text-primary-600" />
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
