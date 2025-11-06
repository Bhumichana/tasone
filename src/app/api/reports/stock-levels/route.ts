import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/reports/stock-levels - รายงานสต็อกคงเหลือ
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
    const dealerId = searchParams.get('dealerId')
    const materialType = searchParams.get('materialType')
    const lowStockThreshold = parseInt(searchParams.get('lowStockThreshold') || '10')
    const reportType = searchParams.get('type') || 'current' // current, low-stock, no-movement

    // ตรวจสอบว่าจะดึงข้อมูลจาก DealerStock หรือ RawMaterial
    const isDealerReport = session.user.userGroup === 'Dealer' || (dealerId && dealerId !== 'all')

    if (isDealerReport) {
      // === รายงานสต็อกดีลเลอร์ (DealerStock) ===
      const finalDealerId = session.user.userGroup === 'Dealer'
        ? session.user.dealerId
        : dealerId

      const where: any = {}

      // เพิ่ม dealerId เฉพาะเมื่อมีค่า
      if (finalDealerId) {
        where.dealerId = finalDealerId
      }

      if (materialType) {
        where.materialType = materialType
      }

      if (reportType === 'current') {
        // รายงานสต็อกปัจจุบัน (DealerStock)
        const dealerStocks = await prisma.dealerStock.findMany({
          where,
          include: {
            dealer: {
              select: {
                id: true,
                dealerCode: true,
                dealerName: true
              }
            }
          },
          orderBy: [
            { currentStock: 'asc' },
            { materialName: 'asc' }
          ]
        })

        // คำนวณสถานะสต็อก
        const stockReport = dealerStocks.map(stock => {
          let stockStatus = 'NORMAL'
          if (stock.currentStock === 0) {
            stockStatus = 'OUT_OF_STOCK'
          } else if (stock.currentStock <= lowStockThreshold) {
            stockStatus = 'LOW'
          }

          return {
            id: stock.id,
            materialCode: stock.materialCode,
            materialName: stock.materialName,
            materialType: stock.materialType,
            unit: stock.unit,
            currentStock: stock.currentStock,
            stockStatus,
            usageCount: 0, // DealerStock ไม่มีข้อมูลการใช้งาน
            stockValue: 0, // ไม่มีราคาใน DealerStock
            dealer: stock.dealer
          }
        })

        return NextResponse.json({
          type: 'current',
          data: stockReport,
          summary: {
            totalMaterials: dealerStocks.length,
            lowStockCount: stockReport.filter(m => m.stockStatus === 'LOW').length,
            outOfStockCount: stockReport.filter(m => m.stockStatus === 'OUT_OF_STOCK').length,
            totalStockValue: 0
          }
        })

      } else if (reportType === 'low-stock') {
        // รายงานสต็อกใกล้หมด (DealerStock)
        const lowStockItems = await prisma.dealerStock.findMany({
          where: {
            ...where,
            currentStock: {
              lte: lowStockThreshold,
              gt: 0
            }
          },
          include: {
            dealer: {
              select: {
                id: true,
                dealerCode: true,
                dealerName: true
              }
            }
          },
          orderBy: {
            currentStock: 'asc'
          }
        })

        // คำนวณการใช้งานจาก Warranty (30 วันที่ผ่านมา)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const itemsWithUsageRate = await Promise.all(
          lowStockItems.map(async (stock) => {
            // นับจำนวนใบรับประกันที่ใช้วัตถุดิบนี้
            const warrantyWhere: any = {
              materialUsage: { not: null },
              createdAt: { gte: thirtyDaysAgo }
            }

            // เพิ่ม dealerId เฉพาะเมื่อมีค่า
            if (finalDealerId) {
              warrantyWhere.dealerId = finalDealerId
            }

            const warranties = await prisma.warranty.findMany({
              where: warrantyWhere,
              select: {
                materialUsage: true
              }
            })

            let totalUsed = 0
            let usageCount = 0

            warranties.forEach(warranty => {
              if (warranty.materialUsage) {
                try {
                  const materials = JSON.parse(warranty.materialUsage)
                  const matchingMaterial = materials.find(
                    (m: any) => m.materialCode === stock.materialCode && m.batchNumber === stock.batchNumber
                  )
                  if (matchingMaterial) {
                    totalUsed += matchingMaterial.totalQuantity || 0
                    usageCount += 1
                  }
                } catch (error) {
                  console.error('Error parsing materialUsage:', error)
                }
              }
            })

            const dailyAverage = totalUsed / 30
            const estimatedDaysLeft = dailyAverage > 0 ? Math.floor(stock.currentStock / dailyAverage) : 999

            return {
              ...stock,
              recentUsage: {
                totalUsed30Days: totalUsed,
                usageCount30Days: usageCount,
                dailyAverage,
                estimatedDaysLeft
              }
            }
          })
        )

        return NextResponse.json({
          type: 'low-stock',
          data: itemsWithUsageRate,
          threshold: lowStockThreshold
        })

      } else if (reportType === 'no-movement') {
        // รายงานสต็อกที่ไม่มีการเคลื่อนไหว (DealerStock)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const allStocks = await prisma.dealerStock.findMany({
          where: {
            ...where,
            currentStock: { gt: 0 }
          },
          include: {
            dealer: {
              select: {
                id: true,
                dealerCode: true,
                dealerName: true
              }
            }
          }
        })

        // หาวัตถุดิบที่ไม่มีการใช้งานใน 30 วัน
        const noMovementMaterials: any[] = []

        for (const stock of allStocks) {
          const warrantyWhere: any = {
            materialUsage: { not: null },
            createdAt: { gte: thirtyDaysAgo }
          }

          // เพิ่ม dealerId เฉพาะเมื่อมีค่า
          if (finalDealerId) {
            warrantyWhere.dealerId = finalDealerId
          }

          const warranties = await prisma.warranty.findMany({
            where: warrantyWhere,
            select: {
              materialUsage: true
            }
          })

          let hasUsage = false
          for (const warranty of warranties) {
            if (warranty.materialUsage) {
              try {
                const materials = JSON.parse(warranty.materialUsage)
                const matchingMaterial = materials.find(
                  (m: any) => m.materialCode === stock.materialCode && m.batchNumber === stock.batchNumber
                )
                if (matchingMaterial) {
                  hasUsage = true
                  break
                }
              } catch (error) {
                console.error('Error parsing materialUsage:', error)
              }
            }
          }

          if (!hasUsage) {
            noMovementMaterials.push({
              ...stock,
              daysSinceLastMovement: 30,
              stockValue: 0
            })
          }
        }

        return NextResponse.json({
          type: 'no-movement',
          data: noMovementMaterials,
          period: '30 days',
          summary: {
            totalMaterials: noMovementMaterials.length,
            totalStockValue: 0
          }
        })
      }

    } else {
      // === รายงานสต็อกสำนักงานใหญ่ (RawMaterial) ===
      const where: any = {}
      if (materialType) {
        where.materialType = materialType
      }

      if (reportType === 'current') {
        // รายงานสต็อกปัจจุบัน (RawMaterial)
        const materials = await prisma.rawMaterial.findMany({
          where,
          orderBy: [
            { currentStock: 'asc' },
            { materialName: 'asc' }
          ]
        })

        // คำนวณสถานะสต็อก
        const stockReport = materials.map(material => {
          let stockStatus = 'NORMAL'
          if (material.currentStock === 0) {
            stockStatus = 'OUT_OF_STOCK'
          } else if (material.currentStock <= material.minStock) {
            stockStatus = 'LOW'
          }

          return {
            id: material.id,
            materialCode: material.materialCode,
            materialName: material.materialName,
            materialType: material.materialType,
            unit: material.unit,
            currentStock: material.currentStock,
            stockStatus,
            usageCount: 0,
            stockValue: 0
          }
        })

        return NextResponse.json({
          type: 'current',
          data: stockReport,
          summary: {
            totalMaterials: materials.length,
            lowStockCount: stockReport.filter(m => m.stockStatus === 'LOW').length,
            outOfStockCount: stockReport.filter(m => m.stockStatus === 'OUT_OF_STOCK').length,
            totalStockValue: 0
          }
        })

      } else if (reportType === 'low-stock') {
        // รายงานสต็อกใกล้หมด (RawMaterial)
        const lowStockMaterials = await prisma.rawMaterial.findMany({
          where: {
            ...where,
            OR: [
              { currentStock: { lte: lowStockThreshold } },
              {
                AND: [
                  { minStock: { gt: 0 } },
                  { currentStock: { lte: prisma.rawMaterial.fields.minStock } }
                ]
              }
            ]
          },
          orderBy: {
            currentStock: 'asc'
          }
        })

        const materialsWithUsageRate = lowStockMaterials.map(material => ({
          ...material,
          recentUsage: {
            totalUsed30Days: 0,
            usageCount30Days: 0,
            dailyAverage: 0,
            estimatedDaysLeft: 999
          }
        }))

        return NextResponse.json({
          type: 'low-stock',
          data: materialsWithUsageRate,
          threshold: lowStockThreshold
        })

      } else if (reportType === 'no-movement') {
        // รายงานสต็อกที่ไม่มีการเคลื่อนไหว (RawMaterial)
        const noMovementMaterials = await prisma.rawMaterial.findMany({
          where: {
            ...where,
            currentStock: { gt: 0 }
          }
        })

        const report = noMovementMaterials.map(material => ({
          ...material,
          daysSinceLastMovement: 0,
          stockValue: 0
        }))

        return NextResponse.json({
          type: 'no-movement',
          data: report,
          period: '30 days',
          summary: {
            totalMaterials: report.length,
            totalStockValue: 0
          }
        })
      }
    }

    return NextResponse.json(
      { error: 'Invalid report type' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error generating stock level report:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างรายงานสต็อกคงเหลือ' },
      { status: 500 }
    )
  }
}
