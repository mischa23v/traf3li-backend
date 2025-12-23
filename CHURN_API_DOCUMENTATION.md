# Churn Management API Documentation

## Overview

The Churn Management API provides comprehensive endpoints for customer churn prediction, tracking, and intervention management. This system helps identify at-risk customers, track churn events, and manage retention interventions.

## Base URL

```
/api/churn
```

## Authentication

All endpoints require authentication via bearer token and admin/manager role access.

**Required Roles:**
- `admin` - Full access to all endpoints
- `owner` - Full access to all endpoints
- `manager` - Read access and intervention management

## Rate Limiting

Standard API rate limits apply:
- Authenticated users: 400 requests/minute
- Admin endpoints: 100 requests/minute

---

## Health Score Endpoints

### 1. Get Firm's Current Health Score

Get the current health score for a specific firm.

**Endpoint:** `GET /api/churn/health-score/:firmId`

**Parameters:**
- `firmId` (path, required) - Firm ID

**Response:**
```json
{
  "success": true,
  "data": {
    "firmId": "507f1f77bcf86cd799439011",
    "score": 75,
    "tier": "medium_risk",
    "factors": {
      "usage": { "score": 80, "weight": 0.3, "trend": "stable" },
      "engagement": { "score": 70, "weight": 0.25, "trend": "declining" },
      "support": { "score": 60, "weight": 0.15, "trend": "stable" },
      "payment": { "score": 90, "weight": 0.2, "trend": "improving" },
      "tenure": { "score": 85, "weight": 0.1, "trend": "stable" }
    },
    "lastCalculated": "2024-01-15T10:30:00Z",
    "nextCalculation": "2024-01-16T10:30:00Z",
    "recommendedActions": [
      {
        "type": "engagement",
        "priority": "high",
        "action": "Schedule check-in call",
        "reason": "Engagement declining over last 30 days"
      }
    ]
  }
}
```

### 2. Get Historical Health Scores

Retrieve historical health scores for trend analysis.

**Endpoint:** `GET /api/churn/health-score/:firmId/history`

**Parameters:**
- `firmId` (path, required) - Firm ID
- `days` (query, optional) - Number of days (7-365, default: 90)

**Response:**
```json
{
  "success": true,
  "data": {
    "firmId": "507f1f77bcf86cd799439011",
    "period": {
      "days": 90,
      "from": "2023-10-17T00:00:00Z",
      "to": "2024-01-15T00:00:00Z"
    },
    "history": [
      {
        "date": "2023-10-17T00:00:00Z",
        "score": 72,
        "tier": "medium_risk",
        "factors": {
          "usage": 75,
          "engagement": 68,
          "support": 62,
          "payment": 88,
          "tenure": 82
        }
      }
    ],
    "trends": {
      "overall": "stable",
      "usage": "declining",
      "engagement": "declining"
    }
  }
}
```

### 3. Recalculate Health Score

Force immediate recalculation of health score.

**Endpoint:** `POST /api/churn/health-score/:firmId/recalculate`

**Access:** Admin only

**Parameters:**
- `firmId` (path, required) - Firm ID

**Request Body:**
```json
{
  "force": true,
  "recalculateFactors": ["usage", "engagement"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Health score recalculated successfully",
  "messageAr": "تم إعادة حساب درجة الصحة بنجاح",
  "data": {
    "firmId": "507f1f77bcf86cd799439011",
    "score": 72,
    "tier": "medium_risk",
    "previousScore": 75,
    "change": -3,
    "calculatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 4. Get At-Risk Firms

List firms by risk tier with filtering and sorting.

**Endpoint:** `GET /api/churn/at-risk`

**Query Parameters:**
- `tier` (optional) - Filter by tier: `critical`, `high_risk`, `medium_risk`, `low_risk`
- `minScore` (optional) - Minimum score filter (0-100)
- `maxScore` (optional) - Maximum score filter (0-100)
- `sortBy` (optional) - Sort field: `score`, `lastActivity`, `mrr`, `tenure`, `companyName`
- `sortOrder` (optional) - Sort order: `asc`, `desc`
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (1-100, default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "firmId": "507f1f77bcf86cd799439011",
      "companyName": "Example Law Firm",
      "score": 45,
      "tier": "high_risk",
      "mrr": 5000,
      "tenure": 24,
      "lastActivity": "2024-01-01T00:00:00Z",
      "primaryRisk": "engagement",
      "interventionStatus": "pending",
      "assignedCSM": "John Doe"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  },
  "summary": {
    "critical": 5,
    "high_risk": 15,
    "medium_risk": 25,
    "low_risk": 0,
    "totalMRRatRisk": 225000
  }
}
```

---

## Churn Event Endpoints

### 5. Record Churn Event

Record a churn, downgrade, or pause event.

