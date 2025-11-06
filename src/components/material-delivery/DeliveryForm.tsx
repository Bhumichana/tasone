'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import DeliveryItemsList from './DeliveryItemsList'
import ThaiDatePicker from '@/components/ui/ThaiDatePicker'
import { format } from 'date-fns'
import { Send, AlertTriangle, Building2, Calendar, FileText } from 'lucide-react'

interface Dealer {
  id: string
  dealerName: string
  dealerCode: string
  region?: string
  address: string
  phoneNumber: string
}

interface RawMaterial {
  id: string
  materialCode: string
  materialName: string
  materialType: string
  unit: string
  currentStock: number
  minStock: number
}

interface DeliveryItemData {
  id?: string
  rawMaterialId: string
  batchNumber: string
  quantity: number
  unit: string
}

interface DeliveryFormData {
  deliveryDate: string
  dealerId: string
  status: string
  notes: string
  items: DeliveryItemData[]
}

interface DeliveryFormProps {
  onSubmit: (data: DeliveryFormData) => void
  onCancel: () => void
  initialData?: Partial<DeliveryFormData>
  isEditing?: boolean
  loading?: boolean
}

export default function DeliveryForm({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false,
  loading = false
}: DeliveryFormProps) {
  const [formData, setFormData] = useState<DeliveryFormData>({
    deliveryDate: new Date().toISOString().split('T')[0],
    dealerId: '',
    status: 'PENDING_RECEIPT', // รอดีลเลอร์รับเข้า
    notes: '',
    items: [],
    ...initialData
  })

  const [dealers, setDealers] = useState<Dealer[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loadingData, setLoadingData] = useState(true)

  // ดึงข้อมูลตัวแทนจำหน่ายและวัตถุดิบ
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dealersResponse, rawMaterialsResponse] = await Promise.all([
          fetch('/api/dealers'),
          fetch('/api/raw-materials')
        ])

        if (dealersResponse.ok) {
          const dealersData = await dealersResponse.json()
          setDealers(dealersData.dealers || [])
        }

        if (rawMaterialsResponse.ok) {
          const rawMaterialsData = await rawMaterialsResponse.json()
          setRawMaterials(rawMaterialsData.rawMaterials || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoadingData(false)
      }
    }

    fetchData()
  }, [])

  const handleInputChange = (field: keyof DeliveryFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // ลบ error เมื่อผู้ใช้แก้ไข
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.deliveryDate) {
      newErrors.deliveryDate = 'กรุณาระบุวันที่ส่งมอบ'
    }

    if (!formData.dealerId) {
      newErrors.dealerId = 'กรุณาเลือกตัวแทนจำหน่าย'
    }

    if (formData.items.length === 0) {
      newErrors.items = 'กรุณาเพิ่มรายการวัตถุดิบอย่างน้อย 1 รายการ'
    }

    // ตรวจสอบรายการวัตถุดิบ
    formData.items.forEach((item, index) => {
      if (!item.rawMaterialId) {
        newErrors[`item_${index}_material`] = `รายการที่ ${index + 1}: กรุณาเลือกวัตถุดิบ`
      }
      // ✅ ตรวจสอบ batchId
      if (!item.batchId || item.batchId.trim() === '') {
        newErrors[`item_${index}_batchId`] = `รายการที่ ${index + 1}: ไม่พบ Batch ID (กรุณาลบและเพิ่มรายการใหม่)`
      }
      // ตรวจสอบ batchNumber
      if (!item.batchNumber || !item.batchNumber.trim()) {
        newErrors[`item_${index}_batch`] = `รายการที่ ${index + 1}: กรุณาระบุ Batch Number`
      }
      if (!item.quantity || item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = `รายการที่ ${index + 1}: กรุณาระบุปริมาณที่ถูกต้อง`
      }

      // ✅ ตรวจสอบสต็อก (สำหรับการแก้ไข ต้องบวกปริมาณเดิมกลับเข้าไป)
      const material = rawMaterials.find(m => m.id === item.rawMaterialId)
      if (material) {
        // คำนวณสต็อกที่มีอยู่จริง
        let availableStock = material.currentStock

        // ถ้าเป็นการแก้ไข และมีรายการเดิม (initialData)
        if (isEditing && initialData?.items) {
          // หาปริมาณเดิมของ item นี้ (จาก batchNumber และ rawMaterialId)
          const oldItem = initialData.items.find(
            (old: any) => old.rawMaterialId === item.rawMaterialId &&
                          old.batchNumber === item.batchNumber
          )

          // ถ้ามีรายการเดิม ให้บวกปริมาณเดิมกลับเข้าไป
          if (oldItem) {
            availableStock += Number(oldItem.quantity || 0)
          }
        }

        // เช็คว่าสต็อกพอหรือไม่
        if (availableStock < item.quantity) {
          newErrors[`item_${index}_stock`] = `รายการที่ ${index + 1}: สต็อกไม่เพียงพอ (คงเหลือ: ${availableStock.toFixed(3)} ${material.unit})`
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const selectedDealer = dealers.find(d => d.id === formData.dealerId)

  if (loadingData) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">กำลังโหลดข้อมูล...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {isEditing ? 'แก้ไขการส่งมอบวัตถุดิบ' : 'สร้างการส่งมอบวัตถุดิบใหม่'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ข้อมูลพื้นฐาน */}
            <div>
              {/* วันที่ส่งมอบ */}
              <div>
                <Label htmlFor="deliveryDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  วันที่ส่งมอบ *
                </Label>
                <ThaiDatePicker
                  selected={formData.deliveryDate ? new Date(formData.deliveryDate) : null}
                  onChange={(date) => {
                    if (date) {
                      handleInputChange('deliveryDate', format(date, 'yyyy-MM-dd'))
                    }
                  }}
                  placeholderText="เลือกวันที่ส่งมอบ"
                  className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.deliveryDate ? 'border-red-500' : ''}`}
                  disabled={loading}
                />
                {errors.deliveryDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.deliveryDate}</p>
                )}
              </div>
            </div>

            {/* ตัวแทนจำหน่าย */}
            <div>
              <Label htmlFor="dealer" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                ตัวแทนจำหน่าย *
              </Label>
              <Select
                value={formData.dealerId}
                onValueChange={(value) => handleInputChange('dealerId', value)}
                disabled={loading}
              >
                <SelectTrigger className={errors.dealerId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="เลือกตัวแทนจำหน่าย" />
                </SelectTrigger>
                <SelectContent>
                  {dealers.map((dealer) => (
                    <SelectItem key={dealer.id} value={dealer.id}>
                      <div className="flex flex-col">
                        <span>{dealer.dealerName}</span>
                        <span className="text-xs text-gray-500">
                          {dealer.dealerCode} • {dealer.region || 'ไม่ระบุภาค'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.dealerId && (
                <p className="text-sm text-red-500 mt-1">{errors.dealerId}</p>
              )}

              {/* ข้อมูลตัวแทนจำหน่าย */}
              {selectedDealer && (
                <div className="mt-3 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">ข้อมูลตัวแทนจำหน่าย</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">รหัสตัวแทน:</span>
                      <span className="ml-2 font-medium">{selectedDealer.dealerCode}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">ภาค:</span>
                      <span className="ml-2 font-medium">{selectedDealer.region || 'ไม่ระบุ'}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-gray-600">ที่อยู่:</span>
                      <span className="ml-2 font-medium">{selectedDealer.address}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">เบอร์โทร:</span>
                      <span className="ml-2 font-medium">{selectedDealer.phoneNumber}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* หมายเหตุ */}
            <div>
              <Label htmlFor="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                หมายเหตุ
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
                rows={3}
                disabled={loading}
              />
            </div>

            <Separator />

            {/* รายการวัตถุดิบ */}
            <DeliveryItemsList
              items={formData.items}
              rawMaterials={rawMaterials}
              onChange={(items) => handleInputChange('items', items)}
              errors={errors}
              loading={loading}
            />

            {/* Error รายการ */}
            {errors.items && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-800">
                  {errors.items}
                </AlertDescription>
              </Alert>
            )}

            {/* ปุ่มดำเนินการ */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading || loadingData}
                className="min-w-[120px]"
              >
                {loading ? 'กำลังบันทึก...' : isEditing ? 'บันทึกการแก้ไข' : 'สร้างการส่งมอบ'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                ยกเลิก
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}