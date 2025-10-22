import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/dealers - ดึงรายชื่อผู้แทนจำหน่ายทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const dealers = await prisma.dealer.findMany({
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        _count: {
          select: {
            users: true,
            warranties: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ dealers })
  } catch (error) {
    console.error('Error fetching dealers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/dealers - สร้างผู้แทนจำหน่ายใหม่
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
      dealerCode,
      manufacturerNumber,
      dealerName,
      type,
      region,
      address,
      phoneNumber,
      startDate,
      endDate
    } = body

    // ตรวจสอบว่า dealerCode ซ้ำหรือไม่
    const existingDealer = await prisma.dealer.findUnique({
      where: { dealerCode }
    })

    if (existingDealer) {
      return NextResponse.json(
        { error: 'Dealer code already exists' },
        { status: 400 }
      )
    }

    // สร้างผู้แทนจำหน่ายใหม่
    const newDealer = await prisma.dealer.create({
      data: {
        dealerCode,
        manufacturerNumber,
        dealerName,
        type: type || 'ตัวแทนจำหน่าย',
        region,
        address,
        phoneNumber,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null
      },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        _count: {
          select: {
            users: true,
            warranties: true
          }
        }
      }
    })

    return NextResponse.json(
      {
        message: 'Dealer created successfully',
        dealer: newDealer
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating dealer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}