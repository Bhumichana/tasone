'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'

interface RawMaterial {
  id: string
  materialCode: string
  materialName: string
  materialType: string
  unit: string
}

interface ReceivingFormData {
  receivingDate: string
  purchaseOrderNo: string
  supplier: string
  rawMaterialId: string
  batchNumber: string
  receivedQuantity: string
  storageLocation: string
  notes: string
  qualityStatus: string
}

interface ReceivingFormProps {
  onSubmit: (data: ReceivingFormData) => void
  onCancel: () => void
  initialData?: Partial<ReceivingFormData>
  isEditing?: boolean
  loading?: boolean
}

// ตัวเลือกสถานที่เก็บในคลังสำนักงานใหญ่
const STORAGE_LOCATIONS = [
  'คลัง A - ชั้นที่ 1',
  'คลัง A - ชั้นที่ 2',
  'คลัง B - ชั้นที่ 1',
  'คลัง B - ชั้นที่ 2',
  'คลังสารเคมี - ห้องเย็น',
  'คลังสารเคมี - ห้องธรรมดา',
  'โซนกักกัน - รอตรวจสอบ',
  'โซนแยกประเภท'
]

const QUALITY_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'รอตรวจสอบ', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'APPROVED', label: 'อนุมัติ', color: 'bg-green-100 text-green-800' },
  { value: 'REJECTED', label: 'ปฏิเสธ', color: 'bg-red-100 text-red-800' }
]

