'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Trash2, Package, AlertTriangle } from 'lucide-react'

interface RawMaterial {
  id: string
  materialCode: string
  materialName: string
  materialType: string
  unit: string
  currentStock: number
  minStock: number
}

interface Batch {
  id: string
  batchNumber: string
  currentStock: number
  unit: string
  receivedDate: string
  supplier: string
  storageLocation: string
}

interface DeliveryItemData {
  id?: string
  rawMaterialId: string
  batchId: string
  batchNumber: string
  quantity: number
  unit: string
}

interface DeliveryItemsListProps {
  items: DeliveryItemData[]
  rawMaterials: RawMaterial[]
  onChange: (items: DeliveryItemData[]) => void
  errors?: Record<string, string>
  loading?: boolean
}

export default function DeliveryItemsList({
  items,
  rawMaterials,
  onChange,
  errors = {},
  loading = false
}: DeliveryItemsListProps) {
  const [newItem, setNewItem] = useState<Partial<DeliveryItemData>>({
    rawMaterialId: '',
    batchId: '',
    batchNumber: '',
    quantity: undefined,
    unit: ''
  })

  const [batches, setBatches] = useState<Batch[]>([])
  const [loadingBatches, setLoadingBatches] = useState(false)

  // ดึงรายการ Batch เมื่อเลือกวัตถุดิบ
  useEffect(() => {
    const fetchBatches = async () => {
      if (!newItem.rawMaterialId) {
        setBatches([])
        return
      }

      setLoadingBatches(true)
      try {
        const response = await fetch(`/api/raw-materials/${newItem.rawMaterialId}/batches`)
        if (response.ok) {
          const data = await response.json()
          setBatches(data.batches || [])
        }
      } catch (error) {
        console.error('Error fetching batches:', error)
      } finally {
        setLoadingBatches(false)
      }
    }

    fetchBatches()
  }, [newItem.rawMaterialId])

  const addItem = () => {
    if (!newItem.rawMaterialId || !newItem.batchId || !newItem.quantity) {
      return
    }

    const selectedMaterial = rawMaterials.find(m => m.id === newItem.rawMaterialId)
    if (!selectedMaterial) return

    const itemToAdd: DeliveryItemData = {
      id: `temp-${Date.now()}`,
      rawMaterialId: newItem.rawMaterialId,
      batchId: newItem.batchId!,
      batchNumber: newItem.batchNumber!,
      quantity: Number(newItem.quantity),
      unit: selectedMaterial.unit
    }

    onChange([...items, itemToAdd])

    // Reset form
    setNewItem({
      rawMaterialId: '',
      batchId: '',
      batchNumber: '',
      quantity: undefined,
      unit: ''
    })
    setBatches([])
  }

  const removeItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index)
    onChange(updatedItems)
  }

  const updateItem = (index: number, field: keyof DeliveryItemData, value: any) => {
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }

    // If changing raw material, update unit automatically
    if (field === 'rawMaterialId') {
      const selectedMaterial = rawMaterials.find(m => m.id === value)
      if (selectedMaterial) {
        updatedItems[index].unit = selectedMaterial.unit
      }
    }

    onChange(updatedItems)
  }

  const getSelectedMaterial = (rawMaterialId: string) => {
    return rawMaterials.find(m => m.id === rawMaterialId)
  }

  const checkStockAvailability = (batchId: string, quantity: number) => {
    // ตรวจสอบจาก batch ที่เลือก
    const selectedBatch = batches.find(b => b.id === batchId)
    if (!selectedBatch) return { available: false, current: 0 }

    return {
      available: selectedBatch.currentStock >= quantity,
      current: selectedBatch.currentStock,
      isLowStock: false // จะเช็คจาก batch แทน
    }
  }

  return (
    <div className="space-y-6">
      {/* Add New Item Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            เพิ่มรายการวัตถุดิบ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Select Raw Material */}
            <div>
              <Label htmlFor="rawMaterial">วัตถุดิบ</Label>
              <Select
                value={newItem.rawMaterialId}
                onValueChange={(value) => {
                  const selectedMaterial = rawMaterials.find(m => m.id === value)
                  setNewItem({
                    ...newItem,
                    rawMaterialId: value,
                    unit: selectedMaterial?.unit || ''
                  })
                }}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกวัตถุดิบ" />
                </SelectTrigger>
                <SelectContent>
                  {rawMaterials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      <div className="flex flex-col">
                        <span>{material.materialCode} - {material.materialName}</span>
                        <span className="text-xs text-gray-500">
                          คงเหลือ: {material.currentStock} {material.unit}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Batch Selection */}
            <div>
              <Label htmlFor="batch">Batch (เรียงจากเก่า → ใหม่)</Label>
              <Select
                value={newItem.batchId}
                onValueChange={(value) => {
                  const selectedBatch = batches.find(b => b.id === value)
                  setNewItem({
                    ...newItem,
                    batchId: value,
                    batchNumber: selectedBatch?.batchNumber || '',
                    unit: selectedBatch?.unit || newItem.unit
                  })
                }}
                disabled={!newItem.rawMaterialId || loadingBatches || loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingBatches ? "กำลังโหลด..." : "เลือก Batch"} />
                </SelectTrigger>
                <SelectContent>
                  {batches.length === 0 ? (
                    <SelectItem value="_no_batch" disabled>
                      ไม่มี Batch ที่มีสต็อกเหลือ
                    </SelectItem>
                  ) : (
                    batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{batch.batchNumber}</span>
                          <span className="text-xs text-gray-500">
                            คงเหลือ: {batch.currentStock} {batch.unit} |
                            รับเข้า: {new Date(batch.receivedDate).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div>
              <Label htmlFor="quantity">
                ปริมาณ (Kg.)
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                value={newItem.quantity || ''}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || undefined })}
                placeholder="0.00"
                disabled={loading}
              />
            </div>

            {/* Add Button */}
            <div className="flex items-end">
              <Button
                onClick={addItem}
                disabled={!newItem.rawMaterialId || !newItem.batchId || !newItem.quantity || loading}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                เพิ่ม
              </Button>
            </div>
          </div>

          {/* Stock Warning for New Item */}
          {newItem.batchId && newItem.quantity && (
            (() => {
              const stockCheck = checkStockAvailability(newItem.batchId, newItem.quantity)
              if (!stockCheck.available) {
                return (
                  <Alert className="mt-4 border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-red-800">
                      สต็อกไม่เพียงพอ! คงเหลือ: {stockCheck.current} {newItem.unit}, ต้องการ: {newItem.quantity} {newItem.unit}
                    </AlertDescription>
                  </Alert>
                )
              }
              return null
            })()
          )}
        </CardContent>
      </Card>

      {/* Items List */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              รายการวัตถุดิบที่จะส่งมอบ ({items.length} รายการ)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => {
                const material = getSelectedMaterial(item.rawMaterialId)

                return (
                  <div key={item.id || index} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                      {/* Raw Material Info */}
                      <div>
                        <Label>วัตถุดิบ</Label>
                        <div className="text-sm font-medium mt-1">
                          {material?.materialCode} - {material?.materialName}
                        </div>
                        <div className="text-xs text-gray-500">
                          ประเภท: {material?.materialType}
                        </div>
                      </div>

                      {/* Batch Number */}
                      <div>
                        <Label>Batch Number</Label>
                        <div className="text-sm font-medium mt-1">
                          {item.batchNumber}
                        </div>
                      </div>

                      {/* Quantity */}
                      <div>
                        <Label>ปริมาณ</Label>
                        <div className="text-sm font-medium mt-1">
                          {item.quantity} {item.unit}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-end justify-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          ลบ
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {items.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <span className="font-medium">รวมรายการทั้งหมด:</span>
              <span className="text-lg font-bold text-blue-600">{items.length} รายการ</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      {Object.keys(errors).length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            <ul className="list-disc list-inside">
              {Object.entries(errors).map(([field, message]) => (
                <li key={field}>{message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}