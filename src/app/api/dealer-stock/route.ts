import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - ดึงรายการ Stock ของ Dealer
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const lowStock = searchParams.get('lowStock')
    const materialCode = searchParams.get('materialCode') // เพิ่ม: filter by materialCode
    const batchNumber = searchParams.get('batchNumber') // เพิ่ม: filter by batchNumber
    const dealerId = searchParams.get('dealerId') // เพิ่ม: สำหรับ HeadOffice
    const availableOnly = searchParams.get('availableOnly') // เพิ่ม: แสดงเฉพาะที่มีสต็อก

    let whereClause: any = {}

    // Filter by dealer if user is dealer
    if (session.user.userGroup === 'Dealer') {
      whereClause.dealerId = session.user.dealerId
    } else if (dealerId) {
      // HeadOffice สามารถระบุ dealerId ได้
      whereClause.dealerId = dealerId
    }

    // Filter by materialCode
    if (materialCode) {
      whereClause.materialCode = materialCode
    }

    // Filter by batchNumber
    if (batchNumber) {
      whereClause.batchNumber = batchNumber
    }

    // Filter available stock only (currentStock > 0)
    if (availableOnly === 'true') {
      whereClause.currentStock = { gt: 0 }
    }

    // Search functionality
    if (search) {
      whereClause.OR = [
        { materialCode: { contains: search } },
        { materialName: { contains: search } },
        { materialType: { contains: search } },
        { batchNumber: { contains: search } }
      ]
    }

    // Filter low stock
    if (lowStock === 'true') {
      whereClause.currentStock = { lte: 10 } // Consider stock <= 10 as low
    }

    const stocks = await prisma.dealerStock.findMany({
      where: whereClause,
      include: {
        dealer: true
      },
      orderBy: [
        { currentStock: 'asc' }, // Show low stock first
        { lastUpdated: 'desc' }
      ]
    })

    // Calculate statistics
    const totalItems = stocks.length
    const totalStock = stocks.reduce((sum, stock) => sum + stock.currentStock, 0)
    const lowStockItems = stocks.filter(stock => stock.currentStock <= 10).length
    const zeroStockItems = stocks.filter(stock => stock.currentStock === 0).length

    return NextResponse.json({
      stocks,
      stats: {
        totalItems,
        totalStock,
        lowStockItems,
        zeroStockItems
      },
      success: true
    })
  } catch (error) {
    console.error('Error fetching dealer stock:', error)
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูล Stock ได้' },
      { status: 500 }
    )
  }
}