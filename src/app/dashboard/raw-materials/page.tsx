'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, Package, Search, AlertTriangle, TrendingUp } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { DatePicker } from '@/components/ui/date-picker'

interface RawMaterial {
  id: string
  materialCode: string
  materialName: string
  materialType: string
  description?: string
  unit: string
  supplier?: string
  location?: string
  expiryDate?: string
  batchNumber?: string
  currentStock: number
  minStock: number
  _count: {
    saleItems: number
  }
  createdAt: string
}


export default function RawMaterialsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [materials, setMaterials] = useState<RawMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null)
  const [showStockForm, setShowStockForm] = useState(false)
  const [stockMaterial, setStockMaterial] = useState<RawMaterial | null>(null)
  const [formData, setFormData] = useState({
    materialCode: '',
    materialName: '',
    materialType: '',
    description: '',
    unit: '',
    supplier: '',
    location: '',
    expiryDate: '',
    batchNumber: '',
    minStock: '',
    currentStock: '0'
  })
  const [stockData, setStockData] = useState({
    action: 'add',
    quantity: '',
    note: ''
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/dashboard')
      return
    }

    fetchMaterials()
  }, [session, status, router])

  const fetchMaterials = async () => {
    try {
      let url = '/api/raw-materials'
      const params = new URLSearchParams()

      if (searchTerm) {
        params.append('search', searchTerm)
      }


      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
      const data = await response.json()
      if (response.ok) {
        setMaterials(data.rawMaterials)
      }
    } catch (error) {
      console.error('Error fetching materials:', error)
    } finally {
      setLoading(false)
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingMaterial ? `/api/raw-materials/${editingMaterial.id}` : '/api/raw-materials'
      const method = editingMaterial ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchMaterials()
        resetForm()
        setShowAddForm(false)
        setEditingMaterial(null)
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error saving material:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setLoading(false)
    }
  }

  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stockMaterial) return

    setLoading(true)

    try {
      const response = await fetch(`/api/raw-materials/${stockMaterial.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stockData),
      })

      if (response.ok) {
        fetchMaterials()
        setShowStockForm(false)
        setStockMaterial(null)
        setStockData({ action: 'add', quantity: '', note: '' })
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error updating stock:', error)
      alert('เกิดข้อผิดพลาดในการอัปเดตสต็อก')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (material: RawMaterial) => {
    setEditingMaterial(material)
    setFormData({
      materialCode: material.materialCode,
      materialName: material.materialName,
      materialType: material.materialType,
      description: material.description || '',
      unit: material.unit,
      supplier: material.supplier || '',
      location: material.location || '',
      expiryDate: material.expiryDate ? new Date(material.expiryDate).toISOString().split('T')[0] : '',
      batchNumber: material.batchNumber || '',
      minStock: material.minStock.toString(),
      currentStock: material.currentStock.toString()
    })
    setShowAddForm(true)
  }

  const handleDelete = async (materialId: string) => {
    if (!confirm('ต้องการลบวัตถุดิบนี้หรือไม่?')) return

    try {
      const response = await fetch(`/api/raw-materials/${materialId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchMaterials()
      } else {
        const error = await response.json()
        alert(error.error || 'ไม่สามารถลบวัตถุดิบได้')
      }
    } catch (error) {
      console.error('Error deleting material:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  const handleStockAction = (material: RawMaterial) => {
    setStockMaterial(material)
    setShowStockForm(true)
  }

  const resetForm = () => {
    setFormData({
      materialCode: '',
      materialName: '',
      materialType: '',
      description: '',
      unit: '',
      supplier: '',
      location: '',
      expiryDate: '',
      batchNumber: '',
      minStock: '',
      currentStock: '0'
    })
  }

  const filteredMaterials = materials.filter(material =>
    material.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.materialType.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const lowStockMaterials = filteredMaterials.filter(m => m.currentStock <= m.minStock)

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-white flex items-center justify-center">
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
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <Package className="h-6 w-6 text-navy-900 mr-3" />
              <h1 className="text-2xl font-bold text-navy-900">จัดการวัตถุดิบ</h1>
            </div>
            {session?.user.userGroup === 'HeadOffice' && (
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-navy-900 hover:bg-navy-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out"
              >
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มวัตถุดิบใหม่
              </button>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">วัตถุดิบทั้งหมด</p>
                  <p className="text-2xl font-semibold text-gray-900">{materials.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">สต็อกต่ำ</p>
                  <p className="text-2xl font-semibold text-gray-900">{lowStockMaterials.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">สต็อกทั้งหมด</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {materials.reduce((sum, m) => sum + m.currentStock, 0).toLocaleString()} หน่วย
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
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
            </div>
          </div>

          {lowStockMaterials.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    คำเตือน: มีวัตถุดิบ {lowStockMaterials.length} รายการที่สต็อกต่ำกว่าเกณฑ์
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {lowStockMaterials.slice(0, 3).map(m => (
                      <div key={m.id}>• {m.materialName} (เหลือ {m.currentStock} ชิ้น)</div>
                    ))}
                    {lowStockMaterials.length > 3 && (
                      <div>และอีก {lowStockMaterials.length - 3} รายการ</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white shadow overflow-hidden rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วัตถุดิบ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ประเภท/หน่วย
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ผู้จัดหา/สถานที่
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สต็อก
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMaterials.map((material) => (
                  <tr key={material.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {material.materialName}
                        </div>
                        <div className="text-sm text-gray-500">
                          รหัส: {material.materialCode}
                          {material.batchNumber && ` | Batch: ${material.batchNumber}`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{material.materialType}</div>
                      <div className="text-sm text-gray-500">หน่วย: {material.unit}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{material.supplier || '-'}</div>
                      <div className="text-sm text-gray-500">{material.location || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${
                          material.currentStock <= material.minStock
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}>
                          {material.currentStock}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          / {material.minStock} ขั้นต่ำ
                        </span>
                        <button
                          onClick={() => handleStockAction(material)}
                          className="ml-2 text-indigo-600 hover:text-indigo-900"
                        >
                          <TrendingUp className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        {session?.user.userGroup === 'HeadOffice' && (
                          <>
                            <button
                              onClick={() => handleEdit(material)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(material.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredMaterials.length === 0 && (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">ไม่พบวัตถุดิบ</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'ลองเปลี่ยนคำค้นหา' : 'เริ่มต้นโดยการเพิ่มวัตถุดิบใหม่'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingMaterial ? 'แก้ไขวัตถุดิบ' : 'เพิ่มวัตถุดิบใหม่'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">รหัสวัตถุดิบ</label>
                  <input
                    type="text"
                    value={formData.materialCode}
                    onChange={(e) => setFormData({ ...formData, materialCode: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ชื่อวัตถุดิบ</label>
                  <input
                    type="text"
                    value={formData.materialName}
                    onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ประเภทวัตถุดิบ</label>
                  <input
                    type="text"
                    value={formData.materialType}
                    onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">หน่วย</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">เลือกหน่วย</option>
                    <option value="kgs.">kgs.</option>
                    <option value="liters">liters</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ผู้จัดหา</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="ชื่อบริษัท/ผู้จัดหา"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">สถานที่จัดเก็บ</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="HO-PATHUM-1, HO-PATHUM-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">วันหมดอายุ</label>
                  <DatePicker
                    value={formData.expiryDate}
                    onChange={(date) => setFormData({ ...formData, expiryDate: date })}
                    placeholder="เลือกวันหมดอายุ"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">หมายเลข Batch</label>
                  <input
                    type="text"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="B001-2024"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">รายละเอียด</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
              </div>


              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">สต็อกขั้นต่ำ</label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="ไม่บังคับ"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">สต็อกปัจจุบัน</label>
                  <input
                    type="number"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingMaterial(null)
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
                  {loading ? 'กำลังบันทึก...' : (editingMaterial ? 'บันทึก' : 'เพิ่ม')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStockForm && stockMaterial && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              อัปเดตสต็อก: {stockMaterial.materialName}
            </h3>

            <form onSubmit={handleStockUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">การดำเนินการ</label>
                <select
                  value={stockData.action}
                  onChange={(e) => setStockData({ ...stockData, action: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="add">เพิ่มสต็อก</option>
                  <option value="subtract">ลดสต็อก</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">จำนวน</label>
                <input
                  type="number"
                  min="1"
                  value={stockData.quantity}
                  onChange={(e) => setStockData({ ...stockData, quantity: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">หมายเหตุ</label>
                <input
                  type="text"
                  value={stockData.note}
                  onChange={(e) => setStockData({ ...stockData, note: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="เหตุผลในการปรับสต็อก..."
                />
              </div>

              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600">
                  สต็อกปัจจุบัน: <span className="font-medium">{stockMaterial.currentStock}</span>
                </p>
                {stockData.quantity && (
                  <p className="text-sm text-gray-600">
                    สต็อกหลังการปรับ: <span className="font-medium">
                      {stockData.action === 'add'
                        ? stockMaterial.currentStock + parseInt(stockData.quantity)
                        : stockMaterial.currentStock - parseInt(stockData.quantity)
                      }
                    </span>
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowStockForm(false)
                    setStockMaterial(null)
                    setStockData({ action: 'add', quantity: '', note: '' })
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
                  {loading ? 'กำลังอัปเดต...' : 'อัปเดตสต็อก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}