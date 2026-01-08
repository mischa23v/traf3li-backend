# HR API Documentation - Part 12: Analytics, Reports & Dashboards

## Overview

This document covers the comprehensive Analytics, Reporting, and Dashboard system including event tracking, custom report builders, scheduled reports, and HR-specific analytics.

**Base URL:** `/api`

**Authentication:** All endpoints require JWT Bearer token.

---

## Table of Contents

1. [Dashboard APIs](#dashboard-apis)
2. [Event Analytics](#event-analytics)
3. [CRM Analytics](#crm-analytics)
4. [Analytics Reports](#analytics-reports)
5. [Custom Reports](#custom-reports)

---

## Dashboard APIs

Central dashboard endpoints providing aggregated metrics and summaries.

### Base URL: `/api/dashboard`

### Get Dashboard Summary

```http
GET /dashboard/summary
```

Combined endpoint with all essential dashboard data.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalCases": 156,
      "activeCases": 42,
      "totalClients": 89,
      "totalRevenue": 1250000.00,
      "pendingInvoices": 15,
      "overdueInvoices": 3
    },
    "tasks": {
      "total": 234,
      "completed": 180,
      "pending": 45,
      "overdue": 9
    },
    "appointments": {
      "today": 5,
      "thisWeek": 18,
      "upcoming": 32
    },
    "quickStats": {
      "unreadMessages": 12,
      "pendingApprovals": 7,
      "upcomingDeadlines": 4
    }
  }
}
```

### Get Analytics Overview

```http
GET /dashboard/analytics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cases": {
      "byStatus": [
        { "status": "active", "count": 42, "percentage": 26.9 },
        { "status": "pending", "count": 28, "percentage": 17.9 },
        { "status": "closed", "count": 86, "percentage": 55.1 }
      ],
      "byType": [
        { "type": "litigation", "count": 45 },
        { "type": "corporate", "count": 38 },
        { "type": "real_estate", "count": 25 }
      ],
      "trend": {
        "period": "last_30_days",
        "new": 15,
        "closed": 12,
        "netChange": 3
      }
    },
    "revenue": {
      "thisMonth": 125000.00,
      "lastMonth": 118000.00,
      "growth": 5.9,
      "ytd": 1250000.00
    },
    "productivity": {
      "billableHours": {
        "thisWeek": 156.5,
        "target": 200,
        "utilizationRate": 78.25
      },
      "tasksCompleted": 45,
      "avgResponseTime": "2.5 hours"
    }
  }
}
```

### Get HR Stats

```http
GET /dashboard/hr-stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "workforce": {
      "totalEmployees": 145,
      "activeEmployees": 142,
      "onLeave": 8,
      "newHiresThisMonth": 3,
      "terminationsThisMonth": 1,
      "turnoverRate": 2.1
    },
    "attendance": {
      "presentToday": 134,
      "absentToday": 11,
      "lateArrivals": 5,
      "attendanceRate": 92.4,
      "avgWorkingHours": 8.2
    },
    "leave": {
      "pendingRequests": 12,
      "approvedThisMonth": 45,
      "totalDaysTaken": 156,
      "avgBalance": 14.5
    },
    "payroll": {
      "lastPayrollTotal": 875000.00,
      "pendingAdvances": 3,
      "activeLoans": 25,
      "gosiContributions": 52500.00
    },
    "compliance": {
      "saudizationRate": 42.5,
      "nitaqatBand": "platinum",
      "expiringDocuments": 8,
      "probationEnding": 5
    },
    "performance": {
      "avgRating": 4.2,
      "reviewsDue": 15,
      "goalsCompleted": 68,
      "goalsInProgress": 45
    }
  }
}
```

### Get Hero Stats

```http
GET /dashboard/hero-stats
```

Top-level metrics for dashboard header.

**Response:**
```json
{
  "success": true,
  "data": {
    "revenue": {
      "value": 1250000.00,
      "trend": "up",
      "change": 12.5
    },
    "cases": {
      "value": 42,
      "label": "Active Cases",
      "trend": "up",
      "change": 3
    },
    "tasks": {
      "value": 45,
      "label": "Pending Tasks",
      "trend": "down",
      "change": -8
    },
    "clients": {
      "value": 89,
      "label": "Total Clients",
      "trend": "up",
      "change": 5
    }
  }
}
```

### Get Reports

```http
GET /dashboard/reports
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| period | string | month | day/week/month/quarter/year |

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "revenue": {
      "data": [
        { "date": "2024-01-01", "amount": 45000 },
        { "date": "2024-01-08", "amount": 52000 },
        { "date": "2024-01-15", "amount": 38000 }
      ],
      "total": 125000,
      "average": 45000
    },
    "cases": {
      "opened": 15,
      "closed": 12,
      "byStatus": { "active": 42, "pending": 28, "closed": 86 }
    },
    "tasks": {
      "created": 78,
      "completed": 65,
      "completionRate": 83.3
    }
  }
}
```

---

## Event Analytics

Event-based analytics for tracking user interactions, feature usage, and system events.

### Base URL: `/api/analytics`

### Event Types

| Type | Description | Example Events |
|------|-------------|----------------|
| `page_view` | Page navigation | Home viewed, Dashboard viewed |
| `feature_used` | Feature interaction | Export clicked, Filter applied |
| `action_completed` | Task completion | Case created, Invoice sent |
| `error` | Error occurrence | API error, Validation failed |
| `api_call` | API request tracking | GET /cases, POST /invoices |
| `search` | Search queries | Client search, Case search |
| `form_submit` | Form submissions | Leave request, Expense form |
| `login` | Authentication | User login, OAuth callback |
| `logout` | Session end | User logout, Session timeout |
| `signup` | Registration | New user, New employee |
| `user_action` | User interactions | Button click, Menu open |
| `custom` | Custom events | Business-specific tracking |

### Track Event

```http
POST /analytics/events
```

**Request Body:**
```json
{
  "eventType": "feature_used",
  "eventName": "export_report",
  "properties": {
    "reportType": "payroll",
    "format": "excel",
    "recordCount": 145
  },
  "metadata": {
    "page": "/hr/payroll/reports",
    "referrer": "/hr/payroll",
    "device": "desktop",
    "browser": "Chrome"
  },
  "duration": 2500
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "eventId": "evt_abc123",
    "tracked": true
  }
}
```

### Get Event Counts

```http
GET /analytics/events/counts
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| eventType | string | Filter by event type |
| start | date | Start date (ISO 8601) |
| end | date | End date (ISO 8601) |

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "counts": [
      { "eventType": "page_view", "count": 15420 },
      { "eventType": "feature_used", "count": 3256 },
      { "eventType": "action_completed", "count": 1845 },
      { "eventType": "search", "count": 892 },
      { "eventType": "form_submit", "count": 456 }
    ],
    "total": 21869
  }
}
```

### Get App Dashboard

```http
GET /analytics/app/dashboard
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| start | date | Start date |
| end | date | End date |

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalEvents": 45892,
      "uniqueUsers": 142,
      "avgEventsPerUser": 323,
      "avgSessionDuration": "24m 35s"
    },
    "engagement": {
      "dau": 89,
      "wau": 125,
      "mau": 142,
      "dauWauRatio": 0.712,
      "stickiness": 62.7
    },
    "topPages": [
      { "page": "/dashboard", "views": 5420, "avgTime": "3m 15s" },
      { "page": "/cases", "views": 3256, "avgTime": "5m 42s" },
      { "page": "/hr/employees", "views": 2845, "avgTime": "4m 18s" }
    ],
    "topFeatures": [
      { "feature": "case_search", "uses": 1256 },
      { "feature": "document_upload", "uses": 892 },
      { "feature": "invoice_create", "uses": 645 }
    ],
    "errorRate": 0.023
  }
}
```

### Get Feature Usage

```http
GET /analytics/app/features
```

**Response:**
```json
{
  "success": true,
  "data": {
    "features": [
      {
        "featureName": "case_management",
        "totalUses": 8542,
        "uniqueUsers": 135,
        "avgUsesPerUser": 63.3,
        "trend": "up",
        "trendPercentage": 12.5,
        "breakdown": {
          "create": 245,
          "view": 5420,
          "edit": 1856,
          "delete": 21,
          "export": 156
        }
      },
      {
        "featureName": "hr_attendance",
        "totalUses": 4256,
        "uniqueUsers": 142,
        "avgUsesPerUser": 30.0,
        "trend": "stable"
      }
    ],
    "adoptionRate": {
      "case_management": 95.1,
      "hr_attendance": 100.0,
      "invoicing": 78.9,
      "document_management": 85.2
    }
  }
}
```

### Get Popular Features

```http
GET /analytics/app/features/popular
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| start | date | 30 days ago | Start date |
| end | date | today | End date |
| limit | number | 10 | Max results |

