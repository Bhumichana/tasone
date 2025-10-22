import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST /api/users/[id]/approve - อนุมัติผู้ใช้ให้สามารถเข้าใช้งานได้
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    // ตรวจสอบสิทธิ์ - เฉพาะ HeadOffice เท่านั้น
    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized - HeadOffice access required' },
        { status: 403 }
      )
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่หรือไม่
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        dealer: {
          select: {
            dealerName: true,
            dealerCode: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // อนุมัติผู้ใช้
    const approvedUser = await prisma.user.update({
      where: { id },
      data: {
        isActive: true
      },
      include: {
        dealer: {
          select: {
            dealerName: true,
            dealerCode: true
          }
        }
      }
    })

    // ไม่ส่ง password กลับไป
    const { password: _, ...userWithoutPassword } = approvedUser

    return NextResponse.json({
      message: 'User approved successfully',
      user: userWithoutPassword
    })
  } catch (error) {
    console.error('Error approving user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id]/approve - ปิดการใช้งานผู้ใช้
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    // ตรวจสอบสิทธิ์ - เฉพาะ HeadOffice เท่านั้น
    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized - HeadOffice access required' },
        { status: 403 }
      )
    }

    // ไม่ให้ปิดการใช้งานตัวเอง
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่หรือไม่
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // ปิดการใช้งานผู้ใช้
    const deactivatedUser = await prisma.user.update({
      where: { id },
      data: {
        isActive: false
      },
      include: {
        dealer: {
          select: {
            dealerName: true,
            dealerCode: true
          }
        }
      }
    })

    // ไม่ส่ง password กลับไป
    const { password: _, ...userWithoutPassword } = deactivatedUser

    return NextResponse.json({
      message: 'User deactivated successfully',
      user: userWithoutPassword
    })
  } catch (error) {
    console.error('Error deactivating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
