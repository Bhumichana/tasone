# Implementation Plan: ระบบออกใบรับประกันคุณภาพผลิตภัณฑ์

## 📋 ภาพรวมของโครงการ

ระบบสำหรับการออกใบรับประกันคุณภาพผลิตภัณฑ์ที่ให้พนักงานของร้านค้าตัวแทนจำหน่ายสามารถ Log in เข้าสู่ระบบเพื่อออกใบรับประกันได้ตามจำนวนวัตถุดิบที่ซื้อไป

## 🎨 Design System

### สีหลัก
- **Primary**: Navy Blue (#1e40af, #1e3a8a)
- **Secondary**: Light Blue (#3b82f6)
- **Accent**: White (#ffffff)
- **Background**: Light Gray (#f8fafc)
- **Text**: Dark Gray (#1f2937)

### Typography
- **Font Family**: Prompt (Google Fonts)
- **Fallback**: Inter, sans-serif
- **Font Weights**: 300, 400, 500, 600, 700
- **Support**: Thai และ English typography

## 🛠 Technology Stack

- **Frontend**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Neon PostgreSQL
- **ORM**: Prisma
- **File Storage**: Vercel Blob
- **Authentication**: NextAuth.js

## 📊 Database Schema Design

### 1. Users (ผู้ใช้งาน)
```prisma
model User {
  id          String   @id @default(cuid())
  username    String   @unique
  password    String
  userGroup   UserGroup // HeadOffice, Dealer
  role        String
  firstName   String
  lastName    String
  phoneNumber String
  dealerId    String?
  dealer      Dealer?  @relation(fields: [dealerId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum UserGroup {
  HeadOffice
  Dealer
}
```

### 2. Dealers (ผู้แทนจำหน่าย)
```prisma
model Dealer {
  id                String    @id @default(cuid())
  dealerCode        String    @unique
  manufacturerNumber String
  dealerName        String
  address           String
  phoneNumber       String
  startDate         DateTime
  endDate           DateTime?
  users             User[]
  sales             Sale[]
  warranties        Warranty[]
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

### 3. RawMaterials (วัตถุดิบ)
```prisma
model RawMaterial {
  id             String @id @default(cuid())
  materialNumber String @unique
  materialName   String
  unit           String
  sales          SaleItem[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

### 4. Sales (ขาย-การส่งมอบวัตถุดิบ)
```prisma
model Sale {
  id        String     @id @default(cuid())
  saleDate  DateTime
  dealerId  String
  dealer    Dealer     @relation(fields: [dealerId], references: [id])
  items     SaleItem[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model SaleItem {
  id             String      @id @default(cuid())
  saleId         String
  sale           Sale        @relation(fields: [saleId], references: [id])
  rawMaterialId  String
  rawMaterial    RawMaterial @relation(fields: [rawMaterialId], references: [id])
  quantity       Float
  usedQuantity   Float       @default(0)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
}
```

### 5. Products (สินค้า)
```prisma
model Product {
  id                String     @id @default(cuid())
  productCode       String     @unique
  productName       String
  thickness         Float
  totalUsage        Float      // kg/m2
  isoWeight         Float      // kg./ถัง
  warrantyCondition String
  dealerId          String
  dealer            Dealer     @relation(fields: [dealerId], references: [id])
  warranties        Warranty[]
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
}
```

### 6. Warranties (ใบรับประกันคุณภาพผลิตภัณฑ์)
```prisma
model Warranty {
  id                String   @id @default(cuid())
  warrantyNumber    String   @unique // รหัสผู้แทนจำหน่าย-DDMMYYYY-Running no.
  dealerId          String
  dealer            Dealer   @relation(fields: [dealerId], references: [id])
  ownerName         String
  manufacturerCode  String
  ownerAddress      String
  ownerPhone        String
  productionDate    DateTime
  deliveryDate      DateTime
  purchaseOrderNo   String
  productId         String
  product           Product  @relation(fields: [productId], references: [id])
  installationArea  Float    // ตารางเมตร
  thickness         Float    // มิลลิเมตร
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

## 🏗 Project Structure

```
warranty-app/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── users/
│   │   ├── dealers/
│   │   ├── raw-materials/
│   │   ├── sales/
│   │   ├── products/
│   │   └── warranties/
│   ├── api/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── dealers/
│   │   ├── raw-materials/
│   │   ├── sales/
│   │   ├── products/
│   │   └── warranties/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/ (shadcn/ui components)
│   ├── auth/
│   ├── dashboard/
│   └── forms/
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── utils.ts
│   └── validations.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── public/
```

## 🔐 Authentication & Authorization

### User Roles & Permissions

#### HeadOffice (Admin)
- ✅ จัดการผู้ใช้งานทั้งหมด
- ✅ จัดการข้อมูลผู้แทนจำหน่าย (CRUD)
- ✅ จัดการข้อมูลวัตถุดิบ (CRUD)
- ✅ จัดการข้อมูลการขาย-ส่งมอบวัตถุดิบ (CRUD)
- ✅ ดูข้อมูลใบรับประกันทั้งหมด
- ✅ เข้าถึง Dashboard รวม

#### Dealer
- ✅ จัดการสินค้าของตนเอง (CRUD)
- ✅ จัดการใบรับประกันของตนเอง (CRUD)
- ✅ พิมพ์ใบรับประกัน
- ✅ ดูข้อมูลวัตถุดิบที่ได้รับ
- ❌ ไม่สามารถเข้าถึงข้อมูลของ Dealer อื่น

## 📱 Features Implementation Plan

### Phase 1: Core Setup (1-2 วัน)
1. **Project Initialization**
   - สร้าง Next.js project
   - ติดตั้ง dependencies (Prisma, Tailwind, shadcn/ui)
   - ตั้งค่า Database connection

2. **Database Setup**
   - สร้าง Prisma schema
   - สร้าง migrations
   - สร้าง seed data

3. **Authentication System**
   - ติดตั้ง NextAuth.js
   - สร้าง login/logout functionality
   - ตั้งค่า middleware สำหรับ route protection

### Phase 2: User Management (1 วัน)
1. **User CRUD Operations**
   - สร้างหน้า User management สำหรับ HeadOffice
   - Form สำหรับเพิ่ม/แก้ไข User
   - ระบบกำหนด Role และ Permissions

### Phase 3: Master Data Management (2 วัน)
1. **Dealers Management**
   - CRUD operations สำหรับ HeadOffice
   - หน้าจอจัดการข้อมูลผู้แทนจำหน่าย

2. **Raw Materials Management**
   - CRUD operations สำหรับ HeadOffice
   - หน้าจอจัดการข้อมูลวัตถุดิบ

3. **Sales Management**
   - CRUD operations สำหรับ HeadOffice
   - หน้าจอจัดการการขาย-ส่งมอบวัตถุดิบ
   - ระบบติดตามปริมาณวัตถุดิบที่เหลือ

### Phase 4: Product & Warranty Management (2-3 วัน)
1. **Products Management**
   - CRUD operations สำหรับ Dealer
   - หน้าจอจัดการสินค้าของตนเอง

2. **Warranty System**
   - CRUD operations สำหรับ Dealer
   - ระบบ Auto-generate เลขที่ใบรับประกัน
   - ตรวจสอบปริมาณวัตถุดิบที่เหลือก่อนออกใบรับประกัน
   - หน้าพิมพ์ใบรับประกัน (PDF generation)

### Phase 5: Dashboard & Reports (1 วัน)
1. **Dashboard**
   - Dashboard สำหรับ HeadOffice (ภาพรวมระบบ)
   - Dashboard สำหรับ Dealer (ข้อมูลของตนเอง)
   - Charts และ Statistics

### Phase 6: UI/UX Polish (1 วัน)
1. **Design Implementation**
   - ปรับแต่งสี Navy Blue theme
   - Responsive design
   - Loading states และ Error handling
   - Form validations

## 🎯 Business Logic Rules

### การออกใบรับประกัน
1. **ตรวจสอบปริมาณวัตถุดิบ**: ก่อนออกใบรับประกัน ระบบต้องตรวจสอบว่า Dealer มีวัตถุดิบเพียงพอหรือไม่
2. **รูปแบบเลขที่ใบรับประกัน**: รหัสผู้แทนจำหน่าย-DDMMYYYY-Running no.
3. **การคำนวณการใช้วัตถุดิบ**: ใช้ข้อมูลจาก Product (ปริมาณการใช้รวม kg/m2) × พื้นที่ติดตั้ง

### การจัดการ Stock วัตถุดิบ
1. **เมื่อขายวัตถุดิบ**: เพิ่มปริมาณที่ Dealer สามารถใช้ได้
2. **เมื่อออกใบรับประกัน**: หักปริมาณที่ใช้จาก Stock ที่มี

## 📝 Default Data

### Admin Account
- **Username**: admin
- **Password**: admin123
- **UserGroup**: HeadOffice
- **Role**: Super Admin

### Sample Data
- 3-5 Dealers ตัวอย่าง
- 10-15 Raw Materials
- Sample Sales records
- Sample Products สำหรับแต่ละ Dealer
- Sample Warranties

## 🚀 Deployment Plan

1. **Environment Setup**
   - Neon Database setup
   - Vercel deployment configuration
   - Environment variables setup

2. **Testing**
   - User acceptance testing
   - การทดสอบ Business logic
   - การทดสอบ Permissions

## ⏱ Timeline Estimate

**รวมเวลาประมาณ: 7-10 วัน**

- Phase 1: 1-2 วัน
- Phase 2: 1 วัน
- Phase 3: 2 วัน
- Phase 4: 2-3 วัน
- Phase 5: 1 วัน
- Phase 6: 1 วัน

---

## 🔍 Next Steps

1. **รอการอนุมัติ Plan** จากคุณ
2. **เริ่ม Phase 1**: Project setup และ Database design
3. **สร้าง MVP** ให้ทดสอบ core functionality ก่อน
4. **Iterate** ตาม feedback


*คุณมีข้อเสนอแนะหรือต้องการปรับแต่ง Implementation plan นี้หรือไม่ครับ?*