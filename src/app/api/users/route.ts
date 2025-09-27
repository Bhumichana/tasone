import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

// GET /api/users - ดึงรายชื่อผู้ใช้ทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized - HeadOffice access required' },
        { status: 403 }
      )
    }

    const users = await prisma.user.findMany({
      include: {
        dealer: {
          select: {
            dealerName: true,
            dealerCode: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // ไม่ส่ง password กลับไป
    const sanitizedUsers = users.map(user => ({
      ...user,
      password: undefined
    }))

    return NextResponse.json({ users: sanitizedUsers })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/users - สร้างผู้ใช้ใหม่
export async function POST(request: NextRequest) {
  try {
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
      dealerId,
      profileImage
    } = body

    // ตรวจสอบว่า username ซ้ำหรือไม่
    const existingUser = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      )
    }

    // เข้ารหัสรหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, 10)

    // สร้างผู้ใช้ใหม่
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        userGroup,
        role,
        firstName,
        lastName,
        phoneNumber,
        dealerId: userGroup === 'Dealer' ? dealerId : null,
        profileImage: profileImage || null
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
    const { password: _, ...userWithoutPassword } = newUser

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: userWithoutPassword
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}