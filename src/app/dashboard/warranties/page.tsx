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
import ThaiDatePicker from '@/components/ui/ThaiDatePicker'
import { format } from 'date-fns'
import MaterialUsageTable from '@/components/warranties/MaterialUsageTable'
import ApprovalModal from '@/components/warranties/ApprovalModal'
import {
  calculateMaterialUsage,
  calculateMaterialUsageFromDealerStock,
  serializeMaterialUsage,
  MaterialUsageItem,
  DealerStockItem
} from '@/lib/recipe-calculator'

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
  // ฟิลด์ใหม่
  dealerName?: string
  productionDate?: string
  deliveryDate?: string
  purchaseOrderNo?: string
  installationArea?: number
  thickness?: number
  chemicalBatchNo?: string
  materialUsage?: string  // ข้อมูลวัตถุดิบที่ใช้ (JSON string)
  dealerId: string
  dealer: {
    id: string
    dealerCode: string
    dealerName: string
    manufacturerNumber?: string
  }
  subDealerId?: string | null
  subDealer?: {
    id: string
    name: string
    phoneNumber?: string
  } | null
  // ระบบควบคุมการแก้ไข
  isEdited?: boolean
  editedAt?: string | null
  editedBy?: string | null
  // ระบบอนุมัติการแก้ไข
  editApproved?: boolean
  editReason?: string | null
  editApprovedAt?: string | null
  editApprovedBy?: string | null
  approvalNote?: string | null
  createdAt: string
}

interface Product {
  id: string
  productCode: string
  productName: string
  serialNumber?: string
  category: string
  thickness?: number
  warrantyTerms?: string
}

interface Dealer {
  id: string
  dealerCode: string
  dealerName: string
}

interface SubDealer {
  id: string
  name: string
  address?: string
  phoneNumber?: string
  email?: string
  dealerId: string
}

