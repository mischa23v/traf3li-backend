# HR API Documentation - Part 11: Surveys, Compliance & Self-Service

## Overview

This document covers Employee Surveys, Saudi Arabia Compliance Dashboard, Who's Out Calendar, and Employee Self-Service Portal APIs.

**Base URL:** `/api/hr`

**Authentication:** All endpoints require JWT Bearer token.

---

## Table of Contents

1. [Employee Surveys](#employee-surveys)
2. [Compliance Dashboard](#compliance-dashboard)
3. [Who's Out Calendar](#whos-out-calendar)
4. [Employee Self-Service Portal](#employee-self-service-portal)

---

## Employee Surveys

Enterprise survey system for employee engagement, pulse checks, exit interviews, and 360-degree feedback.

### Survey Types

| Type | Description | Use Case |
|------|-------------|----------|
| `engagement` | Annual/semi-annual engagement surveys | Measure overall employee engagement |
| `pulse` | Quick pulse checks | Frequent mood/sentiment tracking |
| `onboarding` | New hire surveys | 30/60/90 day feedback |
| `exit` | Exit interviews | Departing employee feedback |
| `360_feedback` | 360-degree feedback | Multi-rater performance feedback |
| `satisfaction` | General satisfaction | Job/role satisfaction |
| `culture` | Culture assessment | Organizational culture evaluation |
| `custom` | Custom surveys | Ad-hoc questionnaires |

### Question Types

| Type | Description | Response Format |
|------|-------------|-----------------|
| `rating` | 1-5 or 1-10 scale | Number |
| `nps` | Net Promoter Score (0-10) | Number |
| `multiple_choice` | Single select | String |
| `checkbox` | Multi select | Array of strings |
| `text` | Free text | String |
| `yes_no` | Yes/No | Boolean |
| `scale` | Custom Likert scale | Number with labels |
| `ranking` | Rank items | Array of strings |
| `matrix` | Grid/matrix questions | Object |
| `date` | Date picker | Date string |

### Question Categories

```
engagement, satisfaction, culture, leadership, growth, compensation,
work_life_balance, communication, teamwork, recognition, diversity,
safety, onboarding, exit, custom
```

---

### Survey Templates

#### Get All Survey Templates

```http
GET /surveys/templates
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| surveyType | string | Filter by type |
| isActive | boolean | Filter by active status |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "_id": "template_id",
        "templateId": "STPL-0001",
        "name": "Annual Engagement Survey",
        "nameAr": "استبيان المشاركة السنوي",
        "description": "Comprehensive annual employee engagement survey",
        "surveyType": "engagement",
        "questions": [
          {
            "questionId": "Q1",
            "questionText": "How likely are you to recommend this company as a place to work?",
            "questionTextAr": "ما مدى احتمالية أن توصي بهذه الشركة كمكان للعمل؟",
            "questionType": "nps",
            "category": "engagement",
            "scaleConfig": {
              "min": 0,
              "max": 10,
              "minLabel": "Not at all likely",
              "maxLabel": "Extremely likely"
            },
            "required": true,
            "order": 1
          },
          {
            "questionId": "Q2",
            "questionText": "I am satisfied with my job",
            "questionType": "scale",
            "category": "satisfaction",
            "options": [
              { "value": "1", "label": "Strongly Disagree", "weight": 1 },
              { "value": "2", "label": "Disagree", "weight": 2 },
              { "value": "3", "label": "Neutral", "weight": 3 },
              { "value": "4", "label": "Agree", "weight": 4 },
              { "value": "5", "label": "Strongly Agree", "weight": 5 }
            ],
            "required": true,
            "order": 2
          }
        ],
        "sections": [
          {
            "sectionId": "SEC1",
            "title": "Overall Engagement",
            "questionIds": ["Q1", "Q2"],
            "order": 1
          }
        ],
        "scoring": {
          "enabled": true,
          "maxScore": 100,
          "benchmarks": {
            "excellent": 80,
            "good": 60,
            "average": 40,
            "poor": 20
          }
        },
        "settings": {
          "allowAnonymous": true,
          "showProgressBar": true,
          "estimatedDuration": 15
        },
        "isActive": true,
        "isDefault": true
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "pages": 1
    }
  }
}
```

#### Get Single Survey Template

```http
GET /surveys/templates/:id
```

#### Create Survey Template

```http
POST /surveys/templates
```

**Request Body:**
```json
{
  "name": "Pulse Survey - Monthly",
  "nameAr": "استبيان النبض الشهري",
  "description": "Quick monthly pulse check",
  "surveyType": "pulse",
  "questions": [
    {
      "questionId": "P1",
      "questionText": "How are you feeling about work this month?",
      "questionType": "rating",
      "category": "satisfaction",
      "scaleConfig": { "min": 1, "max": 5 },
      "required": true,
      "order": 1
    },
    {
      "questionId": "P2",
      "questionText": "Any feedback or concerns?",
      "questionType": "text",
      "category": "custom",
      "required": false,
      "order": 2
    }
  ],
  "settings": {
    "allowAnonymous": true,
    "estimatedDuration": 2
  }
}
```

#### Update Survey Template

```http
PATCH /surveys/templates/:id
```

#### Delete Survey Template

```http
DELETE /surveys/templates/:id
```

---

### Survey Instances

#### Get Survey Statistics

```http
GET /surveys/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSurveys": 12,
    "activeSurveys": 3,
    "draftSurveys": 2,
    "closedSurveys": 7,
    "totalResponses": 856,
    "avgResponseRate": 78.5,
    "avgScore": 72.3,
    "surveysByType": {
      "engagement": 2,
      "pulse": 6,
      "exit": 3,
      "onboarding": 1
    },
    "recentActivity": [
      {
        "surveyId": "SRV-0012",
        "title": "Q4 Pulse Survey",
        "responseCount": 45,
        "lastResponseAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

#### Get My Surveys (Employee View)

```http
GET /surveys/my-surveys
```

Returns surveys assigned to the current employee that are pending completion.

**Response:**
```json
{
  "success": true,
  "data": {
    "pendingSurveys": [
      {
        "_id": "survey_id",
        "surveyId": "SRV-0015",
        "title": "January Pulse Survey",
        "surveyType": "pulse",
        "isAnonymous": true,
        "endDate": "2024-01-31T23:59:59Z",
        "estimatedDuration": 5,
        "status": "active"
      }
    ],
    "completedSurveys": [
      {
        "surveyId": "SRV-0012",
        "title": "Q4 Engagement Survey",
        "completedAt": "2024-01-10T14:20:00Z"
      }
    ]
  }
}
```

#### Get All Surveys (Admin View)

```http
GET /surveys
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | draft/scheduled/active/paused/closed/archived |
| surveyType | string | Filter by survey type |
| startDate | date | Filter by start date range |
| endDate | date | Filter by end date range |
| page | number | Page number |
| limit | number | Items per page |

#### Get Single Survey

```http
GET /surveys/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "survey_id",
    "surveyId": "SRV-0015",
    "title": "Q1 2024 Engagement Survey",
    "titleAr": "استبيان المشاركة للربع الأول 2024",
    "description": "Annual engagement survey for Q1",
    "surveyType": "engagement",
    "status": "active",
    "startDate": "2024-01-15T00:00:00Z",
    "endDate": "2024-01-31T23:59:59Z",
    "targetAudience": {
      "type": "all",
      "departments": [],
      "excludedEmployeeIds": []
    },
    "settings": {
      "isAnonymous": true,
      "showProgressBar": true,
      "allowSaveDraft": true,
      "notifyOnSubmission": true,
      "estimatedDuration": 15
    },
    "questions": [...],
    "statistics": {
      "totalInvited": 150,
      "totalResponses": 98,
      "completedResponses": 92,
      "partialResponses": 6,
      "responseRate": 65.3,
      "avgScore": 73.5,
      "medianScore": 75.0,
      "avgTimeSpentSeconds": 720
    },
    "npsAnalytics": {
      "npsScore": 35,
      "promoters": 45,
      "passives": 32,
      "detractors": 21,
      "promoterPercentage": 45.9,
      "passivePercentage": 32.7,
      "detractorPercentage": 21.4,
      "trend": "improving",
      "previousNpsScore": 28,
      "npsChange": 7
    },
    "enpsAnalytics": {
      "enpsScore": 32,
      "promoters": 42,
      "passives": 35,
      "detractors": 21
    },
    "sentimentAnalysis": {
      "overallSentiment": "positive",
      "sentimentScore": 0.45,
      "totalTextResponses": 78,
      "positiveCount": 52,
      "neutralCount": 18,
      "negativeCount": 8,
      "keyThemes": [
        { "theme": "Work-Life Balance", "count": 23, "sentiment": "positive" },
        { "theme": "Career Growth", "count": 18, "sentiment": "neutral" },
        { "theme": "Communication", "count": 15, "sentiment": "negative" }
      ],
      "wordCloud": [
        { "word": "supportive", "weight": 25 },
        { "word": "flexible", "weight": 22 },
        { "word": "growth", "weight": 18 }
      ]
    },
    "categoryScores": [
      {
        "category": "engagement",
        "avgScore": 4.2,
        "medianScore": 4.0,
        "favorabilityRate": 78.5,
        "trend": "up"
      },
      {
        "category": "satisfaction",
        "avgScore": 3.8,
        "medianScore": 4.0,
        "favorabilityRate": 72.0,
        "trend": "same"
      }
    ],
    "demographicAnalysis": {
      "byDepartment": [
        {
          "departmentName": "Engineering",
          "responseCount": 35,
          "avgScore": 76.5,
          "participationRate": 85.4
        }
      ],
      "byTenure": [
        { "tenure": "<1 year", "responseCount": 15, "avgScore": 80.2 },
        { "tenure": "1-3 years", "responseCount": 42, "avgScore": 73.1 },
        { "tenure": "3-5 years", "responseCount": 28, "avgScore": 71.5 },
        { "tenure": "5+ years", "responseCount": 13, "avgScore": 68.9 }
      ]
    }
  }
}
```

#### Create Survey

```http
POST /surveys
```

**Request Body:**
```json
{
  "templateId": "template_id",
  "title": "Q1 2024 Engagement Survey",
  "titleAr": "استبيان المشاركة للربع الأول 2024",
  "description": "Annual engagement survey",
  "surveyType": "engagement",
  "startDate": "2024-01-15T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z",
  "targetAudience": {
    "type": "department",
    "departments": ["dept_id_1", "dept_id_2"],
    "excludedEmployeeIds": []
  },
  "settings": {
    "isAnonymous": true,
    "showProgressBar": true,
    "allowSaveDraft": true,
    "notifyOnSubmission": true,
    "estimatedDuration": 15
  },
  "reminderFrequency": "weekly"
}
```

#### Update Survey

```http
PATCH /surveys/:id
```

#### Launch Survey

```http
POST /surveys/:id/launch
```

Transitions survey from `draft` to `active` status. Sends invitations to target audience.

**Response:**
```json
{
  "success": true,
  "message": "Survey launched successfully",
  "data": {
    "invitationsSent": 150,
    "startDate": "2024-01-15T00:00:00Z",
    "status": "active"
  }
}
```

#### Close Survey

```http
POST /surveys/:id/close
```

Closes the survey and finalizes results.

#### Delete Survey

```http
DELETE /surveys/:id
```

---

### Survey Responses

#### Submit Survey Response

```http
POST /surveys/:id/respond
```

**Request Body:**
```json
{
  "answers": [
    {
      "questionId": "Q1",
      "questionType": "nps",
      "rating": 9
    },
    {
      "questionId": "Q2",
      "questionType": "scale",
      "rating": 4
    },
    {
      "questionId": "Q3",
      "questionType": "multiple_choice",
      "selectedOptions": ["option_2"]
    },
    {
      "questionId": "Q4",
      "questionType": "checkbox",
      "selectedOptions": ["option_1", "option_3"]
    },
    {
      "questionId": "Q5",
      "questionType": "text",
      "textResponse": "Great work environment and supportive team!"
    },
    {
      "questionId": "Q6",
      "questionType": "ranking",
      "ranking": ["item_3", "item_1", "item_2"]
    }
  ],
  "saveAsDraft": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Survey response submitted successfully",
  "data": {
    "responseId": "SRSP-000125",
    "status": "completed",
    "completedAt": "2024-01-16T10:30:00Z",
    "totalScore": 82,
    "scorePercentage": 82.0,
    "categoryScores": [
      { "category": "engagement", "score": 9, "maxScore": 10, "percentage": 90 },
      { "category": "satisfaction", "score": 4, "maxScore": 5, "percentage": 80 }
    ]
  }
}
```

#### Get Survey Results/Analytics

```http
GET /surveys/:id/results
```

Returns comprehensive analytics including NPS, eNPS, sentiment analysis, category scores, and demographic breakdowns.

---

## Compliance Dashboard

Saudi Arabia HR Compliance monitoring for GOSI, WPS, Nitaqat, and Labor Law requirements.

**Official Sources:** hrsd.gov.sa, mol.gov.sa, gosi.gov.sa, mudad.com.sa

### Get Full Compliance Dashboard

```http
GET /compliance/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overallScore": 87,
    "lastUpdated": "2024-01-16T00:00:00Z",
    "gosi": {
      "status": "compliant",
      "score": 100,
      "registeredEmployees": 145,
      "totalEmployees": 145,
      "contributionsUpToDate": true,
      "lastPaymentDate": "2024-01-10",
      "nextDueDate": "2024-02-10",
      "monthlyContribution": 52500.00,
      "alerts": []
    },
    "nitaqat": {
      "status": "compliant",
      "band": "platinum",
      "saudizationPercentage": 42.5,
      "requiredPercentage": 35.0,
      "totalEmployees": 145,
      "saudiEmployees": 62,
      "nonSaudiEmployees": 83,
      "buffer": 7.5,
      "nextThreshold": {
        "band": "platinum",
        "percentage": 40.0,
        "achieved": true
      },
      "alerts": []
    },
    "wps": {
      "status": "compliant",
      "lastSubmission": "2024-01-05",
      "submissionDeadline": "2024-02-07",
      "employeesCovered": 145,
      "totalPayrollAmount": 875000.00,
      "bankTransfers": 143,
      "cashPayments": 2,
      "alerts": []
    },
    "laborLaw": {
      "status": "attention_needed",
      "score": 85,
      "checklist": [
        { "item": "Employment Contracts", "status": "compliant", "percentage": 100 },
        { "item": "Working Hours", "status": "compliant", "percentage": 98 },
        { "item": "Leave Entitlements", "status": "compliant", "percentage": 100 },
        { "item": "Probation Periods", "status": "attention", "percentage": 95 },
        { "item": "EOSB Calculations", "status": "compliant", "percentage": 100 }
      ],
      "alerts": [
        {
          "type": "warning",
          "message": "3 employees have probation periods exceeding 180 days",
          "affectedCount": 3
        }
      ]
    },
    "documents": {
      "expiringWithin30Days": 8,
      "expiringWithin60Days": 15,
      "expired": 2,
      "breakdown": {
        "iqama": { "expiring": 5, "expired": 1 },
        "passport": { "expiring": 2, "expired": 0 },
        "workPermit": { "expiring": 1, "expired": 1 }
      }
    },
    "contracts": {
      "expiringWithin60Days": 12,
      "needsRenewal": 12
    },
    "probation": {
      "endingWithin30Days": 5
    }
  }
}
```

### Get GOSI Compliance

```http
GET /compliance/gosi
```

**GOSI Contribution Rates (2024):**
- Employee: 9.75% (Pension)
- Employer: 11.75% (Pension + SANED)
- Total: 21.5%

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "compliant",
    "registrationStatus": "active",
    "establishmentNumber": "1234567890",
    "employees": {
      "total": 145,
      "saudi": 62,
      "nonSaudi": 83,
      "registered": 145,
      "pendingRegistration": 0
    },
    "contributions": {
      "currentMonth": {
        "period": "January 2024",
        "employeeShare": 22781.25,
        "employerShare": 29718.75,
        "total": 52500.00,
        "status": "paid",
        "paymentDate": "2024-01-10"
      },
      "yearToDate": {
        "employeeShare": 22781.25,
        "employerShare": 29718.75,
        "total": 52500.00
      },
      "nextDue": {
        "dueDate": "2024-02-10",
        "estimatedAmount": 53200.00
      }
    },
    "issues": [],
    "recommendations": []
  }
}
```

### Get Nitaqat Status

```http
GET /compliance/nitaqat
```

**Nitaqat Bands:**
| Band | Color | Benefits |
|------|-------|----------|
| Platinum | Green | Full visa access, all services |
| High Green | Green | Good visa access |
| Low Green | Green | Standard visa access |
| Yellow | Yellow | Limited services |
| Red | Red | Restricted, penalties apply |

**Response:**
```json
{
  "success": true,
  "data": {
    "currentBand": "platinum",
    "previousBand": "high_green",
    "saudizationRate": {
      "current": 42.5,
      "required": 35.0,
      "surplus": 7.5
    },
    "employees": {
      "total": 145,
      "saudi": 62,
      "nonSaudi": 83,
      "byCategory": {
        "saudiMale": 45,
        "saudiFemale": 17,
        "nonSaudiMale": 65,
        "nonSaudiFemale": 18
      }
    },
    "activityType": "Information Technology",
    "activityCode": "6201",
    "sizeCategory": "medium",
    "thresholds": {
      "platinum": { "min": 40, "achieved": true },
      "highGreen": { "min": 30, "achieved": true },
      "lowGreen": { "min": 20, "achieved": true },
      "yellow": { "min": 10, "achieved": true }
    },
    "simulation": {
      "ifHire1Saudi": 43.2,
      "ifTerminate1NonSaudi": 43.1,
      "toReachNextBand": "Already at highest band"
    },
    "visaAvailability": {
      "available": true,
      "quotaRemaining": 15
    }
  }
}
```

### Get WPS Status

```http
GET /compliance/wps
```

**WPS (Wage Protection System) Requirements:**
- All wages must be paid through bank transfers
- Monthly submission deadline: 7th of following month
- Minimum wage for Saudis: SAR 4,000

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "compliant",
    "currentPeriod": "January 2024",
    "submissionHistory": [
      {
        "period": "December 2023",
        "submittedAt": "2024-01-05T10:00:00Z",
        "status": "accepted",
        "employeeCount": 143,
        "totalAmount": 865000.00,
        "referenceNumber": "WPS-2024-001234"
      }
    ],
    "upcomingDeadline": {
      "period": "January 2024",
      "deadline": "2024-02-07T23:59:59Z",
      "daysRemaining": 22,
      "estimatedAmount": 875000.00,
      "employeeCount": 145
    },
    "paymentMethods": {
      "bankTransfer": 143,
      "cash": 2,
      "complianceRate": 98.6
    },
    "alerts": [
      {
        "type": "info",
        "message": "2 employees paid in cash - consider bank transfer"
      }
    ]
  }
}
```

### Get Expiring Documents

```http
GET /compliance/documents/expiring
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| daysAhead | number | 30 | Days to look ahead |

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 8,
      "byType": {
        "iqama": 5,
        "passport": 2,
        "workPermit": 1
      }
    },
    "documents": [
      {
        "employeeId": "emp_id",
        "employeeName": "Mohammed Al-Ahmed",
        "employeeNumber": "EMP-001",
        "documentType": "iqama",
        "documentNumber": "2123456789",
        "expiryDate": "2024-02-10",
        "daysUntilExpiry": 25,
        "status": "expiring_soon",
        "nationality": "Pakistani"
      }
    ]
  }
}
```

### Get Probation Period Ending

```http
GET /compliance/probation/ending
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| daysAhead | number | 30 | Days to look ahead |

**Saudi Labor Law - Probation Period (Article 53):**
- Maximum: 90 days
- Can be extended to 180 days with written agreement
- No EOSB during probation

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 5,
    "employees": [
      {
        "employeeId": "emp_id",
        "employeeName": "Sara Al-Qahtani",
        "employeeNumber": "EMP-045",
        "department": "Marketing",
        "position": "Marketing Specialist",
        "hireDate": "2023-10-20",
        "probationEndDate": "2024-01-20",
        "daysRemaining": 4,
        "probationDays": 90,
        "status": "pending_review",
        "manager": "Ahmed Hassan",
        "performanceScore": 85
      }
    ]
  }
}
```

### Get Expiring Contracts

```http
GET /compliance/contracts/expiring
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| daysAhead | number | 60 | Days to look ahead |

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 12,
    "contracts": [
      {
        "employeeId": "emp_id",
        "employeeName": "John Smith",
        "employeeNumber": "EMP-023",
        "contractType": "fixed_term",
        "startDate": "2022-02-01",
        "endDate": "2024-02-01",
        "daysRemaining": 16,
        "renewalRecommendation": "renew",
        "yearsOfService": 2.0,
        "performanceRating": 4.2
      }
    ]
  }
}
```

### Get Labor Law Checklist

```http
GET /compliance/labor-law
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overallCompliance": 92,
    "lastAuditDate": "2024-01-01",
    "checklist": [
      {
        "category": "Employment Contracts",
        "article": "Article 51-60",
        "items": [
          {
            "requirement": "Written employment contract for all employees",
            "status": "compliant",
            "evidence": "All 145 employees have signed contracts",
            "lastChecked": "2024-01-15"
          },
          {
            "requirement": "Contract in Arabic (or bilingual)",
            "status": "compliant",
            "evidence": "All contracts are bilingual"
          }
        ]
      },
      {
        "category": "Working Hours",
        "article": "Article 98-102",
        "items": [
          {
            "requirement": "Maximum 8 hours/day or 48 hours/week",
            "status": "compliant",
            "evidence": "Time tracking confirms compliance"
          },
          {
            "requirement": "Ramadan hours (6 hours/day for Muslims)",
            "status": "compliant",
            "evidence": "Ramadan schedule configured"
          }
        ]
      },
      {
        "category": "Leave Entitlements",
        "article": "Article 109-117",
        "items": [
          {
            "requirement": "21 days annual leave (first 5 years)",
            "status": "compliant"
          },
          {
            "requirement": "30 days annual leave (after 5 years)",
            "status": "compliant"
          },
          {
            "requirement": "Sick leave per Article 117",
            "status": "compliant"
          }
        ]
      },
      {
        "category": "End of Service Benefits",
        "article": "Article 84-87",
        "items": [
          {
            "requirement": "EOSB calculation per formula",
            "status": "compliant",
            "evidence": "System uses correct formula"
          }
        ]
      },
      {
        "category": "Termination",
        "article": "Article 75-80",
        "items": [
          {
            "requirement": "Notice period compliance",
            "status": "attention",
            "issue": "1 termination without proper notice"
          }
        ]
      }
    ],
    "upcomingRequirements": [
      {
        "requirement": "Annual leave balance review",
        "dueDate": "2024-03-01",
        "description": "Ensure employees don't lose accrued leave"
      }
    ]
  }
}
```

---

## Who's Out Calendar

Enterprise absence visibility for team availability planning.

### Get Today's Absences

```http
GET /whos-out/today
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2024-01-16",
    "totalAbsent": 12,
    "totalEmployees": 145,
    "attendanceRate": 91.7,
    "absences": [
      {
        "employeeId": "emp_id",
        "employeeName": "Mohammed Ali",
        "employeeNumber": "EMP-012",
        "department": "Engineering",
        "position": "Senior Developer",
        "absenceType": "annual_leave",
        "startDate": "2024-01-15",
        "endDate": "2024-01-20",
        "totalDays": 6,
        "remainingDays": 4,
        "coveringEmployee": "Ahmed Hassan",
        "notes": "Vacation"
      },
      {
        "employeeId": "emp_id",
        "employeeName": "Sara Ahmed",
        "department": "HR",
        "absenceType": "sick_leave",
        "startDate": "2024-01-16",
        "endDate": "2024-01-16",
        "totalDays": 1
      }
    ],
    "byDepartment": [
      { "department": "Engineering", "absent": 5, "total": 45, "rate": 88.9 },
      { "department": "Sales", "absent": 3, "total": 30, "rate": 90.0 },
      { "department": "HR", "absent": 2, "total": 15, "rate": 86.7 }
    ],
    "byAbsenceType": {
      "annual_leave": 6,
      "sick_leave": 3,
      "business_trip": 2,
      "remote_work": 1
    }
  }
}
```

### Get Weekly Calendar

```http
GET /whos-out/week
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| weekStart | date | Start of week (defaults to current week) |
| department | string | Filter by department ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "weekStart": "2024-01-14",
    "weekEnd": "2024-01-20",
    "days": [
      {
        "date": "2024-01-14",
        "dayOfWeek": "Sunday",
        "isWeekend": false,
        "isHoliday": false,
        "absences": [
          {
            "employeeId": "emp_id",
            "employeeName": "Mohammed Ali",
            "department": "Engineering",
            "absenceType": "annual_leave"
          }
        ],
        "absentCount": 8
      },
      {
        "date": "2024-01-15",
        "dayOfWeek": "Monday",
        "absences": [...],
        "absentCount": 10
      }
    ],
    "summary": {
      "totalAbsenceDays": 45,
      "uniqueEmployeesAbsent": 15,
      "peakDay": { "date": "2024-01-17", "count": 12 }
    }
  }
}
```

### Get Monthly Calendar

```http
GET /whos-out/month
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| year | number | Year (default: current) |
| month | number | Month 1-12 (default: current) |
| department | string | Filter by department ID |

### Get Upcoming Absences

```http
GET /whos-out/upcoming
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| days | number | 30 | Days to look ahead |
| department | string | - | Filter by department |

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "from": "2024-01-16",
      "to": "2024-02-15"
    },
    "totalUpcoming": 25,
    "absences": [
      {
        "employeeId": "emp_id",
        "employeeName": "Ahmed Hassan",
        "department": "Sales",
        "absenceType": "annual_leave",
        "startDate": "2024-01-25",
        "endDate": "2024-02-05",
        "totalDays": 10,
        "status": "approved"
      }
    ],
    "conflicts": [
      {
        "date": "2024-01-28",
        "department": "Sales",
        "absences": ["Ahmed Hassan", "Sara Ali"],
        "coverageIssue": true
      }
    ]
  }
}
```

### Get Departments Summary

```http
GET /whos-out/departments
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2024-01-16",
    "departments": [
      {
        "departmentId": "dept_id",
        "departmentName": "Engineering",
        "totalEmployees": 45,
        "presentToday": 40,
        "absentToday": 5,
        "attendanceRate": 88.9,
        "absenceBreakdown": {
          "annual_leave": 3,
          "sick_leave": 1,
          "remote_work": 1
        }
      },
      {
        "departmentId": "dept_id",
        "departmentName": "Sales",
        "totalEmployees": 30,
        "presentToday": 27,
        "absentToday": 3,
        "attendanceRate": 90.0
      }
    ]
  }
}
```

### Get Department Coverage Analysis

```http
GET /whos-out/coverage/:department
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | date | Coverage analysis start |
| endDate | date | Coverage analysis end |

