import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/sales - ดึงรายชื่อการขายทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Temporarily disabled - return empty sales data
    return NextResponse.json({ sales: [] })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const dealerId = searchParams.get('dealerId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where: any = {}

    // หากเป็น Dealer ให้แสดงเฉพาะการขายของตัวเอง
    if (session.user.userGroup === 'Dealer' && session.user.dealerId) {
      where.dealerId = session.user.dealerId
    }

    // หาก HeadOffice และระบุ dealerId
    if (dealerId && session.user.userGroup === 'HeadOffice') {
      where.dealerId = dealerId
    }

    // ค้นหาตามหมายเลขขายหรือชื่อลูกค้า
    if (search) {
      where.OR = [
        { saleNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } }
      ]
    }

    // กรองตามวันที่
    if (dateFrom || dateTo) {
      where.saleDate = {}
      if (dateFrom) {
        where.saleDate.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.saleDate.lte = new Date(dateTo + 'T23:59:59.999Z')
      }
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        dealer: {
          select: {
            id: true,
            dealerCode: true,
            dealerName: true
          }
        },
        items: {
          include: {
            rawMaterial: {
              select: {
                id: true,
                materialCode: true,
                materialName: true,
                materialType: true,
                unit: true,
                supplier: true,
                location: true
              }
            }
          }
        }
      },
      orderBy: {
        saleDate: 'desc'
      }
    })

    // คำนวณราคารวมสำหรับแต่ละรายการขาย
    const salesWithTotals = sales.map(sale => ({
      ...sale,
      totalAmount: sale.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
      totalItems: sale.items.reduce((sum, item) => sum + item.quantity, 0)
    }))

    return NextResponse.json({ sales: salesWithTotals })
  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/sales - สร้างการขายใหม่
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
      saleNumber,
      customerName,
      customerPhone,
      customerAddress,
      saleDate,
      dealerId,
      items
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

    // ตรวจสอบว่า saleNumber ซ้ำหรือไม่
    const existingSale = await prisma.sale.findUnique({
      where: { saleNumber }
    })

    if (existingSale) {
      return NextResponse.json(
        { error: 'Sale number already exists' },
        { status: 400 }
      )
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

    // ตรวจสอบว่าวัตถุดิบทั้งหมดมีสต็อกเพียงพอหรือไม่
    for (const item of items) {
      const material = await prisma.rawMaterial.findUnique({
        where: { id: item.rawMaterialId }
      })

      if (!material) {
        return NextResponse.json(
          { error: `Raw material not found: ${item.rawMaterialId}` },
          { status: 400 }
        )
      }

      if (material.currentStock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${material.materialName}. Available: ${material.currentStock}, Required: ${item.quantity}` },
          { status: 400 }
        )
      }
    }

    // สร้างการขายใหม่ พร้อมลดสต็อก
    const result = await prisma.$transaction(async (tx) => {
      // สร้างการขาย
      const newSale = await tx.sale.create({
        data: {
          saleNumber,
          customerName,
          customerPhone,
          customerAddress,
          saleDate: new Date(saleDate),
          dealerId: finalDealerId,
          items: {
            create: items.map((item: any) => ({
              rawMaterialId: item.rawMaterialId,
              quantity: item.quantity,
              unitPrice: item.unitPrice
            }))
          }
        },
        include: {
          dealer: {
            select: {
              id: true,
              dealerCode: true,
              dealerName: true
            }
          },
          items: {
            include: {
              rawMaterial: {
                select: {
                  id: true,
                  materialCode: true,
                  materialName: true,
                  materialType: true,
                  unit: true,
                  supplier: true,
                  location: true
                }
              }
            }
          }
        }
      })

      // ลดสต็อกวัตถุดิบ
      for (const item of items) {
        await tx.rawMaterial.update({
          where: { id: item.rawMaterialId },
          data: {
            currentStock: {
              decrement: item.quantity
            }
          }
        })
      }

      return newSale
    })

    // คำนวณราคารวม
    const totalAmount = result.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
    const totalItems = result.items.reduce((sum, item) => sum + item.quantity, 0)

    return NextResponse.json(
      {
        message: 'Sale created successfully',
        sale: {
          ...result,
          totalAmount,
          totalItems
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating sale:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}