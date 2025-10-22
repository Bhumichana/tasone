'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Package, Truck, CheckCircle, Clock, Send, Filter } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DeliveryForm from '@/components/material-delivery/DeliveryForm'

interface Dealer {
  id: string
  dealerName: string
  dealerCode: string
  region?: string
}

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
  dealer: Dealer
  items: DeliveryItem[]
  createdAt: string
  updatedAt: string
}

const STATUS_OPTIONS = [
  { value: 'PREPARING', label: 'เตรียมส่ง', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  { value: 'SHIPPING', label: 'กำลังส่ง', color: 'bg-blue-100 text-blue-800', icon: Truck },
  { value: 'DELIVERED', label: 'ส่งแล้ว', color: 'bg-green-100 text-green-800', icon: CheckCircle }
]

export default function MaterialDeliveriesPage() {
  const { data: session } = useSession()
  const [deliveries, setDeliveries] = useState<MaterialDelivery[]>([])
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dealerFilter, setDealerFilter] = useState('ALL')
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<MaterialDelivery | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'edit'>('list')

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    preparing: 0,
    shipping: 0,
    delivered: 0
  })

  useEffect(() => {
    fetchDeliveries()
    fetchDealers()
  }, [searchTerm, statusFilter, dealerFilter])

  const fetchDeliveries = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter)
      if (dealerFilter && dealerFilter !== 'ALL') params.append('dealerId', dealerFilter)

      const response = await fetch(`/api/material-deliveries?${params}`)
      if (response.ok) {
        const data = await response.json()
        setDeliveries(data.deliveries)

        // Calculate statistics
        const total = data.deliveries.length
        const preparing = data.deliveries.filter((d: MaterialDelivery) => d.status === 'PREPARING').length
        const shipping = data.deliveries.filter((d: MaterialDelivery) => d.status === 'SHIPPING').length
        const delivered = data.deliveries.filter((d: MaterialDelivery) => d.status === 'DELIVERED').length

        setStats({ total, preparing, shipping, delivered })
      } else {
        setError('ไม่สามารถดึงข้อมูลการส่งมอบได้')
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error)
      setError('เกิดข้อผิดพลาดในการดึงข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const fetchDealers = async () => {
    try {
      const response = await fetch('/api/dealers')
      if (response.ok) {
        const data = await response.json()
        setDealers(data.dealers || [])
      }
    } catch (error) {
      console.error('Error fetching dealers:', error)
    }
  }

  const handleStatusChange = async (deliveryId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/material-deliveries/${deliveryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchDeliveries() // Refresh data
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'ไม่สามารถอัปเดตสถานะได้')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      setError('เกิดข้อผิดพลาดในการอัปเดตสถานะ')
    }
  }

  const handleDelete = async (deliveryId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบการส่งมอบนี้?')) return

    try {
      const response = await fetch(`/api/material-deliveries/${deliveryId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchDeliveries() // Refresh data
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'ไม่สามารถลบการส่งมอบได้')
      }
    } catch (error) {
      console.error('Error deleting delivery:', error)
      setError('เกิดข้อผิดพลาดในการลบการส่งมอบ')
    }
  }

  const handleFormSubmit = async (formData: any) => {
    setFormLoading(true)
    try {
      const isEditing = viewMode === 'edit' && selectedDelivery
      const url = isEditing
        ? `/api/material-deliveries/${selectedDelivery.id}`
        : '/api/material-deliveries'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setShowForm(false)
        setViewMode('list')
        setSelectedDelivery(null)
        fetchDeliveries() // Refresh data
        setError('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || `ไม่สามารถ${isEditing ? 'แก้ไข' : 'สร้าง'}การส่งมอบได้`)
      }
    } catch (error) {
      console.error('Error submitting delivery:', error)
      setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    } finally {
      setFormLoading(false)
    }
  }

  const handleViewDetail = async (deliveryId: string) => {
    try {
      const response = await fetch(`/api/material-deliveries/${deliveryId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedDelivery(data.delivery)
        setViewMode('detail')
      } else {
        setError('ไม่สามารถดึงข้อมูลการส่งมอบได้')
      }
    } catch (error) {
      console.error('Error fetching delivery detail:', error)
      setError('เกิดข้อผิดพลาดในการดึงข้อมูล')
    }
  }

  const handleEdit = async (deliveryId: string) => {
    try {
      const response = await fetch(`/api/material-deliveries/${deliveryId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedDelivery(data.delivery)
        setViewMode('edit')
        setShowForm(true)
      } else {
        setError('ไม่สามารถดึงข้อมูลการส่งมอบได้')
      }
    } catch (error) {
      console.error('Error fetching delivery for edit:', error)
      setError('เกิดข้อผิดพลาดในการดึงข้อมูล')
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

  if (!session) return null

  if (showForm) {
    const initialData = selectedDelivery ? {
      deliveryDate: selectedDelivery.deliveryDate.split('T')[0],
      dealerId: selectedDelivery.dealer.id,
      status: selectedDelivery.status,
      notes: selectedDelivery.notes || '',
      items: selectedDelivery.items.map(item => ({
        id: item.id,
        rawMaterialId: item.rawMaterialId,
        batchNumber: item.batchNumber,
        quantity: item.quantity,
        unit: item.unit
      }))
    } : undefined

    return (
      <DashboardLayout>
        <DeliveryForm
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false)
            setViewMode('list')
            setSelectedDelivery(null)
            setError('')
          }}
          loading={formLoading}
          initialData={initialData}
          isEditing={viewMode === 'edit'}
        />
      </DashboardLayout>
    )
  }

  // Detail View
  if (viewMode === 'detail' && selectedDelivery) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">รายละเอียดการส่งมอบ</h1>
              <p className="text-sm text-gray-600 mt-1">
                เลขที่: {selectedDelivery.deliveryNumber}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setViewMode('list')
                  setSelectedDelivery(null)
                }}
              >
                กลับ
              </Button>
              {session.user.userGroup === 'HeadOffice' && (
                <Button
                  onClick={() => handleEdit(selectedDelivery.id)}
                >
                  แก้ไข
                </Button>
              )}
            </div>
          </div>

          {/* Delivery Info */}
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลการส่งมอบ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>เลขที่การส่งมอบ</Label>
                  <p className="font-medium">{selectedDelivery.deliveryNumber}</p>
                </div>
                <div>
                  <Label>วันที่ส่งมอบ</Label>
                  <p className="font-medium">{formatDate(selectedDelivery.deliveryDate)}</p>
                </div>
                <div>
                  <Label>ตัวแทนจำหน่าย</Label>
                  <p className="font-medium">{selectedDelivery.dealer.dealerName}</p>
                  <p className="text-sm text-gray-500">{selectedDelivery.dealer.dealerCode}</p>
                </div>
                <div>
                  <Label>สถานะ</Label>
                  <div className="mt-1">{getStatusBadge(selectedDelivery.status)}</div>
                </div>
                <div className="md:col-span-2">
                  <Label>หมายเหตุ</Label>
                  <p className="font-medium">{selectedDelivery.notes || 'ไม่มี'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items List */}
          <Card>
            <CardHeader>
              <CardTitle>รายการวัตถุดิบ ({selectedDelivery.items.length} รายการ)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium text-gray-900">วัตถุดิบ</th>
                      <th className="text-left p-4 font-medium text-gray-900">Batch Number</th>
                      <th className="text-left p-4 font-medium text-gray-900">ปริมาณ</th>
                      <th className="text-left p-4 font-medium text-gray-900">หน่วย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDelivery.items.map((item, index) => (
                      <tr key={item.id || index} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div className="font-medium">{item.rawMaterial.materialName}</div>
                          <div className="text-sm text-gray-500">
                            {item.rawMaterial.materialCode} • {item.rawMaterial.materialType}
                          </div>
                        </td>
                        <td className="p-4 text-gray-900">{item.batchNumber}</td>
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
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">การส่งมอบวัตถุดิบ</h1>
            <p className="text-sm text-gray-600 mt-1">
              จัดการการส่งมอบวัตถุดิบให้ตัวแทนจำหน่าย
            </p>
          </div>
          {session.user.userGroup === 'HeadOffice' && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-navy-900 hover:bg-navy-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มการส่งมอบ
            </button>
          )}
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
              <CardTitle className="text-sm font-medium">เตรียมส่ง</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.preparing}</div>
              <p className="text-xs text-gray-600">รอการส่งมอบ</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">กำลังส่ง</CardTitle>
              <Truck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.shipping}</div>
              <p className="text-xs text-gray-600">อยู่ระหว่างขนส่ง</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ส่งแล้ว</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
              <p className="text-xs text-gray-600">ส่งมอบสำเร็จ</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="ค้นหาเลขที่การส่งมอบ, ตัวแทนจำหน่าย"
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
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Dealer Filter */}
              <Select value={dealerFilter} onValueChange={setDealerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="กรองตามตัวแทนจำหน่าย" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  <SelectItem value="ALL">ทุกตัวแทนจำหน่าย</SelectItem>
                  {dealers.map((dealer) => (
                    <SelectItem key={dealer.id} value={dealer.id}>
                      {dealer.dealerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('ALL')
                  setDealerFilter('ALL')
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
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Deliveries Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              รายการส่งมอบวัตถุดิบ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">กำลังโหลดข้อมูล...</p>
              </div>
            ) : deliveries.length === 0 ? (
              <div className="text-center py-8">
                <Send className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">ไม่พบข้อมูลการส่งมอบ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium text-gray-900">เลขที่การส่งมอบ</th>
                      <th className="text-left p-4 font-medium text-gray-900">วันที่ส่งมอบ</th>
                      <th className="text-left p-4 font-medium text-gray-900">ตัวแทนจำหน่าย</th>
                      <th className="text-left p-4 font-medium text-gray-900">จำนวนรายการ</th>
                      <th className="text-left p-4 font-medium text-gray-900">สถานะ</th>
                      <th className="text-left p-4 font-medium text-gray-900">การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((delivery) => (
                      <tr key={delivery.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div className="font-medium text-blue-600">
                            {delivery.deliveryNumber}
                          </div>
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
                        <td className="p-4">
                          <div className="font-medium text-gray-900">
                            {delivery.dealer.dealerName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {delivery.dealer.dealerCode}
                            {delivery.dealer.region && ` • ${delivery.dealer.region}`}
                          </div>
                        </td>
                        <td className="p-4 text-gray-900">
                          {delivery.totalItems} รายการ
                        </td>
                        <td className="p-4">
                          {getStatusBadge(delivery.status)}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetail(delivery.id)}
                            >
                              ดูรายละเอียด
                            </Button>
                            {session.user.userGroup === 'HeadOffice' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(delivery.id)}
                                >
                                  แก้ไข
                                </Button>
                                {delivery.status === 'PREPARING' && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDelete(delivery.id)}
                                  >
                                    ลบ
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
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