**Response:**
```json
{
  "success": true,
  "data": {
    "department": "Engineering",
    "period": {
      "startDate": "2024-01-15",
      "endDate": "2024-01-31"
    },
    "totalEmployees": 45,
    "minimumCoverage": 35,
    "coverageAnalysis": [
      {
        "date": "2024-01-15",
        "expectedAbsent": 5,
        "expectedPresent": 40,
        "coverageStatus": "adequate"
      },
      {
        "date": "2024-01-28",
        "expectedAbsent": 12,
        "expectedPresent": 33,
        "coverageStatus": "critical",
        "alert": "Below minimum coverage"
      }
    ],
    "criticalDates": [
      {
        "date": "2024-01-28",
        "expectedPresent": 33,
        "shortfall": 2,
        "conflictingLeaves": ["Ahmed", "Sara", "John"]
      }
    ],
    "recommendations": [
      "Consider rescheduling 1-2 leave requests for Jan 28"
    ]
  }
}
```

---

## Employee Self-Service Portal

Unified employee portal for profile management, leave requests, financial requests, payslips, and approvals.

### Get My Dashboard

```http
GET /self-service/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "employee": {
      "id": "emp_id",
      "employeeNumber": "EMP-045",
      "name": "Sara Al-Qahtani",
      "position": "Marketing Specialist",
      "department": "Marketing",
      "profilePhoto": "https://...",
      "hireDate": "2023-01-15",
      "yearsOfService": 1.0
    },
    "leave": {
      "balances": {
        "annual": { "entitled": 21, "used": 5, "pending": 2, "remaining": 14 },
        "sick": { "entitled": 30, "used": 2, "remaining": 28 },
        "personal": { "entitled": 3, "used": 0, "remaining": 3 }
      },
      "pendingRequests": 1,
      "upcomingLeave": {
        "startDate": "2024-02-01",
        "endDate": "2024-02-03",
        "type": "annual",
        "status": "approved"
      }
    },
    "financial": {
      "activeLoans": [
        {
          "loanId": "LOAN-001",
          "type": "personal",
          "originalAmount": 10000,
          "remainingBalance": 6000,
          "monthlyDeduction": 1000,
          "paymentsRemaining": 6
        }
      ],
      "pendingAdvances": 0,
      "totalDeductions": 1000
    },
    "payroll": {
      "lastPayslip": {
        "period": "December 2023",
        "netPay": 12500.00,
        "paidDate": "2023-12-28"
      },
      "ytdEarnings": 156000.00,
      "ytdDeductions": 18720.00
    },
    "approvals": {
      "pendingCount": 3,
      "breakdown": {
        "leave": 2,
        "loan": 1,
        "advance": 0
      }
    },
    "announcements": [
      {
        "title": "Office Closure - National Day",
        "date": "2024-09-23",
        "type": "holiday"
      }
    ],
    "quickActions": [
      "request_leave",
      "view_payslip",
      "update_profile"
    ]
  }
}
```

