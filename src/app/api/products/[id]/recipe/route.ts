import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/products/[id]/recipe - ดึงสูตรการผลิตของสินค้า
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params
    console.log('GET Recipe API - Product ID:', id)

    // ดึงข้อมูลสินค้าเพื่อตรวจสอบว่ามีอยู่จริง
    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'ไม่พบสินค้าที่ระบุ' },
        { status: 404 }
      )
    }

    const recipe = await prisma.productRecipe.findUnique({
      where: { productId: id },
      include: {
        items: {
          include: {
            rawMaterial: {
              select: {
                id: true,
                materialCode: true,
                materialName: true,
                materialType: true,
                unit: true,
                currentStock: true,
                description: true,
                supplier: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        product: {
          select: {
            id: true,
            productCode: true,
            productName: true,
            category: true
          }
        }
      }
    })

    console.log('Recipe found:', recipe ? 'Yes' : 'No', recipe ? `(${recipe.recipeName})` : '')

    return NextResponse.json({ recipe })
  } catch (error) {
    console.error('Error fetching product recipe:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสูตรการผลิต' },
      { status: 500 }
    )
  }
}

// POST /api/products/[id]/recipe - สร้างสูตรการผลิตใหม่
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Debug: แสดง session info
    console.log('POST Recipe API - Session User:', {
      userGroup: session.user.userGroup,
      role: session.user.role,
      firstName: session.user.firstName,
      lastName: session.user.lastName
    })

    // เฉพาะ HeadOffice ที่มีสิทธิ์ Super Admin, Admin หรือ Manager เท่านั้นที่สามารถสร้างสูตรได้
    const allowedRoles = ['Super Admin', 'Admin', 'Manager']
    if (session.user.userGroup !== 'HeadOffice' || !allowedRoles.includes(session.user.role)) {
      console.log('POST Recipe API - Access Denied:', {
        userGroup: session.user.userGroup,
        role: session.user.role,
        isHeadOffice: session.user.userGroup === 'HeadOffice',
        isAllowedRole: allowedRoles.includes(session.user.role)
      })
      return NextResponse.json(
        { error: 'Forbidden: Only Admin and Manager can create recipes' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { recipeName, description, calculationUnit, items } = body

    // ตรวจสอบว่าสินค้านี้มีสูตรแล้วหรือยัง
    const existingRecipe = await prisma.productRecipe.findUnique({
      where: { productId: id }
    })

    if (existingRecipe) {
      return NextResponse.json(
        { error: 'สินค้านี้มีสูตรการผลิตแล้ว' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่าสินค้าที่ระบุมีอยู่จริง
    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'ไม่พบสินค้าที่ระบุ' },
        { status: 404 }
      )
    }

    // สร้างสูตรการผลิตและรายการวัตถุดิบ
    const recipe = await prisma.productRecipe.create({
      data: {
        productId: id,
        recipeName: recipeName || 'สูตรมาตรฐาน',
        description,
        calculationUnit: calculationUnit || 'PER_SQM',
        items: {
          create: items.map((item: any) => ({
            rawMaterialId: item.rawMaterialId,
            quantity: parseFloat(item.quantity),
            unit: item.unit,
            notes: item.notes
          }))
        }
      },
      include: {
        items: {
          include: {
            rawMaterial: {
              select: {
                id: true,
                materialCode: true,
                materialName: true,
                materialType: true,
                unit: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ recipe }, { status: 201 })
  } catch (error) {
    console.error('Error creating product recipe:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างสูตรการผลิต' },
      { status: 500 }
    )
  }
}

// PUT /api/products/[id]/recipe - แก้ไขสูตรการผลิต
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // เฉพาะ HeadOffice ที่มีสิทธิ์ Super Admin, Admin หรือ Manager เท่านั้นที่สามารถแก้ไขสูตรได้
    const allowedRoles = ['Super Admin', 'Admin', 'Manager']
    if (session.user.userGroup !== 'HeadOffice' || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only Admin and Manager can update recipes' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { recipeName, description, calculationUnit, items } = body

    // ตรวจสอบว่าสูตรมีอยู่
    const existingRecipe = await prisma.productRecipe.findUnique({
      where: { productId: id }
    })

    if (!existingRecipe) {
      return NextResponse.json(
        { error: 'ไม่พบสูตรการผลิตของสินค้านี้' },
        { status: 404 }
      )
    }

    // อัปเดตสูตรการผลิต
    const recipe = await prisma.$transaction(async (tx) => {
      // ลบรายการวัตถุดิบเดิมทั้งหมด
      await tx.productRecipeItem.deleteMany({
        where: { recipeId: existingRecipe.id }
      })

      // อัปเดตข้อมูลสูตรและเพิ่มรายการใหม่
      return await tx.productRecipe.update({
        where: { id: existingRecipe.id },
        data: {
          recipeName: recipeName || existingRecipe.recipeName,
          description,
          calculationUnit: calculationUnit || existingRecipe.calculationUnit || 'PER_SQM',
          items: {
            create: items.map((item: any) => ({
              rawMaterialId: item.rawMaterialId,
              quantity: parseFloat(item.quantity),
              unit: item.unit,
              notes: item.notes
            }))
          }
        },
        include: {
          items: {
            include: {
              rawMaterial: {
                select: {
                  id: true,
                  materialCode: true,
                  materialName: true,
                  materialType: true,
                  unit: true
                }
              }
            }
          }
        }
      })
    })

    return NextResponse.json({ recipe })
  } catch (error) {
    console.error('Error updating product recipe:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการแก้ไขสูตรการผลิต' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id]/recipe - ลบสูตรการผลิต
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // เฉพาะ HeadOffice ที่มีสิทธิ์ Super Admin, Admin หรือ Manager เท่านั้นที่สามารถลบสูตรได้
    const allowedRoles = ['Super Admin', 'Admin', 'Manager']
    if (session.user.userGroup !== 'HeadOffice' || !allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only Admin and Manager can delete recipes' },
        { status: 403 }
      )
    }

    const { id } = params

    const existingRecipe = await prisma.productRecipe.findUnique({
      where: { productId: id }
    })

    if (!existingRecipe) {
      return NextResponse.json(
        { error: 'ไม่พบสูตรการผลิตของสินค้านี้' },
        { status: 404 }
      )
    }

    // ลบสูตรการผลิต (รายการวัตถุดิบจะถูกลบอัตโนมัติเนื่องจาก onDelete: Cascade)
    await prisma.productRecipe.delete({
      where: { id: existingRecipe.id }
    })

    return NextResponse.json({ message: 'ลบสูตรการผลิตสำเร็จ' })
  } catch (error) {
    console.error('Error deleting product recipe:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบสูตรการผลิต' },
      { status: 500 }
    )
  }
}