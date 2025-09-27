# ระบบใบรับประกันคุณภาพผลิตภัณฑ์

ระบบสำหรับการออกใบรับประกันคุณภาพผลิตภัณฑ์ที่ให้พนักงานของร้านค้าตัวแทนจำหน่ายสามารถ Log in เข้าสู่ระบบเพื่อออกใบรับประกันได้ตามจำนวนวัตถุดิบที่ซื้อไป

## 🎯 Features

### สำหรับ Head Office (Admin)
- ✅ จัดการผู้ใช้งานทั้งหมด
- ✅ จัดการข้อมูลผู้แทนจำหน่าย (CRUD)
- ✅ จัดการข้อมูลวัตถุดิบ (CRUD)
- ✅ จัดการข้อมูลการขาย-ส่งมอบวัตถุดิบ (CRUD)
- ✅ ดูข้อมูลใบรับประกันทั้งหมด
- ✅ เข้าถึง Dashboard รวม

### สำหรับ Dealer
- ✅ จัดการสินค้าของตนเอง (CRUD)
- ✅ จัดการใบรับประกันของตนเอง (CRUD)
- ✅ พิมพ์ใบรับประกัน
- ✅ ดูข้อมูลวัตถุดิบที่ได้รับ

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS (Navy Blue Theme)
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **File Storage**: Vercel Blob
- **TypeScript**: Full type safety

## 🚀 การติดตั้ง

### 1. Clone Repository

```bash
git clone <repository-url>
cd warranty-app
```

### 2. ติดตั้ง Dependencies

⚠️ **หมายเหตุ**: หากเกิดปัญหาในการติดตั้ง dependencies ให้ลองขั้นตอนนี้:

```bash
# ล้าง npm cache
npm cache clean --force

# ลบ node_modules และ package-lock.json
rm -rf node_modules package-lock.json

# ติดตั้งใหม่
npm install
```

หรือติดตั้งแบบทีละขั้นตอน:

```bash
# ติดตั้ง core dependencies
npm install react react-dom next

# ติดตั้ง Prisma
npm install prisma @prisma/client

# ติดตั้ง Authentication
npm install next-auth @next-auth/prisma-adapter bcryptjs
npm install --save-dev @types/bcryptjs

# ติดตั้ง UI libraries
npm install lucide-react class-variance-authority clsx tailwind-merge

# ติดตั้ง file storage
npm install @vercel/blob

# ติดตั้ง dev tools
npm install --save-dev tsx
```

### 3. ตั้งค่า Environment Variables

คัดลอกไฟล์ `.env.example` เป็น `.env.local`:

```bash
cp .env.example .env.local
```

แก้ไขไฟล์ `.env.local`:

```env
# Database - ใส่ข้อมูล Database ของคุณ
DATABASE_URL="postgresql://username:password@localhost:5432/warranty_db?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Vercel Blob (สำหรับ file storage)
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
```

### 4. ตั้งค่า Database

```bash
# สร้าง Prisma client
npm run db:generate

# Push schema ไป database
npm run db:push

# Seed ข้อมูลตัวอย่าง
npm run db:seed
```

### 5. รันโปรเจกต์

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) ในเบราว์เซอร์

## 🔐 บัญชีสำหรับทดสอบ

### Admin (Head Office)
- **Username**: `admin`
- **Password**: `admin123`
- **สิทธิ**: เข้าถึงได้ทุก feature

### Dealer
- **Username**: `dealer1`, `dealer2`, `dealer3`
- **Password**: `dealer123`
- **สิทธิ**: จัดการข้อมูลของตัวเองเท่านั้น

## 📦 Scripts

```bash
# Development
npm run dev          # รัน development server
npm run build        # Build สำหรับ production
npm run start        # รัน production server
npm run lint         # ตรวจสอบ code style

# Database
npm run db:generate  # สร้าง Prisma client
npm run db:push      # Push schema ไป database
npm run db:migrate   # สร้าง migration
npm run db:seed      # Seed ข้อมูลตัวอย่าง
npm run db:studio    # เปิด Prisma Studio
```

## 🗃 Database Schema

### หลักการทำงาน

1. **Users** แบ่งเป็น 2 กลุ่ม: HeadOffice และ Dealer
2. **Dealers** คือตัวแทนจำหน่าย
3. **RawMaterials** คือวัตถุดิบ
4. **Sales** คือการขาย-ส่งมอบวัตถุดิบให้ Dealer
5. **Products** คือสินค้าที่ Dealer สร้าง
6. **Warranties** คือใบรับประกันที่ออกจากสินค้า

### Business Logic

- Dealer สามารถออกใบรับประกันได้ตามจำนวนวัตถุดิบที่เหลือ
- การออกใบรับประกันจะหักปริมาณวัตถุดิบที่ใช้จาก Stock
- เลขที่ใบรับประกัน: `รหัสตัวแทน-DDMMYYYY-Running no.`

## 🎨 Design System

ใช้สี Navy Blue เป็นหลัก:
- **Primary**: Navy Blue (#1e40af, #1e3a8a)
- **Secondary**: Light Blue (#3b82f6)
- **Background**: Light Gray (#f8fafc)

## 🔧 การแก้ปัญหา

### ปัญหา Port 3000 ถูกใช้งาน

```bash
# สำหรับ macOS/Linux
lsof -ti:3000 | xargs kill -9

# สำหรับ Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### ปัญหา Prisma

```bash
# Reset database (ระวัง: จะลบข้อมูลทั้งหมด)
npx prisma migrate reset

# Re-generate client
npm run db:generate
```

### ปัญหา npm install

```bash
# ล้าง cache และติดตั้งใหม่
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 📁 โครงสร้างโปรเจกต์

```
warranty-app/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts           # Seed data
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # Dashboard pages
│   │   ├── login/        # Login page
│   │   └── globals.css   # Global styles
│   ├── components/       # React components
│   ├── lib/              # Utility functions
│   └── types/            # TypeScript types
├── .env.local           # Environment variables
└── README.md           # คู่มือนี้
```

## 🚀 การ Deploy

### Vercel (แนะนำ)

1. Push code ไป GitHub
2. เชื่อมต่อ GitHub กับ Vercel
3. ตั้งค่า Environment Variables ใน Vercel
4. Deploy อัตโนมัติ

### Database (Neon)

1. สร้าง Database ใน [Neon](https://neon.tech)
2. คัดลอก Connection String
3. ใส่ใน `DATABASE_URL` ใน Environment Variables

## 📞 Support

หากมีปัญหาในการติดตั้งหรือใช้งาน สามารถสอบถามได้ที่:
- อีเมล: [ใส่อีเมลของคุณ]
- GitHub Issues: [ใส่ลิงก์ repository]

---

**สร้างด้วย ❤️ โดย Claude Code**