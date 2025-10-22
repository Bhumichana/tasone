import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/dealers/public - ดึงรายชื่อผู้แทนจำหน่ายสำหรับการลงทะเบียน (ไม่ต้อง auth)
export async function GET(request: NextRequest) {
  try {
    const dealers = await prisma.dealer.findMany({
      select: {
        id: true,
        dealerCode: true,
        dealerName: true
      },
      orderBy: {
        dealerName: 'asc'
      }
    })

    return NextResponse.json({ dealers })
  } catch (error) {
    console.error('Error fetching dealers for registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}