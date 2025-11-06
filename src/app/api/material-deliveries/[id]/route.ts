import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/material-deliveries/[id] - ดึงข้อมูลการส่งมอบเดียว
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
    const delivery = await prisma.materialDelivery.findUnique({
      where: { id },
      include: {
        dealer: {
          select: {
            id: true,
            dealerName: true,
            dealerCode: true,
            region: true,
            address: true,
            phoneNumber: true
          }
        },
        items: {
          select: {
            id: true,
            rawMaterialId: true,
            batchId: true, // ✅ เลือก batchId อย่างชัดเจน
            batchNumber: true,
            quantity: true,
            unit: true,
            rawMaterial: {
              select: {
                id: true,
                materialCode: true,
                materialName: true,
                materialType: true,
                unit: true,
                currentStock: true
              }
            },
            batch: {
              select: {
                id: true,
                batchNumber: true,
                currentStock: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

    if (!delivery) {
      return NextResponse.json(
        { error: 'Material delivery not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ delivery })
  } catch (error) {
    console.error('Error fetching material delivery:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/material-deliveries/[id] - แก้ไขการส่งมอบ
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
      deliveryDate,
      dealerId,
      status,
      notes,
      items
    } = body

    // ตรวจสอบว่าการส่งมอบมีอยู่หรือไม่
    const existingDelivery = await prisma.materialDelivery.findUnique({
      where: { id },
      include: {
        items: true
      }
    })

    if (!existingDelivery) {
      return NextResponse.json(
        { error: 'Material delivery not found' },
        { status: 404 }
      )
    }

    // ห้ามแก้ไขถ้าสถานะเป็น DELIVERED แล้ว
    if (existingDelivery.status === 'DELIVERED') {
      return NextResponse.json(
        { error: 'Cannot edit delivery that has been received by dealer' },
        { status: 400 }
      )
    }

    // สร้าง updateData
    const updateData: any = {}

    if (deliveryDate) updateData.deliveryDate = new Date(deliveryDate)
    if (dealerId) updateData.dealerId = dealerId
    if (status) updateData.status = status
    if (notes !== undefined) updateData.notes = notes

    // ถ้ามีการอัปเดตรายการ
    if (items) {
      updateData.totalItems = items.length
    }

    // ใช้ Transaction เพื่อความปลอดภัย
    const updatedDelivery = await prisma.$transaction(async (tx) => {
      // ถ้ามีการอัปเดตรายการ
      if (items) {
        // ✅ ขั้นตอนที่ 1: คืนสต็อกของรายการเดิมก่อน
        for (const oldItem of existingDelivery.items) {
          // คืนสต็อกให้ Batch
          await tx.rawMaterialBatch.update({
            where: { id: oldItem.batchId! },
            data: {
              currentStock: {
                increment: oldItem.quantity
              },
              status: 'AVAILABLE' // เปลี่ยนสถานะกลับเป็น AVAILABLE
            }
          })

          // คืนสต็อกให้ RawMaterial
          await tx.rawMaterial.update({
            where: { id: oldItem.rawMaterialId },
            data: {
              currentStock: {
                increment: oldItem.quantity
              }
            }
          })
        }

        // ✅ ขั้นตอนที่ 2: ตรวจสอบสต็อกของรายการใหม่
        for (const item of items) {
          if (!item.batchId) {
            throw new Error('Batch ID is required for each item')
          }

          const batch = await tx.rawMaterialBatch.findUnique({
            where: { id: item.batchId },
            include: { rawMaterial: true }
          })

          if (!batch) {
            throw new Error(`Batch not found: ${item.batchId}`)
          }

          if (batch.currentStock < parseFloat(item.quantity)) {
            throw new Error(
              `Insufficient stock for ${batch.rawMaterial.materialName} (Batch: ${batch.batchNumber}). Available: ${batch.currentStock}, Required: ${item.quantity}`
            )
          }
        }

        // ✅ ขั้นตอนที่ 3: ลบรายการเดิมทั้งหมด
        await tx.materialDeliveryItem.deleteMany({
          where: { deliveryId: id }
        })

        // ✅ ขั้นตอนที่ 4: สร้างรายการใหม่
        updateData.items = {
          create: items.map((item: any) => ({
            rawMaterialId: item.rawMaterialId,
            batchId: item.batchId,
            batchNumber: item.batchNumber,
            quantity: parseFloat(item.quantity),
            unit: item.unit
          }))
        }

        // ✅ ขั้นตอนที่ 5: ตัดสต็อกของรายการใหม่
        for (const item of items) {
          const quantity = parseFloat(item.quantity)

          // ตัดสต็อกจาก Batch
          const updatedBatch = await tx.rawMaterialBatch.update({
            where: { id: item.batchId },
            data: {
              currentStock: {
                decrement: quantity
              }
            }
          })

          // อัปเดตสถานะ Batch ถ้าสต็อกหมด
          if (updatedBatch.currentStock <= 0) {
            await tx.rawMaterialBatch.update({
              where: { id: item.batchId },
              data: {
                status: 'OUT_OF_STOCK'
              }
            })
          }

          // ตัดสต็อกจาก RawMaterial
          await tx.rawMaterial.update({
            where: { id: item.rawMaterialId },
            data: {
              currentStock: {
                decrement: quantity
              }
            }
          })
        }
      }

      // อัปเดตการส่งมอบ
      const updated = await tx.materialDelivery.update({
        where: { id },
        data: updateData,
        include: {
          dealer: {
            select: {
              id: true,
              dealerName: true,
              dealerCode: true
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
                  unit: true
                }
              }
            }
          }
        }
      })

      return updated
    })

    return NextResponse.json({
      message: 'Material delivery updated successfully',
      delivery: updatedDelivery
    })
  } catch (error) {
    console.error('Error updating material delivery:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/material-deliveries/[id] - ลบการส่งมอบ
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

    // ตรวจสอบว่าการส่งมอบมีอยู่หรือไม่
    const existingDelivery = await prisma.materialDelivery.findUnique({
      where: { id },
      include: {
        items: true
      }
    })

    if (!existingDelivery) {
      return NextResponse.json(
        { error: 'Material delivery not found' },
        { status: 404 }
      )
    }

    // ถ้าสถานะเป็น DELIVERED (รับเข้าแล้ว) ห้ามลบ
    if (existingDelivery.status === 'DELIVERED') {
      return NextResponse.json(
        { error: 'Cannot delete delivery that has been received by dealer' },
        { status: 400 }
      )
    }

    // ใช้ Transaction เพื่อลบและคืนสต็อก
    await prisma.$transaction(async (tx) => {
      // คืนสต็อกให้ HeadOffice
      for (const item of existingDelivery.items) {
        // คืนสต็อกให้ Batch
        await tx.rawMaterialBatch.update({
          where: { id: item.batchId! },
          data: {
            currentStock: {
              increment: item.quantity
            },
            status: 'AVAILABLE' // เปลี่ยนสถานะกลับเป็น AVAILABLE
          }
        })

        // คืนสต็อกให้ RawMaterial
        await tx.rawMaterial.update({
          where: { id: item.rawMaterialId },
          data: {
            currentStock: {
              increment: item.quantity
            }
          }
        })
      }

      // ลบการส่งมอบ (รายการจะถูกลบอัตโนมัติเพราะมี onDelete: Cascade)
      await tx.materialDelivery.delete({
        where: { id }
      })
    })

    return NextResponse.json({
      message: 'Material delivery deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting material delivery:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}