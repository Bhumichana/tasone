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
  Building2, 
  FileText,
  Eye,
  Tag,
  Hash
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface Product {
  id: string
  productCode: string
  productName: string
  serialNumber?: string
  category: string
  description?: string
  dealerId: string
  dealer: {
    id: string
    dealerCode: string
    dealerName: string
  }
  sale?: {
    id: string
    saleNumber: string
    customerName: string
  }
  warranties: {
    id: string
    warrantyNumber: string
    warrantyDate: string
    expiryDate: string
  }[]
  createdAt: string
}

interface Dealer {
  id: string
  dealerCode: string
  dealerName: string
}

export default function ProductsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDealer, setSelectedDealer] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    productCode: '',
    productName: '',
    serialNumber: '',
    category: '',
    description: '',
    dealerId: ''
  })

  const categories = [
    'Electronics', 'Hardware', 'Software', 'Components', 
    'Accessories', 'Tools', 'Materials', 'Other'
  ]

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/dashboard')
      return
    }

    fetchProducts()
    if (session.user.userGroup === 'HeadOffice') {
      fetchDealers()
    }
  }, [session, status, router, searchTerm, selectedDealer, selectedCategory])

  const fetchProducts = async () => {
    try {
      let url = '/api/products'
      const params = new URLSearchParams()

      if (searchTerm) params.append('search', searchTerm)
      if (selectedDealer && session?.user.userGroup === 'HeadOffice') {
        params.append('dealerId', selectedDealer)
      }
      if (selectedCategory) params.append('category', selectedCategory)

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
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

  const fetchDealers = async () => {
    try {
      const response = await fetch('/api/dealers')
      const data = await response.json()
      if (response.ok) {
        setDealers(data.dealers)
      }
    } catch (error) {
      console.error('Error fetching dealers:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'

      // ถ้าเป็น Dealer ให้ใช้ dealerId ของตัวเอง
      const submitData = {
        ...formData,
        dealerId: session?.user.userGroup === 'Dealer' ? session.user.dealerId : formData.dealerId
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
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
      dealerId: product.dealerId
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
      dealerId: session?.user.userGroup === 'Dealer' ? session.user.dealerId || '' : ''
    })
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
              <h1 className="text-2xl font-bold text-navy-900">จัดการสินค้า</h1>
            </div>
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
          </div>

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
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

            {session?.user.userGroup === 'HeadOffice' && (
              <select
                value={selectedDealer}
                onChange={(e) => setSelectedDealer(e.target.value)}
                className="py-2 px-3 border border-gray-300 rounded-md"
              >
                <option value="">ทุกตัวแทนจำหน่าย</option>
                {dealers.map((dealer) => (
                  <option key={dealer.id} value={dealer.id}>
                    {dealer.dealerName} ({dealer.dealerCode})
                  </option>
                ))}
              </select>
            )}

            <div className="text-sm text-gray-500 flex items-center">
              <Package className="h-4 w-4 mr-1" />
              รวม {filteredProducts.length} รายการ
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border">
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
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-indigo-600 hover:text-indigo-900 p-1"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center text-sm text-gray-600">
                      <FileText className="h-4 w-4 mr-1" />
                      <span>{product.warranties.length} ใบรับประกัน</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Building2 className="h-4 w-4 mr-1" />
                      <span className="truncate">{product.dealer.dealerName}</span>
                    </div>
                  </div>

                  {product.sale && (
                    <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                      <div>ขายแล้ว: {product.sale.saleNumber}</div>
                      <div>ลูกค้า: {product.sale.customerName}</div>
                    </div>
                  )}

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

                {session?.user.userGroup === 'HeadOffice' && (
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
                )}
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
                <div>
                  <label className="block text-sm font-medium text-gray-500">ตัวแทนจำหน่าย</label>
                  <p className="text-lg">{selectedProduct.dealer.dealerName}</p>
                  <p className="text-sm text-gray-600">{selectedProduct.dealer.dealerCode}</p>
                </div>
              </div>

              {selectedProduct.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">รายละเอียด</label>
                  <p>{selectedProduct.description}</p>
                </div>
              )}

              {selectedProduct.sale && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">ข้อมูลการขาย</label>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p><strong>หมายเลขการขาย:</strong> {selectedProduct.sale.saleNumber}</p>
                    <p><strong>ลูกค้า:</strong> {selectedProduct.sale.customerName}</p>
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
    </DashboardLayout>
  )
}