### Get User Engagement

```http
GET /analytics/app/engagement
```

DAU, WAU, MAU metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "dau": {
      "current": 89,
      "previous": 85,
      "change": 4.7,
      "history": [
        { "date": "2024-01-15", "value": 89 },
        { "date": "2024-01-14", "value": 92 },
        { "date": "2024-01-13", "value": 78 }
      ]
    },
    "wau": {
      "current": 125,
      "previous": 118,
      "change": 5.9
    },
    "mau": {
      "current": 142,
      "previous": 138,
      "change": 2.9
    },
    "stickiness": {
      "dauWau": 71.2,
      "dauMau": 62.7,
      "wauMau": 88.0
    },
    "avgSessionsPerUser": 4.2,
    "avgSessionDuration": "24m 35s"
  }
}
```

### Get Retention Analysis

```http
GET /analytics/app/retention
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cohortAnalysis": [
      {
        "cohort": "2024-01",
        "size": 15,
        "retention": {
          "week1": 100,
          "week2": 93.3,
          "week3": 86.7,
          "week4": 80.0
        }
      },
      {
        "cohort": "2023-12",
        "size": 12,
        "retention": {
          "week1": 100,
          "week2": 91.7,
          "week3": 83.3,
          "week4": 75.0,
          "month2": 66.7
        }
      }
    ],
    "overallRetention": {
      "day1": 85.2,
      "day7": 72.1,
      "day30": 58.4,
      "day90": 45.2
    },
    "churnRate": {
      "monthly": 3.5,
      "quarterly": 9.8
    }
  }
}
```

### Get Funnel Analysis

```http
GET /analytics/app/funnel
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| steps | string | Comma-separated or JSON array of steps |
| start | date | Start date |
| end | date | End date |

