'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/date-picker'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  BarChart,
  AlertTriangle,
  Package,
  TrendingDown,
  Download,
  RefreshCw
} from 'lucide-react'

interface MaterialUsageReport {
  material: {
    id: string
    materialCode: string
    materialName: string
    materialType: string
    unit: string
    supplier?: string
  }
  totalUsed: number
  usageCount: number
}

interface StockLevelReport {
  id: string
  materialCode: string
  materialName: string
  materialType: string
  unit: string
  currentStock: number
  stockStatus: 'NORMAL' | 'LOW' | 'OUT_OF_STOCK'
  usageCount: number
  stockValue: number
  dealer?: {
    dealerName: string
    dealerCode: string
  }
}

export default function ReportsPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [materialUsageReport, setMaterialUsageReport] = useState<MaterialUsageReport[]>([])
  const [stockLevelReport, setStockLevelReport] = useState<StockLevelReport[]>([])
  const [stockSummary, setStockSummary] = useState<any>(null)

  // Active Tab State
  const [activeTab, setActiveTab] = useState<'material-usage' | 'stock-levels'>('material-usage')

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedDealer, setSelectedDealer] = useState('all')
  const [lowStockThreshold, setLowStockThreshold] = useState('10')
  const [materialUsageType, setMaterialUsageType] = useState('สรุปการใช้งาน')
  const [stockReportType, setStockReportType] = useState('current')

  const [dealers, setDealers] = useState([])

  // โหลดรายการ dealers (สำหรับ HeadOffice)
  useEffect(() => {
    const loadDealers = async () => {
      if (session?.user.userGroup === 'HeadOffice') {
        try {
          const response = await fetch('/api/dealers')
          if (response.ok) {
            const data = await response.json()
            setDealers(data.dealers)
          }
        } catch (error) {
          console.error('Error loading dealers:', error)
        }
      }
    }
    loadDealers()
  }, [session])

  // โหลดรายงานการใช้วัตถุดิบ
  const loadMaterialUsageReport = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (selectedDealer && selectedDealer !== 'all') params.append('dealerId', selectedDealer)
      params.append('type', materialUsageType)

      const response = await fetch(`/api/reports/material-usage?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMaterialUsageReport(data.data)
      }
    } catch (error) {
      console.error('Error loading material usage report:', error)
    } finally {
      setLoading(false)
    }
  }

  // โหลดรายงานสต็อกคงเหลือ
  const loadStockLevelReport = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      if (selectedDealer && selectedDealer !== 'all') params.append('dealerId', selectedDealer)
      if (lowStockThreshold) params.append('lowStockThreshold', lowStockThreshold)
      params.append('type', stockReportType)

      const response = await fetch(`/api/reports/stock-levels?${params}`)
      if (response.ok) {
        const data = await response.json()
        setStockLevelReport(data.data)
        if (data.summary) {
          setStockSummary(data.summary)
        }
      }
    } catch (error) {
      console.error('Error loading stock level report:', error)
    } finally {
      setLoading(false)
    }
  }

  // โหลดรายงานครั้งแรก
  useEffect(() => {
    loadMaterialUsageReport()
    loadStockLevelReport()
  }, [])

  const getStockStatusBadge = (status: string, currentStock: number) => {
    switch (status) {
      case 'OUT_OF_STOCK':
        return <Badge variant="destructive">หมดสต็อก</Badge>
      case 'LOW':
        return <Badge variant="secondary">สต็อกต่ำ</Badge>
      default:
        return <Badge variant="default">ปกติ</Badge>
    }
  }

  // Export to PDF using browser print
  const handleExportPDF = () => {
    window.print()
  }

  return (
    <DashboardLayout>
      <style jsx global>{`
        @media print {
          /* ซ่อน Sidebar และ Navigation */
          aside, nav, .print\\:hidden {
            display: none !important;
          }

          /* ซ่อน Toggle buttons เมื่อพิมพ์ */
          .grid.grid-cols-2.gap-0.mb-6 {
            display: none !important;
          }

          /* จัด layout ให้เต็มหน้า */
          body {
            margin: 0;
            padding: 0;
          }

          .container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
          }

          /* ปรับขนาดตาราง */
          table {
            width: 100% !important;
            font-size: 10pt !important;
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
          }

          /* ซ่อนปุ่มและ filter */
          .flex.gap-2.mb-6 {
            display: none !important;
          }

          .grid.gap-4.mb-6 {
            display: none !important;
          }

          /* แสดงหัวเรื่อง */
          h1 {
            font-size: 18pt !important;
            margin-bottom: 10px !important;
          }

          /* Card Styling */
          .overflow-x-auto {
            overflow: visible !important;
          }

          /* Summary Cards */
          .grid.grid-cols-1.md\\:grid-cols-4 {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 10px !important;
            margin-bottom: 20px !important;
            page-break-inside: avoid;
          }

          /* Badge colors for print */
          .bg-red-100 {
            background-color: #fee2e2 !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .bg-yellow-100 {
            background-color: #fef3c7 !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .bg-blue-100 {
            background-color: #dbeafe !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">รายงานระบบ</h1>
            <p className="text-gray-600">รายงานการใช้วัตถุดิบและสต็อกคงเหลือ</p>
          </div>
        </div>

        {/* Toggle Buttons */}
      <div className="grid grid-cols-2 gap-0 mb-6 border-2 border-blue-600 rounded-lg overflow-hidden">
        <button
          onClick={() => setActiveTab('material-usage')}
          className={`p-4 flex items-center justify-center gap-2 font-medium transition-all ${
            activeTab === 'material-usage'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <BarChart className="h-4 w-4" />
          รายงานการใช้วัตถุดิบ
        </button>
        <button
          onClick={() => setActiveTab('stock-levels')}
          className={`p-4 flex items-center justify-center gap-2 font-medium transition-all ${
            activeTab === 'stock-levels'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Package className="h-4 w-4" />
          รายงานสต็อกคงเหลือ
        </button>
      </div>

      {/* รายงานการใช้วัตถุดิบ */}
      {activeTab === 'material-usage' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              รายงานการใช้วัตถุดิบ
            </CardTitle>
            <CardDescription>
              ติดตามการใช้วัตถุดิบในระบบการผลิต
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <Label htmlFor="startDate">วันที่เริ่มต้น</Label>
                <DatePicker
                  value={startDate}
                  onChange={(date) => setStartDate(date)}
                  placeholder="เลือกวันที่เริ่มต้น"
                />
              </div>
              <div>
                <Label htmlFor="endDate">วันที่สิ้นสุด</Label>
                <DatePicker
                  value={endDate}
                  onChange={(date) => setEndDate(date)}
                  placeholder="เลือกวันที่สิ้นสุด"
                />
              </div>
              <div>
                <Label htmlFor="reportType">ประเภทรายงาน</Label>
                <Select value={materialUsageType} onValueChange={setMaterialUsageType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="สรุปการใช้งาน">สรุปการใช้งาน</SelectItem>
                    <SelectItem value="แยกตามสินค้า">แยกตามสินค้า</SelectItem>
                    <SelectItem value="รายละเอียด">รายละเอียด</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              <Button onClick={loadMaterialUsageReport} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                อัปเดตรายงาน
              </Button>
              <Button variant="outline" onClick={handleExportPDF} className="print:hidden">
                <Download className="h-4 w-4 mr-2" />
                ส่งออก PDF
              </Button>
            </div>

            {/* รายงาน */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-3 text-left">รหัสวัตถุดิบ</th>
                    <th className="border border-gray-300 p-3 text-left">ชื่อวัตถุดิบ</th>
                    <th className="border border-gray-300 p-3 text-left">ประเภท</th>
                    <th className="border border-gray-300 p-3 text-right">จำนวนใช้ทั้งหมด</th>
                    <th className="border border-gray-300 p-3 text-center">ครั้งที่ใช้</th>
                    <th className="border border-gray-300 p-3 text-left">หน่วย</th>
                  </tr>
                </thead>
                <tbody>
                  {materialUsageReport.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-3 font-mono">
                        {item.material.materialCode}
                      </td>
                      <td className="border border-gray-300 p-3">
                        {item.material.materialName}
                      </td>
                      <td className="border border-gray-300 p-3">
                        <Badge variant="outline">{item.material.materialType}</Badge>
                      </td>
                      <td className="border border-gray-300 p-3 text-right font-semibold">
                        {item.totalUsed.toLocaleString()}
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        {item.usageCount}
                      </td>
                      <td className="border border-gray-300 p-3">
                        {item.material.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {materialUsageReport.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  ไม่พบข้อมูลการใช้วัตถุดิบในช่วงเวลาที่เลือก
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* รายงานสต็อกคงเหลือ */}
      {activeTab === 'stock-levels' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              รายงานสต็อกคงเหลือ
            </CardTitle>
            <CardDescription>
              ติดตามระดับสต็อกและแจ้งเตือนสต็อกต่ำ
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Summary Cards */}
            {stockSummary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <Package className="h-8 w-8 text-blue-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">จำนวนรายการ</p>
                        <p className="text-2xl font-bold">{stockSummary.totalMaterials}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <AlertTriangle className="h-8 w-8 text-yellow-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">สต็อกต่ำ</p>
                        <p className="text-2xl font-bold text-yellow-600">{stockSummary.lowStockCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <TrendingDown className="h-8 w-8 text-red-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">หมดสต็อก</p>
                        <p className="text-2xl font-bold text-red-600">{stockSummary.outOfStockCount}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <BarChart className="h-8 w-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">มูลค่าสต็อก</p>
                        <p className="text-2xl font-bold text-green-600">
                          ฿{stockSummary.totalStockValue?.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <Label htmlFor="stockReportType">ประเภทรายงาน</Label>
                <Select value={stockReportType} onValueChange={setStockReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">สต็อกปัจจุบัน</SelectItem>
                    <SelectItem value="low-stock">สต็อกต่ำ</SelectItem>
                    <SelectItem value="no-movement">ไม่มีการเคลื่อนไหว</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="threshold">เกณฑ์สต็อกต่ำ</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  placeholder="10"
                />
              </div>
              {session?.user.userGroup === 'HeadOffice' && (
                <div>
                  <Label htmlFor="stockDealer">ตัวแทนจำหน่าย</Label>
                  <Select value={selectedDealer} onValueChange={setSelectedDealer}>
                    <SelectTrigger>
                      <SelectValue placeholder="ทั้งหมด" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      {dealers.map((dealer: any) => (
                        <SelectItem key={dealer.id} value={dealer.id}>
                          {dealer.dealerName} ({dealer.dealerCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex gap-2 mb-6">
              <Button onClick={loadStockLevelReport} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                อัปเดตรายงาน
              </Button>
              <Button variant="outline" onClick={handleExportPDF} className="print:hidden">
                <Download className="h-4 w-4 mr-2" />
                ส่งออก PDF
              </Button>
            </div>

            {/* รายงาน */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-3 text-left">รหัสวัตถุดิบ</th>
                    <th className="border border-gray-300 p-3 text-left">ชื่อวัตถุดิบ</th>
                    <th className="border border-gray-300 p-3 text-left">ประเภท</th>
                    <th className="border border-gray-300 p-3 text-right">สต็อกคงเหลือ</th>
                    <th className="border border-gray-300 p-3 text-center">สถานะ</th>
                    <th className="border border-gray-300 p-3 text-left">หน่วย</th>
                    {session?.user.userGroup === 'HeadOffice' && (
                      <th className="border border-gray-300 p-3 text-left">ตัวแทน</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {stockLevelReport.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-3 font-mono">
                        {item.materialCode}
                      </td>
                      <td className="border border-gray-300 p-3">
                        {item.materialName}
                      </td>
                      <td className="border border-gray-300 p-3">
                        <Badge variant="outline">{item.materialType}</Badge>
                      </td>
                      <td className="border border-gray-300 p-3 text-right font-semibold">
                        {item.currentStock.toLocaleString()}
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        {getStockStatusBadge(item.stockStatus, item.currentStock)}
                      </td>
                      <td className="border border-gray-300 p-3">
                        {item.unit}
                      </td>
                      {session?.user.userGroup === 'HeadOffice' && (
                        <td className="border border-gray-300 p-3">
                          {item.dealer?.dealerName} ({item.dealer?.dealerCode})
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {stockLevelReport.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  ไม่พบข้อมูลสต็อกตามเงื่อนไขที่เลือก
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </DashboardLayout>
  )
}