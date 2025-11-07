import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST /api/warranties/[id]/approve-edit - อนุมัติหรือปฏิเสธการแก้ไข (HeadOffice only)
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    // ตรวจสอบว่าเป็น HeadOffice เท่านั้น
    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized - HeadOffice access required' },
        { status: 403 }
      )
    }

    const params = await props.params
    const body = await request.json()
    const { approved, approvalNote } = body

    // ตรวจสอบว่ามีค่า approved
    if (typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'กรุณาระบุสถานะการอนุมัติ (approved: true/false)' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่าใบรับประกันมีอยู่หรือไม่
    const warranty = await prisma.warranty.findUnique({
      where: { id: params.id },
      include: {
        dealer: {
          select: {
            id: true,
            dealerName: true
          }
        }
      }
    })

    if (!warranty) {
      return NextResponse.json(
        { error: 'ไม่พบใบรับประกัน' },
        { status: 404 }
      )
    }

    // ตรวจสอบว่าใบรับประกันนี้มีคำขอแก้ไขหรือไม่
    if (!warranty.isEdited || warranty.editApproved) {
      return NextResponse.json(
        { error: 'ใบรับประกันนี้ไม่มีคำขอแก้ไขที่รออนุมัติ' },
        { status: 400 }
      )
    }

    // ดึง materialUsage เดิมจาก history (materialUsage ก่อนแก้ไข)
    // เพื่อนำมาคืนสต็อกเมื่ออนุมัติ
    const latestHistory = await prisma.warrantyHistory.findFirst({
      where: {
        warrantyId: params.id,
        changesSummary: {
          contains: 'แก้ไข'
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    let oldMaterialUsage: string | null = null
    if (latestHistory && latestHistory.oldData) {
      try {
        const oldData = JSON.parse(latestHistory.oldData)
        oldMaterialUsage = oldData.materialUsage || null
      } catch (e) {
        console.error('Error parsing oldData from history:', e)
      }
    }

    // อัปเดตสถานะการอนุมัติ
    const updatedWarranty = await prisma.warranty.update({
      where: { id: params.id },
      data: {
        editApproved: approved,
        editApprovedAt: new Date(),
        editApprovedBy: session.user.username || session.user.email || 'Unknown',
        approvalNote: approvalNote || null,

        // สร้าง history record สำหรับการอนุมัติ
        history: {
          create: {
            editedBy: session.user.username || session.user.email || 'Unknown',
            editedByName: session.user.name || session.user.username || 'Unknown',
            editedByGroup: session.user.userGroup || 'Unknown',
            changesSummary: approved
              ? 'อนุมัติการแก้ไขใบรับประกัน'
              : 'ปฏิเสธการแก้ไขใบรับประกัน',
            oldData: JSON.stringify({
              editApproved: warranty.editApproved
            }),
            newData: JSON.stringify({
              editApproved: approved
            }),
            reason: approvalNote || (approved ? 'อนุมัติการแก้ไข' : 'ปฏิเสธการแก้ไข')
          }
        }
      },
      include: {
        dealer: {
          select: {
            id: true,
            dealerCode: true,
            dealerName: true
          }
        },
        product: true
      }
    })

    // ========== การจัดการสต็อกวัตถุดิบ (เมื่ออนุมัติ) ==========
    if (approved && oldMaterialUsage && updatedWarranty.materialUsage) {
      try {
        console.log('🔄 [Approve Edit] Starting stock management...')

        // STEP 1: คืนสต็อกเดิมกลับเข้าคลัง
        const oldMaterials = JSON.parse(oldMaterialUsage)
        console.log('  → Restoring old stock from previous warranty...')

        for (const material of oldMaterials) {
          const { materialCode, batches } = material

          if (!materialCode || !batches || batches.length === 0) {
            continue
          }

          for (const batchAllocation of batches) {
            const { batchId, batchNumber, quantityUsed } = batchAllocation

            if (!batchId || !batchNumber) {
              continue
            }

            const dealerStock = await prisma.dealerStock.findFirst({
              where: {
                id: batchId,
                dealerId: updatedWarranty.dealerId,
                materialCode: materialCode,
                batchNumber: batchNumber
              }
            })

            if (dealerStock) {
              await prisma.dealerStock.update({
                where: { id: dealerStock.id },
                data: {
                  currentStock: {
                    increment: quantityUsed
                  }
                }
              })
              console.log(`  ✓ Restored ${quantityUsed} to ${materialCode} (Batch: ${batchNumber})`)
            }
          }
        }

        // STEP 2: ตัดสต็อกใหม่
        const newMaterials = JSON.parse(updatedWarranty.materialUsage)
        console.log('  → Deducting new stock...')

        for (const material of newMaterials) {
          const { materialCode, batches } = material

          if (!materialCode || !batches || batches.length === 0) {
            continue
          }

          for (const batchAllocation of batches) {
            const { batchId, batchNumber, quantityUsed } = batchAllocation

            if (!batchId || !batchNumber) {
              continue
            }

            const dealerStock = await prisma.dealerStock.findFirst({
              where: {
                id: batchId,
                dealerId: updatedWarranty.dealerId,
                materialCode: materialCode,
                batchNumber: batchNumber
              }
            })

            if (dealerStock) {
              await prisma.dealerStock.update({
                where: { id: dealerStock.id },
                data: {
                  currentStock: {
                    decrement: quantityUsed
                  }
                }
              })
              console.log(`  ✓ Deducted ${quantityUsed} from ${materialCode} (Batch: ${batchNumber})`)
            }
          }
        }

        console.log('✓ [Approve Edit] Stock management completed successfully')
      } catch (error) {
        console.error('❌ [Approve Edit] Error managing stock:', error)
        // Note: การ approve แล้ว แต่อาจมีปัญหาในการจัดการสต็อก
      }
    }

    // อัปเดตสถานะการแจ้งเตือน
    await prisma.headOfficeNotification.updateMany({
      where: {
        warrantyId: params.id,
        notificationType: 'EDIT_REQUEST',
        status: 'PENDING'
      },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        isRead: true,
        resolvedAt: new Date(),
        resolvedBy: session.user.username || session.user.email || 'Unknown',
        resolvedNote: approvalNote || null
      }
    })

    return NextResponse.json({
      message: approved
        ? 'อนุมัติการแก้ไขใบรับประกันสำเร็จ'
        : 'ปฏิเสธการแก้ไขใบรับประกันสำเร็จ',
      warranty: updatedWarranty,
      approved: approved,
      approvalNote: approvalNote
    })
  } catch (error) {
    console.error('Error approving warranty edit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
