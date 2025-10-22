'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    lineId: '',
    dealerId: ''
  })
  const [loading, setLoading] = useState(false)
  const [dealersLoading, setDealersLoading] = useState(true)
  const [error, setError] = useState('')
  const [dealers, setDealers] = useState([])
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  // ดึงข้อมูล dealers เมื่อโหลดหน้า
  useEffect(() => {
    fetchDealers()
  }, [])

  const fetchDealers = async () => {
    try {
      setDealersLoading(true)
      const res = await fetch('/api/dealers/public')
      const data = await res.json()
      if (res.ok) {
        setDealers(data.dealers || [])
      } else {
        console.error('Error fetching dealers:', data.error)
        setError('ไม่สามารถโหลดข้อมูลตัวแทนจำหน่ายได้')
      }
    } catch (error) {
      console.error('Error fetching dealers:', error)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
    } finally {
      setDealersLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          email: formData.email,
          lineId: formData.lineId,
          dealerId: formData.dealerId,
          userGroup: 'Dealer', // กำหนดให้เป็น Dealer โดยอัตโนมัติ
          role: 'Dealer Staff'
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.message || 'เกิดข้อผิดพลาดในการลงทะเบียน')
      } else {
        // ลงทะเบียนสำเร็จ
        router.push('/login?message=ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ')
      }
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-lg shadow-xl border-2 border-navy-900 p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 relative">
              <Image
                src="/tas-logo.svg"
                alt="TAS Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-navy-900 mb-2">
              ระบบรับประกันคุณภาพผลิตภัณฑ์
            </h1>
            <p className="text-gray-600">ลงทะเบียนเพื่อเข้าใช้งานระบบ</p>
          </div>

          {/* Registration Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  ชื่อผู้ใช้ <span className="text-red-500">*</span>
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className={cn(
                    "mt-1 appearance-none relative block w-full px-3 py-2",
                    "border-2 border-navy-900 placeholder-gray-500 text-gray-900",
                    "rounded-md focus:outline-none focus:ring-navy-500 focus:border-navy-500",
                    "focus:z-10 sm:text-sm"
                  )}
                  placeholder="กรอกชื่อผู้ใช้"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    ชื่อ <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className={cn(
                      "mt-1 appearance-none relative block w-full px-3 py-2",
                      "border-2 border-navy-900 placeholder-gray-500 text-gray-900",
                      "rounded-md focus:outline-none focus:ring-navy-500 focus:border-navy-500",
                      "focus:z-10 sm:text-sm"
                    )}
                    placeholder="ชื่อ"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    นามสกุล <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className={cn(
                      "mt-1 appearance-none relative block w-full px-3 py-2",
                      "border-2 border-navy-900 placeholder-gray-500 text-gray-900",
                      "rounded-md focus:outline-none focus:ring-navy-500 focus:border-navy-500",
                      "focus:z-10 sm:text-sm"
                    )}
                    placeholder="นามสกุล"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                  เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className={cn(
                    "mt-1 appearance-none relative block w-full px-3 py-2",
                    "border-2 border-navy-900 placeholder-gray-500 text-gray-900",
                    "rounded-md focus:outline-none focus:ring-navy-500 focus:border-navy-500",
                    "focus:z-10 sm:text-sm"
                  )}
                  placeholder="0x-xxxx-xxxx"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    อีเมล
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={cn(
                      "mt-1 appearance-none relative block w-full px-3 py-2",
                      "border-2 border-navy-900 placeholder-gray-500 text-gray-900",
                      "rounded-md focus:outline-none focus:ring-navy-500 focus:border-navy-500",
                      "focus:z-10 sm:text-sm"
                    )}
                    placeholder="example@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="lineId" className="block text-sm font-medium text-gray-700">
                    LINE ID
                  </label>
                  <input
                    id="lineId"
                    name="lineId"
                    type="text"
                    value={formData.lineId}
                    onChange={handleChange}
                    className={cn(
                      "mt-1 appearance-none relative block w-full px-3 py-2",
                      "border-2 border-navy-900 placeholder-gray-500 text-gray-900",
                      "rounded-md focus:outline-none focus:ring-navy-500 focus:border-navy-500",
                      "focus:z-10 sm:text-sm"
                    )}
                    placeholder="@lineid หรือ userid"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  รหัสผ่าน <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={cn(
                      "mt-1 appearance-none relative block w-full px-3 py-2 pr-10",
                      "border-2 border-navy-900 placeholder-gray-500 text-gray-900",
                      "rounded-md focus:outline-none focus:ring-navy-500 focus:border-navy-500",
                      "focus:z-10 sm:text-sm"
                    )}
                    placeholder="กรอกรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 mt-0.5 p-1 rounded-full border border-gray-300 hover:border-gray-400 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={cn(
                      "mt-1 appearance-none relative block w-full px-3 py-2 pr-10",
                      "border-2 border-navy-900 placeholder-gray-500 text-gray-900",
                      "rounded-md focus:outline-none focus:ring-navy-500 focus:border-navy-500",
                      "focus:z-10 sm:text-sm"
                    )}
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 mt-0.5 p-1 rounded-full border border-gray-300 hover:border-gray-400 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="dealerId" className="block text-sm font-medium text-gray-700">
                  ตัวแทนจำหน่ายต้นสังกัด <span className="text-red-500">*</span>
                </label>
                <select
                  id="dealerId"
                  name="dealerId"
                  required
                  value={formData.dealerId}
                  onChange={handleChange}
                  disabled={dealersLoading}
                  className={cn(
                    "mt-1 appearance-none relative block w-full px-3 py-2",
                    "border-2 border-navy-900 placeholder-gray-500 text-gray-900",
                    "rounded-md focus:outline-none focus:ring-navy-500 focus:border-navy-500",
                    "focus:z-10 sm:text-sm",
                    dealersLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <option value="">
                    {dealersLoading ? 'กำลังโหลดข้อมูลตัวแทนจำหน่าย...' : 'เลือกตัวแทนจำหน่ายต้นสังกัด'}
                  </option>
                  {!dealersLoading && dealers.map((dealer: any) => (
                    <option key={dealer.id} value={dealer.id}>
                      {dealer.dealerName} ({dealer.dealerCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "group relative w-full flex justify-center py-2 px-4 border-2 border-navy-900",
                  "text-sm font-medium rounded-md text-white bg-navy-900",
                  "hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
              </button>
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              มีบัญชีอยู่แล้ว?{' '}
              <Link href="/login" className="font-medium text-navy-900 hover:text-navy-800">
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}