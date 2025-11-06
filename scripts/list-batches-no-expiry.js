/**
 * Script สำหรับแสดงรายการ Batch ที่ยังไม่มีวันหมดอายุ
 *
 * วิธีใช้: node scripts/list-batches-no-expiry.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function listBatchesWithoutExpiry() {
  try {
    console.log('\n==============================================')
    console.log('  รายการ Batch ที่ยังไม่มีวันหมดอายุ')
    console.log('==============================================\n')

    // ดึงรายการ batch ที่ไม่มี expiryDate
    const batches = await prisma.rawMaterialBatch.findMany({
      where: {
        expiryDate: null
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
        receivedDate: 'desc'
      }
    })

    if (batches.length === 0) {
      console.log('✅ ไม่พบ Batch ที่ไม่มีวันหมดอายุ - ข้อมูลครบถ้วนแล้ว!')
      return
    }

    console.log(`พบทั้งหมด ${batches.length} Batch\n`)
    console.log('─'.repeat(100))
    console.log(
      'ลำดับ'.padEnd(8) +
      'Batch Number'.padEnd(25) +
      'วัตถุดิบ'.padEnd(35) +
      'วันที่รับเข้า'.padEnd(15) +
      'สต็อก'
    )
    console.log('─'.repeat(100))

    batches.forEach((batch, index) => {
      const receivedDate = new Date(batch.receivedDate).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })

      console.log(
        `${(index + 1).toString().padEnd(8)}` +
        `${batch.batchNumber.padEnd(25)}` +
        `${batch.rawMaterial.materialName.padEnd(35)}` +
        `${receivedDate.padEnd(15)}` +
        `${batch.currentStock} ${batch.unit}`
      )
    })

    console.log('─'.repeat(100))
    console.log(`\nทั้งหมด: ${batches.length} Batch`)
    console.log('\n📝 หมายเหตุ:')
    console.log('   - ใช้ script "update-batch-expiry.js" เพื่ออัปเดตวันหมดอายุ')
    console.log('   - ตัวอย่าง: node scripts/update-batch-expiry.js DEMO-2025-10-01 "2026-12-31"')
    console.log('')

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

listBatchesWithoutExpiry()
