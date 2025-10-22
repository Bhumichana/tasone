'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, Building2, Search, Users, FileText } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { DatePicker } from '@/components/ui/date-picker'

interface Dealer {
  id: string
  dealerCode: string
  manufacturerNumber: string
  dealerName: string
  type: string
  region?: string
  address: string
  phoneNumber: string
  startDate: string
  endDate?: string
  users: {
    id: string
    firstName: string
    lastName: string
    role: string
  }[]
  _count: {
    users: number
    warranties: number
  }
  createdAt: string
}

export default function DealersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingDealer, setEditingDealer] = useState<Dealer | null>(null)
  const [formData, setFormData] = useState({
    dealerCode: '',
    manufacturerNumber: '',
    dealerName: '',
    type: 'ตัวแทนจำหน่าย',
    region: '',
    address: '',
    phoneNumber: '',
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.userGroup !== 'HeadOffice') {
      router.push('/dashboard')
      return
    }

    fetchDealers()
  }, [session, status, router])

  const fetchDealers = async () => {
    try {
      const response = await fetch('/api/dealers')
      const data = await response.json()
      if (response.ok) {
        setDealers(data.dealers)
      }
    } catch (error) {
      console.error('Error fetching dealers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingDealer ? `/api/dealers/${editingDealer.id}` : '/api/dealers'
      const method = editingDealer ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchDealers()
        resetForm()
        setShowAddForm(false)
        setEditingDealer(null)
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error saving dealer:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (dealer: Dealer) => {
    setEditingDealer(dealer)
    setFormData({
      dealerCode: dealer.dealerCode,
      manufacturerNumber: dealer.manufacturerNumber,
      dealerName: dealer.dealerName,
      type: dealer.type,
      region: dealer.region || '',
      address: dealer.address,
      phoneNumber: dealer.phoneNumber,
      startDate: new Date(dealer.startDate).toISOString().split('T')[0],
      endDate: dealer.endDate ? new Date(dealer.endDate).toISOString().split('T')[0] : ''
    })
    setShowAddForm(true)
  }

  const handleDelete = async (dealerId: string) => {
    if (!confirm('ต้องการลบตัวแทนจำหน่ายนี้หรือไม่?')) return

    try {
      const response = await fetch(`/api/dealers/${dealerId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchDealers()
      } else {
        const error = await response.json()
        alert(error.error || 'ไม่สามารถลบตัวแทนจำหน่ายได้')
      }
    } catch (error) {
      console.error('Error deleting dealer:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  const resetForm = () => {
    setFormData({
      dealerCode: '',
      manufacturerNumber: '',
      dealerName: '',
      type: 'ตัวแทนจำหน่าย',
      region: '',
      address: '',
      phoneNumber: '',
      startDate: '',
      endDate: ''
    })
  }

  const filteredDealers = dealers.filter(dealer =>
    dealer.dealerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dealer.dealerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dealer.manufacturerNumber.toLowerCase().includes(searchTerm.toLowerCase())
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
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <Building2 className="h-6 w-6 text-navy-900 mr-3" />
              <h1 className="text-2xl font-bold text-navy-900">จัดการตัวแทนจำหน่าย</h1>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-navy-900 hover:bg-navy-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out"
            >
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มตัวแทนจำหน่ายใหม่
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาตัวแทนจำหน่าย..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full md:w-1/3"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDealers.map((dealer) => (
              <div key={dealer.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {dealer.dealerName}
                      </h3>
                      <div className="flex flex-col text-sm text-gray-500 space-y-1">
                        <span>รหัส: {dealer.dealerCode}</span>
                        <span>ผู้ผลิต: {dealer.manufacturerNumber}</span>
                        <span className={`font-medium ${
                          dealer.type === 'สำนักงานใหญ่'
                            ? 'text-blue-600'
                            : 'text-green-600'
                        }`}>
                          ประเภท: {dealer.type}
                        </span>
                        {dealer.region && <span>ภาค: {dealer.region}</span>}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(dealer)}
                        className="text-indigo-600 hover:text-indigo-900 p-1"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(dealer.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4 text-sm text-gray-600">
                    <p className="mb-1">{dealer.address}</p>
                    <p>โทร: {dealer.phoneNumber}</p>
                  </div>

                  <div className="mb-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      dealer.endDate && new Date(dealer.endDate) < new Date()
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {dealer.endDate && new Date(dealer.endDate) < new Date() ? 'หมดอายุ' : 'ใช้งานได้'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-1" />
                      <span>{dealer._count.users} ผู้ใช้</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <FileText className="h-4 w-4 mr-1" />
                      <span>{dealer._count.warranties} ใบรับประกัน</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                    <div>เริ่ม: {new Date(dealer.startDate).toLocaleDateString('th-TH')}</div>
                    {dealer.endDate && (
                      <div>สิ้นสุด: {new Date(dealer.endDate).toLocaleDateString('th-TH')}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredDealers.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">ไม่พบตัวแทนจำหน่าย</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'ลองเปลี่ยนคำค้นหา' : 'เริ่มต้นโดยการเพิ่มตัวแทนจำหน่ายใหม่'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingDealer ? 'แก้ไขตัวแทนจำหน่าย' : 'เพิ่มตัวแทนจำหน่ายใหม่'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">รหัสตัวแทนจำหน่าย</label>
                <input
                  type="text"
                  value={formData.dealerCode}
                  onChange={(e) => setFormData({ ...formData, dealerCode: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">หมายเลขผู้ผลิต</label>
                <input
                  type="text"
                  value={formData.manufacturerNumber}
                  onChange={(e) => setFormData({ ...formData, manufacturerNumber: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">ชื่อตัวแทนจำหน่าย</label>
                <input
                  type="text"
                  value={formData.dealerName}
                  onChange={(e) => setFormData({ ...formData, dealerName: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">ประเภท</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="ตัวแทนจำหน่าย">ตัวแทนจำหน่าย</option>
                  <option value="สำนักงานใหญ่">สำนักงานใหญ่</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">ตัวแทนจำหน่ายภาค</label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">เลือกภาค</option>
                  <option value="ภาคเหนือ">ภาคเหนือ</option>
                  <option value="ภาคตะวันออกเฉียงเหนือ">ภาคตะวันออกเฉียงเหนือ</option>
                  <option value="ภาคตะวันตก">ภาคตะวันตก</option>
                  <option value="ภาคกลาง">ภาคกลาง</option>
                  <option value="ภาคตะวันออก">ภาคตะวันออก</option>
                  <option value="ภาคใต้">ภาคใต้</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">ที่อยู่</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">หมายเลขโทรศัพท์</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">วันที่เริ่มเป็นตัวแทน</label>
                  <DatePicker
                    value={formData.startDate}
                    onChange={(date) => setFormData({ ...formData, startDate: date })}
                    placeholder="เลือกวันที่เริ่มต้น"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">วันที่สิ้นสุด (ถ้ามี)</label>
                  <DatePicker
                    value={formData.endDate}
                    onChange={(date) => setFormData({ ...formData, endDate: date })}
                    placeholder="เลือกวันที่สิ้นสุด"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingDealer(null)
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
                  {loading ? 'กำลังบันทึก...' : (editingDealer ? 'บันทึก' : 'เพิ่ม')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}