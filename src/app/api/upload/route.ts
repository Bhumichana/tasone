import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')

    // Get the file from the request
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Generate a unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const uniqueFilename = `profile-${timestamp}.${extension}`

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Save to public/uploads directory
    const uploadPath = join(process.cwd(), 'public', 'uploads')

    // Ensure uploads directory exists
    try {
      const { mkdirSync } = await import('fs')
      mkdirSync(uploadPath, { recursive: true })
    } catch (err) {
      // Directory might already exist
    }

    const filePath = join(uploadPath, uniqueFilename)
    await writeFile(filePath, buffer)

    // Return the public URL
    const publicUrl = `/uploads/${uniqueFilename}`

    return NextResponse.json({
      message: 'File uploaded successfully',
      url: publicUrl,
      filename: uniqueFilename
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}