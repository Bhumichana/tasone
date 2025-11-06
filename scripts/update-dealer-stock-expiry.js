/**
 * Script สำหรับอัปเดตวันหมดอายุใน DealerStock จาก RawMaterialBatch
 *
 * วิธีใช้: node scripts/update-dealer-stock-expiry.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function updateDealerStockExpiry() {
  try {
    console.log('\n==============================================')
    console.log('  อัปเดตวันหมดอายุของ DealerStock')
    console.log('==============================================\n')

    // ดึง DealerStock ทั้งหมด
    const dealerStocks = await prisma.dealerStock.findMany({
      include: {
        dealer: {
          select: {
            dealerName: true
          }
        }
      }
    })

    console.log(`พบ DealerStock ทั้งหมด ${dealerStocks.length} รายการ\n`)

    let successCount = 0
    let failCount = 0
    let skippedCount = 0

    for (const stock of dealerStocks) {
      try {
        // หา Batch ที่ตรงกับ materialCode และ batchNumber
        const batch = await prisma.rawMaterialBatch.findFirst({
          where: {
            rawMaterial: {
              materialCode: stock.materialCode
            },
            batchNumber: stock.batchNumber
          },
          include: {
            rawMaterial: {
              select: {
                materialCode: true,
                materialName: true
              }
            }
          }
        })

        if (!batch) {
          console.log(`   ⚠️  ไม่พบ Batch: ${stock.materialCode} - ${stock.batchNumber}`)
          failCount++
          continue
        }

        // ถ้ามี expiryDate เหมือนกันอยู่แล้ว ให้ข้าม
        if (stock.expiryDate && batch.expiryDate) {
          const stockDate = new Date(stock.expiryDate).getTime()
          const batchDate = new Date(batch.expiryDate).getTime()
          if (stockDate === batchDate) {
            skippedCount++
            continue
          }
        }

        // อัปเดต expiryDate
        await prisma.dealerStock.update({
          where: { id: stock.id },
          data: {
            expiryDate: batch.expiryDate,
            lastUpdated: new Date()
          }
        })

        const expiryStr = batch.expiryDate
          ? new Date(batch.expiryDate).toLocaleDateString('th-TH')
          : 'ไม่มี'

        console.log(`   ✅ ${stock.dealer.dealerName} - ${stock.materialName} (${stock.batchNumber}): ${expiryStr}`)
        successCount++

      } catch (error) {
        console.log(`   ❌ Error: ${stock.materialCode} - ${error.message}`)
        failCount++
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('📊 สรุปผลการอัปเดต')
    console.log('='.repeat(80))
    console.log(`✅ สำเร็จ: ${successCount} รายการ`)
    console.log(`⏭️  ข้าม (มีข้อมูลอยู่แล้ว): ${skippedCount} รายการ`)
    console.log(`❌ ล้มเหลว: ${failCount} รายการ`)
    console.log(`📋 ทั้งหมด: ${dealerStocks.length} รายการ`)
    console.log('')

    if (successCount > 0) {
      console.log('✅ อัปเดตวันหมดอายุเสร็จสิ้น!')
      console.log('💡 คุณสามารถรีเฟรชหน้า Stock ของ Dealer เพื่อดูวันหมดอายุที่อัปเดตแล้ว')
    }

    console.log('')

  } catch (error) {
    console.error('\n❌ เกิดข้อผิดพลาดร้ายแรง:', error.message)
    console.error('')
  } finally {
    await prisma.$disconnect()
  }
}

// เริ่มการทำงาน
console.log('\n⚙️  กำลังเริ่มต้น...')
updateDealerStockExpiry()
