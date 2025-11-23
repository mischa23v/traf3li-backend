# TRAF3LI Backend API Specification
**Version:** 1.0
**Base URL:** `http://localhost:8080/api` (Development)
**Base URL:** `https://api.traf3li.com/api` (Production)
**Last Updated:** November 23, 2025

---

## 📑 Table of Contents

1. [Authentication](#1-authentication)
2. [General Information](#2-general-information)
3. [Calendar System](#3-calendar-system)
4. [Chat/Messaging System](#4-chatmessaging-system)
5. [Finance Module](#5-finance-module)
   - [Invoices](#51-invoices)
   - [Expenses](#52-expenses)
   - [Time Tracking](#53-time-tracking)
   - [Payments](#54-payments)
   - [Retainers](#55-retainers)
   - [Billing Rates](#56-billing-rates)
   - [Statements](#57-statements)
   - [Transactions](#58-transactions)
   - [Reports](#59-reports)
6. [Tasks System](#6-tasks-system)
7. [Reminders System](#7-reminders-system)
8. [Events System](#8-events-system)
9. [Clients Management](#9-clients-management)
10. [Cases (Reference Data)](#10-cases-reference-data)
11. [Users (Reference Data)](#11-users-reference-data)
12. [Error Handling](#12-error-handling)
13. [File Uploads](#13-file-uploads)

---

## 1. Authentication

### Authentication Method
- **Type:** JWT (JSON Web Token)
- **Storage:** HttpOnly Cookie + Authorization Header (both supported)
- **Cookie Name:** `accessToken`
- **Header Format:** `Authorization: Bearer <token>`

### Login
```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "lawyer@traf3li.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "error": false,
  "message": "تم تسجيل الدخول بنجاح",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "أحمد المحامي",
    "email": "lawyer@traf3li.com",
    "isSeller": true,
    "image": "https://cloudinary.com/avatar.jpg"
  }
}
```

**Note:** Access token is automatically set in HttpOnly cookie. Use `credentials: 'include'` in fetch/axios.

---

## 2. General Information

### Standard Response Format

**Success Response:**
```json
{
  "success": true,
  "message": "تم العملية بنجاح",
  "data": { }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": true,
  "message": "فشلت العملية",
  "errors": [
    {
      "field": "field_name",
      "message": "Error description"
    }
  ]
}
```

### HTTP Status Codes
- **200** - Success
- **201** - Created
- **400** - Bad Request (validation errors)
- **401** - Unauthorized (not logged in)
- **403** - Forbidden (no permission)
- **404** - Not Found
- **500** - Server Error

### Pagination Format

**Query Parameters:**
```
?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Sorting & Filtering

**Query Parameters:**
```
?sort=createdAt              // Sort field
&order=desc                  // Sort direction (asc/desc)
&status=pending              // Filter by status
&search=query                // Text search
&startDate=2025-11-01        // Date range start
&endDate=2025-11-30          // Date range end
```

---

## 3. Calendar System

### Base Path: `/calendar`

### 3.1 Get Unified Calendar View

**Endpoint:**
```
GET /calendar
```

**Auth Required:** Yes (All roles)

**Query Parameters:**
```
?startDate=2025-11-01        // Required
&endDate=2025-11-30          // Required
&type=event|task|reminder    // Optional: filter by type
&caseId=507f...              // Optional: filter by case
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "507f1f77bcf86cd799439011",
        "type": "event",
        "title": "جلسة محكمة",
        "description": "جلسة القضية رقم 123",
        "startDate": "2025-11-25T10:00:00Z",
        "endDate": "2025-11-25T12:00:00Z",
        "allDay": false,
        "eventType": "hearing",
        "location": "المحكمة العامة",
        "status": "scheduled",
        "color": "#ef4444",
        "caseId": "507f...",
        "caseName": "قضية عقد إيجار",
        "caseNumber": "C-2025-001",
        "createdBy": {
          "_id": "507f...",
          "username": "أحمد المحامي",
          "image": "https://..."
        },
        "attendees": []
      }
    ],
    "tasks": [
      {
        "id": "507f...",
        "type": "task",
        "title": "مراجعة عقد",
        "description": "مراجعة عقد العميل",
        "startDate": "2025-11-26T14:00:00Z",
        "endDate": "2025-11-26T14:00:00Z",
        "allDay": true,
        "status": "todo",
        "priority": "high",
        "color": "#f59e0b",
        "caseId": "507f...",
        "caseName": "قضية عقد",
        "assignedTo": { },
        "isOverdue": false
      }
    ],
    "reminders": [
      {
        "id": "507f...",
        "type": "reminder",
        "title": "دفع رسوم",
        "description": "تذكير بدفع رسوم المحكمة",
        "startDate": "2025-11-27T09:00:00Z",
        "endDate": "2025-11-27T09:00:00Z",
        "allDay": false,
        "reminderTime": "09:00",
        "status": "pending",
        "priority": "urgent",
        "reminderType": "payment",
        "color": "#dc2626",
        "notificationSent": false
      }
    ],
    "combined": [],
    "summary": {
      "totalItems": 3,
      "eventCount": 1,
      "taskCount": 1,
      "reminderCount": 1
    }
  },
  "dateRange": {
    "start": "2025-11-01T00:00:00Z",
    "end": "2025-11-30T23:59:59Z"
  }
}
```

### 3.2 Get Calendar by Specific Date

**Endpoint:**
```
GET /calendar/date/:date
```

**Example:**
```
GET /calendar/date/2025-11-25
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "date": "2025-11-25T00:00:00Z",
    "events": [...],
    "tasks": [...],
    "reminders": [...],
    "summary": {
      "total": 5,
      "eventCount": 2,
      "taskCount": 2,
      "reminderCount": 1
    }
  }
}
```

### 3.3 Get Calendar by Month

**Endpoint:**
```
GET /calendar/month/:year/:month
```

**Example:**
```
GET /calendar/month/2025/11
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "month": {
      "year": 2025,
      "month": 11
    },
    "groupedByDate": {
      "2025-11-25": {
        "date": "2025-11-25",
        "events": [...],
        "tasks": [...],
        "reminders": [...],
        "count": 3
      }
    },
    "summary": {
      "totalDays": 15,
      "totalItems": 45,
      "eventCount": 20,
      "taskCount": 15,
      "reminderCount": 10
    }
  }
}
```

### 3.4 Get Upcoming Items

**Endpoint:**
```
GET /calendar/upcoming
```

**Query Parameters:**
```
?days=7    // Optional, default: 7
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "upcoming": [
      {
        "id": "507f...",
        "type": "event",
        "title": "...",
        "date": "2025-11-25T10:00:00Z"
      }
    ],
    "summary": {
      "total": 10,
      "eventCount": 5,
      "taskCount": 3,
      "reminderCount": 2
    },
    "dateRange": {
      "start": "2025-11-23T00:00:00Z",
      "end": "2025-11-30T23:59:59Z"
    }
  }
}
```

### 3.5 Get Overdue Items

**Endpoint:**
```
GET /calendar/overdue
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "tasks": [...],
    "reminders": [...],
    "pastEvents": [...],
    "summary": {
      "overdueTaskCount": 5,
      "overdueReminderCount": 2,
      "pastEventCount": 3,
      "total": 10
    }
  }
}
```

### 3.6 Get Calendar Statistics

**Endpoint:**
```
GET /calendar/stats
```

**Query Parameters:**
```
?startDate=2025-11-01    // Optional
&endDate=2025-11-30      // Optional
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "events": [
      { "_id": "scheduled", "count": 15 },
      { "_id": "completed", "count": 20 },
      { "_id": "cancelled", "count": 2 }
    ],
    "tasks": [
      { "_id": "todo", "count": 10 },
      { "_id": "in progress", "count": 5 },
      { "_id": "done", "count": 30 }
    ],
    "reminders": [
      { "_id": "pending", "count": 8 },
      { "_id": "completed", "count": 25 },
      { "_id": "dismissed", "count": 3 }
    ],
    "overdueTasks": 3,
    "dateRange": {
      "start": "2025-11-01T00:00:00Z",
      "end": "2025-11-30T23:59:59Z"
    }
  }
}
```

---

## 4. Chat/Messaging System

### Base Path: `/conversations` and `/messages`

### 4.1 Get Conversations

**Endpoint:**
```
GET /conversations
```

**Auth Required:** Yes

**Query Parameters:**
```
?page=1&limit=20
```

**Success Response (200):**
```json
{
  "success": true,
  "conversations": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "participants": [
        {
          "_id": "507f...",
          "username": "أحمد المحامي",
          "image": "https://..."
        },
        {
          "_id": "507f...",
          "username": "محمد العميل",
          "image": "https://..."
        }
      ],
      "lastMessage": {
        "content": "مرحباً، كيف يمكنني مساعدتك؟",
        "createdAt": "2025-11-23T10:00:00Z",
        "sender": "507f..."
      },
      "unreadCount": {
        "507f...": 2
      },
      "createdAt": "2025-11-20T08:00:00Z",
      "updatedAt": "2025-11-23T10:00:00Z"
    }
  ],
  "total": 15
}
```

### 4.2 Create Conversation

**Endpoint:**
```
POST /conversations
```

**Request Body:**
```json
{
  "participants": ["507f...", "507f..."]
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "تم إنشاء المحادثة بنجاح",
  "conversation": {
    "_id": "507f...",
    "participants": [...],
    "createdAt": "2025-11-23T10:00:00Z"
  }
}
```

### 4.3 Get Messages

**Endpoint:**
```
GET /conversations/:id/messages
```

**Query Parameters:**
```
?page=1&limit=50
```

**Success Response (200):**
```json
{
  "success": true,
  "messages": [
    {
      "_id": "507f...",
      "conversationId": "507f...",
      "sender": {
        "_id": "507f...",
        "username": "أحمد",
        "image": "https://..."
      },
      "content": "مرحباً",
      "attachments": [],
      "readBy": ["507f..."],
      "createdAt": "2025-11-23T10:00:00Z"
    }
  ],
  "total": 45
}
```

### 4.4 Send Message

**Endpoint:**
```
POST /conversations/:id/messages
```

**Request Body:**
```json
{
  "content": "مرحباً، كيف حالك؟",
  "attachments": []
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": {
    "_id": "507f...",
    "conversationId": "507f...",
    "sender": "507f...",
    "content": "مرحباً، كيف حالك؟",
    "attachments": [],
    "createdAt": "2025-11-23T10:00:00Z"
  }
}
```

### 4.5 Socket.io Events

#### Client → Server Events

**Join User Session (Required on connect):**
```javascript
socket.emit('user:join', userId);
```

**Join Conversation (Required before messaging):**
```javascript
socket.emit('conversation:join', conversationId);
```

**Send Message:**
```javascript
socket.emit('message:send', {
  conversationId: '507f...',
  content: 'مرحباً',
  attachments: []
});
```

**Typing Indicators:**
```javascript
// Start typing
socket.emit('typing:start', {
  conversationId: '507f...',
  userId: '507f...',
  username: 'أحمد'
});

// Stop typing
socket.emit('typing:stop', {
  conversationId: '507f...',
  userId: '507f...'
});
```

**Mark Messages as Read:**
```javascript
socket.emit('message:read', {
  conversationId: '507f...',
  userId: '507f...'
});
```

#### Server → Client Events

**User Online Status:**
```javascript
socket.on('user:online', (data) => {
  console.log(data);
  // {
  //   userId: '507f...',
  //   socketId: 'abc123'
  // }
});
```

**User Offline Status:**
```javascript
socket.on('user:offline', (data) => {
  console.log(data);
  // {
  //   userId: '507f...'
  // }
});
```

**Receive Message:**
```javascript
socket.on('message:receive', (data) => {
  console.log(data);
  // {
  //   conversationId: '507f...',
  //   message: {
  //     _id: '507f...',
  //     senderId: '507f...',
  //     content: 'مرحباً',
  //     createdAt: '2025-11-23T10:00:00Z'
  //   }
  // }
});
```

**Typing Indicator Show:**
```javascript
socket.on('typing:show', (data) => {
  console.log(data);
  // {
  //   userId: '507f...',
  //   username: 'أحمد'
  // }
});
```

**Typing Indicator Hide:**
```javascript
socket.on('typing:hide', (data) => {
  console.log(data);
  // {
  //   userId: '507f...'
  // }
});
```

**Message Read Notification:**
```javascript
socket.on('message:read', (data) => {
  console.log(data);
  // {
  //   userId: '507f...'
  // }
});
```

**New Notification:**
```javascript
socket.on('notification:new', (notification) => {
  console.log(notification);
  // {
  //   _id: '507f...',
  //   type: 'message' | 'reminder' | 'task' | 'payment',
  //   title: 'عنوان الإشعار',
  //   message: 'محتوى الإشعار',
  //   createdAt: '2025-11-23T10:00:00Z'
  // }
});
```

**Notification Count Update:**
```javascript
socket.on('notification:count', (data) => {
  console.log(data);
  // {
  //   count: 5
  // }
});
```

---

## 5. Finance Module

### 5.1 Invoices

#### Base Path: `/invoices`

#### Data Model
```typescript
interface Invoice {
  _id: string;
  invoiceNumber: string;           // Auto-generated: INV-2025-0001
  caseId?: string;                 // Optional reference to Case
  contractId?: string;             // Optional reference to Order
  lawyerId: string;                // Required
  clientId: string;                // Required
  items: InvoiceItem[];
  subtotal: number;
  vatRate: number;                 // Default: 15 (Saudi VAT)
  vatAmount: number;
  totalAmount: number;             // subtotal + vatAmount
  amountPaid: number;              // Default: 0
  balanceDue: number;              // totalAmount - amountPaid
  status: 'draft' | 'pending' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  notes?: string;
  pdfUrl?: string;
  history: InvoiceHistory[];
  createdAt: Date;
  updatedAt: Date;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceHistory {
  action: string;
  performedBy: string;
  timestamp: Date;
  details?: any;
}
```

#### 5.1.1 Create Invoice

**Endpoint:**
```
POST /invoices
```

**Request Body:**
```json
{
  "clientId": "507f1f77bcf86cd799439011",
  "caseId": "507f...",
  "items": [
    {
      "description": "استشارة قانونية",
      "quantity": 2,
      "unitPrice": 500,
      "total": 1000
    }
  ],
  "subtotal": 1000,
  "vatRate": 15,
  "vatAmount": 150,
  "totalAmount": 1150,
  "dueDate": "2025-12-31",
  "notes": "الرجاء الدفع خلال 30 يوم"
}
```

**Validation Rules:**
- clientId: required, valid ObjectId
- items: required, array, min 1 item
- items.description: required, string, max 500 chars
- items.quantity: required, number, min 1
- items.unitPrice: required, number, min 0
- subtotal: required, number, min 0
- dueDate: required, valid date

**Success Response (201):**
```json
{
  "error": false,
  "message": "تم إنشاء الفاتورة بنجاح",
  "invoice": {
    "_id": "507f...",
    "invoiceNumber": "INV-2025-0001",
    "clientId": {...},
    "lawyerId": {...},
    "items": [...],
    "subtotal": 1000,
    "vatRate": 15,
    "vatAmount": 150,
    "totalAmount": 1150,
    "amountPaid": 0,
    "balanceDue": 1150,
    "status": "draft",
    "issueDate": "2025-11-23T10:00:00Z",
    "dueDate": "2025-12-31T00:00:00Z",
    "createdAt": "2025-11-23T10:00:00Z"
  }
}
```

#### 5.1.2 Get Invoices

**Endpoint:**
```
GET /invoices
```

**Query Parameters:**
```
?status=sent                     // Filter by status
&clientId=507f...                // Filter by client
&caseId=507f...                  // Filter by case
&startDate=2025-11-01            // Filter by date range
&endDate=2025-11-30
&page=1
&limit=20
```

**Success Response (200):**
```json
{
  "error": false,
  "invoices": [...],
  "total": 45,
  "page": 1,
  "limit": 20,
  "pages": 3
}
```

#### 5.1.3 Get Single Invoice

**Endpoint:**
```
GET /invoices/:id
```

**Success Response (200):**
```json
{
  "error": false,
  "invoice": {
    "_id": "507f...",
    "invoiceNumber": "INV-2025-0001",
    "clientId": {
      "_id": "507f...",
      "username": "محمد العميل",
      "email": "client@example.com"
    },
    "lawyerId": {...},
    "caseId": {...},
    "items": [...],
    "totalAmount": 1150,
    "status": "sent",
    "history": [
      {
        "action": "created",
        "performedBy": "507f...",
        "timestamp": "2025-11-23T10:00:00Z"
      },
      {
        "action": "sent",
        "performedBy": "507f...",
        "timestamp": "2025-11-23T11:00:00Z"
      }
    ]
  }
}
```

#### 5.1.4 Update Invoice

**Endpoint:**
```
PATCH /invoices/:id
```

**Request Body:**
```json
{
  "items": [...],
  "notes": "ملاحظات محدثة"
}
```

**Success Response (200):**
```json
{
  "error": false,
  "message": "تم تحديث الفاتورة بنجاح",
  "invoice": {...}
}
```

**Notes:**
- Cannot update if status is 'paid'
- Cannot update if invoice has been sent (status != 'draft')

#### 5.1.5 Send Invoice

**Endpoint:**
```
POST /invoices/:id/send
```

**Success Response (200):**
```json
{
  "error": false,
  "message": "تم إرسال الفاتورة بنجاح",
  "invoice": {
    "_id": "507f...",
    "status": "sent",
    "pdfUrl": "https://cloudinary.com/invoices/INV-2025-0001.pdf"
  }
}
```

**Notes:**
- Automatically generates PDF
- Sends email to client
- Updates status to 'sent'

#### 5.1.6 Get Overdue Invoices

**Endpoint:**
```
GET /invoices/overdue
```

**Success Response (200):**
```json
{
  "error": false,
  "invoices": [...],
  "total": 5,
  "totalAmount": 25000
}
```

---

### 5.2 Expenses

#### Base Path: `/expenses`

#### Data Model
```typescript
interface Expense {
  _id: string;
  expenseId: string;               // Auto-generated: EXP-2025-0001
  description: string;
  amount: number;
  category: 'office' | 'transport' | 'hospitality' | 'government' | 'court_fees' | 'filing_fees' | 'expert_witness' | 'investigation' | 'accommodation' | 'meals' | 'postage' | 'printing' | 'consultation' | 'documents' | 'research' | 'software' | 'telephone' | 'mileage' | 'other';
  caseId?: string;
  userId: string;
  date: Date;
  paymentMethod: 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'check';
  vendor?: string;
  isBillable: boolean;
  billableAmount?: number;
  markupType?: 'none' | 'percentage' | 'fixed';
  markupValue?: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'invoiced' | 'rejected';
  reimbursementStatus?: 'pending' | 'approved' | 'paid';
  receipts: Receipt[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Receipt {
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: Date;
}
```

#### 5.2.1 Create Expense

**Endpoint:**
```
POST /expenses
```

**Request Body:**
```json
{
  "description": "رسوم المحكمة",
  "amount": 500,
  "category": "court_fees",
  "caseId": "507f...",
  "date": "2025-11-23",
  "paymentMethod": "cash",
  "vendor": "المحكمة العامة",
  "isBillable": true,
  "markupType": "percentage",
  "markupValue": 10,
  "notes": "رسوم جلسة 25 نوفمبر"
}
```

**Validation Rules:**
- description: required, string, max 500 chars
- amount: required, number, min 0
- category: required, valid enum value
- date: required, valid date
- paymentMethod: required, valid enum value

**Success Response (201):**
```json
{
  "error": false,
  "message": "تم إنشاء المصروف بنجاح",
  "expense": {
    "_id": "507f...",
    "expenseId": "EXP-2025-0001",
    "description": "رسوم المحكمة",
    "amount": 500,
    "billableAmount": 550,
    "category": "court_fees",
    "status": "draft",
    "createdAt": "2025-11-23T10:00:00Z"
  }
}
```

**Notes:**
- billableAmount automatically calculated based on markup
- If isBillable=true and markupType='percentage' and markupValue=10:
  - billableAmount = amount * (1 + markupValue/100) = 500 * 1.1 = 550

#### 5.2.2 Get Expenses

**Endpoint:**
```
GET /expenses
```

**Query Parameters:**
```
?status=approved
&category=court_fees
&caseId=507f...
&startDate=2025-11-01
&endDate=2025-11-30
&page=1
&limit=20
```

**Success Response (200):**
```json
{
  "error": false,
  "expenses": [...],
  "total": 35,
  "page": 1,
  "limit": 20
}
```

#### 5.2.3 Upload Receipt

**Endpoint:**
```
POST /expenses/:id/receipt
```

**Content-Type:** `multipart/form-data`

**Request Body:**
```
file: [File]
```

**Success Response (200):**
```json
{
  "error": false,
  "message": "تم رفع الإيصال بنجاح",
  "receipt": {
    "fileName": "receipt_20251123.jpg",
    "fileUrl": "https://cloudinary.com/receipts/...",
    "fileType": "image/jpeg",
    "uploadedAt": "2025-11-23T10:00:00Z"
  }
}
```

**Notes:**
- Max file size: 10 MB
- Accepted types: image/jpeg, image/png, image/jpg, application/pdf
- Files stored on Cloudinary

#### 5.2.4 Mark as Reimbursed

**Endpoint:**
```
POST /expenses/:id/reimburse
```

**Request Body:**
```json
{
  "reimbursedAmount": 500
}
```

**Success Response (200):**
```json
{
  "error": false,
  "message": "تم تسجيل السداد بنجاح",
  "expense": {
    "_id": "507f...",
    "reimbursementStatus": "paid",
    "reimbursedAmount": 500
  }
}
```

#### 5.2.5 Get Expense Statistics

**Endpoint:**
```
GET /expenses/stats
```

**Query Parameters:**
```
?startDate=2025-11-01
&endDate=2025-11-30
&caseId=507f...
```

**Success Response (200):**
```json
{
  "error": false,
  "stats": {
    "totalExpenses": 12500,
    "billableExpenses": 10000,
    "reimbursedExpenses": 5000,
    "pendingReimbursement": 2500,
    "byStatus": {
      "draft": 2,
      "approved": 15,
      "invoiced": 10
    },
    "byCategory": {
      "court_fees": 3500,
      "transport": 2000,
      "office": 4000
    }
  }
}
```

#### 5.2.6 Get Expenses by Category

**Endpoint:**
```
GET /expenses/by-category
```

**Success Response (200):**
```json
{
  "error": false,
  "categories": [
    {
      "category": "court_fees",
      "count": 12,
      "totalAmount": 6000
    },
    {
      "category": "transport",
      "count": 8,
      "totalAmount": 2500
    }
  ]
}
```

---

### 5.3 Time Tracking

#### Base Path: `/time-tracking`

#### Data Model
```typescript
interface TimeEntry {
  _id: string;
  entryId: string;                 // Auto-generated: TIME-2025-0001
  description: string;
  lawyerId: string;
  clientId: string;
  caseId: string;
  date: Date;
  startTime: string;               // "10:00"
  endTime?: string;                // "12:30"
  duration: number;                // in minutes
  hourlyRate: number;
  totalAmount: number;             // Auto-calculated
  isBillable: boolean;
  isBilled: boolean;
  activityCode?: 'court_appearance' | 'client_meeting' | 'research' | 'document_preparation' | 'phone_call' | 'email' | 'travel' | 'administrative' | 'other';
  status: 'draft' | 'pending_approval' | 'approved' | 'invoiced' | 'rejected';
  invoiceId?: string;
  wasTimerBased: boolean;
  timerStartedAt?: Date;
  timerPausedDuration?: number;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  editHistory: EditHistory[];
  notes?: string;
  attachments: Attachment[];
  createdAt: Date;
  updatedAt: Date;
}

interface EditHistory {
  editedBy: string;
  editedAt: Date;
  changes: any;
}

interface Attachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
}
```

#### 5.3.1 Start Timer

**Endpoint:**
```
POST /time-tracking/timer/start
```

**Request Body:**
```json
{
  "caseId": "507f...",
  "clientId": "507f...",
  "activityCode": "client_meeting",
  "description": "اجتماع مع العميل"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم بدء المؤقت بنجاح",
  "timer": {
    "startedAt": "2025-11-23T10:00:00Z",
    "hourlyRate": 400,
    "description": "اجتماع مع العميل",
    "caseId": "507f...",
    "activityCode": "client_meeting"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "يوجد مؤقت قيد التشغيل بالفعل. يرجى إيقافه أولاً"
}
```

**Notes:**
- Only one timer can run at a time per lawyer
- Hourly rate automatically fetched from BillingRate model
- Rate hierarchy: Custom client > Custom case type > Activity-based > Standard

#### 5.3.2 Pause Timer

**Endpoint:**
```
POST /time-tracking/timer/pause
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم إيقاف المؤقت مؤقتاً",
  "timer": {
    "pausedAt": "2025-11-23T10:30:00Z",
    "elapsedMinutes": 30
  }
}
```

#### 5.3.3 Resume Timer

**Endpoint:**
```
POST /time-tracking/timer/resume
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم استئناف المؤقت",
  "timer": {
    "elapsedMinutes": 30,
    "pausedDuration": 0
  }
}
```

#### 5.3.4 Stop Timer

**Endpoint:**
```
POST /time-tracking/timer/stop
```

**Request Body:**
```json
{
  "notes": "اجتماع ناجح مع العميل",
  "isBillable": true
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "تم إيقاف المؤقت وإنشاء إدخال الوقت",
  "timeEntry": {
    "_id": "507f...",
    "entryId": "TIME-2025-0001",
    "description": "اجتماع مع العميل",
    "duration": 45,
    "hourlyRate": 400,
    "totalAmount": 300,
    "wasTimerBased": true,
    "status": "draft",
    "createdAt": "2025-11-23T10:45:00Z"
  }
}
```

**Notes:**
- Timer stops and creates a time entry
- Duration calculated from start time minus paused time
- Total amount = (duration / 60) * hourlyRate

#### 5.3.5 Get Timer Status

**Endpoint:**
```
GET /time-tracking/timer/status
```

**Success Response (200) - Running:**
```json
{
  "success": true,
  "isRunning": true,
  "timer": {
    "startedAt": "2025-11-23T10:00:00Z",
    "description": "اجتماع مع العميل",
    "caseId": "507f...",
    "activityCode": "client_meeting",
    "hourlyRate": 400,
    "isPaused": false,
    "pausedAt": null,
    "elapsedMinutes": 15,
    "pausedDuration": 0
  }
}
```

**Success Response (200) - Not Running:**
```json
{
  "success": true,
  "isRunning": false,
  "timer": null
}
```

#### 5.3.6 Create Manual Time Entry

**Endpoint:**
```
POST /time-tracking/entries
```

**Request Body:**
```json
{
  "caseId": "507f...",
  "clientId": "507f...",
  "date": "2025-11-23",
  "description": "مراجعة عقد",
  "duration": 120,
  "hourlyRate": 400,
  "activityCode": "document_preparation",
  "isBillable": true,
  "notes": "مراجعة عقد الإيجار"
}
```

**Validation Rules:**
- description: required, string, max 500 chars
- date: required, valid date
- duration: required, number, min 1 (minutes)
- hourlyRate: required, number, min 0

**Success Response (201):**
```json
{
  "success": true,
  "message": "تم إنشاء إدخال الوقت بنجاح",
  "timeEntry": {
    "_id": "507f...",
    "entryId": "TIME-2025-0002",
    "description": "مراجعة عقد",
    "duration": 120,
    "hourlyRate": 400,
    "totalAmount": 800,
    "wasTimerBased": false,
    "status": "draft"
  }
}
```

#### 5.3.7 Get Time Entries

**Endpoint:**
```
GET /time-tracking/entries
```

**Query Parameters:**
```
?status=approved
&caseId=507f...
&clientId=507f...
&startDate=2025-11-01
&endDate=2025-11-30
&isBillable=true
&activityCode=client_meeting
&page=1
&limit=50
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 120,
    "pages": 3
  },
  "summary": {
    "totalDuration": 4500,
    "totalAmount": 30000,
    "billableDuration": 4200,
    "billableAmount": 28000
  }
}
```

#### 5.3.8 Approve Time Entry

**Endpoint:**
```
POST /time-tracking/entries/:id/approve
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تمت الموافقة على إدخال الوقت بنجاح",
  "timeEntry": {
    "_id": "507f...",
    "status": "approved",
    "approvedBy": "507f...",
    "approvedAt": "2025-11-23T11:00:00Z"
  }
}
```

#### 5.3.9 Reject Time Entry

**Endpoint:**
```
POST /time-tracking/entries/:id/reject
```

**Request Body:**
```json
{
  "reason": "المدة غير دقيقة"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم رفض إدخال الوقت",
  "timeEntry": {
    "_id": "507f...",
    "status": "rejected",
    "rejectionReason": "المدة غير دقيقة"
  }
}
```

#### 5.3.10 Get Time Statistics

**Endpoint:**
```
GET /time-tracking/stats
```

**Query Parameters:**
```
?startDate=2025-11-01
&endDate=2025-11-30
&caseId=507f...
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "overall": {
      "totalEntries": 45,
      "totalDuration": 5400,
      "totalAmount": 36000,
      "billableDuration": 5100,
      "billableAmount": 34000,
      "avgHourlyRate": 400
    },
    "byActivity": [
      {
        "_id": "client_meeting",
        "count": 15,
        "totalDuration": 1800,
        "totalAmount": 12000
      }
    ],
    "byStatus": [
      {
        "_id": "approved",
        "count": 30,
        "totalAmount": 25000
      }
    ]
  }
}
```

#### 5.3.11 Bulk Delete Time Entries

**Endpoint:**
```
DELETE /time-tracking/entries/bulk
```

**Request Body:**
```json
{
  "entryIds": ["507f...", "507f...", "507f..."]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم حذف 3 إدخالات وقت بنجاح",
  "count": 3
}
```

**Notes:**
- Cannot delete invoiced entries
- Only owner can delete

---

### 5.4 Payments

#### Base Path: `/payments`

#### Data Model
```typescript
interface Payment {
  _id: string;
  paymentNumber: string;           // Auto-generated: PAY-2025-0001
  clientId: string;
  invoiceId?: string;
  caseId?: string;
  lawyerId: string;
  paymentDate: Date;
  amount: number;
  currency: string;                // Default: 'SAR'
  paymentMethod: 'credit_card' | 'debit_card' | 'bank_transfer' | 'cash' | 'check' | 'online_gateway';
  gatewayProvider?: 'stripe' | 'paypal' | 'hyperpay' | 'moyasar' | 'other';
  transactionId?: string;
  gatewayResponse?: any;
  checkNumber?: string;
  checkDate?: Date;
  bankName?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  allocations: Allocation[];
  isRefund: boolean;
  originalPaymentId?: string;
  refundReason?: string;
  refundDate?: Date;
  failureReason?: string;
  failureDate?: Date;
  retryCount: number;
  receiptUrl?: string;
  receiptSent: boolean;
  receiptSentAt?: Date;
  notes?: string;
  internalNotes?: string;
  createdBy: string;
  processedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Allocation {
  invoiceId: string;
  amount: number;
}
```

#### 5.4.1 Create Payment

**Endpoint:**
```
POST /payments
```

**Request Body:**
```json
{
  "clientId": "507f...",
  "invoiceId": "507f...",
  "caseId": "507f...",
  "amount": 1150,
  "currency": "SAR",
  "paymentMethod": "bank_transfer",
  "bankName": "البنك الأهلي",
  "transactionId": "TXN123456",
  "notes": "دفعة من العميل محمد"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "تم إنشاء الدفعة بنجاح",
  "payment": {
    "_id": "507f...",
    "paymentNumber": "PAY-2025-0001",
    "clientId": {...},
    "invoiceId": {...},
    "amount": 1150,
    "currency": "SAR",
    "paymentMethod": "bank_transfer",
    "status": "pending",
    "createdAt": "2025-11-23T10:00:00Z"
  }
}
```

#### 5.4.2 Get Payments

**Endpoint:**
```
GET /payments
```

**Query Parameters:**
```
?status=completed
&paymentMethod=bank_transfer
&clientId=507f...
&invoiceId=507f...
&startDate=2025-11-01
&endDate=2025-11-30
&page=1
&limit=50
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [...],
  "pagination": {...},
  "summary": [
    {
      "_id": "completed",
      "count": 25,
      "totalAmount": 125000
    }
  ]
}
```

#### 5.4.3 Complete Payment

**Endpoint:**
```
POST /payments/:id/complete
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم إكمال الدفعة بنجاح",
  "payment": {
    "_id": "507f...",
    "status": "completed",
    "processedBy": "507f..."
  }
}
```

**Notes:**
- Automatically updates linked invoice:
  - amountPaid increases
  - balanceDue decreases
  - Status changes to 'paid' if fully paid

#### 5.4.4 Mark Payment as Failed

**Endpoint:**
```
POST /payments/:id/fail
```

**Request Body:**
```json
{
  "reason": "رصيد غير كافٍ"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم تسجيل فشل الدفعة",
  "payment": {
    "_id": "507f...",
    "status": "failed",
    "failureReason": "رصيد غير كافٍ",
    "retryCount": 1
  }
}
```

#### 5.4.5 Create Refund

**Endpoint:**
```
POST /payments/:id/refund
```

**Request Body:**
```json
{
  "amount": 1150,
  "reason": "إلغاء الخدمة"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "تم إنشاء الاسترداد بنجاح",
  "refund": {
    "_id": "507f...",
    "paymentNumber": "PAY-2025-0002",
    "amount": -1150,
    "isRefund": true,
    "originalPaymentId": "507f...",
    "refundReason": "إلغاء الخدمة",
    "status": "completed"
  }
}
```

**Notes:**
- Creates new payment with negative amount
- Updates original payment status to 'refunded'
- Updates linked invoice if applicable

#### 5.4.6 Send Receipt

**Endpoint:**
```
POST /payments/:id/receipt
```

**Request Body:**
```json
{
  "email": "client@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم إرسال الإيصال إلى client@example.com",
  "payment": {
    "_id": "507f...",
    "receiptSent": true,
    "receiptSentAt": "2025-11-23T10:00:00Z"
  }
}
```

#### 5.4.7 Get Payment Statistics

**Endpoint:**
```
GET /payments/stats
```

**Query Parameters:**
```
?startDate=2025-11-01
&endDate=2025-11-30
&clientId=507f...
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "overall": {
      "totalPayments": 45,
      "totalAmount": 125000,
      "completedCount": 40,
      "completedAmount": 120000,
      "pendingCount": 3,
      "pendingAmount": 3500,
      "failedCount": 2,
      "refundedCount": 0
    },
    "byMethod": [
      {
        "_id": "bank_transfer",
        "count": 25,
        "totalAmount": 75000
      }
    ],
    "byGateway": [
      {
        "_id": "stripe",
        "count": 10,
        "totalAmount": 25000
      }
    ]
  }
}
```

#### 5.4.8 Bulk Delete Payments

**Endpoint:**
```
DELETE /payments/bulk
```

**Request Body:**
```json
{
  "paymentIds": ["507f...", "507f..."]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم حذف 2 دفعات بنجاح",
  "count": 2
}
```

**Notes:**
- Cannot delete completed or refunded payments

---

### 5.5 Retainers

#### Base Path: `/retainers`

#### Data Model
```typescript
interface Retainer {
  _id: string;
  retainerNumber: string;          // Auto-generated: RET-2025-0001
  clientId: string;
  lawyerId: string;
  caseId?: string;
  retainerType: 'advance' | 'evergreen' | 'flat_fee' | 'security';
  initialAmount: number;
  currentBalance: number;
  minimumBalance: number;
  startDate: Date;
  endDate?: Date;
  autoReplenish: boolean;
  replenishThreshold?: number;
  replenishAmount?: number;
  status: 'active' | 'depleted' | 'refunded' | 'expired';
  consumptions: Consumption[];
  deposits: Deposit[];
  lowBalanceAlertSent: boolean;
  lowBalanceAlertDate?: Date;
  agreementUrl?: string;
  agreementSignedDate?: Date;
  notes?: string;
  termsAndConditions?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Consumption {
  date: Date;
  amount: number;
  invoiceId?: string;
  description?: string;
}

interface Deposit {
  date: Date;
  amount: number;
  paymentId?: string;
}
```

#### 5.5.1 Create Retainer

**Endpoint:**
```
POST /retainers
```

**Request Body:**
```json
{
  "clientId": "507f...",
  "caseId": "507f...",
  "retainerType": "evergreen",
  "initialAmount": 10000,
  "minimumBalance": 2000,
  "autoReplenish": true,
  "replenishThreshold": 2000,
  "replenishAmount": 10000,
  "startDate": "2025-11-23",
  "agreementUrl": "https://cloudinary.com/agreements/...",
  "notes": "عربون متجدد تلقائياً"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "تم إنشاء العربون بنجاح",
  "retainer": {
    "_id": "507f...",
    "retainerNumber": "RET-2025-0001",
    "clientId": {...},
    "retainerType": "evergreen",
    "initialAmount": 10000,
    "currentBalance": 10000,
    "minimumBalance": 2000,
    "status": "active",
    "deposits": [
      {
        "date": "2025-11-23T10:00:00Z",
        "amount": 10000,
        "paymentId": null
      }
    ],
    "createdAt": "2025-11-23T10:00:00Z"
  }
}
```

#### 5.5.2 Consume from Retainer

**Endpoint:**
```
POST /retainers/:id/consume
```

**Request Body:**
```json
{
  "amount": 1500,
  "invoiceId": "507f...",
  "description": "رسوم استشارة قانونية"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم استهلاك المبلغ من العربون بنجاح",
  "retainer": {
    "_id": "507f...",
    "currentBalance": 8500,
    "consumptions": [
      {
        "date": "2025-11-23T10:30:00Z",
        "amount": 1500,
        "invoiceId": "507f...",
        "description": "رسوم استشارة قانونية"
      }
    ],
    "status": "active"
  },
  "lowBalanceAlert": false
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "مبلغ العربون غير كافٍ"
}
```

**Notes:**
- Checks if currentBalance >= amount
- Updates currentBalance
- Adds to consumptions array
- Returns lowBalanceAlert: true if currentBalance <= minimumBalance

#### 5.5.3 Replenish Retainer

**Endpoint:**
```
POST /retainers/:id/replenish
```

**Request Body:**
```json
{
  "amount": 10000,
  "paymentId": "507f..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم تجديد العربون بنجاح",
  "retainer": {
    "_id": "507f...",
    "currentBalance": 18500,
    "deposits": [
      {
        "date": "2025-11-23T11:00:00Z",
        "amount": 10000,
        "paymentId": "507f..."
      }
    ],
    "status": "active",
    "lowBalanceAlertSent": false
  }
}
```

#### 5.5.4 Refund Retainer

**Endpoint:**
```
POST /retainers/:id/refund
```

**Request Body:**
```json
{
  "reason": "إنهاء التعاقد"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم استرداد العربون بنجاح",
  "retainer": {
    "_id": "507f...",
    "status": "refunded",
    "currentBalance": 0
  },
  "refundAmount": 8500
}
```

#### 5.5.5 Get Retainer History

**Endpoint:**
```
GET /retainers/:id/history
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "retainerNumber": "RET-2025-0001",
    "currentBalance": 8500,
    "initialAmount": 10000,
    "history": [
      {
        "type": "deposit",
        "date": "2025-11-23T10:00:00Z",
        "amount": 10000,
        "paymentId": null
      },
      {
        "type": "consumption",
        "date": "2025-11-23T10:30:00Z",
        "amount": -1500,
        "invoiceId": "507f...",
        "description": "رسوم استشارة"
      }
    ]
  }
}
```

#### 5.5.6 Get Low Balance Retainers

**Endpoint:**
```
GET /retainers/low-balance
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f...",
      "retainerNumber": "RET-2025-0001",
      "clientId": {...},
      "currentBalance": 1800,
      "minimumBalance": 2000,
      "autoReplenish": true
    }
  ],
  "count": 3
}
```

#### 5.5.7 Get Retainer Statistics

**Endpoint:**
```
GET /retainers/stats
```

**Query Parameters:**
```
?clientId=507f...
&startDate=2025-11-01
&endDate=2025-11-30
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "byStatus": [
      {
        "_id": "active",
        "count": 12,
        "totalInitialAmount": 120000,
        "totalCurrentBalance": 85000
      }
    ],
    "needingReplenishment": 3,
    "lowBalanceAlerts": 5
  }
}
```

---

### 5.6 Billing Rates

#### Base Path: `/billing-rates`

#### Data Model
```typescript
interface BillingRate {
  _id: string;
  lawyerId: string;
  rateType: 'standard' | 'custom_client' | 'custom_case_type' | 'activity_based';
  standardHourlyRate?: number;
  customRate?: number;
  clientId?: string;              // For custom_client type
  caseType?: string;              // For custom_case_type type
  activityCode?: string;          // For activity_based type
  currency: string;               // Default: 'SAR'
  effectiveFrom?: Date;
  effectiveTo?: Date;
  isActive: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Rate Priority Hierarchy:**
1. Custom Client Rate (highest priority)
2. Custom Case Type Rate
3. Activity-Based Rate
4. Standard Rate (lowest priority/fallback)

#### 5.6.1 Create Billing Rate

**Endpoint:**
```
POST /billing-rates
```

**Request Body:**
```json
{
  "rateType": "custom_client",
  "customRate": 500,
  "clientId": "507f...",
  "currency": "SAR",
  "description": "سعر خاص للعميل المتميز"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "تم إنشاء سعر الفوترة بنجاح",
  "billingRate": {
    "_id": "507f...",
    "lawyerId": "507f...",
    "rateType": "custom_client",
    "customRate": 500,
    "clientId": "507f...",
    "currency": "SAR",
    "isActive": true,
    "createdAt": "2025-11-23T10:00:00Z"
  }
}
```

#### 5.6.2 Set Standard Rate (Quick Setup)

**Endpoint:**
```
POST /billing-rates/standard
```

**Request Body:**
```json
{
  "standardHourlyRate": 300,
  "currency": "SAR"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم تحديث سعر الساعة القياسي بنجاح",
  "billingRate": {
    "_id": "507f...",
    "rateType": "standard",
    "standardHourlyRate": 300,
    "currency": "SAR"
  }
}
```

#### 5.6.3 Get All Billing Rates

**Endpoint:**
```
GET /billing-rates
```

**Query Parameters:**
```
?rateType=custom_client
&clientId=507f...
&isActive=true
&page=1
&limit=20
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f...",
      "rateType": "standard",
      "standardHourlyRate": 300,
      "isActive": true
    },
    {
      "_id": "507f...",
      "rateType": "custom_client",
      "customRate": 500,
      "clientId": {...},
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

#### 5.6.4 Get Applicable Rate

**Endpoint:**
```
GET /billing-rates/applicable
```

**Query Parameters:**
```
?clientId=507f...
&caseType=civil
&activityCode=consultation
```

**Success Response (200):**
```json
{
  "success": true,
  "hourlyRate": 500,
  "rateType": "custom_client",
  "billingRate": {
    "_id": "507f...",
    "customRate": 500,
    "clientId": "507f..."
  }
}
```

#### 5.6.5 Update Billing Rate

**Endpoint:**
```
PUT /billing-rates/:id
```

**Request Body:**
```json
{
  "customRate": 550,
  "isActive": true
}
```

#### 5.6.6 Delete Billing Rate

**Endpoint:**
```
DELETE /billing-rates/:id
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم حذف سعر الفوترة بنجاح"
}
```

---

### 5.7 Statements

#### Base Path: `/statements`

#### Data Model
```typescript
interface Statement {
  _id: string;
  statementNumber: string;        // Auto-generated: STMT-202511-0001
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  type: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    invoicesCount: number;
    paidInvoices: number;
    pendingInvoices: number;
    expensesCount: number;
  };
  invoices: string[];             // Array of Invoice IDs
  expenses: string[];             // Array of Expense IDs
  transactions: string[];         // Array of Transaction IDs
  status: 'draft' | 'generated' | 'sent' | 'archived';
  generatedAt?: Date;
  generatedBy: string;
  notes?: string;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 5.7.1 Generate Statement