export default function ReceivingForm({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false,
  loading = false
}: ReceivingFormProps) {
  const [formData, setFormData] = useState<ReceivingFormData>({
    receivingDate: new Date().toISOString().split('T')[0],
    purchaseOrderNo: '',
    supplier: '',
    rawMaterialId: '',
    batchNumber: '',
    receivedQuantity: '',
    storageLocation: '',
    notes: '',
    qualityStatus: 'PENDING',
    ...initialData
  })

  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loadingMaterials, setLoadingMaterials] = useState(true)

  // ดึงรายการวัตถุดิบ
  useEffect(() => {
    const fetchRawMaterials = async () => {
      try {
        const response = await fetch('/api/raw-materials')
        if (response.ok) {
          const data = await response.json()
          setRawMaterials(data.rawMaterials || [])
        }
      } catch (error) {
        console.error('Error fetching raw materials:', error)
      } finally {
        setLoadingMaterials(false)
      }
    }

    fetchRawMaterials()
  }, [])

  const handleInputChange = (field: keyof ReceivingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // ลบ error เมื่อผู้ใช้แก้ไข
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.receivingDate) {
      newErrors.receivingDate = 'กรุณาระบุวันที่รับเข้า'
    }

    if (!formData.supplier.trim()) {
      newErrors.supplier = 'กรุณาระบุผู้ผลิต/ผู้ขาย'
    }

    if (!formData.rawMaterialId) {
      newErrors.rawMaterialId = 'กรุณาเลือกวัตถุดิบ'
    }

    if (!formData.batchNumber.trim()) {
      newErrors.batchNumber = 'กรุณาระบุ Batch Number'
    }

    if (!formData.receivedQuantity || parseFloat(formData.receivedQuantity) <= 0) {
      newErrors.receivedQuantity = 'กรุณาระบุปริมาณที่ถูกต้อง (มากกว่า 0)'
    }

    if (!formData.storageLocation) {
      newErrors.storageLocation = 'กรุณาเลือกสถานที่จัดเก็บ'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const selectedMaterial = rawMaterials.find(m => m.id === formData.rawMaterialId)

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">
          {isEditing ? 'แก้ไขการรับเข้าวัตถุดิบ' : 'บันทึกการรับเข้าวัตถุดิบใหม่'}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          บันทึกข้อมูลการรับเข้าวัตถุดิบสำหรับคลังสำนักงานใหญ่
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ข้อมูลพื้นฐาน */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="receivingDate">วันที่รับเข้าสินค้า *</Label>
            <Input
              id="receivingDate"
              type="date"
              value={formData.receivingDate}
              onChange={(e) => handleInputChange('receivingDate', e.target.value)}
              className={errors.receivingDate ? 'border-red-500' : ''}
            />
            {errors.receivingDate && (
              <p className="text-sm text-red-500 mt-1">{errors.receivingDate}</p>
            )}
          </div>

          <div>
            <Label htmlFor="purchaseOrderNo">เลขที่ใบสั่งซื้อ</Label>
            <Input
              id="purchaseOrderNo"
              value={formData.purchaseOrderNo}
              onChange={(e) => handleInputChange('purchaseOrderNo', e.target.value)}
              placeholder="PO-XXXXXXXXX"
            />
          </div>
        </div>

        {/* ข้อมูลผู้ผลิต */}
        <div>
          <Label htmlFor="supplier">ผู้ผลิต/ผู้ขาย *</Label>
          <Input
            id="supplier"
            value={formData.supplier}
            onChange={(e) => handleInputChange('supplier', e.target.value)}
            placeholder="ระบุชื่อผู้ผลิตหรือผู้ขาย"
            className={errors.supplier ? 'border-red-500' : ''}
          />
          {errors.supplier && (
            <p className="text-sm text-red-500 mt-1">{errors.supplier}</p>
          )}
        </div>

        {/* ข้อมูลวัตถุดิบ */}
        <div>
          <Label htmlFor="rawMaterial">วัตถุดิบ *</Label>
          <Select
            value={formData.rawMaterialId}
            onValueChange={(value) => handleInputChange('rawMaterialId', value)}
          >
            <SelectTrigger className={errors.rawMaterialId ? 'border-red-500' : ''}>
              <SelectValue placeholder="เลือกวัตถุดิบ" />
            </SelectTrigger>
            <SelectContent>
              {loadingMaterials ? (
                <SelectItem value="loading" disabled>กำลังโหลด...</SelectItem>
              ) : rawMaterials.length === 0 ? (
                <SelectItem value="no-data" disabled>ไม่พบข้อมูลวัตถุดิบ</SelectItem>
              ) : (
                rawMaterials.map((material) => (
                  <SelectItem key={material.id} value={material.id}>
                    {material.materialCode} - {material.materialName}
                    <span className="text-gray-500 ml-2">({material.materialType})</span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {errors.rawMaterialId && (
            <p className="text-sm text-red-500 mt-1">{errors.rawMaterialId}</p>
          )}
          {selectedMaterial && (
            <div className="mt-2 p-2 bg-blue-50 rounded">
              <p className="text-sm text-blue-800">
                หน่วย: {selectedMaterial.unit} | ประเภท: {selectedMaterial.materialType}
              </p>
            </div>
          )}
        </div>

        {/* Batch และปริมาณ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="batchNumber">Batch Number *</Label>
            <Input
              id="batchNumber"
              value={formData.batchNumber}
              onChange={(e) => handleInputChange('batchNumber', e.target.value)}
              placeholder="BT-XXXXXXXX"
              className={errors.batchNumber ? 'border-red-500' : ''}
            />
            {errors.batchNumber && (
              <p className="text-sm text-red-500 mt-1">{errors.batchNumber}</p>
            )}
          </div>

          <div>
            <Label htmlFor="receivedQuantity">
              ปริมาณ * {selectedMaterial && `(${selectedMaterial.unit})`}
            </Label>
            <Input
              id="receivedQuantity"
              type="number"
              step="0.01"
              min="0"
              value={formData.receivedQuantity}
              onChange={(e) => handleInputChange('receivedQuantity', e.target.value)}
              placeholder="0.00"
              className={errors.receivedQuantity ? 'border-red-500' : ''}
            />
            {errors.receivedQuantity && (
              <p className="text-sm text-red-500 mt-1">{errors.receivedQuantity}</p>
            )}
          </div>
        </div>

        {/* สถานที่เก็บและสถานะ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="storageLocation">สถานที่จัดเก็บ *</Label>
            <Select
              value={formData.storageLocation}
              onValueChange={(value) => handleInputChange('storageLocation', value)}
            >
              <SelectTrigger className={errors.storageLocation ? 'border-red-500' : ''}>
                <SelectValue placeholder="เลือกสถานที่จัดเก็บ" />
              </SelectTrigger>
              <SelectContent>
                {STORAGE_LOCATIONS.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.storageLocation && (
              <p className="text-sm text-red-500 mt-1">{errors.storageLocation}</p>
            )}
          </div>

          <div>
            <Label htmlFor="qualityStatus">สถานะการตรวจสอบคุณภาพ</Label>
            <Select
              value={formData.qualityStatus}
              onValueChange={(value) => handleInputChange('qualityStatus', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUALITY_STATUS_OPTIONS.map((option) => (
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

        {/* หมายเหตุ */}
        <div>
          <Label htmlFor="notes">หมายเหตุ</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
            rows={3}
          />
        </div>

        {/* คำเตือนเกี่ยวกับสต็อก */}
        {formData.qualityStatus === 'APPROVED' && formData.receivedQuantity && (
          <Alert>
            <AlertDescription>
              <strong>หมายเหตุ:</strong> เมื่อสถานะเป็น "อนุมัติ" ระบบจะเพิ่มปริมาณ {formData.receivedQuantity} {selectedMaterial?.unit || ''}
              เข้าสู่สต็อกของวัตถุดิบนี้โดยอัตโนมัติ
            </AlertDescription>
          </Alert>
        )}

        {/* ปุ่มดำเนินการ */}
        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={loading || loadingMaterials}>
            {loading ? 'กำลังบันทึก...' : isEditing ? 'บันทึกการแก้ไข' : 'บันทึกการรับเข้า'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            ยกเลิก
          </Button>
        </div>
      </form>
    </Card>
  )
}