# BATCH 1: Sidebar Configuration - FIXED VERSION

## 📦 Files Included

1. `sidebar-data.ts` - Sidebar navigation items
2. `.env` - API URL configuration

---

## 🚀 Installation Steps

### Step 1: Update Sidebar Data

**Location:** `C:\traf3li\traf3li-dashboard\src\components\layout\data\sidebar-data.ts`

**Action:** REPLACE the entire file with the provided `sidebar-data.ts`

### Step 2: Add Environment File

**Location:** `C:\traf3li\traf3li-dashboard\.env`

**Action:** 
1. If `.env` exists, OPEN it
2. If not, CREATE new file named `.env` in the root directory
3. Add this line:
```
VITE_API_URL=http://localhost:5000
```

---

## ✅ What This Does

### Sidebar Items:
- لوحة التحكم (Dashboard) → `/`
- القضايا (Cases) → `/cases`
- التقويم (Calendar) → `/calendar`
- تسجيل الوقت (Time Tracking) → `/time-tracking`
- المستندات (Documents) → `/documents`
- الفواتير (Invoices) → `/invoices`
- المصروفات (Expenses) → `/expenses`
- الرسائل (Messages) → `/chats`
- المستخدمون (Users) → `/users`
- الإعدادات (Settings) → `/settings`

### API URL:
- Development: `http://localhost:5000`
- Production: `https://traf3li-backend.onrender.com`

---

## 🧪 Verification

After installation:

1. Start dashboard:
```bash
cd C:\traf3li\traf3li-dashboard
npm run dev
```

2. Check:
- [ ] Sidebar shows all Arabic menu items
- [ ] Icons appear correctly
- [ ] Click items navigates to routes
- [ ] No console errors

---

## 🐛 Troubleshooting

### Issue: "Cannot find module"
**Solution:** Make sure file path is exactly:
```
src/components/layout/data/sidebar-data.ts
```

### Issue: "Icons not showing"
**Solution:** Icons are from `lucide-react` (already installed)

### Issue: "Routes not working"
**Solution:** Routes are created in BATCH 2-6. Sidebar just shows the menu.

---

**Next:** Install BATCH 2 (Cases Feature)
