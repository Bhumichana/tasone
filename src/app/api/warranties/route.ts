import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calculateMaterialUsageFromDealerStock, serializeMaterialUsage } from '@/lib/recipe-calculator'

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

// GET /api/warranties - ดึงรายชื่อใบรับประกันทั้งหมด
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
    const search = searchParams.get('search')
    const dealerId = searchParams.get('dealerId')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where: any = {}

    // หากเป็น Dealer ให้แสดงเฉพาะใบรับประกันของตัวเอง
    if (session.user.userGroup === 'Dealer' && session.user.dealerId) {
      where.dealerId = session.user.dealerId
    }

    // หาก HeadOffice และระบุ dealerId
    if (dealerId && session.user.userGroup === 'HeadOffice') {
      where.dealerId = dealerId
    }

    // ค้นหาตามหมายเลขใบรับประกัน ชื่อลูกค้า หรือหมายเลขสินค้า
    if (search) {
      where.OR = [
        { warrantyNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        {
          product: {
            OR: [
              { productCode: { contains: search } },
              { serialNumber: { contains: search } }
            ]
          }
        }
      ]
    }

    // กรองตามสถานะ
    if (status === 'active') {
      where.expiryDate = { gte: new Date() }
    } else if (status === 'expired') {
      where.expiryDate = { lt: new Date() }
    }

    // กรองตามวันที่
    if (dateFrom || dateTo) {
      where.warrantyDate = {}
      if (dateFrom) {
        where.warrantyDate.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.warrantyDate.lte = new Date(dateTo + 'T23:59:59.999Z')
      }
    }

    const warranties = await prisma.warranty.findMany({
      where,
      include: {
        dealer: {
          select: {
            id: true,
            dealerCode: true,
            dealerName: true,
            manufacturerNumber: true
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
      },
      orderBy: {
        warrantyDate: 'desc'
      }
    })

    // เพิ่มสถานะ active/expired
    const warrantiesWithStatus = warranties.map(warranty => ({
      ...warranty,
      status: new Date(warranty.expiryDate) >= new Date() ? 'active' : 'expired',
      daysRemaining: Math.ceil((new Date(warranty.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    }))

    return NextResponse.json({ warranties: warrantiesWithStatus })
  } catch (error) {
    console.error('Error fetching warranties:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/warranties - สร้างใบรับประกันใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      warrantyNumber: providedWarrantyNumber,
      productId,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      warrantyDate,
      warrantyPeriodMonths,
      warrantyTerms,
      dealerId,
      // ฟิลด์ใหม่
      dealerName,
      subDealerId,         // เพิ่ม: ID ของผู้ขายรายย่อย
      manufacturerNumber,  // เปลี่ยนจาก dealerCode เป็น manufacturerNumber
      productionDate,
      deliveryDate,
      purchaseOrderNo,
      installationArea,
      thickness,
      chemicalBatchNo,
      materialUsage: providedMaterialUsage  // เพิ่ม: ข้อมูลวัตถุดิบที่ใช้ (JSON string) - เปลี่ยนชื่อตัวแปร
    } = body

    // ตรวจสอบสิทธิ์
    const finalDealerId = session.user.userGroup === 'Dealer'
      ? session.user.dealerId
      : dealerId

    if (!finalDealerId) {
      return NextResponse.json(
        { error: 'Dealer ID is required' },
        { status: 400 }
      )
    }

    // ใช้ warrantyNumber ที่ส่งมาจาก frontend (ถ้ามี)
    // ถ้าไม่มี ให้สร้างใหม่
    let warrantyNumber = providedWarrantyNumber
    if (!warrantyNumber) {
      // Fallback: ถ้า frontend ไม่ส่งมา ให้สร้างรูปแบบง่ายๆ
      const year = new Date().getFullYear()
      const month = String(new Date().getMonth() + 1).padStart(2, '0')
      const count = await prisma.warranty.count() + 1
      warrantyNumber = `WR${year}${month}${String(count).padStart(4, '0')}`
    }

    console.log('📝 Creating warranty with number:', warrantyNumber)

    // ตรวจสอบว่า warrantyNumber ซ้ำหรือไม่
    const existingWarranty = await prisma.warranty.findUnique({
      where: { warrantyNumber }
    })

    if (existingWarranty) {
      return NextResponse.json(
        { error: 'Warranty number already exists' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่าสินค้ามีอยู่หรือไม่
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 400 }
      )
    }

    // คำนวณวันหมดอายุ
    const warrantyStartDate = new Date(warrantyDate)
    const expiryDate = new Date(warrantyStartDate)
    expiryDate.setMonth(expiryDate.getMonth() + parseInt(warrantyPeriodMonths))

    // 🔧 AUTO-CALCULATE materialUsage ถ้าไม่มีส่งมาจาก frontend (Multi-Batch FIFO)
    let materialUsage = providedMaterialUsage

    // ถ้าไม่มี materialUsage แต่มี productId + installationArea ให้คำนวณเอง
    if (!materialUsage && productId && installationArea) {
      const area = parseFloat(installationArea)
      if (area > 0) {
        console.log('🔧 Auto-calculating materialUsage for warranty (Multi-Batch FIFO)...')

        // ดึงสูตรการผลิตของสินค้า
        const productWithRecipe = await prisma.product.findUnique({
          where: { id: productId },
          include: {
            recipe: {
              include: {
                items: {
                  include: {
                    rawMaterial: true
                  }
                }
              }
            }
          }
        })

        if (productWithRecipe?.recipe && productWithRecipe.recipe.calculationUnit === 'PER_SQM') {
          // ดึง DealerStock
          const dealerStocks = await prisma.dealerStock.findMany({
            where: {
              dealerId: finalDealerId,
              currentStock: { gt: 0 }
            }
          })

          if (dealerStocks.length > 0) {
            // ใช้ฟังก์ชัน calculateMaterialUsageFromDealerStock (Multi-Batch FIFO)
            const calculatedMaterials = calculateMaterialUsageFromDealerStock(
              productWithRecipe.recipe,
              area,
              dealerStocks
            )

            // ตรวจสอบว่าทุกวัตถุดิบมี batch allocation
            const allMaterialsHaveBatches = calculatedMaterials.every(m => m.batches.length > 0)

            if (allMaterialsHaveBatches) {
              materialUsage = serializeMaterialUsage(calculatedMaterials)
              console.log(`✓ Auto-calculated materialUsage (Multi-Batch FIFO): ${calculatedMaterials.length} materials`)

              // แสดงรายละเอียด batch allocation
              calculatedMaterials.forEach(m => {
                console.log(`  - ${m.materialName}: ${m.batches.length} batch(es) allocated`)
                m.batches.forEach(b => {
                  console.log(`    → Batch ${b.batchNumber}: ${b.quantityUsed} ${m.unit}`)
                })
              })
            } else {
              console.warn('⚠️ Some materials do not have available batches in DealerStock')
            }
          } else {
            console.warn('⚠️ No DealerStock available for this dealer')
          }
        } else {
          console.warn('⚠️ Product does not have a valid recipe (PER_SQM)')
        }
      }
    }

    // สร้างใบรับประกันใหม่
    const newWarranty = await prisma.warranty.create({
      data: {
        warrantyNumber,
        productId,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        warrantyDate: warrantyStartDate,
        expiryDate,
        warrantyPeriodMonths: parseInt(warrantyPeriodMonths),
        warrantyTerms,
        dealerId: finalDealerId,
        // ฟิลด์ใหม่
        dealerName,
        subDealerId: subDealerId || null,  // เพิ่ม: ID ของผู้ขายรายย่อย (optional)
        productionDate: parseDateDDMMYYYY(productionDate),
        deliveryDate: parseDateDDMMYYYY(deliveryDate),
        purchaseOrderNo,
        installationArea: installationArea ? parseFloat(installationArea) : null,
        thickness: thickness ? parseFloat(thickness) : null,
        chemicalBatchNo,
        materialUsage  // เพิ่ม: บันทึกข้อมูลวัตถุดิบที่ใช้
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

    // 🔒 ตรวจสอบและหักสต็อกวัตถุดิบจาก DealerStock (Multi-Batch FIFO)
    if (materialUsage) {
      try {
        const materials = JSON.parse(materialUsage)
        console.log('🔧 Checking and deducting stock (Multi-Batch FIFO) from DealerStock:', materials.length)

        // 🔍 STEP 1: ตรวจสอบสต็อกทั้งหมดก่อน (Pre-check Multi-Batch)
        const insufficientMaterials: any[] = []

        for (const material of materials) {
          const { materialCode, materialName, batches, totalQuantity, unit } = material

          if (!materialCode || !batches || batches.length === 0) {
            console.warn('⚠️ Missing materialCode or batches:', material)
            continue
          }

          // ตรวจสอบแต่ละ batch allocation
          for (const batchAllocation of batches) {
            const { batchId, batchNumber, quantityUsed } = batchAllocation

            if (!batchId || !batchNumber) {
              console.warn('⚠️ Missing batchId or batchNumber in allocation:', batchAllocation)
              continue
            }

            // ค้นหา DealerStock
            const dealerStock = await prisma.dealerStock.findFirst({
              where: {
                id: batchId,
                dealerId: finalDealerId,
                materialCode: materialCode,
                batchNumber: batchNumber
              }
            })

            if (!dealerStock) {
              insufficientMaterials.push({
                materialName: materialName || materialCode,
                batchNumber: batchNumber,
                required: quantityUsed,
                available: 0,
                unit: unit,
                reason: 'ไม่พบสต็อก'
              })
              continue
            }

            // ตรวจสอบว่าสต็อกเพียงพอหรือไม่
            if (dealerStock.currentStock < quantityUsed) {
              insufficientMaterials.push({
                materialName: materialName || materialCode,
                batchNumber: batchNumber,
                required: quantityUsed,
                available: dealerStock.currentStock,
                unit: dealerStock.unit,
                reason: 'สต็อกไม่เพียงพอ'
              })
            }
          }
        }

        // 🚫 หากมีวัตถุดิบใดไม่เพียงพอ ให้หยุดทันทีและแจ้ง error
        if (insufficientMaterials.length > 0) {
          console.error('❌ Insufficient stock detected for materials:', insufficientMaterials)

          // สร้างข้อความแจ้งเตือนที่ชัดเจน
          let errorMessage = '❌ ไม่สามารถออกใบรับประกันได้ เนื่องจากวัตถุดิบไม่เพียงพอ:\n\n'
          insufficientMaterials.forEach((mat, index) => {
            errorMessage += `${index + 1}. ${mat.materialName} (Batch: ${mat.batchNumber})\n`
            errorMessage += `   - ต้องการ: ${mat.required.toFixed(2)} ${mat.unit}\n`
            errorMessage += `   - มีอยู่: ${mat.available.toFixed(2)} ${mat.unit}\n`
            errorMessage += `   - ขาด: ${(mat.required - mat.available).toFixed(2)} ${mat.unit}\n\n`
          })

          return NextResponse.json(
            {
              error: errorMessage,
              insufficientMaterials: insufficientMaterials
            },
            { status: 400 }
          )
        }

        // ✅ STEP 2: สต็อกเพียงพอทั้งหมด ทำการหักสต็อกแบบ Multi-Batch FIFO
        console.log('✓ All materials have sufficient stock. Proceeding with Multi-Batch deduction...')

        for (const material of materials) {
          const { materialCode, materialName, batches } = material

          if (!materialCode || !batches || batches.length === 0) {
            continue
          }

          console.log(`  Processing material: ${materialName || materialCode}`)

          // หักสต็อกจากแต่ละ batch ตาม allocation
          for (const batchAllocation of batches) {
            const { batchId, batchNumber, quantityUsed } = batchAllocation

            if (!batchId || !batchNumber) {
              continue
            }

            // ค้นหา DealerStock
            const dealerStock = await prisma.dealerStock.findFirst({
              where: {
                id: batchId,
                dealerId: finalDealerId,
                materialCode: materialCode,
                batchNumber: batchNumber
              }
            })

            if (!dealerStock) {
              console.error(`❌ DealerStock not found for material ${materialCode}, batch ${batchNumber}`)
              throw new Error(`ไม่พบสต็อกของดีลเลอร์สำหรับวัตถุดิบ ${materialCode} (Batch: ${batchNumber})`)
            }

            // หักสต็อก
            await prisma.dealerStock.update({
              where: { id: dealerStock.id },
              data: {
                currentStock: {
                  decrement: quantityUsed
                },
                lastUpdated: new Date()
              }
            })

            console.log(`    ✓ Deducted ${quantityUsed} ${dealerStock.unit} from Batch ${batchNumber}`)
          }
        }

        console.log('✅ Multi-Batch FIFO stock deduction completed successfully')
      } catch (error: any) {
        console.error('⚠️ Error processing stock:', error)

        // ถ้า error มีข้อมูล insufficientMaterials แสดงว่าเป็น error จากการตรวจสอบสต็อก
        // ให้ส่งกลับไปเป็น JSON response
        if (error.message && error.message.includes('ไม่สามารถออกใบรับประกันได้')) {
          throw error // ให้ catch block ด้านนอกจัดการ
        }

        return NextResponse.json(
          { error: error.message || 'เกิดข้อผิดพลาดในการตรวจสอบหรือหักสต็อก' },
          { status: 500 }
        )
      }
    }

    // เพิ่มสถานะ
    const warrantyWithStatus = {
      ...newWarranty,
      status: new Date(newWarranty.expiryDate) >= new Date() ? 'active' : 'expired',
      daysRemaining: Math.ceil((new Date(newWarranty.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    }

    return NextResponse.json(
      {
        message: 'Warranty created successfully',
        warranty: warrantyWithStatus
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating warranty:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}