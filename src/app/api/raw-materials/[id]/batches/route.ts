import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/raw-materials/[id]/batches - ดึงรายการ Batch ของวัตถุดิบที่มีสต็อกเหลืออยู่
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

    // ตรวจสอบว่าวัตถุดิบมีอยู่หรือไม่
    const rawMaterial = await prisma.rawMaterial.findUnique({
      where: { id }
    })

    if (!rawMaterial) {
      return NextResponse.json(
        { error: 'Raw material not found' },
        { status: 404 }
      )
    }

    // ดึงรายการ Batch ที่มีสต็อกเหลืออยู่ เรียงจากเก่าไปใหม่ (FIFO)
    const batches = await prisma.rawMaterialBatch.findMany({
      where: {
        rawMaterialId: id,
        currentStock: {
          gt: 0 // มากกว่า 0
        },
        status: 'AVAILABLE'
      },
      include: {
        rawMaterial: {
          select: {
            materialCode: true,
            materialName: true,
            materialType: true
          }
        }
      },
      orderBy: {
        receivedDate: 'asc' // เรียงจากเก่าไปใหม่ (FIFO - First In First Out)
      }
    })

    return NextResponse.json({
      batches,
      totalBatches: batches.length,
      totalStock: batches.reduce((sum, batch) => sum + batch.currentStock, 0)
    })
  } catch (error) {
    console.error('Error fetching batches:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
