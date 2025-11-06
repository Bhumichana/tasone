const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkRecipes() {
  try {
    console.log('🔍 ตรวจสอบข้อมูล ProductRecipe...\n')

    // ดึงข้อมูล recipes ทั้งหมด
    const recipes = await prisma.productRecipe.findMany({
      include: {
        product: {
          select: {
            id: true,
            productCode: true,
            productName: true
          }
        },
        items: {
          select: {
            id: true,
            rawMaterialId: true
          }
        }
      }
    })

    console.log(`📊 พบสูตรการผลิตทั้งหมด: ${recipes.length} รายการ\n`)

    if (recipes.length === 0) {
      console.log('ℹ️  ไม่มีสูตรการผลิตในระบบ')
      return
    }

    // แสดงรายละเอียดแต่ละ recipe
    recipes.forEach((recipe, index) => {
      console.log(`${index + 1}. สูตร: ${recipe.recipeName}`)
      console.log(`   - Recipe ID: ${recipe.id}`)
      console.log(`   - Product ID: ${recipe.productId}`)
      console.log(`   - สินค้า: ${recipe.product.productName} (${recipe.product.productCode})`)
      console.log(`   - จำนวนวัตถุดิบ: ${recipe.items.length} รายการ`)
      console.log('')
    })

    // ตรวจสอบว่ามี productId ซ้ำหรือไม่
    const productIds = recipes.map(r => r.productId)
    const uniqueProductIds = [...new Set(productIds)]

    if (productIds.length !== uniqueProductIds.length) {
      console.log('⚠️  พบ productId ซ้ำ! (ไม่ควรเกิดขึ้นเนื่องจากมี @unique constraint)')

      // หา productId ที่ซ้ำ
      const duplicates = productIds.filter((item, index) => productIds.indexOf(item) !== index)
      console.log('   ProductIds ที่ซ้ำ:', [...new Set(duplicates)])
    } else {
      console.log('✅ ไม่มี productId ซ้ำ - ข้อมูลถูกต้อง')
    }

    // ตรวจสอบว่ามีสินค้าที่ไม่มี recipe กี่ตัว
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        productCode: true,
        productName: true,
        recipe: {
          select: {
            id: true
          }
        }
      }
    })

    const productsWithoutRecipe = allProducts.filter(p => !p.recipe)
    console.log(`\n📦 สินค้าทั้งหมด: ${allProducts.length} รายการ`)
    console.log(`   - มีสูตร: ${recipes.length} รายการ`)
    console.log(`   - ยังไม่มีสูตร: ${productsWithoutRecipe.length} รายการ`)

    if (productsWithoutRecipe.length > 0) {
      console.log('\nสินค้าที่ยังไม่มีสูตร:')
      productsWithoutRecipe.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.productName} (${p.productCode})`)
      })
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkRecipes()