**Example:**
```
GET /analytics/app/funnel?steps=page_view:cases,action:case_create,action:case_assign&start=2024-01-01&end=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "funnel": {
      "steps": [
        { "name": "View Cases", "count": 5420, "percentage": 100 },
        { "name": "Create Case", "count": 245, "percentage": 4.5, "dropoff": 95.5 },
        { "name": "Assign Case", "count": 198, "percentage": 3.7, "dropoff": 19.2 }
      ],
      "overallConversion": 3.7
    },
    "avgTimeToConvert": "2h 15m",
    "conversionTrend": {
      "current": 3.7,
      "previous": 3.2,
      "change": 15.6
    }
  }
}
```

### Get Dropoff Points

```http
GET /analytics/app/dropoff
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| workflow | string | Workflow steps (comma-separated or JSON) |
| start | date | Start date |
| end | date | End date |

**Response:**
```json
{
  "success": true,
  "data": {
    "dropoffPoints": [
      {
        "step": "document_upload",
        "previousStep": "case_create",
        "dropoffRate": 45.2,
        "avgTimeBeforeDropoff": "8m 30s",
        "reasons": [
          { "reason": "file_size_error", "count": 23 },
          { "reason": "unsupported_format", "count": 15 },
          { "reason": "abandoned", "count": 42 }
        ]
      }
    ],
    "recommendations": [
      "Consider increasing file size limit",
      "Add drag-and-drop support"
    ]
  }
}
```

### Get User Journey

```http
GET /analytics/app/users/:userId/journey
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| start | date | Start date |
| end | date | End date |

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user_id",
    "userName": "Mohammed Ali",
    "totalEvents": 456,
    "sessions": 23,
    "journey": [
      {
        "timestamp": "2024-01-15T09:00:00Z",
        "sessionId": "sess_abc123",
        "events": [
          { "type": "login", "timestamp": "09:00:00" },
          { "type": "page_view", "page": "/dashboard", "timestamp": "09:00:05" },
          { "type": "page_view", "page": "/cases", "timestamp": "09:02:15" },
          { "type": "feature_used", "feature": "case_search", "timestamp": "09:02:45" },
          { "type": "page_view", "page": "/cases/123", "timestamp": "09:03:20" }
        ],
        "duration": "45m 20s"
      }
    ],
    "topActions": [
      { "action": "case_view", "count": 125 },
      { "action": "document_upload", "count": 45 },
      { "action": "task_complete", "count": 38 }
    ]
  }
}
```

### Export Analytics

```http
GET /analytics/app/export
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| eventType | string | Filter by event type |
| start | date | Start date |
| end | date | End date |
| format | string | json/csv |

---

## CRM Analytics

Sales and customer relationship analytics.

### Base URL: `/api/analytics/crm`

### Get CRM Dashboard

```http
GET /analytics/crm/dashboard
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | date | Start date |
| endDate | date | End date |
| userId | string | Filter by sales rep |
| teamId | string | Filter by team |
| territoryId | string | Filter by territory |

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalLeads": 256,
      "qualifiedLeads": 89,
      "opportunities": 45,
      "closedWon": 12,
      "closedLost": 8,
      "pipelineValue": 2500000.00,
      "closedRevenue": 450000.00
    },
    "conversion": {
      "leadToOpportunity": 35.2,
      "opportunityToClose": 60.0,
      "overallConversion": 21.1
    },
    "performance": {
      "avgDealSize": 37500.00,
      "avgSalesCycle": 28,
      "winRate": 60.0
    },
    "activity": {
      "callsMade": 456,
      "emailsSent": 892,
      "meetingsHeld": 67,
      "proposalsSent": 34
    },
    "trends": {
      "revenue": [
        { "period": "Week 1", "value": 125000 },
        { "period": "Week 2", "value": 98000 },
        { "period": "Week 3", "value": 145000 },
        { "period": "Week 4", "value": 82000 }
      ]
    }
  }
}
```

