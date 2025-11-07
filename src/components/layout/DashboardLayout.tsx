'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Users,
  Building2,
  Package,
  FileText,
  Home,
  ShoppingCart,
  Menu,
  X,
  LogOut,
  User,
  Settings,
  Truck,
  Send,
  PackageOpen,
  Archive,
  BarChart,
  Store,
  FileImage,
  AlertTriangle,
  Warehouse
} from 'lucide-react'
import NotificationBell from './NotificationBell'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true)

  const navigation = [
    { name: 'หน้าหลัก', href: '/dashboard', icon: Home, current: pathname === '/dashboard' },
    ...(session?.user.userGroup === 'HeadOffice' ? [
      { name: 'จัดการผู้ใช้งาน', href: '/dashboard/users', icon: Users, current: pathname === '/dashboard/users' },
      { name: 'จัดการตัวแทนจำหน่าย', href: '/dashboard/dealers', icon: Building2, current: pathname === '/dashboard/dealers' },
      { name: 'รหัสวัตถุดิบ (Raw Materials Code)', href: '/dashboard/raw-materials', icon: Package, current: pathname === '/dashboard/raw-materials' },
      { name: 'การรับเข้าวัตถุดิบ', href: '/dashboard/raw-material-receiving', icon: Truck, current: pathname === '/dashboard/raw-material-receiving' },
      { name: 'คลังสต็อกวัตถุดิบ', href: '/dashboard/warehouse-stock', icon: Warehouse, current: pathname === '/dashboard/warehouse-stock' },
      { name: 'การส่งมอบวัตถุดิบ', href: '/dashboard/material-deliveries', icon: Send, current: pathname === '/dashboard/material-deliveries' },
      { name: 'จัดการวัตถุดิบหมดอายุ', href: '/dashboard/expired-materials', icon: AlertTriangle, current: pathname === '/dashboard/expired-materials' },
      { name: 'จัดการเทมเพลท', href: '/dashboard/templates', icon: FileImage, current: pathname === '/dashboard/templates' },
    ] : [
      // Dealer-only menus
      { name: 'การรับเข้าวัตถุดิบ', href: '/dashboard/incoming-materials', icon: PackageOpen, current: pathname === '/dashboard/incoming-materials' },
      { name: 'คลังสต็อกวัตถุดิบ', href: '/dashboard/stock', icon: Archive, current: pathname === '/dashboard/stock' },
      { name: 'ผู้ขายรายย่อย', href: '/dashboard/sub-dealers', icon: Store, current: pathname === '/dashboard/sub-dealers' },
    ]),
    { name: 'สินค้า(BOM)', href: '/dashboard/products', icon: ShoppingCart, current: pathname === '/dashboard/products' },
    { name: 'จัดการใบรับประกัน', href: '/dashboard/warranties', icon: FileText, current: pathname === '/dashboard/warranties' },
    { name: 'รายงานวัตถุดิบ', href: '/dashboard/reports', icon: BarChart, current: pathname === '/dashboard/reports' },
    { name: 'โปรไฟล์', href: '/dashboard/profile', icon: Settings, current: pathname === '/dashboard/profile' },
  ]

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`relative z-50 lg:hidden ${isSidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsSidebarOpen(false)} />

        <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-blue-900 px-6 pb-2">
            {/* Logo and Header Section */}
            <div className="flex flex-col items-center py-6">
              <div className="relative w-18 h-18 mb-5">
                <Image
                  src="/tas-sidebar-logo.svg"
                  alt="TAT Logo"
                  width={72}
                  height={72}
                  priority
                  className="sidebar-logo rounded-lg"
                />
              </div>
              <h1 className="text-lg font-semibold text-white text-center leading-tight px-2">
                Product Warranty System
              </h1>
              <button
                type="button"
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">
                <li>
                  <ul role="list" className="-mx-2 space-y-1">
                    {navigation.map((item) => (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                            item.current
                              ? 'bg-blue-800 text-white'
                              : 'text-white hover:text-blue-100 hover:bg-blue-800'
                          }`}
                          onClick={() => setIsSidebarOpen(false)}
                        >
                          <item.icon className="h-6 w-6 shrink-0" />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
                <li className="-mx-6 mt-auto">
                  <div className="flex items-center gap-x-4 px-6 py-3 text-sm font-semibold leading-6 text-gray-300">
                    {session.user.avatarUrl ? (
                      <div className="relative h-8 w-8 rounded-full overflow-hidden bg-blue-800">
                        <Image
                          src={session.user.avatarUrl}
                          alt="User Avatar"
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <User className="h-8 w-8 rounded-full bg-blue-800 p-1" />
                    )}
                    <span className="sr-only">Your profile</span>
                    <div className="flex-1">
                      <span className="text-white">{session.user.firstName} {session.user.lastName}</span>
                      <p className="text-xs text-gray-400">{session.user.userGroup}</p>
                    </div>
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="text-gray-400 hover:text-white"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className={`hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ease-in-out ${
        isDesktopSidebarOpen ? 'lg:w-72' : 'lg:w-16'
      }`}>
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-blue-900 px-6">
          {/* Logo and Header Section - Desktop */}
          <div className="flex flex-col items-center py-8">
            <div className="relative w-20 h-20 mb-6">
              <Image
                src="/tas-sidebar-logo.svg"
                alt="TAT Logo"
                width={80}
                height={80}
                priority
                className="sidebar-logo rounded-lg"
              />
            </div>
            {isDesktopSidebarOpen && (
              <h1 className="text-xl font-semibold text-white text-center leading-tight px-4 transition-opacity duration-300">
                Product Warranty System
              </h1>
            )}
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold relative ${
                          item.current
                            ? 'bg-blue-800 text-white'
                            : 'text-white hover:text-blue-100 hover:bg-blue-800'
                        }`}
                        title={!isDesktopSidebarOpen ? item.name : ''}
                      >
                        <item.icon className="h-6 w-6 shrink-0" />
                        {isDesktopSidebarOpen && (
                          <span className="transition-opacity duration-300">{item.name}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="-mx-6 mt-auto">
                <div className="flex items-center gap-x-4 px-6 py-3 text-sm font-semibold leading-6 text-gray-300">
                  {session.user.avatarUrl ? (
                    <div className="relative h-8 w-8 rounded-full overflow-hidden bg-blue-800 shrink-0">
                      <Image
                        src={session.user.avatarUrl}
                        alt="User Avatar"
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <User className="h-8 w-8 rounded-full bg-blue-800 p-1 shrink-0" />
                  )}
                  <span className="sr-only">Your profile</span>
                  {isDesktopSidebarOpen && (
                    <div className="flex-1 transition-opacity duration-300">
                      <span className="text-white">{session.user.firstName} {session.user.lastName}</span>
                      <p className="text-xs text-gray-400">{session.user.userGroup}</p>
                    </div>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="text-gray-400 hover:text-white"
                    title="ออกจากระบบ"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ease-in-out ${
        isDesktopSidebarOpen ? 'lg:pl-72' : 'lg:pl-16'
      }`}>
        {/* Top navigation for mobile */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" />
          </button>

          {/* Desktop sidebar toggle */}
          <button
            type="button"
            className="hidden lg:block -m-2.5 p-2.5 text-gray-700 hover:text-gray-900"
            onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
            title={isDesktopSidebarOpen ? 'ซ่อน Sidebar' : 'แสดง Sidebar'}
          >
            <span className="sr-only">Toggle sidebar</span>
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Notification Bell */}
              <NotificationBell />

              {/* User menu for desktop */}
              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />
              <div className="hidden lg:flex lg:items-center lg:gap-x-3">
                <span className="text-sm font-semibold leading-6 text-gray-900">
                  {session.user.firstName} {session.user.lastName}
                </span>
                <span className="text-xs text-gray-500">({session.user.userGroup})</span>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="text-gray-400 hover:text-gray-500"
                  title="ออกจากระบบ"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 min-h-screen bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}