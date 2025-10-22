'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, Users, Search, FileText, Store } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface SubDealer {
  id: string
  name: string
  address?: string
  phoneNumber?: string
  email?: string
  dealerId: string
  dealer: {
    id: string
    dealerCode: string
    dealerName: string
  }
  _count: {
    warranties: number
  }
  createdAt: string
}

export default function SubDealersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [subDealers, setSubDealers] = useState<SubDealer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSubDealer, setEditingSubDealer] = useState<SubDealer | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phoneNumber: '',
    email: ''
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.userGroup !== 'Dealer') {
      router.push('/dashboard')
      return
    }

    fetchSubDealers()
  }, [session, status, router])

  const fetchSubDealers = async () => {
    try {
      const response = await fetch('/api/sub-dealers')
      const data = await response.json()
      if (response.ok) {
        setSubDealers(data.subDealers)
      }
    } catch (error) {
      console.error('Error fetching sub-dealers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingSubDealer ? `/api/sub-dealers/${editingSubDealer.id}` : '/api/sub-dealers'
      const method = editingSubDealer ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchSubDealers()
        resetForm()
        setShowAddForm(false)
        setEditingSubDealer(null)
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error saving sub-dealer:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (subDealer: SubDealer) => {
    setEditingSubDealer(subDealer)
    setFormData({
      name: subDealer.name,
      address: subDealer.address || '',
      phoneNumber: subDealer.phoneNumber || '',
      email: subDealer.email || ''
    })
    setShowAddForm(true)
  }

  const handleDelete = async (subDealerId: string) => {
    if (!confirm('ต้องการลบผู้ขายรายย่อยนี้หรือไม่?')) return

    try {
      const response = await fetch(`/api/sub-dealers/${subDealerId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchSubDealers()
      } else {
        const error = await response.json()
        alert(error.error || 'ไม่สามารถลบผู้ขายรายย่อยได้')
      }
    } catch (error) {
      console.error('Error deleting sub-dealer:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phoneNumber: '',
      email: ''
    })
  }

  const filteredSubDealers = subDealers.filter(subDealer =>
    subDealer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subDealer.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subDealer.email?.toLowerCase().includes(searchTerm.toLowerCase())
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
              <Store className="h-6 w-6 text-navy-900 mr-3" />
              <h1 className="text-2xl font-bold text-navy-900">จัดการผู้ขายรายย่อย</h1>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-navy-900 hover:bg-navy-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out"
            >
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มผู้ขายรายย่อยใหม่
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาผู้ขายรายย่อย..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full md:w-1/3"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubDealers.map((subDealer) => (
              <div key={subDealer.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {subDealer.name}
                      </h3>
                      <div className="flex flex-col text-sm text-gray-500 space-y-1">
                        {subDealer.phoneNumber && (
                          <span>โทร: {subDealer.phoneNumber}</span>
                        )}
                        {subDealer.email && (
                          <span>อีเมล: {subDealer.email}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(subDealer)}
                        className="text-indigo-600 hover:text-indigo-900 p-1"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(subDealer.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {subDealer.address && (
                    <div className="mb-4 text-sm text-gray-600">
                      <p>{subDealer.address}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2 pt-4 border-t border-gray-200">
                    <div className="flex items-center text-sm text-gray-600">
                      <FileText className="h-4 w-4 mr-2" />
                      <span>{subDealer._count.warranties} ใบรับประกัน</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                    <div>เพิ่มเมื่อ: {new Date(subDealer.createdAt).toLocaleDateString('th-TH')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredSubDealers.length === 0 && (
            <div className="text-center py-12">
              <Store className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">ไม่พบผู้ขายรายย่อย</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'ลองเปลี่ยนคำค้นหา' : 'เริ่มต้นโดยการเพิ่มผู้ขายรายย่อยใหม่'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingSubDealer ? 'แก้ไขผู้ขายรายย่อย' : 'เพิ่มผู้ขายรายย่อยใหม่'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ชื่อผู้ขายรายย่อย <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">ที่อยู่</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">หมายเลขโทรศัพท์</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">อีเมล</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingSubDealer(null)
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
                  {loading ? 'กำลังบันทึก...' : (editingSubDealer ? 'บันทึก' : 'เพิ่ม')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
