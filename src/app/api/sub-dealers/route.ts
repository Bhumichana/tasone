import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/sub-dealers - ดึงรายชื่อ Sub-dealers
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ถ้าเป็น Dealer ให้แสดงเฉพาะ sub-dealers ของตัวเอง
    // ถ้าเป็น HeadOffice ให้แสดงทั้งหมด
    const where =
      session.user.userGroup === 'Dealer' && session.user.dealerId
        ? { dealerId: session.user.dealerId }
        : {}

    const subDealers = await prisma.subDealer.findMany({
      where,
      include: {
        dealer: {
          select: {
            id: true,
            dealerCode: true,
            dealerName: true
          }
        },
        _count: {
          select: {
            warranties: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ subDealers })
  } catch (error) {
    console.error('Error fetching sub-dealers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/sub-dealers - สร้าง Sub-dealer ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // ต้อง login และเป็น Dealer เท่านั้น (HeadOffice ไม่สามารถสร้าง sub-dealer ได้)
    if (!session || session.user.userGroup !== 'Dealer') {
      return NextResponse.json(
        { error: 'Unauthorized - Dealer access required' },
        { status: 403 }
      )
    }

    // ตรวจสอบว่ามี dealerId หรือไม่
    if (!session.user.dealerId) {
      return NextResponse.json(
        { error: 'Dealer ID not found in session' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, address, phoneNumber, email } = body

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Sub-dealer name is required' },
        { status: 400 }
      )
    }

    // สร้าง Sub-dealer ใหม่
    const newSubDealer = await prisma.subDealer.create({
      data: {
        name: name.trim(),
        address: address?.trim() || null,
        phoneNumber: phoneNumber?.trim() || null,
        email: email?.trim() || null,
        dealerId: session.user.dealerId
      },
      include: {
        dealer: {
          select: {
            id: true,
            dealerCode: true,
            dealerName: true
          }
        }
      }
    })

    return NextResponse.json(
      {
        message: 'Sub-dealer created successfully',
        subDealer: newSubDealer
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating sub-dealer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
