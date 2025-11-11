'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Search,
  FileText,
  Eye,
  Tag,
  Hash,
  ChefHat
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import RecipeModal from '@/components/recipe/RecipeModal'
import RecipeDetailModal from '@/components/recipe/RecipeDetailModal'

interface Product {
  id: string
  productCode: string
  productName: string
  serialNumber?: string
  category: string
  description?: string
  warrantyTerms?: string
  thickness?: number
  templateImage?: string
  warranties: {
    id: string
    warrantyNumber: string
    warrantyDate: string
    expiryDate: string
  }[]
  recipe?: {
    id: string
    recipeName: string
    version: string
    isActive: boolean
    _count: {
      items: number
    }
  }
  createdAt: string
}

export default function ProductsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [showRecipeDetailModal, setShowRecipeDetailModal] = useState(false)
  const [recipeProductId, setRecipeProductId] = useState<string>('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [templateOptions, setTemplateOptions] = useState<Array<{ value: string, label: string }>>([])
  const [formData, setFormData] = useState({
    productCode: '',
    productName: '',
    serialNumber: '',
    category: '',
    description: '',
    warrantyTerms: '',
    thickness: '',
    templateImage: 'Certification-Form.jpg'
  })

  const categories = [
    'TECO', 'RIGID'
  ]

  const thicknessOptions = [3, 5, 10, 20, 25, 25.4, 50, 50.8]

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/dashboard')
      return
    }

    fetchProducts()
    fetchTemplates()
  }, [session, status, router, searchTerm, selectedCategory])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates', {
        cache: 'no-store'
      })
      const data = await response.json()
      if (response.ok && data.templates) {
        // แปลง templates เป็น options สำหรับ dropdown
        const options = data.templates.map((template: any) => ({
          value: template.filename,
          label: template.filename === 'Certification-Form.jpg'
            ? 'เทมเพลทมาตรฐาน (Certification-Form.jpg)'
            : template.filename.replace('Certification-Form-', '').replace('.jpg', '')
        }))
        setTemplateOptions(options)
      } else {
        // ถ้า error ใช้ default template
        setTemplateOptions([
          { value: 'Certification-Form.jpg', label: 'เทมเพลทมาตรฐาน (Certification-Form.jpg)' }
        ])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      // ถ้า error ใช้ default template
      setTemplateOptions([
        { value: 'Certification-Form.jpg', label: 'เทมเพลทมาตรฐาน (Certification-Form.jpg)' }
      ])
    }
  }

  const fetchProducts = async () => {
    try {
      let url = '/api/products'
      const params = new URLSearchParams()

      if (searchTerm) params.append('search', searchTerm)
      if (selectedCategory) params.append('category', selectedCategory)

      // เพิ่ม timestamp เพื่อบังคับให้ fetch ใหม่ทุกครั้ง
      params.append('_t', Date.now().toString())

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      const data = await response.json()
      if (response.ok) {
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchProducts()
        resetForm()
        setShowAddForm(false)
        setEditingProduct(null)
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error saving product:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      productCode: product.productCode,
      productName: product.productName,
      serialNumber: product.serialNumber || '',
      category: product.category,
      description: product.description || '',
      warrantyTerms: product.warrantyTerms || '',
      thickness: product.thickness ? String(product.thickness) : '',
      templateImage: product.templateImage || 'Certification-Form.jpg'
    })
    setShowAddForm(true)
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('ต้องการลบสินค้านี้หรือไม่?')) return

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchProducts()
      } else {
        const error = await response.json()
        alert(error.error || 'ไม่สามารถลบสินค้าได้')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  const resetForm = () => {
    setFormData({
      productCode: '',
      productName: '',
      serialNumber: '',
      category: '',
      description: '',
      warrantyTerms: '',
      thickness: '',
      templateImage: 'Certification-Form.jpg'
    })
  }

  const handleOpenRecipeModal = (productId: string, hasRecipe: boolean) => {
    console.log('Opening recipe modal for productId:', productId, 'hasRecipe:', hasRecipe)
    setRecipeProductId(productId)
    if (hasRecipe) {
      setShowRecipeDetailModal(true)
    } else {
      setShowRecipeModal(true)
    }
  }

  const handleEditRecipe = () => {
    setShowRecipeDetailModal(false)
    setShowRecipeModal(true)
  }

  const handleRecipeSaved = () => {
    setRefreshKey(prev => prev + 1) // เพิ่ม key เพื่อบังคับ re-render
    router.refresh() // Force refresh Next.js cache
    fetchProducts() // รีโหลดข้อมูลสินค้า
  }

  const handleRecipeDeleted = () => {
    setRefreshKey(prev => prev + 1) // เพิ่ม key เพื่อบังคับ re-render
    router.refresh() // Force refresh Next.js cache
    fetchProducts() // รีโหลดข้อมูลสินค้า
  }

  const filteredProducts = products.filter(product =>
    product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.serialNumber && product.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">กำลังโหลด...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <Package className="h-6 w-6 text-navy-900 mr-3" />
              <h1 className="text-2xl font-bold text-navy-900">สินค้า(BOM)</h1>
            </div>
            {session?.user.userGroup === 'HeadOffice' && (
              <button
                onClick={() => {
                  resetForm()
                  setShowAddForm(true)
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-navy-900 hover:bg-navy-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มสินค้าใหม่
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาสินค้า..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-2 px-3 border border-gray-300 rounded-md"
            >
              <option value="">ทุกหมวดหมู่</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <div className="text-sm text-gray-500 flex items-center">
              <Package className="h-4 w-4 mr-1" />
              รวม {filteredProducts.length} รายการ
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div key={`${product.id}-${refreshKey}`} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {product.productName}
                      </h3>
                      <div className="flex flex-col text-sm text-gray-500 space-y-1">
                        <div className="flex items-center">
                          <Tag className="h-3 w-3 mr-1" />
                          <span>รหัส: {product.productCode}</span>
                        </div>
                        {product.serialNumber && (
                          <div className="flex items-center">
                            <Hash className="h-3 w-3 mr-1" />
                            <span>S/N: {product.serialNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedProduct(product)
                          setShowDetailModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="ดูรายละเอียด"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {session?.user.userGroup === 'HeadOffice' && (
                        <>
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-indigo-600 hover:text-indigo-900 p-1"
                            title="แก้ไข"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="ลบ"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {product.category}
                    </span>
                  </div>

                  {product.description && (
                    <div className="mb-4 text-sm text-gray-600">
                      <p className="line-clamp-2">{product.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center text-sm text-gray-600">
                      <FileText className="h-4 w-4 mr-1" />
                      <span>{product.warranties.length} ใบรับประกัน</span>
                    </div>
                  </div>

                  {/* สูตรการผลิต */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {product.recipe ? (
                      <div
                        onClick={() => {
                          if (session?.user.userGroup === 'HeadOffice') {
                            handleOpenRecipeModal(product.id, true)
                          }
                        }}
                        className={`flex items-center justify-between p-2 rounded-md transition-colors ${
                          session?.user.userGroup === 'HeadOffice'
                            ? 'cursor-pointer hover:bg-green-50'
                            : 'cursor-not-allowed opacity-75'
                        }`}
                        title={
                          session?.user.userGroup === 'HeadOffice'
                            ? 'คลิกเพื่อดูรายละเอียดสูตร'
                            : 'สูตรการผลิตเป็นความลับทางธุรกิจ'
                        }
                      >
                        <div className="flex items-center text-sm text-green-600">
                          <ChefHat className="h-4 w-4 mr-1" />
                          <span>{product.recipe.recipeName}</span>
                          {session?.user.userGroup === 'HeadOffice' && (
                            <span className="ml-2 text-xs text-gray-500">
                              ({product.recipe._count.items} รายการ)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          v{product.recipe.version}
                        </div>
                      </div>
                    ) : (
                      // เฉพาะ HeadOffice เท่านั้นที่สามารถเพิ่มสูตรได้
                      session?.user.userGroup === 'HeadOffice' ? (
                        <div
                          onClick={() => handleOpenRecipeModal(product.id, false)}
                          className="flex items-center text-sm text-gray-400 cursor-pointer hover:bg-blue-50 hover:text-blue-600 p-2 rounded-md transition-colors"
                          title="คลิกเพื่อเพิ่มสูตรการผลิต"
                        >
                          <ChefHat className="h-4 w-4 mr-1" />
                          <span>👨‍🍳 ยังไม่มีสูตรการผลิต</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-sm text-gray-400 p-2">
                          <ChefHat className="h-4 w-4 mr-1" />
                          <span>ยังไม่มีสูตรการผลิต</span>
                        </div>
                      )
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                    <div>สร้างเมื่อ: {new Date(product.createdAt).toLocaleDateString('th-TH')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">ไม่พบสินค้า</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'ลองเปลี่ยนคำค้นหา' : 'เริ่มต้นโดยการเพิ่มสินค้าใหม่'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">รหัสสินค้า</label>
                  <input
                    type="text"
                    value={formData.productCode}
                    onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">ชื่อสินค้า</label>
                  <input
                    type="text"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">หมายเลขซีเรียล</label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="ไม่บังคับ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">หมวดหมู่</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">เลือกหมวดหมู่</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">ความหนา (mm.)</label>
                  <select
                    value={formData.thickness}
                    onChange={(e) => setFormData({ ...formData, thickness: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">เลือกความหนา</option>
                    {thicknessOptions.map((thickness) => (
                      <option key={thickness} value={thickness}>
                        {thickness} mm
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">เทมเพลทใบรับประกัน</label>
                  <select
                    value={formData.templateImage}
                    onChange={(e) => setFormData({ ...formData, templateImage: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {templateOptions.map((template) => (
                      <option key={template.value} value={template.value}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    เลือกเทมเพลทที่ใช้สำหรับออกใบรับประกัน
                  </p>
                </div>

                {/* ปิดช่องเลือกตัวแทนจำหน่าย */}
                {/* {session?.user.userGroup === 'HeadOffice' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">ตัวแทนจำหน่าย</label>
                    <select
                      value={formData.dealerId}
                      onChange={(e) => setFormData({ ...formData, dealerId: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    >
                      <option value="">เลือกตัวแทนจำหน่าย</option>
                      {dealers.map((dealer) => (
                        <option key={dealer.id} value={dealer.id}>
                          {dealer.dealerName} ({dealer.dealerCode})
                        </option>
                      ))}
                    </select>
                  </div>
                )} */}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">รายละเอียด</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={4}
                  placeholder="รายละเอียดสินค้า (ไม่บังคับ)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เงื่อนไขการรับประกัน
                </label>
                <div className="mb-2 text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-md p-2">
                  💡 <strong>คำแนะนำ:</strong> กด <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Enter</kbd> เพื่อขึ้นบรรทัดใหม่ |
                  กด <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Enter 2 ครั้ง</kbd> เพื่อเว้นย่อหน้า
                </div>
                <textarea
                  value={formData.warrantyTerms}
                  onChange={(e) => setFormData({ ...formData, warrantyTerms: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-3 font-thai leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={8}
                  placeholder="ตัวอย่าง:&#10;1. รับประกันความเสียหายจากการผลิต 5 ปี&#10;2. ไม่รับประกันความเสียหายจาก:&#10;   - การใช้งานผิดวิธี&#10;   - ภัยธรรมชาติ&#10;   - อุบัติเหตุที่ไม่คาดคิด"
                />
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>
                    {formData.warrantyTerms.length} ตัวอักษร | {formData.warrantyTerms.split('\n').length} บรรทัด
                  </span>
                  <span className="text-gray-400">ไม่บังคับ</span>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingProduct(null)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-900 hover:bg-navy-800 disabled:opacity-50"
                >
                  {loading ? 'กำลังบันทึก...' : (editingProduct ? 'บันทึก' : 'เพิ่ม')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {showDetailModal && selectedProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">รายละเอียดสินค้า</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Product Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">ชื่อสินค้า</label>
                  <p className="text-lg font-semibold">{selectedProduct.productName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">รหัสสินค้า</label>
                  <p className="text-lg">{selectedProduct.productCode}</p>
                </div>
                {selectedProduct.serialNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">หมายเลขซีเรียล</label>
                    <p className="text-lg">{selectedProduct.serialNumber}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500">หมวดหมู่</label>
                  <p className="text-lg">{selectedProduct.category}</p>
                </div>
                {selectedProduct.thickness && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">ความหนา</label>
                    <p className="text-lg">{selectedProduct.thickness} mm</p>
                  </div>
                )}
              </div>

              {selectedProduct.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">รายละเอียด</label>
                  <p>{selectedProduct.description}</p>
                </div>
              )}

              {/* สูตรการผลิต */}
              {selectedProduct.recipe && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">สูตรการผลิต</h4>
                  <div className="bg-green-50 p-4 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-green-800">{selectedProduct.recipe.recipeName}</p>
                        {session?.user.userGroup === 'HeadOffice' && (
                          <p className="text-sm text-green-600">
                            จำนวนวัตถุดิบ: {selectedProduct.recipe._count.items} รายการ
                          </p>
                        )}
                        {session?.user.userGroup !== 'HeadOffice' && (
                          <p className="text-sm text-gray-500 italic">
                            สูตรการผลิตเป็นความลับทางธุรกิจ
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          เวอร์ชัน {selectedProduct.recipe.version}
                        </span>
                      </div>
                    </div>
                    {session?.user.userGroup === 'HeadOffice' && (
                      <div className="mt-3 flex space-x-2">
                        <button
                          onClick={() => handleOpenRecipeModal(selectedProduct.id, true)}
                          className="text-sm text-green-600 hover:text-green-800 underline"
                        >
                          ดูรายละเอียดสูตร
                        </button>
                        <button
                          onClick={() => {
                            setRecipeProductId(selectedProduct.id)
                            setShowRecipeModal(true)
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                          แก้ไขสูตร
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!selectedProduct.recipe && session?.user.userGroup === 'HeadOffice' && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">สูตรการผลิต</h4>
                  <div className="bg-gray-50 p-4 rounded-md text-center">
                    <ChefHat className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 mb-3">ยังไม่มีสูตรการผลิตสำหรับสินค้านี้</p>
                    <button
                      onClick={() => {
                        setRecipeProductId(selectedProduct.id)
                        setShowRecipeModal(true)
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      เพิ่มสูตรการผลิต
                    </button>
                  </div>
                </div>
              )}

              {/* Warranties */}
              {selectedProduct.warranties.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">ใบรับประกัน</h4>
                  <div className="space-y-2">
                    {selectedProduct.warranties.map((warranty) => (
                      <div key={warranty.id} className="bg-blue-50 p-3 rounded-md">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">{warranty.warrantyNumber}</p>
                            <p className="text-sm text-gray-600">
                              วันที่ออก: {new Date(warranty.warrantyDate).toLocaleDateString('th-TH')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${
                              new Date(warranty.expiryDate) > new Date()
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              {new Date(warranty.expiryDate) > new Date() ? 'ยังใช้ได้' : 'หมดอายุ'}
                            </p>
                            <p className="text-xs text-gray-500">
                              หมดอายุ: {new Date(warranty.expiryDate).toLocaleDateString('th-TH')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4 text-sm text-gray-500">
                <p>สร้างเมื่อ: {new Date(selectedProduct.createdAt).toLocaleDateString('th-TH')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Modals */}
      {(() => {
        // หา product ที่ตรงกับ recipeProductId เพื่อป้องกันการ find ซ้ำๆ
        const selectedProductForRecipe = products.find(p => p.id === recipeProductId)

        return (
          <>
            <RecipeModal
              key={`recipe-modal-${recipeProductId}`}
              isOpen={showRecipeModal}
              onClose={() => {
                setShowRecipeModal(false)
                setRecipeProductId('')
                router.refresh()
                fetchProducts()
              }}
              productId={recipeProductId}
              productName={selectedProductForRecipe?.productName || ''}
              existingRecipe={selectedProductForRecipe?.recipe ? {
                id: selectedProductForRecipe.recipe.id,
                recipeName: selectedProductForRecipe.recipe.recipeName,
                version: selectedProductForRecipe.recipe.version,
                isActive: selectedProductForRecipe.recipe.isActive,
                items: []
              } : null}
              onSave={handleRecipeSaved}
            />

            <RecipeDetailModal
              key={`recipe-detail-modal-${recipeProductId}`}
              isOpen={showRecipeDetailModal}
              onClose={() => {
                setShowRecipeDetailModal(false)
                setRecipeProductId('')
                router.refresh()
                fetchProducts()
              }}
              productId={recipeProductId}
              onEdit={handleEditRecipe}
              onDelete={handleRecipeDeleted}
            />
          </>
        )
      })()}
    </DashboardLayout>
  )
}