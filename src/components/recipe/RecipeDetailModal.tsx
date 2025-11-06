'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  ChefHat,
  X,
  Package,
  Edit,
  Trash2,
  Calculator,
  FileText
} from 'lucide-react'

interface RawMaterial {
  id: string
  materialCode: string
  materialName: string
  materialType: string
  unit: string
  currentStock: number
}

interface RecipeItem {
  id: string
  rawMaterialId: string
  rawMaterial: RawMaterial
  quantity: number
  unit: string
  notes?: string
}

interface Recipe {
  id: string
  recipeName: string
  description?: string
  version: string
  isActive: boolean
  items: RecipeItem[]
  product: {
    id: string
    productCode: string
    productName: string
  }
}

interface RecipeDetailModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  onEdit: () => void
  onDelete: () => void
}

export default function RecipeDetailModal({
  isOpen,
  onClose,
  productId,
  onEdit,
  onDelete
}: RecipeDetailModalProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [recipe, setRecipe] = useState<Recipe | null>(null)

  // Check if user has permission (Admin or Manager only)
  const canManageRecipe = session?.user?.role === 'Admin' || session?.user?.role === 'Manager'

  useEffect(() => {
    if (isOpen && productId) {
      fetchRecipe()
    }
  }, [isOpen, productId])

  const fetchRecipe = async () => {
    setLoading(true)
    try {
      console.log('Fetching recipe for productId:', productId)
      const response = await fetch(`/api/products/${productId}/recipe`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      const data = await response.json()

      console.log('Recipe response:', data)

      if (response.ok) {
        setRecipe(data.recipe)
      } else {
        console.error('Error fetching recipe:', data.error)
      }
    } catch (error) {
      console.error('Error fetching recipe:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('ต้องการลบสูตรการผลิตนี้หรือไม่?')) return

    try {
      const response = await fetch(`/api/products/${productId}/recipe`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onDelete()
        onClose()
      } else {
        const error = await response.json()
        alert(error.error || 'ไม่สามารถลบสูตรได้')
      }
    } catch (error) {
      console.error('Error deleting recipe:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  const calculateTotalQuantity = () => {
    return recipe?.items.reduce((total, item) => total + item.quantity, 0) || 0
  }

  const calculateEstimatedCost = () => {
    // สำหรับอนาคต: คำนวณต้นทุนจากราคาวัตถุดิบ
    return 0
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <ChefHat className="h-6 w-6 text-green-600 mr-3" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">รายละเอียดสูตรการผลิต</h3>
              {recipe && (
                <p className="text-sm text-gray-600">สินค้า: {recipe.product.productName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">กำลังโหลด...</p>
          </div>
        ) : recipe ? (
          <div className="space-y-6">
            {/* ข้อมูลสูตร */}
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ชื่อสูตร</label>
                  <p className="text-lg font-semibold text-green-800">{recipe.recipeName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">เวอร์ชัน</label>
                  <p className="text-lg font-semibold text-green-800">v{recipe.version}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">สถานะ</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    recipe.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {recipe.isActive ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                  </span>
                </div>
              </div>

              {recipe.description && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">คำอธิบาย</label>
                  <p className="text-gray-800">{recipe.description}</p>
                </div>
              )}
            </div>

            {/* สถิติสูตร */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-800">{recipe.items.length}</p>
                <p className="text-sm text-blue-600">รายการวัตถุดิบ</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <Calculator className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-800">{calculateTotalQuantity().toFixed(3)}</p>
                <p className="text-sm text-purple-600">ปริมาณรวม</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <FileText className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-800">-</p>
                <p className="text-sm text-yellow-600">ต้นทุนประมาณ</p>
              </div>
            </div>

            {/* รายการวัตถุดิบ */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">รายการวัตถุดิบในสูตร</h4>

              {recipe.items.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-md">
                  <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">ไม่มีวัตถุดิบในสูตร</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          วัตถุดิบ
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ประเภท
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ปริมาณ
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          หน่วย
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          สต็อกปัจจุบัน
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          หมายเหตุ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {recipe.items.map((item, index) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {item.rawMaterial.materialName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.rawMaterial.materialCode}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {item.rawMaterial.materialType}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {item.quantity.toFixed(3)}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm text-gray-900">{item.unit}</p>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <p className={`text-sm font-medium ${
                              item.rawMaterial.currentStock >= item.quantity
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              {item.rawMaterial.currentStock.toFixed(3)} {item.rawMaterial.unit}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-xs text-gray-600">
                              {item.notes || '-'}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ปุ่มดำเนินการ */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              {canManageRecipe && (
                <>
                  <button
                    onClick={handleDelete}
                    className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    ลบสูตร
                  </button>
                  <button
                    onClick={onEdit}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    แก้ไขสูตร
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ปิด
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">ไม่พบสูตรการผลิต</p>
          </div>
        )}
      </div>
    </div>
  )
}