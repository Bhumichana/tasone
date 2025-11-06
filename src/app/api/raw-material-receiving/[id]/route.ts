import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// ฟังก์ชันแปลงวันที่จากหลายรูปแบบ
function parseDate(dateStr: string): Date {
  // รูปแบบ YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr)
  }

  // รูปแบบ DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/')
    return new Date(`${year}-${month}-${day}`)
  }

  // รูปแบบ DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('-')
    return new Date(`${year}-${month}-${day}`)
  }

  // ถ้าไม่ตรงรูปแบบไหนเลย ให้ลอง parse ตรงๆ
  return new Date(dateStr)
}

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
      expiryDate,
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
    const updatedReceiving = await prisma.$transaction(async (tx) => {
      // สร้าง data object สำหรับ update
      const updateData: any = {
        receivingDate: receivingDate ? parseDate(receivingDate) : undefined,
        purchaseOrderNo,
        supplier,
        batchNumber,
        receivedQuantity: newQuantity,
        storageLocation,
        notes,
        qualityStatus: newStatus
      }

      // จัดการ rawMaterialId (ใช้ connect เพราะเป็น relation)
      if (rawMaterialId && rawMaterialId !== existingReceiving.rawMaterialId) {
        updateData.rawMaterial = {
          connect: { id: rawMaterialId }
        }
      }

      // จัดการ expiryDate แยกเพื่อป้องกัน error
      if (expiryDate !== undefined) {
        updateData.expiryDate = expiryDate && expiryDate.trim() !== '' ? parseDate(expiryDate) : null
      }

      // 1. อัปเดต RawMaterialReceiving
      const receiving = await tx.rawMaterialReceiving.update({
        where: { id },
        data: updateData,
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

      // 2. อัปเดต Batch ที่เกี่ยวข้อง (ถ้ามีการเปลี่ยนแปลง expiryDate)
      if (expiryDate !== undefined) {
        await tx.rawMaterialBatch.updateMany({
          where: {
            receivingId: id
          },
          data: {
            expiryDate: expiryDate && expiryDate.trim() !== '' ? parseDate(expiryDate) : null
          }
        })
      }

      // 3. อัปเดตสต็อกถ้ามีการเปลี่ยนแปลง
      if (stockChange !== 0) {
        await tx.rawMaterial.update({
          where: { id: existingReceiving.rawMaterialId },
          data: {
            currentStock: {
              increment: stockChange
            }
          }
        })
      }

      return receiving
    })

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

    // ดึงข้อมูลการรับเข้าพร้อม Batch
    const receiving = await prisma.rawMaterialReceiving.findUnique({
      where: { id },
      include: {
        batches: {
          include: {
            deliveryItems: true // เช็คว่า Batch ถูกใช้ส่งมอบหรือยัง
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

    // เช็คว่า Batch ถูกใช้ส่งมอบแล้วหรือยัง
    const usedBatches = receiving.batches.filter(batch => batch.deliveryItems.length > 0)
    if (usedBatches.length > 0) {
      return NextResponse.json(
        { error: `ไม่สามารถลบได้ เพราะมี Batch ที่ถูกใช้ส่งมอบไปแล้ว (${usedBatches.map(b => b.batchNumber).join(', ')})` },
        { status: 400 }
      )
    }

    // ลบการรับเข้า, Batch และปรับสต็อก
    await prisma.$transaction(async (tx) => {
      // 1. คำนวณสต็อกที่ต้องคืน (เฉพาะ Batch ที่ยังเหลือสต็อก)
      let stockToReturn = 0
      for (const batch of receiving.batches) {
        stockToReturn += batch.currentStock // เฉพาะที่เหลือใน Batch
      }

      // 2. ลบ Batch ที่เกี่ยวข้อง
      await tx.rawMaterialBatch.deleteMany({
        where: { receivingId: id }
      })

      // 3. คืนสต็อกที่ยังเหลือ (ถ้ามี)
      if (receiving.qualityStatus === 'APPROVED' && stockToReturn > 0) {
        await tx.rawMaterial.update({
          where: { id: receiving.rawMaterialId },
          data: {
            currentStock: {
              decrement: stockToReturn
            }
          }
        })
      }

      // 4. ลบการรับเข้า
      await tx.rawMaterialReceiving.delete({
        where: { id }
      })
    })

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