import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST /api/warehouse-stock/[id]/recertify - ต่ออายุวัตถุดิบของ HeadOffice
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params

    // ดึงข้อมูล RawMaterialBatch
    const batch = await prisma.rawMaterialBatch.findUnique({
      where: { id },
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
    })

    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบว่ามีสต็อกหรือไม่
    if (batch.currentStock <= 0) {
      return NextResponse.json(
        { error: 'Batch has no stock remaining' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่ามีวันหมดอายุหรือไม่
    if (!batch.expiryDate) {
      return NextResponse.json(
        { error: 'Batch has no expiry date' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่าหมดอายุแล้วหรือยัง
    const now = new Date()
    const expiryDate = new Date(batch.expiryDate)

    if (expiryDate >= now) {
      return NextResponse.json(
        { error: 'Batch has not expired yet' },
        { status: 400 }
      )
    }

    // คำนวณวันหมดอายุใหม่ (+60 วัน จากวันหมดอายุเดิม)
    const oldExpiryDate = new Date(batch.expiryDate)
    const newExpiryDate = new Date(oldExpiryDate)
    newExpiryDate.setDate(newExpiryDate.getDate() + 60)

    // อัปเดต RawMaterialBatch
    const updatedBatch = await prisma.rawMaterialBatch.update({
      where: { id },
      data: {
        // อัปเดตวันหมดอายุและสถานะ
        expiryDate: newExpiryDate,
        status: 'AVAILABLE', // เปลี่ยนจาก EXPIRED เป็น AVAILABLE

        // อัปเดตข้อมูลการต่ออายุ
        isRecertified: true,
        recertificationCount: { increment: 1 },
        lastRecertifiedAt: new Date(),
        lastRecertifiedBy: session.user.username || session.user.email || 'Unknown',

        // อัปเดตเวลาที่แก้ไขล่าสุด
        updatedAt: new Date()
      },
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
    })

    return NextResponse.json({
      success: true,
      message: 'ต่ออายุวัตถุดิบสำเร็จ',
      batch: updatedBatch,
      recertification: {
        oldExpiryDate: oldExpiryDate.toISOString(),
        newExpiryDate: newExpiryDate.toISOString(),
        extendedDays: 60,
        recertificationCount: updatedBatch.recertificationCount
      }
    })
  } catch (error) {
    console.error('Error recertifying batch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
