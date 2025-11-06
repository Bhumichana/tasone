// Script to check dealer codes
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkDealerCodes() {
  try {
    console.log('🔍 ตรวจสอบรหัสดีลเลอร์...\n')

    // ดึงข้อมูล dealers ทั้งหมด
    const dealers = await prisma.dealer.findMany({
      select: {
        id: true,
        dealerCode: true,
        dealerName: true,
        type: true,
        _count: {
          select: {
            users: true,
            materialDeliveries: true
          }
        }
      },
      orderBy: {
        dealerCode: 'asc'
      }
    })

    console.log(`📊 พบดีลเลอร์ทั้งหมด: ${dealers.length} รายการ\n`)

    dealers.forEach((dealer, index) => {
      console.log(`${index + 1}. รหัส: ${dealer.dealerCode}`)
      console.log(`   ชื่อ: ${dealer.dealerName}`)
      console.log(`   ประเภท: ${dealer.type}`)
      console.log(`   จำนวนผู้ใช้: ${dealer._count.users} คน`)
      console.log(`   จำนวนการส่งมอบ: ${dealer._count.materialDeliveries} ครั้ง`)
      console.log(`   ID: ${dealer.id}`)
      console.log('')
    })

    // ค้นหาดีลเลอร์ที่มีชื่อเป็น "บีเคเม็ททอลชีทซัพพลาย"
    const bkDealer = dealers.find(d =>
      d.dealerName.includes('บีเค') ||
      d.dealerName.includes('BK') ||
      d.dealerName.includes('เม็ททอล')
    )

    if (bkDealer) {
      console.log('🎯 พบดีลเลอร์ BK:')
      console.log(`   รหัสปัจจุบัน: ${bkDealer.dealerCode}`)
      console.log(`   ชื่อ: ${bkDealer.dealerName}`)
      console.log(`   ID: ${bkDealer.id}`)

      if (bkDealer.dealerCode !== 'BK-BR01') {
        console.log(`\n⚠️  รหัสไม่ถูกต้อง! ควรเป็น: BK-BR01`)
      } else {
        console.log(`\n✅ รหัสถูกต้อง`)
      }
    } else {
      console.log('❌ ไม่พบดีลเลอร์ BK')
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDealerCodes()
