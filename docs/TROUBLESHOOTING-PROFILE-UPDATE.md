# แก้ปัญหา: Application Error หลังบันทึก Profile และไม่ Redirect

## 📋 รายละเอียดปัญหา

**อาการที่พบ:**
- หลังจากแก้ไขข้อมูล profile และกดบันทึก แสดงข้อความ error:
  ```
  Application error: a client-side exception has occurred while loading localhost
  (see the browser console for more information)
  ```
- หน้าค้างและไม่ redirect ไปหน้า dashboard
- แต่ข้อมูลถูกบันทึกลง database แล้ว (ตรวจสอบได้จาก `/dashboard/users`)
- ใช้เวลานาน 10+ วินาที กว่าจะ redirect ได้

**ไฟล์ที่เกี่ยวข้อง:**
- `src/app/dashboard/profile/page.tsx` - หน้า profile ที่มีปัญหา
- `src/app/dashboard/page.tsx` - หน้า dashboard ที่โหลดข้อมูลช้า

**วันที่พบปัญหา:** 29 ตุลาคม 2025

---

## 🔍 สาเหตุของปัญหา

### 1. การใช้ NextAuth Session Management ผิดวิธี

**Code เดิมที่ผิด:**
```typescript
const { data: session, status, update: updateSession } = useSession();

const handleSubmit = async (e: React.FormEvent) => {
  // ... API call ...

  if (response.ok) {
    // ❌ ปัญหาที่นี่: การเรียก updateSession() ทำให้เกิด runtime error
    await updateSession();

    setMessage({ type: 'success', text: 'บันทึกสำเร็จ...' });

    // ❌ ปัญหา: setTimeout ทำให้ component ทำงานในช่วงที่กำลัง unmount
    setTimeout(() => {
      router.push('/dashboard');
      router.refresh();
    }, 1500);
  }
}
```

**เหตุผล:**
- `updateSession()` จาก NextAuth อาจทำให้เกิด **Fast Refresh reload** และ client-side exception
- การตั้ง state (`setMessage`, `setSaving`) ก่อน redirect ทำให้ React component ทำงานผิดพลาดระหว่าง unmount
- `setTimeout` สร้าง race condition เมื่อ component unmount ก่อนเวลาหมด

### 2. การใช้ signOut() ที่ไม่จำเป็น

**Code เดิม (version แรกสุด):**
```typescript
if (response.ok) {
  isRedirectingRef.current = true;

  // ❌ ปัญหา: signOut() ทำให้เกิด race condition และ application hang
  await signOut({
    callbackUrl: '/login?message=อัปเดตข้อมูลสำเร็จ',
    redirect: true
  });

  throw new Error('REDIRECTING'); // ❌ ซับซ้อนเกินไป
}
```

**เหตุผล:**
- การ logout หลังบันทึก profile ไม่เป็นมาตรฐานของ web application ทั่วไป
- `signOut()` ทำให้เกิด race condition กับการ redirect
- ผู้ใช้ต้อง login ใหม่ทุกครั้งที่แก้ไข profile (ประสบการณ์ผู้ใช้ไม่ดี)

### 3. Dashboard Page มี Infinite Loop

**Code เดิมที่ผิด:**
```typescript
useEffect(() => {
  if (status === 'loading') return;
  if (!session) router.push('/login');
  else {
    fetchDashboardStats();
    if (session.user.userGroup === 'HeadOffice') {
      fetchWarrantyByDealer();
    }
  }
}, [session, status, router]); // ❌ dependencies ทำให้เกิด infinite loop
```

**เหตุผล:**
- `session` object เปลี่ยนแปลงทุกครั้งที่ re-render → เกิด infinite loop
- Fetch ข้อมูลซ้ำๆ หลายรอบ → ช้า

---

## ✅ วิธีแก้ไข

### แก้ไข 1: Profile Page - ใช้ Redirect แบบเรียบง่าย

