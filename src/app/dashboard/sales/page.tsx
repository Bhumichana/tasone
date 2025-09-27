'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Edit, 
  Trash2, 
  ShoppingCart, 
  Search, 
  Building2, 
  Package, 
  Calendar,
  User,
  Phone,
  MapPin,
  Eye
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface SaleItem {
  id: string
  rawMaterialId: string
  rawMaterial: {
    id: string
    materialCode: string
    materialName: string
    unit: string
  }
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface Sale {
  id: string
  saleNumber: string
  saleDate: string
  customerName: string
  customerPhone?: string
  customerAddress?: string
  dealerId: string
  dealer: {
    id: string
    dealerCode: string
    dealerName: string
  }
  items: SaleItem[]
  totalAmount: number
  status: string
  notes?: string
  createdAt: string
}

interface Dealer {
  id: string
  dealerCode: string
  dealerName: string
}

interface RawMaterial {
  id: string
  materialCode: string
  materialName: string
  unit: string
  currentStock: number
}

export default function SalesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sales, setSales] = useState<Sale[]>([])
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDealer, setSelectedDealer] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [formData, setFormData] = useState({
    saleDate: new Date().toISOString().split('T')[0],
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    dealerId: '',
    notes: '',
    items: [{ rawMaterialId: '', quantity: 1, unitPrice: 0 }]
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/dashboard')
      return
    }

    fetchSales()
    if (session.user.userGroup === 'HeadOffice') {
      fetchDealers()
    }
    fetchRawMaterials()
  }, [session, status, router, searchTerm, selectedDealer, dateFrom, dateTo])

  const fetchSales = async () => {
    try {
      let url = '/api/sales'
      const params = new URLSearchParams()

      if (searchTerm) params.append('search', searchTerm)
      if (selectedDealer && session?.user.userGroup === 'HeadOffice') {
        params.append('dealerId', selectedDealer)
      }
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
      const data = await response.json()
      if (response.ok) {
        setSales(data.sales)
      }
    } catch (error) {
      console.error('Error fetching sales:', error)
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

  const fetchRawMaterials = async () => {
    try {
      const response = await fetch('/api/raw-materials')
      const data = await response.json()
      if (response.ok) {
        setRawMaterials(data.rawMaterials)
      }
    } catch (error) {
      console.error('Error fetching raw materials:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingSale ? `/api/sales/${editingSale.id}` : '/api/sales'
      const method = editingSale ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchSales()
        resetForm()
        setShowAddForm(false)
        setEditingSale(null)
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error saving sale:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale)
    setFormData({
      saleDate: new Date(sale.saleDate).toISOString().split('T')[0],
      customerName: sale.customerName,
      customerPhone: sale.customerPhone || '',
      customerAddress: sale.customerAddress || '',
      dealerId: sale.dealerId,
      notes: sale.notes || '',
      items: sale.items.map(item => ({
        rawMaterialId: item.rawMaterialId,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    })
    setShowAddForm(true)
  }

  const handleDelete = async (saleId: string) => {
    if (!confirm('ต้องการลบการขายนี้หรือไม่?')) return

    try {
      const response = await fetch(`/api/sales/${saleId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchSales()
      } else {
        const error = await response.json()
        alert(error.error || 'ไม่สามารถลบการขายได้')
      }
    } catch (error) {
      console.error('Error deleting sale:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  const resetForm = () => {
    setFormData({
      saleDate: new Date().toISOString().split('T')[0],
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      dealerId: '',
      notes: '',
      items: [{ rawMaterialId: '', quantity: 1, unitPrice: 0 }]
    })
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { rawMaterialId: '', quantity: 1, unitPrice: 0 }]
    })
  }

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: newItems })
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setFormData({ ...formData, items: newItems })
  }

  const filteredSales = sales.filter(sale =>
    sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.saleNumber.toLowerCase().includes(searchTerm.toLowerCase())
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
              <ShoppingCart className="h-6 w-6 text-navy-900 mr-3" />
              <h1 className="text-2xl font-bold text-navy-900">จัดการการขาย-ส่งมอบวัตถุดิบ</h1>
            </div>
            {session?.user.userGroup === 'HeadOffice' && (
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-navy-900 hover:bg-navy-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                บันทึกการขายใหม่
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาการขาย..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full"
              />
            </div>

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

          {/* Sales Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      รายการขาย
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
                      วันที่ขาย
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      จำนวนเงิน
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
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {sale.saleNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {sale.items.length} รายการ
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {sale.customerName}
                          </div>
                          {sale.customerPhone && (
                            <div className="text-sm text-gray-500">
                              {sale.customerPhone}
                            </div>
                          )}
                        </div>
                      </td>
                      {session?.user.userGroup === 'HeadOffice' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {sale.dealer.dealerName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {sale.dealer.dealerCode}
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(sale.saleDate).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.totalAmount.toLocaleString()} บาท
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sale.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : sale.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {sale.status === 'completed' ? 'สำเร็จ' : 
                           sale.status === 'pending' ? 'รอดำเนินการ' : 'อื่นๆ'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => {
                            setSelectedSale(sale)
                            setShowDetailModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {session?.user.userGroup === 'HeadOffice' && (
                          <>
                            <button
                              onClick={() => handleEdit(sale)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(sale.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredSales.length === 0 && (
                <div className="text-center py-12">
                  <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">ไม่พบรายการขาย</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'ลองเปลี่ยนคำค้นหา' : 'เริ่มต้นโดยการบันทึกการขายใหม่'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form Modal - สำหรับ HeadOffice เท่านั้น */}
      {showAddForm && session?.user.userGroup === 'HeadOffice' && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingSale ? 'แก้ไขการขาย' : 'บันทึกการขายใหม่'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">วันที่ขาย</label>
                  <input
                    type="date"
                    value={formData.saleDate}
                    onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>

                <div>
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
                />
              </div>

              {/* Sales Items */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700">รายการวัตถุดิบ</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-3 py-1 text-sm bg-navy-100 text-navy-700 rounded-md hover:bg-navy-200"
                  >
                    + เพิ่มรายการ
                  </button>
                </div>

                {formData.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">วัตถุดิบ</label>
                        <select
                          value={item.rawMaterialId}
                          onChange={(e) => updateItem(index, 'rawMaterialId', e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                          required
                        >
                          <option value="">เลือกวัตถุดิบ</option>
                          {rawMaterials.map((material) => (
                            <option key={material.id} value={material.id}>
                              {material.materialName} ({material.materialCode}) - คงเหลือ: {material.currentStock} {material.unit}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">จำนวน</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">ราคาต่อหน่วย</label>
                        <div className="flex">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                            required
                          />
                          {formData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="ml-2 mt-1 px-3 py-2 text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-600">
                      รวม: {(item.quantity * item.unitPrice).toLocaleString()} บาท
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">หมายเหตุ</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingSale(null)
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
                  {loading ? 'กำลังบันทึก...' : (editingSale ? 'บันทึก' : 'เพิ่ม')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sale Detail Modal */}
      {showDetailModal && selectedSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">รายละเอียดการขาย</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Sale Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">หมายเลขการขาย</label>
                  <p className="text-lg font-semibold">{selectedSale.saleNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">วันที่ขาย</label>
                  <p className="text-lg">{new Date(selectedSale.saleDate).toLocaleDateString('th-TH')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">ลูกค้า</label>
                  <p className="text-lg">{selectedSale.customerName}</p>
                  {selectedSale.customerPhone && (
                    <p className="text-sm text-gray-600">{selectedSale.customerPhone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">ตัวแทนจำหน่าย</label>
                  <p className="text-lg">{selectedSale.dealer.dealerName}</p>
                  <p className="text-sm text-gray-600">{selectedSale.dealer.dealerCode}</p>
                </div>
              </div>

              {selectedSale.customerAddress && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">ที่อยู่ลูกค้า</label>
                  <p>{selectedSale.customerAddress}</p>
                </div>
              )}

              {/* Sale Items */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">รายการวัตถุดิบ</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">วัตถุดิบ</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">จำนวน</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ราคา/หน่วย</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">รวม</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedSale.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2">
                            <div>
                              <div className="text-sm font-medium">{item.rawMaterial.materialName}</div>
                              <div className="text-xs text-gray-500">{item.rawMaterial.materialCode}</div>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {item.quantity} {item.rawMaterial.unit}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {item.unitPrice.toLocaleString()} บาท
                          </td>
                          <td className="px-4 py-2 text-sm font-medium">
                            {item.totalPrice.toLocaleString()} บาท
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">ยอดรวมทั้งหมด:</span>
                  <span className="text-xl font-bold text-navy-900">
                    {selectedSale.totalAmount.toLocaleString()} บาท
                  </span>
                </div>
              </div>

              {selectedSale.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">หมายเหตุ</label>
                  <p className="text-sm">{selectedSale.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}