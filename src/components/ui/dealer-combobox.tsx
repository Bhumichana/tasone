"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Dealer {
  id: string
  dealerName: string
  dealerCode: string
}

interface DealerComboboxProps {
  dealers: Dealer[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  className?: string
}

export function DealerCombobox({
  dealers,
  value,
  onChange,
  placeholder = "เลือกตัวแทนจำหน่าย",
  emptyText = "ไม่พบตัวแทนจำหน่าย",
  className,
}: DealerComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const selectedDealer = dealers.find((dealer) => dealer.id === value)

  // Filter dealers based on search query
  const filteredDealers = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return dealers
    }

    const query = searchQuery.toLowerCase()
    return dealers.filter((dealer) =>
      dealer.dealerName.toLowerCase().includes(query) ||
      dealer.dealerCode.toLowerCase().includes(query)
    )
  }, [dealers, searchQuery])

  // Reset search when closing
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("")
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between border border-gray-300 rounded-md px-3 py-2 text-left bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500",
            className
          )}
        >
          <span className="flex items-center gap-2">
            {selectedDealer ? (
              <>
                <span className="font-medium">{selectedDealer.dealerName}</span>
                <span className="text-gray-500">({selectedDealer.dealerCode})</span>
              </>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              type="text"
              placeholder="ค้นหาตัวแทนจำหน่าย..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-9 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Dealer List */}
          <div className="max-h-[300px] overflow-y-auto overflow-x-hidden">
            {filteredDealers.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">
                {emptyText}
              </div>
            ) : (
              <div className="py-1">
                {filteredDealers.map((dealer, index) => (
                  <div key={dealer.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(dealer.id)
                        setOpen(false)
                      }}
                      className={cn(
                        "relative flex w-full cursor-pointer select-none items-center px-3 py-2.5 text-sm outline-none hover:bg-gray-50 focus:bg-gray-50 transition-colors",
                        value === dealer.id && "bg-blue-50 hover:bg-blue-100 focus:bg-blue-100"
                      )}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0 text-blue-600",
                          value === dealer.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-gray-900">{dealer.dealerName}</span>
                        <span className="text-xs text-gray-500">{dealer.dealerCode}</span>
                      </div>
                    </button>
                    {index < filteredDealers.length - 1 && (
                      <div className="border-b border-gray-100 mx-3" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
