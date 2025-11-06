import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST /api/expired-materials/[id]/recertify - ต่ออายุวัตถุดิบของดีลเลอร์
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    // ตรวจสอบว่าเป็น Admin เท่านั้น
    if (!session || session.user.role !== 'Super Admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { reason, note } = body

    // ดึงข้อมูล DealerStock
    const stock = await prisma.dealerStock.findUnique({
      where: { id },
      include: {
        dealer: {
          select: {
            id: true,
            dealerCode: true,
            dealerName: true,
            region: true
          }
        }
      }
    })

    if (!stock) {
      return NextResponse.json(
        { error: 'Stock not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบว่า status เป็น EXPIRED หรือไม่
    if (stock.status !== 'EXPIRED') {
      return NextResponse.json(
        { error: 'Stock is not expired' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่ามีสต็อกหรือไม่
    if (stock.currentStock <= 0) {
      return NextResponse.json(
        { error: 'Stock quantity is zero or negative' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่ามีวันหมดอายุหรือไม่
    if (!stock.expiryDate) {
      return NextResponse.json(
        { error: 'Stock has no expiry date' },
        { status: 400 }
      )
    }

    // คำนวณวันหมดอายุใหม่ (+60 วัน)
    const oldExpiryDate = new Date(stock.expiryDate)
    const newExpiryDate = new Date(oldExpiryDate)
    newExpiryDate.setDate(newExpiryDate.getDate() + 60)

    // อัปเดต DealerStock และสร้าง History
    const updatedStock = await prisma.dealerStock.update({
      where: { id },
      data: {
        // อัปเดตวันหมดอายุและสถานะ
        expiryDate: newExpiryDate,
        status: 'AVAILABLE', // เปลี่ยนจาก EXPIRED เป็น AVAILABLE
        lastUpdated: new Date(),

        // อัปเดตข้อมูลการต่ออายุ
        isRecertified: true,
        recertificationCount: { increment: 1 },
        lastRecertifiedAt: new Date(),
        lastRecertifiedBy: session.user.username || session.user.email,

        // สร้าง History record
        recertificationHistory: {
          create: {
            oldExpiryDate: oldExpiryDate,
            newExpiryDate: newExpiryDate,
            extendedDays: 60,
            recertifiedBy: session.user.username || session.user.email || 'Unknown',
            recertifiedByName: session.user.name || session.user.username || 'Unknown',
            reason: reason || null,
            note: note || null
          }
        }
      },
      include: {
        dealer: {
          select: {
            id: true,
            dealerCode: true,
            dealerName: true,
            region: true
          }
        },
        recertificationHistory: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'ต่ออายุวัตถุดิบสำเร็จ',
      stock: updatedStock,
      recertification: {
        oldExpiryDate: oldExpiryDate.toISOString(),
        newExpiryDate: newExpiryDate.toISOString(),
        extendedDays: 60,
        recertificationCount: updatedStock.recertificationCount
      }
    })
  } catch (error) {
    console.error('Error recertifying material:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
