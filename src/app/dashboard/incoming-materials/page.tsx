'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Package,
  Search,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Eye,
  Plus,
  Filter
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import IncomingMaterialForm from '@/components/incoming-materials/IncomingMaterialForm'
import ErrorBoundary from '@/components/ErrorBoundary'

interface RawMaterial {
  id: string
  materialCode: string
  materialName: string
  materialType: string
  unit: string
}

interface DeliveryItem {
  id: string
  rawMaterialId: string
  rawMaterial: RawMaterial
  batchNumber: string
  quantity: number
  unit: string
}

interface MaterialDelivery {
  id: string
  deliveryNumber: string
  deliveryDate: string
  status: string
  totalItems: number
  notes?: string
  dealer: {
    id: string
    dealerName: string
    dealerCode: string
  }
  items: DeliveryItem[]
  createdAt: string
}

interface DealerReceipt {
  id: string
  receiptNumber: string
  receiptDate: string
  receivedBy: string
  status: string
  notes?: string
  materialDelivery: MaterialDelivery
  items: any[]
  createdAt: string
}

const STATUS_OPTIONS = [
  { value: 'PENDING_RECEIPT', label: 'รอรับเข้า', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  { value: 'DELIVERED', label: 'รับเข้าแล้ว', color: 'bg-green-100 text-green-800', icon: CheckCircle }
]

export default function IncomingMaterialsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [receipts, setReceipts] = useState<DealerReceipt[]>([])
  const [pendingDeliveries, setPendingDeliveries] = useState<MaterialDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<MaterialDelivery | null>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<DealerReceipt | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'create'>('list')

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    received: 0,
    overdue: 0
  })

  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      if (mounted) {
        await fetchIncomingMaterials()

        // Check for success parameter in URL
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('success') === 'true') {
          setSuccessMessage('รับเข้าวัตถุดิบเรียบร้อยแล้ว')

          // Clear success parameter from URL without reload
          window.history.replaceState({}, '', '/dashboard/incoming-materials')

          // Auto-hide success message after 5 seconds
          setTimeout(() => {
            setSuccessMessage('')
          }, 5000)
        }
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [searchTerm, statusFilter])

  const fetchIncomingMaterials = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter)

      const response = await fetch(`/api/dealer-receipts?${params}`)
      if (response.ok) {
        const data = await response.json()

        // Safely set receipts with validation
        const validReceipts = (data.receipts || []).filter((receipt: DealerReceipt) => {
          return receipt && receipt.materialDelivery && receipt.materialDelivery.items
        })

        // Safely set pending deliveries with validation
        const validPendingDeliveries = (data.pendingDeliveries || []).filter((delivery: MaterialDelivery) => {
          return delivery && delivery.items && delivery.items.length > 0
        })

        setReceipts(validReceipts)
        setPendingDeliveries(validPendingDeliveries)

        // Calculate statistics
        const total = validReceipts.length + validPendingDeliveries.length
        const pending = validPendingDeliveries.length
        const received = validReceipts.length

        // Calculate overdue (deliveries older than 3 days)
        const threeDaysAgo = new Date()
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
        const overdue = validPendingDeliveries.filter((delivery: MaterialDelivery) =>
          new Date(delivery.deliveryDate) < threeDaysAgo
        ).length

        setStats({ total, pending, received, overdue })
      } else {
        setError('ไม่สามารถดึงข้อมูลการรับเข้าวัตถุดิบได้')
      }
    } catch (error) {
      console.error('Error fetching incoming materials:', error)
      setError('เกิดข้อผิดพลาดในการดึงข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateReceipt = (delivery: MaterialDelivery) => {
    setSelectedDelivery(delivery)
    setViewMode('create')
    setShowForm(true)
  }

  const handleViewReceipt = async (receiptId: string) => {
    try {
      const response = await fetch(`/api/dealer-receipts/${receiptId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedReceipt(data.receipt)
        setViewMode('detail')
      } else {
        setError('ไม่สามารถดึงข้อมูลการรับเข้าวัตถุดิบได้')
      }
    } catch (error) {
      console.error('Error fetching receipt detail:', error)
      setError('เกิดข้อผิดพลาดในการดึงข้อมูล')
    }
  }

  const handleFormSubmit = async (formData: any) => {
    // Prevent multiple submissions
    if (formLoading) return

    setFormLoading(true)
    setError('')

    try {
      // Submit the form data
      const response = await fetch('/api/dealer-receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'ไม่สามารถบันทึกข้อมูลได้' }))
        setFormLoading(false)
        setError(errorData.error || 'ไม่สามารถบันทึกข้อมูลได้')
        return
      }

      // Success - use window.location for guaranteed redirect
      // ErrorBoundary will handle any errors during transition
      window.location.href = '/dashboard/incoming-materials?success=true'

    } catch (error: any) {
      console.error('Error creating receipt:', error)
      setFormLoading(false)
      setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(option => option.value === status)
    if (!statusOption) return null

    const Icon = statusOption.icon
    return (
      <Badge className={`${statusOption.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {statusOption.label}
      </Badge>
    )
  }

  const isOverdue = (deliveryDate: string) => {
    const delivery = new Date(deliveryDate)
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    return delivery < threeDaysAgo
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

  if (showForm && selectedDelivery) {
    return (
      <ErrorBoundary autoRecover={true} recoveryDelay={100}>
        <DashboardLayout>
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
          <IncomingMaterialForm
            delivery={selectedDelivery}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowForm(false)
              setViewMode('list')
              setSelectedDelivery(null)
              setError('')
              setSuccessMessage('')
            }}
            loading={formLoading}
          />
        </DashboardLayout>
      </ErrorBoundary>
    )
  }

  // Detail View
  if (viewMode === 'detail' && selectedReceipt) {
    return (
      <ErrorBoundary autoRecover={true} recoveryDelay={100}>
        <DashboardLayout>
          <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">รายละเอียดการรับเข้าวัตถุดิบ</h1>
              <p className="text-sm text-gray-600 mt-1">
                เลขที่ใบรับ: {selectedReceipt.receiptNumber}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setViewMode('list')
                setSelectedReceipt(null)
              }}
            >
              กลับ
            </Button>
          </div>

          {/* Receipt Info */}
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลการรับเข้าวัตถุดิบ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>เลขที่ใบรับ</Label>
                  <p className="font-medium">{selectedReceipt.receiptNumber}</p>
                </div>
                <div>
                  <Label>วันที่รับเข้า</Label>
                  <p className="font-medium">{formatDate(selectedReceipt.receiptDate)}</p>
                </div>
                <div>
                  <Label>ผู้รับเข้าสินค้า</Label>
                  <p className="font-medium">{selectedReceipt.receivedBy}</p>
                </div>
                <div>
                  <Label>เลขที่การส่งมอบ</Label>
                  <p className="font-medium text-blue-600">{selectedReceipt.materialDelivery.deliveryNumber}</p>
                </div>
                <div className="md:col-span-2">
                  <Label>หมายเหตุ</Label>
                  <p className="font-medium">{selectedReceipt.notes || 'ไม่มี'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items List */}
          <Card>
            <CardHeader>
              <CardTitle>รายการวัตถุดิบที่รับเข้า ({selectedReceipt.materialDelivery.items.length} รายการ)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium text-gray-900">วัตถุดิบ</th>
                      <th className="text-left p-4 font-medium text-gray-900">Batch Number</th>
                      <th className="text-left p-4 font-medium text-gray-900">ปริมาณที่ส่ง</th>
                      <th className="text-left p-4 font-medium text-gray-900">ปริมาณที่รับ</th>
                      <th className="text-left p-4 font-medium text-gray-900">หน่วย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReceipt.materialDelivery.items
                      .filter(item => item.rawMaterial) // กรองเฉพาะ item ที่มี rawMaterial
                      .map((item, index) => (
                      <tr key={item.id || index} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div className="font-medium">{item.rawMaterial?.materialName || 'ไม่ระบุ'}</div>
                          <div className="text-sm text-gray-500">
                            {item.rawMaterial?.materialCode || '-'} • {item.rawMaterial?.materialType || '-'}
                          </div>
                        </td>
                        <td className="p-4 text-gray-900">{item.batchNumber}</td>
                        <td className="p-4 text-gray-900">{item.quantity.toLocaleString()}</td>
                        <td className="p-4 text-gray-900">{item.quantity.toLocaleString()}</td>
                        <td className="p-4 text-gray-900">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary autoRecover={true} recoveryDelay={100}>
      <DashboardLayout>
        {/* Loading Overlay during form submission */}
        {formLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <div>
                  <p className="font-medium text-gray-900">กำลังประมวลผล...</p>
                  <p className="text-sm text-gray-600">กรุณารอสักครู่</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">การรับเข้าวัตถุดิบ</h1>
            <p className="text-sm text-gray-600 mt-1">
              จัดการการรับเข้าวัตถุดิบจากสำนักงานใหญ่
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ทั้งหมด</CardTitle>
              <Package className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <p className="text-xs text-gray-600">รายการทั้งหมด</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">รอรับเข้า</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-gray-600">ยังไม่รับเข้า</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">รับเข้าแล้ว</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.received}</div>
              <p className="text-xs text-gray-600">สำเร็จแล้ว</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">เกินกำหนด</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <p className="text-xs text-gray-600">เกิน 3 วัน</p>
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
                  placeholder="ค้นหาเลขที่ใบรับ, เลขที่การส่งมอบ"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="กรองตามสถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ทุกสถานะ</SelectItem>
                  <SelectItem value="PENDING_RECEIPT">รอรับเข้า</SelectItem>
                  <SelectItem value="DELIVERED">รับเข้าแล้ว</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('ALL')
                }}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                ล้างตัวกรอง
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Success Alert */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Overdue Alert */}
        {stats.overdue > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              คำเตือน: มีการส่งมอบ {stats.overdue} รายการที่ยังไม่ได้รับเข้าเกิน 3 วัน กรุณาตรวจสอบ
            </AlertDescription>
          </Alert>
        )}

        {/* Pending Deliveries */}
        {pendingDeliveries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                การส่งมอบที่รอรับเข้า ({pendingDeliveries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium text-gray-900">เลขที่การส่งมอบ</th>
                      <th className="text-left p-4 font-medium text-gray-900">วันที่ส่งมอบ</th>
                      <th className="text-left p-4 font-medium text-gray-900">จำนวนรายการ</th>
                      <th className="text-left p-4 font-medium text-gray-900">ปริมาณ</th>
                      <th className="text-left p-4 font-medium text-gray-900">การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDeliveries.map((delivery) => {
                      if (!delivery || !delivery.items || delivery.items.length === 0) {
                        return null
                      }
                      return (
                      <tr
                        key={delivery.id}
                        className={`border-b hover:bg-gray-50 ${
                          isOverdue(delivery.deliveryDate) ? 'bg-red-50' : ''
                        }`}
                      >
                        <td className="p-4">
                          <div className="font-medium text-blue-600">
                            {delivery.deliveryNumber}
                          </div>
                          {isOverdue(delivery.deliveryDate) && (
                            <Badge className="bg-red-100 text-red-800 gap-1 mt-1">
                              <AlertTriangle className="h-3 w-3" />
                              เกินกำหนด
                            </Badge>
                          )}
                          {delivery.notes && (
                            <div className="text-sm text-gray-500 mt-1">
                              {delivery.notes.substring(0, 50)}
                              {delivery.notes.length > 50 && '...'}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-gray-900">
                          {formatDate(delivery.deliveryDate)}
                        </td>
                        <td className="p-4 text-gray-900">
                          {delivery.totalItems} รายการ
                        </td>
                        <td className="p-4 text-gray-900">
                          <div className="space-y-1">
                            {/* รวมปริมาณตามหน่วย */}
                            {Object.entries(
                              delivery.items
                                .filter(item => item.rawMaterial && item.unit && item.quantity)
                                .reduce((acc: Record<string, number>, item) => {
                                  acc[item.unit] = (acc[item.unit] || 0) + item.quantity
                                  return acc
                                }, {})
                            ).map(([unit, total]) => (
                              <div key={unit} className="text-sm">
                                {Number(total).toFixed(2)} {unit}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          <Button
                            size="sm"
                            onClick={() => handleCreateReceipt(delivery)}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            รับเข้าสินค้า
                          </Button>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Received Materials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              ประวัติการรับเข้าวัตถุดิบ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">กำลังโหลดข้อมูล...</p>
              </div>
            ) : receipts.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">ไม่พบประวัติการรับเข้าวัตถุดิบ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium text-gray-900">เลขที่ใบรับ</th>
                      <th className="text-left p-4 font-medium text-gray-900">วันที่รับเข้า</th>
                      <th className="text-left p-4 font-medium text-gray-900">เลขที่การส่งมอบ</th>
                      <th className="text-left p-4 font-medium text-gray-900">ผู้รับเข้า</th>
                      <th className="text-left p-4 font-medium text-gray-900">การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt) => {
                      if (!receipt || !receipt.materialDelivery) {
                        return null
                      }
                      return (
                        <tr key={receipt.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div className="font-medium text-green-600">
                              {receipt.receiptNumber}
                            </div>
                            {receipt.notes && (
                              <div className="text-sm text-gray-500 mt-1">
                                {receipt.notes.substring(0, 50)}
                                {receipt.notes.length > 50 && '...'}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-gray-900">
                            {formatDate(receipt.receiptDate)}
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-blue-600">
                              {receipt.materialDelivery?.deliveryNumber || '-'}
                            </div>
                          </td>
                          <td className="p-4 text-gray-900">
                            {receipt.receivedBy}
                          </td>
                          <td className="p-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewReceipt(receipt.id)}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              ดูรายละเอียด
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
    </ErrorBoundary>
  )
}