**ไฟล์:** `src/app/dashboard/profile/page.tsx`

**ก่อนแก้ไข:**
```typescript
// ❌ Code เดิม
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSaving(true);
  setMessage(null);

  try {
    const response = await fetch('/api/user/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    if (response.ok) {
      await updateSession();
      setMessage({ type: 'success', text: 'บันทึกสำเร็จ...' });
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    }
  } catch (error) {
    setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด' });
    setSaving(false);
  }
};
```

**หลังแก้ไข:**
```typescript
// ✅ Code ใหม่
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const updateData: any = {
    firstName: formData.firstName,
    lastName: formData.lastName,
    username: formData.username,
    phoneNumber: formData.phoneNumber
  };

  // เฉพาะ HeadOffice เท่านั้นที่สามารถแก้ไข role และ userGroup ได้
  if (session?.user?.userGroup === 'HeadOffice') {
    updateData.role = formData.role;
    updateData.userGroup = formData.userGroup;
  }

  // Include profile image if it was updated
  if (profile?.profileImage) {
    updateData.profileImage = profile.profileImage;
  }

  // เพิ่มรหัสผ่านเฉพาะเมื่อมีการกรอก
  if (formData.password && formData.password.trim()) {
    updateData.password = formData.password;
  }

  try {
    const response = await fetch('/api/user/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    if (response.ok) {
      // ✅ Redirect ทันทีโดยไม่ต้องรอ หรือแสดงข้อความใดๆ
      window.location.href = '/dashboard';
      return; // หยุดการทำงานทันที
    }

    // กรณี error
    const result = await response.json();
    setMessage({ type: 'error', text: result.error || 'เกิดข้อผิดพลาด' });
    setSaving(false);

  } catch (error) {
    console.error('Error updating profile:', error);
    setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด' });
    setSaving(false);
  }
};
```

**การเปลี่ยนแปลงสำคัญ:**
1. ✅ ลบ `updateSession()` ออกทั้งหมด
2. ✅ ลบ `setTimeout` ออก
3. ✅ ลบการตั้งค่า state ก่อน redirect (`setSaving(true)`, `setMessage(null)`)
4. ✅ ใช้ `window.location.href` แทน `router.push()` เพื่อ full page reload
5. ✅ เพิ่ม `return` หลัง redirect เพื่อหยุดการทำงานทันที
6. ✅ ไม่อ่าน `response.json()` เมื่อสำเร็จ (redirect ทันที)

### แก้ไข 2: Dashboard Page - ป้องกัน Infinite Loop

**ไฟล์:** `src/app/dashboard/page.tsx`

**ก่อนแก้ไข:**
```typescript
// ❌ Code เดิม
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/login');
    else {
      fetchDashboardStats();
      if (session.user.userGroup === 'HeadOffice') {
        fetchWarrantyByDealer();
      }
    }
  }, [session, status, router]); // ❌ Infinite loop!

  const fetchDashboardStats = async () => {
    setLoading(true);
    // ... fetch logic ...
  };

  // ...
}
```

**หลังแก้ไข:**
```typescript
// ✅ Code ใหม่
import { useEffect, useState, useRef } from 'react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasFetchedRef = useRef(false); // ✅ Track if we've fetched data
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      router.push('/login');
      return;
    }

    // ✅ Only fetch once when session becomes available
    if (session.user && !hasFetchedRef.current) {
      hasFetchedRef.current = true;

      fetchDashboardStats();

      if (session.user.userGroup === 'HeadOffice') {
        fetchWarrantyByDealer();
      }
    }
  }, [status, session, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // ✅ Check if session is available
      if (!session || !session.user) {
        console.error('No session available');
        setLoading(false);
        return;
      }

      // ... fetch logic ...

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // ...
}
```