**Endpoint:** `POST /api/churn/events`

**Access:** Admin, Manager

**Request Body:**
```json
{
  "firmId": "507f1f77bcf86cd799439011",
  "eventType": "churn",
  "reason": "Switched to competitor",
  "reasonCategory": "competitor",
  "notes": "Customer cited better pricing and features",
  "exitSurveyCompleted": true,
  "lostMRR": 5000,
  "downgradeToPlan": null
}
```

**Event Types:**
- `churn` - Customer canceled
- `downgrade` - Reduced plan tier
- `pause` - Temporary suspension
- `reactivation` - Customer returned

**Reason Categories:**
- `price` - Pricing concerns
- `features` - Missing or inadequate features
- `support` - Support issues
- `usability` - UX/usability problems
- `competitor` - Switched to competitor
- `business_closure` - Business shut down
- `other` - Other reasons

**Response:**
```json
{
  "success": true,
  "message": "Churn event recorded successfully",
  "messageAr": "تم تسجيل حدث الإلغاء بنجاح",
  "data": {
    "_id": "507f1f77bcf86cd799439999",
    "firmId": "507f1f77bcf86cd799439011",
    "eventType": "churn",
    "reason": "Switched to competitor",
    "reasonCategory": "competitor",
    "lostMRR": 5000,
    "recordedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 6. Get Churn Events

List churn events with filtering.

**Endpoint:** `GET /api/churn/events`

**Query Parameters:**
- `eventType` (optional) - Filter by event type
- `reasonCategory` (optional) - Filter by reason category
- `startDate` (optional) - Start date filter
- `endDate` (optional) - End date filter
- `firmId` (optional) - Filter by firm
- `page`, `limit` - Pagination

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439999",
      "firmId": "507f1f77bcf86cd799439011",
      "companyName": "Example Law Firm",
      "eventType": "churn",
      "reason": "Switched to competitor",
      "reasonCategory": "competitor",
      "lostMRR": 5000,
      "recordedAt": "2024-01-15T10:30:00Z",
      "exitSurveyCompleted": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

### 7. Update Churn Reason

Update churn reason after exit survey.

**Endpoint:** `PUT /api/churn/events/:id/reason`

**Request Body:**
```json
{
  "reason": "Updated reason after exit survey",
  "reasonCategory": "price",
  "notes": "Customer indicated pricing was main concern"
}
```

### 8. Record Exit Survey

Submit exit survey responses for a churn event.

**Endpoint:** `POST /api/churn/events/:id/exit-survey`

**Request Body:**
```json
{
  "responses": {
    "satisfaction": 3,
    "likelihood_to_recommend": 4,
    "primary_reason": "price",
    "feature_gaps": ["mobile_app", "advanced_reporting"],
    "would_return": true,
    "additional_feedback": "Great product, just too expensive for our needs"
  }
}
```

---

## Analytics Endpoints

### 9. Dashboard Metrics

Get comprehensive churn dashboard metrics.

**Endpoint:** `GET /api/churn/analytics/dashboard`

**Query Parameters:**
- `period` (optional) - Days to analyze (7-365, default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "days": 30,
      "from": "2023-12-16T00:00:00Z",
      "to": "2024-01-15T00:00:00Z"
    },
    "churnRate": {
      "current": 5.2,
      "previous": 6.1,
      "change": -0.9,
      "trend": "improving"
    },
    "mrrChurnRate": {
      "current": 4.8,
      "previous": 5.5,
      "change": -0.7,
      "trend": "improving"
    },
    "customersAtRisk": {
      "total": 45,
      "critical": 5,
      "high": 15,
      "medium": 25,
      "totalMRR": 225000
    },
    "interventions": {
      "active": 12,
      "completed": 8,
      "successRate": 62.5
    }
  }
}
```

### 10. Churn Rate Analysis

Get churn rate trends over time.

**Endpoint:** `GET /api/churn/analytics/rate`

**Query Parameters:**
- `groupBy` (optional) - Group by: `day`, `week`, `month`, `quarter` (default: month)
- `startDate` (optional) - Start date
- `endDate` (optional) - End date
- `includeDowngrades` (optional) - Include downgrades (default: true)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "groupBy": "month",
      "from": "2024-01-01",
      "to": "2024-04-30"
    },
    "timeline": [
      {
        "period": "2024-01",
        "customerChurnRate": 4.5,
        "mrrChurnRate": 4.2,
        "churned": 12,
        "downgraded": 3
      }
    ],
    "averages": {
      "customerChurnRate": 5.15,
      "mrrChurnRate": 4.78,
      "monthlyChurns": 14.25
    }
  }
}
```

### 11. Churn Reasons Breakdown

Analyze churn reasons and patterns.

**Endpoint:** `GET /api/churn/analytics/reasons`

**Query Parameters:**
- `startDate` (optional)
- `endDate` (optional)
- `eventType` (optional) - default: `churn`

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "from": "2024-01-01",
      "to": "2024-04-30"
    },
    "reasons": [
      {
        "category": "competitor",
        "count": 45,
        "percentage": 28.1,
        "mrrLost": 135000,
        "topReasons": [
          "Switched to cheaper competitor",
          "Better features elsewhere"
        ]
      }
    ],
    "summary": {
      "totalChurns": 160,
      "totalMRRLost": 422500,
      "topCategory": "competitor"
    }
  }
}
```