**Endpoint:**
```
POST /statements/generate
```

**Request Body:**
```json
{
  "periodStart": "2025-11-01",
  "periodEnd": "2025-11-30",
  "type": "monthly",
  "notes": "كشف حساب شهر نوفمبر"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "تم إنشاء الكشف بنجاح",
  "statement": {
    "_id": "507f...",
    "statementNumber": "STMT-202511-0001",
    "periodStart": "2025-11-01T00:00:00Z",
    "periodEnd": "2025-11-30T23:59:59Z",
    "type": "monthly",
    "summary": {
      "totalIncome": 25000,
      "totalExpenses": 8000,
      "netIncome": 17000,
      "invoicesCount": 10,
      "paidInvoices": 8,
      "pendingInvoices": 2,
      "expensesCount": 15
    },
    "status": "generated",
    "generatedAt": "2025-11-23T10:00:00Z"
  }
}
```

#### 5.7.2 Get All Statements

**Endpoint:**
```
GET /statements
```

**Query Parameters:**
```
?status=generated
&type=monthly
&startDate=2025-01-01
&endDate=2025-12-31
&page=1
&limit=20
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f...",
      "statementNumber": "STMT-202511-0001",
      "periodStart": "2025-11-01",
      "periodEnd": "2025-11-30",
      "summary": {
        "totalIncome": 25000,
        "totalExpenses": 8000,
        "netIncome": 17000
      },
      "status": "generated"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "pages": 1
  }
}
```

