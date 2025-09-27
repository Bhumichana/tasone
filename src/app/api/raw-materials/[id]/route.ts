import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/raw-materials/[id] - ดึงข้อมูลวัตถุดิบคนเดียว
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
    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id },
      include: {
        dealer: {
          select: {
            id: true,
            dealerCode: true,
            dealerName: true
          }
        },
        saleItems: {
          include: {
            sale: {
              select: {
                id: true,
                saleDate: true,
                saleNumber: true,
                customerName: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!rawMaterial) {
      return NextResponse.json(
        { error: 'Raw material not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบสิทธิ์การเข้าถึง
    if (session.user.userGroup === 'Dealer' && session.user.dealerId !== rawMaterial.dealerId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({ rawMaterial })
  } catch (error) {
    console.error('Error fetching raw material:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/raw-materials/[id] - แก้ไขข้อมูลวัตถุดิบ
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

    // ตรวจสอบว่าวัตถุดิบมีอยู่หรือไม่
    const existingMaterial = await prisma.rawMaterial.findUnique({
      where: { id }
    })

    if (!existingMaterial) {
      return NextResponse.json(
        { error: 'Raw material not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบว่า materialCode ซ้ำหรือไม่ (ยกเว้นวัตถุดิบปัจจุบัน)
    if (materialCode !== existingMaterial.materialCode) {
      const duplicateMaterial = await prisma.rawMaterial.findUnique({
        where: { materialCode }
      })

      if (duplicateMaterial) {
        return NextResponse.json(
          { error: 'Material code already exists' },
          { status: 400 }
        )
      }
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

    const updatedMaterial = await prisma.rawMaterial.update({
      where: { id },
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

    return NextResponse.json({
      message: 'Raw material updated successfully',
      rawMaterial: updatedMaterial
    })
  } catch (error) {
    console.error('Error updating raw material:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/raw-materials/[id] - ลบวัตถุดิบ
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
    // ตรวจสอบว่าวัตถุดิบมีอยู่หรือไม่
    const existingMaterial = await prisma.rawMaterial.findUnique({
      where: { id },
      include: {
        saleItems: true
      }
    })

    if (!existingMaterial) {
      return NextResponse.json(
        { error: 'Raw material not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบว่ามีการขายแล้วหรือไม่
    if (existingMaterial.saleItems.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete raw material that has been sold' },
        { status: 400 }
      )
    }

    await prisma.rawMaterial.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'Raw material deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting raw material:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/raw-materials/[id] - อัปเดตสต็อก
export async function PATCH(
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
    const { action, quantity, note } = body

    // ตรวจสอบว่าวัตถุดิบมีอยู่หรือไม่
    const existingMaterial = await prisma.rawMaterial.findUnique({
      where: { id }
    })

    if (!existingMaterial) {
      return NextResponse.json(
        { error: 'Raw material not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบสิทธิ์การเข้าถึง
    if (session.user.userGroup === 'Dealer' && session.user.dealerId !== existingMaterial.dealerId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    let newStock = existingMaterial.currentStock

    if (action === 'add') {
      newStock += parseInt(quantity)
    } else if (action === 'subtract') {
      newStock -= parseInt(quantity)
      if (newStock < 0) {
        return NextResponse.json(
          { error: 'Insufficient stock' },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "add" or "subtract"' },
        { status: 400 }
      )
    }

    const updatedMaterial = await prisma.rawMaterial.update({
      where: { id },
      data: {
        currentStock: newStock
      },
      include: {
        dealer: {
          select: {
            id: true,
            dealerCode: true,
            dealerName: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Stock updated successfully',
      rawMaterial: updatedMaterial
    })
  } catch (error) {
    console.error('Error updating stock:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}