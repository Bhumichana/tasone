'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Search, 
  Building2, 
  Package,
  Eye,
  Calendar,
  User,
  Phone,
  MapPin,
  Download,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface Warranty {
  id: string
  warrantyNumber: string
  productId: string
  product: {
    id: string
    productCode: string
    productName: string
    serialNumber?: string
    category: string
  }
  customerName: string
  customerPhone: string
  customerEmail?: string
  customerAddress: string
  warrantyDate: string
  expiryDate: string
  warrantyPeriodMonths: number
  warrantyTerms?: string
  dealerId: string
  dealer: {
    id: string
    dealerCode: string
    dealerName: string
  }
  createdAt: string
}

interface Product {
  id: string
  productCode: string
  productName: string
  serialNumber?: string
  category: string
}

interface Dealer {
  id: string
  dealerCode: string
  dealerName: string
}

export default function WarrantiesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [warranties, setWarranties] = useState<Warranty[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDealer, setSelectedDealer] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null)
  const [editingWarranty, setEditingWarranty] = useState<Warranty | null>(null)
  const [formData, setFormData] = useState({
    productId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    warrantyDate: new Date().toISOString().split('T')[0],
    warrantyPeriodMonths: 12,
    warrantyTerms: ''
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/dashboard')
      return
    }

    fetchWarranties()
    fetchProducts()
    if (session.user.userGroup === 'HeadOffice') {
      fetchDealers()
    }
  }, [session, status, router, searchTerm, selectedDealer, statusFilter, dateFrom, dateTo])

  const fetchWarranties = async () => {
    try {
      let url = '/api/warranties'
      const params = new URLSearchParams()

      if (searchTerm) params.append('search', searchTerm)
      if (selectedDealer && session?.user.userGroup === 'HeadOffice') {
        params.append('dealerId', selectedDealer)
      }
      if (statusFilter) params.append('status', statusFilter)
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
      const data = await response.json()
      if (response.ok) {
        setWarranties(data.warranties)
      }
    } catch (error) {
      console.error('Error fetching warranties:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      if (response.ok) {
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
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
      const url = editingWarranty ? `/api/warranties/${editingWarranty.id}` : '/api/warranties'
      const method = editingWarranty ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchWarranties()
        resetForm()
        setShowAddForm(false)
        setEditingWarranty(null)
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error saving warranty:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (warranty: Warranty) => {
    setEditingWarranty(warranty)
    setFormData({
      productId: warranty.productId,
      customerName: warranty.customerName,
      customerPhone: warranty.customerPhone,
      customerEmail: warranty.customerEmail || '',
      customerAddress: warranty.customerAddress,
      warrantyDate: new Date(warranty.warrantyDate).toISOString().split('T')[0],
      warrantyPeriodMonths: warranty.warrantyPeriodMonths,
      warrantyTerms: warranty.warrantyTerms || ''
    })
    setShowAddForm(true)
  }

  const handleDelete = async (warrantyId: string) => {
    if (!confirm('ต้องการลบใบรับประกันนี้หรือไม่?')) return

    try {
      const response = await fetch(`/api/warranties/${warrantyId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchWarranties()
      } else {
        const error = await response.json()
        alert(error.error || 'ไม่สามารถลบใบรับประกันได้')
      }
    } catch (error) {
      console.error('Error deleting warranty:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  const handlePrintWarranty = async (warrantyId: string) => {
    try {
      const response = await fetch(`/api/warranties/${warrantyId}/print`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `warranty_${warrantyId}.pdf`
        link.click()
        window.URL.revokeObjectURL(url)
      } else {
        alert('ไม่สามารถสร้าง PDF ได้')
      }
    } catch (error) {
      console.error('Error printing warranty:', error)
      alert('เกิดข้อผิดพลาดในการพิมพ์')
    }
  }

  const resetForm = () => {
    setFormData({
      productId: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      warrantyDate: new Date().toISOString().split('T')[0],
      warrantyPeriodMonths: 12,
      warrantyTerms: ''
    })
  }

  const isWarrantyExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date()
  }

  const getWarrantyStatus = (expiryDate: string) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysLeft < 0) return { status: 'expired', text: 'หมดอายุ', color: 'red' }
    if (daysLeft <= 30) return { status: 'expiring', text: 'ใกล้หมดอายุ', color: 'yellow' }
    return { status: 'active', text: 'ใช้งานได้', color: 'green' }
  }

  const filteredWarranties = warranties.filter(warranty =>
    warranty.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    warranty.warrantyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    warranty.product.productName.toLowerCase().includes(searchTerm.toLowerCase())
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
              <FileText className="h-6 w-6 text-navy-900 mr-3" />
              <h1 className="text-2xl font-bold text-navy-900">จัดการใบรับประกัน</h1>
            </div>
            <button
              onClick={() => {
                resetForm()
                setShowAddForm(true)
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-navy-900 hover:bg-navy-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              ออกใบรับประกันใหม่
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-full">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">รวมทั้งหมด</p>
                  <p className="text-2xl font-bold text-gray-900">{warranties.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">ใช้งานได้</p>
                  <p className="text-2xl font-bold text-green-600">
                    {warranties.filter(w => !isWarrantyExpired(w.expiryDate)).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">ใกล้หมดอายุ</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {warranties.filter(w => {
                      const status = getWarrantyStatus(w.expiryDate)
                      return status.status === 'expiring'
                    }).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-full">
                  <FileText className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">หมดอายุ</p>
                  <p className="text-2xl font-bold text-red-600">
                    {warranties.filter(w => isWarrantyExpired(w.expiryDate)).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาใบรับประกัน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 border border-gray-300 rounded-md"
            >
              <option value="">ทุกสถานะ</option>
              <option value="active">ใช้งานได้</option>
              <option value="expired">หมดอายุ</option>
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

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="จากวันที่"
              className="py-2 px-3 border border-gray-300 rounded-md"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="ถึงวันที่"
              className="py-2 px-3 border border-gray-300 rounded-md"
            />
          </div>

          {/* Warranties Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ใบรับประกัน
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      สินค้า
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ลูกค้า
                    </th>
                    {session?.user.userGroup === 'HeadOffice' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ตัวแทนจำหน่าย
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      วันที่ออก
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      สถานะ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWarranties.map((warranty) => {
                    const status = getWarrantyStatus(warranty.expiryDate)
                    return (
                      <tr key={warranty.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {warranty.warrantyNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {warranty.warrantyPeriodMonths} เดือน
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {warranty.product.productName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {warranty.product.productCode}
                              {warranty.product.serialNumber && ` • ${warranty.product.serialNumber}`}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {warranty.customerName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {warranty.customerPhone}
                            </div>
                          </div>
                        </td>
                        {session?.user.userGroup === 'HeadOffice' && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {warranty.dealer.dealerName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {warranty.dealer.dealerCode}
                              </div>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(warranty.warrantyDate).toLocaleDateString('th-TH')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            status.color === 'green' 
                              ? 'bg-green-100 text-green-800' 
                              : status.color === 'yellow'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {status.text}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            หมดอายุ: {new Date(warranty.expiryDate).toLocaleDateString('th-TH')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => {
                              setSelectedWarranty(warranty)
                              setShowDetailModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handlePrintWarranty(warranty.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(warranty)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(warranty.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {filteredWarranties.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">ไม่พบใบรับประกัน</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'ลองเปลี่ยนคำค้นหา' : 'เริ่มต้นโดยการออกใบรับประกันใหม่'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingWarranty ? 'แก้ไขใบรับประกัน' : 'ออกใบรับประกันใหม่'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">สินค้า</label>
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">เลือกสินค้า</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.productName} ({product.productCode}) 
                        {product.serialNumber && ` - S/N: ${product.serialNumber}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">ชื่อลูกค้า</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">เบอร์โทรลูกค้า</label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">อีเมลลูกค้า</label>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="ไม่บังคับ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">วันที่ออกใบรับประกัน</label>
                  <input
                    type="date"
                    value={formData.warrantyDate}
                    onChange={(e) => setFormData({ ...formData, warrantyDate: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">ระยะเวลารับประกัน (เดือน)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={formData.warrantyPeriodMonths}
                    onChange={(e) => setFormData({ ...formData, warrantyPeriodMonths: parseInt(e.target.value) || 12 })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">ที่อยู่ลูกค้า</label>
                <textarea
                  value={formData.customerAddress}
                  onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">เงื่อนไขการรับประกัน</label>
                <textarea
                  value={formData.warrantyTerms}
                  onChange={(e) => setFormData({ ...formData, warrantyTerms: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={4}
                  placeholder="เงื่อนไขและข้อกำหนดการรับประกัน (ไม่บังคับ)"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingWarranty(null)
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
                  {loading ? 'กำลังบันทึก...' : (editingWarranty ? 'บันทึก' : 'ออกใบรับประกัน')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warranty Detail Modal */}
      {showDetailModal && selectedWarranty && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">รายละเอียดใบรับประกัน</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Warranty Info */}
              <div className="bg-navy-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">หมายเลขใบรับประกัน</label>
                    <p className="text-xl font-bold text-navy-900">{selectedWarranty.warrantyNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">สถานะ</label>
                    <div className="mt-1">
                      {(() => {
                        const status = getWarrantyStatus(selectedWarranty.expiryDate)
                        return (
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                            status.color === 'green' 
                              ? 'bg-green-100 text-green-800' 
                              : status.color === 'yellow'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {status.text}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Product & Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">ข้อมูลสินค้า</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">ชื่อสินค้า</label>
                      <p className="text-lg">{selectedWarranty.product.productName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">รหัสสินค้า</label>
                      <p>{selectedWarranty.product.productCode}</p>
                    </div>
                    {selectedWarranty.product.serialNumber && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">หมายเลขซีเรียล</label>
                        <p>{selectedWarranty.product.serialNumber}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-500">หมวดหมู่</label>
                      <p>{selectedWarranty.product.category}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">ข้อมูลลูกค้า</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">ชื่อลูกค้า</label>
                      <p className="text-lg">{selectedWarranty.customerName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">เบอร์โทร</label>
                      <p>{selectedWarranty.customerPhone}</p>
                    </div>
                    {selectedWarranty.customerEmail && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">อีเมล</label>
                        <p>{selectedWarranty.customerEmail}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-500">ที่อยู่</label>
                      <p>{selectedWarranty.customerAddress}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warranty Details */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">รายละเอียดการรับประกัน</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">วันที่ออกใบรับประกัน</label>
                    <p className="text-lg">{new Date(selectedWarranty.warrantyDate).toLocaleDateString('th-TH')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">วันที่หมดอายุ</label>
                    <p className="text-lg">{new Date(selectedWarranty.expiryDate).toLocaleDateString('th-TH')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">ระยะเวลารับประกัน</label>
                    <p className="text-lg">{selectedWarranty.warrantyPeriodMonths} เดือน</p>
                  </div>
                </div>
              </div>

              {selectedWarranty.warrantyTerms && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">เงื่อนไขการรับประกัน</label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{selectedWarranty.warrantyTerms}</p>
                  </div>
                </div>
              )}

              {/* Dealer Info */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">ตัวแทนจำหน่าย</h4>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="font-medium">{selectedWarranty.dealer.dealerName}</p>
                  <p className="text-sm text-gray-600">รหัส: {selectedWarranty.dealer.dealerCode}</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => handlePrintWarranty(selectedWarranty.id)}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4 mr-2 inline" />
                  ดาวน์โหลด PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}