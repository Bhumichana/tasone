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

const STATUS_OPTIONS = [
  { value: 'PREPARING', label: 'เตรียมส่ง', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'SHIPPING', label: 'กำลังส่ง', color: 'bg-blue-100 text-blue-800' },
  { value: 'DELIVERED', label: 'ส่งแล้ว', color: 'bg-green-100 text-green-800' }
]

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
    status: 'PREPARING',
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
      if (!item.batchNumber.trim()) {
        newErrors[`item_${index}_batch`] = `รายการที่ ${index + 1}: กรุณาระบุ Batch Number`
      }
      if (!item.quantity || item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = `รายการที่ ${index + 1}: กรุณาระบุปริมาณที่ถูกต้อง`
      }

      // ตรวจสอบสต็อก
      const material = rawMaterials.find(m => m.id === item.rawMaterialId)
      if (material && material.currentStock < item.quantity) {
        newErrors[`item_${index}_stock`] = `รายการที่ ${index + 1}: สต็อกไม่เพียงพอ (คงเหลือ: ${material.currentStock} ${material.unit})`
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* วันที่ส่งมอบ */}
              <div>
                <Label htmlFor="deliveryDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  วันที่ส่งมอบ *
                </Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                  className={errors.deliveryDate ? 'border-red-500' : ''}
                  disabled={loading}
                />
                {errors.deliveryDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.deliveryDate}</p>
                )}
              </div>

              {/* สถานะ */}
              <div>
                <Label htmlFor="status">สถานะการส่งมอบ</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className={`px-2 py-1 rounded text-xs ${option.color}`}>
                          {option.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            {/* คำเตือนเกี่ยวกับสต็อก */}
            {formData.status === 'SHIPPING' && formData.items.length > 0 && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-orange-800">
                  <strong>คำเตือน:</strong> เมื่อเปลี่ยนสถานะเป็น "กำลังส่ง"
                  ระบบจะหักสต็อกวัตถุดิบตามจำนวนที่ระบุในรายการโดยอัตโนมัติ
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