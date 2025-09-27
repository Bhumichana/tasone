import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/raw-materials - ดึงรายชื่อวัตถุดิบทั้งหมด
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
    const dealerId = searchParams.get('dealerId')

    const where: any = {}

    // หากเป็น Dealer ให้แสดงเฉพาะวัตถุดิบของตัวเอง
    if (session.user.userGroup === 'Dealer' && session.user.dealerId) {
      where.dealerId = session.user.dealerId
    }

    // หาก HeadOffice และระบุ dealerId
    if (dealerId && session.user.userGroup === 'HeadOffice') {
      where.dealerId = dealerId
    }

    // ค้นหาตามชื่อหรือรหัส
    if (search) {
      where.OR = [
        { materialName: { contains: search } },
        { materialCode: { contains: search } },
        { materialType: { contains: search } }
      ]
    }

    const rawMaterials = await prisma.rawMaterial.findMany({
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
            saleItems: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ rawMaterials })
  } catch (error) {
    console.error('Error fetching raw materials:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/raw-materials - สร้างวัตถุดิบใหม่
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
      materialCode,
      materialName,
      materialType,
      description,
      unit,
      supplier,
      location,
      expiryDate,
      batchNumber,
      dealerId,
      minStock,
      currentStock
    } = body

    // ตรวจสอบว่า materialCode ซ้ำหรือไม่
    const existingMaterial = await prisma.rawMaterial.findUnique({
      where: { materialCode }
    })

    if (existingMaterial) {
      return NextResponse.json(
        { error: 'Material code already exists' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่า dealer มีอยู่หรือไม่
    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId }
    })

    if (!dealer) {
      return NextResponse.json(
        { error: 'Dealer not found' },
        { status: 400 }
      )
    }

    // สร้างวัตถุดิบใหม่
    const newMaterial = await prisma.rawMaterial.create({
      data: {
        materialCode,
        materialName,
        materialType,
        description,
        unit,
        supplier,
        location,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        batchNumber,
        dealerId,
        minStock: parseInt(minStock) || 0,
        currentStock: parseInt(currentStock) || 0
      },
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
            saleItems: true
          }
        }
      }
    })

    return NextResponse.json(
      {
        message: 'Raw material created successfully',
        rawMaterial: newMaterial
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating raw material:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}