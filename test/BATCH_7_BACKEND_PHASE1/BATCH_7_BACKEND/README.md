# BATCH 7: Backend Implementation - COMPLETE GUIDE

## 🚨 CRITICAL: This Batch Makes Everything Work!

Without this backend implementation, all the frontend features (BATCH 1-6) are just UI shells. This batch provides the actual functionality.

---

## 📦 What's Included in This Batch

### Models (Database Schemas):
1. ✅ `document.model.js` - Document management with encryption
2. ✅ `timeEntry.model.js` - Time tracking entries
3. ✅ `expense.model.js` - Expense tracking
4. ✅ `calendarEvent.model.js` - Calendar events and hearings

### Utilities:
5. ✅ `encryption.js` - AES-256-GCM encryption for sensitive data
6. ✅ `generateToken.js` - Dual-token JWT authentication

### Still Need to Create:
7. ⏳ Controllers (all CRUD operations)
8. ⏳ Routes (API endpoints)
9. ⏳ Middlewares (authorization, audit logging)
10. ⏳ Enhanced existing models

---

## 🎯 Installation Priority

### PHASE 1: Models (Complete ✅)
Install these 4 new models first:
- `document.model.js`
- `timeEntry.model.js`
- `expense.model.js`
- `calendarEvent.model.js`

### PHASE 2: Utilities (Complete ✅)
Install these 2 utility files:
- `encryption.js`
- `generateToken.js`

### PHASE 3: Enhanced Existing Models
Enhance your existing models with missing features.

### PHASE 4: Controllers
Create all the controllers for CRUD operations.

### PHASE 5: Routes
Wire everything together with API routes.

### PHASE 6: Middlewares
Add security and authorization layers.

---

## 📂 File Locations

All files go in your existing backend: `C:\traf3li\traf3li-backend\`

```
traf3li-backend/
├── src/
│   ├── models/
│   │   ├── user.model.js (✅ EXISTS)
│   │   ├── case.model.js (✅ EXISTS - needs enhancement)
│   │   ├── gig.model.js (✅ EXISTS)
│   │   ├── order.model.js (✅ EXISTS)
│   │   ├── invoice.model.js (✅ EXISTS - needs enhancement)
│   │   │
│   │   └── [NEW FILES TO ADD]
│   │       ├── document.model.js ⬅️ Copy here
│   │       ├── timeEntry.model.js ⬅️ Copy here
│   │       ├── expense.model.js ⬅️ Copy here
│   │       └── calendarEvent.model.js ⬅️ Copy here
│   │
│   ├── utils/ (may need to create this folder)
│   │   ├── encryption.js ⬅️ Copy here
│   │   └── generateToken.js ⬅️ Copy here
│   │
│   ├── controllers/ (add new controllers here)
│   ├── routes/ (add new routes here)
│   └── middlewares/ (enhance existing)
│
└── package.json
```

---

## 🚀 Step-by-Step Installation

### Step 1: Create Utils Directory (if not exists)

```bash
cd C:\traf3li\traf3li-backend\src
mkdir utils
```

### Step 2: Copy Model Files

```bash
# Copy the 4 new model files to:
C:\traf3li\traf3li-backend\src\models\

Files:
- document.model.js
- timeEntry.model.js
- expense.model.js
- calendarEvent.model.js
```

### Step 3: Copy Utility Files

```bash
# Copy the 2 utility files to:
C:\traf3li\traf3li-backend\src\utils\

Files:
- encryption.js
- generateToken.js
```

### Step 4: Update Environment Variables

Add these to your `.env` file:

```bash
# Existing variables (keep these)
MONGODB_URI=mongodb+srv://...
JWT_SECRET=60478c05edfa3cd397b484187c689f6efa1655775d16d3888133416146d6bd38
PORT=5000
NODE_ENV=production
CLIENT_URL=https://traf3li.com
DASHBOARD_URL=https://dashboard.traf3li.com

