import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/expired-materials/[id]/history - ดูประวัติการต่ออายุของดีลเลอร์
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    // ตรวจสอบว่า login แล้ว
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    // ดึงข้อมูล DealerStock พร้อมประวัติการต่ออายุ
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
        },
        recertificationHistory: {
          orderBy: {
            createdAt: 'desc'
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

    // สรุปข้อมูล
    const summary = {
      dealerCode: stock.dealer.dealerCode,
      dealerName: stock.dealer.dealerName,
      region: stock.dealer.region,
      materialCode: stock.materialCode,
      materialName: stock.materialName,
      batchNumber: stock.batchNumber,
      currentExpiryDate: stock.expiryDate,
      currentStock: stock.currentStock,
      unit: stock.unit,
      isRecertified: stock.isRecertified,
      recertificationCount: stock.recertificationCount,
      lastRecertifiedAt: stock.lastRecertifiedAt,
      lastRecertifiedBy: stock.lastRecertifiedBy,
      status: stock.status
    }

    return NextResponse.json({
      stock: summary,
      history: stock.recertificationHistory
    })
  } catch (error) {
    console.error('Error fetching recertification history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
