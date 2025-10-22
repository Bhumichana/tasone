import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - ดึงรายละเอียด Dealer Receipt
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let whereClause: any = { id: params.id }

    // Filter by dealer if user is dealer
    if (session.user.userGroup === 'Dealer' && session.user.dealerId) {
      whereClause.dealerId = session.user.dealerId
    }

    const receipt = await prisma.dealerReceipt.findFirst({
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
      }
    })

    if (!receipt) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลการรับเข้าวัตถุดิบ' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      receipt,
      success: true
    })
  } catch (error) {
    console.error('Error fetching dealer receipt:', error)
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูลการรับเข้าวัตถุดิบได้' },
      { status: 500 }
    )
  }
}

// PUT - อัปเดต Dealer Receipt
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // เฉพาะ Dealer เท่านั้นที่สามารถแก้ไข receipt ได้
    if (session.user.userGroup !== 'Dealer' || !session.user.dealerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { receiptDate, receivedBy, notes } = body

    // Check if receipt exists and belongs to this dealer
    const existingReceipt = await prisma.dealerReceipt.findFirst({
      where: {
        id: params.id,
        dealerId: session.user.dealerId
      }
    })

    if (!existingReceipt) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลการรับเข้าวัตถุดิบ' },
        { status: 404 }
      )
    }

    const updatedReceipt = await prisma.dealerReceipt.update({
      where: { id: params.id },
      data: {
        receiptDate: receiptDate ? new Date(receiptDate) : undefined,
        receivedBy: receivedBy || undefined,
        notes: notes || undefined,
        updatedAt: new Date()
      },
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
      }
    })

    return NextResponse.json({
      success: true,
      receipt: updatedReceipt,
      message: 'อัปเดตข้อมูลการรับเข้าวัตถุดิบเรียบร้อยแล้ว'
    })

  } catch (error) {
    console.error('Error updating dealer receipt:', error)
    return NextResponse.json(
      { error: 'ไม่สามารถอัปเดตข้อมูลการรับเข้าวัตถุดิบได้' },
      { status: 500 }
    )
  }
}

// DELETE - ลบ Dealer Receipt
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // เฉพาะ HeadOffice เท่านั้นที่สามารถลบ receipt ได้
    if (session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existingReceipt = await prisma.dealerReceipt.findUnique({
      where: { id: params.id },
      include: {
        items: true
      }
    })

    if (!existingReceipt) {
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลการรับเข้าวัตถุดิบ' },
        { status: 404 }
      )
    }

    // Delete receipt and reverse stock changes
    await prisma.$transaction(async (tx) => {
      // Reverse dealer stock changes
      for (const item of existingReceipt.items) {
        const stock = await tx.dealerStock.findFirst({
          where: {
            dealerId: existingReceipt.dealerId,
            materialCode: item.rawMaterialId, // This should be material code
            batchNumber: item.batchNumber
          }
        })

        if (stock) {
          const newStock = Math.max(0, stock.currentStock - item.receivedQuantity)

          if (newStock === 0) {
            await tx.dealerStock.delete({
              where: { id: stock.id }
            })
          } else {
            await tx.dealerStock.update({
              where: { id: stock.id },
              data: {
                currentStock: newStock,
                lastUpdated: new Date()
              }
            })
          }
        }
      }

      // Delete receipt items
      await tx.dealerReceiptItem.deleteMany({
        where: { receiptId: params.id }
      })

      // Delete receipt
      await tx.dealerReceipt.delete({
        where: { id: params.id }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'ลบการรับเข้าวัตถุดิบเรียบร้อยแล้ว'
    })

  } catch (error) {
    console.error('Error deleting dealer receipt:', error)
    return NextResponse.json(
      { error: 'ไม่สามารถลบการรับเข้าวัตถุดิบได้' },
      { status: 500 }
    )
  }
}