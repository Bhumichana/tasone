'use client'

import { forwardRef } from 'react'
import DatePicker, { registerLocale } from 'react-datepicker'
import { th } from 'date-fns/locale'
import { format } from 'date-fns'
import 'react-datepicker/dist/react-datepicker.css'
import { Calendar } from 'lucide-react'

// Register Thai locale
registerLocale('th', th)

interface ThaiDatePickerProps {
  selected: Date | null
  onChange: (date: Date | null) => void
  placeholderText?: string
  className?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
}

// Custom input component
const CustomInput = forwardRef<HTMLInputElement, any>(({ value, onClick, placeholder, className, disabled }, ref) => (
  <div className="relative">
    <input
      ref={ref}
      type="text"
      value={value}
      onClick={onClick}
      placeholder={placeholder}
      readOnly
      disabled={disabled}
      className={`${className} pr-10 cursor-pointer`}
    />
    <Calendar
      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
    />
  </div>
))

CustomInput.displayName = 'CustomInput'

// Convert Date to Thai Buddhist Era format
const formatThaiDate = (date: Date | null): string => {
  if (!date) return ''
  const day = format(date, 'dd')
  const month = format(date, 'MM')
  const year = date.getFullYear() + 543 // Convert to Buddhist Era
  return `${day}/${month}/${year}`
}

export default function ThaiDatePicker({
  selected,
  onChange,
  placeholderText = 'เลือกวันที่',
  className = '',
  disabled = false,
  minDate,
  maxDate
}: ThaiDatePickerProps) {
  return (
    <DatePicker
      selected={selected}
      onChange={onChange}
      locale="th"
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholderText}
      customInput={<CustomInput className={className} disabled={disabled} />}
      disabled={disabled}
      minDate={minDate}
      maxDate={maxDate}
      showPopperArrow={false}
      // Custom header to show Buddhist Era year
      renderCustomHeader={({
        date,
        decreaseMonth,
        increaseMonth,
        prevMonthButtonDisabled,
        nextMonthButtonDisabled,
      }) => (
        <div className="flex items-center justify-between px-2 py-2">
          <button
            type="button"
            onClick={decreaseMonth}
            disabled={prevMonthButtonDisabled}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="text-sm font-medium">
            {format(date, 'MMMM', { locale: th })} {date.getFullYear() + 543}
          </span>

          <button
            type="button"
            onClick={increaseMonth}
            disabled={nextMonthButtonDisabled}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    />
  )
}

// Helper function to convert Buddhist Era to Gregorian
export function buddhistToGregorian(buddhistYear: number): number {
  return buddhistYear - 543
}

// Helper function to convert Gregorian to Buddhist Era
export function gregorianToBuddhist(gregorianYear: number): number {
  return gregorianYear + 543
}
