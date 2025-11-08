/**
 * Migration Script: อัพโหลด Template ไฟล์จาก public/ ไปยัง Vercel Blob
 *
 * วิธีรัน: npx tsx scripts/migrate-templates-to-blob.ts
 */

import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

// โหลด environment variables จาก .env.local
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      // ข้ามบรรทัดว่างและ comment
      if (!line.trim() || line.trim().startsWith('#')) continue;

      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // ลบ quotes ออกถ้ามี
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        process.env[key] = value;
      }
    }
  }
}

async function migrateTemplates() {
  // โหลด environment variables ก่อน
  loadEnvFile();

  console.log('🚀 เริ่มต้น Migration: อัพโหลด Templates ไปยัง Vercel Blob\n');

  try {
    // ตรวจสอบว่ามี BLOB_READ_WRITE_TOKEN หรือไม่
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('❌ Error: BLOB_READ_WRITE_TOKEN ไม่ได้ตั้งค่าใน .env.local');
      console.log('กรุณาตั้งค่า BLOB_READ_WRITE_TOKEN ใน .env.local ก่อน');
      process.exit(1);
    }

    console.log('✅ โหลด BLOB_READ_WRITE_TOKEN สำเร็จ\n');

    // อ่านไฟล์ทั้งหมดจาก public/
    const publicDir = path.join(process.cwd(), 'public');
    const files = fs.readdirSync(publicDir);

    // กรองเฉพาะไฟล์ที่ขึ้นต้นด้วย "Certification-Form" และเป็น .jpg/.jpeg
    const templateFiles = files.filter(file =>
      file.startsWith('Certification-Form') &&
      (file.endsWith('.jpg') || file.endsWith('.jpeg'))
    );

    console.log(`📁 พบ Template ทั้งหมด ${templateFiles.length} ไฟล์:\n`);
    templateFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    console.log('');

    if (templateFiles.length === 0) {
      console.log('⚠️  ไม่พบไฟล์ Template ให้อัพโหลด');
      return;
    }

    // อัพโหลดไฟล์ทีละไฟล์
    let successCount = 0;
    let errorCount = 0;

    for (const filename of templateFiles) {
      try {
        console.log(`📤 กำลังอัพโหลด: ${filename}...`);

        // อ่านไฟล์
        const filePath = path.join(publicDir, filename);
        const fileBuffer = fs.readFileSync(filePath);
        const fileStats = fs.statSync(filePath);

        // แปลง Buffer เป็น File object
        const file = new File([fileBuffer], filename, {
          type: 'image/jpeg',
        });

        // อัพโหลดไปยัง Vercel Blob
        const blob = await put(`templates/${filename}`, file, {
          access: 'public',
          addRandomSuffix: false,
        });

        console.log(`   ✅ สำเร็จ! URL: ${blob.url}`);
        console.log(`   📊 ขนาดไฟล์: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB\n`);

        successCount++;
      } catch (error) {
        console.error(`   ❌ ล้มเหลว: ${filename}`);
        console.error(`   Error: ${error}\n`);
        errorCount++;
      }
    }

    // สรุปผล
    console.log('═══════════════════════════════════════════════');
    console.log('📊 สรุปผลการ Migration:');
    console.log(`   ✅ สำเร็จ: ${successCount} ไฟล์`);
    console.log(`   ❌ ล้มเหลว: ${errorCount} ไฟล์`);
    console.log(`   📁 ทั้งหมด: ${templateFiles.length} ไฟล์`);
    console.log('═══════════════════════════════════════════════\n');

    if (successCount > 0) {
      console.log('🎉 Migration เสร็จสมบูรณ์!');
      console.log('ตอนนี้คุณสามารถลบไฟล์ template จาก public/ ได้แล้ว (ถ้าต้องการ)\n');
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการ Migration:', error);
    process.exit(1);
  }
}

// รัน migration
migrateTemplates();
