'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Check, ChevronDown, Tag } from 'lucide-react'

interface FileTag {
  id: string
  name: string
  description: string | null
  color: string
  category: string | null
  documentCount?: number
}

interface FileTagSelectorProps {
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
  disabled?: boolean
  size?: 'sm' | 'md'
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

export function FileTagSelector({
  selectedTagIds,
  onChange,
  disabled = false,
  size = 'md'
}: FileTagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['file-tags'],
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
  }, {} as Record<string, FileTag[]>)

  const isSmall = size === 'sm'

  if (isLoading) {
    return (
      <div className={`${isSmall ? 'h-7' : 'h-9'} bg-gray-100 rounded animate-pulse`}></div>
    )
  }

  if (tags.length === 0) {
    return (
      <div className={`${isSmall ? 'text-[10px]' : 'text-xs'} text-gray-500 italic`}>
        No file tags. Add in Settings.
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Selected tags display / trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full border rounded flex flex-wrap gap-1 cursor-pointer ${
          isSmall ? 'min-h-[28px] px-2 py-1' : 'min-h-[36px] px-2 py-1.5'
        } ${
          disabled
            ? 'bg-gray-100 cursor-not-allowed'
            : 'border-gray-300 hover:border-gray-400'
        } ${isOpen ? 'border-primary-500 ring-1 ring-primary-500' : ''}`}
      >
        {selectedTags.length > 0 ? (
          selectedTags.map(tag => (
            <span
              key={tag.id}
              className={`inline-flex items-center rounded-full font-medium ${
                isSmall ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
              }`}
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
                  className="ml-0.5 hover:bg-black/10 rounded-full"
                >
                  <X className={isSmall ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                </button>
              )}
            </span>
          ))
        ) : (
          <span className={`text-gray-400 flex items-center gap-1 ${isSmall ? 'text-[10px]' : 'text-xs'}`}>
            <Tag className={isSmall ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
            Select tags...
          </span>
        )}
        <ChevronDown className={`${isSmall ? 'h-3 w-3' : 'h-4 w-4'} text-gray-400 ml-auto self-center transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
          <div className={`absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg ${
            isSmall ? 'max-h-48' : 'max-h-56'
          } overflow-auto`}>
            {Object.entries(groupedTags).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryTags]) => (
              <div key={category}>
                <div className={`px-2 py-1 font-medium text-gray-500 uppercase tracking-wide bg-gray-50 sticky top-0 ${
                  isSmall ? 'text-[9px]' : 'text-[10px]'
                }`}>
                  {category}
                </div>
                {categoryTags.map(tag => {
                  const isSelected = selectedTagIds.includes(tag.id)
                  return (
                    <div
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`px-2 cursor-pointer flex items-center justify-between hover:bg-gray-50 ${
                        isSmall ? 'py-1' : 'py-1.5'
                      } ${isSelected ? 'bg-primary-50' : ''}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`${isSmall ? 'w-2 h-2' : 'w-2.5 h-2.5'} rounded-full`}
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className={`text-gray-900 ${isSmall ? 'text-[10px]' : 'text-xs'}`}>{tag.name}</span>
                      </div>
                      {isSelected && (
                        <Check className={`${isSmall ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-primary-600`} />
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
