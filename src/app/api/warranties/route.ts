import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/warranties - ดึงรายชื่อใบรับประกันทั้งหมด
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
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where: any = {}

    // หากเป็น Dealer ให้แสดงเฉพาะใบรับประกันของตัวเอง
    if (session.user.userGroup === 'Dealer' && session.user.dealerId) {
      where.dealerId = session.user.dealerId
    }

    // หาก HeadOffice และระบุ dealerId
    if (dealerId && session.user.userGroup === 'HeadOffice') {
      where.dealerId = dealerId
    }

    // ค้นหาตามหมายเลขใบรับประกัน ชื่อลูกค้า หรือหมายเลขสินค้า
    if (search) {
      where.OR = [
        { warrantyNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        {
          product: {
            OR: [
              { productCode: { contains: search } },
              { serialNumber: { contains: search } }
            ]
          }
        }
      ]
    }

    // กรองตามสถานะ
    if (status === 'active') {
      where.expiryDate = { gte: new Date() }
    } else if (status === 'expired') {
      where.expiryDate = { lt: new Date() }
    }

    // กรองตามวันที่
    if (dateFrom || dateTo) {
      where.warrantyDate = {}
      if (dateFrom) {
        where.warrantyDate.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.warrantyDate.lte = new Date(dateTo + 'T23:59:59.999Z')
      }
    }

    const warranties = await prisma.warranty.findMany({
      where,
      include: {
        dealer: {
          select: {
            id: true,
            dealerCode: true,
            dealerName: true
          }
        },
        product: {
          include: {
            sale: {
              select: {
                id: true,
                saleNumber: true,
                saleDate: true
              }
            }
          }
        }
      },
      orderBy: {
        warrantyDate: 'desc'
      }
    })

    // เพิ่มสถานะ active/expired
    const warrantiesWithStatus = warranties.map(warranty => ({
      ...warranty,
      status: new Date(warranty.expiryDate) >= new Date() ? 'active' : 'expired',
      daysRemaining: Math.ceil((new Date(warranty.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    }))

    return NextResponse.json({ warranties: warrantiesWithStatus })
  } catch (error) {
    console.error('Error fetching warranties:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/warranties - สร้างใบรับประกันใหม่
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
      warrantyNumber,
      productId,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      warrantyDate,
      warrantyPeriodMonths,
      warrantyTerms,
      dealerId
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

    // ตรวจสอบว่า warrantyNumber ซ้ำหรือไม่
    const existingWarranty = await prisma.warranty.findUnique({
      where: { warrantyNumber }
    })

    if (existingWarranty) {
      return NextResponse.json(
        { error: 'Warranty number already exists' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่าสินค้ามีอยู่หรือไม่
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่าสินค้าเป็นของ dealer นี้หรือไม่
    if (product.dealerId !== finalDealerId) {
      return NextResponse.json(
        { error: 'Product does not belong to this dealer' },
        { status: 400 }
      )
    }

    // คำนวณวันหมดอายุ
    const warrantyStartDate = new Date(warrantyDate)
    const expiryDate = new Date(warrantyStartDate)
    expiryDate.setMonth(expiryDate.getMonth() + parseInt(warrantyPeriodMonths))

    // สร้างใบรับประกันใหม่
    const newWarranty = await prisma.warranty.create({
      data: {
        warrantyNumber,
        productId,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        warrantyDate: warrantyStartDate,
        expiryDate,
        warrantyPeriodMonths: parseInt(warrantyPeriodMonths),
        warrantyTerms,
        dealerId: finalDealerId
      },
      include: {
        dealer: {
          select: {
            id: true,
            dealerCode: true,
            dealerName: true
          }
        },
        product: {
          include: {
            sale: {
              select: {
                id: true,
                saleNumber: true,
                saleDate: true
              }
            }
          }
        }
      }
    })

    // เพิ่มสถานะ
    const warrantyWithStatus = {
      ...newWarranty,
      status: new Date(newWarranty.expiryDate) >= new Date() ? 'active' : 'expired',
      daysRemaining: Math.ceil((new Date(newWarranty.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    }

    return NextResponse.json(
      {
        message: 'Warranty created successfully',
        warranty: warrantyWithStatus
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating warranty:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}