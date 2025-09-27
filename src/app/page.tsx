'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loadingTimeout, setLoadingTimeout] = useState(false)

  useEffect(() => {
    console.log('Session status:', status, 'Session data:', session)

    if (status === 'loading') return // Still loading

    if (session) {
      console.log('Redirecting to dashboard')
      router.push('/dashboard')
    } else {
      console.log('Redirecting to login')
      router.push('/login')
    }
  }, [session, status, router])

  // Set timeout for loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (status === 'loading') {
        console.log('Loading timeout reached, forcing redirect to login')
        setLoadingTimeout(true)
        router.push('/login')
      }
    }, 3000) // 3 seconds timeout

    return () => clearTimeout(timer)
  }, [status, router])

  if (loadingTimeout) {
    return null // Don't render anything if timeout
  }

  // Loading screen
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        <p className="mt-2 text-xs text-gray-500">Status: {status}</p>
      </div>
    </div>
  )
}
