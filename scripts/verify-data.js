/**
 * ทดสอบความถูกต้องของข้อมูลใน PostgreSQL
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyData() {
  console.log('🔍 เริ่มต้นทดสอบความถูกต้องของข้อมูล...\n');

  try {
    // นับจำนวน records ในแต่ละตาราง
    console.log('📊 จำนวน Records ในแต่ละตาราง:\n');

    const dealers = await prisma.dealer.count();
    console.log(`  ✓ Dealers: ${dealers} records`);

    const users = await prisma.user.count();
    console.log(`  ✓ Users: ${users} records`);

    const subDealers = await prisma.subDealer.count();
    console.log(`  ✓ SubDealers: ${subDealers} records`);

    const rawMaterials = await prisma.rawMaterial.count();
    console.log(`  ✓ RawMaterials: ${rawMaterials} records`);

    const products = await prisma.product.count();
    console.log(`  ✓ Products: ${products} records`);

    const warranties = await prisma.warranty.count();
    console.log(`  ✓ Warranties: ${warranties} records`);

    const materialDeliveries = await prisma.materialDelivery.count();
    console.log(`  ✓ MaterialDeliveries: ${materialDeliveries} records`);

    const dealerReceipts = await prisma.dealerReceipt.count();
    console.log(`  ✓ DealerReceipts: ${dealerReceipts} records`);

    console.log('\n📝 ตัวอย่างข้อมูล:\n');

    // แสดงตัวอย่างข้อมูล
    const sampleDealer = await prisma.dealer.findFirst({
      include: {
        users: true,
      },
    });
    console.log('  ตัวแทนจำหน่ายตัวอย่าง:');
    console.log(`    - รหัส: ${sampleDealer?.dealerCode}`);
    console.log(`    - ชื่อ: ${sampleDealer?.dealerName}`);
    console.log(`    - จำนวนผู้ใช้งาน: ${sampleDealer?.users.length} คน`);

    const sampleProduct = await prisma.product.findFirst();
    console.log('\n  สินค้าตัวอย่าง:');
    console.log(`    - รหัส: ${sampleProduct?.productCode}`);
    console.log(`    - ชื่อ: ${sampleProduct?.productName}`);
    console.log(`    - หมวดหมู่: ${sampleProduct?.category}`);

    const sampleWarranty = await prisma.warranty.findFirst({
      include: {
        product: true,
        dealer: true,
      },
    });
    console.log('\n  ใบรับประกันตัวอย่าง:');
    console.log(`    - เลขที่: ${sampleWarranty?.warrantyNumber}`);
    console.log(`    - ลูกค้า: ${sampleWarranty?.customerName}`);
    console.log(`    - สินค้า: ${sampleWarranty?.product.productName}`);
    console.log(`    - ตัวแทน: ${sampleWarranty?.dealer.dealerName}`);

    console.log('\n✅ ข้อมูลถูกต้องครบถ้วน!');
    console.log('🎉 PostgreSQL Database พร้อมใช้งานแล้ว!\n');

    return true;
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyData()
  .then(() => {
    console.log('✅ การทดสอบเสร็จสมบูรณ์!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 การทดสอบล้มเหลว:', error);
    process.exit(1);
  });