#### 5.7.3 Get Single Statement

**Endpoint:**
```
GET /statements/:id
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "507f...",
    "statementNumber": "STMT-202511-0001",
    "summary": {...},
    "invoices": [
      {
        "invoiceNumber": "INV-2025-0001",
        "totalAmount": 5000,
        "status": "paid"
      }
    ],
    "expenses": [
      {
        "description": "إيجار المكتب",
        "amount": 3000,
        "category": "rent"
      }
    ],
    "transactions": [...]
  }
}
```

#### 5.7.4 Delete Statement

**Endpoint:**
```
DELETE /statements/:id
```

#### 5.7.5 Send Statement

**Endpoint:**
```
POST /statements/:id/send
```

**Request Body:**
```json
{
  "email": "client@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم إرسال الكشف إلى client@example.com",
  "statement": {
    "_id": "507f...",
    "status": "sent"
  }
}
```

---

### 5.8 Transactions

#### Base Path: `/transactions`

#### Data Model
```typescript
interface Transaction {
  _id: string;
  transactionId: string;          // Auto-generated: TXN-202511-12345
  userId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category: string;
  description: string;
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'check';
  invoiceId?: string;
  expenseId?: string;
  caseId?: string;
  referenceNumber?: string;
  date: Date;
  status: 'completed' | 'pending' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 5.8.1 Create Transaction

**Endpoint:**
```
POST /transactions
```

**Request Body:**
```json
{
  "type": "income",
  "amount": 5000,
  "category": "legal_fees",
  "description": "رسوم استشارة قانونية",
  "paymentMethod": "transfer",
  "caseId": "507f...",
  "date": "2025-11-23",
  "notes": "دفعة من العميل أحمد"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "تم إنشاء المعاملة بنجاح",
  "transaction": {
    "_id": "507f...",
    "transactionId": "TXN-202511-00001",
    "type": "income",
    "amount": 5000,
    "category": "legal_fees",
    "status": "completed",
    "createdAt": "2025-11-23T10:00:00Z"
  }
}
```

#### 5.8.2 Get All Transactions

**Endpoint:**
```
GET /transactions
```

**Query Parameters:**
```
?type=income
&category=legal_fees
&status=completed
&startDate=2025-11-01
&endDate=2025-11-30
&minAmount=1000
&maxAmount=10000
&search=استشارة
&page=1
&limit=20
&sortBy=date
&sortOrder=desc
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f...",
      "transactionId": "TXN-202511-00001",
      "type": "income",
      "amount": 5000,
      "category": "legal_fees",
      "description": "رسوم استشارة قانونية",
      "date": "2025-11-23",
      "status": "completed"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

