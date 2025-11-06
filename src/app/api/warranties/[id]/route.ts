import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Helper function to convert dd/mm/yyyy to Date
function parseDateDDMMYYYY(dateString: string): Date | null {
  if (!dateString) return null

  // Check if it's already in ISO format (yyyy-mm-dd)
  if (dateString.includes('-')) {
    return new Date(dateString)
  }

  // Parse dd/mm/yyyy format
  const parts = dateString.split('/')
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1 // months are 0-indexed in JS
    const year = parseInt(parts[2], 10)
    return new Date(year, month, day)
  }

  return null
}

// GET /api/warranties/[id] - ดึงข้อมูลใบรับประกันคนเดียว
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const params = await props.params
    const warranty = await prisma.warranty.findUnique({
      where: { id: params.id },
      include: {
        dealer: {
          select: {
            id: true,
            dealerCode: true,
            dealerName: true,
            manufacturerNumber: true,
            address: true,
            phoneNumber: true
          }
        },
        subDealer: {
          select: {
            id: true,
            name: true,
            phoneNumber: true
          }
        },
        product: true
      }
    })

    if (!warranty) {
      return NextResponse.json(
        { error: 'Warranty not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบสิทธิ์การเข้าถึง
    if (session.user.userGroup === 'Dealer' && session.user.dealerId !== warranty.dealerId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // เพิ่มสถานะและข้อมูลเพิ่มเติม
    const warrantyWithStatus = {
      ...warranty,
      status: new Date(warranty.expiryDate) >= new Date() ? 'active' : 'expired',
      daysRemaining: Math.ceil((new Date(warranty.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      isNearExpiry: Math.ceil((new Date(warranty.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 30
    }

    return NextResponse.json({ warranty: warrantyWithStatus })
  } catch (error) {
    console.error('Error fetching warranty:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/warranties/[id] - แก้ไขข้อมูลใบรับประกัน
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const params = await props.params
    const body = await request.json()
    const {
      warrantyNumber,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      warrantyDate,
      warrantyPeriodMonths,
      warrantyTerms,
      // ฟิลด์ใหม่
      dealerName,
      subDealerId,     // เพิ่ม: ID ของผู้ขายรายย่อย
      productionDate,
      deliveryDate,
      purchaseOrderNo,
      installationArea,
      thickness,
      chemicalBatchNo,
      materialUsage,  // เพิ่ม: ข้อมูลวัตถุดิบที่ใช้ (JSON string)
      editReason       // เพิ่ม: เหตุผลการแก้ไข (สำหรับกรณีเกิน 5 วัน)
    } = body

    // ตรวจสอบว่าใบรับประกันมีอยู่หรือไม่
    const existingWarranty = await prisma.warranty.findUnique({
      where: { id: params.id }
    })

    if (!existingWarranty) {
      return NextResponse.json(
        { error: 'Warranty not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบสิทธิ์การเข้าถึง
    if (session.user.userGroup === 'Dealer' && session.user.dealerId !== existingWarranty.dealerId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // ========== ระบบควบคุมการแก้ไข ==========

    // 1. คำนวณจำนวนวันที่ผ่านไปนับจากวันที่ออกใบรับประกัน
    const warrantyDateObj = new Date(existingWarranty.warrantyDate)
    const today = new Date()
    const daysPassed = Math.floor((today.getTime() - warrantyDateObj.getTime()) / (1000 * 60 * 60 * 24))
    const daysLeft = 5 - daysPassed
    const isWithin5Days = daysLeft >= 0

    // 2. ตรวจสอบว่าแก้ไขไปแล้วหรือไม่
    if (existingWarranty.isEdited) {
      return NextResponse.json(
        {
          error: 'ไม่สามารถแก้ไขได้ เนื่องจากแก้ไขไปแล้ว 1 ครั้ง',
          errorCode: 'ALREADY_EDITED',
          editedAt: existingWarranty.editedAt,
          editedBy: existingWarranty.editedBy
        },
        { status: 403 }
      )
    }

    // 3. ถ้าเกิน 5 วัน ต้องกรอกเหตุผลการแก้ไข
    if (!isWithin5Days && !editReason) {
      return NextResponse.json(
        {
          error: 'กรุณาระบุเหตุผลการแก้ไข (เนื่องจากเกินระยะเวลา 5 วันแล้ว)',
          errorCode: 'EDIT_REASON_REQUIRED',
          daysLeft: daysLeft,
          requiresApproval: true
        },
        { status: 400 }
      )
    }

    // ========================================

    // ตรวจสอบว่า warrantyNumber ซ้ำหรือไม่ (ยกเว้นใบรับประกันปัจจุบัน)
    if (warrantyNumber !== existingWarranty.warrantyNumber) {
      const duplicateWarranty = await prisma.warranty.findUnique({
        where: { warrantyNumber }
      })

      if (duplicateWarranty) {
        return NextResponse.json(
          { error: 'Warranty number already exists' },
          { status: 400 }
        )
      }
    }

    // คำนวณวันหมดอายุใหม่
    const warrantyStartDate = new Date(warrantyDate)
    const expiryDate = new Date(warrantyStartDate)
    expiryDate.setMonth(expiryDate.getMonth() + parseInt(warrantyPeriodMonths))

    // สร้างข้อมูล changesSummary สำหรับ audit trail
    const changes: string[] = []
    if (customerName !== existingWarranty.customerName) changes.push('ชื่อลูกค้า')
    if (customerPhone !== existingWarranty.customerPhone) changes.push('เบอร์โทรลูกค้า')
    if (customerAddress !== existingWarranty.customerAddress) changes.push('ที่อยู่')
    if (warrantyDate !== existingWarranty.warrantyDate.toISOString().split('T')[0]) changes.push('วันที่ออกใบรับประกัน')
    if (parseInt(warrantyPeriodMonths) !== existingWarranty.warrantyPeriodMonths) changes.push('ระยะเวลารับประกัน')

    const changesSummary = changes.length > 0 ? `แก้ไข: ${changes.join(', ')}` : 'ไม่มีการเปลี่ยนแปลง'

    // อัพเดทใบรับประกันและสร้าง history พร้อมกัน
    const updatedWarranty = await prisma.warranty.update({
      where: { id: params.id },
      data: {
        warrantyNumber,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        warrantyDate: warrantyStartDate,
        expiryDate,
        warrantyPeriodMonths: parseInt(warrantyPeriodMonths),
        warrantyTerms,
        // ฟิลด์ใหม่
        dealerName,
        subDealerId: subDealerId || null,  // เพิ่ม: ID ของผู้ขายรายย่อย (optional)
        productionDate: parseDateDDMMYYYY(productionDate),
        deliveryDate: parseDateDDMMYYYY(deliveryDate),
        purchaseOrderNo,
        installationArea: installationArea ? parseFloat(installationArea) : null,
        thickness: thickness ? parseFloat(thickness) : null,
        chemicalBatchNo,
        materialUsage,  // เพิ่ม: บันทึกข้อมูลวัตถุดิบที่ใช้ (แต่ไม่หักสต็อกเมื่ออัปเดต)

        // อัพเดทสถานะการแก้ไข
        isEdited: true,
        editedAt: new Date(),
        editedBy: session.user.username || session.user.email || 'Unknown',

        // ระบบอนุมัติการแก้ไข
        editApproved: isWithin5Days,  // อนุมัติอัตโนมัติถ้าภายใน 5 วัน
        editReason: editReason || null,  // บันทึกเหตุผลการแก้ไข (ถ้ามี)

        // สร้าง history record
        history: {
          create: {
            editedBy: session.user.username || session.user.email || 'Unknown',
            editedByName: session.user.name || session.user.username || 'Unknown',
            editedByGroup: session.user.userGroup || 'Unknown',
            changesSummary: changesSummary,
            oldData: JSON.stringify({
              warrantyNumber: existingWarranty.warrantyNumber,
              customerName: existingWarranty.customerName,
              customerPhone: existingWarranty.customerPhone,
              customerEmail: existingWarranty.customerEmail,
              customerAddress: existingWarranty.customerAddress,
              warrantyDate: existingWarranty.warrantyDate,
              warrantyPeriodMonths: existingWarranty.warrantyPeriodMonths
            }),
            newData: JSON.stringify({
              warrantyNumber,
              customerName,
              customerPhone,
              customerEmail,
              customerAddress,
              warrantyDate: warrantyStartDate,
              warrantyPeriodMonths: parseInt(warrantyPeriodMonths)
            }),
            reason: isWithin5Days
              ? 'แก้ไขข้อมูลใบรับประกันภายใน 5 วัน (อนุมัติอัตโนมัติ)'
              : `แก้ไขข้อมูลเกิน 5 วัน (รออนุมัติ) - เหตุผล: ${editReason}`
          }
        }
      },
      include: {
        dealer: {
          select: {
            id: true,
            dealerCode: true,
            dealerName: true,
            manufacturerNumber: true
          }
        },
        product: true
      }
    })

    // สร้างการแจ้งเตือนไปยัง HeadOffice ถ้าเกิน 5 วัน
    if (!isWithin5Days) {
      await prisma.headOfficeNotification.create({
        data: {
          warrantyId: params.id,
          dealerId: existingWarranty.dealerId,
          notificationType: 'EDIT_REQUEST',
          title: 'คำขอแก้ไขใบรับประกัน',
          message: `${session.user.name || session.user.username} ขอแก้ไขใบรับประกันเลขที่ ${warrantyNumber} (เกิน 5 วัน)`,
          editReason: editReason,
          isRead: false,
          status: 'PENDING'
        }
      })
    }

    // เพิ่มสถานะ
    const warrantyWithStatus = {
      ...updatedWarranty,
      status: new Date(updatedWarranty.expiryDate) >= new Date() ? 'active' : 'expired',
      daysRemaining: Math.ceil((new Date(updatedWarranty.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    }

    return NextResponse.json({
      message: isWithin5Days
        ? 'แก้ไขใบรับประกันสำเร็จ (อนุมัติอัตโนมัติ)'
        : 'ส่งคำขอแก้ไขใบรับประกันสำเร็จ รอ HeadOffice อนุมัติ',
      warranty: warrantyWithStatus,
      editInfo: {
        isFirstEdit: true,
        canEditAgain: false,
        editedAt: updatedWarranty.editedAt,
        editedBy: updatedWarranty.editedBy,
        editApproved: updatedWarranty.editApproved,
        editReason: updatedWarranty.editReason,
        requiresApproval: !isWithin5Days
      }
    })
  } catch (error) {
    console.error('Error updating warranty:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/warranties/[id] - ลบใบรับประกัน
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized - HeadOffice access required' },
        { status: 403 }
      )
    }

    const params = await props.params
    // ตรวจสอบว่าใบรับประกันมีอยู่หรือไม่
    const existingWarranty = await prisma.warranty.findUnique({
      where: { id: params.id }
    })

    if (!existingWarranty) {
      return NextResponse.json(
        { error: 'Warranty not found' },
        { status: 404 }
      )
    }

    await prisma.warranty.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      message: 'Warranty deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting warranty:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}