'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, Users, Search, CheckCircle, XCircle } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface User {
  id: string
  username: string
  userGroup: 'HeadOffice' | 'Dealer'
  role: string
  firstName: string
  lastName: string
  phoneNumber: string
  email?: string
  lineId?: string
  dealerId?: string
  dealer?: {
    dealerName: string
    dealerCode: string
  }
  profileImage?: string
  isActive: boolean
  createdAt: string
}

interface Dealer {
  id: string
  dealerName: string
  dealerCode: string
}

export default function UsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    userGroup: 'Dealer' as 'HeadOffice' | 'Dealer',
    role: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    lineId: '',
    dealerId: '',
    profileImage: ''
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.userGroup !== 'HeadOffice') {
      router.push('/dashboard')
      return
    }

    fetchUsers()
    fetchDealers()
  }, [session, status, router])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      if (response.ok) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDealers = async () => {
    try {
      const response = await fetch('/api/dealers')
      if (response.ok) {
        const data = await response.json()
        setDealers(data.dealers || [])
      }
    } catch (error) {
      console.error('Error fetching dealers:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let profileImageUrl = formData.profileImage

      // Upload image if selected
      if (selectedImage) {
        const imageFormData = new FormData()
        imageFormData.append('file', selectedImage)

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: imageFormData,
        })

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          profileImageUrl = uploadResult.url
        } else {
          alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ')
          setLoading(false)
          return
        }
      }

      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PUT' : 'POST'

      const userData = {
        ...formData,
        profileImage: profileImageUrl
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      if (response.ok) {
        fetchUsers()
        resetForm()
        setShowAddForm(false)
        setEditingUser(null)
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error saving user:', error)
      alert('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น')
        return
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('ขนาดไฟล์ต้องไม่เกิน 5MB')
        return
      }

      setSelectedImage(file)

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: '',
      userGroup: user.userGroup,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      email: user.email || '',
      lineId: user.lineId || '',
      dealerId: user.dealerId || '',
      profileImage: (user as any).profileImage || ''
    })
    setImagePreview((user as any).profileImage || null)
    setSelectedImage(null)
    setShowAddForm(true)
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('ต้องการลบผู้ใช้นี้หรือไม่?')) return

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchUsers()
      } else {
        const error = await response.json()
        alert(error.error || 'ไม่สามารถลบผู้ใช้ได้')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('เกิดข้อผิดพลาดในการลบ')
    }
  }

  const handleApprove = async (userId: string) => {
    if (!confirm('ต้องการอนุมัติผู้ใช้นี้ให้เข้าใช้งานได้หรือไม่?')) return

    try {
      const response = await fetch(`/api/users/${userId}/approve`, {
        method: 'POST',
      })

      if (response.ok) {
        fetchUsers()
        alert('อนุมัติผู้ใช้สำเร็จ')
      } else {
        const error = await response.json()
        alert(error.error || 'ไม่สามารถอนุมัติผู้ใช้ได้')
      }
    } catch (error) {
      console.error('Error approving user:', error)
      alert('เกิดข้อผิดพลาดในการอนุมัติ')
    }
  }

  const handleDeactivate = async (userId: string) => {
    if (!confirm('ต้องการปิดการใช้งานของผู้ใช้นี้หรือไม่?')) return

    try {
      const response = await fetch(`/api/users/${userId}/approve`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchUsers()
        alert('ปิดการใช้งานสำเร็จ')
      } else {
        const error = await response.json()
        alert(error.error || 'ไม่สามารถปิดการใช้งานได้')
      }
    } catch (error) {
      console.error('Error deactivating user:', error)
      alert('เกิดข้อผิดพลาดในการปิดการใช้งาน')
    }
  }

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      userGroup: 'Dealer',
      role: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      email: '',
      lineId: '',
      dealerId: '',
      profileImage: ''
    })
    setSelectedImage(null)
    setImagePreview(null)
  }

  const filteredUsers = users.filter(user =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
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
        {/* Page Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <Users className="h-6 w-6 text-navy-900 mr-3" />
              <h1 className="text-2xl font-bold text-navy-900">จัดการผู้ใช้งาน</h1>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-navy-900 hover:bg-navy-700 hover:shadow-lg transform hover:scale-105 transition-all duration-200 ease-in-out"
            >
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มผู้ใช้ใหม่
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาผู้ใช้งาน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full md:w-1/3"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ผู้ใช้งาน
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      กลุ่ม/บทบาท
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ข้อมูลติดต่อ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ตัวแทนจำหน่าย
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {/* Profile Image */}
                          <div className="flex-shrink-0 h-10 w-10">
                            {(user as any).profileImage ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={(user as any).profileImage}
                                alt={`${user.firstName} ${user.lastName}`}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <Users className="h-6 w-6 text-gray-600" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.userGroup === 'HeadOffice'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {user.userGroup === 'HeadOffice' ? 'สำนักงานใหญ่' : 'ตัวแทนจำหน่าย'}
                          </span>
                          <div className="text-sm text-gray-500 mt-1">{user.role}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.isActive ? 'ใช้งานได้' : 'รออนุมัติ'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="text-sm font-medium">{user.phoneNumber}</div>
                          {user.email && (
                            <div className="text-sm text-gray-500">{user.email}</div>
                          )}
                          {user.lineId && (
                            <div className="text-sm text-blue-600">LINE: {user.lineId}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.dealer ? (
                          <div>
                            <div className="font-medium">{user.dealer.dealerName}</div>
                            <div className="text-gray-500">{user.dealer.dealerCode}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {!user.isActive && (
                            <button
                              onClick={() => handleApprove(user.id)}
                              className="text-green-600 hover:text-green-900"
                              title="อนุมัติผู้ใช้"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                          )}
                          {user.isActive && user.id !== session?.user.id && (
                            <button
                              onClick={() => handleDeactivate(user.id)}
                              className="text-orange-600 hover:text-orange-900"
                              title="ปิดการใช้งาน"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="แก้ไข"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-900"
                            title="ลบ"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">ไม่พบผู้ใช้งาน</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'ลองเปลี่ยนคำค้นหา' : 'เริ่มต้นโดยการเพิ่มผู้ใช้งานใหม่'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingUser ? 'แก้ไขผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">ชื่อผู้ใช้</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  รหัสผ่าน {editingUser && '(เว้นว่างหากไม่ต้องการเปลี่ยน)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required={!editingUser}
                />
              </div>

              {formData.userGroup === 'Dealer' && (
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
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">กลุ่มผู้ใช้</label>
                <select
                  value={formData.userGroup}
                  onChange={(e) => setFormData({ ...formData, userGroup: e.target.value as 'HeadOffice' | 'Dealer', dealerId: '' })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="HeadOffice">สำนักงานใหญ่</option>
                  <option value="Dealer">ตัวแทนจำหน่าย</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">บทบาท</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">เลือกบทบาท</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="DealerUser">DealerUser</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ชื่อ</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">นามสกุล</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">เบอร์โทรศัพท์</label>
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
                  <label className="block text-sm font-medium text-gray-700">อีเมล</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="example@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">LINE ID</label>
                  <input
                    type="text"
                    value={formData.lineId}
                    onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="@lineid หรือ userid"
                  />
                </div>
              </div>

              {/* Profile Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">รูปประจำตัว</label>
                <div className="flex items-start space-x-4">
                  {/* Image Preview */}
                  <div className="flex-shrink-0">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Profile preview"
                        className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                        <Users className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* File Input */}
                  <div className="flex-grow">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-navy-50 file:text-navy-700 hover:file:bg-navy-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      รองรับไฟล์: JPG, PNG, GIF (ขนาดไม่เกิน 5MB)
                    </p>
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null)
                          setSelectedImage(null)
                        }}
                        className="text-xs text-red-600 hover:text-red-800 mt-1"
                      >
                        ลบรูป
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingUser(null)
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
                  {loading ? 'กำลังบันทึก...' : (editingUser ? 'บันทึก' : 'เพิ่ม')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}