### Get Pipeline Analysis

```http
GET /analytics/crm/pipeline
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stages": [
      {
        "stage": "Lead",
        "count": 156,
        "value": 780000.00,
        "avgAge": 5.2,
        "conversionRate": 45.5
      },
      {
        "stage": "Qualified",
        "count": 89,
        "value": 623000.00,
        "avgAge": 12.5,
        "conversionRate": 65.2
      },
      {
        "stage": "Proposal",
        "count": 34,
        "value": 425000.00,
        "avgAge": 18.3,
        "conversionRate": 72.0
      },
      {
        "stage": "Negotiation",
        "count": 15,
        "value": 225000.00,
        "avgAge": 25.1,
        "conversionRate": 80.0
      },
      {
        "stage": "Closed Won",
        "count": 12,
        "value": 450000.00
      }
    ],
    "velocity": {
      "avgDaysInPipeline": 28,
      "fastestDeal": 7,
      "slowestDeal": 65
    },
    "forecast": {
      "weighted": 875000.00,
      "bestCase": 1250000.00,
      "worstCase": 450000.00
    }
  }
}
```

### Get Sales Funnel

```http
GET /analytics/crm/sales-funnel
```

### Get Forecast

```http
GET /analytics/crm/forecast
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| period | string | month/quarter/year |
| year | number | Forecast year |
| quarter | number | Forecast quarter (1-4) |

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "Q1 2024",
    "quota": {
      "total": 1500000.00,
      "achieved": 450000.00,
      "percentage": 30.0,
      "remaining": 1050000.00
    },
    "forecast": {
      "committed": 225000.00,
      "bestCase": 450000.00,
      "pipeline": 875000.00,
      "total": 1550000.00,
      "probability": 65.5
    },
    "byRep": [
      {
        "userId": "user_id",
        "name": "Ahmed Hassan",
        "quota": 300000.00,
        "achieved": 125000.00,
        "forecast": 320000.00,
        "performance": 106.7
      }
    ],
    "trend": {
      "lastQuarter": 1250000.00,
      "growth": 24.0
    }
  }
}
```

### Get Lead Source Analysis

```http
GET /analytics/crm/lead-sources
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sources": [
      {
        "source": "Website",
        "leads": 85,
        "qualified": 34,
        "converted": 12,
        "conversionRate": 14.1,
        "revenue": 180000.00,
        "costPerLead": 45.00,
        "roi": 4000.0
      },
      {
        "source": "Referral",
        "leads": 45,
        "qualified": 28,
        "converted": 15,
        "conversionRate": 33.3,
        "revenue": 225000.00,
        "roi": null
      },
      {
        "source": "LinkedIn",
        "leads": 62,
        "qualified": 18,
        "converted": 5,
        "conversionRate": 8.1,
        "revenue": 75000.00,
        "costPerLead": 125.00,
        "roi": 1200.0
      }
    ],
    "recommendations": [
      "Increase investment in Referral program",
      "Optimize LinkedIn targeting"
    ]
  }
}
```

### Get Win/Loss Analysis

```http
GET /analytics/crm/win-loss
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalDeals": 20,
      "won": 12,
      "lost": 8,
      "winRate": 60.0,
      "avgWonValue": 37500.00,
      "avgLostValue": 28000.00
    },
    "winReasons": [
      { "reason": "Price competitive", "count": 5, "percentage": 41.7 },
      { "reason": "Better features", "count": 4, "percentage": 33.3 },
      { "reason": "Relationship", "count": 3, "percentage": 25.0 }
    ],
    "lossReasons": [
      { "reason": "Price too high", "count": 3, "percentage": 37.5 },
      { "reason": "Competitor selected", "count": 3, "percentage": 37.5 },
      { "reason": "No decision", "count": 2, "percentage": 25.0 }
    ],
    "competitors": [
      { "competitor": "Competitor A", "losses": 2, "avgDealSize": 35000 },
      { "competitor": "Competitor B", "losses": 1, "avgDealSize": 28000 }
    ],
    "byStage": {
      "lostAtProposal": 3,
      "lostAtNegotiation": 5
    }
  }
}
```

### Get Activity Report

