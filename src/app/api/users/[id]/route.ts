import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import * as bcrypt from 'bcryptjs'

// GET /api/users/[id] - ดึงข้อมูลผู้ใช้คนเดียว
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized - HeadOffice access required' },
        { status: 403 }
      )
    }

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

    // ไม่ส่ง password กลับไป
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id] - แก้ไขข้อมูลผู้ใช้
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized - HeadOffice access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      username,
      password,
      userGroup,
      role,
      firstName,
      lastName,
      phoneNumber,
      email,
      lineId,
      dealerId,
      profileImage
    } = body

    // ตรวจสอบว่าผู้ใช้มีอยู่หรือไม่
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบว่า username ซ้ำหรือไม่ (ยกเว้นผู้ใช้ปัจจุบัน)
    if (username !== existingUser.username) {
      const duplicateUser = await prisma.user.findUnique({
        where: { username }
      })

      if (duplicateUser) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        )
      }
    }

    // เตรียมข้อมูลสำหรับอัพเดท
    const updateData: any = {
      username,
      userGroup,
      role,
      firstName,
      lastName,
      phoneNumber,
      email: email || null,
      lineId: lineId || null,
      dealerId: userGroup === 'Dealer' ? dealerId : null
    }

    // อัพเดท profileImage หากมีการส่งมา
    if (profileImage !== undefined) {
      updateData.profileImage = profileImage
    }

    // หากมีการเปลี่ยนรหัสผ่าน
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10)
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
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
    const { password: _, ...userWithoutPassword } = updatedUser

    return NextResponse.json({
      message: 'User updated successfully',
      user: userWithoutPassword
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - ลบผู้ใช้
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized - HeadOffice access required' },
        { status: 403 }
      )
    }

    // ตรวจสอบว่าผู้ใช้มีอยู่หรือไม่
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // ไม่ให้ลบตัวเอง
    if (existingUser.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'User deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}