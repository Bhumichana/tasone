import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// ฟังก์ชันสร้างเลขที่ใบรับเข้า
async function generateReceivingNumber(): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

  // หาการรับเข้าล่าสุดในวันนี้
  const lastReceiving = await prisma.rawMaterialReceiving.findFirst({
    where: {
      receivingNumber: {
        startsWith: `HQ-RCV-${dateStr}`
      }
    },
    orderBy: {
      receivingNumber: 'desc'
    }
  })

  let sequence = 1
  if (lastReceiving) {
    const lastSequence = parseInt(lastReceiving.receivingNumber.split('-')[3])
    sequence = lastSequence + 1
  }

  return `HQ-RCV-${dateStr}-${sequence.toString().padStart(3, '0')}`
}

// GET /api/raw-material-receiving - ดึงรายการการรับเข้าวัตถุดิบ
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // ตรวจสอบสิทธิ์ - เฉพาะ HeadOffice เท่านั้น
    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Access denied. Head Office only.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where: any = {}

    // ค้นหาตามข้อความ
    if (search) {
      where.OR = [
        { receivingNumber: { contains: search } },
        { supplier: { contains: search } },
        { batchNumber: { contains: search } },
        { purchaseOrderNo: { contains: search } },
        { rawMaterial: { materialName: { contains: search } } }
      ]
    }

    // กรองตามสถานะ
    if (status) {
      where.qualityStatus = status
    }

    // กรองตามช่วงวันที่
    if (dateFrom || dateTo) {
      where.receivingDate = {}
      if (dateFrom) {
        where.receivingDate.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.receivingDate.lte = new Date(dateTo)
      }
    }

    const receivings = await prisma.rawMaterialReceiving.findMany({
      where,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ receivings })
  } catch (error) {
    console.error('Error fetching receivings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/raw-material-receiving - สร้างการรับเข้าใหม่
export async function POST(request: NextRequest) {
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
      qualityStatus = 'PENDING'
    } = body

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!receivingDate || !supplier || !rawMaterialId || !batchNumber || !receivedQuantity || !storageLocation) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่าวัตถุดิบมีอยู่หรือไม่
    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id: rawMaterialId }
    })

    if (!rawMaterial) {
      return NextResponse.json(
        { error: 'Raw material not found' },
        { status: 400 }
      )
    }

    // ตรวจสอบปริมาณ
    if (receivedQuantity <= 0) {
      return NextResponse.json(
        { error: 'Received quantity must be greater than 0' },
        { status: 400 }
      )
    }

    // สร้างเลขที่ใบรับเข้า
    const receivingNumber = await generateReceivingNumber()

    // สร้างการรับเข้าใหม่
    const newReceiving = await prisma.rawMaterialReceiving.create({
      data: {
        receivingNumber,
        receivingDate: new Date(receivingDate),
        purchaseOrderNo,
        supplier,
        rawMaterialId,
        batchNumber,
        receivedQuantity: parseFloat(receivedQuantity),
        storageLocation,
        notes,
        qualityStatus,
        receivedBy: `${session.user.firstName} ${session.user.lastName}`
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

    // อัปเดตสต็อกวัตถุดิบ (เฉพาะเมื่อสถานะเป็น APPROVED)
    if (qualityStatus === 'APPROVED') {
      await prisma.rawMaterial.update({
        where: { id: rawMaterialId },
        data: {
          currentStock: {
            increment: parseFloat(receivedQuantity)
          }
        }
      })
    }

    return NextResponse.json(
      {
        message: 'Raw material receiving created successfully',
        receiving: newReceiving
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating receiving:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}