```http
GET /analytics/crm/activity
```

### Get Team Performance

```http
GET /analytics/crm/team-performance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "team": {
      "totalReps": 8,
      "totalQuota": 2400000.00,
      "totalAchieved": 720000.00,
      "avgPerformance": 75.0
    },
    "leaderboard": [
      {
        "rank": 1,
        "userId": "user_id",
        "name": "Sara Ahmed",
        "quota": 300000.00,
        "achieved": 145000.00,
        "performance": 96.7,
        "deals": 5,
        "winRate": 71.4
      },
      {
        "rank": 2,
        "userId": "user_id",
        "name": "Mohammed Ali",
        "quota": 350000.00,
        "achieved": 125000.00,
        "performance": 89.3,
        "deals": 4,
        "winRate": 66.7
      }
    ],
    "activityMetrics": {
      "topCaller": { "name": "Ahmed Hassan", "calls": 156 },
      "topEmailer": { "name": "Sara Ahmed", "emails": 245 },
      "topMeetings": { "name": "Mohammed Ali", "meetings": 28 }
    }
  }
}
```

### Get Territory Analysis

```http
GET /analytics/crm/territory
```

### Get Campaign ROI

```http
GET /analytics/crm/campaign-roi
```

### Get Conversion Rates

```http
GET /analytics/crm/conversion-rates
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | date | Start date |
| endDate | date | End date |
| groupBy | string | source/stage/rep/territory |

### Get Cohort Analysis

```http
GET /analytics/crm/cohort
```

### Get Revenue Analytics

```http
GET /analytics/crm/revenue
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | date | Start date |
| endDate | date | End date |
| period | string | daily/weekly/monthly |

### Get Forecast Accuracy

```http
GET /analytics/crm/forecast-accuracy
```

---

## Analytics Reports

Custom report builder with scheduling, export, and dashboard capabilities.

### Base URL: `/api/hr/analytics-reports`

### Report Sections

| Section | Description | Categories |
|---------|-------------|------------|
| `hr` | Human Resources | employee_data, payroll, attendance, performance, recruitment, training, benefits, compliance |
| `finance` | Financial | invoices, expenses, payments, budgets, cash_flow, profitability |
| `tasks` | Productivity | task_completion, time_tracking, project_progress, utilization |
| `crm` | Customer Relations | leads, pipeline, conversion, retention, communication |
| `sales` | Sales | sales_performance, revenue, forecasting, win_loss |
| `general` | General | cross-functional reports |
| `custom` | Custom | user-defined reports |

### Get Report Statistics

```http
GET /hr/analytics-reports/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bySection": [
      { "section": "hr", "count": 15, "scheduled": 5, "templates": 8, "totalRuns": 450, "totalViews": 1250 },
      { "section": "finance", "count": 12, "scheduled": 4, "templates": 6, "totalRuns": 380, "totalViews": 980 },
      { "section": "tasks", "count": 8, "scheduled": 2, "templates": 4, "totalRuns": 220, "totalViews": 560 },
      { "section": "crm", "count": 10, "scheduled": 3, "templates": 5, "totalRuns": 290, "totalViews": 750 }
    ],
    "totals": {
      "reports": 45,
      "scheduled": 14,
      "templates": 23,
      "runs": 1340,
      "views": 3540
    }
  }
}
```

### Get Favorite Reports

```http
GET /hr/analytics-reports/favorites
```

### Get Pinned Reports

```http
GET /hr/analytics-reports/pinned
```

### Get Report Templates

```http
GET /hr/analytics-reports/templates
```

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "_id": "template_id",
        "reportId": "RPT-HR-00001",
        "name": "Monthly Payroll Summary",
        "nameAr": "ملخص الرواتب الشهري",
        "section": "hr",
        "category": "payroll",
        "description": "Comprehensive monthly payroll report with GOSI contributions",
        "isTemplate": true,
        "hrConfig": {
          "category": "payroll",
          "payrollConfig": {
            "includeDeductions": true,
            "includeAllowances": true,
            "includeGOSI": true,
            "groupByDepartment": true
          }
        }
      },
      {
        "_id": "template_id",
        "reportId": "RPT-HR-00002",
        "name": "Saudization Report",
        "nameAr": "تقرير السعودة",
        "section": "hr",
        "category": "compliance",
        "description": "Nitaqat compliance and Saudization tracking",
        "hrConfig": {
          "category": "compliance",
          "complianceConfig": {
            "saudizationReport": true,
            "laborLawCompliance": true
          }
        }
      }
    ]
  }
}
```

### Get Reports by Section

```http
GET /hr/analytics-reports/section/:section
```

### Get All Reports

```http
GET /hr/analytics-reports
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| section | string | hr/finance/tasks/crm/sales |
| category | string | Filter by category |
| status | string | draft/active/archived |
| isTemplate | boolean | Filter templates |
| search | string | Search in name/description |
| page | number | Page number |
| limit | number | Items per page |

