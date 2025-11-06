/**
 * Import ข้อมูลจาก SQLite backup (JSON) ไปยัง PostgreSQL
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function importData(backupFile) {
  console.log('🚀 เริ่มต้น Import ข้อมูลไปยัง PostgreSQL...\n');

  try {
    // อ่านไฟล์ backup
    const backupPath = path.join(__dirname, '..', 'prisma', 'backups', backupFile);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`ไม่พบไฟล์ backup: ${backupPath}`);
    }

    console.log(`📂 อ่านไฟล์: ${backupFile}\n`);
    const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    console.log('📊 กำลัง Import ข้อมูล...\n');
    let totalImported = 0;

    // ลำดับการ import (ตารางแม่ก่อน เพื่อไม่ให้เกิด foreign key error)

    // 1. Dealers (parent table)
    if (data.tables.dealers && data.tables.dealers.length > 0) {
      console.log('  ├─ Dealers...');
      for (const dealer of data.tables.dealers) {
        await prisma.dealer.create({ data: dealer });
      }
      console.log(`  │  └─ ✓ ${data.tables.dealers.length} records`);
      totalImported += data.tables.dealers.length;
    }

    // 2. Users (depends on Dealers)
    if (data.tables.users && data.tables.users.length > 0) {
      console.log('  ├─ Users...');
      for (const user of data.tables.users) {
        await prisma.user.create({ data: user });
      }
      console.log(`  │  └─ ✓ ${data.tables.users.length} records`);
      totalImported += data.tables.users.length;
    }

    // 3. SubDealers (depends on Dealers)
    if (data.tables.subDealers && data.tables.subDealers.length > 0) {
      console.log('  ├─ SubDealers...');
      for (const subDealer of data.tables.subDealers) {
        await prisma.subDealer.create({ data: subDealer });
      }
      console.log(`  │  └─ ✓ ${data.tables.subDealers.length} records`);
      totalImported += data.tables.subDealers.length;
    }

    // 4. RawMaterials (parent table)
    if (data.tables.rawMaterials && data.tables.rawMaterials.length > 0) {
      console.log('  ├─ RawMaterials...');
      for (const rawMaterial of data.tables.rawMaterials) {
        await prisma.rawMaterial.create({ data: rawMaterial });
      }
      console.log(`  │  └─ ✓ ${data.tables.rawMaterials.length} records`);
      totalImported += data.tables.rawMaterials.length;
    }

    // 5. RawMaterialReceiving (depends on RawMaterials)
    if (data.tables.rawMaterialReceiving && data.tables.rawMaterialReceiving.length > 0) {
      console.log('  ├─ RawMaterialReceiving...');
      for (const receiving of data.tables.rawMaterialReceiving) {
        await prisma.rawMaterialReceiving.create({ data: receiving });
      }
      console.log(`  │  └─ ✓ ${data.tables.rawMaterialReceiving.length} records`);
      totalImported += data.tables.rawMaterialReceiving.length;
    }

    // 6. RawMaterialBatches (depends on RawMaterials and Receiving)
    if (data.tables.rawMaterialBatches && data.tables.rawMaterialBatches.length > 0) {
      console.log('  ├─ RawMaterialBatches...');
      for (const batch of data.tables.rawMaterialBatches) {
        await prisma.rawMaterialBatch.create({ data: batch });
      }
      console.log(`  │  └─ ✓ ${data.tables.rawMaterialBatches.length} records`);
      totalImported += data.tables.rawMaterialBatches.length;
    }

    // 7. Products (parent table)
    if (data.tables.products && data.tables.products.length > 0) {
      console.log('  ├─ Products...');
      for (const product of data.tables.products) {
        await prisma.product.create({ data: product });
      }
      console.log(`  │  └─ ✓ ${data.tables.products.length} records`);
      totalImported += data.tables.products.length;
    }

    // 8. ProductRecipes (depends on Products)
    if (data.tables.productRecipes && data.tables.productRecipes.length > 0) {
      console.log('  ├─ ProductRecipes...');
      for (const recipe of data.tables.productRecipes) {
        await prisma.productRecipe.create({ data: recipe });
      }
      console.log(`  │  └─ ✓ ${data.tables.productRecipes.length} records`);
      totalImported += data.tables.productRecipes.length;
    }

    // 9. ProductRecipeItems (depends on ProductRecipes and RawMaterials)
    if (data.tables.productRecipeItems && data.tables.productRecipeItems.length > 0) {
      console.log('  ├─ ProductRecipeItems...');
      for (const item of data.tables.productRecipeItems) {
        await prisma.productRecipeItem.create({ data: item });
      }
      console.log(`  │  └─ ✓ ${data.tables.productRecipeItems.length} records`);
      totalImported += data.tables.productRecipeItems.length;
    }

    // 10. Warranties (depends on Products, Dealers, SubDealers)
    if (data.tables.warranties && data.tables.warranties.length > 0) {
      console.log('  ├─ Warranties...');
      for (const warranty of data.tables.warranties) {
        await prisma.warranty.create({ data: warranty });
      }
      console.log(`  │  └─ ✓ ${data.tables.warranties.length} records`);
      totalImported += data.tables.warranties.length;
    }

    // 11. WarrantyHistory (depends on Warranties)
    if (data.tables.warrantyHistory && data.tables.warrantyHistory.length > 0) {
      console.log('  ├─ WarrantyHistory...');
      for (const history of data.tables.warrantyHistory) {
        await prisma.warrantyHistory.create({ data: history });
      }
      console.log(`  │  └─ ✓ ${data.tables.warrantyHistory.length} records`);
      totalImported += data.tables.warrantyHistory.length;
    }

    // 12. MaterialDeliveries (depends on Dealers)
    if (data.tables.materialDeliveries && data.tables.materialDeliveries.length > 0) {
      console.log('  ├─ MaterialDeliveries...');
      for (const delivery of data.tables.materialDeliveries) {
        await prisma.materialDelivery.create({ data: delivery });
      }
      console.log(`  │  └─ ✓ ${data.tables.materialDeliveries.length} records`);
      totalImported += data.tables.materialDeliveries.length;
    }

    // 13. MaterialDeliveryItems (depends on MaterialDeliveries, RawMaterials, Batches)
    if (data.tables.materialDeliveryItems && data.tables.materialDeliveryItems.length > 0) {
      console.log('  ├─ MaterialDeliveryItems...');
      for (const item of data.tables.materialDeliveryItems) {
        await prisma.materialDeliveryItem.create({ data: item });
      }
      console.log(`  │  └─ ✓ ${data.tables.materialDeliveryItems.length} records`);
      totalImported += data.tables.materialDeliveryItems.length;
    }

    // 14. DealerReceipts (depends on MaterialDeliveries and Dealers)
    if (data.tables.dealerReceipts && data.tables.dealerReceipts.length > 0) {
      console.log('  ├─ DealerReceipts...');
      for (const receipt of data.tables.dealerReceipts) {
        await prisma.dealerReceipt.create({ data: receipt });
      }
      console.log(`  │  └─ ✓ ${data.tables.dealerReceipts.length} records`);
      totalImported += data.tables.dealerReceipts.length;
    }

    // 15. DealerReceiptItems (depends on DealerReceipts)
    if (data.tables.dealerReceiptItems && data.tables.dealerReceiptItems.length > 0) {
      console.log('  ├─ DealerReceiptItems...');
      for (const item of data.tables.dealerReceiptItems) {
        await prisma.dealerReceiptItem.create({ data: item });
      }
      console.log(`  │  └─ ✓ ${data.tables.dealerReceiptItems.length} records`);
      totalImported += data.tables.dealerReceiptItems.length;
    }

    // 16. DealerStock (depends on Dealers)
    if (data.tables.dealerStock && data.tables.dealerStock.length > 0) {
      console.log('  ├─ DealerStock...');
      for (const stock of data.tables.dealerStock) {
        await prisma.dealerStock.create({ data: stock });
      }
      console.log(`  │  └─ ✓ ${data.tables.dealerStock.length} records`);
      totalImported += data.tables.dealerStock.length;
    }

    // 17. DealerNotifications (depends on Dealers)
    if (data.tables.dealerNotifications && data.tables.dealerNotifications.length > 0) {
      console.log('  ├─ DealerNotifications...');
      for (const notification of data.tables.dealerNotifications) {
        await prisma.dealerNotification.create({ data: notification });
      }
      console.log(`  │  └─ ✓ ${data.tables.dealerNotifications.length} records`);
      totalImported += data.tables.dealerNotifications.length;
    }

    // 18. HeadOfficeNotifications
    if (data.tables.headOfficeNotifications && data.tables.headOfficeNotifications.length > 0) {
      console.log('  ├─ HeadOfficeNotifications...');
      for (const notification of data.tables.headOfficeNotifications) {
        await prisma.headOfficeNotification.create({ data: notification });
      }
      console.log(`  │  └─ ✓ ${data.tables.headOfficeNotifications.length} records`);
      totalImported += data.tables.headOfficeNotifications.length;
    }

    // 19. RecertificationHistory (depends on RawMaterialBatches)
    if (data.tables.recertificationHistory && data.tables.recertificationHistory.length > 0) {
      console.log('  ├─ RecertificationHistory...');
      for (const history of data.tables.recertificationHistory) {
        await prisma.recertificationHistory.create({ data: history });
      }
      console.log(`  │  └─ ✓ ${data.tables.recertificationHistory.length} records`);
      totalImported += data.tables.recertificationHistory.length;
    }

    // 20. DealerRecertificationHistory (depends on DealerStock)
    if (data.tables.dealerRecertificationHistory && data.tables.dealerRecertificationHistory.length > 0) {
      console.log('  └─ DealerRecertificationHistory...');
      for (const history of data.tables.dealerRecertificationHistory) {
        await prisma.dealerRecertificationHistory.create({ data: history });
      }
      console.log(`     └─ ✓ ${data.tables.dealerRecertificationHistory.length} records`);
      totalImported += data.tables.dealerRecertificationHistory.length;
    }

    console.log('\n✅ Import สำเร็จ!');
    console.log(`📈 Import ข้อมูลทั้งหมด ${totalImported} records\n`);

    return totalImported;
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการ Import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// รับชื่อไฟล์จาก command line argument หรือใช้ไฟล์ล่าสุด
const backupFile = process.argv[2] || 'sqlite-export-2025-11-06T04-25-04-082Z.json';

// Run the import
importData(backupFile)
  .then((count) => {
    console.log('🎉 Import เสร็จสมบูรณ์!');
    console.log(`✅ นำเข้าข้อมูลสำเร็จทั้งหมด ${count} records`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Import ล้มเหลว:', error);
    process.exit(1);
  });
