import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')
  console.log('📝 Creating admin user only (minimal seed)...')

  // สร้าง Admin User เท่านั้น
  const hashedPassword = await bcrypt.hash('admin123', 10)

  await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      userGroup: 'HeadOffice',
      role: 'Super Admin',
      firstName: 'ผู้ดูแล',
      lastName: 'ระบบ',
      phoneNumber: '02-000-0000',
      isActive: true, // Admin account ต้องสามารถใช้งานได้ทันที
    },
  })

  console.log('✅ Database seeding completed!')
  console.log('\n📊 Summary:')
  console.log(`- Created ${await prisma.user.count()} user (admin only)`)
  console.log(`- Created ${await prisma.dealer.count()} dealers`)
  console.log(`- Created ${await prisma.rawMaterial.count()} raw materials`)
  console.log(`- Created ${await prisma.product.count()} products`)
  console.log(`- Created ${await prisma.warranty.count()} warranties`)

  console.log('\n🔐 Login Credentials:')
  console.log('Admin: username="admin", password="admin123"')
  console.log('\n💡 Database is now clean and ready for testing!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })