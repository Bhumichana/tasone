'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  History,
  Building2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface Dealer {
  id: string
  dealerCode: string
  dealerName: string
  region: string
  phoneNumber: string
}

interface RecertificationHistory {
  id: string
  oldExpiryDate: string
  newExpiryDate: string
  extendedDays: number
  recertifiedBy: string
  recertifiedByName: string
  reason: string | null
  note: string | null
  createdAt: string
}

interface Stock {
  id: string
  materialCode: string
  materialName: string
  materialType: string
  batchNumber: string
  currentStock: number
  unit: string
  expiryDate: string | null
  status: string
  isRecertified: boolean
  recertificationCount: number
  lastRecertifiedAt: string | null
  lastRecertifiedBy: string | null
  dealer: Dealer
  recertificationHistory?: RecertificationHistory[]
}

interface DealerStat {
  dealerId: string
  dealerCode: string
  dealerName: string
  region: string
  expiredCount: number
}

export default function ExpiredMaterialsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dealerFilter, setDealerFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [history, setHistory] = useState<RecertificationHistory[]>([])
  const [expandedDealers, setExpandedDealers] = useState<Set<string>>(new Set())
  const [summary, setSummary] = useState({
    total: 0,
    expired: 0,
    recertified: 0,
    notRecertified: 0,
    totalDealers: 0,
    dealerStats: [] as DealerStat[]
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/dashboard')
      return
    }

    // เฉพาะ HeadOffice เท่านั้น
    if (session.user.userGroup !== 'HeadOffice') {
      router.push('/dashboard')
      return
    }

    fetchStocks()
  }, [session, status, router, statusFilter, searchTerm, dealerFilter])

  const fetchStocks = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (dealerFilter !== 'all') params.append('dealer', dealerFilter)

      const url = `/api/expired-materials?${params.toString()}`
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setStocks(data.stocks)
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Error fetching expired materials:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRecertify = async () => {
    if (!selectedStock) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/expired-materials/${selectedStock.id}/recertify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason, note }),
      })

      if (response.ok) {
        alert('ต่ออายุวัตถุดิบสำเร็จ!')
        setShowModal(false)
        setReason('')
        setNote('')
        fetchStocks()
      } else {
        const error = await response.json()
        alert(error.error || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Error recertifying:', error)
      alert('เกิดข้อผิดพลาดในการต่ออายุ')
    } finally {
      setSubmitting(false)
    }
  }

  const viewHistory = async (stock: Stock) => {
    try {
      const response = await fetch(`/api/expired-materials/${stock.id}/history`)
      const data = await response.json()

      if (response.ok) {
        setHistory(data.history)
        setSelectedStock(stock)
        setShowHistoryModal(true)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    }
  }

  const toggleDealer = (dealerId: string) => {
    const newExpanded = new Set(expandedDealers)
    if (newExpanded.has(dealerId)) {
      newExpanded.delete(dealerId)
    } else {
      newExpanded.add(dealerId)
    }
    setExpandedDealers(newExpanded)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // จัดกลุ่มวัตถุดิบตามดีลเลอร์
  const groupedByDealer = stocks.reduce((acc, stock) => {
    const dealerId = stock.dealer.id
    if (!acc[dealerId]) {
      acc[dealerId] = {
        dealer: stock.dealer,
        stocks: []
      }
    }
    acc[dealerId].stocks.push(stock)
    return acc
  }, {} as Record<string, { dealer: Dealer; stocks: Stock[] }>)

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
              <AlertTriangle className="h-6 w-6 text-orange-600 mr-3" />
              <h1 className="text-2xl font-bold text-navy-900">จัดการวัตถุดิบหมดอายุ (แยกตามดีลเลอร์)</h1>
            </div>
            <button
              onClick={() => fetchStocks()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              รีเฟรช
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">หมดอายุทั้งหมด</p>
                  <p className="text-2xl font-bold text-red-600">{summary.expired}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">ต่ออายุแล้ว</p>
                  <p className="text-2xl font-bold text-green-600">{summary.recertified}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-full">
                  <XCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">ยังไม่ต่ออายุ</p>
                  <p className="text-2xl font-bold text-orange-600">{summary.notRecertified}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">รอดำเนินการ</p>
                  <p className="text-2xl font-bold text-blue-600">{summary.notRecertified}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-full">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">จำนวนดีลเลอร์</p>
                  <p className="text-2xl font-bold text-purple-600">{summary.totalDealers}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Dealer Stats */}
          {summary.dealerStats.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow border mb-6">
              <h3 className="text-lg font-semibold mb-4">สรุปตามดีลเลอร์</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {summary.dealerStats.map((stat) => (
                  <div key={stat.dealerId} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{stat.dealerName}</p>
                        <p className="text-xs text-gray-500">{stat.dealerCode}</p>
                        <p className="text-xs text-gray-500">{stat.region}</p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {stat.expiredCount} รายการ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหา Batch Number, ชื่อวัตถุดิบ, ดีลเลอร์..."
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
              <option value="all">สถานะ: ทั้งหมด</option>
              <option value="recertified">ต่ออายุแล้ว</option>
              <option value="not_recertified">ยังไม่ต่ออายุ</option>
            </select>

            <select
              value={dealerFilter}
              onChange={(e) => setDealerFilter(e.target.value)}
              className="py-2 px-3 border border-gray-300 rounded-md"
            >
              <option value="all">ดีลเลอร์: ทั้งหมด</option>
              {summary.dealerStats.map((stat) => (
                <option key={stat.dealerId} value={stat.dealerId}>
                  {stat.dealerName} ({stat.expiredCount} รายการ)
                </option>
              ))}
            </select>
          </div>

          {/* Grouped Materials by Dealer */}
          <div className="space-y-4">
            {Object.values(groupedByDealer).map(({ dealer, stocks: dealerStocks }) => {
              const isExpanded = expandedDealers.has(dealer.id)
              const notRecertifiedCount = dealerStocks.filter(s => !s.isRecertified).length

              return (
                <div key={dealer.id} className="bg-white shadow rounded-lg overflow-hidden">
                  {/* Dealer Header */}
                  <div
                    className="flex items-center justify-between p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleDealer(dealer.id)}
                  >
                    <div className="flex items-center space-x-4">
                      <Building2 className="h-5 w-5 text-gray-500" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{dealer.dealerName}</h3>
                        <p className="text-sm text-gray-500">
                          {dealer.dealerCode} • {dealer.region || 'N/A'} • {dealer.phoneNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{dealerStocks.length} รายการ</p>
                        {notRecertifiedCount > 0 && (
                          <p className="text-xs text-orange-600">{notRecertifiedCount} รอต่ออายุ</p>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                  </div>

                  {/* Materials Table */}
                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Batch Number
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              วัตถุดิบ
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              วันหมดอายุ
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              สต็อกคงเหลือ
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
                          {dealerStocks.map((stock) => (
                            <tr key={stock.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {stock.batchNumber}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {stock.materialName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {stock.materialCode}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(stock.expiryDate)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {stock.currentStock.toFixed(2)} {stock.unit}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {stock.isRecertified ? (
                                  <div>
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                      ✓ ต่ออายุแล้ว ({stock.recertificationCount} ครั้ง)
                                    </span>
                                    {stock.lastRecertifiedAt && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        ครั้งล่าสุด: {formatDate(stock.lastRecertifiedAt)}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                    ยังไม่ต่ออายุ
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                <button
                                  onClick={() => viewHistory(stock)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="ดูประวัติ"
                                >
                                  <History className="h-4 w-4 inline" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedStock(stock)
                                    setShowModal(true)
                                  }}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  ต่ออายุ 60 วัน
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}

            {Object.keys(groupedByDealer).length === 0 && (
              <div className="bg-white shadow rounded-lg p-12">
                <div className="text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">ไม่มีวัตถุดิบหมดอายุ</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'ลองเปลี่ยนคำค้นหา' : 'ทุกอย่างเป็นไปด้วยดี!'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recertification Modal */}
      {showModal && selectedStock && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              ยืนยันการต่ออายุวัตถุดิบ
            </h3>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md">
                <p className="text-sm"><span className="font-medium">ดีลเลอร์:</span> {selectedStock.dealer.dealerName}</p>
                <p className="text-sm"><span className="font-medium">วัตถุดิบ:</span> {selectedStock.materialName}</p>
                <p className="text-sm"><span className="font-medium">Batch:</span> {selectedStock.batchNumber}</p>
                <p className="text-sm"><span className="font-medium">สต็อก:</span> {selectedStock.currentStock} {selectedStock.unit}</p>
                <p className="text-sm"><span className="font-medium">วันหมดอายุเดิม:</span> {formatDate(selectedStock.expiryDate)}</p>
                <p className="text-sm font-bold text-green-600">
                  <span className="font-medium text-gray-700">วันหมดอายุใหม่:</span> {formatDate(new Date(new Date(selectedStock.expiryDate!).getTime() + 60 * 24 * 60 * 60 * 1000).toISOString())}
                </p>
                <p className="text-sm"><span className="font-medium">ต่ออายุ:</span> +60 วัน</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เหตุผล (ไม่บังคับ)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  rows={2}
                  placeholder="เช่น ผลตรวจคุณภาพผ่าน"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อวิศวกรผู้ตรวจสอบ (ไม่บังคับ)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  rows={2}
                  placeholder="ชื่อวิศวกรผู้ตรวจสอบ"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowModal(false)
                    setReason('')
                    setNote('')
                  }}
                  disabled={submitting}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleRecertify}
                  disabled={submitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'กำลังดำเนินการ...' : 'ยืนยันต่ออายุ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedStock && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                ประวัติการต่ออายุ - {selectedStock.batchNumber}
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <p className="text-sm"><span className="font-medium">ดีลเลอร์:</span> {selectedStock.dealer.dealerName}</p>
              <p className="text-sm"><span className="font-medium">วัตถุดิบ:</span> {selectedStock.materialName}</p>
              <p className="text-sm"><span className="font-medium">วันหมดอายุปัจจุบัน:</span> {formatDate(selectedStock.expiryDate)}</p>
              <p className="text-sm"><span className="font-medium">จำนวนครั้งที่ต่ออายุ:</span> {selectedStock.recertificationCount} ครั้ง</p>
            </div>

            {history.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {history.map((record, index) => (
                  <div key={record.id} className="border border-gray-200 rounded-md p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900">ครั้งที่ {history.length - index}</span>
                      <span className="text-sm text-gray-500">
                        {formatDate(record.createdAt)}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">ต่อจาก:</span> {formatDate(record.oldExpiryDate)} → {formatDate(record.newExpiryDate)}</p>
                      <p><span className="font-medium">จำนวนวัน:</span> +{record.extendedDays} วัน</p>
                      <p><span className="font-medium">โดย:</span> {record.recertifiedByName} ({record.recertifiedBy})</p>
                      {record.reason && (
                        <p><span className="font-medium">เหตุผล:</span> {record.reason}</p>
                      )}
                      {record.note && (
                        <p><span className="font-medium">หมายเหตุ:</span> {record.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                ยังไม่มีประวัติการต่ออายุ
              </div>
            )}

            <div className="flex justify-end mt-4 pt-4 border-t">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
