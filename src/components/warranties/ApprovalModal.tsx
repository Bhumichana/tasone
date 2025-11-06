'use client'

import { useState } from 'react'
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface Warranty {
  id: string
  warrantyNumber: string
  customerName: string
  customerPhone: string
  product: {
    productName: string
    productCode: string
  }
  dealer: {
    dealerName: string
    dealerCode: string
  }
  warrantyDate: string
  editReason?: string | null
  editedAt?: string | null
  editedBy?: string | null
}

interface ApprovalModalProps {
  warranty: Warranty | null
  isOpen: boolean
  onClose: () => void
  onApprove: (warrantyId: string, approvalNote: string) => Promise<void>
  onReject: (warrantyId: string, approvalNote: string) => Promise<void>
}

export default function ApprovalModal({
  warranty,
  isOpen,
  onClose,
  onApprove,
  onReject
}: ApprovalModalProps) {
  const [approvalNote, setApprovalNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !warranty) return null

  const handleApprove = async () => {
    try {
      setIsSubmitting(true)
      await onApprove(warranty.id, approvalNote)
      setApprovalNote('')
      onClose()
    } catch (error) {
      console.error('Error approving:', error)
      alert('เกิดข้อผิดพลาดในการอนุมัติ')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!approvalNote.trim()) {
      alert('กรุณาระบุเหตุผลในการปฏิเสธ')
      return
    }

    try {
      setIsSubmitting(true)
      await onReject(warranty.id, approvalNote)
      setApprovalNote('')
      onClose()
    } catch (error) {
      console.error('Error rejecting:', error)
      alert('เกิดข้อผิดพลาดในการปฏิเสธ')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              อนุมัติการแก้ไขใบรับประกัน
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Warranty Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">ข้อมูลใบรับประกัน</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">หมายเลขใบรับประกัน</p>
                <p className="font-medium text-gray-900">{warranty.warrantyNumber}</p>
              </div>
              <div>
                <p className="text-gray-500">ชื่อลูกค้า</p>
                <p className="font-medium text-gray-900">{warranty.customerName}</p>
              </div>
              <div>
                <p className="text-gray-500">ผลิตภัณฑ์</p>
                <p className="font-medium text-gray-900">{warranty.product.productName}</p>
                <p className="text-xs text-gray-500">{warranty.product.productCode}</p>
              </div>
              <div>
                <p className="text-gray-500">ตัวแทนจำหน่าย</p>
                <p className="font-medium text-gray-900">{warranty.dealer.dealerName}</p>
                <p className="text-xs text-gray-500">{warranty.dealer.dealerCode}</p>
              </div>
            </div>
          </div>

          {/* Edit Info */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-orange-800 mb-2">ข้อมูลการแก้ไข</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-orange-700">แก้ไขโดย: <span className="font-medium">{warranty.editedBy}</span></p>
                <p className="text-orange-700">
                  วันที่แก้ไข: <span className="font-medium">
                    {warranty.editedAt ? new Date(warranty.editedAt).toLocaleString('th-TH') : '-'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-orange-700 font-medium mb-1">เหตุผลการแก้ไข:</p>
                <p className="text-orange-900 bg-white rounded p-2 border border-orange-200">
                  {warranty.editReason || 'ไม่ได้ระบุเหตุผล'}
                </p>
              </div>
            </div>
          </div>

          {/* Approval Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              หมายเหตุจาก HeadOffice (ถ้ามี)
            </label>
            <textarea
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleReject}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center gap-2"
          >
            <XCircle className="h-4 w-4" />
            ปฏิเสธ
          </button>
          <button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            อนุมัติ
          </button>
        </div>
      </div>
    </div>
  )
}