### 12. Cohort Analysis

Analyze retention by customer cohorts.

**Endpoint:** `GET /api/churn/analytics/cohorts`

**Query Parameters:**
- `cohortBy` (optional) - Group by: `month`, `quarter`, `year` (default: month)
- `periods` (optional) - Number of periods (3-24, default: 12)

**Response:**
```json
{
  "success": true,
  "data": {
    "cohortBy": "month",
    "periods": 12,
    "cohorts": [
      {
        "cohort": "2024-01",
        "size": 120,
        "retention": [100, 95, 92, 88, 85, 82, 80, 78, 76, 74, 72, 70],
        "ltv": 45000,
        "churnedCount": 36
      }
    ],
    "averageRetention": {
      "month1": 100,
      "month3": 93.5,
      "month6": 86.75,
      "month12": 71
    }
  }
}
```

### 13. Revenue at Risk

Calculate revenue at risk from at-risk customers.

**Endpoint:** `GET /api/churn/analytics/revenue-at-risk`

**Query Parameters:**
- `includeProjections` (optional) - Include future projections (default: true)

**Response:**
```json
{
  "success": true,
  "data": {
    "current": {
      "critical": { "customers": 5, "mrr": 25000, "arr": 300000 },
      "high": { "customers": 15, "mrr": 75000, "arr": 900000 },
      "medium": { "customers": 25, "mrr": 125000, "arr": 1500000 },
      "total": { "customers": 45, "mrr": 225000, "arr": 2700000 }
    },
    "projections": {
      "next30Days": { "expectedChurns": 3, "projectedMRRLoss": 15000 },
      "next60Days": { "expectedChurns": 6, "projectedMRRLoss": 28000 },
      "next90Days": { "expectedChurns": 9, "projectedMRRLoss": 42000 }
    },
    "bySegment": [
      {
        "segment": "Enterprise",
        "customers": 2,
        "mrr": 50000,
        "churnProbability": 0.15
      }
    ]
  }
}
```

---

## Intervention Endpoints

### 14. Get Intervention History

View intervention history for a firm.

**Endpoint:** `GET /api/churn/interventions/:firmId`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439100",
      "firmId": "507f1f77bcf86cd799439011",
      "type": "outreach_call",
      "triggeredBy": "health_score_drop",
      "triggeredAt": "2024-01-01T10:00:00Z",
      "assignedTo": "John Doe",
      "status": "completed",
      "outcome": "positive",
      "healthScoreBefore": 65,
      "healthScoreAfter": 75,
      "completedAt": "2024-01-05T10:00:00Z"
    }
  ],
  "summary": {
    "total": 2,
    "completed": 2,
    "positive": 2,
    "averageScoreImprovement": 8.5
  }
}
```

### 15. Trigger Intervention

Manually trigger a retention intervention.

**Endpoint:** `POST /api/churn/interventions/:firmId/trigger`

**Access:** Admin, Manager

**Request Body:**
```json
{
  "type": "outreach_call",
  "assignedTo": "John Doe",
  "priority": "high",
  "notes": "Customer showing signs of disengagement",
  "scheduledFor": "2024-01-20T14:00:00Z"
}
```

**Intervention Types:**
- `outreach_call` - Personal check-in call
- `check_in_email` - Automated or personal email
- `feature_training` - Product training session
- `account_review` - Business review meeting
- `executive_engagement` - Executive-level engagement
- `discount_offer` - Retention discount offer
- `custom` - Custom intervention

**Response:**
```json
{
  "success": true,
  "message": "Intervention triggered successfully",
  "messageAr": "تم تفعيل التدخل بنجاح",
  "data": {
    "_id": "507f1f77bcf86cd799439102",
    "firmId": "507f1f77bcf86cd799439011",
    "type": "outreach_call",
    "status": "pending",
    "triggeredAt": "2024-01-15T10:30:00Z"
  }
}
```

### 16. Intervention Statistics

Get intervention success metrics.

**Endpoint:** `GET /api/churn/interventions/stats`

**Query Parameters:**
- `startDate` (optional)
- `endDate` (optional)
- `groupBy` (optional) - Group by: `type`, `outcome`, `assignee`

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "total": 156,
      "completed": 124,
      "successRate": 68.5,
      "averageScoreImprovement": 7.2
    },
    "byType": [
      {
        "type": "outreach_call",
        "count": 45,
        "completed": 38,
        "successRate": 71.1,
        "averageScoreImprovement": 8.5
      }
    ],
    "savedRevenue": {
      "total": 420000,
      "average": 3387
    }
  }
}
```

