import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // สร้าง Dealers
  const dealer1 = await prisma.dealer.create({
    data: {
      dealerCode: 'DLR001',
      manufacturerNumber: 'MFG-2024-001',
      dealerName: 'บริษัท ผู้แทนจำหน่าย เอ จำกัด',
      address: '123 ถนนสุขุมวิท แขวงคลองตัน เขตคลองตัน กรุงเทพฯ 10110',
      phoneNumber: '02-123-4567',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-12-31'),
    },
  })

  const dealer2 = await prisma.dealer.create({
    data: {
      dealerCode: 'DLR002',
      manufacturerNumber: 'MFG-2024-002',
      dealerName: 'บริษัท ผู้แทนจำหน่าย บี จำกัด',
      address: '456 ถนนพหลโยธิน แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900',
      phoneNumber: '02-234-5678',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2025-12-31'),
    },
  })

  const dealer3 = await prisma.dealer.create({
    data: {
      dealerCode: 'DLR003',
      manufacturerNumber: 'MFG-2024-003',
      dealerName: 'บริษัท ผู้แทนจำหน่าย ซี จำกัด',
      address: '789 ถนนเพชรบุรี แขวงมักกะสัน เขตราชเทวี กรุงเทพฯ 10400',
      phoneNumber: '02-345-6789',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2025-12-31'),
    },
  })

  // สร้าง Users
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const dealerPassword = await bcrypt.hash('dealer123', 10)

  // Admin Users (HeadOffice)
  await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      userGroup: 'HeadOffice',
      role: 'Super Admin',
      firstName: 'ผู้ดูแล',
      lastName: 'ระบบ',
      phoneNumber: '02-000-0000',
    },
  })

  await prisma.user.create({
    data: {
      username: 'manager1',
      password: hashedPassword,
      userGroup: 'HeadOffice',
      role: 'Manager',
      firstName: 'สมชาย',
      lastName: 'ใจดี',
      phoneNumber: '02-111-1111',
    },
  })

  // Dealer Users
  await prisma.user.create({
    data: {
      username: 'dealer1',
      password: dealerPassword,
      userGroup: 'Dealer',
      role: 'Dealer Admin',
      firstName: 'วิชาญ',
      lastName: 'รุ่งเรือง',
      phoneNumber: '081-111-1111',
      dealerId: dealer1.id,
    },
  })

  await prisma.user.create({
    data: {
      username: 'dealer2',
      password: dealerPassword,
      userGroup: 'Dealer',
      role: 'Dealer Admin',
      firstName: 'สุดา',
      lastName: 'มั่งมี',
      phoneNumber: '081-222-2222',
      dealerId: dealer2.id,
    },
  })

  await prisma.user.create({
    data: {
      username: 'dealer3',
      password: dealerPassword,
      userGroup: 'Dealer',
      role: 'Dealer Staff',
      firstName: 'ประยงค์',
      lastName: 'สุขสม',
      phoneNumber: '081-333-3333',
      dealerId: dealer3.id,
    },
  })

  // สร้าง Raw Materials
  const rawMaterials = [
    {
      materialCode: 'RM001',
      materialName: 'น้ำยา ISO ชนิด A',
      materialType: 'น้ำยา ISO',
      unit: 'ลิตร',
      supplier: 'บริษัท ซัพพลายเออร์ A จำกัด',
      currentStock: 1000,
      minStock: 100,
      dealerId: dealer1.id,
    },
    {
      materialCode: 'RM002',
      materialName: 'น้ำยา ISO ชนิด B',
      materialType: 'น้ำยา ISO',
      unit: 'ลิตร',
      supplier: 'บริษัท ซัพพลายเออร์ B จำกัด',
      currentStock: 800,
      minStock: 80,
      dealerId: dealer1.id,
    },
    {
      materialCode: 'RM003',
      materialName: 'น้ำยา ISO ชนิด C',
      materialType: 'น้ำยา ISO',
      unit: 'ลิตร',
      supplier: 'บริษัท ซัพพลายเออร์ C จำกัด',
      currentStock: 1200,
      minStock: 120,
      dealerId: dealer2.id,
    },
    {
      materialCode: 'RM004',
      materialName: 'สารเติมแต่งพิเศษ',
      materialType: 'สารเติมแต่ง',
      unit: 'กิโลกรัม',
      supplier: 'บริษัท สารเคมี A จำกัด',
      currentStock: 500,
      minStock: 50,
      dealerId: dealer2.id,
    },
    {
      materialCode: 'RM005',
      materialName: 'สารกันรั่ว',
      materialType: 'สารป้องกัน',
      unit: 'ลิตร',
      supplier: 'บริษัท สารเคมี B จำกัด',
      currentStock: 300,
      minStock: 30,
      dealerId: dealer3.id,
    },
    {
      materialCode: 'RM006',
      materialName: 'สารยึดติด',
      materialType: 'สารยึดติด',
      unit: 'กิโลกรัม',
      supplier: 'บริษัท กาว A จำกัด',
      currentStock: 200,
      minStock: 20,
      dealerId: dealer3.id,
    },
    {
      materialCode: 'RM007',
      materialName: 'สีย้อมโฟม',
      materialType: 'สารย้อมสี',
      unit: 'ลิตร',
      supplier: 'บริษัท สี A จำกัด',
      currentStock: 150,
      minStock: 15,
      dealerId: dealer1.id,
    },
    {
      materialCode: 'RM008',
      materialName: 'สารกันไฟ',
      materialType: 'สารป้องกันไฟ',
      unit: 'กิโลกรัม',
      supplier: 'บริษัท ป้องกันไฟ A จำกัด',
      currentStock: 400,
      minStock: 40,
      dealerId: dealer2.id,
    },
    {
      materialCode: 'RM009',
      materialName: 'สารกันเชื้อรา',
      materialType: 'สารป้องกันเชื้อรา',
      unit: 'ลิตร',
      supplier: 'บริษัท เคมีภัณฑ์ A จำกัด',
      currentStock: 250,
      minStock: 25,
      dealerId: dealer1.id,
    },
    {
      materialCode: 'RM010',
      materialName: 'สารเร่งปฏิกิริยา',
      materialType: 'สารเร่งปฏิกิริยา',
      unit: 'ลิตร',
      supplier: 'บริษัท เคมีภัณฑ์ B จำกัด',
      currentStock: 600,
      minStock: 60,
      dealerId: dealer3.id,
    },
  ]

  for (const material of rawMaterials) {
    await prisma.rawMaterial.create({
      data: material,
    })
  }

  // สร้าง Sales Records
  const sales = await Promise.all([
    prisma.sale.create({
      data: {
        saleNumber: 'SALE-2024-001',
        customerName: 'บริษัท ลูกค้า A จำกัด',
        customerPhone: '02-111-2222',
        customerAddress: '123 ถนนสาทร แขวงสีลม เขตบางรัก กรุงเทพฯ 10500',
        saleDate: new Date('2024-01-15'),
        totalAmount: 150000,
        status: 'completed',
        dealerId: dealer1.id,
      },
    }),
    prisma.sale.create({
      data: {
        saleNumber: 'SALE-2024-002',
        customerName: 'บริษัท ลูกค้า B จำกัด',
        customerPhone: '02-222-3333',
        customerAddress: '456 ถนนรัชดา แขวงดินแดง เขตดินแดง กรุงเทพฯ 10400',
        saleDate: new Date('2024-02-20'),
        totalAmount: 250000,
        status: 'completed',
        dealerId: dealer2.id,
      },
    }),
    prisma.sale.create({
      data: {
        saleNumber: 'SALE-2024-003',
        customerName: 'บริษัท ลูกค้า C จำกัด',
        customerPhone: '02-333-4444',
        customerAddress: '789 ถนนอโศก แขวงคลองตัน เขตคลองตัน กรุงเทพฯ 10110',
        saleDate: new Date('2024-03-10'),
        totalAmount: 180000,
        status: 'completed',
        dealerId: dealer3.id,
      },
    }),
  ])

  // สร้าง Sale Items
  const allRawMaterials = await prisma.rawMaterial.findMany()

  for (let i = 0; i < sales.length; i++) {
    for (let j = 0; j < 3; j++) {
      const material = allRawMaterials[j + i * 2]
      if (material) {
        const quantity = Math.floor(Math.random() * 100) + 50
        const unitPrice = Math.floor(Math.random() * 500) + 200
        await prisma.saleItem.create({
          data: {
            saleId: sales[i].id,
            rawMaterialId: material.id,
            quantity: quantity,
            unitPrice: unitPrice,
            totalPrice: quantity * unitPrice,
          },
        })
      }
    }
  }

  // สร้าง Products
  const products = [
    {
      productCode: 'PD001',
      productName: 'โฟมฉนวนกันความร้อน ชั้นดี',
      serialNumber: 'SN-PD001-001',
      category: 'โฟมฉนวน',
      description: 'โฟมฉนวนกันความร้อนสำหรับงานก่อสร้าง',
      dealerId: dealer1.id,
    },
    {
      productCode: 'PD002',
      productName: 'โฟมฉนวนกันความร้อน ชั้นพิเศษ',
      serialNumber: 'SN-PD002-001',
      category: 'โฟมฉนวนพิเศษ',
      description: 'โฟมฉนวนกันความร้อนคุณภาพสูง',
      dealerId: dealer1.id,
    },
    {
      productCode: 'PD003',
      productName: 'โฟมฉนวนกันเสียง',
      serialNumber: 'SN-PD003-001',
      category: 'โฟมฉนวนกันเสียง',
      description: 'โฟมฉนวนสำหรับงานกันเสียง',
      dealerId: dealer2.id,
    },
    {
      productCode: 'PD004',
      productName: 'โฟมฉนวนกันไฟ',
      serialNumber: 'SN-PD004-001',
      category: 'โฟมฉนวนกันไฟ',
      description: 'โฟมฉนวนทนไฟตามมาตรฐาน UL',
      dealerId: dealer2.id,
    },
    {
      productCode: 'PD005',
      productName: 'โฟมฉนวนกันน้ำ',
      serialNumber: 'SN-PD005-001',
      category: 'โฟมฉนวนกันน้ำ',
      description: 'โฟมฉนวนกันน้ำสำหรับงานเฉพาะ',
      dealerId: dealer3.id,
    },
  ]

  const createdProducts = []
  for (const product of products) {
    const createdProduct = await prisma.product.create({
      data: product,
    })
    createdProducts.push(createdProduct)
  }

  // สร้าง Warranties
  for (let i = 0; i < createdProducts.length; i++) {
    const product = createdProducts[i]
    const dealer = await prisma.dealer.findUnique({ where: { id: product.dealerId } })

    await prisma.warranty.create({
      data: {
        warrantyNumber: `${dealer?.dealerCode}-${new Date().getDate().toString().padStart(2, '0')}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getFullYear()}-${(i + 1).toString().padStart(3, '0')}`,
        productId: product.id,
        customerName: `คุณลูกค้า${i + 1} ${i % 2 === 0 ? 'ชาย' : 'หญิง'}`,
        customerPhone: `08${i + 1}-111-111${i}`,
        customerEmail: `customer${i + 1}@example.com`,
        customerAddress: `${123 + i} หมู่ ${i + 1} ตำบลบางพลี อำเภอบางพลี จังหวัดสมุทรปราการ 10540`,
        warrantyDate: new Date(2024, i % 12, 15),
        expiryDate: new Date(2027, i % 12, 15), // 3 ปี
        warrantyPeriodMonths: 36,
        warrantyTerms: `รับประกันคุณภาพ ${product.productName} เป็นเวลา 3 ปี`,
        dealerId: product.dealerId,
      },
    })
  }

  console.log('✅ Database seeding completed!')
  console.log('\n📊 Summary:')
  console.log(`- Created ${await prisma.dealer.count()} dealers`)
  console.log(`- Created ${await prisma.user.count()} users`)
  console.log(`- Created ${await prisma.rawMaterial.count()} raw materials`)
  console.log(`- Created ${await prisma.sale.count()} sales`)
  console.log(`- Created ${await prisma.saleItem.count()} sale items`)
  console.log(`- Created ${await prisma.product.count()} products`)
  console.log(`- Created ${await prisma.warranty.count()} warranties`)

  console.log('\n🔐 Login Credentials:')
  console.log('Admin: username="admin", password="admin123"')
  console.log('Dealer1: username="dealer1", password="dealer123"')
  console.log('Dealer2: username="dealer2", password="dealer123"')
  console.log('Dealer3: username="dealer3", password="dealer123"')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })