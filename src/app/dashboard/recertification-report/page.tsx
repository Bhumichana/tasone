'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  RefreshCw,
  Search,
  Download,
  TrendingUp,
  Package,
  Users,
  Clock,
  Building2,
  Filter,
  X,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ThaiDatePicker from '@/components/ui/ThaiDatePicker'

interface RecertificationHistory {
  id: string
  batchId: string
  batchNumber: string
  materialCode: string
  materialName: string
  materialType: string
  dealerId: string
  dealerCode: string
  dealerName: string
  dealerRegion: string
  oldExpiryDate: string
  newExpiryDate: string
  extendedDays: number
  recertifiedBy: string
  recertifiedByName: string
  reason: string | null
  note: string | null
  createdAt: string
}

interface Summary {
  totalRecertifications: number
  uniqueBatches: number
  uniqueDealers: number
  totalDaysExtended: number
  averageDaysExtended: number
}

interface Recertifier {
  recertifiedBy: string
  recertifiedByName: string
}

export default function RecertificationReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [histories, setHistories] = useState<RecertificationHistory[]>([])
  const [summary, setSummary] = useState<Summary>({
    totalRecertifications: 0,
    uniqueBatches: 0,
    uniqueDealers: 0,
    totalDaysExtended: 0,
    averageDaysExtended: 0,
  })
  const [recertifiers, setRecertifiers] = useState<Recertifier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dealerFilter, setDealerFilter] = useState('all')
  const [recertifierFilter, setRecertifierFilter] = useState('all')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Check authorization
  useEffect(() => {
    if (status === 'loading') return

    if (!session || session.user.userGroup !== 'HeadOffice') {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  // Fetch data
  useEffect(() => {
    if (session && session.user.userGroup === 'HeadOffice') {
      fetchReport()
    }
  }, [session, searchTerm, dealerFilter, recertifierFilter, startDate, endDate])

  const fetchReport = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (searchTerm) params.append('search', searchTerm)
      if (dealerFilter !== 'all') params.append('dealer', dealerFilter)
      if (recertifierFilter !== 'all') params.append('recertifiedBy', recertifierFilter)
      if (startDate) params.append('startDate', startDate.toISOString())
      if (endDate) params.append('endDate', endDate.toISOString())

      const response = await fetch(`/api/recertification-report?${params}`)
      if (response.ok) {
        const data = await response.json()
        setHistories(data.histories)
        setSummary(data.summary)
        setRecertifiers(data.recertifiers)
      }
    } catch (error) {
      console.error('Error fetching report:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const headers = [
      'วันที่ต่ออายุ',
      'Batch Number',
      'รหัสวัตถุดิบ',
      'ชื่อวัตถุดิบ',
      'ประเภท',
      'รหัสดีลเลอร์',
      'ชื่อดีลเลอร์',
      'ภูมิภาค',
      'วันหมดอายุเดิม',
      'วันหมดอายุใหม่',
      'จำนวนวันที่ต่อ',
      'ผู้ดำเนินการ',
      'เหตุผล',
      'หมายเหตุ',
    ]

    const rows = histories.map((h) => [
      formatDateTime(h.createdAt),
      h.batchNumber,
      h.materialCode,
      h.materialName,
      h.materialType,
      h.dealerCode,
      h.dealerName,
      h.dealerRegion || '-',
      formatDate(h.oldExpiryDate),
      formatDate(h.newExpiryDate),
      h.extendedDays,
      h.recertifiedByName,
      h.reason || '-',
      h.note || '-',
    ])

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `รายงานการต่ออายุวัตถุดิบ_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const clearFilters = () => {
    setSearchTerm('')
    setDealerFilter('all')
    setRecertifierFilter('all')
    setStartDate(null)
    setEndDate(null)
  }

  // Get unique dealers from histories
  const uniqueDealers = Array.from(
    new Map(histories.map((h) => [h.dealerId, h])).values()
  ).map((h) => ({
    id: h.dealerId,
    code: h.dealerCode,
    name: h.dealerName,
  }))

  if (!session) return null

  if (session.user.userGroup !== 'HeadOffice') {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-gray-600">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-7 w-7 text-blue-600" />
              รายงานการต่ออายุวัตถุดิบ
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              รายงานประวัติการต่ออายุวัตถุดิบทั้งหมดในระบบ
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={fetchReport} className="gap-2" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ครั้งทั้งหมด</CardTitle>
              <RefreshCw className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {summary.totalRecertifications}
              </div>
              <p className="text-xs text-gray-600">ครั้งที่ต่ออายุ</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Batch ที่ต่อ</CardTitle>
              <Package className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary.uniqueBatches}
              </div>
              <p className="text-xs text-gray-600">Batch</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ดีลเลอร์</CardTitle>
              <Building2 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {summary.uniqueDealers}
              </div>
              <p className="text-xs text-gray-600">ดีลเลอร์</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">รวมจำนวนวัน</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {summary.totalDaysExtended.toLocaleString()}
              </div>
              <p className="text-xs text-gray-600">วัน</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">เฉลี่ยต่อครั้ง</CardTitle>
              <Clock className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-600">
                {summary.averageDaysExtended}
              </div>
              <p className="text-xs text-gray-600">วัน/ครั้ง</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Search and Filter Toggle */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="ค้นหา Batch, วัตถุดิบ, ดีลเลอร์, ผู้ดำเนินการ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant={showFilters ? 'default' : 'outline'}
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  ฟิลเตอร์
                </Button>
                {(dealerFilter !== 'all' ||
                  recertifierFilter !== 'all' ||
                  startDate ||
                  endDate) && (
                  <Button variant="ghost" onClick={clearFilters} className="gap-2">
                    <X className="h-4 w-4" />
                    ล้าง
                  </Button>
                )}
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      ดีลเลอร์
                    </label>
                    <Select value={dealerFilter} onValueChange={setDealerFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="ทั้งหมด" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ทั้งหมด</SelectItem>
                        {uniqueDealers.map((dealer) => (
                          <SelectItem key={dealer.id} value={dealer.id}>
                            {dealer.code} - {dealer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      ผู้ดำเนินการ
                    </label>
                    <Select
                      value={recertifierFilter}
                      onValueChange={setRecertifierFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="ทั้งหมด" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ทั้งหมด</SelectItem>
                        {recertifiers.map((r) => (
                          <SelectItem key={r.recertifiedBy} value={r.recertifiedBy}>
                            {r.recertifiedByName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      วันที่เริ่มต้น
                    </label>
                    <ThaiDatePicker
                      selected={startDate}
                      onChange={(date) => setStartDate(date)}
                      placeholderText="เลือกวันที่เริ่มต้น"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      maxDate={endDate || undefined}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      วันที่สิ้นสุด
                    </label>
                    <ThaiDatePicker
                      selected={endDate}
                      onChange={(date) => setEndDate(date)}
                      placeholderText="เลือกวันที่สิ้นสุด"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      minDate={startDate || undefined}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Report Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
              </div>
            ) : histories.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">ไม่พบข้อมูลการต่ออายุ</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        วันที่ต่ออายุ
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Batch
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        วัตถุดิบ
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        ดีลเลอร์
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        วันหมดอายุ
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">
                        จำนวนวัน
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        ผู้ดำเนินการ
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        เหตุผล/หมายเหตุ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {histories.map((history) => (
                      <tr key={history.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {formatDateTime(history.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {history.batchNumber}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {history.materialName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {history.materialCode}
                          </div>
                          <Badge className="mt-1 bg-gray-100 text-gray-800 text-xs">
                            {history.materialType}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {history.dealerName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {history.dealerCode}
                          </div>
                          {history.dealerRegion && (
                            <div className="text-xs text-gray-500">
                              {history.dealerRegion}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-gray-600">
                            {formatDate(history.oldExpiryDate)}
                          </div>
                          <div className="text-xs text-gray-400">↓</div>
                          <div className="text-xs font-medium text-green-600">
                            {formatDate(history.newExpiryDate)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-blue-100 text-blue-800">
                            +{history.extendedDays} วัน
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {history.recertifiedByName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {history.recertifiedBy}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {history.reason && (
                            <div className="text-xs text-gray-900 mb-1">
                              <span className="font-medium">เหตุผล:</span>{' '}
                              {history.reason}
                            </div>
                          )}
                          {history.note && (
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">หมายเหตุ:</span>{' '}
                              {history.note}
                            </div>
                          )}
                          {!history.reason && !history.note && (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Record Count */}
        {histories.length > 0 && (
          <div className="text-sm text-gray-600 text-center">
            แสดง {histories.length} รายการ
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
