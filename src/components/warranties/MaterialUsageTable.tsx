'use client'

import { AlertTriangle, CheckCircle, Package, Layers } from 'lucide-react'
import { MaterialUsageItem } from '@/lib/recipe-calculator'

interface MaterialUsageTableProps {
  materialUsage: MaterialUsageItem[]
  installationArea: number
}

export default function MaterialUsageTable({
  materialUsage,
  installationArea
}: MaterialUsageTableProps) {
  if (!materialUsage || materialUsage.length === 0) {
    return null
  }

  const hasInsufficientStock = materialUsage.some(item => !item.isStockSufficient)

  return (
    <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-blue-900 flex items-center">
          <Package className="h-4 w-4 mr-2" />
          ประมาณการวัตถุดิบที่ใช้ (พื้นที่: {installationArea} ตร.ม.) - Multi-Batch FIFO
        </h4>
        {hasInsufficientStock && (
          <span className="text-xs text-red-600 font-semibold flex items-center">
            <AlertTriangle className="h-3 w-3 mr-1" />
            สต็อกไม่เพียงพอ
          </span>
        )}
      </div>

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
                Batch Allocation (FIFO)
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                ต่อ 1 ตร.ม.
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                ปริมาณรวม
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                สต็อกรวม
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                สถานะ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {materialUsage.map((item, index) => (
              <tr key={item.rawMaterialId} className={`hover:bg-gray-50 ${
                !item.isStockSufficient ? 'bg-red-50' : ''
              }`}>
                <td className="px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.materialName}
                    </p>
                    <p className="text-xs text-gray-500">{item.materialCode}</p>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {item.materialType}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {/* แสดงรายการ batch allocation แบบ FIFO */}
                  {item.batches && item.batches.length > 0 ? (
                    <div className="space-y-1">
                      {item.batches.map((batch, batchIndex) => (
                        <div key={batchIndex} className="flex items-center gap-2 text-xs">
                          <Layers className="h-3 w-3 text-blue-500 shrink-0" />
                          <span className="font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                            {batch.batchNumber}
                          </span>
                          <span className="text-gray-600">
                            → {batch.quantityUsed.toFixed(2)} {item.unit}
                          </span>
                          <span className="text-xs text-gray-400">
                            (มี {batch.batchStock.toFixed(2)})
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-sm text-gray-900">
                  {item.quantityPerUnit.toFixed(3)} {item.unit}
                </td>
                <td className="px-3 py-2 text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {item.totalQuantity.toFixed(2)} {item.unit}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <span className={`text-sm font-medium ${
                    item.isStockSufficient ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.totalAvailableStock.toFixed(2)} {item.unit}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  {item.isStockSufficient ? (
                    <CheckCircle className="h-5 w-5 text-green-600 inline" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600 inline" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasInsufficientStock && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-xs text-red-700">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            <strong>คำเตือน:</strong> วัตถุดิบบางรายการมีสต็อกไม่เพียงพอสำหรับการติดตั้ง
            กรุณาตรวจสอบสต็อกก่อนออกใบรับประกัน
          </p>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500">
        💡 <strong>หมายเหตุ:</strong> ข้อมูลนี้เป็นการประมาณการวัตถุดิบที่จะใช้ตามสูตร BOM
        และจะถูกบันทึกไว้ในใบรับประกันเมื่อกดบันทึก
      </p>
    </div>
  )
}
