'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  FileImage,
  Upload,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  FileCheck
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface Template {
  filename: string
  size: number
  createdAt: string
  modifiedAt: string
  url: string
}

export default function TemplatesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }

    // เฉพาะ HeadOffice เท่านั้น
    if (session.user.userGroup !== 'HeadOffice') {
      router.push('/dashboard')
      return
    }

    fetchTemplates()
  }, [session, status, router])

  // Cleanup message timeout on unmount
  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current)
      }
    }
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates', {
        cache: 'no-store'
      })
      const data = await response.json()
      if (response.ok) {
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      showMessage('error', 'เกิดข้อผิดพลาดในการดึงข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    // Clear existing timeout
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current)
    }

    setMessage({ type, text })

    // Set new timeout and store reference
    messageTimeoutRef.current = setTimeout(() => {
      setMessage(null)
      messageTimeoutRef.current = null
    }, 5000)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ตรวจสอบชนิดไฟล์
    if (!file.type.startsWith('image/jpeg') && !file.type.startsWith('image/jpg')) {
      showMessage('error', 'กรุณาเลือกไฟล์ JPG/JPEG เท่านั้น')
      return
    }

    // ตรวจสอบขนาดไฟล์
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'ไฟล์มีขนาดใหญ่เกิน 5MB')
      return
    }

    // ตรวจสอบชื่อไฟล์
    if (!file.name.startsWith('Certification-Form')) {
      showMessage('error', 'ชื่อไฟล์ต้องขึ้นต้นด้วย "Certification-Form"')
      return
    }

    setSelectedFile(file)

    // สร้าง preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/templates', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        // รอให้ fetch templates เสร็จก่อน
        await fetchTemplates()

        // จากนั้นค่อย update state อื่นๆ พร้อมกัน
        setSelectedFile(null)
        setPreviewUrl(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }

        // แสดงข้อความสำเร็จหลังจาก update state เสร็จแล้ว
        showMessage('success', `อัพโหลดสำเร็จ: ${data.filename}`)
      } else {
        showMessage('error', data.error || 'เกิดข้อผิดพลาดในการอัพโหลด')
      }
    } catch (error) {
      console.error('Error uploading template:', error)
      showMessage('error', 'เกิดข้อผิดพลาดในการอัพโหลด')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (filename: string) => {
    if (filename === 'Certification-Form.jpg') {
      showMessage('error', 'ไม่สามารถลบ template มาตรฐานได้')
      return
    }

    if (!confirm(`ต้องการลบ "${filename}" หรือไม่?\n\n⚠️ หากมีสินค้าที่ใช้ template นี้อยู่ อาจทำให้ออกใบรับประกันไม่ได้`)) return

    try {
      const response = await fetch(`/api/templates/${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        showMessage('success', `ลบสำเร็จ: ${filename}`)
        fetchTemplates()
      } else {
        showMessage('error', data.error || 'เกิดข้อผิดพลาดในการลบ')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      showMessage('error', 'เกิดข้อผิดพลาดในการลบ')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

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
          {/* Header */}
          <div className="flex items-center mb-6">
            <FileImage className="h-6 w-6 text-navy-900 mr-3" />
            <h1 className="text-2xl font-bold text-navy-900">จัดการเทมเพลทใบรับประกัน</h1>
          </div>

          {/* Message Alert */}
          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center">
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                )}
                <span className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                  {message.text}
                </span>
              </div>
            </div>
          )}

          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              อัพโหลดเทมเพลทใหม่
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เลือกไฟล์ Template (JPG/JPEG)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,image/jpeg"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-navy-50 file:text-navy-700
                    hover:file:bg-navy-100
                    cursor-pointer"
                />
                <p className="mt-2 text-xs text-gray-500">
                  💡 <strong>คำแนะนำ:</strong> ชื่อไฟล์ต้องขึ้นต้นด้วย "Certification-Form" (เช่น Certification-Form-A.jpg)
                  <br/>
                  📏 ขนาดไฟล์ไม่เกิน 5MB | 📐 ตำแหน่งข้อมูลต้องเหมือน template มาตรฐาน
                </p>
              </div>

              {selectedFile && previewUrl && (
                <div className="border border-gray-300 rounded-md p-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-32 h-auto border border-gray-200 rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">ขนาด: {formatFileSize(selectedFile.size)}</p>
                      <div className="mt-3 flex space-x-3">
                        <button
                          onClick={handleUpload}
                          disabled={uploading}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-navy-900 hover:bg-navy-800 disabled:opacity-50"
                        >
                          {uploading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              กำลังอัพโหลด...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              อัพโหลด
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedFile(null)
                            setPreviewUrl(null)
                            if (fileInputRef.current) {
                              fileInputRef.current.value = ''
                            }
                          }}
                          disabled={uploading}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Templates List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileCheck className="h-5 w-5 mr-2" />
              เทมเพลททั้งหมด ({templates.length})
            </h2>

            {templates.length === 0 ? (
              <div className="text-center py-12">
                <FileImage className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">ไม่พบ Template</h3>
                <p className="mt-1 text-sm text-gray-500">อัพโหลด template ใหม่เพื่อเริ่มต้นใช้งาน</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                  <div
                    key={`${template.filename}-${template.createdAt}`}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-[3/4] bg-gray-100 rounded-md mb-3 overflow-hidden">
                      <img
                        src={template.url}
                        alt={template.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900 truncate" title={template.filename}>
                        {template.filename}
                      </h3>

                      <div className="text-xs text-gray-500 space-y-1">
                        <p>📦 ขนาด: {formatFileSize(template.size)}</p>
                        <p>📅 เพิ่มเมื่อ: {new Date(template.createdAt).toLocaleDateString('th-TH')}</p>
                      </div>

                      {template.filename === 'Certification-Form.jpg' && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                          ⭐ มาตรฐาน
                        </span>
                      )}

                      <div className="flex space-x-2 pt-2">
                        <a
                          href={template.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          ดู
                        </a>
                        {template.filename !== 'Certification-Form.jpg' && (
                          <button
                            onClick={() => handleDelete(template.filename)}
                            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            ลบ
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
