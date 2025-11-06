import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/material-deliveries - ดึงรายการส่งมอบทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const dealerId = searchParams.get('dealerId')
    const status = searchParams.get('status')

    const where: any = {}

    // ค้นหาตามเลขที่การส่งมอบหรือชื่อตัวแทน
    if (search) {
      where.OR = [
        { deliveryNumber: { contains: search } },
        { dealer: { dealerName: { contains: search } } },
        { notes: { contains: search } }
      ]
    }

    // กรองตามตัวแทนจำหน่าย
    if (dealerId) {
      where.dealerId = dealerId
    }

    // กรองตามสถานะ
    if (status) {
      where.status = status
    }

    const deliveries = await prisma.materialDelivery.findMany({
      where,
      include: {
        dealer: {
          select: {
            id: true,
            dealerName: true,
            dealerCode: true,
            region: true
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
        },
        _count: {
          select: {
            items: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ deliveries })
  } catch (error) {
    console.error('Error fetching material deliveries:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/material-deliveries - สร้างการส่งมอบใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized - HeadOffice access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      deliveryDate,
      dealerId,
      notes,
      items // Array ของ { rawMaterialId, batchId, batchNumber, quantity, unit }
    } = body

    // ตรวจสอบว่าตัวแทนจำหน่ายมีอยู่หรือไม่
    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId }
    })

    if (!dealer) {
      return NextResponse.json(
        { error: 'Dealer not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบสต็อก Batch ทั้งหมด
    for (const item of items) {
      // ต้องมี batchId
      if (!item.batchId) {
        return NextResponse.json(
          { error: 'Batch ID is required for each item' },
          { status: 400 }
        )
      }

      const batch = await prisma.rawMaterialBatch.findUnique({
        where: { id: item.batchId },
        include: {
          rawMaterial: true
        }
      })

      if (!batch) {
        return NextResponse.json(
          { error: `Batch not found: ${item.batchId}` },
          { status: 404 }
        )
      }

      if (batch.currentStock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${batch.rawMaterial.materialName} (Batch: ${batch.batchNumber}). Available: ${batch.currentStock}, Required: ${item.quantity}` },
          { status: 400 }
        )
      }
    }

    // สร้างเลขที่การส่งมอบ (DEL-YYYYMMDD-XXX)
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')

    // หาเลขที่ล่าสุดของวันนี้
    const lastDelivery = await prisma.materialDelivery.findFirst({
      where: {
        deliveryNumber: {
          startsWith: `DEL-${dateStr}-`
        }
      },
      orderBy: {
        deliveryNumber: 'desc'
      }
    })

    let nextNumber = '001'
    if (lastDelivery) {
      const lastNum = parseInt(lastDelivery.deliveryNumber.split('-')[2])
      nextNumber = (lastNum + 1).toString().padStart(3, '0')
    }

    const deliveryNumber = `DEL-${dateStr}-${nextNumber}`

    // สร้างการส่งมอบพร้อมรายการ และตัดสต็อกจาก Batch (ใช้ Transaction)
    const newDelivery = await prisma.$transaction(async (tx) => {
      // สร้างการส่งมอบ
      const delivery = await tx.materialDelivery.create({
        data: {
          deliveryNumber,
          deliveryDate: new Date(deliveryDate),
          dealerId,
          status: 'PENDING_RECEIPT', // รอดีลเลอร์รับเข้า
          notes,
          totalItems: items.length,
          items: {
            create: items.map((item: any) => ({
              rawMaterialId: item.rawMaterialId,
              batchId: item.batchId,
              batchNumber: item.batchNumber,
              quantity: parseFloat(item.quantity),
              unit: item.unit
            }))
          }
        },
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

      // ตัดสต็อกจาก Batch และอัปเดตสต็อกวัตถุดิบ
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

        // ตัดสต็อกจากวัตถุดิบด้วย
        await tx.rawMaterial.update({
          where: { id: item.rawMaterialId },
          data: {
            currentStock: {
              decrement: quantity
            }
          }
        })
      }

      return delivery
    })

    return NextResponse.json(
      {
        message: 'Material delivery created successfully',
        delivery: newDelivery
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating material delivery:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}