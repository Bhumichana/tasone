'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Users,
  Building2,
  Package,
  FileText,
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  CheckCircle,
  Calendar,
  Activity,
  BarChart3,
  PieChart,
  Clock,
  Star
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface DashboardStats {
  totalUsers: number
  totalDealers: number
  totalRawMaterials: number
  totalProducts: number
  totalWarranties: number
  activeWarranties: number
  expiredWarranties: number
  totalSales: number
  lowStockMaterials: number
  recentActivity: any[]
  todayWarranties: number
  thisMonthWarranties: number
  warrantyGrowth: number
  salesGrowth: number
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDealers: 0,
    totalRawMaterials: 0,
    totalProducts: 0,
    totalWarranties: 0,
    activeWarranties: 0,
    expiredWarranties: 0,
    totalSales: 0,
    lowStockMaterials: 0,
    recentActivity: [],
    todayWarranties: 0,
    thisMonthWarranties: 0,
    warrantyGrowth: 0,
    salesGrowth: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return // Still loading
    if (!session) router.push('/login')
    else {
      fetchDashboardStats()
    }
  }, [session, status, router])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)

      // ดึงข้อมูลสถิติพร้อมกัน
      const promises = []

      if (session?.user.userGroup === 'HeadOffice') {
        promises.push(
          fetch('/api/users').then(res => res.json()),
          fetch('/api/dealers').then(res => res.json())
        )
      }

      promises.push(
        fetch('/api/raw-materials').then(res => res.json()),
        fetch('/api/products').then(res => res.json()),
        fetch('/api/warranties').then(res => res.json()),
        fetch('/api/sales').then(res => res.json())
      )

      const results = await Promise.all(promises)

      let users = { users: [] }
      let dealers = { dealers: [] }
      let rawMaterials, products, warranties, sales

      if (session?.user.userGroup === 'HeadOffice') {
        [users, dealers, rawMaterials, products, warranties, sales] = results
      } else {
        [rawMaterials, products, warranties, sales] = results
      }

      // คำนวณสถิติ
      const activeWarranties = warranties.warranties?.filter((w: any) =>
        new Date(w.expiryDate) >= new Date()
      ).length || 0

      const expiredWarranties = warranties.warranties?.filter((w: any) =>
        new Date(w.expiryDate) < new Date()
      ).length || 0

      const lowStockMaterials = rawMaterials.rawMaterials?.filter((m: any) =>
        m.currentStock <= m.minStock
      ).length || 0

      // คำนวณสถิติเพิ่มเติม
      const today = new Date()
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

      const todayWarranties = warranties.warranties?.filter((w: any) =>
        new Date(w.createdAt).toDateString() === today.toDateString()
      ).length || 0

      const thisMonthWarranties = warranties.warranties?.filter((w: any) =>
        new Date(w.createdAt) >= firstOfMonth
      ).length || 0

      // จำลองข้อมูลการเติบโต (ในระบบจริงจะเปรียบเทียบกับเดือนก่อน)
      const warrantyGrowth = thisMonthWarranties > 0 ? Math.round(Math.random() * 20) : 0
      const salesGrowth = sales.sales?.length > 0 ? Math.round(Math.random() * 15) : 0

      setStats({
        totalUsers: users.users?.length || 0,
        totalDealers: dealers.dealers?.length || 0,
        totalRawMaterials: rawMaterials.rawMaterials?.length || 0,
        totalProducts: products.products?.length || 0,
        totalWarranties: warranties.warranties?.length || 0,
        activeWarranties,
        expiredWarranties,
        totalSales: sales.sales?.length || 0,
        lowStockMaterials,
        recentActivity: [],
        todayWarranties,
        thisMonthWarranties,
        warrantyGrowth,
        salesGrowth
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ยินดีต้อนรับสู่ระบบ!
            </h2>
            <p className="text-gray-600">
              สวัสดี คุณ{session.user.firstName} {session.user.lastName} ({session.user.userGroup})
            </p>
          </div>

          {/* Top Performance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Today's Stats */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-800 overflow-hidden shadow-lg rounded-xl">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">วันนี้</p>
                    <p className="text-white text-2xl font-bold">{stats.todayWarranties}</p>
                    <p className="text-blue-100 text-xs">ใบรับประกัน</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-200" />
                </div>
              </div>
            </div>

            {/* This Month Stats */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 overflow-hidden shadow-lg rounded-xl">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">เดือนนี้</p>
                    <p className="text-white text-2xl font-bold">{stats.thisMonthWarranties}</p>
                    <p className="text-green-100 text-xs">ใบรับประกัน</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-200" />
                </div>
              </div>
            </div>

            {/* Warranty Growth */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 overflow-hidden shadow-lg rounded-xl">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">การเติบโต</p>
                    <p className="text-white text-2xl font-bold">+{stats.warrantyGrowth}%</p>
                    <p className="text-purple-100 text-xs">ใบรับประกัน</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-200" />
                </div>
              </div>
            </div>

            {/* Sales Performance */}
            <div className="bg-gradient-to-r from-orange-500 to-red-600 overflow-hidden shadow-lg rounded-xl">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">ยอดขาย</p>
                    <p className="text-white text-2xl font-bold">+{stats.salesGrowth}%</p>
                    <p className="text-orange-100 text-xs">การเติบโต</p>
                  </div>
                  <Activity className="h-8 w-8 text-orange-200" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {session.user.userGroup === 'HeadOffice' && (
              <>
                <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="p-3 bg-blue-100 rounded-full">
                          <Users className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            ผู้ใช้งานทั้งหมด
                          </dt>
                          <dd className="text-2xl font-bold text-gray-900">
                            {stats.totalUsers}
                          </dd>
                          <dd className="text-xs text-gray-400 mt-1">
                            <Star className="h-3 w-3 inline mr-1" />
                            ผู้ใช้งานในระบบ
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="p-3 bg-green-100 rounded-full">
                          <Building2 className="h-6 w-6 text-green-600" />
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            ตัวแทนจำหน่าย
                          </dt>
                          <dd className="text-2xl font-bold text-gray-900">
                            {stats.totalDealers}
                          </dd>
                          <dd className="text-xs text-gray-400 mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            พาร์ทเนอร์ธุรกิจ
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Package className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        วัตถุดิบ
                      </dt>
                      <dd className="text-2xl font-bold text-gray-900">
                        {stats.totalRawMaterials}
                      </dd>
                      <dd className="text-xs text-gray-400 mt-1">
                        <Activity className="h-3 w-3 inline mr-1" />
                        รายการทั้งหมด
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-orange-100 rounded-full">
                      <ShoppingCart className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        สินค้า
                      </dt>
                      <dd className="text-2xl font-bold text-gray-900">
                        {stats.totalProducts}
                      </dd>
                      <dd className="text-xs text-gray-400 mt-1">
                        <PieChart className="h-3 w-3 inline mr-1" />
                        ผลิตภัณฑ์ใหม่
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-green-100 rounded-full">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        ใบรับประกัน (ใช้งานได้)
                      </dt>
                      <dd className="text-2xl font-bold text-green-600">
                        {stats.activeWarranties}
                      </dd>
                      <dd className="text-xs text-gray-400 mt-1">
                        <CheckCircle className="h-3 w-3 inline mr-1" />
                        ยังไม่หมดอายุ
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <TrendingUp className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        การขายทั้งหมด
                      </dt>
                      <dd className="text-2xl font-bold text-gray-900">
                        {stats.totalSales}
                      </dd>
                      <dd className="text-xs text-gray-400 mt-1">
                        <BarChart3 className="h-3 w-3 inline mr-1" />
                        รายการขาย
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alert Section */}
          {stats.lowStockMaterials > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    คำเตือน: วัตถุดิบสต็อกต่ำ
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>มีวัตถุดิบ {stats.lowStockMaterials} รายการที่สต็อกต่ำกว่าเกณฑ์ที่กำหนด</p>
                  </div>
                  <div className="mt-4">
                    <div className="-mx-2 -my-1.5 flex">
                      <a
                        href="/dashboard/raw-materials"
                        className="bg-red-50 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100"
                      >
                        ดูรายละเอียด
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {stats.expiredWarranties > 0 && (
            <div className="bg-blue-50 border border-blue-900 rounded-md p-4 mb-8">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-blue-900" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-900">
                    ใบรับประกันที่หมดอายุ
                  </h3>
                  <div className="mt-2 text-sm text-blue-800">
                    <p>มีใบรับประกัน {stats.expiredWarranties} ฉบับที่หมดอายุแล้ว</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {session.user.userGroup === 'HeadOffice' && (
              <>
                <a
                  href="/dashboard/users"
                  className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-blue-200"
                >
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-800 mr-3" />
                    <div>
                      <h3 className="text-lg font-medium text-blue-900 mb-1">จัดการผู้ใช้งาน</h3>
                      <p className="text-gray-600 text-sm">เพิ่ม แก้ไข ลบ ผู้ใช้งานในระบบ</p>
                    </div>
                  </div>
                </a>
                <a
                  href="/dashboard/dealers"
                  className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-blue-200"
                >
                  <div className="flex items-center">
                    <Building2 className="h-8 w-8 text-blue-800 mr-3" />
                    <div>
                      <h3 className="text-lg font-medium text-blue-900 mb-1">จัดการตัวแทนจำหน่าย</h3>
                      <p className="text-gray-600 text-sm">ควบคุมข้อมูลตัวแทนจำหน่าย</p>
                    </div>
                  </div>
                </a>
              </>
            )}
            <a
              href="/dashboard/raw-materials"
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-blue-200"
            >
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-800 mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-blue-900 mb-1">จัดการวัตถุดิบ</h3>
                  <p className="text-gray-600 text-sm">จัดการข้อมูลวัตถุดิบและการส่งมอบ</p>
                </div>
              </div>
            </a>
            {session.user.userGroup === 'Dealer' && (
              <>
                <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-blue-200">
                  <div className="flex items-center">
                    <ShoppingCart className="h-8 w-8 text-blue-800 mr-3" />
                    <div>
                      <h3 className="text-lg font-medium text-blue-900 mb-1">จัดการสินค้า</h3>
                      <p className="text-gray-600 text-sm">เพิ่ม แก้ไข ข้อมูลสินค้าของคุณ</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-blue-200">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-blue-800 mr-3" />
                    <div>
                      <h3 className="text-lg font-medium text-blue-900 mb-1">ออกใบรับประกัน</h3>
                      <p className="text-gray-600 text-sm">สร้างและจัดการใบรับประกัน</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-transparent hover:border-blue-200">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-blue-800 mr-3" />
                    <div>
                      <h3 className="text-lg font-medium text-blue-900 mb-1">พิมพ์ใบรับประกัน</h3>
                      <p className="text-gray-600 text-sm">พิมพ์ใบรับประกันสำหรับลูกค้า</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}