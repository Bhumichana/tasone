import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { list } from '@vercel/blob'

// GET /api/templates - ดึงรายการ template ทั้งหมด
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // ตรวจสอบสิทธิ์ (เฉพาะ HeadOffice)
    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ดึงรายการไฟล์จาก Vercel Blob ที่อยู่ใน folder templates/
    const { blobs } = await list({
      prefix: 'templates/',
    })

    // กรองเฉพาะไฟล์ที่ขึ้นต้นด้วย "Certification-Form"
    const templateFiles = blobs.filter(blob =>
      blob.pathname.includes('Certification-Form') &&
      (blob.pathname.endsWith('.jpg') || blob.pathname.endsWith('.jpeg'))
    )

    // แปลงข้อมูลให้ตรงกับ format เดิม
    const templates = templateFiles.map((blob) => {
      const filename = blob.pathname.replace('templates/', '')
      return {
        filename,
        size: blob.size,
        createdAt: new Date(blob.uploadedAt),
        modifiedAt: new Date(blob.uploadedAt),
        url: blob.url
      }
    })

    // เรียงตามวันที่สร้าง (ใหม่สุดก่อน)
    templates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return NextResponse.json({
      templates,
      count: templates.length
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/templates - อัพโหลด template ใหม่
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // ตรวจสอบสิทธิ์ (เฉพาะ HeadOffice)
    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // รับข้อมูลจาก FormData
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // ตรวจสอบชนิดไฟล์ (เฉพาะ JPG/JPEG)
    const allowedTypes = ['image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG/JPEG allowed.' },
        { status: 400 }
      )
    }

    // ตรวจสอบขนาดไฟล์ (ไม่เกิน 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // ตรวจสอบชื่อไฟล์ (ต้องขึ้นต้นด้วย "Certification-Form")
    const originalFilename = file.name
    if (!originalFilename.startsWith('Certification-Form')) {
      return NextResponse.json(
        { error: 'Filename must start with "Certification-Form"' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่าชื่อไฟล์ซ้ำหรือไม่ (ดึงรายการจาก Blob)
    const { blobs } = await list({
      prefix: 'templates/',
    })

    const existingFile = blobs.find(blob =>
      blob.pathname === `templates/${originalFilename}`
    )

    if (existingFile) {
      return NextResponse.json(
        { error: 'File already exists. Please rename or delete the existing file first.' },
        { status: 400 }
      )
    }

    // Upload to Vercel Blob
    const { put } = await import('@vercel/blob')
    const blob = await put(`templates/${originalFilename}`, file, {
      access: 'public',
      addRandomSuffix: false,
    })

    console.log('✅ Template uploaded:', originalFilename)

    return NextResponse.json({
      message: 'Template uploaded successfully',
      filename: originalFilename,
      size: file.size,
      url: blob.url
    }, { status: 201 })
  } catch (error) {
    console.error('Error uploading template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
