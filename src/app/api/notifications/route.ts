import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/notifications - ดึงรายการแจ้งเตือนสำหรับ HeadOffice
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // ตรวจสอบว่าเป็น HeadOffice เท่านั้น
    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized - HeadOffice access required' },
        { status: 403 }
      )
    }

    // ดึง query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // PENDING, APPROVED, REJECTED
    const isRead = searchParams.get('isRead') // true, false
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // สร้าง where clause
    const where: any = {}

    if (status) {
      where.status = status
    }

    if (isRead !== null && isRead !== undefined) {
      where.isRead = isRead === 'true'
    }

    // ดึงข้อมูลการแจ้งเตือน
    const [notifications, total] = await Promise.all([
      prisma.headOfficeNotification.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.headOfficeNotification.count({ where })
    ])

    // นับจำนวนที่ยังไม่ได้อ่าน
    const unreadCount = await prisma.headOfficeNotification.count({
      where: { isRead: false }
    })

    // นับจำนวนตามสถานะ
    const pendingCount = await prisma.headOfficeNotification.count({
      where: { status: 'PENDING' }
    })

    return NextResponse.json({
      notifications,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      summary: {
        unreadCount,
        pendingCount
      }
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