### Get My Profile

```http
GET /self-service/profile
```

**Response:**
```json
{
  "success": true,
  "data": {
    "personal": {
      "firstName": "Sara",
      "firstNameAr": "سارة",
      "lastName": "Al-Qahtani",
      "lastNameAr": "القحطاني",
      "dateOfBirth": "1995-05-15",
      "gender": "female",
      "nationality": "Saudi",
      "nationalId": "1098765432",
      "maritalStatus": "single",
      "profilePhoto": "https://..."
    },
    "contact": {
      "email": "sara.qahtani@company.com",
      "personalEmail": "sara@gmail.com",
      "phone": "+966501234567",
      "alternatePhone": null,
      "address": {
        "street": "King Fahd Road",
        "city": "Riyadh",
        "region": "Riyadh",
        "postalCode": "12345",
        "country": "Saudi Arabia"
      }
    },
    "emergency": {
      "contactName": "Mohammed Al-Qahtani",
      "relationship": "Father",
      "phone": "+966509876543"
    },
    "employment": {
      "employeeNumber": "EMP-045",
      "hireDate": "2023-01-15",
      "position": "Marketing Specialist",
      "department": "Marketing",
      "manager": "Ahmed Hassan",
      "workLocation": "Riyadh HQ",
      "employmentType": "full_time",
      "contractType": "permanent"
    },
    "documents": {
      "nationalId": { "number": "1098765432", "expiryDate": "2028-05-15" },
      "passport": { "number": "A12345678", "expiryDate": "2027-03-20" }
    },
    "bankDetails": {
      "bankName": "Al Rajhi Bank",
      "accountNumber": "****5678",
      "iban": "SA****1234"
    }
  }
}
```

