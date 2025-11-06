import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET - ดึงรายการ Incoming Materials สำหรับ Dealer
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let whereClause: any = {}

    // Filter by dealer if user is dealer
    if (session.user.userGroup === 'Dealer') {
      whereClause.dealerId = session.user.dealerId
    }

    // Filter by status
    if (status && status !== 'ALL') {
      whereClause.materialDelivery = {
        status: status
      }
    }

    // Search functionality
    if (search) {
      whereClause.OR = [
        { receiptNumber: { contains: search } },
        { materialDelivery: { deliveryNumber: { contains: search } } },
        { dealer: { dealerName: { contains: search } } }
      ]
    }

    const rawReceipts = await prisma.dealerReceipt.findMany({
      where: whereClause,
      include: {
        materialDelivery: {
          include: {
            items: {
              include: {
                rawMaterial: true
              }
            }
          }
        },
        dealer: true,
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Filter receipts to ensure all delivery items have valid rawMaterial
    const receipts = rawReceipts.filter(receipt => {
      const hasValidItems = receipt.materialDelivery.items.every(item => item.rawMaterial !== null)
      if (!hasValidItems) {
        console.warn(`Receipt ${receipt.receiptNumber} has delivery items with missing rawMaterial data`)
      }
      return hasValidItems
    })

    // Get pending deliveries (ที่ยังไม่มี receipt)
    let pendingDeliveries: any[] = []
    if (session.user.userGroup === 'Dealer' && session.user.dealerId) {
      const rawDeliveries = await prisma.materialDelivery.findMany({
        where: {
          dealerId: session.user.dealerId,
          status: 'PENDING_RECEIPT', // รอดีลเลอร์รับเข้า
          dealerReceipt: null // ยังไม่มี receipt
        },
        include: {
          dealer: true,
          items: {
            include: {
              rawMaterial: true
            }
          }
        },
        orderBy: {
          deliveryDate: 'desc'
        }
      })

      // Filter out deliveries with invalid items (missing rawMaterial)
      pendingDeliveries = rawDeliveries.filter(delivery => {
        // ตรวจสอบว่าทุก item มี rawMaterial หรือไม่
        const hasValidItems = delivery.items.every(item => item.rawMaterial !== null)
        if (!hasValidItems) {
          console.warn(`Delivery ${delivery.deliveryNumber} has items with missing rawMaterial data`)
        }
        return hasValidItems
      })
    } else if (session.user.userGroup === 'HeadOffice') {
      // HeadOffice สามารถดู pending deliveries ทั้งหมด
      const rawDeliveries = await prisma.materialDelivery.findMany({
        where: {
          status: 'PENDING_RECEIPT', // รอดีลเลอร์รับเข้า
          dealerReceipt: null
        },
        include: {
          dealer: true,
          items: {
            include: {
              rawMaterial: true
            }
          }
        },
        orderBy: {
          deliveryDate: 'desc'
        }
      })

      // Filter out deliveries with invalid items
      pendingDeliveries = rawDeliveries.filter(delivery => {
        const hasValidItems = delivery.items.every(item => item.rawMaterial !== null)
        if (!hasValidItems) {
          console.warn(`Delivery ${delivery.deliveryNumber} has items with missing rawMaterial data`)
        }
        return hasValidItems
      })
    }

    return NextResponse.json({
      receipts,
      pendingDeliveries,
      success: true
    })
  } catch (error) {
    console.error('Error fetching dealer receipts:', error)
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูลการรับเข้าวัตถุดิบได้' },
      { status: 500 }
    )
  }
}

