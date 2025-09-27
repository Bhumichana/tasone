'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Package, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ReceivingForm from '@/components/raw-material-receiving/ReceivingForm'
import ReceivingList from '@/components/raw-material-receiving/ReceivingList'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface RawMaterialReceiving {
  id: string
  receivingNumber: string
  receivingDate: string
  purchaseOrderNo?: string
  supplier: string
  batchNumber: string
  receivedQuantity: number
  storageLocation: string
  qualityStatus: string
  notes?: string
  receivedBy: string
  createdAt: string
  rawMaterial: {
    id: string
    materialCode: string
    materialName: string
    materialType: string
    unit: string
  }
}

interface ReceivingStats {
  summary: {
    today: { count: number; totalQuantity: number }
    week: { count: number; totalQuantity: number }
    month: { count: number; totalQuantity: number }
  }
  statusStats: Array<{ status: string; count: number }>
}

interface ReceivingFormData {
  receivingDate: string
  purchaseOrderNo: string
  supplier: string
  rawMaterialId: string
  batchNumber: string
  receivedQuantity: string
  storageLocation: string
  notes: string
  qualityStatus: string
}

export default function RawMaterialReceivingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [receivings, setReceivings] = useState<RawMaterialReceiving[]>([])
  const [stats, setStats] = useState<ReceivingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingReceiving, setEditingReceiving] = useState<RawMaterialReceiving | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // ตรวจสอบสิทธิ์เข้าถึง
  useEffect(() => {
    if (status === 'loading') return

    if (!session || session.user.userGroup !== 'HeadOffice') {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  // ดึงข้อมูลการรับเข้าและสถิติ
  useEffect(() => {
    fetchReceivings()
    fetchStats()
  }, [])

  const fetchReceivings = async () => {
    try {
      const response = await fetch('/api/raw-material-receiving')
      if (response.ok) {
        const data = await response.json()
        setReceivings(data.receivings || [])
      } else {
        throw new Error('Failed to fetch receivings')
      }
    } catch (error) {
      console.error('Error fetching receivings:', error)
      setError('ไม่สามารถโหลดข้อมูลการรับเข้าได้')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/raw-material-receiving/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSubmit = async (formData: ReceivingFormData) => {
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const url = editingReceiving
        ? `/api/raw-material-receiving/${editingReceiving.id}`
        : '/api/raw-material-receiving'

      const method = editingReceiving ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const result = await response.json()
        setSuccess(editingReceiving ? 'แก้ไขการรับเข้าสำเร็จ' : 'บันทึกการรับเข้าสำเร็จ')
        setShowAddForm(false)
        setEditingReceiving(null)
        await fetchReceivings()
        await fetchStats()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (receiving: RawMaterialReceiving) => {
    setEditingReceiving(receiving)
    setShowAddForm(true)
    setError('')
    setSuccess('')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบการรับเข้านี้? การกระทำนี้ไม่สามารถยกเลิกได้')) {
      return
    }

    try {
      const response = await fetch(`/api/raw-material-receiving/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSuccess('ลบการรับเข้าสำเร็จ')
        await fetchReceivings()
        await fetchStats()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'ไม่สามารถลบได้')
      }
    } catch (error) {
      console.error('Error deleting receiving:', error)
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลบ')
    }
  }

  const handleView = (receiving: RawMaterialReceiving) => {
    // TODO: Implement view details modal/page
    console.log('View receiving:', receiving)
  }

  const handleCancel = () => {
    setShowAddForm(false)
    setEditingReceiving(null)
    setError('')
    setSuccess('')
  }

  // ไม่แสดงหน้านี้ถ้าไม่ใช่ HeadOffice
  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session || session.user.userGroup !== 'HeadOffice') {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* หัวข้อหน้า */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">การรับเข้าวัตถุดิบ</h1>
            <p className="text-gray-600 mt-1">จัดการการรับเข้าวัตถุดิบสำหรับคลังสำนักงานใหญ่</p>
          </div>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              บันทึกการรับเข้าใหม่
            </Button>
          )}
        </div>

        {/* แสดงข้อความแจ้งเตือน */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* สถิติ Dashboard */}
        {stats && !showAddForm && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">การรับเข้าวันนี้</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.summary.today.count}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.summary.today.totalQuantity.toLocaleString()} kg
                  </p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">การรับเข้าสัปดาห์นี้</p>
                  <p className="text-2xl font-bold text-green-600">{stats.summary.week.count}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.summary.week.totalQuantity.toLocaleString()} kg
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">การรับเข้าเดือนนี้</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.summary.month.count}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.summary.month.totalQuantity.toLocaleString()} kg
                  </p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </Card>
          </div>
        )}

        {/* ส่วนแสดงฟอร์มหรือรายการ */}
        {showAddForm ? (
          <ReceivingForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            initialData={editingReceiving ? {
              receivingDate: editingReceiving.receivingDate,
              purchaseOrderNo: editingReceiving.purchaseOrderNo || '',
              supplier: editingReceiving.supplier,
              rawMaterialId: editingReceiving.rawMaterial.id,
              batchNumber: editingReceiving.batchNumber,
              receivedQuantity: editingReceiving.receivedQuantity.toString(),
              storageLocation: editingReceiving.storageLocation,
              notes: editingReceiving.notes || '',
              qualityStatus: editingReceiving.qualityStatus
            } : undefined}
            isEditing={!!editingReceiving}
            loading={submitting}
          />
        ) : (
          <ReceivingList
            receivings={receivings}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            loading={loading}
          />
        )}
      </div>
    </DashboardLayout>
  )
}