import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/dashboard/warranty-by-dealer - สถิติจำนวนใบรับประกันแยกตามดีลเลอร์
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // เฉพาะ HeadOffice เท่านั้นที่เข้าถึงได้
    if (session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Access denied. HeadOffice only.' },
        { status: 403 }
      )
    }

    // นับจำนวนใบรับประกันแยกตามดีลเลอร์
    const warrantyByDealer = await prisma.warranty.groupBy({
      by: ['dealerId'],
      _count: {
        _all: true
      }
    })

    // ดึงข้อมูลดีลเลอร์
    const dealerIds = warrantyByDealer.map(item => item.dealerId)
    const dealers = await prisma.dealer.findMany({
      where: {
        id: { in: dealerIds }
      },
      select: {
        id: true,
        dealerCode: true,
        dealerName: true,
        region: true
      }
    })

    // สร้าง map ของดีลเลอร์
    const dealerMap = dealers.reduce((acc, dealer) => {
      acc[dealer.id] = dealer
      return acc
    }, {} as any)

    // รวมข้อมูล
    const result = warrantyByDealer.map(item => {
      const dealer = dealerMap[item.dealerId]
      return {
        dealerId: item.dealerId,
        dealerCode: dealer?.dealerCode || 'N/A',
        dealerName: dealer?.dealerName || 'Unknown',
        region: dealer?.region || '-',
        warrantyCount: item._count._all
      }
    })

    // เรียงลำดับจากมากไปน้อย
    result.sort((a, b) => b.warrantyCount - a.warrantyCount)

    return NextResponse.json({
      success: true,
      data: result,
      total: result.reduce((sum, item) => sum + item.warrantyCount, 0)
    })

  } catch (error) {
    console.error('Error fetching warranty by dealer stats:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    )
  }
}
