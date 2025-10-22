import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, firstName, lastName, phoneNumber, dealerId, userGroup, role } = body

    // Validation
    if (!username || !password || !firstName || !lastName || !phoneNumber || !dealerId) {
      return NextResponse.json(
        { message: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่า username ซ้ำหรือไม่
    const existingUser = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่า dealer มีอยู่จริงหรือไม่
    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId }
    })

    if (!dealer) {
      return NextResponse.json(
        { message: 'ไม่พบข้อมูลตัวแทนจำหน่ายที่เลือก' },
        { status: 400 }
      )
    }

    // เข้ารหัสรหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, 12)

    // สร้าง user ใหม่
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        firstName,
        lastName,
        phoneNumber,
        dealerId,
        userGroup: 'Dealer', // กำหนดให้เป็น Dealer โดยอัตโนมัติ
        role: role || 'Dealer Staff',
        isActive: false // ต้องรอ Admin อนุมัติก่อนจึงจะใช้งานได้
      }
    })

    // ส่งข้อมูลกลับ (ไม่รวมรหัสผ่าน)
    const { password: _, ...userWithoutPassword } = newUser

    return NextResponse.json({
      message: 'ลงทะเบียนสำเร็จ กรุณารอการอนุมัติจากผู้ดูแลระบบก่อนเข้าใช้งาน',
      user: userWithoutPassword
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    )
  }
}