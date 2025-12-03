# دليل مكونات المصادقة - Authentication Components Guide

## نظرة عامة | Overview

تحتوي هذه الحزمة على ثلاثة مكونات React للمصادقة مصممة خصيصاً لمنصة Traf3li القانونية:

This package contains three React authentication components specifically designed for the Traf3li legal platform:

1. **SignIn.jsx** - تسجيل الدخول مع التحقق الثنائي (OTP)
2. **SignUp.jsx** - تسجيل حساب جديد بمسار متعدد الخطوات
3. **ForgotPassword.jsx** - استعادة كلمة المرور

---

## المتطلبات الأساسية | Prerequisites

### Required Dependencies

```bash
npm install react react-dom
# or
yarn add react react-dom
```

### تكوين Tailwind CSS | Tailwind CSS Configuration

تأكد من تثبيت وتكوين Tailwind CSS في مشروعك:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**tailwind.config.js:**
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

**src/index.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## التثبيت والاستخدام | Installation & Usage

### 1. نسخ الملفات | Copy Files

انسخ الملفات الثلاثة إلى مجلد المكونات في مشروعك:

```
src/
├── components/
│   ├── auth/
│   │   ├── SignIn.jsx
│   │   ├── SignUp.jsx
│   │   └── ForgotPassword.jsx
```

### 2. إعداد التوجيه | Setup Routing

**مع React Router (الموصى به):**

