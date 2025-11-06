import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import fs from 'fs/promises'
import path from 'path'

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

    // อ่านไฟล์ทั้งหมดจาก public/
    const publicDir = path.join(process.cwd(), 'public')
    const files = await fs.readdir(publicDir)

    // กรองเฉพาะไฟล์ JPG ที่ขึ้นต้นด้วย "Certification-Form"
    const templateFiles = files.filter(file =>
      file.startsWith('Certification-Form') &&
      (file.endsWith('.jpg') || file.endsWith('.jpeg'))
    )

    // ดึงข้อมูลรายละเอียดของแต่ละไฟล์
    const templates = await Promise.all(
      templateFiles.map(async (filename) => {
        const filePath = path.join(publicDir, filename)
        const stats = await fs.stat(filePath)

        return {
          filename,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          url: `/${filename}` // URL สำหรับเข้าถึงไฟล์
        }
      })
    )

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

    // ตรวจสอบว่าชื่อไฟล์ซ้ำหรือไม่
    const publicDir = path.join(process.cwd(), 'public')
    const filePath = path.join(publicDir, originalFilename)

    try {
      await fs.access(filePath)
      // ถ้าไม่ error แปลว่าไฟล์มีอยู่แล้ว
      return NextResponse.json(
        { error: 'File already exists. Please rename or delete the existing file first.' },
        { status: 400 }
      )
    } catch {
      // ไฟล์ไม่มี ดำเนินการต่อได้
    }

    // แปลงไฟล์เป็น Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // บันทึกไฟล์ลง public/
    await fs.writeFile(filePath, buffer)

    console.log('✅ Template uploaded:', originalFilename)

    return NextResponse.json({
      message: 'Template uploaded successfully',
      filename: originalFilename,
      size: file.size,
      url: `/${originalFilename}`
    }, { status: 201 })
  } catch (error) {
    console.error('Error uploading template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
