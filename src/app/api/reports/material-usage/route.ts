import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/reports/material-usage - รายงานการใช้วัตถุดิบ
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const dealerId = searchParams.get('dealerId')
    const reportType = searchParams.get('type') || 'สรุปการใช้งาน'

    // สร้าง date range
    const dateFilter: any = {}
    if (startDate) {
      dateFilter.gte = new Date(startDate)
    }
    if (endDate) {
      const endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999)
      dateFilter.lte = endDateTime
    }

    // สร้าง where condition สำหรับ Warranty
    const where: any = {}

    // กรองตาม dealer (ถ้าเป็น Dealer ให้ดูเฉพาะของตัวเอง)
    if (session.user.userGroup === 'Dealer' && session.user.dealerId) {
      where.dealerId = session.user.dealerId
    } else if (dealerId && dealerId !== 'all' && session.user.userGroup === 'HeadOffice') {
      where.dealerId = dealerId
    }

    // กรองตาม date range
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter
    }

    // กรองเฉพาะใบรับประกันที่มี materialUsage
    where.materialUsage = { not: null }

    if (reportType === 'สรุปการใช้งาน') {
      // รายงานสรุปการใช้วัตถุดิบ
      const warranties = await prisma.warranty.findMany({
        where,
        select: {
          id: true,
          materialUsage: true,
          createdAt: true
        }
      })

      // Parse materialUsage JSON และรวมข้อมูล
      const materialMap = new Map<string, any>()

      warranties.forEach(warranty => {
        if (warranty.materialUsage) {
          try {
            const materials = JSON.parse(warranty.materialUsage)
            materials.forEach((item: any) => {
              const key = item.rawMaterialId || item.materialCode
              if (materialMap.has(key)) {
                const existing = materialMap.get(key)
                existing.totalUsed += item.totalQuantity || 0
                existing.usageCount += 1
              } else {
                materialMap.set(key, {
                  material: {
                    id: item.rawMaterialId,
                    materialCode: item.materialCode,
                    materialName: item.materialName,
                    materialType: item.materialType,
                    unit: item.unit,
                    supplier: ''
                  },
                  totalUsed: item.totalQuantity || 0,
                  usageCount: 1
                })
              }
            })
          } catch (error) {
            console.error('Error parsing materialUsage:', error)
          }
        }
      })

      const report = Array.from(materialMap.values())

      return NextResponse.json({
        type: 'summary',
        data: report,
        dateRange: { startDate, endDate }
      })

    } else if (reportType === 'แยกตามสินค้า') {
      // รายงานการใช้วัตถุดิบแยกตามสินค้า
      const warranties = await prisma.warranty.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              productCode: true,
              productName: true,
              category: true
            }
          }
        }
      })

      // จัดกลุ่มตามสินค้า
      const groupedByProduct = new Map<string, any>()

      warranties.forEach(warranty => {
        const productId = warranty.product.id
        if (!groupedByProduct.has(productId)) {
          groupedByProduct.set(productId, {
            product: warranty.product,
            materials: new Map<string, any>(),
            totalCertificates: 0
          })
        }

        const productGroup = groupedByProduct.get(productId)

        if (warranty.materialUsage) {
          try {
            const materials = JSON.parse(warranty.materialUsage)
            materials.forEach((item: any) => {
              const materialKey = item.rawMaterialId || item.materialCode
              if (productGroup.materials.has(materialKey)) {
                const existing = productGroup.materials.get(materialKey)
                existing.totalUsed += item.totalQuantity || 0
                existing.usageCount += 1
              } else {
                productGroup.materials.set(materialKey, {
                  material: {
                    id: item.rawMaterialId,
                    materialCode: item.materialCode,
                    materialName: item.materialName,
                    materialType: item.materialType,
                    unit: item.unit
                  },
                  totalUsed: item.totalQuantity || 0,
                  usageCount: 1
                })
              }
            })
          } catch (error) {
            console.error('Error parsing materialUsage:', error)
          }
        }
        productGroup.totalCertificates += 1
      })

      const report = Array.from(groupedByProduct.values()).map(item => ({
        product: item.product,
        materials: Array.from(item.materials.values()),
        totalCertificates: item.totalCertificates
      }))

      return NextResponse.json({
        type: 'by-product',
        data: report,
        dateRange: { startDate, endDate }
      })

    } else {
      // รายงานละเอียด
      const warranties = await prisma.warranty.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              productCode: true,
              productName: true,
              category: true
            }
          },
          dealer: {
            select: {
              id: true,
              dealerCode: true,
              dealerName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      // แปลงข้อมูลเป็นรายละเอียด
      const detailedUsage: any[] = []

      warranties.forEach(warranty => {
        if (warranty.materialUsage) {
          try {
            const materials = JSON.parse(warranty.materialUsage)
            materials.forEach((item: any) => {
              detailedUsage.push({
                id: `${warranty.id}-${item.materialCode}`,
                rawMaterialId: item.rawMaterialId,
                actualUsedQuantity: item.totalQuantity || 0,
                createdAt: warranty.createdAt,
                rawMaterial: {
                  id: item.rawMaterialId,
                  materialCode: item.materialCode,
                  materialName: item.materialName,
                  materialType: item.materialType,
                  unit: item.unit,
                  supplier: ''
                },
                certificate: {
                  id: warranty.id,
                  certificateNumber: warranty.warrantyNumber,
                  product: warranty.product,
                  dealer: warranty.dealer
                }
              })
            })
          } catch (error) {
            console.error('Error parsing materialUsage:', error)
          }
        }
      })

      return NextResponse.json({
        type: 'detailed',
        data: detailedUsage,
        dateRange: { startDate, endDate }
      })
    }

  } catch (error) {
    console.error('Error generating material usage report:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างรายงานการใช้วัตถุดิบ' },
      { status: 500 }
    )
  }
}
