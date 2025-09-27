'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
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
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-lg shadow-2xl border-2 border-blue-900 p-8 mx-auto">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-blue-900 mb-2">
              ระบบรับประกันคุณภาพผลิตภัณฑ์
            </h1>
            <p className="text-gray-600">กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>
          </div>

          {/* Login Form */}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "mt-1 appearance-none relative block w-full px-3 py-2",
                    "border-2 border-blue-900 placeholder-gray-500 text-gray-900",
                    "rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500",
                    "focus:z-10 sm:text-sm"
                  )}
                  placeholder="กรอกรหัสผ่าน"
                />
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

          {/* Demo Credentials */}
          <div className="mt-4 p-4 bg-white border-2 border-blue-900 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">บัญชีทดสอบ:</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <div><strong>Admin:</strong> admin / admin123</div>
              <div><strong>Dealer:</strong> dealer1 / dealer123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}