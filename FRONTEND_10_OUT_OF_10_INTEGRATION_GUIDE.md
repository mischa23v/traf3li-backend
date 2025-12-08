# TRAF3LI Frontend Integration Guide - 10/10 Features

## Overview

This guide provides comprehensive API documentation for all new features implemented to achieve 10/10 scores across all modules.

---

## Table of Contents

1. [HR Module (9.5 → 10/10)](#hr-module)
   - [Biometric Attendance](#biometric-attendance)
   - [Geo-Fencing](#geo-fencing)
   - [HR Analytics](#hr-analytics)
   - [AI Predictions](#ai-predictions)

2. [Finance Module (9.0 → 10/10)](#finance-module)
   - [Bank Reconciliation](#bank-reconciliation)
   - [Multi-Currency](#multi-currency)

3. [CRM Module (8.5 → 10/10)](#crm-module)
   - [Email Marketing](#email-marketing)
   - [AI Lead Scoring](#ai-lead-scoring)
   - [WhatsApp Integration](#whatsapp-integration)

4. [Tasks Module (9.5 → 10/10)](#tasks-module)
   - [Gantt Charts](#gantt-charts)
   - [Real-time Collaboration](#real-time-collaboration)

5. [Socket.io Events](#socketio-events)

6. [TypeScript Interfaces](#typescript-interfaces)

---

## HR Module

### Biometric Attendance

Base URL: `/api/biometric`

#### Device Management

```typescript
// Register a biometric device
POST /api/biometric/devices
{
  "deviceId": "ZK-001",
  "deviceName": "Main Entrance Scanner",
  "deviceType": "facial", // fingerprint, facial, card_reader, iris, palm, multi_modal
  "manufacturer": "zkteco", // zkteco, suprema, hikvision, dahua, generic
  "connection": {
    "type": "tcp",
    "ipAddress": "192.168.1.100",
    "port": 4370
  },
  "location": {
    "name": "Main Office",
    "coordinates": {
      "latitude": 24.7136,
      "longitude": 46.6753
    },
    "geofenceRadius": 100
  },
  "capabilities": {
    "fingerprint": true,
    "facial": true,
    "card": true,
    "pin": true,
    "antiSpoofing": true
  }
}

// Response
{
  "success": true,
  "data": {
    "_id": "...",
    "deviceId": "ZK-001",
    "status": "offline",
    ...
  }
}

// List all devices
GET /api/biometric/devices

// Get device by ID
GET /api/biometric/devices/:id

// Update device
PUT /api/biometric/devices/:id

// Delete device
DELETE /api/biometric/devices/:id

// Update device heartbeat
POST /api/biometric/devices/:id/heartbeat

// Sync device
POST /api/biometric/devices/:id/sync
```

#### Employee Enrollment

```typescript
// Enroll employee
POST /api/biometric/enrollments
{
  "employeeId": "64a1234567890abcdef12345",
  "facial": {
    "photo": "https://s3.amazonaws.com/photo.jpg",
    "template": "base64_encoded_template...",
    "quality": 95
  },
  "card": {
    "cardNumber": "123456789",
    "cardType": "rfid"
  }
}

// List enrollments
GET /api/biometric/enrollments

// Get enrollment by ID
GET /api/biometric/enrollments/:id

// Get enrollment by employee
GET /api/biometric/enrollments/employee/:employeeId

// Add fingerprint
POST /api/biometric/enrollments/:id/fingerprint
{
  "finger": "index_r", // thumb_r, index_r, middle_r, ring_r, pinky_r, thumb_l, etc.
  "template": "base64_template...",
  "quality": 85
}

// Enroll facial
POST /api/biometric/enrollments/:id/facial

// Issue card
POST /api/biometric/enrollments/:id/card

// Set PIN
POST /api/biometric/enrollments/:id/pin
{
  "pin": "1234"
}

// Revoke enrollment
POST /api/biometric/enrollments/:id/revoke

// Get enrollment statistics
GET /api/biometric/enrollments/stats
```

#### Verification & Identification

```typescript
// Verify identity (1:1)
POST /api/biometric/verify
{
  "deviceId": "64b9876543210fedcba98765",
  "employeeId": "64a1234567890abcdef12345",
  "method": "facial", // fingerprint, facial, card, pin, multi
  "data": {
    "template": "base64_encoded_template..."
  },
  "location": {
    "latitude": 24.7136,
    "longitude": 46.6753
  }
}

// Response
{
  "success": true,
  "data": {
    "verified": true,
    "score": 0.95,
    "method": "facial",
    "employee": { ... },
    "attendanceRecord": { ... }
  }
}

// Identify employee (1:N)
POST /api/biometric/identify
{
  "deviceId": "...",
  "method": "fingerprint",
  "data": {
    "template": "..."
  }
}

// Check-in with GPS (Mobile)
POST /api/biometric/checkin-gps
{
  "employeeId": "64a1234567890abcdef12345",
  "latitude": 24.7136,
  "longitude": 46.6753,
  "accuracy": 10,
  "address": "King Fahd Road, Riyadh"
}
```

### Geo-Fencing

```typescript
// Create geofence zone
POST /api/biometric/geofence
{
  "name": "Head Office",
  "nameAr": "المكتب الرئيسي",
  "type": "circle", // circle, polygon
  "center": {
    "latitude": 24.7136,
    "longitude": 46.6753
  },
  "radius": 150,
  "settings": {
    "allowCheckIn": true,
    "allowCheckOut": true,
    "strictMode": false,
    "graceDistance": 20,
    "minAccuracy": 50
  },
  "restrictions": {
    "allowedDays": [0, 1, 2, 3, 4], // Sunday to Thursday
    "startTime": "08:00",
    "endTime": "18:00"
  }
}

// List geofence zones
GET /api/biometric/geofence

// Get zone by ID
GET /api/biometric/geofence/:id

// Update zone
PUT /api/biometric/geofence/:id

// Delete zone
DELETE /api/biometric/geofence/:id

// Validate location against zones
POST /api/biometric/geofence/validate
{
  "latitude": 24.7136,
  "longitude": 46.6753,
  "accuracy": 10
}

// Response
{
  "success": true,
  "data": {
    "isWithinAnyZone": true,
    "zones": [{
      "zoneId": "...",
      "zoneName": "Head Office",
      "distance": 45,
      "isWithin": true
    }]
  }
}
```

#### Biometric Logs & Reports

```typescript
// Get verification logs
GET /api/biometric/logs?startDate=2025-01-01&endDate=2025-12-31&employeeId=...

// Get verification statistics
GET /api/biometric/logs/stats

// Get failed verification attempts
GET /api/biometric/logs/failed

// Get spoofing attempts
GET /api/biometric/logs/spoofing

// Get daily summary
GET /api/biometric/logs/daily-summary?date=2025-12-08

// Process unprocessed logs
POST /api/biometric/logs/process
```

---

### HR Analytics

Base URL: `/api/hr-analytics`

```typescript
// Get complete dashboard
GET /api/hr-analytics/dashboard?startDate=2025-01-01&endDate=2025-12-31

// Response format (chart-ready)
{
  "success": true,
  "data": {
    "demographics": { ... },
    "turnover": { ... },
    "attendance": { ... },
    "performance": { ... },
    "summary": {
      "totalEmployees": 150,
      "activeEmployees": 145,
      "turnoverRate": 8.5,
      "averageAttendance": 94.2
    }
  }
}

// Individual analytics endpoints
GET /api/hr-analytics/demographics
GET /api/hr-analytics/turnover
GET /api/hr-analytics/absenteeism
GET /api/hr-analytics/attendance
GET /api/hr-analytics/performance
GET /api/hr-analytics/recruitment
GET /api/hr-analytics/compensation
GET /api/hr-analytics/training
GET /api/hr-analytics/leave
GET /api/hr-analytics/saudization  // Saudi compliance

// Query parameters (all endpoints)
?startDate=2025-01-01
&endDate=2025-12-31
&departmentId=...
&locationId=...
&compare=true  // Compare to previous period
```

#### Response Format (Chart-Ready)

```typescript
// All analytics return chart-ready data
{
  "success": true,
  "data": {
    "chartData": {
      "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      "datasets": [{
        "label": "Turnover Rate",
        "data": [2.1, 1.8, 2.5, 1.9, 2.2, 1.7],
        "backgroundColor": "#3b82f6"
      }]
    },
    "summary": {
      "currentPeriod": 12.2,
      "previousPeriod": 14.5,
      "change": -15.9,
      "trend": "down"
    },
    "breakdown": {
      "byDepartment": { ... },
      "byLocation": { ... }
    }
  }
}
```

### AI Predictions

Base URL: `/api/hr-predictions`

```typescript
// Get attrition risk for all employees
GET /api/hr-predictions/attrition

// Response
{
  "success": true,
  "data": [{
    "employeeId": "...",
    "employeeName": "Ahmed Ali",
    "riskScore": 75,
    "riskLevel": "high", // high, medium, low
    "factors": {
      "tenure": { "score": 30, "description": "Less than 1 year" },
      "performance": { "score": -10, "description": "Above average" },
      "salary": { "score": 25, "description": "Below market rate" },
      "engagement": { "score": 20, "description": "Low activity" },
      "absences": { "score": 10, "description": "Moderate absences" }
    },
    "suggestedInterventions": [
      "Schedule 1-on-1 meeting",
      "Review compensation",
      "Assign mentorship"
    ]
  }]
}

// Get individual employee risk
GET /api/hr-predictions/attrition/:employeeId

// Workforce forecast
GET /api/hr-predictions/workforce?months=12

// Response
{
  "success": true,
  "data": {
    "projections": [{
      "month": "2025-01",
      "headcount": 152,
      "expectedAttrition": 2,
      "expectedHires": 5
    }],
    "summary": {
      "projectedGrowth": 12,
      "expectedAttrition": 18,
      "hiringNeeds": 30
    }
  }
}

// High potential employees
GET /api/hr-predictions/high-potential

// Flight risk employees
GET /api/hr-predictions/flight-risk

// Absence predictions
GET /api/hr-predictions/absence

// Engagement predictions
GET /api/hr-predictions/engagement
```

#### Historical Trends

```typescript
// Take analytics snapshot
POST /api/hr-analytics/snapshot
{
  "snapshotType": "monthly" // daily, weekly, monthly, quarterly, yearly
}

// Get historical trends
GET /api/hr-analytics/trends?metric=turnover&period=12months

// Export reports
GET /api/hr-analytics/export?format=excel&startDate=2025-01-01&endDate=2025-12-31
```

---

## Finance Module

### Bank Reconciliation

Base URL: `/api/bank-reconciliations`

#### Import Transactions

```typescript
// Import CSV
POST /api/bank-reconciliations/import/csv
Content-Type: multipart/form-data
{
  "file": <CSV file>,
  "bankAccountId": "64a...",
  "settings": {
    "dateFormat": "YYYY-MM-DD",
    "delimiter": ",",
    "skipRows": 1,
    "columnMapping": {
      "date": "A",
      "description": "B",
      "amount": "C",
      "reference": "D"
    }
  }
}

// Import OFX
POST /api/bank-reconciliations/import/ofx
Content-Type: multipart/form-data
{
  "file": <OFX file>,
  "bankAccountId": "64a..."
}

// Get CSV template
GET /api/bank-reconciliations/import/template
```

#### Auto-Matching

```typescript
// Get match suggestions
GET /api/bank-reconciliations/suggestions/:accountId

// Response
{
  "success": true,
  "data": [{
    "bankTransactionId": "...",
    "bankTransaction": {
      "date": "2025-12-01",
      "description": "Payment from Client ABC",
      "amount": 5000
    },
    "suggestions": [{
      "matchType": "invoice",
      "matchedRecord": { ... },
      "matchScore": 95,
      "matchReasons": ["Amount matches", "Reference found in description"]
    }]
  }]
}

// Run auto-match
POST /api/bank-reconciliations/auto-match/:accountId

// Response
{
  "success": true,
  "data": {
    "matched": 45,
    "unmatched": 12,
    "matchRate": 78.9
  }
}

// Confirm match
POST /api/bank-reconciliations/match/confirm/:matchId

// Reject match
POST /api/bank-reconciliations/match/reject/:matchId
{
  "reason": "Incorrect match"
}

// Create split match
POST /api/bank-reconciliations/match/split
{
  "bankTransactionId": "...",
  "splits": [{
    "matchType": "invoice",
    "matchedRecordId": "...",
    "amount": 3000
  }, {
    "matchType": "invoice",
    "matchedRecordId": "...",
    "amount": 2000
  }]
}

// Unmatch
DELETE /api/bank-reconciliations/match/:matchId
```

#### Match Rules

```typescript
// Create match rule
POST /api/bank-reconciliations/rules
{
  "name": "Client ABC Payments",
  "priority": 1,
  "criteria": {
    "amountMatch": {
      "type": "exact",
      "tolerance": 0
    },
    "dateMatch": {
      "type": "range",
      "daysTolerance": 3
    },
    "descriptionMatch": {
      "type": "contains",
      "patterns": ["ABC Corp", "ABC Company"]
    }
  },
  "actions": {
    "autoMatch": true,
    "autoReconcile": false,
    "autoCategory": "client_payment"
  }
}

// List rules
GET /api/bank-reconciliations/rules

// Update rule
PUT /api/bank-reconciliations/rules/:id

// Delete rule
DELETE /api/bank-reconciliations/rules/:id
```

#### Reconciliation Workflow

```typescript
// Start reconciliation
POST /api/bank-reconciliations/start
{
  "bankAccountId": "...",
  "statementDate": "2025-12-31",
  "statementBalance": 125000.50
}

// Get reconciliation
GET /api/bank-reconciliations/:id

// Update reconciliation (add/remove items)
PUT /api/bank-reconciliations/:id

// Complete reconciliation
POST /api/bank-reconciliations/:id/complete

// Get reconciliation status
GET /api/bank-reconciliations/status/:accountId

// Response
{
  "success": true,
  "data": {
    "bookBalance": 124500.00,
    "bankBalance": 125000.50,
    "difference": 500.50,
    "unmatchedCount": 5,
    "pendingCount": 3,
    "lastReconciled": "2025-11-30"
  }
}
```

### Multi-Currency

Base URL: `/api/currency`

```typescript
// Get current exchange rates
GET /api/currency/rates?base=SAR

// Response
{
  "success": true,
  "data": {
    "base": "SAR",
    "date": "2025-12-08",
    "rates": {
      "USD": 0.2666,
      "EUR": 0.2451,
      "GBP": 0.2102,
      "AED": 0.9795
    }
  }
}

// Convert amount
POST /api/currency/convert
{
  "amount": 1000,
  "from": "SAR",
  "to": "USD",
  "date": "2025-12-08" // Optional, for historical rates
}

// Response
{
  "success": true,
  "data": {
    "original": { "amount": 1000, "currency": "SAR" },
    "converted": { "amount": 266.60, "currency": "USD" },
    "rate": 0.2666,
    "date": "2025-12-08"
  }
}

// Set manual exchange rate
POST /api/currency/rates
{
  "baseCurrency": "SAR",
  "targetCurrency": "USD",
  "rate": 0.2666,
  "effectiveDate": "2025-12-08"
}

// Get supported currencies
GET /api/currency/supported

// Response
{
  "success": true,
  "data": [
    { "code": "SAR", "name": "Saudi Riyal", "symbol": "ر.س" },
    { "code": "USD", "name": "US Dollar", "symbol": "$" },
    { "code": "EUR", "name": "Euro", "symbol": "€" },
    ...
  ]
}

// Update rates from API
POST /api/currency/update
```

---

## CRM Module

### Email Marketing

Base URL: `/api/email-marketing`

#### Campaigns

```typescript
// Create campaign
POST /api/email-marketing/campaigns
{
  "name": "Welcome Campaign",
  "type": "drip", // one_time, drip, automated, triggered
  "subject": "Welcome to TRAF3LI - مرحباً بك",
  "htmlContent": "<h1>Welcome {{firstName}}</h1>...",
  "audienceType": "segment",
  "segmentId": "...",
  "personalization": {
    "enabled": true,
    "fields": ["firstName", "lastName", "companyName"]
  },
  "dripSettings": {
    "enabled": true,
    "steps": [{
      "order": 1,
      "name": "Welcome Email",
      "delayDays": 0,
      "subject": "Welcome!",
      "htmlContent": "..."
    }, {
      "order": 2,
      "name": "Follow-up",
      "delayDays": 3,
      "subject": "How can we help?",
      "htmlContent": "..."
    }]
  }
}

// List campaigns
GET /api/email-marketing/campaigns

// Get campaign
GET /api/email-marketing/campaigns/:id

// Update campaign
PUT /api/email-marketing/campaigns/:id

// Delete campaign
DELETE /api/email-marketing/campaigns/:id

// Duplicate campaign
POST /api/email-marketing/campaigns/:id/duplicate

// Schedule campaign
POST /api/email-marketing/campaigns/:id/schedule
{
  "scheduledAt": "2025-12-10T10:00:00Z",
  "timezone": "Asia/Riyadh"
}

// Send campaign immediately
POST /api/email-marketing/campaigns/:id/send

// Pause campaign
POST /api/email-marketing/campaigns/:id/pause

// Resume campaign
POST /api/email-marketing/campaigns/:id/resume

// Cancel campaign
POST /api/email-marketing/campaigns/:id/cancel

// Send test email
POST /api/email-marketing/campaigns/:id/test
{
  "testEmail": "test@example.com"
}

// Get campaign analytics
GET /api/email-marketing/campaigns/:id/analytics

// Response
{
  "success": true,
  "data": {
    "stats": {
      "sent": 1500,
      "delivered": 1485,
      "opened": 742,
      "clicked": 156,
      "bounced": 15,
      "unsubscribed": 5
    },
    "rates": {
      "openRate": 49.9,
      "clickRate": 10.5,
      "bounceRate": 1.0,
      "unsubscribeRate": 0.3
    },
    "topLinks": [...],
    "deviceStats": [...],
    "timeStats": [...]
  }
}
```

#### A/B Testing

```typescript
// Create campaign with A/B test
POST /api/email-marketing/campaigns
{
  "name": "A/B Test Campaign",
  "abTest": {
    "enabled": true,
    "variants": [{
      "name": "Variant A",
      "subject": "Subject Line A",
      "percentage": 50
    }, {
      "name": "Variant B",
      "subject": "Subject Line B",
      "percentage": 50
    }],
    "winnerCriteria": "open_rate",
    "testDuration": 4 // hours
  }
}
```

#### Templates

```typescript
// Create template
POST /api/email-marketing/templates
{
  "name": "Welcome Template",
  "category": "welcome",
  "subject": "Welcome {{firstName}}!",
  "htmlContent": "<h1>مرحباً {{firstName}}</h1>...",
  "variables": [
    { "name": "firstName", "defaultValue": "valued customer" },
    { "name": "companyName", "defaultValue": "" }
  ]
}

// List templates
GET /api/email-marketing/templates

// Get public templates
GET /api/email-marketing/templates/public

// Preview template
POST /api/email-marketing/templates/:id/preview
{
  "firstName": "Ahmed",
  "companyName": "ABC Corp"
}
```

#### Subscribers

```typescript
// Add subscriber
POST /api/email-marketing/subscribers
{
  "email": "user@example.com",
  "firstName": "Ahmed",
  "lastName": "Ali",
  "leadId": "...", // Optional
  "tags": ["vip", "corporate"]
}

// List subscribers
GET /api/email-marketing/subscribers?status=subscribed&tags=vip

// Import subscribers
POST /api/email-marketing/subscribers/import
{
  "subscribers": [{
    "email": "user1@example.com",
    "firstName": "User 1"
  }]
}

// Export subscribers
POST /api/email-marketing/subscribers/export
{
  "format": "csv",
  "filters": { "status": "subscribed" }
}

// Unsubscribe
POST /api/email-marketing/subscribers/:id/unsubscribe
```

#### Segments

```typescript
// Create segment
POST /api/email-marketing/segments
{
  "name": "High-Value Leads",
  "conditions": [{
    "field": "leadScore",
    "operator": "greaterThan",
    "value": 80
  }, {
    "field": "tags",
    "operator": "contains",
    "value": "corporate"
  }],
  "conditionLogic": "AND"
}

// List segments
GET /api/email-marketing/segments

// Get segment subscribers
GET /api/email-marketing/segments/:id/subscribers

// Refresh segment count
POST /api/email-marketing/segments/:id/refresh
```

#### Analytics

```typescript
// Overall analytics
GET /api/email-marketing/analytics/overview?startDate=2025-01-01&endDate=2025-12-31

// Trends
GET /api/email-marketing/analytics/trends?period=30days
```

---

### AI Lead Scoring

Base URL: `/api/lead-scoring`

```typescript
// Get scoring configuration
GET /api/lead-scoring/config

// Response
{
  "success": true,
  "data": {
    "weights": {
      "demographic": 25,
      "bant": 30,
      "behavioral": 30,
      "engagement": 15
    },
    "grading": {
      "A": { "min": 80, "label": "Hot Lead", "color": "#ef4444" },
      "B": { "min": 60, "label": "Warm Lead", "color": "#f97316" },
      "C": { "min": 40, "label": "Cool Lead", "color": "#eab308" },
      "D": { "min": 20, "label": "Cold Lead", "color": "#3b82f6" },
      "F": { "min": 0, "label": "Unqualified", "color": "#6b7280" }
    }
  }
}

// Update configuration
PUT /api/lead-scoring/config
{
  "weights": {
    "demographic": 20,
    "bant": 35,
    "behavioral": 30,
    "engagement": 15
  }
}

// Calculate score for a lead
POST /api/lead-scoring/calculate/:leadId

// Response
{
  "success": true,
  "data": {
    "leadId": "...",
    "totalScore": 85,
    "grade": "A",
    "category": "hot",
    "conversionProbability": 72,
    "confidenceLevel": "high",
    "breakdown": {
      "demographic": { "score": 80, "weight": 25, "weighted": 20 },
      "bant": { "score": 90, "weight": 30, "weighted": 27 },
      "behavioral": { "score": 85, "weight": 30, "weighted": 25.5 },
      "engagement": { "score": 83, "weight": 15, "weighted": 12.45 }
    }
  }
}

// Recalculate all scores
POST /api/lead-scoring/calculate-all

// Get score distribution
GET /api/lead-scoring/distribution

// Response
{
  "success": true,
  "data": {
    "chartData": {
      "labels": ["A (Hot)", "B (Warm)", "C (Cool)", "D (Cold)", "F"],
      "datasets": [{
        "data": [15, 35, 28, 18, 4],
        "backgroundColor": ["#ef4444", "#f97316", "#eab308", "#3b82f6", "#6b7280"]
      }]
    }
  }
}

// Get top leads
GET /api/lead-scoring/top-leads?limit=10

// Get leads by grade
GET /api/lead-scoring/by-grade/A

// Get lead insights
GET /api/lead-scoring/insights/:leadId

// Response
{
  "success": true,
  "data": {
    "score": 85,
    "strengths": [
      "Strong budget indication",
      "Decision maker",
      "High email engagement"
    ],
    "weaknesses": [
      "Long timeline",
      "Low website activity"
    ],
    "recommendedActions": [
      "Schedule follow-up call",
      "Send case study",
      "Offer consultation"
    ],
    "similarConverted": [...]
  }
}

// Get score trends
GET /api/lead-scoring/trends?period=30days
```

#### Behavioral Tracking (Webhook Endpoints)

```typescript
// Track email open
POST /api/lead-scoring/track/email-open
{
  "leadId": "...",
  "campaignId": "...",
  "timestamp": "2025-12-08T10:00:00Z"
}

// Track email click
POST /api/lead-scoring/track/email-click
{
  "leadId": "...",
  "campaignId": "...",
  "link": "https://example.com/pricing"
}

// Track meeting
POST /api/lead-scoring/track/meeting
{
  "leadId": "...",
  "type": "attended", // scheduled, attended, cancelled
  "duration": 45 // minutes
}

// Track call
POST /api/lead-scoring/track/call
{
  "leadId": "...",
  "duration": 15 // minutes
}

// Track document view
POST /api/lead-scoring/track/document-view
{
  "leadId": "...",
  "documentId": "...",
  "duration": 120 // seconds
}

// Track website visit
POST /api/lead-scoring/track/website-visit
{
  "leadId": "...",
  "page": "/pricing",
  "duration": 60 // seconds
}

// Track form submission
POST /api/lead-scoring/track/form-submit
{
  "leadId": "...",
  "formId": "contact_form"
}
```

---

### WhatsApp Integration

Base URL: `/api/whatsapp`

#### Sending Messages

```typescript
// Send template message
POST /api/whatsapp/send/template
{
  "phoneNumber": "+966501234567",
  "templateName": "welcome_message",
  "variables": ["Ahmed", "ABC Corp"],
  "leadId": "..." // Optional - auto-link to lead
}

// Send text message (within 24-hour window)
POST /api/whatsapp/send/text
{
  "phoneNumber": "+966501234567",
  "text": "Hello! How can we help you today?"
}

// Send media message
POST /api/whatsapp/send/media
{
  "phoneNumber": "+966501234567",
  "type": "image", // image, video, document, audio
  "mediaUrl": "https://s3.amazonaws.com/doc.pdf",
  "caption": "Here's the document you requested"
}
```

#### Conversations

```typescript
// List conversations
GET /api/whatsapp/conversations?status=active

// Get conversation
GET /api/whatsapp/conversations/:id

// Get messages
GET /api/whatsapp/conversations/:id/messages?page=1&limit=50

// Mark as read
POST /api/whatsapp/conversations/:id/read

// Assign conversation
PUT /api/whatsapp/conversations/:id/assign
{
  "userId": "..."
}
```

#### Templates

```typescript
// Create template
POST /api/whatsapp/templates
{
  "name": "appointment_reminder",
  "language": "ar",
  "category": "utility",
  "header": {
    "type": "text",
    "content": "تذكير بالموعد"
  },
  "body": {
    "text": "مرحباً {{1}}، هذا تذكير بموعدك في {{2}} الساعة {{3}}",
    "variables": [
      { "name": "name", "sample": "أحمد" },
      { "name": "date", "sample": "15 ديسمبر" },
      { "name": "time", "sample": "10:00 ص" }
    ]
  },
  "buttons": [{
    "type": "quick_reply",
    "text": "تأكيد"
  }, {
    "type": "quick_reply",
    "text": "إلغاء"
  }]
}

// List templates
GET /api/whatsapp/templates

// Analytics
GET /api/whatsapp/analytics?startDate=2025-01-01&endDate=2025-12-31
```

#### Webhooks (Public Endpoints)

```typescript
// Verify webhook (for Meta setup)
GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...

// Receive messages
POST /api/webhooks/whatsapp
// (Called by Meta/MSG91 when messages are received)
```

---

## Tasks Module

### Gantt Charts

Base URL: `/api/gantt`

#### Get Gantt Data

```typescript
// Get all gantt data
GET /api/gantt/data?startDate=2025-01-01&endDate=2025-12-31

// Response (DHTMLX Gantt format)
{
  "success": true,
  "data": {
    "data": [{
      "id": "task_123",
      "text": "Prepare court documents",
      "start_date": "2025-01-15 00:00",
      "end_date": "2025-01-20 00:00",
      "duration": 5,
      "progress": 0.6,
      "parent": "task_100",
      "type": "task", // task, project, milestone
      "open": true,

      // Custom properties
      "assignee": {
        "id": "user_1",
        "name": "Ahmed",
        "avatar": "https://..."
      },
      "priority": "high",
      "status": "in_progress",
      "caseId": "case_456",
      "caseName": "Smith vs Jones",

      // Visual
      "color": "#3b82f6",
      "textColor": "#ffffff",

      // Flags
      "isCritical": true,
      "isOverdue": false
    }],

    "links": [{
      "id": "link_1",
      "source": "task_123",
      "target": "task_124",
      "type": "0" // 0=FS, 1=SS, 2=FF, 3=SF
    }],

    "resources": [{
      "id": "user_1",
      "name": "Ahmed",
      "taskCount": 5,
      "workload": {
        "2025-01-15": { "hours": 8, "tasks": 2 },
        "2025-01-16": { "hours": 12, "tasks": 3 } // overallocated
      }
    }],

    "summary": {
      "totalTasks": 45,
      "completedTasks": 20,
      "overdueTasks": 3,
      "projectStart": "2025-01-01",
      "projectEnd": "2025-03-15",
      "criticalPath": ["task_1", "task_5", "task_12"],
      "completionPercentage": 44
    }
  }
}

// Get gantt for specific case
GET /api/gantt/data/case/:caseId

// Get gantt by assignee
GET /api/gantt/data/assigned/:userId

// Filter with complex criteria
POST /api/gantt/data/filter
{
  "caseIds": ["...", "..."],
  "assigneeIds": ["..."],
  "status": ["in_progress", "todo"],
  "priority": ["high", "medium"],
  "dateRange": {
    "start": "2025-01-01",
    "end": "2025-06-30"
  }
}
```

#### Task Operations (from Gantt UI)

```typescript
// Update task dates (drag-drop)
PUT /api/gantt/task/:id/dates
{
  "startDate": "2025-01-20",
  "endDate": "2025-01-25"
}

// Update task duration
PUT /api/gantt/task/:id/duration
{
  "duration": 7
}

// Update task progress
PUT /api/gantt/task/:id/progress
{
  "progress": 0.75
}

// Change task parent (hierarchy)
PUT /api/gantt/task/:id/parent
{
  "parentId": "task_200"
}

// Reorder tasks
POST /api/gantt/task/:id/reorder
{
  "taskIds": ["task_1", "task_3", "task_2"]
}
```

#### Dependencies/Links

```typescript
// Create dependency link
POST /api/gantt/link
{
  "source": "task_123",
  "target": "task_124",
  "type": "0" // 0=finish-to-start, 1=start-to-start, 2=finish-to-finish, 3=start-to-finish
}

// Delete link
DELETE /api/gantt/link/:id

// Get dependency chain
GET /api/gantt/dependencies/:taskId
```

#### Critical Path Analysis

```typescript
// Get critical path
GET /api/gantt/critical-path/:projectId

// Response
{
  "success": true,
  "data": {
    "criticalPath": ["task_1", "task_5", "task_12", "task_18"],
    "projectDuration": 45,
    "projectEnd": "2025-03-15"
  }
}

// Get slack time for task
GET /api/gantt/slack/:taskId

// Get bottlenecks
GET /api/gantt/bottlenecks/:projectId
```

#### Resource Management

```typescript
// Get resource allocation
GET /api/gantt/resources?startDate=2025-01-01&endDate=2025-01-31

// Get user workload
GET /api/gantt/resources/:userId/workload

// Check for conflicts (overallocation)
GET /api/gantt/resources/conflicts

// Suggest optimal assignee
GET /api/gantt/suggest-assignee/:taskId
```

#### Auto-Scheduling

```typescript
// Auto-schedule project
POST /api/gantt/auto-schedule/:projectId
{
  "startDate": "2025-01-15"
}

// Level resources (balance workload)
POST /api/gantt/level-resources/:projectId
```

#### Baselines

```typescript
// Create baseline (save current plan)
POST /api/gantt/baseline/:projectId

// Get baseline
GET /api/gantt/baseline/:projectId

// Compare to baseline
GET /api/gantt/baseline/:projectId/compare

// Response
{
  "success": true,
  "data": {
    "variance": {
      "daysAhead": -3,
      "percentComplete": 44,
      "plannedComplete": 50
    },
    "taskVariances": [{
      "taskId": "...",
      "planned": { "start": "2025-01-15", "end": "2025-01-20" },
      "actual": { "start": "2025-01-17", "end": null },
      "variance": 2
    }]
  }
}
```

#### Milestones

```typescript
// Create milestone
POST /api/gantt/milestone
{
  "name": "Phase 1 Complete",
  "date": "2025-02-15",
  "caseId": "..."
}

// Get milestones
GET /api/gantt/milestones/:projectId
```

#### Export

```typescript
// Export to MS Project
GET /api/gantt/export/:projectId/msproject

// Export to PDF
GET /api/gantt/export/:projectId/pdf

// Export to Excel
GET /api/gantt/export/:projectId/excel
```

---

### Real-time Collaboration

Base URL: `/api/collaboration`

```typescript
// Get active users on resource
GET /api/collaboration/presence/:resourceId

// Update presence
POST /api/collaboration/presence
{
  "resourceType": "task", // task, case, document, gantt
  "resourceId": "..."
}

// Get recent activities
GET /api/collaboration/activities?limit=50

// Get collaboration stats
GET /api/collaboration/stats
```

---

## Socket.io Events

### Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('https://api.traf3li.com', {
  auth: { token: 'JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('Connected');
});
```

### User Presence

```typescript
// Join firm room
socket.emit('firm:join', { firmId: '...' });

// User presence
socket.emit('user:join', { userId: '...' });

// Listen for online users
socket.on('user:online', (user) => {
  console.log('User online:', user);
});

socket.on('user:offline', (user) => {
  console.log('User offline:', user);
});
```

### Task Collaboration

```typescript
// Join task room
socket.emit('task:join', { taskId: '...' });

// Listen for task updates
socket.on('task:updated', (data) => {
  // data: { taskId, changes, updatedBy }
});

// Leave task room
socket.emit('task:leave', { taskId: '...' });

// Task comments
socket.on('task:comment:new', (comment) => {
  // New comment added
});
```

### Gantt Collaboration

```typescript
// Join gantt room
socket.emit('gantt:join', { projectId: '...' });

// Listen for user joined
socket.on('gantt:user:joined', (user) => {
  // Show user avatar on gantt
});

// Task being dragged (by another user)
socket.on('gantt:task:dragging', (data) => {
  // data: { taskId, userId, newDates }
  // Show ghost/preview of task being moved
});

// Task updated
socket.on('gantt:task:updated', (data) => {
  // Refresh task in gantt
});

// Link added/removed
socket.on('gantt:link:added', (link) => { });
socket.on('gantt:link:removed', (linkId) => { });
```

### Document Collaboration

```typescript
// Join document room
socket.emit('document:join', { documentId: '...' });

// Cursor positions (collaborative editing)
socket.emit('document:cursor', {
  documentId: '...',
  position: { line: 10, column: 5 }
});

socket.on('document:cursor:update', (data) => {
  // data: { userId, userName, color, position }
  // Show other users' cursors
});

// Document changes
socket.on('document:updated', (changes) => {
  // Apply changes to document
});
```

### Typing Indicators

```typescript
// Start typing
socket.emit('typing:start', {
  conversationId: '...',
  userId: '...'
});

// Stop typing
socket.emit('typing:stop', {
  conversationId: '...',
  userId: '...'
});

// Listen for typing
socket.on('typing:update', (data) => {
  // data: { conversationId, users: [{ id, name }] }
});
```

### Notifications

```typescript
// Listen for new notifications
socket.on('notification:new', (notification) => {
  // Show toast/badge
});

// Activity feed
socket.on('activity:new', (activity) => {
  // Update activity feed
});
```

---

## TypeScript Interfaces

```typescript
// Biometric Types
interface BiometricDevice {
  _id: string;
  firmId: string;
  deviceId: string;
  deviceName: string;
  deviceType: 'fingerprint' | 'facial' | 'card_reader' | 'iris' | 'palm' | 'multi_modal';
  manufacturer: 'zkteco' | 'suprema' | 'hikvision' | 'dahua' | 'generic';
  status: 'online' | 'offline' | 'maintenance' | 'error';
  location: {
    name: string;
    coordinates: { latitude: number; longitude: number };
    geofenceRadius: number;
  };
  capabilities: {
    fingerprint: boolean;
    facial: boolean;
    card: boolean;
    pin: boolean;
    antiSpoofing: boolean;
  };
}

interface BiometricEnrollment {
  _id: string;
  employeeId: string;
  status: 'pending' | 'enrolled' | 'failed' | 'expired' | 'revoked';
  fingerprints: Array<{
    finger: string;
    quality: number;
  }>;
  facial: {
    photo: string;
    quality: number;
  };
  card: {
    cardNumber: string;
    cardType: string;
  };
}

interface GeofenceZone {
  _id: string;
  name: string;
  nameAr?: string;
  type: 'circle' | 'polygon';
  center: { latitude: number; longitude: number };
  radius: number;
  settings: {
    allowCheckIn: boolean;
    allowCheckOut: boolean;
    strictMode: boolean;
    graceDistance: number;
    minAccuracy: number;
  };
}

// Lead Scoring Types
interface LeadScore {
  leadId: string;
  totalScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  category: 'hot' | 'warm' | 'cool' | 'cold';
  conversionProbability: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  breakdown: {
    demographic: ScoreBreakdown;
    bant: ScoreBreakdown;
    behavioral: ScoreBreakdown;
    engagement: ScoreBreakdown;
  };
}

interface ScoreBreakdown {
  score: number;
  weight: number;
  weighted: number;
  factors: Record<string, { score: number; description?: string }>;
}

// Email Marketing Types
interface EmailCampaign {
  _id: string;
  name: string;
  type: 'one_time' | 'drip' | 'automated' | 'triggered';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  subject: string;
  htmlContent: string;
  audienceType: 'all_leads' | 'segment' | 'custom' | 'clients';
  segmentId?: string;
  scheduledAt?: Date;
  stats: CampaignStats;
  dripSettings?: DripSettings;
  abTest?: ABTestSettings;
}

interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
}

// Gantt Types
interface GanttTask {
  id: string;
  text: string;
  start_date: string;
  end_date: string;
  duration: number;
  progress: number;
  parent?: string;
  type: 'task' | 'project' | 'milestone';
  assignee?: {
    id: string;
    name: string;
    avatar: string;
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'blocked' | 'completed';
  isCritical: boolean;
  isOverdue: boolean;
  color?: string;
}

interface GanttLink {
  id: string;
  source: string;
  target: string;
  type: '0' | '1' | '2' | '3'; // FS, SS, FF, SF
}

interface GanttData {
  data: GanttTask[];
  links: GanttLink[];
  resources: GanttResource[];
  summary: GanttSummary;
}

// WhatsApp Types
interface WhatsAppConversation {
  _id: string;
  phoneNumber: string;
  leadId?: string;
  status: 'active' | 'closed' | 'pending';
  lastMessageAt: Date;
  unreadCount: number;
  assignedTo?: string;
  windowExpiresAt: Date;
}

interface WhatsAppMessage {
  _id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'template' | 'image' | 'video' | 'document' | 'audio';
  content: {
    text?: string;
    templateName?: string;
    mediaUrl?: string;
    caption?: string;
  };
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
}
```

---

## Environment Variables

Add these to your `.env` file:

```bash
# Biometric
BIOMETRIC_VERIFICATION_THRESHOLD=0.7
BIOMETRIC_IDENTIFICATION_THRESHOLD=0.8
GEOFENCE_DEFAULT_RADIUS=100
GPS_MIN_ACCURACY=50

# Currency
EXCHANGE_RATE_API_KEY=your_api_key

# Email Marketing
RESEND_API_KEY=your_resend_key
FROM_EMAIL=noreply@traf3li.com
FROM_NAME=TRAF3LI

# WhatsApp
WHATSAPP_PROVIDER=meta  # or msg91
META_WHATSAPP_TOKEN=your_token
META_PHONE_NUMBER_ID=your_id
META_WEBHOOK_VERIFY_TOKEN=your_verify_token

# AI (for document analysis - future)
ANTHROPIC_API_KEY=your_key
```

---

## Summary - New API Endpoints Count

| Module | New Endpoints | Features |
|--------|---------------|----------|
| **Biometric** | 35+ | Device mgmt, enrollment, verification, geo-fencing |
| **HR Analytics** | 21 | Demographics, turnover, AI predictions |
| **Bank Reconciliation** | 19 | Import, auto-match, rules, multi-currency |
| **Email Marketing** | 30+ | Campaigns, templates, segments, A/B testing |
| **Lead Scoring** | 15 | AI scoring, behavioral tracking |
| **WhatsApp** | 15 | Messages, conversations, templates |
| **Gantt** | 30+ | Charts, dependencies, resources, collaboration |
| **Real-time** | 20+ events | Socket.io collaboration |

**Total: 185+ new API endpoints**

---

## Version

- Guide Version: 1.0.0
- Backend Version: Competitive Analysis Release
- Date: December 8, 2025
