import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/dealers/[id] - ดึงข้อมูลผู้แทนจำหน่ายคนเดียว
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
    const dealer = await prisma.dealer.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            username: true,
            phoneNumber: true
          }
        },
        sales: {
          include: {
            items: {
              include: {
                rawMaterial: true
              }
            }
          },
          orderBy: {
            saleDate: 'desc'
          }
        },
        products: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        warranties: {
          include: {
            product: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!dealer) {
      return NextResponse.json(
        { error: 'Dealer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ dealer })
  } catch (error) {
    console.error('Error fetching dealer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/dealers/[id] - แก้ไขข้อมูลผู้แทนจำหน่าย
export async function PUT(
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
    const body = await request.json()
    const {
      dealerCode,
      manufacturerNumber,
      dealerName,
      region,
      address,
      phoneNumber,
      startDate,
      endDate
    } = body

    // ตรวจสอบว่าผู้แทนจำหน่ายมีอยู่หรือไม่
    const existingDealer = await prisma.dealer.findUnique({
      where: { id }
    })

    if (!existingDealer) {
      return NextResponse.json(
        { error: 'Dealer not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบว่า dealerCode ซ้ำหรือไม่ (ยกเว้นผู้แทนจำหน่ายปัจจุบัน)
    if (dealerCode !== existingDealer.dealerCode) {
      const duplicateDealer = await prisma.dealer.findUnique({
        where: { dealerCode }
      })

      if (duplicateDealer) {
        return NextResponse.json(
          { error: 'Dealer code already exists' },
          { status: 400 }
        )
      }
    }

    const updatedDealer = await prisma.dealer.update({
      where: { id },
      data: {
        dealerCode,
        manufacturerNumber,
        dealerName,
        region,
        address,
        phoneNumber,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null
      },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        _count: {
          select: {
            users: true,
            sales: true,
            products: true,
            warranties: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Dealer updated successfully',
      dealer: updatedDealer
    })
  } catch (error) {
    console.error('Error updating dealer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/dealers/[id] - ลบผู้แทนจำหน่าย
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
    // ตรวจสอบว่าผู้แทนจำหน่ายมีอยู่หรือไม่
    const existingDealer = await prisma.dealer.findUnique({
      where: { id },
      include: {
        users: true,
        sales: true,
        products: true,
        warranties: true
      }
    })

    if (!existingDealer) {
      return NextResponse.json(
        { error: 'Dealer not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบว่ามีข้อมูลที่เกี่ยวข้องหรือไม่
    const hasRelatedData =
      existingDealer.users.length > 0 ||
      existingDealer.sales.length > 0 ||
      existingDealer.products.length > 0 ||
      existingDealer.warranties.length > 0

    if (hasRelatedData) {
      return NextResponse.json(
        { error: 'Cannot delete dealer with related data (users, sales, products, or warranties)' },
        { status: 400 }
      )
    }

    await prisma.dealer.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'Dealer deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting dealer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}