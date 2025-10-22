import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/sub-dealers/[id] - ดึงข้อมูล Sub-dealer คนเดียว
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
    const subDealer = await prisma.subDealer.findUnique({
      where: { id },
      include: {
        dealer: {
          select: {
            id: true,
            dealerCode: true,
            dealerName: true
          }
        },
        warranties: {
          include: {
            product: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            warranties: true
          }
        }
      }
    })

    if (!subDealer) {
      return NextResponse.json(
        { error: 'Sub-dealer not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบสิทธิ์: Dealer สามารถดูได้เฉพาะ sub-dealer ของตัวเอง
    if (
      session.user.userGroup === 'Dealer' &&
      session.user.dealerId !== subDealer.dealerId
    ) {
      return NextResponse.json(
        { error: 'Forbidden - You can only view your own sub-dealers' },
        { status: 403 }
      )
    }

    return NextResponse.json({ subDealer })
  } catch (error) {
    console.error('Error fetching sub-dealer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/sub-dealers/[id] - แก้ไขข้อมูล Sub-dealer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.userGroup !== 'Dealer') {
      return NextResponse.json(
        { error: 'Unauthorized - Dealer access required' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { name, address, phoneNumber, email } = body

    // ตรวจสอบว่า Sub-dealer มีอยู่หรือไม่
    const existingSubDealer = await prisma.subDealer.findUnique({
      where: { id }
    })

    if (!existingSubDealer) {
      return NextResponse.json(
        { error: 'Sub-dealer not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบสิทธิ์: เฉพาะเจ้าของ (Dealer) เท่านั้นที่แก้ไขได้
    if (session.user.dealerId !== existingSubDealer.dealerId) {
      return NextResponse.json(
        { error: 'Forbidden - You can only edit your own sub-dealers' },
        { status: 403 }
      )
    }

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Sub-dealer name is required' },
        { status: 400 }
      )
    }

    const updatedSubDealer = await prisma.subDealer.update({
      where: { id },
      data: {
        name: name.trim(),
        address: address?.trim() || null,
        phoneNumber: phoneNumber?.trim() || null,
        email: email?.trim() || null
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
            warranties: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Sub-dealer updated successfully',
      subDealer: updatedSubDealer
    })
  } catch (error) {
    console.error('Error updating sub-dealer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/sub-dealers/[id] - ลบ Sub-dealer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.userGroup !== 'Dealer') {
      return NextResponse.json(
        { error: 'Unauthorized - Dealer access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    // ตรวจสอบว่า Sub-dealer มีอยู่หรือไม่
    const existingSubDealer = await prisma.subDealer.findUnique({
      where: { id },
      include: {
        warranties: true
      }
    })

    if (!existingSubDealer) {
      return NextResponse.json(
        { error: 'Sub-dealer not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบสิทธิ์: เฉพาะเจ้าของ (Dealer) เท่านั้นที่ลบได้
    if (session.user.dealerId !== existingSubDealer.dealerId) {
      return NextResponse.json(
        { error: 'Forbidden - You can only delete your own sub-dealers' },
        { status: 403 }
      )
    }

    // ตรวจสอบว่ามีการรับประกันที่เกี่ยวข้องหรือไม่
    if (existingSubDealer.warranties.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete sub-dealer with ${existingSubDealer.warranties.length} related warranties`
        },
        { status: 400 }
      )
    }

    await prisma.subDealer.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'Sub-dealer deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting sub-dealer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