#### 5.8.3 Get Account Balance

**Endpoint:**
```
GET /transactions/balance
```

**Query Parameters:**
```
?upToDate=2025-11-23
```

**Success Response (200):**
```json
{
  "success": true,
  "balance": 45000,
  "asOfDate": "2025-11-23T23:59:59Z"
}
```

**Note:** Uses the Transaction.calculateBalance() static method.

#### 5.8.4 Get Transaction Summary

**Endpoint:**
```
GET /transactions/summary
```

**Query Parameters:**
```
?startDate=2025-11-01
&endDate=2025-11-30
&type=income
&category=legal_fees
&caseId=507f...
```

**Success Response (200):**
```json
{
  "success": true,
  "summary": {
    "totalIncome": 25000,
    "totalExpenses": 8000,
    "netIncome": 17000,
    "transactionCount": 45,
    "averageTransaction": 733.33
  }
}
```

**Note:** Uses the Transaction.getSummary() static method.

#### 5.8.5 Get Transactions by Category

**Endpoint:**
```
GET /transactions/by-category
```

**Query Parameters:**
```
?startDate=2025-11-01
&endDate=2025-11-30
&type=expense
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "rent",
      "total": 3000,
      "count": 1,
      "avgAmount": 3000
    },
    {
      "_id": "office_supplies",
      "total": 1500,
      "count": 5,
      "avgAmount": 300
    }
  ]
}
```

