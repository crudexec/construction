'use client'

import React, { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, parse, isValid } from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import 'react-day-picker/style.css'

interface DatePickerProps {
  value: string | Date | null | undefined
  onChange: (date: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  dateFormat?: string
  clearable?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date...',
  className = '',
  disabled = false,
  minDate,
  maxDate,
  dateFormat = 'yyyy-MM-dd',
  clearable = true
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Parse the incoming value
  useEffect(() => {
    if (value) {
      let date: Date | undefined
      if (value instanceof Date) {
        date = value
      } else if (typeof value === 'string' && value) {
        // Try parsing as ISO string first
        date = new Date(value)
        if (!isValid(date)) {
          // Try parsing with the specified format
          date = parse(value, dateFormat, new Date())
        }
      }
      if (date && isValid(date)) {
        setSelectedDate(date)
        setInputValue(format(date, 'MM/dd/yyyy'))
      }
    } else {
      setSelectedDate(undefined)
      setInputValue('')
    }
  }, [value, dateFormat])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.focus()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)

    // Try to parse as user types (support multiple formats)
    const formats = ['MM/dd/yyyy', 'M/d/yyyy', 'MM-dd-yyyy', 'yyyy-MM-dd']
    for (const fmt of formats) {
      const parsed = parse(val, fmt, new Date())
      if (isValid(parsed)) {
        setSelectedDate(parsed)
        onChange(format(parsed, dateFormat))
        return
      }
    }
  }

  const handleInputBlur = () => {
    // On blur, if the input doesn't parse to a valid date, reset to selected date
    if (inputValue && !selectedDate) {
      setInputValue(selectedDate ? format(selectedDate, 'MM/dd/yyyy') : '')
    }
  }

  const handleDaySelect = (day: Date | undefined) => {
    if (day) {
      setSelectedDate(day)
      setInputValue(format(day, 'MM/dd/yyyy'))
      onChange(format(day, dateFormat))
      setIsOpen(false)
      inputRef.current?.focus()
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedDate(undefined)
    setInputValue('')
    onChange('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-3 py-2 pl-10 ${clearable && inputValue ? 'pr-10' : 'pr-3'}
            border border-gray-300 rounded-md
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            text-sm
          `}
        />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          disabled={disabled}
          tabIndex={-1}
        >
          <Calendar className="h-4 w-4" />
        </button>
        {clearable && inputValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
          <style jsx global>{`
            .rdp-root {
              --rdp-accent-color: #7c3aed;
              --rdp-accent-background-color: #f5f3ff;
              --rdp-selected-font: inherit;
              font-size: 14px;
            }
            .rdp-day_button {
              width: 32px;
              height: 32px;
              border-radius: 6px;
            }
            .rdp-day_button:hover:not(.rdp-selected):not(.rdp-disabled) {
              background-color: #f3f4f6;
            }
            .rdp-selected .rdp-day_button {
              background-color: var(--rdp-accent-color);
              color: white;
            }
            .rdp-today:not(.rdp-selected) .rdp-day_button {
              background-color: #f3f4f6;
              font-weight: 600;
            }
            .rdp-outside .rdp-day_button {
              color: #9ca3af;
              opacity: 0.5;
            }
            .rdp-disabled .rdp-day_button {
              color: #9ca3af;
              opacity: 0.5;
              cursor: not-allowed;
            }
            .rdp-nav button {
              width: 28px;
              height: 28px;
              border-radius: 6px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
            }
            .rdp-nav button:hover {
              background-color: #f3f4f6;
            }
            .rdp-caption_label {
              font-weight: 500;
              font-size: 14px;
            }
            .rdp-weekday {
              font-size: 12px;
              font-weight: 500;
              color: #6b7280;
            }
          `}</style>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDaySelect}
            disabled={[
              ...(minDate ? [{ before: minDate }] : []),
              ...(maxDate ? [{ after: maxDate }] : [])
            ]}
            showOutsideDays
          />
          <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-center">
            <button
              type="button"
              onClick={() => handleDaySelect(new Date())}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Today
            </button>
            <span className="text-xs text-gray-400">
              Format: MM/DD/YYYY
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// Formik-compatible DatePicker field
interface FormikDatePickerProps {
  name: string
  placeholder?: string
  className?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
}

export function FormikDatePicker({
  name,
  placeholder = 'Select date...',
  className = '',
  disabled = false,
  minDate,
  maxDate
}: FormikDatePickerProps) {
  // This component is designed to work with Formik's useField hook
  // Import and use like: const [field, meta, helpers] = useField(name)
  // For now, we export it to be used with Formik's Field component's "as" prop
  return null // Placeholder - actual implementation uses the render prop pattern
}

// Also export a DateRangePicker for future use
interface DateRangePickerProps {
  startDate: string | Date | null | undefined
  endDate: string | Date | null | undefined
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  startPlaceholder?: string
  endPlaceholder?: string
  className?: string
  disabled?: boolean
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startPlaceholder = 'Start date',
  endPlaceholder = 'End date',
  className = '',
  disabled = false
}: DateRangePickerProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DatePicker
        value={startDate}
        onChange={onStartDateChange}
        placeholder={startPlaceholder}
        disabled={disabled}
        maxDate={endDate ? new Date(endDate) : undefined}
        className="flex-1"
      />
      <span className="text-gray-400">to</span>
      <DatePicker
        value={endDate}
        onChange={onEndDateChange}
        placeholder={endPlaceholder}
        disabled={disabled}
        minDate={startDate ? new Date(startDate) : undefined}
        className="flex-1"
      />
    </div>
  )
}