### Get Single Report

```http
GET /hr/analytics-reports/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "report_id",
    "reportId": "RPT-HR-00015",
    "name": "Employee Attendance Report",
    "nameAr": "تقرير الحضور",
    "description": "Monthly attendance tracking with overtime and leave",
    "section": "hr",
    "category": "attendance",
    "reportType": "standard",
    "hrConfig": {
      "category": "attendance",
      "attendanceConfig": {
        "includeOvertime": true,
        "includeLateArrivals": true,
        "includeEarlyDepartures": true,
        "includeAbsences": true,
        "includeLeaves": true,
        "attendanceThreshold": 90
      }
    },
    "columns": [
      { "field": "employeeName", "header": "Employee", "headerAr": "الموظف", "sortable": true },
      { "field": "department", "header": "Department", "headerAr": "القسم" },
      { "field": "daysPresent", "header": "Days Present", "format": "number" },
      { "field": "daysAbsent", "header": "Days Absent", "format": "number" },
      { "field": "overtimeHours", "header": "Overtime Hours", "format": "number", "aggregation": "sum" },
      { "field": "attendanceRate", "header": "Attendance %", "format": "percentage" }
    ],
    "charts": [
      {
        "chartId": "attendance_trend",
        "type": "line",
        "title": "Attendance Trend",
        "dataSource": "daily_attendance",
        "xAxis": { "field": "date", "type": "time" },
        "yAxis": { "field": "rate", "format": "percentage" }
      },
      {
        "chartId": "by_department",
        "type": "bar",
        "title": "Attendance by Department",
        "dataSource": "department_summary"
      }
    ],
    "kpiCards": [
      {
        "cardId": "avg_attendance",
        "title": "Average Attendance",
        "format": "percentage",
        "icon": "users",
        "trend": { "direction": "up", "percentage": 2.5, "isPositive": true }
      }
    ],
    "filters": [
      { "filterId": "department", "field": "department", "label": "Department", "type": "multiselect" },
      { "filterId": "dateRange", "field": "date", "label": "Date Range", "type": "daterange" }
    ],
    "dateRange": {
      "type": "this_month"
    },
    "schedule": {
      "enabled": true,
      "frequency": "monthly",
      "time": "08:00",
      "dayOfMonth": 1,
      "recipients": [
        { "email": "hr@company.com", "name": "HR Team", "type": "to" }
      ],
      "format": "pdf",
      "lastRun": "2024-01-01T08:00:00Z",
      "nextRun": "2024-02-01T08:00:00Z"
    },
    "exportConfig": {
      "formats": ["pdf", "excel", "csv"],
      "defaultFormat": "pdf",
      "includeCharts": true,
      "paperSize": "A4",
      "orientation": "landscape"
    },
    "status": "active",
    "isFavorite": true,
    "isPinned": false,
    "runCount": 45,
    "viewCount": 128,
    "lastRunAt": "2024-01-15T10:30:00Z"
  }
}
```

### Create Report

```http
POST /hr/analytics-reports
```

**Request Body:**
```json
{
  "name": "Custom Payroll Analysis",
  "nameAr": "تحليل الرواتب المخصص",
  "description": "Custom payroll analysis with department breakdown",
  "section": "hr",
  "category": "payroll",
  "reportType": "custom",
  "hrConfig": {
    "category": "payroll",
    "employeeFilters": {
      "departments": ["dept_id_1", "dept_id_2"],
      "statuses": ["active"]
    },
    "payrollConfig": {
      "includeDeductions": true,
      "includeAllowances": true,
      "includeGOSI": true,
      "groupByDepartment": true,
      "showNetVsGross": true
    }
  },
  "columns": [
    { "field": "employeeName", "header": "Employee", "sortable": true },
    { "field": "basicSalary", "header": "Basic Salary", "format": "currency" },
    { "field": "allowances", "header": "Allowances", "format": "currency" },
    { "field": "deductions", "header": "Deductions", "format": "currency" },
    { "field": "netSalary", "header": "Net Salary", "format": "currency", "aggregation": "sum" }
  ],
  "charts": [
    {
      "chartId": "salary_distribution",
      "type": "pie",
      "title": "Salary Distribution by Department",
      "dataSource": "department_totals"
    }
  ],
  "dateRange": {
    "type": "last_month"
  }
}
```

### Create Report from Template

```http
POST /hr/analytics-reports/from-template/:templateId
```