# NEW: Add these
JWT_REFRESH_SECRET=5f17332cbf148e9091b8e3651c135236a58296943072a9b83aec02ba2d5853ef
ENCRYPTION_KEY=862af48d1f4d0886cfcf55e0af14548f50323d98d5d058a4a4c6fa5b8885ae5d

# File Storage (choose one)
# Option A: AWS S3 (Recommended for Saudi Arabia)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=traf3li-documents-sa
AWS_REGION=me-south-1

# Option B: Cloudinary (Already configured)
CLOUDINARY_CLOUD_NAME=xxxxx
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx

# Email (for reminders)
SENDGRID_API_KEY=your_sendgrid_key
FROM_EMAIL=noreply@traf3li.com
```

### Step 5: Install Additional Dependencies

```bash
cd C:\traf3li\traf3li-backend
npm install aws-sdk multer-s3 cookie-parser
```

**Why these packages:**
- `aws-sdk` - For AWS S3 file storage
- `multer-s3` - Upload files directly to S3
- `cookie-parser` - Parse HTTP cookies for tokens

### Step 6: Update server.js

Add cookie parser middleware:

```javascript
const cookieParser = require('cookie-parser');

// Add after other middleware
app.use(cookieParser());
```

---

## 🔐 Security Features Implemented

### 1. Encryption (encryption.js)
```javascript
✅ AES-256-GCM encryption
✅ Separate IV for each encryption
✅ Authentication tag for integrity
✅ File encryption support
✅ Hash functions
✅ Token generation
```

**Use cases:**
- Encrypt court judgments (required by law)
- Encrypt confidential documents
- Hash sensitive data
- Generate secure tokens

### 2. Dual-Token Authentication (generateToken.js)
```javascript
✅ Access Token: 15 minutes (short-lived)
✅ Refresh Token: 7 days (long-lived)
✅ HttpOnly cookies (XSS protection)
✅ sameSite: strict (CSRF protection)
✅ Automatic token extraction
✅ Token verification
```

**Flow:**
1. User logs in
2. Server generates both tokens
3. Tokens stored in HttpOnly cookies
4. Access token expires after 15 min
5. Frontend auto-refreshes using refresh token
6. No tokens in localStorage (more secure)

---

## 📊 Models Explained

### 1. Document Model
**Purpose:** Store and manage all legal documents

**Features:**
- ✅ File metadata (name, type, size, URL)
- ✅ Categories (contract, judgment, evidence, etc.)
- ✅ Case association
- ✅ Confidential flag
- ✅ Encryption support
- ✅ Version control
- ✅ Shareable links with expiration
- ✅ Access tracking
- ✅ Tags for organization
- ✅ Text search

**Key Methods:**
- `isAccessibleBy(userId, userRole)` - Check permissions
- `recordAccess()` - Track who viewed
- `getStorageStats()` - Calculate storage usage
- `getCategoryBreakdown()` - Stats by category

**Automatic Features:**
- Judgments are automatically marked confidential
- Text index for search
- Access count tracking

### 2. TimeEntry Model
**Purpose:** Track billable hours for lawyers

**Features:**
- ✅ Description of work
- ✅ Case association
- ✅ Date and time (start/end)
- ✅ Duration in minutes
- ✅ Hourly rate
- ✅ Auto-calculated total amount
- ✅ Billable/non-billable flag
- ✅ Billed status
- ✅ Invoice linkage
- ✅ Timer-based flag

**Key Methods:**
- `getTimeStats()` - Calculate totals
- `getTimeByCase()` - Group by case
- `getTimeByDay()` - Group by day
- `markAsBilled()` - Bulk mark as billed

**Automatic Features:**
- Total amount auto-calculated on save
- Optimized indexes for queries

**Business Logic:**
```javascript
totalAmount = (duration / 60) * hourlyRate

