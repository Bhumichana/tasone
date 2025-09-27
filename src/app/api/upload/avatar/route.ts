import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: "รองรับเฉพาะไฟล์ JPEG, PNG และ WebP เท่านั้น"
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: "ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 5MB)"
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `avatar-${session.user.id}-${timestamp}.${extension}`;

    // Use local storage for development
    const localUrl = `/uploads/avatars/${fileName}`;

    // Save file locally
    const buffer = await file.arrayBuffer();
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });

    const localPath = path.join(uploadDir, fileName);
    await writeFile(localPath, Buffer.from(buffer));

    return NextResponse.json({
      message: "อัพโหลดรูปโปรไฟล์สำเร็จ",
      url: localUrl
    });

  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการอัพโหลด กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}