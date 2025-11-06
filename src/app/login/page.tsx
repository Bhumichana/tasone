'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

// Component สำหรับดึง success message จาก URL
function SuccessMessageHandler({ setSuccessMessage }: { setSuccessMessage: (msg: string) => void }) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const message = searchParams.get('message')
    if (message) {
      setSuccessMessage(message)
    }
  }, [searchParams, setSuccessMessage])

  return null
}

function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // ตรวจสอบก่อนว่า user มีอยู่และ active หรือไม่
      const checkResponse = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })

      const checkData = await checkResponse.json()

      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        // ถ้า login ไม่สำเร็จ แต่ user มีอยู่ แสดงว่าอาจเป็นเพราะไม่ active หรือ password ผิด
        if (checkData.exists && !checkData.isActive) {
          setError('บัญชีของคุณยังไม่ได้รับการอนุมัติ กรุณารอการอนุมัติจากผู้ดูแลระบบ')
        } else {
          setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
        }
      } else {
        const session = await getSession()
        if (session) {
          router.push('/dashboard')
        }
      }
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={null}>
        <SuccessMessageHandler setSuccessMessage={setSuccessMessage} />
      </Suspense>
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-lg shadow-2xl border-2 border-blue-900 p-8 mx-auto">
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
            <h1 className="text-3xl font-bold text-blue-900 mb-2">
              ระบบรับประกันคุณภาพผลิตภัณฑ์
            </h1>
            <p className="text-gray-600">กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>
          </div>

          {/* Login Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                {successMessage}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  ชื่อผู้ใช้
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={cn(
                    "mt-1 appearance-none relative block w-full px-3 py-2",
                    "border-2 border-blue-900 placeholder-gray-500 text-gray-900",
                    "rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500",
                    "focus:z-10 sm:text-sm"
                  )}
                  placeholder="กรอกชื่อผู้ใช้"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(
                      "mt-1 appearance-none relative block w-full px-3 py-2 pr-10",
                      "border-2 border-blue-900 placeholder-gray-500 text-gray-900",
                      "rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500",
                      "focus:z-10 sm:text-sm"
                    )}
                    placeholder="กรอกรหัสผ่าน"
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
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "group relative w-full flex justify-center py-2 px-4 border-2 border-blue-900",
                  "text-sm font-medium rounded-md text-white bg-blue-900",
                  "hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
            </div>
          </form>

          {/* Registration Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ยังไม่มีบัญชี?{' '}
              <Link href="/register" className="font-medium text-blue-900 hover:text-blue-800">
                ลงทะเบียนที่นี่
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
export default LoginForm
