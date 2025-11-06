// Script to check delivery items for missing rawMaterial data
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkDeliveryItems() {
  try {
    console.log('🔍 ตรวจสอบ delivery items ที่อาจมีปัญหา...\n')

    // ดึงข้อมูล deliveries ที่มีสถานะ PENDING_RECEIPT
    const deliveries = await prisma.materialDelivery.findMany({
      where: {
        status: 'PENDING_RECEIPT'
      },
      include: {
        dealer: {
          select: {
            dealerName: true,
            dealerCode: true
          }
        },
        items: {
          include: {
            rawMaterial: true
          }
        }
      }
    })

    console.log(`📊 พบ deliveries ที่รอรับเข้า: ${deliveries.length} รายการ\n`)

    let hasIssues = false

    for (const delivery of deliveries) {
      console.log(`\n📦 Delivery: ${delivery.deliveryNumber}`)
      console.log(`   Dealer: ${delivery.dealer.dealerName} (${delivery.dealer.dealerCode})`)
      console.log(`   จำนวน items: ${delivery.items.length}`)

      // ตรวจสอบแต่ละ item
      const itemsWithMissingData = delivery.items.filter(item => !item.rawMaterial)

      if (itemsWithMissingData.length > 0) {
        hasIssues = true
        console.log(`   ⚠️  พบ items ที่ไม่มี rawMaterial: ${itemsWithMissingData.length} รายการ`)

        for (const item of itemsWithMissingData) {
          console.log(`      - Item ID: ${item.id}`)
          console.log(`        rawMaterialId: ${item.rawMaterialId}`)
          console.log(`        batchNumber: ${item.batchNumber}`)
          console.log(`        quantity: ${item.quantity}`)

          // ตรวจสอบว่า rawMaterial ยังมีอยู่ในฐานข้อมูลหรือไม่
          const rawMaterial = await prisma.rawMaterial.findUnique({
            where: { id: item.rawMaterialId }
          })

          if (!rawMaterial) {
            console.log(`        ❌ rawMaterial ถูกลบไปแล้ว!`)
          } else {
            console.log(`        ✅ rawMaterial ยังมีอยู่: ${rawMaterial.materialName}`)
          }
        }
      } else {
        console.log(`   ✅ ทุก items มี rawMaterial ครบถ้วน`)
      }
    }

    if (!hasIssues) {
      console.log('\n\n✅ ไม่พบปัญหาใดๆ ทุก delivery items มีข้อมูล rawMaterial ครบถ้วน')
    } else {
      console.log('\n\n⚠️  พบปัญหา: มี delivery items ที่ไม่มีข้อมูล rawMaterial')
      console.log('    แนะนำ: ตรวจสอบว่า rawMaterial ถูกลบหรือยัง')
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDeliveryItems()