**การเปลี่ยนแปลงสำคัญ:**
1. ✅ เพิ่ม `useRef` เพื่อ track ว่าได้ fetch ข้อมูลแล้วหรือยัง
2. ✅ Fetch ข้อมูลแค่ครั้งเดียวเมื่อ `session.user` พร้อม
3. ✅ เพิ่มการตรวจสอบ `session.user` ก่อน fetch
4. ✅ เพิ่ม error handling ใน `fetchDashboardStats`

---

## 🎯 ผลลัพธ์หลังแก้ไข

### การทำงานใหม่:
```
ผู้ใช้แก้ไข profile + กดบันทึก
    ↓
API /api/user/update (บันทึกข้อมูล)
    ↓
response.ok === true
    ↓
window.location.href = '/dashboard' (redirect ทันที)
    ↓
Full page reload → NextAuth session โหลดใหม่อัตโนมัติ
    ↓
Dashboard page fetch ข้อมูล 1 ครั้ง
    ↓
แสดงข้อมูลที่อัปเดตแล้ว
```

### ผลลัพธ์:
- ✅ ไม่มี Application error
- ✅ Redirect ทันที (ไม่ต้องรอ)
- ✅ ไม่มีหน้าค้าง
- ✅ ข้อมูลถูกบันทึก
- ✅ Session ยังคงอยู่ (ไม่ต้อง login ใหม่)
- ✅ เห็นข้อมูลที่อัปเดตทันที
- ✅ Dashboard โหลดข้อมูล 1 ครั้ง (ไม่ infinite loop)

---

## 💡 Best Practices ที่ได้เรียนรู้

### 1. การจัดการ Redirect หลังบันทึกข้อมูล

**❌ ไม่ควรทำ:**
```typescript
// อย่าใช้ setTimeout
setTimeout(() => {
  router.push('/dashboard');
}, 1500);

// อย่าตั้ง state ก่อน redirect
setMessage({ type: 'success', text: '...' });
router.push('/dashboard'); // Component ยัง re-render
```

**✅ ควรทำ:**
```typescript
// Redirect ทันทีด้วย window.location
if (response.ok) {
  window.location.href = '/dashboard';
  return; // หยุดการทำงานทันที
}
```

### 2. การจัดการ NextAuth Session

**❌ ไม่ควรทำ:**
```typescript
// อย่าใช้ updateSession() แบบนี้
const { update: updateSession } = useSession();
await updateSession(); // อาจทำให้เกิด error
router.push('/dashboard');
```

**✅ ควรทำ:**
```typescript
// ใช้ full page reload เพื่ออัปเดต session
window.location.href = '/dashboard'; // Session reload อัตโนมัติ
```

### 3. การป้องกัน Infinite Loop ใน useEffect

**❌ ไม่ควรทำ:**
```typescript
useEffect(() => {
  fetchData();
}, [session, status, router]); // session เปลี่ยนทุก render
```

**✅ ควรทำ:**
```typescript
const hasFetchedRef = useRef(false);

useEffect(() => {
  if (session && !hasFetchedRef.current) {
    hasFetchedRef.current = true;
    fetchData();
  }
}, [status, session]);
```

### 4. Error Handling ที่ดี

**❌ ไม่ควรทำ:**
```typescript
// อย่า assume ว่า session มีค่าเสมอ
const data = session.user.name; // อาจเกิด error
```

**✅ ควรทำ:**
```typescript
// เช็คก่อนใช้งาน
if (!session || !session.user) {
  console.error('No session available');
  setLoading(false);
  return;
}

const data = session.user.name;
```

---

## 🔧 วิธีใช้เอกสารนี้

เมื่อพบปัญหาคล้ายกันในอนาคต:

1. **ตรวจสอบอาการ:** เปรียบเทียบกับ "รายละเอียดปัญหา" ด้านบน
2. **ดูสาเหตุ:** อ่าน "สาเหตุของปัญหา" เพื่อเข้าใจ root cause
3. **แก้ไข:** ทำตาม "วิธีแก้ไข" ทีละขั้นตอน
4. **ทดสอบ:** ตรวจสอบว่าได้ "ผลลัพธ์" ตามที่ระบุหรือไม่
5. **เรียนรู้:** อ่าน "Best Practices" เพื่อป้องกันปัญหาในอนาคต

