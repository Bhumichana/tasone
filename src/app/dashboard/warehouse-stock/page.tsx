'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
  Calendar,
  CheckCircle,
  XCircle,
  Warehouse,
  Box
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface RawMaterial {
  id: string
  materialCode: string
  materialName: string
  materialType: string
  unit: string
}

interface Batch {
  id: string
  batchNumber: string
  currentStock: number
  initialQuantity: number
  unit: string
  supplier: string
  receivedDate: string
  expiryDate: string | null
  storageLocation: string
  status: string
  isRecertified: boolean
  recertificationCount: number
  lastRecertifiedAt: string | null
  rawMaterial: RawMaterial
  createdAt: string
  updatedAt: string
}

interface Stats {
  totalBatches: number
  totalStock: number
  totalValue: number
  expiredBatches: number
  lowStockBatches: number
  zeroStockBatches: number
  availableBatches: number
}

export default function WarehouseStockPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [batches, setBatches] = useState<Batch[]>([])
  const [stats, setStats] = useState<Stats>({
    totalBatches: 0,
    totalStock: 0,
    totalValue: 0,
    expiredBatches: 0,
    lowStockBatches: 0,
    zeroStockBatches: 0,
    availableBatches: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [lowStockFilter, setLowStockFilter] = useState(false)
  const [error, setError] = useState('')
  const [showRecertifyModal, setShowRecertifyModal] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ตรวจสอบสิทธิ์
  useEffect(() => {
    if (status === 'loading') return

    if (!session || session.user.userGroup !== 'HeadOffice') {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  useEffect(() => {
    if (session && session.user.userGroup === 'HeadOffice') {
      fetchStock()
    }
  }, [session, searchTerm, statusFilter, lowStockFilter])

  const fetchStock = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (lowStockFilter) params.append('lowStock', 'true')

      const response = await fetch(`/api/warehouse-stock?${params}`)
      if (response.ok) {
        const data = await response.json()
        setBatches(data.batches)
        setStats(data.stats)
        setError('')
      } else {
        setError('ไม่สามารถดึงข้อมูลสต็อกได้')
      }
    } catch (error) {
      console.error('Error fetching stock:', error)
      setError('เกิดข้อผิดพลาดในการดึงข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const handleRecertify = async () => {
    if (!selectedBatch) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/warehouse-stock/${selectedBatch.id}/recertify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        alert('ต่ออายุวัตถุดิบสำเร็จ!')
        setShowRecertifyModal(false)
        setSelectedBatch(null)
        fetchStock()
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error recertifying:', error)
      alert('เกิดข้อผิดพลาดในการต่ออายุ')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { label: 'ไม่ระบุ', color: 'bg-gray-100 text-gray-800', icon: null }

    const now = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      return { label: 'หมดอายุแล้ว', color: 'bg-red-100 text-red-800', icon: XCircle }
    } else if (daysUntilExpiry <= 30) {
      return { label: `เหลือ ${daysUntilExpiry} วัน`, color: 'bg-orange-100 text-orange-800', icon: AlertTriangle }
    } else if (daysUntilExpiry <= 90) {
      return { label: `เหลือ ${daysUntilExpiry} วัน`, color: 'bg-yellow-100 text-yellow-800', icon: Calendar }
    } else {
      return { label: `เหลือ ${daysUntilExpiry} วัน`, color: 'bg-green-100 text-green-800', icon: CheckCircle }
    }
  }

  const getStockStatus = (stock: number) => {
    if (stock === 0) {
      return { label: 'หมด', color: 'bg-red-100 text-red-800', icon: Archive }
    } else if (stock < 10) {
      return { label: 'ต่ำ', color: 'bg-yellow-100 text-yellow-800', icon: TrendingDown }
    } else {
      return { label: 'ปกติ', color: 'bg-green-100 text-green-800', icon: Package }
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      'AVAILABLE': { label: 'พร้อมใช้', color: 'bg-green-100 text-green-800' },
      'EXPIRED': { label: 'หมดอายุ', color: 'bg-red-100 text-red-800' },
      'DEPLETED': { label: 'หมด', color: 'bg-gray-100 text-gray-800' },
      'RESERVED': { label: 'จอง', color: 'bg-blue-100 text-blue-800' }
    }

    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
    return <Badge className={config.color}>{config.label}</Badge>
  }

  if (!session) return null

  // Check if user is not HeadOffice
  if (session.user.userGroup !== 'HeadOffice') {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-gray-600">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
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
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Warehouse className="h-7 w-7" />
              คลังสต็อกวัตถุดิบ (HeadOffice)
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              จัดการและตรวจสอบสต็อกวัตถุดิบแยกตาม Batch
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
              <CardTitle className="text-sm font-medium">Batch ทั้งหมด</CardTitle>
              <Box className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalBatches}</div>
              <p className="text-xs text-gray-600">รายการ</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">สต็อกรวม</CardTitle>
              <Package className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.totalStock.toLocaleString()}
              </div>
              <p className="text-xs text-gray-600">หน่วย</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">หมดอายุ</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.expiredBatches}</div>
              <p className="text-xs text-gray-600">Batch</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">สต็อกต่ำ</CardTitle>
              <TrendingDown className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.lowStockBatches}</div>
              <p className="text-xs text-gray-600">Batch</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="ค้นหา Batch, รหัสวัตถุดิบ, ชื่อ, ผู้จำหน่าย..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="สถานะ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">ทั้งหมด</SelectItem>
                    <SelectItem value="AVAILABLE">พร้อมใช้</SelectItem>
                    <SelectItem value="EXPIRED">หมดอายุ</SelectItem>
                    <SelectItem value="DEPLETED">หมด</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Low Stock Filter */}
              <div>
                <Button
                  variant={lowStockFilter ? "default" : "outline"}
                  onClick={() => setLowStockFilter(!lowStockFilter)}
                  className="w-full gap-2"
                >
                  <Filter className="h-4 w-4" />
                  สต็อกต่ำ
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Stock Table - Grouped by Material */}
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
                </div>
              </CardContent>
            </Card>
          ) : batches.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>ไม่พบข้อมูลสต็อก</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            // Group batches by material
            (() => {
              const groupedBatches = batches.reduce((acc: any, batch) => {
                const key = batch.rawMaterial.materialCode
                if (!acc[key]) {
                  acc[key] = {
                    material: batch.rawMaterial,
                    batches: [],
                    totalStock: 0
                  }
                }
                acc[key].batches.push(batch)
                acc[key].totalStock += batch.currentStock
                return acc
              }, {})

              return Object.entries(groupedBatches).map(([materialCode, data]: [string, any]) => (
                <Card key={materialCode}>
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Package className="h-5 w-5 text-blue-600" />
                          <span className="text-blue-900">{data.material.materialCode}</span>
                          <span className="text-gray-600">-</span>
                          <span className="text-gray-700 font-medium">{data.material.materialName}</span>
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {data.material.materialType}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">สต็อกรวม</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {data.totalStock.toLocaleString()} {data.material.unit}
                        </div>
                        <div className="text-xs text-gray-500">
                          {data.batches.length} Batch
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Batch</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">สต็อก</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">สถานที่</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">ซัพพลายเออร์</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">วันหมดอายุ</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">สถานะ</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">การดำเนินการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {data.batches.map((batch: Batch) => {
                            const expiryStatus = getExpiryStatus(batch.expiryDate)
                            const stockStatus = getStockStatus(batch.currentStock)
                            const ExpiryIcon = expiryStatus.icon
                            const StockIcon = stockStatus.icon

                            return (
                              <tr key={batch.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-900">{batch.batchNumber}</div>
                                  <div className="text-xs text-gray-500">
                                    รับเข้า: {formatDate(batch.receivedDate)}
                                  </div>
                                  {batch.isRecertified && (
                                    <Badge className="mt-1 bg-purple-100 text-purple-800 text-xs">
                                      ต่ออายุแล้ว ({batch.recertificationCount}x)
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="font-bold text-gray-900">
                                    {batch.currentStock.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-gray-500">{batch.unit}</div>
                                  <Badge className={`${stockStatus.color} gap-1 mt-1`}>
                                    <StockIcon className="h-3 w-3" />
                                    {stockStatus.label}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm text-gray-900">{batch.storageLocation}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm text-gray-900">{batch.supplier}</div>
                                </td>
                                <td className="px-4 py-3">
                                  {batch.expiryDate ? (
                                    <>
                                      <div className="text-sm text-gray-900">{formatDate(batch.expiryDate)}</div>
                                      <Badge className={`${expiryStatus.color} gap-1 mt-1`}>
                                        {ExpiryIcon && <ExpiryIcon className="h-3 w-3" />}
                                        {expiryStatus.label}
                                      </Badge>
                                    </>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {getStatusBadge(batch.status)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {batch.expiryDate && new Date(batch.expiryDate) < new Date() && batch.currentStock > 0 ? (
                                    <Button
                                      onClick={() => {
                                        setSelectedBatch(batch)
                                        setShowRecertifyModal(true)
                                      }}
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white gap-1"
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                      ต่ออายุ
                                    </Button>
                                  ) : (
                                    <span className="text-gray-400 text-sm">-</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))
            })()
          )}
        </div>
      </div>

      {/* Recertification Modal */}
      {showRecertifyModal && selectedBatch && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              ยืนยันการต่ออายุวัตถุดิบ
            </h3>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md">
                <p className="text-sm">
                  <span className="font-medium">วัตถุดิบ:</span> {selectedBatch.rawMaterial.materialName}
                </p>
                <p className="text-sm">
                  <span className="font-medium">รหัส:</span> {selectedBatch.rawMaterial.materialCode}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Batch:</span> {selectedBatch.batchNumber}
                </p>
                <p className="text-sm">
                  <span className="font-medium">สต็อก:</span> {selectedBatch.currentStock.toLocaleString()} {selectedBatch.unit}
                </p>
                <p className="text-sm">
                  <span className="font-medium">วันหมดอายุเดิม:</span> {formatDate(selectedBatch.expiryDate!)}
                </p>
                <p className="text-sm font-bold text-green-600">
                  <span className="font-medium text-gray-700">วันหมดอายุใหม่:</span>{' '}
                  {formatDate(
                    new Date(
                      new Date(selectedBatch.expiryDate!).getTime() + 60 * 24 * 60 * 60 * 1000
                    ).toISOString()
                  )}
                </p>
                <p className="text-sm">
                  <span className="font-medium">ต่ออายุ:</span> +60 วัน
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                <p className="text-xs text-yellow-800">
                  <strong>หมายเหตุ:</strong> การต่ออายุจะเปลี่ยนสถานะจาก "หมดอายุ" เป็น "พร้อมใช้"
                  และจะไม่สามารถย้อนกลับได้
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  onClick={() => {
                    setShowRecertifyModal(false)
                    setSelectedBatch(null)
                  }}
                  disabled={submitting}
                  variant="outline"
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleRecertify}
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitting ? 'กำลังดำเนินการ...' : 'ยืนยันต่ออายุ'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
