'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    defaultValue?: string
    value?: string
    onValueChange?: (value: string) => void
    orientation?: 'horizontal' | 'vertical'
  }
>(({ className, defaultValue, value, onValueChange, orientation = 'horizontal', ...props }, ref) => {
  const [selectedValue, setSelectedValue] = React.useState(defaultValue || '')

  const currentValue = value ?? selectedValue

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (value === undefined) {
        setSelectedValue(newValue)
      }
      onValueChange?.(newValue)
    },
    [value, onValueChange]
  )

  return (
    <div
      ref={ref}
      className={cn(
        'w-full',
        orientation === 'vertical' && 'flex gap-4',
        className
      )}
      data-orientation={orientation}
      {...props}
    >
      <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, orientation }}>
        {props.children}
      </TabsContext.Provider>
    </div>
  )
})
Tabs.displayName = 'Tabs'

const TabsContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
  orientation: 'horizontal' | 'vertical'
} | null>(null)

const useTabsContext = () => {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs component')
  }
  return context
}

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { orientation } = useTabsContext()

  return (
    <div
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
        orientation === 'horizontal' && 'h-10 w-full',
        orientation === 'vertical' && 'flex-col h-auto w-auto',
        className
      )}
      {...props}
    />
  )
})
TabsList.displayName = 'TabsList'

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string
  }
>(({ className, value, ...props }, ref) => {
  const { value: selectedValue, onValueChange } = useTabsContext()
  const isSelected = selectedValue === value

  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isSelected && 'bg-background text-foreground shadow-sm',
        !isSelected && 'hover:bg-muted/50',
        className
      )}
      onClick={() => onValueChange(value)}
      {...props}
    />
  )
})
TabsTrigger.displayName = 'TabsTrigger'

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string
  }
>(({ className, value, ...props }, ref) => {
  const { value: selectedValue } = useTabsContext()
  const isSelected = selectedValue === value

  if (!isSelected) return null

  return (
    <div
      ref={ref}
      className={cn(
        'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
      {...props}
    />
  )
})
TabsContent.displayName = 'TabsContent'

export { Tabs, TabsList, TabsTrigger, TabsContent }