export default function WarrantiesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [warranties, setWarranties] = useState<Warranty[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [subDealers, setSubDealers] = useState<SubDealer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDealer, setSelectedDealer] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
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
    warrantyTerms: '',
    // ฟิลด์ใหม่
    warrantyNumber: '',       // เพิ่ม: หมายเลขใบรับประกัน (auto-generate)
    dealerName: '',
    subDealerId: '',          // เพิ่ม: ID ของผู้ขายรายย่อย
    manufacturerNumber: '',   // เปลี่ยนจาก dealerCode เป็น manufacturerNumber
    productionDate: '',
    deliveryDate: '',
    purchaseOrderNo: '',
    installationArea: '',
    thickness: '',
    chemicalBatchNo: ''
  })

  // State สำหรับ BOM และการคำนวณวัตถุดิบ
  const [selectedProductRecipe, setSelectedProductRecipe] = useState<any>(null)
  const [calculatedMaterials, setCalculatedMaterials] = useState<MaterialUsageItem[]>([])
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null)
  const [dealerStocks, setDealerStocks] = useState<DealerStockItem[]>([]) // สต็อกของดีลเลอร์

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
    // ดึงสต็อกของดีลเลอร์เมื่อโหลดหน้าครั้งแรก
    if (session.user.userGroup === 'Dealer' && session.user.dealerId) {
      fetchDealerStock()
      fetchSubDealers() // ดึงรายชื่อ Sub-dealers ของ Dealer
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

  const fetchSubDealers = async () => {
    try {
      const response = await fetch('/api/sub-dealers')
      const data = await response.json()
      if (response.ok) {
        setSubDealers(data.subDealers)
      }
    } catch (error) {
      console.error('Error fetching sub-dealers:', error)
    }
  }

  // ดึงสต็อกของดีลเลอร์
  const fetchDealerStock = async () => {
    try {
      const dealerId = session?.user.dealerId
      if (!dealerId) {
        return
      }

      const response = await fetch(`/api/dealer-stock?availableOnly=true`)
      const data = await response.json()

      if (response.ok) {
        setDealerStocks(data.stocks || [])
      } else {
        setDealerStocks([])
      }
    } catch (error) {
      console.error('Error fetching dealer stock:', error)
      setDealerStocks([])
    }
  }

  // ดึงสูตร BOM ของสินค้า
  const fetchProductRecipe = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}/recipe`)
      const data = await response.json()
      if (response.ok && data.recipe) {
        setSelectedProductRecipe(data.recipe)
      } else {
        setSelectedProductRecipe(null)
      }
    } catch (error) {
      console.error('Error fetching product recipe:', error)
      setSelectedProductRecipe(null)
    }
  }

  // useEffect: ดึงสูตรและข้อมูลสินค้าเมื่อเลือกสินค้า
  useEffect(() => {
    if (formData.productId) {
      fetchProductRecipe(formData.productId)

      // ดึงข้อมูลสินค้า
      const product = products.find(p => p.id === formData.productId)
      if (product) {
        setSelectedProductDetails(product)

        // อัปเดต thickness และ warrantyTerms จากสินค้า
        setFormData(prev => ({
          ...prev,
          thickness: product.thickness?.toString() || '',
          warrantyTerms: product.warrantyTerms || ''
        }))
      }
    } else {
      setSelectedProductRecipe(null)
      setCalculatedMaterials([])
      setSelectedProductDetails(null)
    }
  }, [formData.productId, products])

  // useEffect: คำนวณวัตถุดิบเมื่อมีพื้นที่ติดตั้ง (ใช้สต็อกจาก DealerStock)
  useEffect(() => {
    if (selectedProductRecipe && formData.installationArea && dealerStocks.length > 0) {
      const area = parseFloat(formData.installationArea)
      if (area > 0) {
        const materials = calculateMaterialUsageFromDealerStock(
          selectedProductRecipe,
          area,
          dealerStocks
        )
        setCalculatedMaterials(materials)
      } else {
        setCalculatedMaterials([])
      }
    } else {
      setCalculatedMaterials([])
    }
  }, [selectedProductRecipe, formData.installationArea, dealerStocks])

  // useEffect: อัพเดต chemicalBatchNo อัตโนมัติจาก calculatedMaterials
  useEffect(() => {
    if (calculatedMaterials.length > 0) {
      // ดึง batch numbers ทั้งหมดที่ไม่ซ้ำกัน
      const batchNumbers = calculatedMaterials
        .map(material => material.batchNumber)
        .filter(batch => batch && batch.trim() !== '') // กรองเฉพาะที่มีค่า

      // รวม batch numbers ด้วย comma
      const combinedBatchNo = [...new Set(batchNumbers)].join(', ')

      // อัพเดตลงในฟอร์ม
      setFormData(prev => ({
        ...prev,
        chemicalBatchNo: combinedBatchNo
      }))
    }
  }, [calculatedMaterials])

  // Helper function to format date as dd/mm/yyyy
  const formatDateToDDMMYYYY = (dateString: string): string => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
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
        body: JSON.stringify({
          ...formData,
          materialUsage: calculatedMaterials.length > 0 ? serializeMaterialUsage(calculatedMaterials) : null
        }),
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

  // Helper function to convert date to yyyy-mm-dd format for DatePicker
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleEdit = async (warranty: Warranty) => {
    setEditingWarranty(warranty)

    // ดึงข้อมูลสินค้าเพื่อเซ็ต thickness และ warrantyTerms
    const product = products.find(p => p.id === warranty.productId)

    setFormData({
      productId: warranty.productId,
      customerName: warranty.customerName,
      customerPhone: warranty.customerPhone,
      customerEmail: warranty.customerEmail || '',
      customerAddress: warranty.customerAddress,
      warrantyDate: new Date(warranty.warrantyDate).toISOString().split('T')[0],
      warrantyPeriodMonths: warranty.warrantyPeriodMonths,
      warrantyTerms: product?.warrantyTerms || warranty.warrantyTerms || '',  // ดึงจาก product
      // ฟิลด์ใหม่
      warrantyNumber: warranty.warrantyNumber || '',
      dealerName: warranty.dealerName || '',
      subDealerId: warranty.subDealerId || '',  // เพิ่ม: โหลด subDealerId
      manufacturerNumber: warranty.dealer.manufacturerNumber || '',
      productionDate: warranty.productionDate ? formatDateForInput(warranty.productionDate) : '',
      deliveryDate: warranty.deliveryDate ? formatDateForInput(warranty.deliveryDate) : '',
      purchaseOrderNo: warranty.purchaseOrderNo || '',
      installationArea: warranty.installationArea?.toString() || '',
      thickness: product?.thickness?.toString() || warranty.thickness?.toString() || '',  // ดึงจาก product
      chemicalBatchNo: warranty.chemicalBatchNo || ''
    })
    // ดึงสต็อกของดีลเลอร์เพื่อใช้ในการคำนวณวัตถุดิบ
    await fetchDealerStock()
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

  const handleApproveEdit = async (warrantyId: string, approvalNote: string) => {
    try {
      const response = await fetch(`/api/warranties/${warrantyId}/approve-edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved: true,
          approvalNote: approvalNote || undefined,
        }),
      })

      if (response.ok) {
        alert('อนุมัติการแก้ไขสำเร็จ')
        fetchWarranties()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'ไม่สามารถอนุมัติได้')
      }
    } catch (error: any) {
      console.error('Error approving edit:', error)
      throw error
    }
  }

  const handleRejectEdit = async (warrantyId: string, approvalNote: string) => {
    try {
      const response = await fetch(`/api/warranties/${warrantyId}/approve-edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved: false,
          approvalNote: approvalNote || undefined,
        }),
      })

      if (response.ok) {
        alert('ปฏิเสธการแก้ไขสำเร็จ')
        fetchWarranties()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'ไม่สามารถปฏิเสธได้')
      }
    } catch (error: any) {
      console.error('Error rejecting edit:', error)
      throw error
    }
  }

  const handlePrintWarranty = async (warrantyId: string) => {
    try {
      const response = await fetch(`/api/warranties/${warrantyId}/pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)

        // เปิด PDF ในแท็บใหม่เพื่อให้พิมพ์ได้
        window.open(url, '_blank')

        // หรือดาวน์โหลดโดยตรง
        // const link = document.createElement('a')
        // link.href = url
        // link.download = `warranty_${warrantyId}.pdf`
        // link.click()
        // window.URL.revokeObjectURL(url)
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
      warrantyTerms: '',
      // ฟิลด์ใหม่
      warrantyNumber: '',        // เคลียร์หมายเลขใบรับประกัน
      dealerName: '',
      subDealerId: '',           // เคลียร์ผู้ขายรายย่อย
      manufacturerNumber: '',    // เคลียร์รหัสผู้ผลิต (เปลี่ยนจาก dealerCode)
      productionDate: '',
      deliveryDate: '',
      purchaseOrderNo: '',
      installationArea: '',
      thickness: '',
      chemicalBatchNo: ''
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

  // ฟังก์ชันคำนวณจำนวนวันที่เหลือในการแก้ไข (5 วัน)
  const getDaysLeftToEdit = (warrantyDate: string) => {
    const warrantyDateObj = new Date(warrantyDate)
    const today = new Date()
    const daysPassed = Math.floor((today.getTime() - warrantyDateObj.getTime()) / (1000 * 60 * 60 * 24))
    const daysLeft = 5 - daysPassed
    return { daysPassed, daysLeft }
  }

  // ตรวจสอบว่าสามารถแก้ไขใบรับประกันได้หรือไม่
  const canEditWarranty = (warranty: Warranty) => {
    const { daysLeft } = getDaysLeftToEdit(warranty.warrantyDate)

    // เงื่อนไข 1: เกิน 5 วันแล้ว
    if (daysLeft < 0) {
      return {
        canEdit: false,
        reason: 'เกินระยะเวลา 5 วัน',
        tooltip: 'ไม่สามารถแก้ไขได้ เกินระยะเวลา 5 วันแล้ว'
      }
    }

    // เงื่อนไข 2: แก้ไขไปแล้ว 1 ครั้ง
    if (warranty.isEdited) {
      return {
        canEdit: false,
        reason: 'แก้ไขไปแล้ว',
        tooltip: 'ไม่สามารถแก้ไขได้ เนื่องจากแก้ไขไปแล้ว 1 ครั้ง'
      }
    }

    // แก้ไขได้
    return {
      canEdit: true,
      reason: '',
      tooltip: `แก้ไขได้อีก ${daysLeft} วัน`
    }
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
              onClick={async () => {
                resetForm()
                // ดึงข้อมูล dealer เพื่อแสดงในฟอร์ม
                if (session?.user.dealerId) {
                  try {
                    const dealerResponse = await fetch(`/api/dealers/${session.user.dealerId}`)
                    const dealerData = await dealerResponse.json()

                    if (dealerResponse.ok && dealerData.dealer) {
                      // สร้างหมายเลขใบรับประกันใหม่ (format: DealerCode-DDMMYYYY-XXX)
                      const today = new Date()
                      const dd = String(today.getDate()).padStart(2, '0')
                      const mm = String(today.getMonth() + 1).padStart(2, '0')
                      const yyyy = today.getFullYear()
                      const count = warranties.length + 1
                      const newWarrantyNumber = `${dealerData.dealer.dealerCode}-${dd}${mm}${yyyy}-${String(count).padStart(3, '0')}`

                      setFormData(prev => ({
                        ...prev,
                        dealerName: dealerData.dealer.dealerName || '',
                        manufacturerNumber: dealerData.dealer.manufacturerNumber || '',  // เปลี่ยน
                        warrantyNumber: newWarrantyNumber
                      }))
                    }
                  } catch (error) {
                    console.error('Error fetching dealer:', error)
                  }
                }
                // ดึงสต็อกของดีลเลอร์เพื่อใช้ในการคำนวณวัตถุดิบ
                await fetchDealerStock()
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

            <div>
              <ThaiDatePicker
                selected={dateFrom ? new Date(dateFrom) : null}
                onChange={(date) => {
                  if (date) {
                    setDateFrom(format(date, 'yyyy-MM-dd'))
                  } else {
                    setDateFrom('')
                  }
                }}
                placeholderText="จากวันที่"
                className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div>
              <ThaiDatePicker
                selected={dateTo ? new Date(dateTo) : null}
                onChange={(date) => {
                  if (date) {
                    setDateTo(format(date, 'yyyy-MM-dd'))
                  } else {
                    setDateTo('')
                  }
                }}
                placeholderText="ถึงวันที่"
                className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
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
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              status.color === 'green'
                                ? 'bg-green-100 text-green-800'
                                : status.color === 'yellow'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {status.text}
                            </span>
                            {warranty.isEdited && !warranty.editApproved && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                รออนุมัติการแก้ไข
                              </span>
                            )}
                            {warranty.isEdited && warranty.editApproved && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                แก้ไขแล้ว ✓
                              </span>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              หมดอายุ: {new Date(warranty.expiryDate).toLocaleDateString('th-TH')}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => {
                              setSelectedWarranty(warranty)
                              setShowDetailModal(true)
                            }}
                            disabled={warranty.isEdited && !warranty.editApproved}
                            className={
                              warranty.isEdited && !warranty.editApproved
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-blue-600 hover:text-blue-900"
                            }
                            title={warranty.isEdited && !warranty.editApproved ? "ปุ่ม View ถูกปิดใช้งานในขณะรออนุมัติการแก้ไข" : "ดูรายละเอียด"}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handlePrintWarranty(warranty.id)}
                            disabled={warranty.isEdited && !warranty.editApproved}
                            className={
                              warranty.isEdited && !warranty.editApproved
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-green-600 hover:text-green-900"
                            }
                            title={warranty.isEdited && !warranty.editApproved ? "ปุ่ม Download ถูกปิดใช้งานในขณะรออนุมัติการแก้ไข" : "ดาวน์โหลด PDF"}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {/* Edit Button with Time-based Control */}
                          {(() => {
                            const editControl = canEditWarranty(warranty)
                            const { daysLeft } = getDaysLeftToEdit(warranty.warrantyDate)

                            // Color coding based on days left
                            const getButtonColor = () => {
                              if (!editControl.canEdit) return 'text-gray-400 cursor-not-allowed'
                              if (daysLeft >= 3) return 'text-green-600 hover:text-green-900'
                              if (daysLeft >= 1) return 'text-yellow-600 hover:text-yellow-900'
                              return 'text-indigo-600 hover:text-indigo-900'
                            }

                            const getBadgeColor = () => {
                              if (!editControl.canEdit) return 'bg-red-100 text-red-800'
                              if (daysLeft >= 3) return 'bg-green-100 text-green-800'
                              if (daysLeft >= 1) return 'bg-yellow-100 text-yellow-800'
                              return 'bg-indigo-100 text-indigo-800'
                            }

                            return (
                              <div className="inline-flex flex-col items-center" title={editControl.tooltip}>
                                <button
                                  onClick={() => editControl.canEdit && handleEdit(warranty)}
                                  disabled={!editControl.canEdit}
                                  className={`${getButtonColor()} transition-colors`}
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium mt-1 whitespace-nowrap ${getBadgeColor()}`}>
                                  {editControl.canEdit ? `${daysLeft}วัน` : editControl.reason}
                                </span>
                              </div>
                            )
                          })()}
                          {/* Approve Edit Button (HeadOffice only) */}
                          {session?.user.userGroup === 'HeadOffice' && warranty.isEdited && !warranty.editApproved && (
                            <button
                              onClick={() => {
                                setSelectedWarranty(warranty)
                                setShowApprovalModal(true)
                              }}
                              className="text-orange-600 hover:text-orange-900"
                              title="อนุมัติการแก้ไข"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
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
                {/* หมายเลขใบรับประกัน - Auto Generated */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">หมายเลขใบรับประกัน</label>
                  <input
                    type="text"
                    value={formData.warrantyNumber}
                    readOnly
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-blue-50 font-bold text-blue-900 cursor-not-allowed"
                    placeholder="สร้างอัตโนมัติ"
                  />
                  <p className="mt-1 text-xs text-gray-500">*ระบบจะสร้างหมายเลขให้อัตโนมัติ</p>
                </div>

                {/* รหัสผู้ผลิต (manufacturerNumber) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">รหัสผู้ผลิต</label>
                  <input
                    type="text"
                    value={formData.manufacturerNumber}
                    readOnly
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 font-semibold cursor-not-allowed"
                    placeholder="หมายเลขผู้ผลิต"
                  />
                </div>

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
                  <ThaiDatePicker
                    selected={formData.warrantyDate ? new Date(formData.warrantyDate) : null}
                    onChange={(date) => {
                      if (date) {
                        setFormData({ ...formData, warrantyDate: format(date, 'yyyy-MM-dd') })
                      } else {
                        setFormData({ ...formData, warrantyDate: '' })
                      }
                    }}
                    placeholderText="เลือกวันที่ออกใบรับประกัน"
                    className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

                {/* ฟิลด์ใหม่ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">ชื่อผู้จำหน่าย</label>
                  <input
                    type="text"
                    value={formData.dealerName}
                    readOnly
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 cursor-not-allowed"
                    placeholder="ดึงจากข้อมูลผู้ใช้"
                  />
                </div>

                {/* ฟิลด์ผู้ขายรายย่อย (เฉพาะ Dealer) */}
                {session?.user.userGroup === 'Dealer' && subDealers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      ชื่อผู้ขายรายย่อย (ถ้ามี)
                    </label>
                    <select
                      value={formData.subDealerId}
                      onChange={(e) => setFormData({ ...formData, subDealerId: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">ไม่ระบุ (ขายโดยตัวแทนจำหน่ายเอง)</option>
                      {subDealers.map((subDealer) => (
                        <option key={subDealer.id} value={subDealer.id}>
                          {subDealer.name}
                          {subDealer.phoneNumber ? ` - ${subDealer.phoneNumber}` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      เลือกผู้ขายรายย่อยที่ขายสินค้าให้กับลูกค้า (สามารถเว้นว่างได้)
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">เลขที่ใบสั่งซื้อ</label>
                  <input
                    type="text"
                    value={formData.purchaseOrderNo}
                    onChange={(e) => setFormData({ ...formData, purchaseOrderNo: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="ไม่บังคับ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">วันที่ผลิต</label>
                  <ThaiDatePicker
                    selected={formData.productionDate ? new Date(formData.productionDate) : null}
                    onChange={(date) => {
                      if (date) {
                        setFormData({ ...formData, productionDate: format(date, 'yyyy-MM-dd') })
                      } else {
                        setFormData({ ...formData, productionDate: '' })
                      }
                    }}
                    placeholderText="เลือกวันที่ผลิต"
                    className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">วันที่ส่งมอบ</label>
                  <ThaiDatePicker
                    selected={formData.deliveryDate ? new Date(formData.deliveryDate) : null}
                    onChange={(date) => {
                      if (date) {
                        setFormData({ ...formData, deliveryDate: format(date, 'yyyy-MM-dd') })
                      } else {
                        setFormData({ ...formData, deliveryDate: '' })
                      }
                    }}
                    placeholderText="เลือกวันที่ส่งมอบ"
                    className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">พื้นที่ติดตั้งฉนวน (ตารางเมตร)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.installationArea}
                    onChange={(e) => setFormData({ ...formData, installationArea: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="ไม่บังคับ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">ความหนา (มิลลิเมตร)</label>
                  <input
                    type="text"
                    value={formData.thickness ? `${formData.thickness} มม.` : 'ไม่ระบุ'}
                    readOnly
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">*ดึงจากข้อมูลสินค้า</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">หมายเลข Batch สารเคมี</label>
                  <input
                    type="text"
                    value={formData.chemicalBatchNo}
                    readOnly
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 cursor-not-allowed"
                    placeholder="ดึงจากตารางวัตถุดิบอัตโนมัติ"
                  />
                  <p className="mt-1 text-xs text-gray-500">*ดึงจาก Batch Number ของวัตถุดิบที่ใช้อัตโนมัติ</p>
                </div>

                {/* Material Usage Table - แสดงเมื่อมีการคำนวณวัตถุดิบ */}
                {calculatedMaterials.length > 0 && formData.installationArea && (
                  <div className="md:col-span-2">
                    <MaterialUsageTable
                      materialUsage={calculatedMaterials}
                      installationArea={parseFloat(formData.installationArea)}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">สถานที่ติดตั้ง</label>
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
                  value={formData.warrantyTerms || 'ไม่ระบุเงื่อนไข'}
                  readOnly
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 cursor-not-allowed"
                  rows={4}
                />
                <p className="mt-1 text-xs text-gray-500">*ดึงจากข้อมูลสินค้า ไม่สามารถแก้ไขได้</p>
              </div>

              <div className="pt-4">
                {/* แสดงข้อความเตือนเมื่อสต็อกไม่พอ */}
                {calculatedMaterials.length > 0 && !calculatedMaterials.every(m => m.isStockSufficient) && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-start">
                      <svg className="h-5 w-5 text-red-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-red-800">
                          ไม่สามารถออกใบรับประกันได้
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          วัตถุดิบบางรายการมีสต็อกไม่เพียงพอ กรุณาตรวจสอบสต็อกในตารางด้านบนหรือลดพื้นที่ติดตั้ง
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
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
                    disabled={loading || (calculatedMaterials.length > 0 && !calculatedMaterials.every(m => m.isStockSufficient))}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-900 hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'กำลังบันทึก...' : (editingWarranty ? 'บันทึก' : 'ออกใบรับประกัน')}
                  </button>
                </div>
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

              {/* Material Usage Info */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">ข้อมูลวัตถุดิบที่ใช้</h4>
                {selectedWarranty.materialUsage ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-md text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            วัตถุดิบ
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            ประเภท
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Batch Number
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            ต่อ 1 ตร.ม.
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            ปริมาณที่ใช้
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            สต็อกขณะทำรายการ
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(() => {
                          try {
                            const materials = JSON.parse(selectedWarranty.materialUsage)
                            return materials.map((material: any, index: number) => {
                              // รองรับทั้งรูปแบบเก่า (currentStock) และใหม่ (totalAvailableStock)
                              const stockValue = material.totalAvailableStock ?? material.currentStock ?? 0

                              // ถ้ามี batches (Multi-Batch FIFO) แสดงแต่ละ batch แยก
                              if (material.batches && material.batches.length > 0) {
                                return material.batches.map((batch: any, batchIndex: number) => (
                                  <tr key={`${index}-${batchIndex}`} className="hover:bg-gray-50">
                                    {batchIndex === 0 && (
                                      <>
                                        <td className="px-3 py-2" rowSpan={material.batches.length}>
                                          <div>
                                            <p className="text-sm font-medium text-gray-900">
                                              {material.materialName}
                                            </p>
                                            <p className="text-xs text-gray-500">{material.materialCode}</p>
                                          </div>
                                        </td>
                                        <td className="px-3 py-2" rowSpan={material.batches.length}>
                                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {material.materialType}
                                          </span>
                                        </td>
                                      </>
                                    )}
                                    <td className="px-3 py-2">
                                      <span className="inline-flex px-2 py-1 text-xs font-mono bg-gray-100 text-gray-700 rounded">
                                        {batch.batchNumber}
                                      </span>
                                    </td>
                                    {batchIndex === 0 && (
                                      <td className="px-3 py-2 text-right text-sm text-gray-900" rowSpan={material.batches.length}>
                                        {material.quantityPerUnit.toFixed(3)} {material.unit}
                                      </td>
                                    )}
                                    <td className="px-3 py-2 text-right">
                                      <span className="text-sm font-semibold text-gray-900">
                                        {batch.quantityUsed.toFixed(3)} {material.unit}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <span className="text-sm font-medium text-gray-600">
                                        {batch.batchStock?.toFixed(3) ?? '0.000'} {material.unit}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              } else {
                                // รูปแบบเก่า (Single Batch)
                                return (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-3 py-2">
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">
                                          {material.materialName}
                                        </p>
                                        <p className="text-xs text-gray-500">{material.materialCode}</p>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                        {material.materialType}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className="inline-flex px-2 py-1 text-xs font-mono bg-gray-100 text-gray-700 rounded">
                                        {material.batchNumber || 'N/A'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right text-sm text-gray-900">
                                      {material.quantityPerUnit.toFixed(3)} {material.unit}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <span className="text-sm font-semibold text-gray-900">
                                        {material.totalQuantity.toFixed(3)} {material.unit}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <span className="text-sm font-medium text-gray-600">
                                        {stockValue.toFixed(3)} {material.unit}
                                      </span>
                                    </td>
                                  </tr>
                                )
                              }
                            }).flat()
                          } catch (error) {
                            console.error('Error parsing materialUsage:', error)
                            return (
                              <tr>
                                <td colSpan={6} className="px-3 py-4 text-center text-sm text-red-600">
                                  ไม่สามารถแสดงข้อมูลวัตถุดิบได้
                                </td>
                              </tr>
                            )
                          }
                        })()}
                      </tbody>
                    </table>
                    {selectedWarranty.installationArea && (
                      <p className="mt-2 text-xs text-gray-500">
                        💡 พื้นที่ติดตั้ง: {selectedWarranty.installationArea} ตารางเมตร
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-500">ไม่มีข้อมูลวัตถุดิบที่ใช้</p>
                  </div>
                )}
              </div>

              {/* Dealer Info */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">ตัวแทนจำหน่าย</h4>
                <div className="bg-gray-50 p-4 rounded-md space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">ตัวแทนจำหน่ายหลัก</label>
                    <p className="font-medium">{selectedWarranty.dealer.dealerName}</p>
                    <p className="text-sm text-gray-600">รหัส: {selectedWarranty.dealer.dealerCode}</p>
                  </div>

                  {/* แสดงผู้ขายรายย่อย (ถ้ามี) */}
                  {selectedWarranty.subDealer && (
                    <div className="border-t pt-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">ผู้ขายรายย่อย</label>
                      <p className="font-medium text-blue-700">{selectedWarranty.subDealer.name}</p>
                      {selectedWarranty.subDealer.phoneNumber && (
                        <p className="text-sm text-gray-600">เบอร์โทร: {selectedWarranty.subDealer.phoneNumber}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => handlePrintWarranty(selectedWarranty.id)}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-2 inline" />
                  พิมพ์ใบรับประกัน
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      <ApprovalModal
        warranty={selectedWarranty}
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onApprove={handleApproveEdit}
        onReject={handleRejectEdit}
      />
    </DashboardLayout>
  )
}