#### 5.8.6 Update Transaction

**Endpoint:**
```
PUT /transactions/:id
```

#### 5.8.7 Cancel Transaction

**Endpoint:**
```
POST /transactions/:id/cancel
```

**Request Body:**
```json
{
  "reason": "خطأ في المبلغ"
}
```

#### 5.8.8 Delete Transaction

**Endpoint:**
```
DELETE /transactions/:id
```

#### 5.8.9 Bulk Delete Transactions

**Endpoint:**
```
DELETE /transactions/bulk
```

**Request Body:**
```json
{
  "transactionIds": ["507f...", "507f...", "507f..."]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم حذف 3 معاملة بنجاح",
  "deletedCount": 3
}
```

---

### 5.9 Reports

#### Base Path: `/reports`

#### Data Model
```typescript
interface Report {
  _id: string;
  reportName: string;
  reportType: 'revenue' | 'aging' | 'realization' | 'collections' | 'productivity' |
              'profitability' | 'time_utilization' | 'tax' | 'custom';
  startDate?: Date;
  endDate?: Date;
  filters: any;                   // Dynamic filters based on report type
  createdBy: string;
  isPublic: boolean;
  isScheduled: boolean;
  scheduleFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  lastRun?: Date;
  nextRun?: Date;
  outputFormat: 'pdf' | 'excel' | 'csv';
  outputUrl?: string;
  emailRecipients: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### 5.9.1 Get Report Templates

**Endpoint:**
```
GET /reports/templates
```

**Success Response (200):**
```json
{
  "success": true,
  "templates": [
    {
      "type": "revenue",
      "name": "تقرير الإيرادات",
      "description": "تحليل شامل للإيرادات حسب الفترة الزمنية",
      "requiredFields": ["startDate", "endDate"],
      "optionalFields": ["clientId", "caseId"]
    },
    {
      "type": "aging",
      "name": "تقرير الفواتير المتأخرة",
      "description": "تحليل الفواتير غير المدفوعة حسب فترات التأخير",
      "requiredFields": [],
      "optionalFields": ["clientId"]
    },
    {
      "type": "tax",
      "name": "تقرير الضرائب",
      "description": "تقرير ضريبة القيمة المضافة (15%)",
      "requiredFields": ["startDate", "endDate"],
      "optionalFields": []
    }
  ]
}
```

#### 5.9.2 Generate Report

**Endpoint:**
```
POST /reports/generate
```

**Request Body (Revenue Report Example):**
```json
{
  "reportName": "تقرير إيرادات نوفمبر",
  "reportType": "revenue",
  "startDate": "2025-11-01",
  "endDate": "2025-11-30",
  "filters": {
    "clientId": "507f..."
  },
  "outputFormat": "pdf",
  "emailRecipients": ["admin@traf3li.com"]
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "تم إنشاء التقرير بنجاح",
  "report": {
    "_id": "507f...",
    "reportName": "تقرير إيرادات نوفمبر",
    "reportType": "revenue",
    "status": "generated",
    "lastRun": "2025-11-23T10:00:00Z"
  },
  "data": {
    "summary": {
      "totalRevenue": 25000,
      "totalCollected": 20000,
      "totalOutstanding": 5000,
      "invoiceCount": 10
    },
    "byStatus": {
      "paid": 8,
      "partial": 1,
      "sent": 1
    },
    "invoices": [...]
  }
}
```

**Report Types Available:**

1. **Revenue Report** - Total revenue analysis
2. **Aging Report** - Overdue invoices by aging periods (30/60/90+ days)
3. **Collections Report** - Payment collections by method
4. **Productivity Report** - Time tracking and billable hours
5. **Profitability Report** - Net profit = Revenue - Expenses
6. **Time Utilization Report** - Billable vs non-billable hours
7. **Tax Report** - Saudi VAT 15% calculations

#### 5.9.3 Get All Reports

**Endpoint:**
```
GET /reports
```

**Query Parameters:**
```
?reportType=revenue
&isScheduled=true
&page=1
&limit=20
```

#### 5.9.4 Get Single Report

**Endpoint:**
```
GET /reports/:id
```

#### 5.9.5 Delete Report

**Endpoint:**
```
DELETE /reports/:id
```

#### 5.9.6 Schedule Report

**Endpoint:**
```
POST /reports/:id/schedule
```

**Request Body:**
```json
{
  "scheduleFrequency": "monthly",
  "emailRecipients": ["admin@traf3li.com", "accountant@traf3li.com"]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم جدولة التقرير بنجاح",
  "report": {
    "_id": "507f...",
    "isScheduled": true,
    "scheduleFrequency": "monthly",
    "nextRun": "2025-12-23T10:00:00Z"
  }
}
```

#### 5.9.7 Unschedule Report

**Endpoint:**
```
DELETE /reports/:id/schedule
```

---

## 6. Tasks System

### Base Path: `/tasks`

### Data Model
```typescript
interface Task {
  _id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'backlog' | 'todo' | 'in progress' | 'done' | 'canceled';
  label?: 'bug' | 'feature' | 'documentation' | 'enhancement' | 'question';
  dueDate?: Date;
  assignedTo: string;
  createdBy: string;
  caseId?: string;
  clientId?: string;
  recurring?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
  };
  tags?: string[];
  notes?: string;
  subtasks: Subtask[];
  attachments: Attachment[];
  comments: Comment[];
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface Subtask {
  title: string;
  completed: boolean;
}

