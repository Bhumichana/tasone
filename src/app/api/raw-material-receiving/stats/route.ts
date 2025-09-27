import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/raw-material-receiving/stats - ดึงสถิติการรับเข้า
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // ตรวจสอบสิทธิ์ - เฉพาะ HeadOffice เท่านั้น
    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Access denied. Head Office only.' },
        { status: 403 }
      )
    }

    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    // ข้อมูลสถิติวันนี้
    const todayStats = await prisma.rawMaterialReceiving.aggregate({
      where: {
        createdAt: {
          gte: startOfDay
        }
      },
      _count: {
        id: true
      },
      _sum: {
        receivedQuantity: true
      }
    })

    // ข้อมูลสถิติสัปดาห์นี้
    const weekStats = await prisma.rawMaterialReceiving.aggregate({
      where: {
        createdAt: {
          gte: startOfWeek
        }
      },
      _count: {
        id: true
      },
      _sum: {
        receivedQuantity: true
      }
    })

    // ข้อมูลสถิติเดือนนี้
    const monthStats = await prisma.rawMaterialReceiving.aggregate({
      where: {
        createdAt: {
          gte: startOfMonth
        }
      },
      _count: {
        id: true
      },
      _sum: {
        receivedQuantity: true
      }
    })

    // สถิติตามสถานะ
    const statusStats = await prisma.rawMaterialReceiving.groupBy({
      by: ['qualityStatus'],
      _count: {
        id: true
      }
    })

    // วัตถุดิบที่รับเข้าบ่อยที่สุด (5 อันดับแรก)
    const topMaterials = await prisma.rawMaterialReceiving.groupBy({
      by: ['rawMaterialId'],
      _count: {
        id: true
      },
      _sum: {
        receivedQuantity: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    })

    // ดึงข้อมูลวัตถุดิบสำหรับ topMaterials
    const materialIds = topMaterials.map(item => item.rawMaterialId)
    const materials = await prisma.rawMaterial.findMany({
      where: {
        id: {
          in: materialIds
        }
      },
      select: {
        id: true,
        materialCode: true,
        materialName: true,
        materialType: true,
        unit: true
      }
    })

    // รวมข้อมูล topMaterials กับ materials
    const topMaterialsWithDetails = topMaterials.map(item => ({
      ...item,
      material: materials.find(m => m.id === item.rawMaterialId)
    }))

    // ผู้ผลิต/ผู้ขายที่ใช้บริการมากที่สุด (5 อันดับแรก)
    const topSuppliers = await prisma.rawMaterialReceiving.groupBy({
      by: ['supplier'],
      _count: {
        id: true
      },
      _sum: {
        receivedQuantity: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    })

    // สถิติการรับเข้าในช่วง 7 วันที่ผ่านมา (สำหรับ chart)
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)

      const dayStats = await prisma.rawMaterialReceiving.aggregate({
        where: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        _count: {
          id: true
        },
        _sum: {
          receivedQuantity: true
        }
      })

      last7Days.push({
        date: startOfDay.toISOString().split('T')[0],
        count: dayStats._count.id || 0,
        totalQuantity: dayStats._sum.receivedQuantity || 0
      })
    }

    return NextResponse.json({
      summary: {
        today: {
          count: todayStats._count.id || 0,
          totalQuantity: todayStats._sum.receivedQuantity || 0
        },
        week: {
          count: weekStats._count.id || 0,
          totalQuantity: weekStats._sum.receivedQuantity || 0
        },
        month: {
          count: monthStats._count.id || 0,
          totalQuantity: monthStats._sum.receivedQuantity || 0
        }
      },
      statusStats: statusStats.map(item => ({
        status: item.qualityStatus,
        count: item._count.id
      })),
      topMaterials: topMaterialsWithDetails,
      topSuppliers: topSuppliers.map(item => ({
        supplier: item.supplier,
        count: item._count.id,
        totalQuantity: item._sum.receivedQuantity || 0
      })),
      dailyStats: last7Days
    })
  } catch (error) {
    console.error('Error fetching receiving stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}