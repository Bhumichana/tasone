import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  username?: string;
  phoneNumber?: string;
  profileImage?: string;
  password?: string;
  role?: string;
  userGroup?: string;
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: UpdateUserRequest = await request.json();

    // ตรวจสอบว่า user มีอยู่จริง
    const currentUser = await prisma.user.findUnique({
      where: { username: session.user?.username as string }
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // เตรียมข้อมูลสำหรับอัปเดท
    const updateData: any = {};

    if (body.firstName !== undefined) updateData.firstName = body.firstName;
    if (body.lastName !== undefined) updateData.lastName = body.lastName;
    if (body.phoneNumber !== undefined) updateData.phoneNumber = body.phoneNumber;
    if (body.profileImage !== undefined) updateData.profileImage = body.profileImage;

    // เฉพาะ HeadOffice เท่านั้นที่สามารถแก้ไข role และ userGroup ได้
    if (session.user?.userGroup === 'HeadOffice') {
      if (body.role !== undefined) updateData.role = body.role;
      if (body.userGroup !== undefined) updateData.userGroup = body.userGroup;
    }

    // ตรวจสอบ username ซ้ำ (ถ้ามีการเปลี่ยน)
    if (body.username && body.username !== currentUser.username) {
      const existingUser = await prisma.user.findUnique({
        where: { username: body.username }
      });

      if (existingUser) {
        return NextResponse.json({ error: "Username already exists" }, { status: 400 });
      }

      updateData.username = body.username;
    }

    // เข้ารหัสรหัสผ่านใหม่ (ถ้ามีการเปลี่ยน)
    if (body.password) {
      const hashedPassword = await bcrypt.hash(body.password, 12);
      updateData.password = hashedPassword;
    }

    // อัปเดทข้อมูลผู้ใช้
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        userGroup: true,
        role: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        profileImage: true,
        dealerId: true,
        dealer: {
          select: {
            dealerName: true,
            dealerCode: true
          }
        },
        updatedAt: true
      }
    });

    return NextResponse.json({
      message: "User updated successfully",
      user: updatedUser
    });

  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}