Example:
- Work: 2.5 hours (150 minutes)
- Rate: 500 SAR/hour
- Amount: (150/60) * 500 = 1,250 SAR
```

### 3. Expense Model
**Purpose:** Track case-related expenses

**Features:**
- ✅ Description
- ✅ Amount
- ✅ Categories (court_fees, travel, etc.)
- ✅ Case association
- ✅ Date
- ✅ Receipt URL
- ✅ Billable/non-billable
- ✅ Reimbursement tracking
- ✅ Invoice linkage

**Key Methods:**
- `getExpenseStats()` - Calculate totals
- `getExpensesByCategory()` - Group by category
- `getExpensesByMonth()` - Monthly breakdown
- `markAsReimbursed()` - Bulk mark as reimbursed

**Categories:**
- `court_fees` - Court filing fees, etc.
- `travel` - Transportation, hotels
- `consultation` - Expert consultations
- `documents` - Printing, copying
- `research` - Legal research costs
- `other` - Miscellaneous

### 4. CalendarEvent Model
**Purpose:** Schedule hearings, meetings, deadlines

**Features:**
- ✅ Title and type
- ✅ Start/end date and time
- ✅ Location
- ✅ Case association
- ✅ Attendees
- ✅ Reminder system
- ✅ All-day events
- ✅ Status tracking
- ✅ Recurring events support

**Event Types:**
- `hearing` - Court hearings
- `meeting` - Client/team meetings
- `deadline` - Important deadlines
- `consultation` - Client consultations

**Key Methods:**
- `shouldSendReminder()` - Check if reminder needed
- `getUpcomingEvents()` - Next 7 days
- `getEventsForRange()` - Date range
- `getEventsNeedingReminders()` - For cron job
- `markReminderSent()` - Update flag

**Virtuals:**
- `isPast` - Is event in the past?
- `isToday` - Is event today?

---

## 🔄 Integration with Existing Models

### case.model.js (Needs Enhancement)
**Add these fields:**
```javascript
// Financial tracking
totalTimeSpent: Number, // Auto-calculated from TimeEntry
totalExpenses: Number, // Auto-calculated from Expense
totalBilled: Number, // Sum of invoices
profitability: Number, // Calculated

// Document count
documentCount: Number, // Auto-updated

// Next hearing
nextHearing: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'CalendarEvent'
}
```

### invoice.model.js (Needs Enhancement)
**Add these fields:**
```javascript
// Link to time entries and expenses
timeEntries: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'TimeEntry'
}],
expenses: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Expense'
}],

// Auto-calculate from linked items
calculatedTotal: Number,

// Breakdown
breakdown: {
  timeTotal: Number,
  expensesTotal: Number,
  subtotal: Number,
  tax: Number,
  total: Number
}
```

---

## 🎯 What Each File Does

### encryption.js
**Purpose:** Protect sensitive data

**Functions:**
```javascript
encrypt(data) // Encrypt text/JSON
decrypt(encrypted, iv, authTag) // Decrypt text/JSON
encryptFile(buffer) // Encrypt file
decryptFile(buffer, iv, authTag) // Decrypt file
hash(data) // SHA-256 hash
generateToken() // Random secure token
```

**Usage Example:**
```javascript
const { encrypt, decrypt } = require('./utils/encryption');

// Encrypt judgment text
const judgment = "حكم المحكمة...";
const { encrypted, iv, authTag } = encrypt(judgment);

// Store encrypted, iv, authTag in database
document.encryptedContent = encrypted;
document.encryptionIV = iv;
document.encryptionAuthTag = authTag;

// Later, decrypt
const decrypted = decrypt(encrypted, iv, authTag);
```

### generateToken.js
**Purpose:** Secure JWT authentication

**Functions:**
```javascript
generateTokens(payload) // Create access + refresh
verifyAccessToken(token) // Verify access token
verifyRefreshToken(token) // Verify refresh token
setTokenCookies(res, access, refresh) // Set HTTP-only cookies
clearTokenCookies(res) // Clear cookies on logout
extractToken(req) // Get token from request
```

**Usage Example:**
```javascript
const { generateTokens, setTokenCookies } = require('./utils/generateToken');

