import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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
    const dealerId = searchParams.get('dealerId')
    const category = searchParams.get('category')

    const where: any = {}

    // หากเป็น Dealer ให้แสดงเฉพาะสินค้าของตัวเอง
    if (session.user.userGroup === 'Dealer' && session.user.dealerId) {
      where.dealerId = session.user.dealerId
    }

    // หาก HeadOffice และระบุ dealerId
    if (dealerId && session.user.userGroup === 'HeadOffice') {
      where.dealerId = dealerId
    }

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
        dealer: {
          select: {
            id: true,
            dealerCode: true,
            dealerName: true
          }
        },
        sale: {
          select: {
            id: true,
            saleNumber: true,
            customerName: true,
            saleDate: true
          }
        },
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
      dealerId,
      saleId
    } = body

    // ตรวจสอบสิทธิ์
    const finalDealerId = session.user.userGroup === 'Dealer'
      ? session.user.dealerId
      : dealerId

    if (!finalDealerId) {
      return NextResponse.json(
        { error: 'Dealer ID is required' },
        { status: 400 }
      )
    }

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

    // ตรวจสอบว่า dealer มีอยู่หรือไม่
    const dealer = await prisma.dealer.findUnique({
      where: { id: finalDealerId }
    })

    if (!dealer) {
      return NextResponse.json(
        { error: 'Dealer not found' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่า sale มีอยู่หรือไม่ (ถ้าระบุ)
    if (saleId) {
      const sale = await prisma.sale.findUnique({
        where: { id: saleId }
      })

      if (!sale) {
        return NextResponse.json(
          { error: 'Sale not found' },
          { status: 400 }
        )
      }

      // ตรวจสอบว่า sale เป็นของ dealer นี้หรือไม่
      if (sale.dealerId !== finalDealerId) {
        return NextResponse.json(
          { error: 'Sale does not belong to this dealer' },
          { status: 400 }
        )
      }
    }

    // สร้างสินค้าใหม่
    const newProduct = await prisma.product.create({
      data: {
        productCode,
        productName,
        serialNumber,
        category,
        description,
        dealerId: finalDealerId,
        saleId: saleId || undefined
      },
      include: {
        dealer: {
          select: {
            id: true,
            dealerCode: true,
            dealerName: true
          }
        },
        sale: {
          select: {
            id: true,
            saleNumber: true,
            customerName: true,
            saleDate: true
          }
        },
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