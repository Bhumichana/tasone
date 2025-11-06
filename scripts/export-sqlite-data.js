/**
 * Export ข้อมูลทั้งหมดจาก SQLite ไปเป็น JSON
 * สำหรับย้ายข้อมูลไปยัง PostgreSQL
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportData() {
  console.log('🚀 เริ่มต้น Export ข้อมูลจาก SQLite...\n');

  try {
    // สร้างโฟลเดอร์สำหรับเก็บ backup
    const backupDir = path.join(__dirname, '..', 'prisma', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportData = {
      exportedAt: new Date().toISOString(),
      database: 'SQLite',
      tables: {}
    };

    // ลำดับการ export (ตารางแม่ก่อน เพื่อง่ายต่อการ import)
    console.log('📊 กำลัง Export ข้อมูล...\n');

    // 1. Dealers (ต้องมาก่อน Users)
    console.log('  ├─ Dealers...');
    exportData.tables.dealers = await prisma.dealer.findMany();
    console.log(`  │  └─ ✓ ${exportData.tables.dealers.length} records`);

    // 2. Users
    console.log('  ├─ Users...');
    exportData.tables.users = await prisma.user.findMany();
    console.log(`  │  └─ ✓ ${exportData.tables.users.length} records`);

    // 3. SubDealers
    console.log('  ├─ SubDealers...');
    exportData.tables.subDealers = await prisma.subDealer.findMany();
    console.log(`  │  └─ ✓ ${exportData.tables.subDealers.length} records`);

    // 4. RawMaterials (ต้องมาก่อน Receiving และ Batches)
    console.log('  ├─ RawMaterials...');
    exportData.tables.rawMaterials = await prisma.rawMaterial.findMany();
    console.log(`  │  └─ ✓ ${exportData.tables.rawMaterials.length} records`);

    // 5. RawMaterialReceiving
    console.log('  ├─ RawMaterialReceiving...');
    exportData.tables.rawMaterialReceiving = await prisma.rawMaterialReceiving.findMany();
    console.log(`  │  └─ ✓ ${exportData.tables.rawMaterialReceiving.length} records`);

    // 6. RawMaterialBatches
    console.log('  ├─ RawMaterialBatches...');
    exportData.tables.rawMaterialBatches = await prisma.rawMaterialBatch.findMany();
    console.log(`  │  └─ ✓ ${exportData.tables.rawMaterialBatches.length} records`);

    // 7. Products (ต้องมาก่อน Warranties และ Recipes)
    console.log('  ├─ Products...');
    exportData.tables.products = await prisma.product.findMany();
    console.log(`  │  └─ ✓ ${exportData.tables.products.length} records`);

    // 8. ProductRecipes
    console.log('  ├─ ProductRecipes...');
    exportData.tables.productRecipes = await prisma.productRecipe.findMany();
    console.log(`  │  └─ ✓ ${exportData.tables.productRecipes.length} records`);

    // 9. ProductRecipeItems
    console.log('  ├─ ProductRecipeItems...');
    exportData.tables.productRecipeItems = await prisma.productRecipeItem.findMany();
    console.log(`  │  └─ ✓ ${exportData.tables.productRecipeItems.length} records`);

    // 10. Warranties
    console.log('  ├─ Warranties...');
    exportData.tables.warranties = await prisma.warranty.findMany();
    console.log(`  │  └─ ✓ ${exportData.tables.warranties.length} records`);

    // 11. WarrantyHistory
    console.log('  ├─ WarrantyHistory...');
    exportData.tables.warrantyHistory = await prisma.warrantyHistory.findMany();
    console.log(`  │  └─ ✓ ${exportData.tables.warrantyHistory.length} records`);

    // 12. MaterialDeliveries
    console.log('  ├─ MaterialDeliveries...');
    exportData.tables.materialDeliveries = await prisma.materialDelivery.findMany();
    console.log(`  │  └─ ✓ ${exportData.tables.materialDeliveries.length} records`);

    // 13. MaterialDeliveryItems
    console.log('  ├─ MaterialDeliveryItems...');
    exportData.tables.materialDeliveryItems = await prisma.materialDeliveryItem.findMany();
    console.log(`  │  └─ ✓ ${exportData.tables.materialDeliveryItems.length} records`);

    // 14. DealerReceipts
    console.log('  ├─ DealerReceipts...');
    exportData.tables.dealerReceipts = await prisma.dealerReceipt.findMany();
    console.log(`  │  └─ ✓ ${exportData.tables.dealerReceipts.length} records`);

    // 15. DealerReceiptItems
    console.log('  ├─ DealerReceiptItems...');
    exportData.tables.dealerReceiptItems = await prisma.dealerReceiptItem.findMany();
    console.log(`  │  └─ ✓ ${exportData.tables.dealerReceiptItems.length} records`);

    // 16. DealerStock
    console.log('  ├─ DealerStock...');
    exportData.tables.dealerStock = await prisma.dealerStock.findMany();
    console.log(`  │  └─ ✓ ${exportData.tables.dealerStock.length} records`);

    // 17. DealerNotifications
    console.log('  ├─ DealerNotifications...');
    exportData.tables.dealerNotifications = await prisma.dealerNotification.findMany();
    console.log(`  │  └─ ✓ ${exportData.tables.dealerNotifications.length} records`);

    // 18. HeadOfficeNotifications
    console.log('  ├─ HeadOfficeNotifications...');
    exportData.tables.headOfficeNotifications = await prisma.headOfficeNotification.findMany();
    console.log(`  │  └─ ✓ ${exportData.tables.headOfficeNotifications.length} records`);

    // 19. RecertificationHistory
    console.log('  ├─ RecertificationHistory...');
    exportData.tables.recertificationHistory = await prisma.recertificationHistory.findMany();
    console.log(`  │  └─ ✓ ${exportData.tables.recertificationHistory.length} records`);

    // 20. DealerRecertificationHistory
    console.log('  └─ DealerRecertificationHistory...');
    exportData.tables.dealerRecertificationHistory = await prisma.dealerRecertificationHistory.findMany();
    console.log(`     └─ ✓ ${exportData.tables.dealerRecertificationHistory.length} records`);

    // บันทึกเป็นไฟล์ JSON
    const filename = `sqlite-export-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));

    console.log('\n✅ Export สำเร็จ!');
    console.log(`📁 ไฟล์: ${filepath}`);
    console.log(`📊 ขนาดไฟล์: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB\n`);

    // สรุปจำนวน records
    const totalRecords = Object.values(exportData.tables).reduce(
      (sum, table) => sum + table.length,
      0
    );
    console.log(`📈 สรุป: Export ข้อมูลทั้งหมด ${totalRecords} records จาก ${Object.keys(exportData.tables).length} ตาราง\n`);

    return filepath;
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการ Export:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the export
exportData()
  .then((filepath) => {
    console.log('🎉 Export เสร็จสมบูรณ์!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Export ล้มเหลว:', error);
    process.exit(1);
  });
