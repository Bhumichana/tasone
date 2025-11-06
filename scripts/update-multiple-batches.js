/**
 * Script สำหรับอัปเดตวันหมดอายุของหลาย Batch พร้อมกัน
 *
 * วิธีใช้: แก้ไข BATCH_UPDATES ด้านล่างแล้ว run: node scripts/update-multiple-batches.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ⚙️ กำหนดรายการ Batch ที่ต้องการอัปเดตพร้อมวันหมดอายุ
const BATCH_UPDATES = [
  { batchNumber: 'DEMO-2025-10-01', expiryDate: '2026-12-31' },
  { batchNumber: 'DEMO-2025-10-02', expiryDate: '2026-12-31' },
  { batchNumber: 'DEMO-2025-10-03', expiryDate: '2026-12-31' },
  { batchNumber: 'DEMO-2025-10-04', expiryDate: '2026-12-31' },
  { batchNumber: 'DEMO-2025-10-05', expiryDate: '2026-12-31' },
  // เพิ่มรายการ batch อื่นๆ ตามต้องการ
]

// ฟังก์ชันแปลงวันที่
function parseDate(dateStr) {
  // รูปแบบ YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr)
  }

  // รูปแบบ DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/')
    return new Date(`${year}-${month}-${day}`)
  }

  // รูปแบบ DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('-')
    return new Date(`${year}-${month}-${day}`)
  }

  throw new Error(`รูปแบบวันที่ไม่ถูกต้อง: ${dateStr}`)
}

async function updateMultipleBatches() {
  try {
    console.log('\n==============================================')
    console.log('  อัปเดตวันหมดอายุของหลาย Batch พร้อมกัน')
    console.log('==============================================\n')
    console.log(`กำลังอัปเดต ${BATCH_UPDATES.length} Batch...\n`)

    let successCount = 0
    let failCount = 0
    let totalDealerStocksUpdated = 0

    for (const update of BATCH_UPDATES) {
      try {
        console.log('─'.repeat(80))
        console.log(`\n📦 Batch: ${update.batchNumber}`)
        console.log(`📅 วันหมดอายุ: ${update.expiryDate}`)

        // แปลงวันที่
        const expiryDate = parseDate(update.expiryDate)

        // ตรวจสอบว่า batch มีอยู่หรือไม่
        const batch = await prisma.rawMaterialBatch.findFirst({
          where: {
            batchNumber: update.batchNumber
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
          console.log(`   ⚠️  ไม่พบ Batch นี้ - ข้าม`)
          failCount++
          continue
        }

        console.log(`   วัตถุดิบ: ${batch.rawMaterial.materialName}`)

        // อัปเดต batch และ dealer stock
        const result = await prisma.$transaction(async (tx) => {
          // อัปเดต RawMaterialBatch
          await tx.rawMaterialBatch.update({
            where: {
              id: batch.id
            },
            data: {
              expiryDate: expiryDate
            }
          })

          // อัปเดต DealerStock ที่เกี่ยวข้อง
          const dealerStocks = await tx.dealerStock.findMany({
            where: {
              materialCode: batch.rawMaterial.materialCode,
              batchNumber: update.batchNumber
            }
          })

          if (dealerStocks.length > 0) {
            await tx.dealerStock.updateMany({
              where: {
                materialCode: batch.rawMaterial.materialCode,
                batchNumber: update.batchNumber
              },
              data: {
                expiryDate: expiryDate,
                lastUpdated: new Date()
              }
            })
          }

          return {
            dealerStocksUpdated: dealerStocks.length
          }
        })

        console.log(`   ✅ สำเร็จ (DealerStock: ${result.dealerStocksUpdated} รายการ)`)
        successCount++
        totalDealerStocksUpdated += result.dealerStocksUpdated

      } catch (error) {
        console.log(`   ❌ ล้มเหลว: ${error.message}`)
        failCount++
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('📊 สรุปผลการอัปเดต')
    console.log('='.repeat(80))
    console.log(`✅ สำเร็จ: ${successCount} Batch`)
    console.log(`❌ ล้มเหลว: ${failCount} Batch`)
    console.log(`📋 DealerStock ที่อัปเดต: ${totalDealerStocksUpdated} รายการ`)
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
updateMultipleBatches()
