import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// ฟังก์ชันอัปเดต status ของ DealerStock ที่หมดอายุ
async function updateExpiredDealerStockStatus() {
  const now = new Date()

  // หา DealerStock ที่หมดอายุแล้วแต่ status ยังไม่เป็น EXPIRED
  const expiredStocks = await prisma.dealerStock.findMany({
    where: {
      expiryDate: {
        lt: now // น้อยกว่าวันนี้ (less than)
      },
      status: {
        not: 'EXPIRED' // ยังไม่ได้เป็น EXPIRED
      }
    }
  })

  // อัปเดต status เป็น EXPIRED
  if (expiredStocks.length > 0) {
    await prisma.dealerStock.updateMany({
      where: {
        id: {
          in: expiredStocks.map(s => s.id)
        }
      },
      data: {
        status: 'EXPIRED'
      }
    })
    console.log(`Updated ${expiredStocks.length} dealer stocks to EXPIRED status`)
  }

  return expiredStocks.length
}

// GET /api/expired-materials - ดึงรายการวัตถุดิบที่หมดอายุแยกตามดีลเลอร์
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // ตรวจสอบว่าเป็น HeadOffice เท่านั้น
    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized - HeadOffice access required' },
        { status: 403 }
      )
    }

    // อัปเดต status ของ DealerStock ที่หมดอายุก่อน
    await updateExpiredDealerStockStatus()

    // ดึง query parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const statusFilter = searchParams.get('status') || 'all' // all | recertified | not_recertified
    const dealerFilter = searchParams.get('dealer') || 'all' // all | dealerId
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // สร้าง where clause
    const where: any = {
      status: 'EXPIRED', // เฉพาะวัตถุดิบที่หมดอายุ
      currentStock: {
        gt: 0 // มีสต็อกมากกว่า 0 เท่านั้น
      }
    }

    // Filter: recertified หรือ not_recertified
    if (statusFilter === 'recertified') {
      where.isRecertified = true
    } else if (statusFilter === 'not_recertified') {
      where.isRecertified = false
    }

    // Filter: dealer
    if (dealerFilter !== 'all') {
      where.dealerId = dealerFilter
    }

    // Search
    if (search) {
      where.OR = [
        { batchNumber: { contains: search } },
        { materialName: { contains: search } },
        { materialCode: { contains: search } },
        { dealer: { dealerName: { contains: search } } }
      ]
    }

    // ดึงข้อมูล DealerStock ที่หมดอายุ
    const [stocks, total] = await Promise.all([
      prisma.dealerStock.findMany({
        where,
        include: {
          dealer: {
            select: {
              id: true,
              dealerCode: true,
              dealerName: true,
              region: true,
              phoneNumber: true
            }
          },
          recertificationHistory: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 1 // แค่ครั้งล่าสุด
          }
        },
        orderBy: [
          { dealer: { dealerName: 'asc' } }, // เรียงตามชื่อดีลเลอร์
          { isRecertified: 'asc' }, // ยังไม่ต่ออายุขึ้นก่อน
          { expiryDate: 'asc' } // เรียงตามวันหมดอายุ
        ],
        take: limit,
        skip: offset
      }),
      prisma.dealerStock.count({ where })
    ])

    // สรุปข้อมูลแยกตามดีลเลอร์
    const dealerSummary = await prisma.dealerStock.groupBy({
      by: ['dealerId'],
      where: {
        status: 'EXPIRED',
        currentStock: {
          gt: 0
        }
      },
      _count: {
        id: true
      }
    })

    // ดึงข้อมูลดีลเลอร์ทั้งหมดที่มีวัตถุดิบหมดอายุ
    const dealerIds = dealerSummary.map(d => d.dealerId)
    const dealers = await prisma.dealer.findMany({
      where: {
        id: {
          in: dealerIds
        }
      },
      select: {
        id: true,
        dealerCode: true,
        dealerName: true,
        region: true
      }
    })

    // รวมข้อมูล
    const dealerStats = dealerSummary.map(summary => {
      const dealer = dealers.find(d => d.id === summary.dealerId)
      return {
        dealerId: summary.dealerId,
        dealerCode: dealer?.dealerCode || 'N/A',
        dealerName: dealer?.dealerName || 'Unknown',
        region: dealer?.region || 'N/A',
        expiredCount: summary._count.id
      }
    })

    // สรุปข้อมูลรวม
    const summary = {
      total: total,
      expired: await prisma.dealerStock.count({
        where: { status: 'EXPIRED', currentStock: { gt: 0 } }
      }),
      recertified: await prisma.dealerStock.count({
        where: { status: 'EXPIRED', isRecertified: true, currentStock: { gt: 0 } }
      }),
      notRecertified: await prisma.dealerStock.count({
        where: { status: 'EXPIRED', isRecertified: false, currentStock: { gt: 0 } }
      }),
      totalDealers: dealerStats.length,
      dealerStats: dealerStats.sort((a, b) => b.expiredCount - a.expiredCount) // เรียงจากมากไปน้อย
    }

    return NextResponse.json({
      stocks,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      summary
    })
  } catch (error) {
    console.error('Error fetching expired materials:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
