import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const dealerId = searchParams.get('dealer') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const recertifiedBy = searchParams.get('recertifiedBy') || ''

    // Build where clauses for both tables
    const whereBase: any = {}
    const whereDealerBase: any = {}

    // Date filters (common for both)
    if (startDate) {
      whereBase.createdAt = { ...whereBase.createdAt, gte: new Date(startDate) }
      whereDealerBase.createdAt = { ...whereDealerBase.createdAt, gte: new Date(startDate) }
    }
    if (endDate) {
      whereBase.createdAt = { ...whereBase.createdAt, lte: new Date(endDate) }
      whereDealerBase.createdAt = { ...whereDealerBase.createdAt, lte: new Date(endDate) }
    }

    // Recertifier filter (common for both)
    if (recertifiedBy) {
      whereBase.recertifiedBy = recertifiedBy
      whereDealerBase.recertifiedBy = recertifiedBy
    }

    // Search filter
    if (search) {
      whereBase.OR = [
        { batch: { batchNumber: { contains: search } } },
        { batch: { rawMaterial: { materialCode: { contains: search } } } },
        { batch: { rawMaterial: { materialName: { contains: search } } } },
        { recertifiedByName: { contains: search } },
        { reason: { contains: search } },
      ]
      whereDealerBase.OR = [
        { dealerStock: { batchNumber: { contains: search } } },
        { dealerStock: { materialCode: { contains: search } } },
        { dealerStock: { materialName: { contains: search } } },
        { dealerStock: { dealer: { dealerName: { contains: search } } } },
        { recertifiedByName: { contains: search } },
        { reason: { contains: search } },
      ]
    }

    // Dealer filter (only for dealer histories, not HeadOffice batches)
    if (dealerId) {
      whereDealerBase.dealerStock = {
        ...whereDealerBase.dealerStock,
        dealerId: dealerId,
      }
    }

    // Fetch from RecertificationHistory (HeadOffice warehouse)
    const headOfficeHistories = await prisma.recertificationHistory.findMany({
      where: whereBase,
      include: {
        batch: {
          include: {
            rawMaterial: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Fetch from DealerRecertificationHistory (Dealer stocks)
    const dealerHistories = await prisma.dealerRecertificationHistory.findMany({
      where: whereDealerBase,
      include: {
        dealerStock: {
          include: {
            dealer: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Format HeadOffice histories
    const formattedHeadOfficeHistories = headOfficeHistories.map((history) => ({
      id: history.id,
      batchId: history.batchId,
      batchNumber: history.batch.batchNumber,
      materialCode: history.batch.rawMaterial.materialCode,
      materialName: history.batch.rawMaterial.materialName,
      materialType: history.batch.rawMaterial.materialType,
      dealerId: 'HeadOffice',
      dealerCode: 'HQ',
      dealerName: 'HeadOffice Warehouse',
      dealerRegion: '-',
      oldExpiryDate: history.oldExpiryDate,
      newExpiryDate: history.newExpiryDate,
      extendedDays: history.extendedDays,
      recertifiedBy: history.recertifiedBy,
      recertifiedByName: history.recertifiedByName,
      reason: history.reason,
      note: history.note,
      createdAt: history.createdAt,
      source: 'HeadOffice' // เพื่อแยกว่ามาจากไหน
    }))

    // Format Dealer histories
    const formattedDealerHistories = dealerHistories.map((history) => ({
      id: history.id,
      batchId: history.dealerStockId,
      batchNumber: history.dealerStock.batchNumber,
      materialCode: history.dealerStock.materialCode,
      materialName: history.dealerStock.materialName,
      materialType: history.dealerStock.materialType,
      dealerId: history.dealerStock.dealerId,
      dealerCode: history.dealerStock.dealer.dealerCode,
      dealerName: history.dealerStock.dealer.dealerName,
      dealerRegion: history.dealerStock.dealer.region || '-',
      oldExpiryDate: history.oldExpiryDate,
      newExpiryDate: history.newExpiryDate,
      extendedDays: history.extendedDays,
      recertifiedBy: history.recertifiedBy,
      recertifiedByName: history.recertifiedByName,
      reason: history.reason,
      note: history.note,
      createdAt: history.createdAt,
      source: 'Dealer' // เพื่อแยกว่ามาจากไหน
    }))

    // Combine and sort by date
    const allHistories = [...formattedHeadOfficeHistories, ...formattedDealerHistories]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Calculate summary statistics
    const summary = {
      totalRecertifications: allHistories.length,
      uniqueBatches: new Set(allHistories.map((h) => h.batchId)).size,
      uniqueDealers: new Set(allHistories.map((h) => h.dealerId)).size,
      totalDaysExtended: allHistories.reduce((sum, h) => sum + h.extendedDays, 0),
      averageDaysExtended:
        allHistories.length > 0
          ? Math.round(
              allHistories.reduce((sum, h) => sum + h.extendedDays, 0) / allHistories.length
            )
          : 0,
    }

    // Get unique users who performed recertification (from both tables)
    const headOfficeRecertifiers = await prisma.recertificationHistory.findMany({
      select: {
        recertifiedBy: true,
        recertifiedByName: true,
      },
      distinct: ['recertifiedBy'],
    })

    const dealerRecertifiers = await prisma.dealerRecertificationHistory.findMany({
      select: {
        recertifiedBy: true,
        recertifiedByName: true,
      },
      distinct: ['recertifiedBy'],
    })

    // Combine and deduplicate recertifiers
    const recertifiersMap = new Map()
    ;[...headOfficeRecertifiers, ...dealerRecertifiers].forEach((r) => {
      recertifiersMap.set(r.recertifiedBy, r)
    })
    const recertifiers = Array.from(recertifiersMap.values())

    return NextResponse.json({
      success: true,
      histories: allHistories,
      summary,
      recertifiers,
    })
  } catch (error) {
    console.error('Error fetching recertification report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recertification report' },
      { status: 500 }
    )
  }
}