interface Attachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedBy: string;
  uploadedAt: Date;
}

interface Comment {
  userId: string;
  text: string;
  createdAt: Date;
}
```

### 6.1 Create Task

**Endpoint:**
```
POST /tasks
```

**Auth Required:** Yes (Role: lawyer)

**Request Body:**
```json
{
  "title": "مراجعة عقد العميل",
  "description": "مراجعة وتدقيق عقد الإيجار",
  "priority": "high",
  "status": "todo",
  "label": "documentation",
  "dueDate": "2025-11-30",
  "assignedTo": "507f...",
  "caseId": "507f...",
  "tags": ["عقود", "مراجعة"],
  "subtasks": [
    {
      "title": "قراءة العقد",
      "completed": false
    },
    {
      "title": "كتابة التعديلات",
      "completed": false
    }
  ]
}
```

**Validation Rules:**
- title: required, string, max 200 chars
- priority: optional, valid enum value, default 'medium'
- status: optional, valid enum value, default 'todo'
- assignedTo: required, valid ObjectId
- dueDate: optional, valid date

**Success Response (201):**
```json
{
  "error": false,
  "message": "Task created successfully!",
  "task": {
    "_id": "507f...",
    "title": "مراجعة عقد العميل",
    "priority": "high",
    "status": "todo",
    "dueDate": "2025-11-30T00:00:00Z",
    "assignedTo": {
      "_id": "507f...",
      "username": "محمد المحامي",
      "image": "https://..."
    },
    "createdBy": {...},
    "caseId": {...},
    "subtasks": [...],
    "createdAt": "2025-11-23T10:00:00Z"
  }
}
```

**Notes:**
- Automatically syncs to calendar (creates event)
- Sends notification to assignedTo user

### 6.2 Get Tasks

**Endpoint:**
```
GET /tasks
```

**Query Parameters:**
```
?status=todo                     // Filter by status
&priority=high                   // Filter by priority
&assignedTo=507f...              // Filter by assigned user
&caseId=507f...                  // Filter by case
&overdue=true                    // Get overdue tasks only
```

**Success Response (200):**
```json
{
  "error": false,
  "tasks": [...],
  "total": 25
}
```

### 6.3 Get Upcoming Tasks

**Endpoint:**
```
GET /tasks/upcoming
```

**Success Response (200):**
```json
{
  "error": false,
  "tasks": [...],
  "total": 8
}
```

**Notes:**
- Returns tasks due in next 7 days
- Excludes completed tasks

### 6.4 Get Overdue Tasks

**Endpoint:**
```
GET /tasks/overdue
```

**Success Response (200):**
```json
{
  "error": false,
  "tasks": [...],
  "total": 3
}
```

### 6.5 Mark Task as Complete

**Endpoint:**
```
POST /tasks/:id/complete
```

**Success Response (202):**
```json
{
  "error": false,
  "message": "Task completed successfully!",
  "task": {
    "_id": "507f...",
    "status": "done",
    "completedAt": "2025-11-23T11:00:00Z"
  }
}
```

**Notes:**
- If task is recurring, creates next occurrence
- Updates calendar event status

### 6.6 Upload Attachment

**Endpoint:**
```
POST /tasks/:id/attachments
```

**Content-Type:** `multipart/form-data`

**Request Body:**
```
file: [File]
```

**Success Response (200):**
```json
{
  "error": false,
  "message": "Attachment uploaded successfully",
  "attachment": {
    "fileName": "contract.pdf",
    "fileUrl": "https://cloudinary.com/...",
    "fileType": "application/pdf",
    "uploadedBy": "507f...",
    "uploadedAt": "2025-11-23T10:00:00Z"
  }
}
```

### 6.7 Import Tasks from CSV

**Endpoint:**
```
POST /tasks/import
```

**Content-Type:** `multipart/form-data`

**Request Body:**
```
file: [CSV File]
```

**CSV Format:**
```csv
title,description,priority,dueDate,assignedTo,caseId
"مراجعة عقد","مراجعة عقد الإيجار",high,2025-11-30,507f...,507f...
```

**Success Response (200):**
```json
{
  "error": false,
  "message": "Tasks imported successfully",
  "imported": 45,
  "failed": 2,
  "errors": [
    {
      "row": 12,
      "message": "Invalid date format"
    }
  ]
}
```

---

## 7. Reminders System

### Base Path: `/reminders`

### Data Model
```typescript
interface Reminder {
  _id: string;
  title: string;
  description?: string;
  userId: string;
  reminderDate: Date;
  reminderTime: string;            // "09:00"
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'task' | 'hearing' | 'deadline' | 'meeting' | 'payment' | 'general';
  relatedCase?: string;
  relatedTask?: string;
  relatedEvent?: string;
  status: 'pending' | 'completed' | 'dismissed';
  notificationSent: boolean;
  notificationSentAt?: Date;
  recurring?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    endDate?: Date;
  };
  completedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 7.1 Create Reminder