// POST - สร้าง Dealer Receipt ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // เฉพาะ Dealer เท่านั้นที่สามารถสร้าง receipt ได้
    if (session.user.userGroup !== 'Dealer' || !session.user.dealerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ensure dealerId is defined (TypeScript type guard)
    const dealerId = session.user.dealerId
    if (!dealerId) {
      return NextResponse.json({ error: 'Dealer ID not found' }, { status: 403 })
    }

    const body = await request.json()
    const {
      materialDeliveryId,
      receiptDate,
      receivedBy,
      notes,
      items
    } = body

    // Validation
    if (!materialDeliveryId || !receiptDate || !receivedBy || !items || items.length === 0) {
      console.error('Validation failed:', { materialDeliveryId, receiptDate, receivedBy, itemsLength: items?.length })
      return NextResponse.json({
        error: 'ข้อมูลไม่ครบถ้วน กรุณากรอกข้อมูลให้ครบทุกช่อง'
      }, { status: 400 })
    }

    // Check if delivery exists and belongs to this dealer
    const delivery = await prisma.materialDelivery.findFirst({
      where: {
        id: materialDeliveryId,
        dealerId: dealerId,
        status: 'PENDING_RECEIPT' // ต้องเป็นสถานะรอรับเข้า
      }
    })

    if (!delivery) {
      return NextResponse.json({
        error: 'ไม่พบการส่งมอบหรือการส่งมอบไม่ได้อยู่ในสถานะที่สามารถรับได้'
      }, { status: 404 })
    }

    // Check if receipt already exists
    const existingReceipt = await prisma.dealerReceipt.findFirst({
      where: { materialDeliveryId }
    })

    if (existingReceipt) {
      return NextResponse.json({
        error: 'การส่งมอบนี้ได้มีการรับเข้าแล้ว'
      }, { status: 400 })
    }

    // Generate receipt number
    const currentDate = new Date()
    const dateStr = currentDate.toISOString().slice(0, 10).replace(/-/g, '')

    const lastReceipt = await prisma.dealerReceipt.findFirst({
      where: {
        receiptNumber: {
          contains: `RCP-${dealerId}-${dateStr}`
        }
      },
      orderBy: { receiptNumber: 'desc' }
    })

    let runningNumber = 1
    if (lastReceipt) {
      const lastNumber = parseInt(lastReceipt.receiptNumber.split('-').pop() || '0')
      runningNumber = lastNumber + 1
    }

    const receiptNumber = `RCP-${dealerId}-${dateStr}-${String(runningNumber).padStart(3, '0')}`

    // Create receipt with items and update dealer stock
    const result = await prisma.$transaction(async (tx) => {
      // Create receipt
      const receipt = await tx.dealerReceipt.create({
        data: {
          receiptNumber,
          materialDeliveryId,
          dealerId: dealerId,
          receiptDate: new Date(receiptDate),
          receivedBy,
          notes
        }
      })

      // Create receipt items and update dealer stock
      for (const item of items) {
        // ดึงข้อมูล rawMaterial
        const rawMaterial = await tx.rawMaterial.findUnique({
          where: { id: item.rawMaterialId }
        })

        if (!rawMaterial) {
          throw new Error(`ไม่พบวัตถุดิบ ID: ${item.rawMaterialId}`)
        }

        // ดึงข้อมูล batch เพื่อเอา expiryDate
        const batch = await tx.rawMaterialBatch.findFirst({
          where: {
            rawMaterialId: item.rawMaterialId,
            batchNumber: item.batchNumber
          }
        })

        // Create receipt item
        await tx.dealerReceiptItem.create({
          data: {
            receiptId: receipt.id,
            rawMaterialId: item.rawMaterialId,
            batchNumber: item.batchNumber,
            quantity: item.quantity,
            unit: item.unit,
            receivedQuantity: item.receivedQuantity
          }
        })

        // Update or create dealer stock
        const existingStock = await tx.dealerStock.findFirst({
          where: {
            dealerId: session.user.dealerId,
            materialCode: rawMaterial.materialCode,
            batchNumber: item.batchNumber
          }
        })

        if (existingStock) {
          await tx.dealerStock.update({
            where: { id: existingStock.id },
            data: {
              currentStock: {
                increment: item.receivedQuantity
              },
              expiryDate: batch?.expiryDate, // อัปเดต expiryDate ด้วย
              lastUpdated: new Date()
            }
          })
        } else {
          await tx.dealerStock.create({
            data: {
              dealerId: session.user.dealerId,
              materialCode: rawMaterial.materialCode,
              materialName: rawMaterial.materialName,
              materialType: rawMaterial.materialType,
              batchNumber: item.batchNumber,
              currentStock: item.receivedQuantity,
              unit: item.unit,
              expiryDate: batch?.expiryDate, // บันทึก expiryDate จาก batch
              lastUpdated: new Date()
            }
          })
        }
      }

      // Update MaterialDelivery status to DELIVERED (เปลี่ยนจาก PENDING_RECEIPT -> DELIVERED)
      await tx.materialDelivery.update({
        where: { id: materialDeliveryId },
        data: {
          status: 'DELIVERED'
        }
      })

      return receipt
    })

    return NextResponse.json({
      success: true,
      receipt: result,
      message: 'รับเข้าวัตถุดิบเรียบร้อยแล้ว'
    })

  } catch (error: any) {
    console.error('Error creating dealer receipt:', error)

    // Provide more detailed error message for debugging
    const errorMessage = error?.message || error?.toString() || 'ไม่สามารถสร้างการรับเข้าวัตถุดิบได้'
    console.error('Detailed error:', errorMessage)

    return NextResponse.json(
      {
        error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}