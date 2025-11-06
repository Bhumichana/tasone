'use client'

import { useState } from 'react'
import { Edit, Trash2, Eye, Package, Calendar, User, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface RawMaterialReceiving {
  id: string
  receivingNumber: string
  receivingDate: string
  purchaseOrderNo?: string
  supplier: string
  batchNumber: string
  receivedQuantity: number
  storageLocation: string
  expiryDate?: string
  qualityStatus: string
  notes?: string
  receivedBy: string
  createdAt: string
  rawMaterial: {
    id: string
    materialCode: string
    materialName: string
    materialType: string
    unit: string
  }
}

interface ReceivingListProps {
  receivings: RawMaterialReceiving[]
  onEdit: (receiving: RawMaterialReceiving) => void
  onDelete: (id: string) => void
  onView: (receiving: RawMaterialReceiving) => void
  loading?: boolean
}

const QUALITY_STATUS_CONFIG = {
  PENDING: { label: 'รอตรวจสอบ', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  APPROVED: { label: 'อนุมัติ', color: 'bg-green-100 text-green-800 border-green-200' },
  REJECTED: { label: 'ปฏิเสธ', color: 'bg-red-100 text-red-800 border-red-200' }
}

export default function ReceivingList({
  receivings,
  onEdit,
  onDelete,
  onView,
  loading = false
}: ReceivingListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // กรองและเรียงลำดับข้อมูล
  const filteredReceivings = receivings
    .filter(receiving => {
      const matchesSearch = searchTerm === '' ||
        receiving.receivingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receiving.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receiving.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receiving.rawMaterial.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receiving.rawMaterial.materialCode.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || statusFilter === '' || receiving.qualityStatus === statusFilter

      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      let aValue: any = a[sortBy as keyof RawMaterialReceiving]
      let bValue: any = b[sortBy as keyof RawMaterialReceiving]

      if (sortBy === 'rawMaterial') {
        aValue = a.rawMaterial.materialName
        bValue = b.rawMaterial.materialName
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* ส่วนค้นหาและกรอง */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Input
              placeholder="ค้นหาเลขที่ใบรับ, ผู้ผลิต, Batch, วัตถุดิบ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="สถานะทั้งหมด" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">สถานะทั้งหมด</SelectItem>
              <SelectItem value="PENDING">รอตรวจสอบ</SelectItem>
              <SelectItem value="APPROVED">อนุมัติ</SelectItem>
              <SelectItem value="REJECTED">ปฏิเสธ</SelectItem>
            </SelectContent>
          </Select>

          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
            const [field, order] = value.split('-')
            setSortBy(field)
            setSortOrder(order as 'asc' | 'desc')
          }}>
            <SelectTrigger>
              <SelectValue placeholder="เรียงตาม" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">วันที่สร้าง (ใหม่ → เก่า)</SelectItem>
              <SelectItem value="createdAt-asc">วันที่สร้าง (เก่า → ใหม่)</SelectItem>
              <SelectItem value="receivingDate-desc">วันที่รับเข้า (ใหม่ → เก่า)</SelectItem>
              <SelectItem value="receivingDate-asc">วันที่รับเข้า (เก่า → ใหม่)</SelectItem>
              <SelectItem value="receivingNumber-asc">เลขที่ใบรับ (A → Z)</SelectItem>
              <SelectItem value="supplier-asc">ผู้ผลิต (A → Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* ส่วนแสดงผลลำดับ */}
      <div className="text-sm text-gray-600">
        แสดง {filteredReceivings.length} รายการ จากทั้งหมด {receivings.length} รายการ
      </div>

      {/* รายการการรับเข้า */}
      {filteredReceivings.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่พบข้อมูลการรับเข้า</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter ? 'ลองเปลี่ยนเงื่อนไขการค้นหา' : 'ยังไม่มีการบันทึกการรับเข้าวัตถุดิบ'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReceivings.map((receiving) => (
            <Card key={receiving.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  {/* หัวข้อและสถานะ */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-blue-600">
                        {receiving.receivingNumber}
                      </h3>
                      <Badge
                        variant="outline"
                        className={QUALITY_STATUS_CONFIG[receiving.qualityStatus as keyof typeof QUALITY_STATUS_CONFIG]?.color}
                      >
                        {QUALITY_STATUS_CONFIG[receiving.qualityStatus as keyof typeof QUALITY_STATUS_CONFIG]?.label}
                      </Badge>
                      {receiving.purchaseOrderNo && (
                        <span className="text-sm text-gray-500">
                          PO: {receiving.purchaseOrderNo}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ข้อมูลวัตถุดิบ */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium">{receiving.rawMaterial.materialName}</p>
                        <p className="text-sm text-gray-600">
                          {receiving.rawMaterial.materialCode} | {receiving.rawMaterial.materialType}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium">{receiving.supplier}</p>
                        <p className="text-sm text-gray-600">ผู้ผลิต/ผู้ขาย</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium">{receiving.storageLocation}</p>
                        <p className="text-sm text-gray-600">สถานที่จัดเก็บ</p>
                      </div>
                    </div>
                  </div>

                  {/* ข้อมูลรายละเอียด */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">วันที่รับเข้า:</span>
                      <p className="font-medium">{formatDate(receiving.receivingDate)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Batch Number:</span>
                      <p className="font-medium">{receiving.batchNumber}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">วันหมดอายุ:</span>
                      <p className="font-medium">
                        {receiving.expiryDate ? formatDate(receiving.expiryDate) : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">ปริมาณ:</span>
                      <p className="font-medium">
                        {receiving.receivedQuantity.toLocaleString()} {receiving.rawMaterial.unit}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">ผู้บันทึก:</span>
                      <p className="font-medium">{receiving.receivedBy}</p>
                    </div>
                  </div>

                  {/* หมายเหตุ */}
                  {receiving.notes && (
                    <div className="bg-gray-50 p-3 rounded">
                      <span className="text-sm text-gray-600">หมายเหตุ: </span>
                      <span className="text-sm">{receiving.notes}</span>
                    </div>
                  )}

                  {/* ข้อมูลเวลา */}
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>บันทึกเมื่อ: {formatDateTime(receiving.createdAt)}</span>
                  </div>
                </div>

                {/* ปุ่มดำเนินการ */}
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onView(receiving)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(receiving)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(receiving.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}