**Endpoint:**
```
POST /reminders
```

**Request Body:**
```json
{
  "title": "موعد جلسة محكمة",
  "description": "جلسة القضية رقم 123",
  "reminderDate": "2025-11-25",
  "reminderTime": "09:00",
  "priority": "urgent",
  "type": "hearing",
  "relatedCase": "507f...",
  "recurring": {
    "enabled": false
  },
  "notes": "لا تنسى الملفات"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "تم إنشاء التذكير بنجاح",
  "reminder": {
    "_id": "507f...",
    "title": "موعد جلسة محكمة",
    "reminderDate": "2025-11-25T00:00:00Z",
    "reminderTime": "09:00",
    "priority": "urgent",
    "type": "hearing",
    "status": "pending",
    "notificationSent": false,
    "createdAt": "2025-11-23T10:00:00Z"
  }
}
```

### 7.2 Get Reminders

**Endpoint:**
```
GET /reminders
```

**Query Parameters:**
```
?status=pending
&priority=urgent
&type=hearing
&relatedCase=507f...
&startDate=2025-11-01
&endDate=2025-11-30
&page=1
&limit=50
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [...],
  "pagination": {...}
}
```

### 7.3 Get Upcoming Reminders

**Endpoint:**
```
GET /reminders/upcoming
```

**Query Parameters:**
```
?days=7    // Optional, default: 7
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [...],
  "count": 5
}
```

### 7.4 Get Overdue Reminders

**Endpoint:**
```
GET /reminders/overdue
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [...],
  "count": 2
}
```

### 7.5 Mark Reminder as Completed

**Endpoint:**
```
POST /reminders/:id/complete
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم إكمال التذكير بنجاح",
  "reminder": {
    "_id": "507f...",
    "status": "completed",
    "completedAt": "2025-11-23T10:00:00Z"
  }
}
```

**Notes:**
- If recurring, creates next occurrence

### 7.6 Dismiss Reminder

**Endpoint:**
```
POST /reminders/:id/dismiss
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم تجاهل التذكير",
  "reminder": {
    "_id": "507f...",
    "status": "dismissed"
  }
}
```

### 7.7 Bulk Delete Reminders

**Endpoint:**
```
DELETE /reminders/bulk
```

**Request Body:**
```json
{
  "reminderIds": ["507f...", "507f..."]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم حذف 2 تذكيرات بنجاح",
  "count": 2
}
```

---

## 8. Events System

### Base Path: `/events`