---

## 📚 เอกสารอ้างอิง

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Next.js useRouter Hook](https://nextjs.org/docs/app/api-reference/functions/use-router)
- [React useEffect Hook](https://react.dev/reference/react/useEffect)
- [React useRef Hook](https://react.dev/reference/react/useRef)

---

---

## 🔄 อัปเดต: วิธีแก้ไขแบบ Standard (Logout & Login)

**วันที่อัปเดต:** 29 ตุลาคม 2025

### ปัญหาที่พบเพิ่มเติม:

หลังจากแก้ไขตามเอกสารข้างต้น ยังพบปัญหา:
- ข้อมูล profile ที่แก้ไขไม่แสดงใหม่ (ชื่อ, รูปโปรไฟล์)
- JWT Token ยังคงเก็บข้อมูลเก่าอยู่

### วิธีแก้ไขแบบ Standard (ที่แนะนำ):

**ให้ user logout และ login ใหม่หลังจาก update profile**

#### แก้ไข Profile Page:

```typescript
// File: src/app/dashboard/profile/page.tsx

import { useSession, signOut } from "next-auth/react"; // เพิ่ม signOut

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const updateData = {
    firstName: formData.firstName,
    lastName: formData.lastName,
    username: formData.username,
    phoneNumber: formData.phoneNumber
  };

  // เพิ่ม role, userGroup, profileImage, password ตามเดิม...

  try {
    const response = await fetch('/api/user/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    if (response.ok) {
      // ✅ Logout และ redirect ไป login พร้อม message
      await signOut({
        callbackUrl: '/login?message=' + encodeURIComponent('อัปเดตข้อมูลสำเร็จ! กรุณาเข้าสู่ระบบอีกครั้ง'),
        redirect: true
      });
      return;
    }

    // Handle error...
  } catch (error) {
    // Handle error...
  }
};
```

### การทำงาน:

```
User แก้ไข profile
    ↓
บันทึกลง database
    ↓
Logout อัตโนมัติ
    ↓
Redirect ไป /login พร้อม success message
    ↓
User login ใหม่
    ↓
NextAuth สร้าง JWT Token ใหม่ (ข้อมูลล่าสุด)
    ↓
แสดงชื่อและรูปโปรไฟล์ใหม่
```

### ข้อดี:
- ✅ แก้ปัญหา JWT Token ไม่ refresh
- ✅ ไม่มี client-side error
- ✅ Stable และทำงานได้แน่นอน
- ✅ เป็น Standard Practice ของ JWT authentication

### ข้อเสีย:
- ⚠️ User Experience ไม่ดีเท่าที่ควร (ต้อง login ใหม่)
- ⚠️ ต้องจำ username/password เพื่อ login ใหม่

### ทางเลือกอื่น (Advanced):

หากต้องการ UX ที่ดีกว่า (ไม่ต้อง logout):
1. **เปลี่ยนจาก JWT เป็น Database Session** - ช้ากว่า JWT แต่ update ได้ทันที
2. **ใช้ NextAuth Database Adapter** - ซับซ้อนกว่า ต้อง setup database sessions
3. **Hybrid Approach** - เก็บข้อมูล critical ใน database, non-critical ใน JWT

**แนะนำ:** ใช้วิธี Logout & Login (วิธีปัจจุบัน) เพราะ:
- เรียบง่าย ไม่ซับซ้อน
- ไม่มี performance impact
- Profile update ไม่บ่อย (ทำครั้งเดียวแล้วใช้นานๆ)

---

**วันที่สร้างเอกสาร:** 29 ตุลาคม 2025
**วันที่อัปเดต:** 29 ตุลาคม 2025
**ผู้สร้าง:** Claude Code
**เวอร์ชั่น:** 1.1
