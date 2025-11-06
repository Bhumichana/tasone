/**
 * Script สำหรับอัปเดตวันหมดอายุของ Batch
 *
 * วิธีใช้: node scripts/update-batch-expiry.js <batch-number> <expiry-date>
 * ตัวอย่าง: node scripts/update-batch-expiry.js DEMO-2025-10-01 "2026-12-31"
 *          node scripts/update-batch-expiry.js DEMO-2025-10-02 "31/12/2026"
 *          node scripts/update-batch-expiry.js DEMO-2025-10-03 "2026-12-31"
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ฟังก์ชันแปลงวันที่จากหลายรูปแบบ
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

  throw new Error('รูปแบบวันที่ไม่ถูกต้อง (ใช้: YYYY-MM-DD หรือ DD/MM/YYYY หรือ DD-MM-YYYY)')
}

async function updateBatchExpiry(batchNumber, expiryDateStr) {
  try {
    // แปลงวันที่
    const expiryDate = parseDate(expiryDateStr)

    console.log('\n==============================================')
    console.log('  อัปเดตวันหมดอายุของ Batch')
    console.log('==============================================\n')
    console.log(`Batch Number: ${batchNumber}`)
    console.log(`วันหมดอายุ: ${expiryDate.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`)
    console.log('')

    // ตรวจสอบว่า batch มีอยู่หรือไม่
    const batch = await prisma.rawMaterialBatch.findFirst({
      where: {
        batchNumber: batchNumber
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
      console.log(`❌ ไม่พบ Batch: ${batchNumber}`)
      return
    }

    console.log(`📦 วัตถุดิบ: ${batch.rawMaterial.materialName} (${batch.rawMaterial.materialCode})`)
    console.log(`📊 สต็อกปัจจุบัน: ${batch.currentStock} ${batch.unit}`)
    console.log('')

    // อัปเดต batch และ dealer stock ที่เกี่ยวข้อง
    const result = await prisma.$transaction(async (tx) => {
      // 1. อัปเดต RawMaterialBatch
      const updatedBatch = await tx.rawMaterialBatch.update({
        where: {
          id: batch.id
        },
        data: {
          expiryDate: expiryDate
        }
      })

      console.log('✅ อัปเดต RawMaterialBatch สำเร็จ')

      // 2. อัปเดต DealerStock ทั้งหมดที่ใช้ batch นี้
      const dealerStocks = await tx.dealerStock.findMany({
        where: {
          materialCode: batch.rawMaterial.materialCode,
          batchNumber: batchNumber
        },
        include: {
          dealer: {
            select: {
              dealerName: true
            }
          }
        }
      })

      if (dealerStocks.length > 0) {
        console.log(`\n📋 พบ DealerStock ที่เกี่ยวข้อง ${dealerStocks.length} รายการ:`)

        for (const stock of dealerStocks) {
          await tx.dealerStock.update({
            where: {
              id: stock.id
            },
            data: {
              expiryDate: expiryDate,
              lastUpdated: new Date()
            }
          })

          console.log(`   ✅ ${stock.dealer.dealerName} - ${stock.currentStock} ${stock.unit}`)
        }
      } else {
        console.log('\n📋 ไม่พบ DealerStock ที่เกี่ยวข้อง (batch นี้ยังไม่ได้ส่งมอบให้ dealer)')
      }

      return {
        batch: updatedBatch,
        dealerStocksUpdated: dealerStocks.length
      }
    })

    console.log('\n==============================================')
    console.log('✅ อัปเดตวันหมดอายุสำเร็จ!')
    console.log('==============================================')
    console.log(`📦 Batch: ${batchNumber}`)
    console.log(`📅 วันหมดอายุ: ${expiryDate.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`)
    console.log(`📊 DealerStock ที่อัปเดต: ${result.dealerStocksUpdated} รายการ`)
    console.log('')

  } catch (error) {
    console.error('\n❌ เกิดข้อผิดพลาด:', error.message)
    console.error('')
  } finally {
    await prisma.$disconnect()
  }
}

// รับค่าจาก command line
const args = process.argv.slice(2)

if (args.length < 2) {
  console.log('\n❌ การใช้งานไม่ถูกต้อง\n')
  console.log('วิธีใช้: node scripts/update-batch-expiry.js <batch-number> <expiry-date>')
  console.log('')
  console.log('ตัวอย่าง:')
  console.log('  node scripts/update-batch-expiry.js DEMO-2025-10-01 "2026-12-31"')
  console.log('  node scripts/update-batch-expiry.js DEMO-2025-10-02 "31/12/2026"')
  console.log('  node scripts/update-batch-expiry.js DEMO-2025-10-03 "2026-12-31"')
  console.log('')
  process.exit(1)
}

const [batchNumber, expiryDate] = args
updateBatchExpiry(batchNumber, expiryDate)
