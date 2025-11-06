import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// ปิด cache เพื่อให้ดึงข้อมูลใหม่ทุกครั้ง
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/products - ดึงรายชื่อสินค้าทั้งหมด
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
    const category = searchParams.get('category')

    const where: any = {}

    // ค้นหาตามชื่อ รหัส หรือหมายเลขซีเรียล
    if (search) {
      where.OR = [
        { productName: { contains: search } },
        { productCode: { contains: search } },
        { serialNumber: { contains: search } }
      ]
    }

    // กรองตามหมวดหมู่
    if (category) {
      where.category = category
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        warranties: {
          select: {
            id: true,
            warrantyNumber: true,
            warrantyDate: true,
            expiryDate: true
          },
          orderBy: {
            warrantyDate: 'desc'
          }
        },
        recipe: {
          select: {
            id: true,
            recipeName: true,
            version: true,
            isActive: true,
            _count: {
              select: {
                items: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/products - สร้างสินค้าใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      productCode,
      productName,
      serialNumber,
      category,
      description,
      warrantyTerms,
      thickness,
      templateImage
    } = body

    // ตรวจสอบว่า productCode ซ้ำหรือไม่
    const existingProduct = await prisma.product.findUnique({
      where: { productCode }
    })

    if (existingProduct) {
      return NextResponse.json(
        { error: 'Product code already exists' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่า serialNumber ซ้ำหรือไม่
    if (serialNumber) {
      const existingSerial = await prisma.product.findUnique({
        where: { serialNumber }
      })

      if (existingSerial) {
        return NextResponse.json(
          { error: 'Serial number already exists' },
          { status: 400 }
        )
      }
    }

    // สร้างสินค้าใหม่
    const newProduct = await prisma.product.create({
      data: {
        productCode,
        productName,
        serialNumber: serialNumber || null,
        category,
        description: description || null,
        warrantyTerms: warrantyTerms || null,
        thickness: thickness ? parseFloat(thickness) : null,
        templateImage: templateImage || 'Certification-Form.jpg'
      },
      include: {
        warranties: {
          select: {
            id: true,
            warrantyNumber: true,
            warrantyDate: true,
            expiryDate: true
          }
        }
      }
    })

    return NextResponse.json(
      {
        message: 'Product created successfully',
        product: newProduct
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}