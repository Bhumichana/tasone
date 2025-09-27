import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/raw-material-receiving/[id] - ดูรายละเอียดการรับเข้า
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)

    // ตรวจสอบสิทธิ์ - เฉพาะ HeadOffice เท่านั้น
    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Access denied. Head Office only.' },
        { status: 403 }
      )
    }

    const receiving = await prisma.rawMaterialReceiving.findUnique({
      where: { id },
      include: {
        rawMaterial: {
          select: {
            id: true,
            materialCode: true,
            materialName: true,
            materialType: true,
            unit: true,
            currentStock: true
          }
        }
      }
    })

    if (!receiving) {
      return NextResponse.json(
        { error: 'Receiving record not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ receiving })
  } catch (error) {
    console.error('Error fetching receiving:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/raw-material-receiving/[id] - แก้ไขการรับเข้า
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)

    // ตรวจสอบสิทธิ์ - เฉพาะ HeadOffice เท่านั้น
    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Access denied. Head Office only.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      receivingDate,
      purchaseOrderNo,
      supplier,
      rawMaterialId,
      batchNumber,
      receivedQuantity,
      storageLocation,
      notes,
      qualityStatus
    } = body

    // ดึงข้อมูลการรับเข้าเดิม
    const existingReceiving = await prisma.rawMaterialReceiving.findUnique({
      where: { id }
    })

    if (!existingReceiving) {
      return NextResponse.json(
        { error: 'Receiving record not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบว่าวัตถุดิบมีอยู่หรือไม่
    if (rawMaterialId) {
      const rawMaterial = await prisma.rawMaterial.findUnique({
        where: { id: rawMaterialId }
      })

      if (!rawMaterial) {
        return NextResponse.json(
          { error: 'Raw material not found' },
          { status: 400 }
        )
      }
    }

    // ตรวจสอบปริมาณ
    if (receivedQuantity !== undefined && receivedQuantity <= 0) {
      return NextResponse.json(
        { error: 'Received quantity must be greater than 0' },
        { status: 400 }
      )
    }

    // จัดการการเปลี่ยนแปลงสต็อก
    const oldQuantity = existingReceiving.receivedQuantity
    const oldStatus = existingReceiving.qualityStatus
    const newQuantity = receivedQuantity !== undefined ? parseFloat(receivedQuantity) : oldQuantity
    const newStatus = qualityStatus || oldStatus

    // คำนวณการเปลี่ยนแปลงสต็อก
    let stockChange = 0

    // ถ้าสถานะเดิมเป็น APPROVED ให้ลบออกจากสต็อก
    if (oldStatus === 'APPROVED') {
      stockChange -= oldQuantity
    }

    // ถ้าสถานะใหม่เป็น APPROVED ให้เพิ่มเข้าสต็อก
    if (newStatus === 'APPROVED') {
      stockChange += newQuantity
    }

    // อัปเดตการรับเข้าและสต็อก
    const [updatedReceiving] = await prisma.$transaction([
      prisma.rawMaterialReceiving.update({
        where: { id },
        data: {
          receivingDate: receivingDate ? new Date(receivingDate) : undefined,
          purchaseOrderNo,
          supplier,
          rawMaterialId,
          batchNumber,
          receivedQuantity: newQuantity,
          storageLocation,
          notes,
          qualityStatus: newStatus
        },
        include: {
          rawMaterial: {
            select: {
              id: true,
              materialCode: true,
              materialName: true,
              materialType: true,
              unit: true,
              currentStock: true
            }
          }
        }
      }),

      // อัปเดตสต็อกถ้ามีการเปลี่ยนแปลง
      ...(stockChange !== 0 ? [
        prisma.rawMaterial.update({
          where: { id: existingReceiving.rawMaterialId },
          data: {
            currentStock: {
              increment: stockChange
            }
          }
        })
      ] : [])
    ])

    return NextResponse.json({
      message: 'Receiving updated successfully',
      receiving: updatedReceiving
    })
  } catch (error) {
    console.error('Error updating receiving:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/raw-material-receiving/[id] - ลบการรับเข้า
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)

    // ตรวจสอบสิทธิ์ - เฉพาะ HeadOffice เท่านั้น
    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Access denied. Head Office only.' },
        { status: 403 }
      )
    }

    // ดึงข้อมูลการรับเข้า
    const receiving = await prisma.rawMaterialReceiving.findUnique({
      where: { id }
    })

    if (!receiving) {
      return NextResponse.json(
        { error: 'Receiving record not found' },
        { status: 404 }
      )
    }

    // ลบการรับเข้าและปรับสต็อก
    await prisma.$transaction([
      // ถ้าสถานะเป็น APPROVED ให้ลบจำนวนออกจากสต็อก
      ...(receiving.qualityStatus === 'APPROVED' ? [
        prisma.rawMaterial.update({
          where: { id: receiving.rawMaterialId },
          data: {
            currentStock: {
              decrement: receiving.receivedQuantity
            }
          }
        })
      ] : []),

      // ลบการรับเข้า
      prisma.rawMaterialReceiving.delete({
        where: { id }
      })
    ])

    return NextResponse.json({
      message: 'Receiving deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting receiving:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}