### Update My Profile

```http
PATCH /self-service/profile
```

**Allowed Fields (Employee can update):**
- Personal email
- Phone numbers
- Address
- Emergency contact
- Profile photo

**Request Body:**
```json
{
  "personalEmail": "sara.new@gmail.com",
  "phone": "+966501234568",
  "address": {
    "street": "King Abdullah Road",
    "city": "Riyadh",
    "postalCode": "12346"
  },
  "emergencyContact": {
    "contactName": "Fatima Al-Qahtani",
    "relationship": "Mother",
    "phone": "+966507654321"
  }
}
```

### Get My Leave Balances

```http
GET /self-service/leave/balances
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| year | number | current | Year for balances |

**Response:**
```json
{
  "success": true,
  "data": {
    "year": 2024,
    "balances": [
      {
        "leaveType": "annual",
        "leaveTypeName": "Annual Leave",
        "entitled": 21,
        "used": 5,
        "pending": 2,
        "available": 14,
        "carryOver": 3,
        "expiryDate": "2024-03-31",
        "accrualRate": 1.75,
        "nextAccrual": "2024-02-01"
      },
      {
        "leaveType": "sick",
        "leaveTypeName": "Sick Leave",
        "entitled": 30,
        "used": 2,
        "pending": 0,
        "available": 28,
        "paidDaysRemaining": 28,
        "halfPayDaysRemaining": 60,
        "unpaidDaysRemaining": 30
      },
      {
        "leaveType": "personal",
        "leaveTypeName": "Personal Leave",
        "entitled": 3,
        "used": 0,
        "available": 3
      }
    ],
    "summary": {
      "totalEntitled": 54,
      "totalUsed": 7,
      "totalAvailable": 45
    }
  }
}
```

### Get My Leave Requests

```http
GET /self-service/leave/requests
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | pending/approved/rejected/cancelled |
| page | number | Page number |
| limit | number | Items per page |

