'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  ChefHat,
  Plus,
  Trash2,
  Search,
  X,
  Save,
  Package,
  Calculator
} from 'lucide-react'

interface RawMaterial {
  id: string
  materialCode: string
  materialName: string
  materialType: string
  unit: string
  currentStock: number
  supplier?: string
  location?: string
}

interface RecipeItem {
  id?: string
  rawMaterialId: string
  rawMaterial?: RawMaterial
  quantity: number
  unit: string
  notes?: string
}

interface Recipe {
  id?: string
  recipeName: string
  description?: string
  version: string
  isActive: boolean
  calculationUnit?: string // "PER_UNIT" หรือ "PER_SQM"
  items: RecipeItem[]
}

interface RecipeModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  productName: string
  existingRecipe?: Recipe | null
  onSave: () => void
}

export default function RecipeModal({
  isOpen,
  onClose,
  productId,
  productName,
  existingRecipe,
  onSave
}: RecipeModalProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showMaterialPicker, setShowMaterialPicker] = useState(false)

  const [formData, setFormData] = useState<Recipe>({
    recipeName: existingRecipe?.recipeName || 'สูตรมาตรฐาน',
    description: existingRecipe?.description || '',
    version: existingRecipe?.version || '1.0',
    isActive: existingRecipe?.isActive ?? true,
    calculationUnit: existingRecipe?.calculationUnit || 'PER_SQM', // Default: ต่อตารางเมตร
    items: existingRecipe?.items || []
  })

  useEffect(() => {
    if (isOpen) {
      fetchRawMaterials()
    }
  }, [isOpen])

  const fetchRawMaterials = async () => {
    try {
      const response = await fetch('/api/raw-materials/available')
      const data = await response.json()

      if (response.ok) {
        setRawMaterials(data.rawMaterials)
      } else {
        console.error('Error response:', data)
      }
    } catch (error) {
      console.error('Error fetching raw materials:', error)
    }
  }

  const filteredMaterials = rawMaterials.filter(material =>
    material.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.materialType.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const addRecipeItem = (material: RawMaterial) => {
    // ตรวจสอบว่ามีวัตถุดิบนี้ในสูตรแล้วหรือไม่
    const existingItem = formData.items.find(item => item.rawMaterialId === material.id)
    if (existingItem) {
      alert('วัตถุดิบนี้มีในสูตรแล้ว')
      return
    }

    const newItem: RecipeItem = {
      rawMaterialId: material.id,
      rawMaterial: material,
      quantity: 1,
      unit: material.unit,
      notes: ''
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
    setShowMaterialPicker(false)
    setSearchTerm('')
  }

  const removeRecipeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const updateRecipeItem = (index: number, field: keyof RecipeItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const calculateTotalCost = () => {
    // สำหรับอนาคต: คำนวณต้นทุนจากราคาวัตถุดิบ
    return 0
  }

  const handleSave = async () => {
    if (!formData.recipeName.trim()) {
      alert('กรุณาระบุชื่อสูตร')
      return
    }

    if (formData.items.length === 0) {
      alert('กรุณาเพิ่มวัตถุดิบอย่างน้อย 1 รายการ')
      return
    }

    setLoading(true)
    try {
      const method = existingRecipe ? 'PUT' : 'POST'
      const response = await fetch(`/api/products/${productId}/recipe`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipeName: formData.recipeName,
          description: formData.description,
          calculationUnit: formData.calculationUnit,
          items: formData.items.map(item => ({
            rawMaterialId: item.rawMaterialId,
            quantity: item.quantity,
            unit: item.unit,
            notes: item.notes
          }))
        }),
      })

      if (response.ok) {
        onSave()
        onClose()
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error saving recipe:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <ChefHat className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {existingRecipe ? 'แก้ไขสูตรการผลิต' : 'เพิ่มสูตรการผลิต'}
              </h3>
              <p className="text-sm text-gray-600">สินค้า: {productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* ข้อมูลสูตร */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ชื่อสูตร *
              </label>
              <input
                type="text"
                value={formData.recipeName}
                onChange={(e) => setFormData({ ...formData, recipeName: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="เช่น สูตรมาตรฐาน, สูตร A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เวอร์ชัน
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="1.0"
              />
            </div>
          </div>

          {/* หน่วยคำนวณ */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              หน่วยคำนวณ *
            </label>
            <div className="flex gap-6">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="calculationUnit"
                  value="PER_UNIT"
                  checked={formData.calculationUnit === 'PER_UNIT'}
                  onChange={(e) => setFormData({ ...formData, calculationUnit: e.target.value })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">ต่อหน่วยผลิตภัณฑ์</span>
              </label>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="calculationUnit"
                  value="PER_SQM"
                  checked={formData.calculationUnit === 'PER_SQM'}
                  onChange={(e) => setFormData({ ...formData, calculationUnit: e.target.value })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">ต่อ 1 ตารางเมตร</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formData.calculationUnit === 'PER_SQM'
                ? 'ปริมาณวัตถุดิบจะคำนวณตามพื้นที่ติดตั้งในใบรับประกัน'
                : 'ปริมาณวัตถุดิบเป็นแบบคงที่ต่อหน่วยผลิตภัณฑ์'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              คำอธิบาย
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows={3}
              placeholder="รายละเอียดของสูตรการผลิต..."
            />
          </div>
        </div>

        {/* รายการวัตถุดิบ */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-semibold text-gray-900">รายการวัตถุดิบ</h4>
            <button
              onClick={() => setShowMaterialPicker(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              เพิ่มวัตถุดิบ
            </button>
          </div>

          {formData.items.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-md">
              <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">ยังไม่มีวัตถุดิบในสูตร</p>
              <p className="text-xs text-gray-400">คลิก "เพิ่มวัตถุดิบ" เพื่อเริ่มต้น</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">
                        {item.rawMaterial?.materialName}
                      </h5>
                      <p className="text-sm text-gray-600">
                        {item.rawMaterial?.materialCode} - {item.rawMaterial?.materialType}
                      </p>
                    </div>
                    <button
                      onClick={() => removeRecipeItem(index)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">ปริมาณ *</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateRecipeItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">หน่วย</label>
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => updateRecipeItem(index, 'unit', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">หมายเหตุ</label>
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => updateRecipeItem(index, 'notes', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder="หมายเหตุ..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ปุ่มดำเนินการ */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-1" />
            {loading ? 'กำลังบันทึก...' : 'บันทึกสูตร'}
          </button>
        </div>
      </div>

      {/* Material Picker Modal */}
      {showMaterialPicker && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-60">
          <div className="relative top-32 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold">เลือกวัตถุดิบ</h4>
              <button
                onClick={() => {
                  setShowMaterialPicker(false)
                  setSearchTerm('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาวัตถุดิบ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full"
                />
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredMaterials.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  ไม่พบวัตถุดิบ
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMaterials.map((material) => {
                    const isAlreadyAdded = formData.items.some(item => item.rawMaterialId === material.id)

                    return (
                      <div
                        key={material.id}
                        className={`p-3 border rounded-md cursor-pointer transition-colors ${
                          isAlreadyAdded
                            ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                            : 'border-gray-200 hover:bg-green-50 hover:border-green-300'
                        }`}
                        onClick={() => !isAlreadyAdded && addRecipeItem(material)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {material.materialName}
                              {isAlreadyAdded && <span className="ml-2 text-xs text-green-600">(เพิ่มแล้ว)</span>}
                            </p>
                            <p className="text-sm text-gray-600">
                              {material.materialCode} - {material.materialType}
                            </p>
                            <p className="text-xs text-gray-500">
                              สต็อก: {material.currentStock} {material.unit}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              หน่วย: {material.unit}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}