import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ exists: false, isActive: false })
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, isActive: true }
    })

    if (!user) {
      return NextResponse.json({ exists: false, isActive: false })
    }

    return NextResponse.json({
      exists: true,
      isActive: user.isActive
    })
  } catch (error) {
    console.error('Error checking user:', error)
    return NextResponse.json({ exists: false, isActive: false })
  }
}
