import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/notifications/[id] - ดึงการแจ้งเตือนรายการเดียว
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    // ตรวจสอบว่าเป็น HeadOffice เท่านั้น
    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized - HeadOffice access required' },
        { status: 403 }
      )
    }

    const params = await props.params
    const notification = await prisma.headOfficeNotification.findUnique({
      where: { id: params.id }
    })

    if (!notification) {
      return NextResponse.json(
        { error: 'ไม่พบการแจ้งเตือน' },
        { status: 404 }
      )
    }

    // Parse data field to get additional info if needed
    let parsedData = null
    if (notification.data) {
      try {
        parsedData = JSON.parse(notification.data)
      } catch (e) {
        // Ignore parse errors
      }
    }

    return NextResponse.json({
      notification: {
        ...notification,
        parsedData
      }
    })
  } catch (error) {
    console.error('Error fetching notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/notifications/[id] - อัปเดตสถานะการอ่าน
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    // ตรวจสอบว่าเป็น HeadOffice เท่านั้น
    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized - HeadOffice access required' },
        { status: 403 }
      )
    }

    const params = await props.params
    const body = await request.json()
    const { isRead } = body

    // ตรวจสอบว่ามีค่า isRead
    if (typeof isRead !== 'boolean') {
      return NextResponse.json(
        { error: 'กรุณาระบุสถานะการอ่าน (isRead: true/false)' },
        { status: 400 }
      )
    }

    // อัปเดตสถานะการอ่าน
    const notification = await prisma.headOfficeNotification.update({
      where: { id: params.id },
      data: {
        isRead,
        readAt: isRead ? new Date() : null
      }
    })

    return NextResponse.json({
      message: 'อัปเดตสถานะการอ่านสำเร็จ',
      notification
    })
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications/[id] - ลบการแจ้งเตือน
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    // ตรวจสอบว่าเป็น HeadOffice เท่านั้น
    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized - HeadOffice access required' },
        { status: 403 }
      )
    }

    const params = await props.params
    await prisma.headOfficeNotification.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      message: 'ลบการแจ้งเตือนสำเร็จ'
    })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