**Request Body:**
```json
{
  "name": "Q1 2024 Payroll Summary",
  "dateRange": {
    "type": "custom",
    "startDate": "2024-01-01",
    "endDate": "2024-03-31"
  },
  "hrConfig": {
    "employeeFilters": {
      "departments": ["dept_id"]
    }
  }
}
```

### Update Report

```http
PATCH /hr/analytics-reports/:id
```

### Delete Report

```http
DELETE /hr/analytics-reports/:id
```

### Bulk Delete Reports

```http
POST /hr/analytics-reports/bulk-delete
```

**Request Body:**
```json
{
  "reportIds": ["id1", "id2", "id3"]
}
```

### Run Report

```http
POST /hr/analytics-reports/:id/run
```

Executes the report and returns results.

**Response:**
```json
{
  "success": true,
  "data": {
    "reportId": "RPT-HR-00015",
    "executedAt": "2024-01-16T10:30:00Z",
    "executionTime": 1250,
    "parameters": {
      "dateRange": {
        "start": "2024-01-01",
        "end": "2024-01-31"
      }
    },
    "results": {
      "summary": {
        "totalEmployees": 145,
        "avgAttendance": 92.4,
        "totalOvertimeHours": 456,
        "totalAbsences": 89
      },
      "data": [
        {
          "employeeId": "emp_id",
          "employeeName": "Mohammed Ali",
          "department": "Engineering",
          "daysPresent": 22,
          "daysAbsent": 1,
          "overtimeHours": 8,
          "attendanceRate": 95.7
        }
      ],
      "charts": {
        "attendance_trend": {
          "labels": ["Week 1", "Week 2", "Week 3", "Week 4"],
          "data": [94.2, 91.8, 93.5, 90.1]
        },
        "by_department": {
          "labels": ["Engineering", "Sales", "HR", "Marketing"],
          "data": [95.2, 89.5, 92.8, 91.3]
        }
      },
      "kpis": {
        "avg_attendance": {
          "value": 92.4,
          "trend": { "direction": "up", "change": 2.5 }
        }
      }
    },
    "pagination": {
      "total": 145,
      "page": 1,
      "pages": 6,
      "limit": 25
    }
  }
}
```

### Clone Report

```http
POST /hr/analytics-reports/:id/clone
```

**Request Body:**
```json
{
  "name": "Employee Attendance Report (Copy)"
}
```

### Export Report

```http
POST /hr/analytics-reports/:id/export
```

**Request Body:**
```json
{
  "format": "pdf",
  "includeCharts": true,
  "dateRange": {
    "type": "last_month"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "/api/hr/downloads/report_abc123.pdf",
    "expiresAt": "2024-01-16T11:30:00Z",
    "fileSize": 245678,
    "format": "pdf"
  }
}
```

### Toggle Favorite

```http
POST /hr/analytics-reports/:id/favorite
```

### Toggle Pinned

```http
POST /hr/analytics-reports/:id/pin
```

### Schedule Report

```http
POST /hr/analytics-reports/:id/schedule
```

**Request Body:**
```json
{
  "enabled": true,
  "frequency": "monthly",
  "time": "08:00",
  "timezone": "Asia/Riyadh",
  "dayOfMonth": 1,
  "recipients": [
    { "email": "hr@company.com", "name": "HR Team", "type": "to" },
    { "email": "cfo@company.com", "name": "CFO", "type": "cc" }
  ],
  "format": "pdf",
  "includeCharts": true,
  "emailSubject": "Monthly Attendance Report - {{month}} {{year}}",
  "emailBody": "Please find attached the monthly attendance report."
}
```

### Unschedule Report

```http
DELETE /hr/analytics-reports/:id/schedule
```

---

## Custom Reports

General-purpose report builder.

### Base URL: `/api/reports`

### Validate Report

```http
POST /reports/validate
```

Validates report configuration before creation.

**Request Body:**
```json
{
  "name": "Test Report",
  "section": "hr",
  "category": "attendance",
  "dataSource": {
    "type": "collection",
    "collection": "employees"
  },
  "columns": [
    { "field": "name", "header": "Name" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "warnings": [],
    "errors": []
  }
}
```

### List Reports

```http
GET /reports
```

### Create Report

```http
POST /reports
```

### Get Report

```http
GET /reports/:id
```

### Update Report

```http
PUT /reports/:id
```

### Delete Report

```http
DELETE /reports/:id
```

### Execute Report

```http
GET /reports/:id/execute
```

### Clone Report

```http
POST /reports/:id/clone
```

### Update Schedule

```http
PUT /reports/:id/schedule
```

### Export Report

```http
GET /reports/:id/export/:format
```

Supported formats: `pdf`, `excel`, `csv`, `json`, `html`

---

## Data Models Reference

