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

    // ตรวจสอบสต็อกก่อนหัก (ถ้าเปลี่ยนสถานะเป็น SHIPPING)
    if (status === 'SHIPPING' && existingDelivery.status === 'PREPARING') {
      const itemsToProcess = items || existingDelivery.items

      for (const item of itemsToProcess) {
        const rawMaterial = await prisma.rawMaterial.findUnique({
          where: { id: item.rawMaterialId }
        })

        if (!rawMaterial) {
          return NextResponse.json(
            { error: `Raw material not found: ${item.rawMaterialId}` },
            { status: 404 }
          )
        }

        if (rawMaterial.currentStock < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for ${rawMaterial.materialName}. Available: ${rawMaterial.currentStock}, Required: ${item.quantity}` },
            { status: 400 }
          )
        }
      }
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
      // ถ้าเปลี่ยนสถานะเป็น SHIPPING - หักสต็อก
      if (status === 'SHIPPING' && existingDelivery.status === 'PREPARING') {
        const itemsToProcess = items || existingDelivery.items

        for (const item of itemsToProcess) {
          await tx.rawMaterial.update({
            where: { id: item.rawMaterialId },
            data: {
              currentStock: {
                decrement: parseFloat(item.quantity)
              }
            }
          })
        }
      }

      // ถ้าเปลี่ยนสถานะจาก SHIPPING กลับเป็น PREPARING - คืนสต็อก
      if (status === 'PREPARING' && existingDelivery.status === 'SHIPPING') {
        for (const item of existingDelivery.items) {
          await tx.rawMaterial.update({
            where: { id: item.rawMaterialId },
            data: {
              currentStock: {
                increment: item.quantity
              }
            }
          })
        }
      }

      // ถ้ามีการอัปเดตรายการ
      if (items) {
        // ลบรายการเดิมทั้งหมด
        await tx.materialDeliveryItem.deleteMany({
          where: { deliveryId: id }
        })

        // สร้างรายการใหม่
        updateData.items = {
          create: items.map((item: any) => ({
            rawMaterialId: item.rawMaterialId,
            batchNumber: item.batchNumber,
            quantity: parseFloat(item.quantity),
            unit: item.unit
          }))
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

    // ถ้าสถานะเป็น SHIPPING ห้ามลบ
    if (existingDelivery.status === 'SHIPPING' || existingDelivery.status === 'DELIVERED') {
      return NextResponse.json(
        { error: 'Cannot delete delivery that is being shipped or delivered' },
        { status: 400 }
      )
    }

    // ลบการส่งมอบ (รายการจะถูกลบอัตโนมัติเพราะมี onDelete: Cascade)
    await prisma.materialDelivery.delete({
      where: { id }
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