```javascript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import ForgotPassword from './components/auth/ForgotPassword';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## ربط API | API Integration

### نقاط النهاية المطلوبة | Required Endpoints

يجب أن يوفر الـ Backend الخاص بك نقاط النهاية التالية:

#### 1. تسجيل الدخول | Sign In

**POST** `/api/auth/login`

**Request Body:**
```json
{
  "usernameOrEmail": "test@example.com",
  "password": "test123"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "userId": "user_id_here",
    "name": "محمد أحمد",
    "phone": "05XXXXXXXX",
    "email": "test@example.com",
    "requiresOTP": true
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "اسم المستخدم أو كلمة المرور غير صحيحة"
}
```

#### 2. التحقق من OTP | OTP Verification

**POST** `/api/auth/verify-otp`

**Request Body:**
```json
{
  "userId": "user_id_here",
  "otp": "123456"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "name": "محمد أحمد",
      "email": "test@example.com",
      "role": "lawyer"
    }
  }
}
```

#### 3. إعادة إرسال OTP | Resend OTP

**POST** `/api/auth/resend-otp`

**Request Body:**
```json
{
  "userId": "user_id_here"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "OTP resent successfully"
}
```

#### 4. تسجيل حساب جديد | Sign Up

**POST** `/api/auth/register`

**Request Body:**
```json
{
  "userType": "lawyer",
  "lawyerMode": "marketplace",
  "firstName": "محمد",
  "lastName": "أحمد",
  "username": "mohammed_ahmed",
  "email": "mohammed@example.com",
  "password": "securePassword123",
  "phone": "0512345678",
  "nationality": "سعودي",
  "region": "الرياض",
  "city": "الرياض",
  "isLicensed": true,
  "licenseNumber": "123456",
  "courts": {
    "general": { "selected": true, "caseCount": "11-30" },
    "commercial": { "selected": true, "caseCount": "1-10" }
  },
  "yearsOfExperience": "5",
  "workType": "مكتب محاماة",
  "firmName": "مكتب محمد أحمد للمحاماة",
  "specializations": ["labor", "commercial", "realestate"],
  "languages": ["العربية", "الإنجليزية"],
  "bio": "محامي متخصص في القضايا التجارية...",
  "isRegisteredKhebra": true,
  "serviceType": "both",
  "pricingModel": ["hourly", "fixed"],
  "acceptsRemote": "كلاهما",
  "agreedTerms": true,
  "agreedPrivacy": true,
  "agreedConflict": true
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "userId": "new_user_id",
    "email": "mohammed@example.com"
  }
}
```

#### 5. نسيت كلمة المرور | Forgot Password

**POST** `/api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "test@example.com"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Reset code sent to email"
}
```

#### 6. إعادة تعيين كلمة المرور | Reset Password

**POST** `/api/auth/reset-password`

**Request Body:**
```json
{
  "email": "test@example.com",
  "otp": "123456",
  "newPassword": "newSecurePassword123"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## تحديث الكود للربط مع API | Update Code for API Integration

### SignIn.jsx

ابحث عن التعليق `// TODO: Replace with actual API call` واستبدل بما يلي:

```javascript
// في handleLoginSubmit
const response = await fetch('YOUR_API_BASE_URL/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData),
});

const data = await response.json();

if (response.ok && data.success) {
  setUserData(data.data);
  setStep('otp');
  setResendTimer(60);
  setCanResend(false);
} else {
  setApiError(data.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
}
```

```javascript
// في handleOtpSubmit
const response = await fetch('YOUR_API_BASE_URL/api/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: userData.userId,
    otp: otp,
  }),
});

const data = await response.json();

if (response.ok && data.success) {
  // حفظ التوكن في localStorage
  localStorage.setItem('authToken', data.data.token);
  localStorage.setItem('user', JSON.stringify(data.data.user));

  setStep('success');
} else {
  setOtpError(data.message || 'رمز التحقق غير صحيح');
  setTimeout(() => setOtp(''), 500);
}
```

```javascript
// في handleResend
const response = await fetch('YOUR_API_BASE_URL/api/auth/resend-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: userData.userId }),
});
```

### SignUp.jsx

```javascript
// في handleSubmit
const response = await fetch('YOUR_API_BASE_URL/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData),
});

const data = await response.json();

if (response.ok && data.success) {
  setShowSuccess(true);
} else {
  setApiError(data.message || 'حدث خطأ أثناء التسجيل');
}
```

### ForgotPassword.jsx

```javascript
// في handleEmailSubmit
const response = await fetch('YOUR_API_BASE_URL/api/auth/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email }),
});

const data = await response.json();

if (response.ok && data.success) {
  setStep('otp');
  setResendTimer(60);
  setCanResend(false);
} else {
  setApiError(data.message || 'حدث خطأ، يرجى المحاولة مرة أخرى');
}
```

```javascript
// في handleNewPasswordSubmit
const response = await fetch('YOUR_API_BASE_URL/api/auth/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: email,
    otp: otp,
    newPassword: newPassword,
  }),
});

const data = await response.json();

if (response.ok && data.success) {
  setStep('success');
} else {
  setApiError(data.message || 'حدث خطأ، يرجى المحاولة مرة أخرى');
}
```

---

## بيانات الاختبار | Test Credentials

### تسجيل الدخول | Sign In
- **Username/Email:** `test` or `test@example.com`
- **Password:** `test123`
- **OTP Code:** `123456`

### نسيت كلمة المرور | Forgot Password
- **Email:** أي بريد إلكتروني صحيح
- **OTP Code:** `123456`

---

## هيكل المكونات | Component Structure

### SignIn.jsx

**الخطوات:**
1. **login** - نموذج تسجيل الدخول
2. **otp** - التحقق من رمز OTP
3. **success** - صفحة النجاح

**الحالات (States):**
```javascript
{
  step: 'login' | 'otp' | 'success',
  formData: { usernameOrEmail, password },
  otp: string,
  userData: { name, phone, email },
  errors: object,
  isLoading: boolean
}
```

### SignUp.jsx

**الخطوات (للمحامي في وضع السوق):**
0. اختيار نوع الحساب
1. البيانات الأساسية
2. بيانات الموقع
3. بيانات الترخيص
4. المحاكم
5. الخبرة والتخصص
6. منصة خبرة
7. إعدادات السوق
8. الإقرارات والموافقات

**للعميل أو المحامي (لوحة التحكم فقط):**
0. اختيار نوع الحساب
1. البيانات الأساسية
2. الإقرارات والموافقات

### ForgotPassword.jsx

**الخطوات:**
1. **email** - إدخال البريد الإلكتروني
2. **otp** - التحقق من رمز OTP
3. **newPassword** - إدخال كلمة المرور الجديدة
4. **success** - صفحة النجاح

---

## التخصيص | Customization

### تغيير الألوان | Change Colors

الألوان الأساسية المستخدمة:

```css
/* الأخضر الزمردي - Primary Color */
from-emerald-500 to-emerald-600

/* الداكن - Dark Text */
#0f172a (text-[#0f172a])

/* الرمادي - Secondary */
slate-50, slate-100, slate-200, etc.

/* الأحمر - Error */
red-400, red-500

/* الأزرق - Links */
blue-600
```

لتغيير اللون الأساسي، ابحث واستبدل:
- `emerald` بأي لون آخر من Tailwind (مثل `blue`, `purple`, `indigo`)
- `#0f172a` باللون الداكن المفضل لديك

### تغيير الخطوط | Change Fonts

في ملف `tailwind.config.js`:

```javascript
theme: {
  extend: {
    fontFamily: {
      sans: ['Cairo', 'system-ui', 'sans-serif'], // للخطوط العربية
    },
  },
}
```

لا تنسَ إضافة رابط الخط في `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap" rel="stylesheet">
```

### تعطيل تسجيل الدخول بـ Google | Disable Google Login

في `SignIn.jsx`، احذف أو علّق على هذا الجزء:

```javascript
{/* Divider */}
{/* <div className="relative my-6">...</div> */}

{/* Google Login */}
{/* <button type="button" onClick={handleGoogleLogin}>...</button> */}
```

---

## الأمان | Security

### ⚠️ ملاحظات مهمة

1. **لا تخزن كلمات المرور في localStorage**
   ```javascript
   // ❌ خطأ
   localStorage.setItem('password', password);

   // ✅ صحيح
   localStorage.setItem('authToken', token);
   ```

2. **استخدم HTTPS دائماً في الإنتاج**

3. **تحقق من التوكن في كل طلب**
   ```javascript
   const token = localStorage.getItem('authToken');

   fetch('YOUR_API_URL', {
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json'
     }
   });
   ```

4. **قم بتنظيف البيانات الحساسة عند تسجيل الخروج**
   ```javascript
   const logout = () => {
     localStorage.removeItem('authToken');
     localStorage.removeItem('user');
     window.location.href = '/sign-in';
   };
   ```

---

## معالجة الأخطاء | Error Handling

### الأخطاء الشائعة | Common Errors

```javascript
// خطأ في الشبكة
catch (error) {
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    setApiError('فشل الاتصال بالخادم. تحقق من اتصالك بالإنترنت');
  }
}

// خطأ 401 - غير مصرح
if (response.status === 401) {
  setApiError('بيانات الدخول غير صحيحة');
}

// خطأ 500 - خطأ في الخادم
if (response.status >= 500) {
  setApiError('خطأ في الخادم. يرجى المحاولة لاحقاً');
}

// خطأ 429 - كثرة المحاولات
if (response.status === 429) {
  setApiError('الكثير من المحاولات. يرجى الانتظار قليلاً');
}
```

---

## التوافق مع المتصفحات | Browser Compatibility

هذه المكونات متوافقة مع:
- ✅ Chrome (الإصدارات الحديثة)
- ✅ Firefox (الإصدارات الحديثة)
- ✅ Safari (الإصدارات الحديثة)
- ✅ Edge (الإصدارات الحديثة)
- ✅ المتصفحات على الهواتف المحمولة

---

## الاستجابة للشاشات | Responsive Design

المكونات مصممة للعمل على جميع أحجام الشاشات:

- **Mobile:** < 640px
- **Tablet:** 640px - 1024px
- **Desktop:** > 1024px

### نقاط التوقف | Breakpoints

```css
/* Tailwind Breakpoints Used */
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
```

---

## اختبار المكونات | Testing Components

### اختبار يدوي | Manual Testing

**قائمة التحقق:**

#### SignIn
- [ ] تسجيل الدخول ببيانات صحيحة
- [ ] تسجيل الدخول ببيانات خاطئة
- [ ] إدخال OTP صحيح
- [ ] إدخال OTP خاطئ
- [ ] إعادة إرسال OTP
- [ ] العودة إلى صفحة تسجيل الدخول من OTP
- [ ] إظهار/إخفاء كلمة المرور
- [ ] رابط نسيت كلمة المرور
- [ ] رابط إنشاء حساب جديد

#### SignUp
- [ ] اختيار نوع الحساب (عميل/محامي)
- [ ] اختيار وضع المحامي (سوق/لوحة تحكم)
- [ ] التنقل بين الخطوات
- [ ] التحقق من صحة البيانات في كل خطوة
- [ ] إنشاء الحساب بنجاح

#### ForgotPassword
- [ ] إرسال البريد الإلكتروني
- [ ] التحقق من OTP
- [ ] تعيين كلمة مرور جديدة
- [ ] العودة إلى تسجيل الدخول

---

## الأسئلة الشائعة | FAQ

### 1. كيف أغير اللغة من العربية إلى الإنجليزية؟

قم بإنشاء ملف ترجمة واستخدم مكتبة مثل `react-i18next`:

```javascript
import { useTranslation } from 'react-i18next';

function SignIn() {
  const { t } = useTranslation();

  return <h1>{t('signin.title')}</h1>;
}
```

### 2. كيف أضيف Google OAuth؟

في `handleGoogleLogin`:

```javascript
const handleGoogleLogin = () => {
  window.location.href = 'YOUR_API_URL/api/auth/google';
};
```

### 3. كيف أحفظ حالة تسجيل الدخول؟

استخدم Context API أو Redux:

```javascript
// AuthContext.js
import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (token, user) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 4. كيف أحمي المسارات من المستخدمين غير المسجلين؟

```javascript
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('authToken');

  if (!token) {
    return <Navigate to="/sign-in" replace />;
  }

  return children;
}

// في App.js
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

---

## الدعم الفني | Support

إذا واجهت أي مشاكل أو كان لديك أسئلة:

1. تحقق من وحدة التحكم في المتصفح للأخطاء
2. تأكد من تثبيت جميع المتطلبات
3. راجع قسم "معالجة الأخطاء"
4. تواصل مع فريق التطوير

---

## سجل التغييرات | Changelog

### v1.0.0 (2024-11-24)
- ✨ إصدار أولي
- ✅ SignIn مع OTP
- ✅ SignUp متعدد الخطوات
- ✅ ForgotPassword مع OTP
- ✅ تصميم متجاوب بالكامل
- ✅ دعم RTL للعربية
- ✅ رسوم متحركة سلسة

---

## الترخيص | License

هذه المكونات جزء من مشروع Traf3li ومرخصة حسب شروط الشركة.

---

**مصمم ومطور لـ Traf3li | Designed & Developed for Traf3li**

© 2024 Traf3li. All rights reserved.
