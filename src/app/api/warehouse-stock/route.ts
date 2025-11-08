import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/warehouse-stock - ดึงข้อมูลสต็อกวัตถุดิบที่ HeadOffice (แยกตาม Batch)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // ตรวจสอบสิทธิ์: เฉพาะ HeadOffice เท่านั้น
    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized - HeadOffice access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const materialId = searchParams.get('materialId')
    const status = searchParams.get('status')
    const lowStock = searchParams.get('lowStock')

    // สร้าง where clause
    const where: any = {}

    // ค้นหาตาม batch number, material code, material name
    if (search) {
      where.OR = [
        { batchNumber: { contains: search, mode: 'insensitive' } },
        { rawMaterial: { materialCode: { contains: search, mode: 'insensitive' } } },
        { rawMaterial: { materialName: { contains: search, mode: 'insensitive' } } },
        { supplier: { contains: search, mode: 'insensitive' } }
      ]
    }

    // กรองตาม material
    if (materialId) {
      where.rawMaterialId = materialId
    }

    // กรองตามสถานะ
    if (status) {
      where.status = status
    }

    // กรองสต็อกต่ำ (< 10)
    if (lowStock === 'true') {
      where.currentStock = { lt: 10, gt: 0 }
    } else {
      // กรองเฉพาะ batch ที่ยังมีสต็อกเหลืออยู่
      where.currentStock = { gt: 0 }
    }

    // ดึงข้อมูล Batch ทั้งหมด
    const batches = await prisma.rawMaterialBatch.findMany({
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
      orderBy: [
        { expiryDate: 'asc' }, // เรียงตามวันหมดอายุก่อน
        { receivedDate: 'desc' } // แล้วตามวันที่รับเข้า
      ]
    })

    // คำนวณสถิติ
    const now = new Date()

    const stats = {
      totalBatches: batches.length,
      totalStock: batches.reduce((sum, batch) => sum + batch.currentStock, 0),
      totalValue: 0, // สามารถเพิ่มการคำนวณมูลค่าได้ในอนาคต
      expiredBatches: batches.filter(b => b.expiryDate && new Date(b.expiryDate) < now && b.currentStock > 0).length,
      lowStockBatches: batches.filter(b => b.currentStock > 0 && b.currentStock < 10).length,
      zeroStockBatches: batches.filter(b => b.currentStock === 0).length,
      availableBatches: batches.filter(b => b.status === 'AVAILABLE' && b.currentStock > 0).length
    }

    // จัดกลุ่มตาม Material
    const groupedByMaterial = batches.reduce((acc: any, batch) => {
      const materialCode = batch.rawMaterial.materialCode
      if (!acc[materialCode]) {
        acc[materialCode] = {
          material: batch.rawMaterial,
          batches: [],
          totalStock: 0
        }
      }
      acc[materialCode].batches.push(batch)
      acc[materialCode].totalStock += batch.currentStock
      return acc
    }, {})

    const materialSummary = Object.values(groupedByMaterial)

    return NextResponse.json({
      batches,
      stats,
      materialSummary,
      total: batches.length
    })
  } catch (error) {
    console.error('Error fetching warehouse stock:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
