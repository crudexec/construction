'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface AssetFilterSelectProps {
  label: string
  ariaLabel: string
  options: { value: string; label: string }[]
  // null includes every value, including categories added after loading.
  selected: string[] | null
  onChange: (values: string[] | null) => void
}

export function AssetFilterSelect({ label, ariaLabel, options, selected, onChange }: AssetFilterSelectProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const allSelected = selected === null || (options.length > 0 && options.every(option => selected.includes(option.value)))
  const summary = allSelected ? 'All' : selected?.length === 0 ? 'None' : selected?.length === 1
    ? options.find(option => option.value === selected[0])?.label ?? selected[0]
    : `${selected?.length} selected`

  useEffect(() => {
    if (!open) return
    const dismiss = (event: Event) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('focusin', dismiss)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('focusin', dismiss)
    }
  }, [open])

  return (
    <div ref={container} className="relative min-w-0 w-full sm:w-auto" onKeyDown={event => {
      if (event.key === 'Escape' && open) {
        event.stopPropagation()
        setOpen(false)
        trigger.current?.focus()
      }
    }}>
      <button
        ref={trigger}
        type="button"
        aria-label={`${ariaLabel}: ${summary}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(value => !value)}
        className="flex min-h-11 sm:min-h-8 w-full sm:max-w-64 items-center justify-between gap-2 rounded border border-gray-300 bg-white px-2 text-xs text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <span className="truncate">{label}: {summary}</span>
        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      </button>
      {open && (
        <div id={id} role="group" aria-label={`${label} options`} className="absolute left-0 top-full z-20 mt-1 w-full sm:w-64 max-w-[calc(100vw-3rem)] rounded-md bg-white shadow-lg ring-1 ring-gray-300">
          <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3">
            <button type="button" onClick={() => onChange(null)} className="min-h-11 text-xs text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">Select all</button>
            <button type="button" onClick={() => onChange([])} className="min-h-11 text-xs text-gray-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">Clear selection</button>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {options.map(option => (
              <label key={option.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 text-sm text-gray-700 hover:bg-gray-50 focus-within:bg-primary-50">
                <input
                  type="checkbox"
                  checked={selected === null || selected.includes(option.value)}
                  onChange={event => {
                    const values = selected ?? options.map(item => item.value)
                    onChange(event.target.checked ? [...values, option.value] : values.filter(value => value !== option.value))
                  }}
                  className="h-4 w-4 shrink-0 rounded border-gray-300 accent-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                />
                <span className="break-words min-w-0">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
