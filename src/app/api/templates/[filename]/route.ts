import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { del, list } from '@vercel/blob'

// DELETE /api/templates/[filename] - ลบ template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    // ตรวจสอบสิทธิ์ (เฉพาะ HeadOffice)
    if (!session || session.user.userGroup !== 'HeadOffice') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { filename } = await params

    // ป้องกันการลบไฟล์ที่ไม่ใช่ template
    if (!filename.startsWith('Certification-Form') ||
        !(filename.endsWith('.jpg') || filename.endsWith('.jpeg'))) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      )
    }

    // ป้องกันการลบ template มาตรฐาน
    if (filename === 'Certification-Form.jpg') {
      return NextResponse.json(
        { error: 'Cannot delete default template' },
        { status: 400 }
      )
    }

    // ตรวจสอบว่าไฟล์มีอยู่จริงหรือไม่ใน Vercel Blob
    const { blobs } = await list({
      prefix: 'templates/',
    })

    const existingFile = blobs.find(blob =>
      blob.pathname === `templates/${filename}`
    )

    if (!existingFile) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // ลบไฟล์จาก Vercel Blob
    await del(existingFile.url)

    console.log('🗑️ Template deleted:', filename)

    return NextResponse.json({
      message: 'Template deleted successfully',
      filename
    })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
