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

    const where: any = {}

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
        minStock: parseInt(minStock) || 0,
        currentStock: parseInt(currentStock) || 0
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