### Data Model
```typescript
interface Event {
  _id: string;
  title: string;
  type: 'hearing' | 'meeting' | 'deadline' | 'task' | 'other';
  description?: string;
  startDate: Date;
  endDate?: Date;
  allDay: boolean;
  location?: string;
  caseId?: string;
  taskId?: string;
  attendees: string[];
  reminders: EventReminder[];
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  color: string;
  createdBy: string;
  recurrence?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    endDate?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface EventReminder {
  type: 'notification' | 'email' | 'sms';
  time: Date;
  sent: boolean;
}
```

### 8.1 Create Event

**Endpoint:**
```
POST /events
```

**Request Body:**
```json
{
  "title": "اجتماع مع العميل",
  "type": "meeting",
  "description": "مناقشة تفاصيل القضية",
  "startDate": "2025-11-25T10:00:00Z",
  "endDate": "2025-11-25T11:00:00Z",
  "allDay": false,
  "location": "مكتب المحاماة",
  "caseId": "507f...",
  "attendees": ["507f..."],
  "reminders": [
    {
      "type": "notification",
      "time": "2025-11-25T09:00:00Z",
      "sent": false
    }
  ],
  "color": "#3b82f6"
}
```

**Success Response (201):**
```json
{
  "_id": "507f...",
  "title": "اجتماع مع العميل",
  "type": "meeting",
  "startDate": "2025-11-25T10:00:00Z",
  "endDate": "2025-11-25T11:00:00Z",
  "status": "scheduled",
  "createdAt": "2025-11-23T10:00:00Z"
}
```

**Notes:**
- If no reminders provided, creates default reminders (1 day before, 1 hour before)

### 8.2 Get Events

**Endpoint:**
```
GET /events
```

**Query Parameters:**
```
?startDate=2025-11-01
&endDate=2025-11-30
&type=hearing
&caseId=507f...
&status=scheduled
```

**Success Response (200):**
```json
{
  "events": [...],
  "tasks": [...]
}
```

**Notes:**
- Also returns tasks with due dates in the range

### 8.3 Mark Event as Completed

**Endpoint:**
```
POST /events/:id/complete
```

**Success Response (200):**
```json
{
  "_id": "507f...",
  "status": "completed"
}
```

---

## 9. Clients Management

### Base Path: `/clients`

### Data Model
```typescript
interface Client {
  _id: string;
  clientId: string;                // Auto-generated: CLT-2025-0001
  lawyerId: string;
  fullName: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  nationalId?: string;
  companyName?: string;
  companyRegistration?: string;
  address?: string;
  city?: string;
  country: string;                 // Default: 'Saudi Arabia'
  notes?: string;
  preferredContactMethod: 'email' | 'phone' | 'sms' | 'whatsapp';
  language: string;                // Default: 'ar'
  status: 'active' | 'inactive' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}
```

### 9.1 Create Client

**Endpoint:**
```
POST /clients
```

**Request Body:**
```json
{
  "fullName": "محمد أحمد",
  "email": "mohamed@example.com",
  "phone": "+966501234567",
  "nationalId": "1234567890",
  "address": "الرياض، حي النخيل",
  "city": "الرياض",
  "country": "Saudi Arabia",
  "preferredContactMethod": "email",
  "notes": "عميل مهم"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "تم إنشاء العميل بنجاح",
  "client": {
    "_id": "507f...",
    "clientId": "CLT-2025-0001",
    "fullName": "محمد أحمد",
    "email": "mohamed@example.com",
    "phone": "+966501234567",
    "status": "active",
    "createdAt": "2025-11-23T10:00:00Z"
  }
}
```

### 9.2 Get Clients

**Endpoint:**
```
GET /clients
```

**Query Parameters:**
```
?status=active
&search=محمد                    // Search by name, email, phone, clientId
&city=الرياض
&country=Saudi Arabia
&page=1
&limit=50
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [...],
  "pagination": {...}
}
```

### 9.3 Get Single Client (with Related Data)

**Endpoint:**
```
GET /clients/:id
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "client": {
      "_id": "507f...",
      "clientId": "CLT-2025-0001",
      "fullName": "محمد أحمد",
      "email": "mohamed@example.com",
      "phone": "+966501234567"
    },
    "relatedData": {
      "cases": [...],             // Last 10 cases
      "invoices": [...],          // Last 10 invoices
      "payments": [...]           // Last 10 payments
    },
    "summary": {
      "totalCases": 15,
      "totalInvoices": 25,
      "totalInvoiced": 125000,
      "totalPaid": 100000,
      "outstandingBalance": 25000
    }
  }
}
```

### 9.4 Search Clients

**Endpoint:**
```
GET /clients/search
```

**Query Parameters:**
```
?q=محمد    // Minimum 2 characters
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f...",
      "clientId": "CLT-2025-0001",
      "fullName": "محمد أحمد",
      "email": "mohamed@example.com",
      "phone": "+966501234567"
    }
  ],
  "count": 3
}
```

### 9.5 Get Client Statistics

**Endpoint:**
```
GET /clients/stats
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalClients": 150,
    "byStatus": [
      { "_id": "active", "count": 120 },
      { "_id": "inactive", "count": 25 },
      { "_id": "archived", "count": 5 }
    ],
    "byCity": [
      { "_id": "الرياض", "count": 80 },
      { "_id": "جدة", "count": 40 }
    ],
    "byCountry": [
      { "_id": "Saudi Arabia", "count": 150 }
    ]
  }
}
```

### 9.6 Get Top Clients by Revenue

**Endpoint:**
```
GET /clients/top-revenue
```

**Query Parameters:**
```
?limit=10    // Default: 10
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "clientId": "507f...",
      "clientName": "محمد أحمد",
      "clientEmail": "mohamed@example.com",
      "totalRevenue": 50000,
      "invoiceCount": 15
    }
  ]
}
```

### 9.7 Bulk Delete Clients

**Endpoint:**
```
DELETE /clients/bulk
```

**Request Body:**
```json
{
  "clientIds": ["507f...", "507f..."]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم حذف 2 عملاء بنجاح",
  "count": 2
}
```

**Notes:**
- Cannot delete clients with active cases
- Cannot delete clients with unpaid invoices

---

## 10. Cases (Reference Data)

### Base Path: `/cases`

### Get Cases for Dropdowns

**Endpoint:**
```
GET /cases
```

**Query Parameters:**
```
?select=_id,caseNumber,title     // Only return specific fields
&status=active                    // Filter by status
&limit=100
```

**Success Response (200):**
```json
{
  "error": false,
  "cases": [
    {
      "_id": "507f...",
      "caseNumber": "C-2025-001",
      "title": "قضية عقد إيجار"
    }
  ],
  "total": 25
}
```

---

## 11. Users (Reference Data)

### Base Path: `/users`

### Get Users for Dropdowns

**Endpoint:**
```
GET /users
```

**Query Parameters:**
```
?role=lawyer                      // Filter by role
&select=_id,username,image        // Only return specific fields
```

**Success Response (200):**
```json
{
  "users": [
    {
      "_id": "507f...",
      "username": "أحمد المحامي",
      "image": "https://cloudinary.com/avatars/..."
    }
  ]
}
```

---

## 12. Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": true,
  "message": "فشلت العملية",
  "errors": [
    {
      "field": "email",
      "message": "البريد الإلكتروني مطلوب"
    }
  ]
}
```

### Common Errors

**400 - Bad Request (Validation Error):**
```json
{
  "success": false,
  "error": true,
  "message": "بيانات غير صالحة",
  "errors": [
    {
      "field": "amount",
      "message": "Amount must be greater than 0"
    }
  ]
}
```

**401 - Unauthorized:**
```json
{
  "success": false,
  "error": true,
  "message": "يجب تسجيل الدخول أولاً"
}
```

**403 - Forbidden:**
```json
{
  "success": false,
  "error": true,
  "message": "ليس لديك صلاحية للوصول"
}
```

**404 - Not Found:**
```json
{
  "success": false,
  "error": true,
  "message": "العنصر غير موجود"
}
```

**500 - Server Error:**
```json
{
  "success": false,
  "error": true,
  "message": "حدث خطأ في الخادم"
}
```

---

## 13. File Uploads

### General Information

- **Max File Size:** 10 MB
- **Storage:** Cloudinary
- **Accepted Image Types:** image/jpeg, image/png, image/jpg, image/gif
- **Accepted Document Types:** application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
- **Accepted CSV Types:** text/csv

### Upload Endpoints

All file uploads use `Content-Type: multipart/form-data`

**Receipt Upload:**
```
POST /expenses/:id/receipt
Body: { file: [File] }
```

**Task Attachment:**
```
POST /tasks/:id/attachments
Body: { file: [File] }
```

**CSV Import:**
```
POST /tasks/import
Body: { file: [CSV File] }
```

### Upload Response

```json
{
  "success": true,
  "message": "تم رفع الملف بنجاح",
  "file": {
    "fileName": "document.pdf",
    "fileUrl": "https://cloudinary.com/...",
    "fileType": "application/pdf",
    "size": 1234567,
    "uploadedAt": "2025-11-23T10:00:00Z"
  }
}
```

---

## 📞 Support & Questions

For API support or questions, please contact:
- **Email:** support@traf3li.com
- **Documentation:** https://docs.traf3li.com

---

**End of API Specification Document**
