'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

interface DatePickerProps {
  value?: string // yyyy-mm-dd format
  onChange: (date: string) => void // returns yyyy-mm-dd format
  placeholder?: string
  disabled?: boolean
  className?: string
}

// Thai month names
const thaiMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

// Convert Gregorian year to Buddhist year
const toBuddhistYear = (date: Date): number => {
  return date.getFullYear() + 543
}

// Format date as dd/mm/yyyy (BE) for display
const formatThaiDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = toBuddhistYear(date)
  return `${day}/${month}/${year}`
}

// Custom caption formatter for Thai Buddhist calendar
const formatCaption = (date: Date): string => {
  const monthName = thaiMonths[date.getMonth()]
  const year = toBuddhistYear(date)
  return `${monthName} ${year}`
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'เลือกวันที่',
  disabled = false,
  className = ''
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  )
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Update selected date when value prop changes
  React.useEffect(() => {
    if (value) {
      setSelectedDate(new Date(value))
    } else {
      setSelectedDate(undefined)
    }
  }, [value])

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      // Convert to yyyy-mm-dd format (always use Gregorian for storage)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      onChange(`${year}-${month}-${day}`)
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          mt-1 w-full flex items-center justify-between
          border border-gray-300 rounded-md px-3 py-2
          text-left bg-white
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400 cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
        `}
      >
        <span className={selectedDate ? 'text-gray-900' : 'text-gray-400'}>
          {selectedDate ? formatThaiDate(selectedDate) : placeholder}
        </span>
        <CalendarIcon className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            locale={th}
            formatters={{
              formatCaption: formatCaption
            }}
            className="p-3"
            styles={{
              caption: { color: '#1e40af', fontWeight: 'bold', fontSize: '14px' },
              head_cell: { color: '#6b7280', fontWeight: 'normal' },
              cell: { padding: '0.5rem' },
              day: {
                borderRadius: '0.375rem',
              },
              day_selected: {
                backgroundColor: '#1e40af',
                color: 'white',
                fontWeight: 'bold'
              },
              day_today: {
                fontWeight: 'bold',
                color: '#1e40af'
              }
            }}
          />

          {/* Today and Clear buttons */}
          <div className="flex justify-between border-t border-gray-200 p-2">
            <button
              type="button"
              onClick={() => {
                const today = new Date()
                handleSelect(today)
              }}
              className="text-sm text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(undefined)
                onChange('')
                setIsOpen(false)
              }}
              className="text-sm text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-50"
            >
              ล้างค่า
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