**Response:**
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "requestId": "LR-2024-0125",
        "leaveType": "annual",
        "startDate": "2024-02-01",
        "endDate": "2024-02-03",
        "totalDays": 3,
        "halfDay": false,
        "reason": "Family vacation",
        "status": "approved",
        "submittedAt": "2024-01-10T10:00:00Z",
        "approvedBy": "Ahmed Hassan",
        "approvedAt": "2024-01-11T09:00:00Z",
        "attachments": []
      },
      {
        "requestId": "LR-2024-0130",
        "leaveType": "annual",
        "startDate": "2024-03-15",
        "endDate": "2024-03-16",
        "totalDays": 2,
        "reason": "Personal errands",
        "status": "pending",
        "submittedAt": "2024-01-15T14:00:00Z"
      }
    ],
    "pagination": {
      "total": 8,
      "page": 1,
      "pages": 1
    }
  }
}
```

### Submit Leave Request

```http
POST /self-service/leave/request
```

**Request Body:**
```json
{
  "leaveType": "annual",
  "startDate": "2024-02-15",
  "endDate": "2024-02-17",
  "reason": "Family event",
  "halfDay": false,
  "halfDayPeriod": null,
  "attachments": [],
  "coveringEmployeeId": "emp_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Leave request submitted successfully",
  "data": {
    "requestId": "LR-2024-0145",
    "leaveType": "annual",
    "startDate": "2024-02-15",
    "endDate": "2024-02-17",
    "totalDays": 3,
    "status": "pending",
    "approver": {
      "name": "Ahmed Hassan",
      "email": "ahmed.hassan@company.com"
    },
    "balanceAfterApproval": {
      "current": 14,
      "afterApproval": 11
    }
  }
}
```

### Cancel Leave Request

```http
POST /self-service/leave/request/:requestId/cancel
```

Only pending requests can be cancelled.

### Get My Loans

```http
GET /self-service/loans
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeLoans": [
      {
        "loanId": "LOAN-2023-045",
        "loanType": "personal",
        "originalAmount": 10000.00,
        "approvedDate": "2023-06-15",
        "disbursementDate": "2023-06-20",
        "totalInstallments": 10,
        "paidInstallments": 4,
        "remainingInstallments": 6,
        "monthlyDeduction": 1000.00,
        "remainingBalance": 6000.00,
        "nextDeductionDate": "2024-02-01",
        "status": "active"
      }
    ],
    "completedLoans": [
      {
        "loanId": "LOAN-2022-023",
        "loanType": "emergency",
        "originalAmount": 5000.00,
        "completedDate": "2023-05-01",
        "status": "completed"
      }
    ],
    "summary": {
      "totalActiveLoans": 1,
      "totalOutstandingBalance": 6000.00,
      "totalMonthlyDeductions": 1000.00
    }
  }
}
```

### Get My Advances

```http
GET /self-service/advances
```

**Response:**
```json
{
  "success": true,
  "data": {
    "advances": [
      {
        "advanceId": "ADV-2024-012",
        "amount": 2000.00,
        "requestedDate": "2024-01-05",
        "status": "approved",
        "approvedDate": "2024-01-06",
        "disbursementDate": "2024-01-07",
        "deductionMonth": "February 2024",
        "reason": "Medical expenses"
      }
    ],
    "pendingRequests": 0,
    "monthlyLimit": 5000.00,
    "remainingLimit": 3000.00
  }
}
```

### Get My Payslips

```http
GET /self-service/payslips
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| year | number | Year (default: current) |