// On login
const tokens = generateTokens({
  userId: user._id,
  email: user.email,
  role: user.role
});

setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

res.json({
  success: true,
  user: { id: user._id, email: user.email, role: user.role }
});
// Tokens are in cookies, not response body
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "ENCRYPTION_KEY must be 64 characters"
**Solution:**
```bash
# Generate new key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
ENCRYPTION_KEY=<generated_key>
```

### Issue 2: "JWT_SECRET must be at least 64 characters"
**Solution:** Your current secret is fine (64 chars), but make sure both are set:
```bash
JWT_SECRET=60478c05edfa3cd397b484187c689f6efa1655775d16d3888133416146d6bd38
JWT_REFRESH_SECRET=5f17332cbf148e9091b8e3651c135236a58296943072a9b83aec02ba2d5853ef
```

### Issue 3: "Cannot find module 'cookie-parser'"
**Solution:**
```bash
npm install cookie-parser
```

Then add to server.js:
```javascript
const cookieParser = require('cookie-parser');
app.use(cookieParser());
```

### Issue 4: Models not found
**Solution:** Make sure files are in correct location:
```
src/models/document.model.js
src/models/timeEntry.model.js
src/models/expense.model.js
src/models/calendarEvent.model.js
```

---

## ✅ Verification Checklist

### Phase 1: Models
- [ ] All 4 model files copied to `src/models/`
- [ ] No syntax errors
- [ ] MongoDB connection working
- [ ] Can import models in controllers

### Phase 2: Utilities
- [ ] Both utility files copied to `src/utils/`
- [ ] ENCRYPTION_KEY set in .env (64 chars)
- [ ] JWT secrets set in .env (64+ chars)
- [ ] Can import utilities

### Phase 3: Dependencies
- [ ] `cookie-parser` installed
- [ ] `aws-sdk` installed (if using S3)
- [ ] `multer-s3` installed (if using S3)
- [ ] server.js updated with cookie-parser

### Phase 4: Environment
- [ ] All new .env variables added
- [ ] Keys are long enough
- [ ] AWS/Cloudinary configured
- [ ] SendGrid configured (for emails)

---

## 🚀 What's Next

This is just PHASE 1 & 2 of backend implementation!

**Still needed:**

### PHASE 3: Controllers (20-30 files)
- Documents controller (upload, download, encrypt)
- TimeEntry controller
- Expense controller
- CalendarEvent controller
- Enhanced Case controller
- Enhanced Invoice controller

### PHASE 4: Routes (15-20 files)
- All API endpoints
- File upload routes
- Protected routes

### PHASE 5: Middlewares (5-10 files)
- Enhanced authenticate middleware
- Authorization middleware (role-based)
- Audit logging middleware
- Rate limiting
- IP whitelist for admin

**Would you like me to continue creating the controllers and routes?**

---

## 💡 Tips

1. **Test incrementally:** Install models → test → add controllers → test
2. **Backup first:** Before modifying existing files
3. **Use Postman:** Test each endpoint as you create it
4. **Check logs:** Console errors will tell you what's missing
5. **Read comments:** Each file has detailed comments

---

## 🔒 Security Reminders

1. **NEVER** commit .env file to Git
2. **ALWAYS** use HTTPS in production
3. **NEVER** log sensitive data (passwords, tokens)
4. **ALWAYS** validate user input
5. **NEVER** trust frontend data
6. **ALWAYS** check permissions before queries
7. **NEVER** expose internal errors to frontend

---

**This is the foundation! Ready to continue with controllers and routes?**

Say **"continue"** or **"controllers"** for the next phase! 🚀