---

## Report Endpoints

### 17. Generate Report

Generate comprehensive churn reports.

**Endpoint:** `GET /api/churn/reports/generate`

**Access:** Admin only

**Query Parameters:**
- `reportType` (optional) - Type: `comprehensive`, `executive`, `detailed`, `trends`
- `startDate` (optional)
- `endDate` (optional)
- `format` (optional) - Format: `json`, `pdf`, `csv`, `xlsx`

**Response (JSON format):**
```json
{
  "success": true,
  "data": {
    "type": "comprehensive",
    "generatedAt": "2024-01-15T10:30:00Z",
    "period": {
      "from": "2024-01-01",
      "to": "2024-01-31"
    },
    "summary": {
      "totalCustomers": 285,
      "churned": 15,
      "churnRate": 5.3,
      "revenueAtRisk": 225000
    }
  }
}
```

**Response (File formats):**
```json
{
  "success": true,
  "message": "Report generation started. Format: pdf",
  "data": {
    "downloadUrl": "/api/downloads/churn-report-123.pdf",
    "expiresAt": "2024-01-16T10:30:00Z"
  }
}
```

### 18. Export At-Risk List

Export at-risk customers to file.

**Endpoint:** `GET /api/churn/reports/at-risk-export`

**Query Parameters:**
- `tier` (optional) - Filter by tier
- `minScore` (optional) - Minimum score
- `format` (optional) - Format: `csv`, `xlsx`, `json`

**Response:**
```json
{
  "success": true,
  "message": "Export generated successfully",
  "messageAr": "تم إنشاء التصدير بنجاح",
  "data": {
    "generatedAt": "2024-01-15T10:30:00Z",
    "count": 45,
    "downloadUrl": "/api/downloads/at-risk-customers.csv",
    "expiresAt": "2024-01-16T10:30:00Z"
  }
}
```

### 19. Executive Summary

Get high-level executive summary.

**Endpoint:** `GET /api/churn/reports/executive-summary`

**Access:** Admin only

**Query Parameters:**
- `period` (optional) - Days to analyze (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "days": 30,
      "from": "2023-12-16T00:00:00Z",
      "to": "2024-01-15T00:00:00Z"
    },
    "keyMetrics": {
      "churnRate": { "value": 5.2, "change": -0.9, "trend": "improving" },
      "customersAtRisk": { "value": 45, "change": 5, "trend": "worsening" },
      "revenueAtRisk": { "value": 225000, "change": 15000, "trend": "worsening" }
    },
    "alerts": [
      {
        "level": "critical",
        "message": "5 enterprise customers at critical risk",
        "action": "Immediate executive engagement required"
      }
    ],
    "topActions": [
      "Schedule calls with 5 critical-risk enterprise customers",
      "Review pricing concerns from exit surveys"
    ],
    "wins": [
      "Churn rate decreased 14.8% vs last period",
      "12 successful interventions prevented $84K MRR loss"
    ]
  }
}
```

---

## Error Responses

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message in English",
    "messageAr": "رسالة الخطأ بالعربية"
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` - Invalid request data
- `NOT_FOUND` - Resource not found
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `INTERNAL_ERROR` - Server error

---

## Rate Limiting Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 400
X-RateLimit-Remaining: 399
X-RateLimit-Reset: 1642234567
```

---

## Implementation Notes

### Database Models Required

To fully implement this API, you'll need to create the following MongoDB models:

1. **HealthScore** - Store current health scores
2. **HealthScoreHistory** - Track historical scores
3. **ChurnEvent** - Record churn/downgrade events
4. **ExitSurvey** - Store exit survey responses
5. **Intervention** - Track retention interventions

### Calculation Logic

Health scores should be calculated based on:
- **Usage metrics** (30% weight) - Login frequency, feature usage
- **Engagement metrics** (25% weight) - Active users, session duration
- **Support metrics** (15% weight) - Ticket volume, satisfaction
- **Payment metrics** (20% weight) - Payment history, disputes
- **Tenure metrics** (10% weight) - Account age, stability

### Automation Opportunities

Consider implementing:
- Scheduled health score calculations (daily)
- Automated intervention triggers based on thresholds
- Email notifications for critical-risk customers
- Integration with CRM for customer success teams

---

## Support

For issues or questions about the Churn Management API, contact the development team.

**Last Updated:** January 2024