**Response:**
```json
{
  "success": true,
  "data": {
    "year": 2024,
    "payslips": [
      {
        "payslipId": "PS-2024-01-045",
        "period": "January 2024",
        "payDate": "2024-01-28",
        "earnings": {
          "basicSalary": 10000.00,
          "housingAllowance": 2500.00,
          "transportAllowance": 500.00,
          "otherAllowances": 200.00,
          "overtime": 0.00,
          "grossPay": 13200.00
        },
        "deductions": {
          "gosi": 975.00,
          "loanDeduction": 1000.00,
          "advanceDeduction": 0.00,
          "otherDeductions": 0.00,
          "totalDeductions": 1975.00
        },
        "netPay": 11225.00,
        "paymentMethod": "bank_transfer",
        "bankAccount": "****5678",
        "downloadUrl": "/api/hr/payslips/PS-2024-01-045/download"
      }
    ],
    "ytdSummary": {
      "grossEarnings": 13200.00,
      "totalDeductions": 1975.00,
      "netPay": 11225.00,
      "gosiContributions": 975.00
    }
  }
}
```

### Get Pending Approvals (As Manager)

```http
GET /self-service/approvals/pending
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | leave/loan/advance (optional) |
| page | number | Page number |
| limit | number | Items per page |

**Response:**
```json
{
  "success": true,
  "data": {
    "pendingApprovals": [
      {
        "type": "leave",
        "requestId": "LR-2024-0148",
        "employee": {
          "id": "emp_id",
          "name": "Ahmed Ali",
          "department": "Marketing",
          "position": "Marketing Associate"
        },
        "details": {
          "leaveType": "annual",
          "startDate": "2024-02-01",
          "endDate": "2024-02-03",
          "totalDays": 3,
          "reason": "Family vacation",
          "currentBalance": 18
        },
        "submittedAt": "2024-01-15T10:00:00Z",
        "urgency": "normal"
      },
      {
        "type": "loan",
        "requestId": "LOAN-2024-015",
        "employee": {
          "id": "emp_id",
          "name": "Mohammed Hassan",
          "department": "Engineering"
        },
        "details": {
          "loanType": "personal",
          "amount": 15000.00,
          "installments": 12,
          "reason": "Home renovation"
        },
        "submittedAt": "2024-01-14T14:30:00Z",
        "urgency": "normal"
      }
    ],
    "summary": {
      "total": 3,
      "byType": {
        "leave": 2,
        "loan": 1,
        "advance": 0
      }
    },
    "pagination": {
      "total": 3,
      "page": 1,
      "pages": 1
    }
  }
}
```

---

## Data Models Reference

### Survey Status Flow

```
draft → scheduled → active → paused → active → closed → archived
```

### Compliance Status Values

| Status | Description |
|--------|-------------|
| `compliant` | Fully compliant with requirements |
| `attention_needed` | Minor issues requiring attention |
| `non_compliant` | Critical compliance failures |

### Leave Request Status Flow

```
pending → approved → taken → completed
        → rejected
        → cancelled (by employee)
