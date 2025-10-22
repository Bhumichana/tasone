import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/raw-materials/available - ดึงรายการวัตถุดิบที่พร้อมใช้งานสำหรับสูตรการผลิต
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    const where: any = {}

    // ค้นหาตามชื่อหรือรหัสวัตถุดิบ
    if (search) {
      where.OR = [
        { materialName: { contains: search } },
        { materialCode: { contains: search } },
        { materialType: { contains: search } }
      ]
    }

    const rawMaterials = await prisma.rawMaterial.findMany({
      where,
      select: {
        id: true,
        materialCode: true,
        materialName: true,
        materialType: true,
        description: true,
        unit: true,
        currentStock: true,
        minStock: true,
        supplier: true,
        location: true
      },
      orderBy: [
        { materialType: 'asc' },
        { materialName: 'asc' }
      ]
    })

    // จัดกลุ่มตาม materialType สำหรับแสดงผลที่ง่ายขึ้น
    const groupedMaterials = rawMaterials.reduce((acc: any, material: any) => {
      const type = material.materialType
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(material)
      return acc
    }, {})

    return NextResponse.json({
      rawMaterials,
      groupedMaterials,
      totalCount: rawMaterials.length
    })
  } catch (error: any) {
    console.error('Error fetching available raw materials:', error)
    console.error('Error stack:', error?.stack)
    console.error('Error message:', error?.message)
    return NextResponse.json(
      {
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูลวัตถุดิบ',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}