import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/products/[id] - ดึงข้อมูลสินค้าคนเดียว
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        warranties: {
          orderBy: {
            warrantyDate: 'desc'
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/products/[id] - แก้ไขข้อมูลสินค้า
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const {
      productCode,
      productName,
      serialNumber,
      category,
      description,
      warrantyTerms,
      thickness
    } = body

    // ตรวจสอบว่าสินค้ามีอยู่หรือไม่
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบว่า productCode ซ้ำหรือไม่ (ยกเว้นสินค้าปัจจุบัน)
    if (productCode !== existingProduct.productCode) {
      const duplicateProduct = await prisma.product.findUnique({
        where: { productCode }
      })

      if (duplicateProduct) {
        return NextResponse.json(
          { error: 'Product code already exists' },
          { status: 400 }
        )
      }
    }

    // ตรวจสอบว่า serialNumber ซ้ำหรือไม่ (ยกเว้นสินค้าปัจจุบัน)
    if (serialNumber && serialNumber !== existingProduct.serialNumber) {
      const duplicateSerial = await prisma.product.findUnique({
        where: { serialNumber }
      })

      if (duplicateSerial) {
        return NextResponse.json(
          { error: 'Serial number already exists' },
          { status: 400 }
        )
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        productCode,
        productName,
        serialNumber: serialNumber || null,
        category,
        description: description || null,
        warrantyTerms: warrantyTerms || null,
        thickness: thickness ? parseFloat(thickness) : null
      },
      include: {
        warranties: {
          select: {
            id: true,
            warrantyNumber: true,
            warrantyDate: true,
            expiryDate: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Product updated successfully',
      product: updatedProduct
    })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id] - ลบสินค้า
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    // ตรวจสอบว่าสินค้ามีอยู่หรือไม่
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        warranties: true
      }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // ตรวจสอบว่ามีใบรับประกันแล้วหรือไม่
    if (existingProduct.warranties.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product that has warranties issued' },
        { status: 400 }
      )
    }

    await prisma.product.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'Product deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}