'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Package,
  Search,
  AlertTriangle,
  TrendingDown,
  Archive,
  Filter,
  RefreshCw,
  Calendar
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface DealerStock {
  id: string
  materialCode: string
  materialName: string
  materialType: string
  batchNumber: string
  currentStock: number
  unit: string
  expiryDate: string | null
  lastUpdated: string
  dealer: {
    id: string
    dealerName: string
    dealerCode: string
  }
}

interface StockStats {
  totalItems: number
  totalStock: number
  lowStockItems: number
  zeroStockItems: number
}

export default function StockPage() {
  const { data: session } = useSession()
  const [stocks, setStocks] = useState<DealerStock[]>([])
  const [stats, setStats] = useState<StockStats>({
    totalItems: 0,
    totalStock: 0,
    lowStockItems: 0,
    zeroStockItems: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [stockFilter, setStockFilter] = useState('ALL')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStock()
  }, [searchTerm, stockFilter])

  const fetchStock = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (searchTerm) params.append('search', searchTerm)
      if (stockFilter === 'LOW') params.append('lowStock', 'true')

      const response = await fetch(`/api/dealer-stock?${params}`)
      if (response.ok) {
        const data = await response.json()
        setStocks(data.stocks)
        setStats(data.stats)
        setError('')
      } else {
        setError('ไม่สามารถดึงข้อมูล Stock ได้')
      }
    } catch (error) {
      console.error('Error fetching stock:', error)
      setError('เกิดข้อผิดพลาดในการดึงข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatExpiryDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null

    const now = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      return { label: 'หมดอายุแล้ว', color: 'bg-red-100 text-red-800' }
    } else if (daysUntilExpiry <= 30) {
      return { label: 'ใกล้หมดอายุ', color: 'bg-orange-100 text-orange-800' }
    } else if (daysUntilExpiry <= 90) {
      return { label: 'เตือน', color: 'bg-yellow-100 text-yellow-800' }
    } else {
      return { label: 'ปกติ', color: 'bg-green-100 text-green-800' }
    }
  }

  const getStockStatus = (stock: number) => {
    if (stock === 0) {
      return { label: 'หมด', color: 'bg-red-100 text-red-800', icon: Archive }
    } else if (stock <= 10) {
      return { label: 'ต่ำ', color: 'bg-yellow-100 text-yellow-800', icon: TrendingDown }
    } else {
      return { label: 'ปกติ', color: 'bg-green-100 text-green-800', icon: Package }
    }
  }

  const getStockBadge = (stock: number) => {
    const status = getStockStatus(stock)
    const Icon = status.icon
    return (
      <Badge className={`${status.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {status.label}
      </Badge>
    )
  }

  if (!session) return null

  // Only allow Dealers to access this page
  if (session.user.userGroup !== 'Dealer') {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-gray-600 mt-2">หน้านี้สำหรับตัวแทนจำหน่ายเท่านั้น</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">คลังสต็อกวัตถุดิบ</h1>
            <p className="text-sm text-gray-600 mt-1">
              จัดการและตรวจสอบสต็อกวัตถุดิบของคุณ
            </p>
          </div>
          <Button
            onClick={fetchStock}
            className="gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">รายการทั้งหมด</CardTitle>
              <Package className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalItems}</div>
              <p className="text-xs text-gray-600">วัตถุดิบ</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">สต็อกรวม</CardTitle>
              <Archive className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.totalStock.toLocaleString()}</div>
              <p className="text-xs text-gray-600">หน่วย</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">สต็อกต่ำ</CardTitle>
              <TrendingDown className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</div>
              <p className="text-xs text-gray-600">รายการ</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">สต็อกหมด</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.zeroStockItems}</div>
              <p className="text-xs text-gray-600">รายการ</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="ค้นหาชื่อ, รหัส, หรือ Batch วัตถุดิบ"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Stock Filter */}
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="กรองตามสต็อก" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ทุกรายการ</SelectItem>
                  <SelectItem value="LOW">สต็อกต่ำ</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setStockFilter('ALL')
                }}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                ล้างตัวกรอง
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Low Stock Alert */}
        {stats.lowStockItems > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <TrendingDown className="h-4 w-4" />
            <AlertDescription className="text-yellow-800">
              คำเตือน: มีวัตถุดิบ {stats.lowStockItems} รายการที่มีสต็อกต่ำ และ {stats.zeroStockItems} รายการที่หมด
            </AlertDescription>
          </Alert>
        )}

        {/* Stock Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              รายการสต็อกวัตถุดิบ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">กำลังโหลดข้อมูล...</p>
              </div>
            ) : stocks.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">ไม่พบข้อมูลสต็อกวัตถุดิบ</p>
                <p className="text-gray-500 text-sm mt-1">ยังไม่มีการรับเข้าวัตถุดิบ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-4 font-medium text-gray-900">วัตถุดิบ</th>
                      <th className="text-left p-4 font-medium text-gray-900">Batch Number</th>
                      <th className="text-left p-4 font-medium text-gray-900">สต็อกปัจจุบัน</th>
                      <th className="text-left p-4 font-medium text-gray-900">หน่วย</th>
                      <th className="text-left p-4 font-medium text-gray-900">วันหมดอายุ</th>
                      <th className="text-left p-4 font-medium text-gray-900">สถานะ</th>
                      <th className="text-left p-4 font-medium text-gray-900">อัปเดตล่าสุด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // จัดกลุ่มข้อมูลตาม materialCode
                      const groupedStocks = stocks.reduce((acc, stock) => {
                        if (!acc[stock.materialCode]) {
                          acc[stock.materialCode] = []
                        }
                        acc[stock.materialCode].push(stock)
                        return acc
                      }, {} as Record<string, typeof stocks>)

                      return Object.entries(groupedStocks).map(([materialCode, materialStocks], groupIndex) => {
                        const firstStock = materialStocks[0]
                        const totalStockForMaterial = materialStocks.reduce((sum, s) => sum + s.currentStock, 0)
                        const batchCount = materialStocks.length

                        return (
                          <React.Fragment key={materialCode}>
                            {/* Header row for material group */}
                            <tr className="bg-blue-50 border-b-2 border-blue-200">
                              <td className="p-4" colSpan={7}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-bold text-gray-900 text-base">
                                      {firstStock.materialName}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                      {firstStock.materialCode} • {firstStock.materialType}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <div className="text-xs text-gray-600">จำนวน Batch</div>
                                      <div className="text-lg font-bold text-blue-600">{batchCount}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-gray-600">สต็อกรวม</div>
                                      <div className="text-lg font-bold text-green-600">
                                        {totalStockForMaterial.toLocaleString()} {firstStock.unit}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>

                            {/* Batch rows */}
                            {materialStocks.map((stock, index) => {
                              const expiryStatus = getExpiryStatus(stock.expiryDate)
                              return (
                                <tr
                                  key={stock.id}
                                  className={`border-b hover:bg-gray-50 ${
                                    index === materialStocks.length - 1 ? 'border-b-2 border-gray-300' : ''
                                  }`}
                                >
                                  <td className="p-4 pl-8">
                                    <div className="text-sm text-gray-500">
                                      ↳ Batch #{index + 1}
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <div className="font-mono text-sm text-blue-600 font-medium">
                                      {stock.batchNumber}
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <div className={`text-lg font-semibold ${
                                      stock.currentStock === 0
                                        ? 'text-red-600'
                                        : stock.currentStock <= 10
                                          ? 'text-yellow-600'
                                          : 'text-green-600'
                                    }`}>
                                      {stock.currentStock.toLocaleString()}
                                    </div>
                                  </td>
                                  <td className="p-4 text-gray-700">{stock.unit}</td>
                                  <td className="p-4">
                                    {stock.expiryDate ? (
                                      <div className="space-y-1">
                                        <div className="text-sm text-gray-900 flex items-center gap-1">
                                          <Calendar className="h-3 w-3 text-gray-400" />
                                          {formatExpiryDate(stock.expiryDate)}
                                        </div>
                                        {expiryStatus && (
                                          <Badge className={`${expiryStatus.color} text-xs`}>
                                            {expiryStatus.label}
                                          </Badge>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-sm">-</span>
                                    )}
                                  </td>
                                  <td className="p-4">
                                    {getStockBadge(stock.currentStock)}
                                  </td>
                                  <td className="p-4 text-gray-600 text-sm">
                                    {formatDate(stock.lastUpdated)}
                                  </td>
                                </tr>
                              )
                            })}
                          </React.Fragment>
                        )
                      })
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
