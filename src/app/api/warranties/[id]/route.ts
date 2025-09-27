import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/warranties/[id] - ดึงข้อมูลใบรับประกันคนเดียว
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const warranty = await prisma.warranty.findUnique({
      where: { id: params.id },
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
        product: {
          include: {
            sale: {
              include: {
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
            }
          }
        }
      }
    })

    if (!warranty) {
      return NextResponse.json(
        { error: 'Warranty not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบสิทธิ์การเข้าถึง
    if (session.user.userGroup === 'Dealer' && session.user.dealerId !== warranty.dealerId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // เพิ่มสถานะและข้อมูลเพิ่มเติม
    const warrantyWithStatus = {
      ...warranty,
      status: new Date(warranty.expiryDate) >= new Date() ? 'active' : 'expired',
      daysRemaining: Math.ceil((new Date(warranty.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      isNearExpiry: Math.ceil((new Date(warranty.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 30
    }

    return NextResponse.json({ warranty: warrantyWithStatus })
  } catch (error) {
    console.error('Error fetching warranty:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/warranties/[id] - แก้ไขข้อมูลใบรับประกัน
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      warrantyDate,
      warrantyPeriodMonths,
      warrantyTerms
    } = body

    // ตรวจสอบว่าใบรับประกันมีอยู่หรือไม่
    const existingWarranty = await prisma.warranty.findUnique({
      where: { id: params.id }
    })

    if (!existingWarranty) {
      return NextResponse.json(
        { error: 'Warranty not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบสิทธิ์การเข้าถึง
    if (session.user.userGroup === 'Dealer' && session.user.dealerId !== existingWarranty.dealerId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // ตรวจสอบว่า warrantyNumber ซ้ำหรือไม่ (ยกเว้นใบรับประกันปัจจุบัน)
    if (warrantyNumber !== existingWarranty.warrantyNumber) {
      const duplicateWarranty = await prisma.warranty.findUnique({
        where: { warrantyNumber }
      })

      if (duplicateWarranty) {
        return NextResponse.json(
          { error: 'Warranty number already exists' },
          { status: 400 }
        )
      }
    }

    // คำนวณวันหมดอายุใหม่
    const warrantyStartDate = new Date(warrantyDate)
    const expiryDate = new Date(warrantyStartDate)
    expiryDate.setMonth(expiryDate.getMonth() + parseInt(warrantyPeriodMonths))

    const updatedWarranty = await prisma.warranty.update({
      where: { id: params.id },
      data: {
        warrantyNumber,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        warrantyDate: warrantyStartDate,
        expiryDate,
        warrantyPeriodMonths: parseInt(warrantyPeriodMonths),
        warrantyTerms
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
      ...updatedWarranty,
      status: new Date(updatedWarranty.expiryDate) >= new Date() ? 'active' : 'expired',
      daysRemaining: Math.ceil((new Date(updatedWarranty.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    }

    return NextResponse.json({
      message: 'Warranty updated successfully',
      warranty: warrantyWithStatus
    })
  } catch (error) {
    console.error('Error updating warranty:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/warranties/[id] - ลบใบรับประกัน
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized - HeadOffice access required' },
        { status: 403 }
      )
    }

    // ตรวจสอบว่าใบรับประกันมีอยู่หรือไม่
    const existingWarranty = await prisma.warranty.findUnique({
      where: { id: params.id }
    })

    if (!existingWarranty) {
      return NextResponse.json(
        { error: 'Warranty not found' },
        { status: 404 }
      )
    }

    await prisma.warranty.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      message: 'Warranty deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting warranty:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}