### Chart Types

| Type | Description | Best For |
|------|-------------|----------|
| `bar` | Bar chart | Comparisons |
| `line` | Line chart | Trends |
| `pie` | Pie chart | Proportions |
| `donut` | Donut chart | Proportions with center |
| `area` | Area chart | Cumulative trends |
| `scatter` | Scatter plot | Correlations |
| `radar` | Radar/Spider | Multi-dimensional |
| `treemap` | Treemap | Hierarchical |
| `heatmap` | Heatmap | Density |
| `gauge` | Gauge | Single KPI |
| `funnel` | Funnel | Conversion |
| `waterfall` | Waterfall | Changes |
| `combo` | Combined | Multiple metrics |

### Column Formats

| Format | Description | Example |
|--------|-------------|---------|
| `text` | Plain text | "Mohammed Ali" |
| `number` | Numeric | 1,234 |
| `currency` | Currency (SAR) | SAR 1,234.00 |
| `percentage` | Percentage | 85.5% |
| `date` | Date | Jan 15, 2024 |
| `datetime` | Date and time | Jan 15, 2024 10:30 AM |
| `boolean` | Yes/No | Yes |
| `status` | Status badge | Active |
| `avatar` | Profile image | [Image] |
| `link` | Clickable link | View Details |
| `badge` | Colored badge | Platinum |

### Aggregation Functions

| Function | Description |
|----------|-------------|
| `sum` | Sum of values |
| `avg` | Average |
| `min` | Minimum value |
| `max` | Maximum value |
| `count` | Count of records |
| `none` | No aggregation |

### Schedule Frequencies

| Frequency | Description |
|-----------|-------------|
| `daily` | Every day |
| `weekly` | Every week |
| `biweekly` | Every two weeks |
| `monthly` | Every month |
| `quarterly` | Every quarter |
| `yearly` | Every year |
| `custom` | Custom cron expression |

---

## HR Report Categories

### Employee Data Reports

| Report | Description |
|--------|-------------|
| Headcount | Total employees by department, location, type |
| Demographics | Age, gender, nationality breakdown |
| Tenure Analysis | Years of service distribution |
| New Hires | Recent hires with onboarding status |
| Terminations | Departures with reasons |

### Payroll Reports

| Report | Description |
|--------|-------------|
| Payroll Summary | Monthly payroll totals |
| Salary Register | Employee-wise salary breakdown |
| GOSI Contributions | Social insurance report |
| Allowances Report | Housing, transport, other allowances |
| Deductions Report | Loans, advances, other deductions |

### Attendance Reports

| Report | Description |
|--------|-------------|
| Daily Attendance | Day-by-day attendance |
| Monthly Summary | Monthly attendance rates |
| Overtime Report | Overtime hours by employee |
| Late Arrivals | Tardiness tracking |
| Absence Report | Absence patterns |

### Performance Reports

| Report | Description |
|--------|-------------|
| Performance Ratings | Rating distribution |
| Goal Progress | OKR/goal completion rates |
| Competency Analysis | Skill gap analysis |
| Review Status | Pending/completed reviews |
| 9-Box Grid | Talent mapping |

### Compliance Reports

| Report | Description |
|--------|-------------|
| Saudization | Nitaqat compliance |
| GOSI Report | Insurance compliance |
| Document Expiry | Iqama, visa, permit tracking |
| Labor Law | Compliance checklist |
| WPS Status | Wage protection compliance |

---

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `REPORT_NOT_FOUND` | Report not found | Invalid report ID |
| `INVALID_SECTION` | Invalid report section | Unknown section |
| `INVALID_CATEGORY` | Invalid category for section | Category mismatch |
| `EXECUTION_FAILED` | Report execution failed | Query error |
| `EXPORT_FAILED` | Export failed | File generation error |
| `SCHEDULE_INVALID` | Invalid schedule configuration | Bad schedule params |
| `PERMISSION_DENIED` | Insufficient permissions | Access denied |
| `RATE_LIMITED` | Too many requests | Slow down |

---

## Best Practices

### Report Design
1. Start with templates for common reports
2. Use appropriate chart types for data
3. Include KPI cards for quick insights
4. Add drill-down for detailed analysis
5. Test with real data before scheduling

### Performance
1. Limit date ranges for large datasets
2. Use pagination for table reports
3. Enable caching for frequently-run reports
4. Schedule heavy reports during off-hours
5. Archive old reports periodically

### Scheduling
1. Stagger scheduled reports
2. Use appropriate time zones
3. Keep recipient lists current
4. Monitor delivery success
5. Set up failure alerts

---

*Document Version: 1.0*
*Last Updated: January 2024*
*Total Endpoints: 50+*
