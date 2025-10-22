'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Save,
  Package,
  CheckCircle,
  AlertTriangle,
  Calendar,
  User,
  FileText
} from 'lucide-react'

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

interface IncomingMaterialFormProps {
  delivery: MaterialDelivery
  onSubmit: (data: any) => void
  onCancel: () => void
  loading?: boolean
}

interface ReceiptItem {
  rawMaterialId: string
  materialCode: string
  materialName: string
  materialType: string
  batchNumber: string
  quantity: number
  unit: string
  receivedQuantity: number
  notes?: string
}

export default function IncomingMaterialForm({
  delivery,
  onSubmit,
  onCancel,
  loading = false
}: IncomingMaterialFormProps) {
  const { data: session } = useSession()

  const [formData, setFormData] = useState({
    receiptDate: new Date().toISOString().slice(0, 10),
    receivedBy: '',
    notes: ''
  })

  const [items, setItems] = useState<ReceiptItem[]>([])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    // Initialize items from delivery
    if (delivery?.items && Array.isArray(delivery.items)) {
      const initialItems: ReceiptItem[] = delivery.items.map(item => ({
        rawMaterialId: item.rawMaterialId,
        materialCode: item.rawMaterial.materialCode,
        materialName: item.rawMaterial.materialName,
        materialType: item.rawMaterial.materialType,
        batchNumber: item.batchNumber,
        quantity: item.quantity,
        unit: item.unit,
        receivedQuantity: item.quantity, // Default to full quantity (ตามที่ส่งมา)
        notes: ''
      }))
      setItems(initialItems)
    }
  }, [delivery])

  useEffect(() => {
    // Set default receivedBy from session user
    if (session?.user) {
      const userName = `${session.user.firstName} ${session.user.lastName}`.trim()
      setFormData(prev => ({
        ...prev,
        receivedBy: userName
      }))
    }
  }, [session])

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.receivedBy.trim()) {
      newErrors.receivedBy = 'กรุณากรอกชื่อผู้รับเข้าสินค้า'
    }

    if (!formData.receiptDate) {
      newErrors.receiptDate = 'กรุณาเลือกวันที่รับเข้า'
    }

    // ไม่ต้อง validate receivedQuantity แล้ว เพราะรับเข้าตามปริมาณที่ส่งมาอัตโนมัติ

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleItemChange = (index: number, field: keyof ReceiptItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)

    // Clear validation error for this field
    const errorKey = `item_${index}_${field}`
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const submitData = {
      materialDeliveryId: delivery.id,
      receiptDate: formData.receiptDate,
      receivedBy: formData.receivedBy,
      notes: formData.notes,
      items: items.map(item => ({
        rawMaterialId: item.rawMaterialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        materialType: item.materialType,
        batchNumber: item.batchNumber,
        quantity: item.quantity,
        unit: item.unit,
        receivedQuantity: item.receivedQuantity,
        notes: item.notes || ''
      }))
    }

    console.log('Submitting data:', submitData)
    onSubmit(submitData)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getTotalItems = () => items.length
  const getTotalQuantity = () => items.reduce((sum, item) => sum + item.quantity, 0)
  const getTotalReceived = () => items.reduce((sum, item) => sum + item.receivedQuantity, 0)
  const getReceivePercentage = () => {
    const total = getTotalQuantity()
    const received = getTotalReceived()
    return total > 0 ? Math.round((received / total) * 100) : 0
  }

  // Safety check
  if (!delivery || !delivery.items || delivery.items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">ไม่พบข้อมูลการส่งมอบ</p>
          <Button onClick={onCancel} className="mt-4">
            กลับ
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">รับเข้าวัตถุดิบ</h1>
          <p className="text-sm text-gray-600 mt-1">
            การส่งมอบ: {delivery.deliveryNumber}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onCancel}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Delivery Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              ข้อมูลการส่งมอบ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label>เลขที่การส่งมอบ</Label>
                <p className="font-medium text-blue-600">{delivery.deliveryNumber}</p>
              </div>
              <div>
                <Label>วันที่ส่งมอบ</Label>
                <p className="font-medium">{formatDate(delivery.deliveryDate)}</p>
              </div>
              <div>
                <Label>จำนวนรายการ</Label>
                <p className="font-medium">{delivery.totalItems} รายการ</p>
              </div>
              {delivery.notes && (
                <div className="md:col-span-3">
                  <Label>หมายเหตุจากการส่งมอบ</Label>
                  <p className="text-gray-700">{delivery.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Receipt Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              ข้อมูลการรับเข้า
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="receiptDate">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  วันที่รับเข้า *
                </Label>
                <Input
                  id="receiptDate"
                  type="date"
                  value={formData.receiptDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, receiptDate: e.target.value }))}
                  className={errors.receiptDate ? 'border-red-500' : ''}
                />
                {errors.receiptDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.receiptDate}</p>
                )}
              </div>

              <div>
                <Label htmlFor="receivedBy">
                  <User className="h-4 w-4 inline mr-1" />
                  ผู้รับเข้าสินค้า *
                </Label>
                <div className="relative">
                  <Input
                    id="receivedBy"
                    type="text"
                    value={formData.receivedBy}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">ข้อมูลจากผู้ใช้งานที่เข้าสู่ระบบ</p>
                {errors.receivedBy && (
                  <p className="text-red-500 text-xs mt-1">{errors.receivedBy}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="notes">หมายเหตุ</Label>
                <Textarea
                  id="notes"
                  placeholder="หมายเหตุเกี่ยวกับการรับเข้าวัตถุดิบ (ไม่จำเป็น)"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{getTotalItems()}</div>
                <div className="text-sm text-gray-600">รายการทั้งหมด</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{getTotalQuantity().toLocaleString()}</div>
                <div className="text-sm text-gray-600">ปริมาณที่ส่ง</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{getTotalReceived().toLocaleString()}</div>
                <div className="text-sm text-gray-600">ปริมาณที่รับ</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  รับเข้าตามปริมาณที่ส่งมา 100%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items List */}
        <Card>
          <CardHeader>
            <CardTitle>รายการวัตถุดิบ ({items.length} รายการ)</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">กำลังโหลดรายการวัตถุดิบ...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                <div key={`${item.rawMaterialId}-${item.batchNumber}`} className="border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Material Info */}
                    <div className="md:col-span-2">
                      <div className="font-medium text-gray-900">{item.materialName}</div>
                      <div className="text-sm text-gray-500">
                        {item.materialCode} • {item.materialType}
                      </div>
                      <div className="text-sm text-blue-600 mt-1">
                        Batch: {item.batchNumber}
                      </div>
                    </div>

                    {/* Quantities */}
                    <div>
                      <Label>ปริมาณที่ส่ง</Label>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.quantity.toLocaleString()}</span>
                        <span className="text-gray-500">{item.unit}</span>
                      </div>
                    </div>

                    <div>
                      <Label>ปริมาณที่รับ *</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={item.receivedQuantity}
                          readOnly
                          className="w-24 bg-gray-50 cursor-not-allowed"
                        />
                        <span className="text-gray-500">{item.unit}</span>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">รับเข้าตามปริมาณที่ส่งมา</p>
                    </div>

                    {/* Notes for item */}
                    <div className="md:col-span-4">
                      <Label>หมายเหตุสำหรับรายการนี้</Label>
                      <Input
                        type="text"
                        placeholder="หมายเหตุ (ไม่จำเป็น)"
                        value={item.notes || ''}
                        onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading ? 'กำลังบันทึก...' : 'บันทึกการรับเข้า'}
          </Button>
        </div>
      </form>
    </div>
  )
}