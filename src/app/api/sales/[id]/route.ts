import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/sales/[id] - ดึงข้อมูลการขายคนเดียว
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        dealer: {
          select: {
            id: true,
            dealerCode: true,
            dealerName: true,
            address: true,
            phoneNumber: true
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
                description: true
              }
            }
          }
        }
      }
    })

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบสิทธิ์การเข้าถึง
    if (session.user.userGroup === 'Dealer' && session.user.dealerId !== sale.dealerId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // คำนวณจำนวนสินค้าทั้งหมด
    const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0)

    return NextResponse.json({
      sale: {
        ...sale,
        totalItems
      }
    })
  } catch (error) {
    console.error('Error fetching sale:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/sales/[id] - แก้ไขข้อมูลการขาย (เฉพาะข้อมูลลูกค้า)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const {
      customerName,
      customerPhone,
      customerAddress,
      saleDate
    } = body

    // ตรวจสอบว่าการขายมีอยู่หรือไม่
    const existingSale = await prisma.sale.findUnique({
      where: { id }
    })

    if (!existingSale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบสิทธิ์การเข้าถึง
    if (session.user.userGroup === 'Dealer' && session.user.dealerId !== existingSale.dealerId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // อัปเดตข้อมูลการขาย (เฉพาะข้อมูลลูกค้า)
    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        customerName,
        customerPhone,
        customerAddress,
        saleDate: new Date(saleDate)
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
                materialType: true
              }
            }
          }
        }
      }
    })

    // คำนวณจำนวนสินค้าทั้งหมด
    const totalItems = updatedSale.items.reduce((sum, item) => sum + item.quantity, 0)

    return NextResponse.json({
      message: 'Sale updated successfully',
      sale: {
        ...updatedSale,
        totalItems
      }
    })
  } catch (error) {
    console.error('Error updating sale:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/sales/[id] - ลบการขาย (และคืนสต็อก)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized - HeadOffice access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    // ตรวจสอบว่าการขายมีอยู่หรือไม่
    const existingSale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            rawMaterial: true
          }
        }
      }
    })

    if (!existingSale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบว่ามีการสร้างสินค้าจากการขายนี้แล้วหรือไม่
    const productsFromSale = await prisma.product.findMany({
      where: {
        saleId: id
      }
    })

    if (productsFromSale.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete sale that has products created from it' },
        { status: 400 }
      )
    }

    // ลบการขายและคืนสต็อก
    await prisma.$transaction(async (tx) => {
      // คืนสต็อกวัตถุดิบ
      for (const item of existingSale.items) {
        await tx.rawMaterial.update({
          where: { id: item.rawMaterialId },
          data: {
            currentStock: {
              increment: item.quantity
            }
          }
        })
      }

      // ลบรายการขาย
      await tx.sale.delete({
        where: { id }
      })
    })

    return NextResponse.json({
      message: 'Sale deleted successfully and stock returned'
    })
  } catch (error) {
    console.error('Error deleting sale:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}