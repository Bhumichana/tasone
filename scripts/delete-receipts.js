/**
 * Script สำหรับลบใบรับเข้า (DealerReceipt) และคืนสต็อก
 *
 * วิธีใช้: node scripts/delete-receipts.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// รายการใบรับเข้าที่ต้องการลบ
const receiptNumbers = [
  'RCP-cmgak9ua30000g7qceikae9jd-20251027-001',
  'RCP-cmgak9ua30000g7qceikae9jd-20251027-002',
  'RCP-cmgak9ua30000g7qceikae9jd-20251027-003',
  'RCP-cmgak9ua30000g7qceikae9jd-20251027-004',
  'RCP-cmgak9ua30000g7qceikae9jd-20251027-005',
  'RCP-cmgak9ua30000g7qceikae9jd-20251027-006',
  'RCP-cmgak9ua30000g7qceikae9jd-20251027-007'
]

async function deleteReceipts() {
  try {
    console.log('\n==============================================')
    console.log('  ลบใบรับเข้าวัตถุดิบ และคืนสต็อก')
    console.log('==============================================\n')
    console.log(`จำนวนใบรับเข้าที่ต้องการลบ: ${receiptNumbers.length} รายการ\n`)

    let successCount = 0
    let failCount = 0
    let notFoundCount = 0

    for (const receiptNumber of receiptNumbers) {
      try {
        console.log(`\nกำลังประมวลผล: ${receiptNumber}`)

        // หาใบรับเข้า
        const receipt = await prisma.dealerReceipt.findFirst({
          where: { receiptNumber },
          include: {
            items: true,
            materialDelivery: true
          }
        })

        if (!receipt) {
          console.log(`   ⚠️  ไม่พบใบรับเข้า: ${receiptNumber}`)
          notFoundCount++
          continue
        }

        // ลบและคืนสต็อกใน transaction
        await prisma.$transaction(async (tx) => {
          // 1. คืนสต็อกใน DealerStock
          for (const item of receipt.items) {
            const rawMaterial = await tx.rawMaterial.findUnique({
              where: { id: item.rawMaterialId }
            })

            if (!rawMaterial) {
              console.log(`   ⚠️  ไม่พบวัตถุดิบ ID: ${item.rawMaterialId}`)
              continue
            }

            // หา DealerStock
            const stock = await tx.dealerStock.findFirst({
              where: {
                dealerId: receipt.dealerId,
                materialCode: rawMaterial.materialCode,
                batchNumber: item.batchNumber
              }
            })

            if (stock) {
              const newStock = stock.currentStock - item.receivedQuantity

              if (newStock <= 0) {
                // ถ้าสต็อกหมด ให้ลบ record
                await tx.dealerStock.delete({
                  where: { id: stock.id }
                })
                console.log(`   ✅ ลบสต็อก: ${rawMaterial.materialName} (Batch: ${item.batchNumber})`)
              } else {
                // คืนสต็อก
                await tx.dealerStock.update({
                  where: { id: stock.id },
                  data: {
                    currentStock: newStock,
                    lastUpdated: new Date()
                  }
                })
                console.log(`   ✅ คืนสต็อก: ${rawMaterial.materialName} (${item.receivedQuantity} ${item.unit})`)
              }
            }
          }

          // 2. Update MaterialDelivery status กลับเป็น PENDING_RECEIPT
          if (receipt.materialDeliveryId) {
            await tx.materialDelivery.update({
              where: { id: receipt.materialDeliveryId },
              data: { status: 'PENDING_RECEIPT' }
            })
            console.log(`   ✅ Update Material Delivery status: ${receipt.materialDelivery.deliveryNumber} → PENDING_RECEIPT`)
          }

          // 3. ลบ DealerReceiptItem
          await tx.dealerReceiptItem.deleteMany({
            where: { receiptId: receipt.id }
          })
          console.log(`   ✅ ลบรายการวัตถุดิบ: ${receipt.items.length} รายการ`)

          // 4. ลบ DealerReceipt
          await tx.dealerReceipt.delete({
            where: { id: receipt.id }
          })
          console.log(`   ✅ ลบใบรับเข้า: ${receiptNumber}`)
        })

        successCount++
        console.log(`   ✨ สำเร็จ!`)

      } catch (error) {
        console.log(`   ❌ Error: ${receiptNumber} - ${error.message}`)
        failCount++
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('📊 สรุปผลการลบข้อมูล')
    console.log('='.repeat(80))
    console.log(`✅ สำเร็จ: ${successCount} รายการ`)
    console.log(`⚠️  ไม่พบข้อมูล: ${notFoundCount} รายการ`)
    console.log(`❌ ล้มเหลว: ${failCount} รายการ`)
    console.log(`📋 ทั้งหมด: ${receiptNumbers.length} รายการ`)
    console.log('')

    if (successCount > 0) {
      console.log('✅ ลบใบรับเข้าเสร็จสิ้น!')
      console.log('💡 คุณสามารถรีเฟรชหน้าเว็บเพื่อดูข้อมูลที่อัปเดตแล้ว')
    }

    console.log('')

  } catch (error) {
    console.error('\n❌ เกิดข้อผิดพลาดร้ายแรง:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

// เริ่มการทำงาน
console.log('\n⚙️  กำลังเริ่มต้น...')
deleteReceipts()