```

### Document Types for Compliance

| Type | Description | Renewal Alert |
|------|-------------|---------------|
| `iqama` | Saudi residence permit | 60 days before |
| `passport` | Travel document | 90 days before |
| `work_permit` | Work authorization | 60 days before |
| `driving_license` | Vehicle license | 30 days before |
| `professional_license` | Professional certification | 60 days before |

---

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `SURVEY_NOT_FOUND` | Survey not found | Invalid survey ID |
| `SURVEY_CLOSED` | Survey is closed | Cannot respond to closed survey |
| `ALREADY_RESPONDED` | Already submitted response | Duplicate response attempt |
| `INSUFFICIENT_BALANCE` | Insufficient leave balance | Not enough leave days |
| `OVERLAP_DETECTED` | Leave dates overlap with existing request | Date conflict |
| `MAX_LOANS_REACHED` | Maximum active loans reached | Loan limit exceeded |
| `ADVANCE_LIMIT_EXCEEDED` | Advance amount exceeds monthly limit | Over limit |
| `PROFILE_UPDATE_RESTRICTED` | Cannot update restricted fields | Unauthorized field update |

---

## Webhooks

### Survey Events

| Event | Trigger |
|-------|---------|
| `survey.launched` | Survey activated |
| `survey.response_submitted` | Employee submitted response |
| `survey.closed` | Survey closed |
| `survey.reminder_sent` | Reminder notification sent |

### Compliance Events

| Event | Trigger |
|-------|---------|
| `compliance.document_expiring` | Document expiring within threshold |
| `compliance.probation_ending` | Probation period ending |
| `compliance.contract_expiring` | Contract expiring |
| `compliance.nitaqat_alert` | Saudization rate change |

### Self-Service Events

| Event | Trigger |
|-------|---------|
| `leave.request_submitted` | New leave request |
| `leave.request_approved` | Leave approved |
| `leave.request_rejected` | Leave rejected |
| `loan.request_submitted` | New loan request |
| `loan.request_approved` | Loan approved |

---

## Best Practices

### Survey Design
1. Keep pulse surveys under 5 minutes
2. Use NPS question for benchmarking
3. Include at least one open-ended question
4. Test with small group before launch
5. Set realistic response deadlines

### Compliance Monitoring
1. Check dashboard daily
2. Set up alerts for expiring documents
3. Review Nitaqat status weekly
4. Submit WPS before deadline
5. Conduct quarterly compliance audits

### Self-Service Usage
1. Submit leave requests at least 7 days in advance
2. Keep emergency contact information updated
3. Review payslips monthly for accuracy
4. Check pending approvals daily (managers)

---

*Document Version: 1.0*
*Last Updated: January 2024*
*Total Endpoints: 35+*
