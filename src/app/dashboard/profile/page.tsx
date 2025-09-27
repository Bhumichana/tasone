"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, Save, Eye, EyeOff, CheckCircle2, AlertCircle, Camera, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

interface UserProfile {
  id: string;
  username: string;
  userGroup: string;
  role: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  profileImage?: string;
  dealerId?: string;
  dealer?: {
    dealerName: string;
    dealerCode: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    phoneNumber: '',
    password: '',
    role: '',
    userGroup: ''
  });

  // Load user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
          setFormData({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            username: data.username || '',
            phoneNumber: data.phoneNumber || '',
            password: '',
            role: data.role || '',
            userGroup: data.userGroup || ''
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setMessage({ type: 'error', text: 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้' });
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchProfile();
    }
  }, [session]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'รองรับเฉพาะไฟล์ JPEG, PNG และ WebP เท่านั้น' });
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setMessage({ type: 'error', text: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 5MB)' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        // Update profile image URL
        if (profile) {
          setProfile({ ...profile, profileImage: result.url });
        }
        setMessage({ type: 'success', text: 'อัพโหลดรูปภาพสำเร็จ! กรุณากด "บันทึกข้อมูล" เพื่อยืนยันการเปลี่ยนแปลง' });
      } else {
        setMessage({ type: 'error', text: result.error || 'เกิดข้อผิดพลาดในการอัพโหลด' });
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการอัพโหลด' });
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const updateData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        phoneNumber: formData.phoneNumber,
        role: formData.role,
        userGroup: formData.userGroup
      };

      // Include profile image if it was updated
      if (profile?.profileImage) {
        updateData.profileImage = profile.profileImage;
      }

      // เพิ่มรหัสผ่านเฉพาะเมื่อมีการกรอก
      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      const response = await fetch('/api/user/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (response.ok) {
        // Clear any existing messages before redirect to prevent flash
        setMessage(null);

        // Immediate redirect without state updates to prevent conflicts
        router.replace('/dashboard');
        return;
      } else {
        setMessage({ type: 'error', text: result.error || 'เกิดข้อผิดพลาดในการอัปเดทข้อมูล กรุณาลองใหม่อีกครั้ง' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการอัปเดทข้อมูล' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>ไม่พบข้อมูลผู้ใช้</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-6 mb-8">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={previewUrl || profile.profileImage} alt="Profile" />
              <AvatarFallback className="bg-navy-600 text-white text-lg">
                {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {/* Upload button overlay */}
            <label
              htmlFor="avatar-upload"
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <div className="flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-navy-900">
              {profile.firstName} {profile.lastName}
            </h1>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="secondary" className="bg-navy-100 text-navy-800">
                {profile.userGroup}
              </Badge>
              <Badge variant="outline">{profile.role}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              คลิกที่รูปโปรไฟล์เพื่อเปลี่ยนรูปภาพ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-navy-900">
                  <User className="mr-2 h-5 w-5" />
                  ข้อมูลโปรไฟล์
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-600">Username</Label>
                  <p className="font-medium">{profile.username}</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm text-gray-600">เบอร์โทรศัพท์</Label>
                  <p className="font-medium">{profile.phoneNumber}</p>
                </div>
                <Separator />
                {profile.dealer && (
                  <>
                    <div>
                      <Label className="text-sm text-gray-600">ตัวแทนจำหน่าย</Label>
                      <p className="font-medium">{profile.dealer.dealerName}</p>
                      <p className="text-sm text-gray-500">รหัส: {profile.dealer.dealerCode}</p>
                    </div>
                    <Separator />
                  </>
                )}
                <div>
                  <Label className="text-sm text-gray-600">สมัครเมื่อ</Label>
                  <p className="text-sm">{new Date(profile.createdAt).toLocaleDateString('th-TH')}</p>
                </div>
              </CardContent>
            </Card>

            {/* Avatar Upload Card */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center text-navy-900">
                  <Upload className="mr-2 h-5 w-5" />
                  เปลี่ยนรูปโปรไฟล์
                </CardTitle>
                <CardDescription>
                  อัปโหลดรูปใหม่สำหรับโปรไฟล์ของคุณ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={previewUrl || profile.profileImage} alt="Preview" />
                    <AvatarFallback className="bg-navy-600 text-white">
                      {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      disabled={uploading}
                      className="w-full"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          กำลังอัปโหลด...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          เลือกรูปภาพ
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  รองรับไฟล์ JPEG, PNG, WebP ขนาดไม่เกิน 5MB
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-navy-900">แก้ไขข้อมูลส่วนตัว</CardTitle>
                <CardDescription>
                  คุณสามารถอัปเดทข้อมูลส่วนตัวของคุณได้ที่นี่
                </CardDescription>
              </CardHeader>
              <CardContent>
{message && (
                  <Alert key={message.type} className={`mb-6 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    {message.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                      {message.text}
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">ชื่อ</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">นามสกุล</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phoneNumber">เบอร์โทรศัพท์</Label>
                    <Input
                      id="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="userGroup">กลุ่มผู้ใช้</Label>
                      <Select
                        value={formData.userGroup}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, userGroup: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกกลุ่มผู้ใช้" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HeadOffice">HeadOffice</SelectItem>
                          <SelectItem value="Dealer">Dealer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="role">บทบาท</Label>
                      <Input
                        id="role"
                        value={formData.role}
                        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password">รหัสผ่านใหม่</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="ปล่อยว่างไว้หากไม่ต้องการเปลี่ยน"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={() => {
                        router.push('/dashboard');
                      }}
                    >
                      ยกเลิก
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving}
                      className="bg-navy-600 hover:bg-navy-700"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          กำลังบันทึก...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          บันทึกข้อมูล
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}