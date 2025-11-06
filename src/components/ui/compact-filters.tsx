'use client'

import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'

interface FilterOption {
  value: string
  label: string
}

interface CompactFiltersProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters: Array<{
    key: string
    label: string
    value: string
    options: FilterOption[]
    onChange: (value: string) => void
  }>
  resultsCount?: number
  totalCount?: number
  className?: string
}

export function CompactFilters({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  resultsCount,
  totalCount,
  className = ""
}: CompactFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Check if any filters are active
  const hasActiveFilters = filters.some(filter => filter.value !== 'all')
  
  // Count active filters
  const activeFilterCount = filters.filter(filter => filter.value !== 'all').length

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Compact Header */}
      <div className="p-2">
        <div className="flex items-center gap-2">
          {/* Search - Always Visible */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            {searchValue && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-1 px-2 py-1.5 text-xs border rounded-md transition-colors ${
              hasActiveFilters 
                ? 'border-primary-500 bg-primary-50 text-primary-700' 
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-primary-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Results Count */}
          {(resultsCount !== undefined || totalCount !== undefined) && (
            <div className="text-xs text-gray-500 whitespace-nowrap">
              {resultsCount !== undefined && totalCount !== undefined
                ? `${resultsCount}/${totalCount}`
                : resultsCount !== undefined
                ? `${resultsCount} results`
                : `${totalCount} total`
              }
            </div>
          )}
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {filters.map((filter) => (
                <div key={filter.key} className="relative">
                  <select
                    value={filter.value}
                    onChange={(e) => filter.onChange(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 pr-6 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 appearance-none bg-white"
                  >
                    {filter.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {/* Custom dropdown arrow */}
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => filters.forEach(filter => filter.onChange('all'))}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}