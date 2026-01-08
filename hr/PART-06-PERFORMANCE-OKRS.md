# HR API Documentation - Part 6: Performance Management & OKRs

## Overview

This document covers Performance Management APIs including:
- Performance Reviews (Annual, Mid-Year, Quarterly, Probation)
- Self-Assessment & Manager Assessment
- 360-Degree Feedback
- OKRs (Objectives & Key Results) - Google methodology
- 9-Box Talent Grid Assessment
- CFRs (Conversations, Feedback, Recognition)
- Development Plans & Calibration

**Saudi Labor Law Compliance**: Articles 64, 65, 77, 80, 81 (Performance & Termination)

---

## Table of Contents

1. [Performance Reviews](#1-performance-reviews)
2. [Self-Assessment](#2-self-assessment)
3. [Manager Assessment](#3-manager-assessment)
4. [360-Degree Feedback](#4-360-degree-feedback)
5. [Development Plans](#5-development-plans)
6. [Calibration](#6-calibration)
7. [OKRs](#7-okrs-objectives--key-results)
8. [Key Results](#8-key-results)
9. [OKR Check-ins](#9-okr-check-ins)
10. [9-Box Grid Assessment](#10-9-box-grid-assessment)
11. [Review Templates](#11-review-templates)

---

## Base URL

```
/api/hr/performance-reviews  - Performance Reviews
/api/hr/okrs                 - OKRs & 9-Box
```

---

## 1. Performance Reviews

### 1.1 Get All Performance Reviews

```http
GET /api/hr/performance-reviews
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| employeeId | ObjectId | Filter by employee |
| reviewerId | ObjectId | Filter by reviewer |
| departmentId | ObjectId | Filter by department |
| reviewType | String | annual, mid_year, quarterly, monthly, probation, project_completion, 360_degree, peer_review, ad_hoc |
| status | String | draft, self_assessment, self_assessment_pending, manager_review, manager_review_pending, calibration, completed, acknowledged, disputed |
| finalRating | String | exceptional, exceeds_expectations, meets_expectations, needs_improvement, unsatisfactory |
| periodYear | Number | Review period year |
| periodQuarter | Number | Review period quarter (1-4) |
| dueFrom | Date | Due date range start |
| dueTo | Date | Due date range end |
| isOverdue | Boolean | Filter overdue reviews |
| page | Number | Page number (default: 1) |
| limit | Number | Items per page (default: 20) |

**Response:**

```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "_id": "64f...",
        "reviewId": "REV-2025-0001",
        "reviewNumber": "PR-2025-001",
        "employeeId": {
          "_id": "64f...",
          "personalInfo": {
            "fullNameEnglish": "Ahmed Al-Rashid",
            "fullNameArabic": "أحمد الراشد"
          },
          "employeeId": "EMP-001"
        },
        "employeeName": "Ahmed Al-Rashid",
        "employeeNameAr": "أحمد الراشد",
        "employeeNumber": "EMP-001",
        "department": "Legal",
        "departmentAr": "القانونية",
        "position": "Senior Associate",
        "positionAr": "محامي أول",
        "reviewerId": "64f...",
        "reviewerName": "Mohammed Al-Faisal",
        "reviewType": "annual",
        "reviewPeriod": {
          "periodType": "annual",
          "periodName": "2025 Annual Review",
          "periodNameAr": "مراجعة 2025 السنوية",
          "startDate": "2025-01-01",
          "endDate": "2025-12-31",
          "reviewDueDate": "2026-01-31",
          "selfAssessmentDueDate": "2026-01-15"
        },
        "status": "manager_review",
        "statusAr": "مراجعة المدير",
        "dueDate": "2026-01-31",
        "overallScore": 3.8,
        "finalRating": "exceeds_expectations",
        "finalRatingAr": "يتجاوز التوقعات",
        "selfAssessment": {
          "required": true,
          "submitted": true,
          "submittedOn": "2026-01-10"
        },
        "competencyAvgScore": 3.9,
        "goalsAchievement": 85,
        "isOverdue": false,
        "daysUntilDue": 21,
        "createdAt": "2025-12-15"
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "pages": 3,
      "limit": 20
    }
  }
}
```

---

### 1.2 Get Single Performance Review

```http
GET /api/hr/performance-reviews/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "reviewId": "REV-2025-0001",
    "employeeId": "64f...",
    "employeeName": "Ahmed Al-Rashid",
    "employeeNameAr": "أحمد الراشد",
    "reviewerId": "64f...",
    "reviewerName": "Mohammed Al-Faisal",
    "managerId": "64f...",
    "managerName": "Mohammed Al-Faisal",
    "reviewType": "annual",
    "reviewPeriod": {
      "periodType": "annual",
      "periodName": "2025 Annual Review",
      "startDate": "2025-01-01",
      "endDate": "2025-12-31",
      "reviewDueDate": "2026-01-31",
      "selfAssessmentDueDate": "2026-01-15"
    },
    "status": "manager_review",
    "selfAssessment": {
      "required": true,
      "submitted": true,
      "submittedOn": "2026-01-10",
      "selfRating": 4,
      "accomplishments": "Successfully closed 15 major cases...",
      "keyAchievements": [
        {
          "achievement": "Won landmark intellectual property case",
          "impact": "SAR 5M saved for client",
          "date": "2025-06-15"
        }
      ],
      "challenges": "Managing increasing workload...",
      "strengths": "Strong legal research and client communication",
      "developmentNeeds": "Leadership skills for team management",
      "careerAspirations": "Partner track within 3 years",
      "trainingRequests": [
        {
          "trainingType": "Leadership Development",
          "reason": "Preparing for senior role",
          "priority": "high"
        }
      ]
    },
    "competencies": [
      {
        "competencyId": "COMP-001",
        "competencyName": "Legal Research",
        "competencyNameAr": "البحث القانوني",
        "competencyCategory": "technical",
        "ratingScale": "1-5",
        "selfRating": 4,
        "managerRating": 4,
        "finalRating": 4,
        "weight": 15,
        "weightedScore": 0.6,
        "behaviorsObserved": [
          {
            "behavior": "Thorough case analysis",
            "frequency": "always"
          }
        ],
        "managerComments": "Excellent research skills"
      },
      {
        "competencyId": "COMP-002",
        "competencyName": "Client Communication",
        "competencyCategory": "behavioral",
        "selfRating": 4,
        "managerRating": 5,
        "finalRating": 5,
        "weight": 20,
        "weightedScore": 1.0
      }
    ],
    "goals": [
      {
        "goalId": "GOAL-REV-2025-0001-1",
        "goalName": "Close 12 cases",
        "goalNameAr": "إغلاق 12 قضية",
        "goalType": "individual",
        "goalCategory": "operational",
        "targetMetric": "Cases Closed",
        "targetValue": 12,
        "actualValue": 15,
        "achievementPercentage": 125,
        "managerRating": 5,
        "status": "exceeded",
        "weight": 30,
        "evidenceProvided": true
      }
    ],
    "kpis": [
      {
        "kpiId": "KPI-REV-2025-0001-1",
        "kpiName": "Billable Hours",
        "kpiCategory": "financial",
        "metric": "Hours",
        "unit": "hours",
        "target": 1800,
        "threshold": 1500,
        "stretch": 2000,
        "actual": 1920,
        "achievementPercentage": 106.7,
        "performanceLevel": "exceeds_target",
        "rating": 4,
        "weight": 25
      }
    ],
    "isAttorney": true,
    "attorneyMetrics": {
      "caseMetrics": {
        "totalCasesHandled": 18,
        "activeCases": 5,
        "casesWon": 10,
        "casesLost": 2,
        "casesSettled": 3,
        "winRate": 71.4,
        "averageCaseValue": 850000
      },
      "clientMetrics": {
        "totalClients": 25,
        "newClients": 8,
        "clientRetentionRate": 92,
        "clientSatisfactionScore": 4.6
      },
      "billingMetrics": {
        "totalBillableHours": 1920,
        "utilizationRate": 85,
        "realizationRate": 92,
        "totalBilled": 576000,
        "totalCollected": 529920,
        "billingTarget": 500000,
        "billingAchievement": 115.2
      },
      "legalWorkQuality": {
        "documentQualityScore": 4.5,
        "courtAppearances": 24,
        "briefsSubmitted": 15,
        "briefsAccepted": 14
      }
    },
    "strengths": [
      {
        "strengthArea": "Legal Research & Analysis",
        "category": "technical",
        "description": "Consistently delivers thorough research",
        "examples": [
          {
            "example": "Discovered precedent that won IP case",
            "date": "2025-06-10",
            "impact": "Case victory"
          }
        ]
      }
    ],
    "areasForImprovement": [
      {
        "improvementArea": "Team Leadership",
        "category": "leadership",
        "currentLevel": "Developing",
        "desiredLevel": "Proficient",
        "priority": "high",
        "developmentActions": [
          {
            "action": "Complete leadership training program",
            "timeline": "Q2 2026"
          }
        ]
      }
    ],
    "developmentPlan": {
      "required": true,
      "items": [
        {
          "objectiveName": "Leadership Development",
          "category": "career_progression",
          "priority": "high",
          "developmentActions": [
            {
              "actionType": "training",
              "actionDescription": "Leadership Excellence Program",
              "trainingDuration": 40,
              "trainingCost": 15000,
              "status": "not_started"
            }
          ],
          "successMetrics": [
            {
              "metric": "360 feedback score improvement",
              "target": "+0.5 points"
            }
          ]
        }
      ],
      "mentorAssigned": {
        "mentorId": "64f...",
        "mentorName": "Khalid Al-Salem",
        "startDate": "2026-02-01"
      },
      "careerPath": {
        "currentRole": "Senior Associate",
        "targetRole": "Partner",
        "timeframe": "3 years"
      }
    },
    "managerAssessment": {
      "completedAt": "2026-01-20",
      "overallComments": "Ahmed has shown exceptional growth...",
      "keyAchievements": [
        {
          "achievement": "Won IP case worth SAR 5M",
          "impact": "Major client retention"
        }
      ],
      "performanceHighlights": "Exceeded billable targets by 15%",
      "areasExceeded": ["Client satisfaction", "Case outcomes"],
      "areasMet": ["Billable hours", "Knowledge contribution"],
      "areasBelow": [],
      "overallRating": "exceeds_expectations",
      "potentialAssessment": "promotable"
    },
    "recommendations": {
      "performanceRecommendation": "exceeds",
      "promotionRecommended": true,
      "promotionTimeline": "Q3 2026",
      "promotionToRole": "Counsel",
      "salaryIncreaseRecommended": true,
      "salaryIncreasePercentage": 12,
      "bonusRecommended": true,
      "bonusPercentage": 15
    },
    "overallRating": 4,
    "overallScore": 3.85,
    "finalRating": "exceeds_expectations",
    "scores": {
      "competencyAverage": 4.2,
      "weightedCompetencyScore": 2.1,
      "goalsAverage": 4.5,
      "weightedGoalsScore": 1.8,
      "totalGoalsAchievement": 95
    },
    "analytics": {
      "teamAverage": 3.5,
      "positionVsTeam": "above",
      "departmentAverage": 3.6,
      "positionVsDepartment": "above",
      "trend": "improving",
      "previousReviewRating": 3.5,
      "ratingChange": 0.35,
      "percentileRank": 85
    }
  }
}
```

---

### 1.3 Create Performance Review

```http
POST /api/hr/performance-reviews
```

**Request Body:**

```json
{
  "employeeId": "64f...",
  "reviewerId": "64f...",
  "reviewType": "annual",
  "reviewPeriod": {
    "periodType": "annual",
    "periodName": "2025 Annual Review",
    "periodNameAr": "مراجعة 2025 السنوية",
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "reviewDueDate": "2026-01-31",
    "selfAssessmentDueDate": "2026-01-15"
  },
  "templateId": "64f...",
  "competencies": [
    {
      "competencyId": "COMP-001",
      "competencyName": "Legal Research",
      "competencyCategory": "technical",
      "weight": 15
    }
  ],
  "goals": [
    {
      "goalName": "Close 12 cases",
      "goalType": "individual",
      "targetMetric": "Cases Closed",
      "targetValue": 12,
      "weight": 30
    }
  ],
  "kpis": [
    {
      "kpiName": "Billable Hours",
      "kpiCategory": "financial",
      "target": 1800,
      "threshold": 1500,
      "stretch": 2000,
      "weight": 25
    }
  ],
  "isAttorney": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "Performance review created successfully",
  "data": {
    "_id": "64f...",
    "reviewId": "REV-2025-0001",
    "status": "draft"
  }
}
```

---

### 1.4 Update Performance Review

```http
PATCH /api/hr/performance-reviews/:id
```

**Request Body:**

```json
{
  "dueDate": "2026-02-15",
  "competencies": [
    {
      "competencyId": "COMP-001",
      "managerRating": 4,
      "managerComments": "Excellent research skills"
    }
  ],
  "goals": [
    {
      "goalId": "GOAL-REV-2025-0001-1",
      "actualValue": 15,
      "status": "exceeded",
      "managerRating": 5
    }
  ]
}
```

---

### 1.5 Delete Performance Review

```http
DELETE /api/hr/performance-reviews/:id
```

---

### 1.6 Get Performance Statistics

```http
GET /api/hr/performance-reviews/stats
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| periodYear | Number | Filter by year |
| departmentId | ObjectId | Filter by department |

**Response:**

```json
{
  "success": true,
  "data": {
    "totalReviews": 156,
    "byStatus": {
      "draft": 12,
      "self_assessment_pending": 8,
      "self_assessment": 15,
      "manager_review_pending": 5,
      "manager_review": 20,
      "calibration": 10,
      "completed": 75,
      "acknowledged": 11
    },
    "byRating": {
      "exceptional": 8,
      "exceeds_expectations": 35,
      "meets_expectations": 45,
      "needs_improvement": 10,
      "unsatisfactory": 2
    },
    "ratingDistribution": [
      { "rating": "exceptional", "count": 8, "percentage": 5.1 },
      { "rating": "exceeds_expectations", "count": 35, "percentage": 22.4 }
    ],
    "completionRate": 72.4,
    "averageScore": 3.45,
    "overdueCount": 13,
    "byReviewType": {
      "annual": 100,
      "mid_year": 40,
      "quarterly": 16
    },
    "trendComparison": {
      "previousYear": 3.35,
      "currentYear": 3.45,
      "change": 0.10,
      "trend": "improving"
    }
  }
}
```

---

### 1.7 Get Overdue Reviews

```http
GET /api/hr/performance-reviews/overdue
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64f...",
      "reviewId": "REV-2025-0012",
      "employeeName": "Sara Al-Ahmed",
      "reviewerName": "Mohammed Al-Faisal",
      "reviewType": "annual",
      "status": "self_assessment_pending",
      "dueDate": "2025-12-31",
      "daysOverdue": 8
    }
  ]
}
```

---

### 1.8 Get Employee Performance History

```http
GET /api/hr/performance-reviews/employee/:employeeId/history
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "reviewId": "REV-2025-0001",
      "reviewType": "annual",
      "reviewPeriod": {
        "periodName": "2025 Annual Review",
        "startDate": "2025-01-01",
        "endDate": "2025-12-31"
      },
      "finalRating": "exceeds_expectations",
      "overallScore": 3.85
    },
    {
      "reviewId": "REV-2024-0001",
      "reviewType": "annual",
      "reviewPeriod": {
        "periodName": "2024 Annual Review"
      },
      "finalRating": "meets_expectations",
      "overallScore": 3.50
    }
  ]
}
```

---

### 1.9 Get Team Performance Summary

```http
GET /api/hr/performance-reviews/team/:managerId/summary
```

**Response:**

```json
{
  "success": true,
  "data": {
    "managerId": "64f...",
    "managerName": "Mohammed Al-Faisal",
    "teamSize": 8,
    "reviewsCompleted": 6,
    "reviewsPending": 2,
    "averageTeamScore": 3.65,
    "ratingDistribution": {
      "exceeds_expectations": 3,
      "meets_expectations": 4,
      "needs_improvement": 1
    },
    "topPerformers": [
      { "employeeName": "Ahmed Al-Rashid", "score": 3.85 }
    ],
    "developmentNeeds": [
      { "employeeName": "Fatima Al-Zahrani", "area": "Leadership" }
    ]
  }
}
```

---

## 2. Self-Assessment

### 2.1 Submit Self-Assessment

```http
POST /api/hr/performance-reviews/:id/self-assessment
```

**Request Body:**

```json
{
  "selfRating": 4,
  "accomplishments": "This year I successfully led 15 case closures...",
  "accomplishmentsAr": "هذا العام قدت بنجاح إغلاق 15 قضية...",
  "keyAchievements": [
    {
      "achievement": "Won landmark intellectual property case",
      "achievementAr": "فزت بقضية ملكية فكرية تاريخية",
      "impact": "Saved client SAR 5 million",
      "date": "2025-06-15"
    },
    {
      "achievement": "Mentored 2 junior associates",
      "impact": "Both promoted successfully"
    }
  ],
  "challenges": "Managing increased workload while maintaining quality",
  "challengesAr": "إدارة عبء العمل المتزايد مع الحفاظ على الجودة",
  "strengths": "Legal research, client communication, attention to detail",
  "strengthsAr": "البحث القانوني، التواصل مع العملاء، الاهتمام بالتفاصيل",
  "developmentNeeds": "Leadership skills for managing larger teams",
  "developmentNeedsAr": "مهارات القيادة لإدارة فرق أكبر",
  "careerAspirations": "Partner track within 3 years",
  "careerAspirationsAr": "مسار الشراكة خلال 3 سنوات",
  "trainingRequests": [
    {
      "trainingType": "Leadership Development Program",
      "reason": "Preparing for senior management role",
      "priority": "high"
    },
    {
      "trainingType": "Advanced Negotiation",
      "reason": "Improve settlement outcomes",
      "priority": "medium"
    }
  ],
  "additionalComments": "Would like to discuss international assignments",
  "competencyRatings": [
    {
      "competencyId": "COMP-001",
      "selfRating": 4,
      "selfComments": "Strong research skills demonstrated in IP case"
    }
  ],
  "goalComments": [
    {
      "goalId": "GOAL-REV-2025-0001-1",
      "employeeComments": "Exceeded target by 25%"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Self-assessment submitted successfully",
  "data": {
    "reviewId": "REV-2025-0001",
    "status": "manager_review_pending",
    "selfAssessment": {
      "submitted": true,
      "submittedOn": "2026-01-10"
    }
  }
}
```

---

## 3. Manager Assessment

### 3.1 Submit Manager Assessment

```http
POST /api/hr/performance-reviews/:id/manager-assessment
```

**Request Body:**

```json
{
  "overallComments": "Ahmed has demonstrated exceptional growth...",
  "overallCommentsAr": "أظهر أحمد نموًا استثنائيًا...",
  "keyAchievements": [
    {
      "achievement": "Won landmark IP case worth SAR 5M",
      "achievementAr": "فاز بقضية ملكية فكرية بقيمة 5 مليون ريال",
      "impact": "Major client retention and referrals"
    }
  ],
  "performanceHighlights": "Exceeded billable targets by 15%",
  "areasExceeded": ["Client satisfaction", "Case outcomes", "Billing targets"],
  "areasMet": ["Knowledge contribution", "Team collaboration"],
  "areasBelow": [],
  "improvementProgress": "Significant improvement in delegation skills",
  "behavioralObservations": "Consistently professional, proactive communication",
  "workQualityAssessment": "High-quality legal documents with minimal revisions",
  "collaborationAssessment": "Excellent team player, helps junior associates",
  "leadershipAssessment": "Ready for increased leadership responsibilities",
  "overallRating": "exceeds_expectations",
  "ratingJustification": "Exceeded targets across all major KPIs",
  "potentialAssessment": "promotable",
  "competencyRatings": [
    {
      "competencyId": "COMP-001",
      "managerRating": 4,
      "managerComments": "Exceptional research demonstrated in IP case",
      "behaviorsObserved": [
        { "behavior": "Thorough case analysis", "frequency": "always" }
      ]
    }
  ],
  "goalRatings": [
    {
      "goalId": "GOAL-REV-2025-0001-1",
      "managerRating": 5,
      "managerComments": "Exceeded target by 25%, exceptional quality"
    }
  ],
  "strengths": [
    {
      "strengthArea": "Legal Research & Analysis",
      "category": "technical",
      "description": "Consistently delivers thorough, accurate research",
      "examples": [
        {
          "example": "Found precedent that led to IP case victory",
          "impact": "Case won, client saved SAR 5M"
        }
      ]
    }
  ],
  "areasForImprovement": [
    {
      "improvementArea": "Team Leadership",
      "category": "leadership",
      "currentLevel": "Developing",
      "desiredLevel": "Proficient",
      "priority": "high",
      "developmentActions": [
        {
          "action": "Complete leadership program",
          "timeline": "Q2 2026"
        }
      ]
    }
  ]
}
```

---

## 4. 360-Degree Feedback

### 4.1 Request 360 Feedback

```http
POST /api/hr/performance-reviews/:id/360-feedback/request
```

**Request Body:**

```json
{
  "providers": [
    {
      "providerId": "64f...",
      "providerName": "Sara Al-Ahmed",
      "relationship": "peer",
      "anonymous": true
    },
    {
      "providerId": "64f...",
      "providerName": "Khalid Al-Qahtani",
      "relationship": "direct_report",
      "anonymous": true
    },
    {
      "providerEmail": "client@company.com",
      "providerName": "Client Representative",
      "relationship": "client",
      "anonymous": false
    }
  ],
  "competenciesToRate": ["COMP-001", "COMP-002", "COMP-003"],
  "dueDate": "2026-01-20"
}
```

**Response:**

```json
{
  "success": true,
  "message": "360 feedback requests sent to 3 providers",
  "data": {
    "requestedFrom": 3,
    "providers": [
      {
        "providerId": "64f...",
        "providerName": "Sara Al-Ahmed",
        "status": "pending",
        "requestedAt": "2026-01-05"
      }
    ]
  }
}
```

---

### 4.2 Submit 360 Feedback

```http
POST /api/hr/performance-reviews/:id/360-feedback/:providerId
```

**Request Body:**

```json
{
  "ratings": [
    {
      "competencyId": "COMP-001",
      "competency": "Legal Research",
      "rating": 4,
      "comments": "Always thorough in research"
    },
    {
      "competencyId": "COMP-002",
      "competency": "Communication",
      "rating": 5,
      "comments": "Excellent at explaining complex legal matters"
    }
  ],
  "overallRating": 4,
  "strengths": "Strong analytical skills, always prepared",
  "areasForImprovement": "Could delegate more to juniors",
  "specificFeedback": "Great to work with on complex cases"
}
```

---

## 5. Development Plans

### 5.1 Create Development Plan

```http
POST /api/hr/performance-reviews/:id/development-plan
```

**Request Body:**

```json
{
  "items": [
    {
      "objectiveName": "Leadership Development",
      "objectiveNameAr": "تطوير القيادة",
      "category": "career_progression",
      "description": "Develop leadership skills for senior role",
      "priority": "high",
      "startDate": "2026-02-01",
      "targetDate": "2026-08-01",
      "developmentActions": [
        {
          "actionType": "training",
          "actionDescription": "Leadership Excellence Program",
          "trainingName": "Executive Leadership Program",
          "trainingProvider": "Harvard Business School Online",
          "trainingDuration": 40,
          "trainingCost": 15000
        },
        {
          "actionType": "mentoring",
          "actionDescription": "Monthly meetings with senior partner",
          "mentor": "Khalid Al-Salem",
          "mentorRole": "Senior Partner"
        },
        {
          "actionType": "stretch_assignment",
          "assignmentDetails": "Lead a team on major litigation case"
        }
      ],
      "successMetrics": [
        {
          "metric": "360 feedback improvement",
          "target": "+0.5 points on leadership scores",
          "measurementMethod": "Post-program 360 assessment"
        },
        {
          "metric": "Team satisfaction",
          "target": "4.0+ rating from direct reports"
        }
      ]
    }
  ],
  "mentorAssigned": {
    "mentorId": "64f...",
    "mentorName": "Khalid Al-Salem",
    "startDate": "2026-02-01"
  },
  "careerPath": {
    "currentRole": "Senior Associate",
    "targetRole": "Partner",
    "timeframe": "3 years",
    "gapAnalysis": [
      "Leadership experience",
      "Business development track record",
      "Client portfolio development"
    ]
  },
  "successionPlanning": {
    "isSuccessor": true,
    "successorFor": ["Head of Litigation"],
    "readiness": "ready_2years",
    "developmentNeeded": "Leadership and business development"
  }
}
```

---

### 5.2 Update Development Plan Item

```http
PATCH /api/hr/performance-reviews/:id/development-plan/:itemId
```

**Request Body:**

```json
{
  "progress": 50,
  "status": "in_progress",
  "developmentActions": [
    {
      "actionId": "ACT-001",
      "status": "completed",
      "completionDate": "2026-04-15",
      "outcome": "Successfully completed leadership module",
      "effectiveness": 4
    }
  ]
}
```

---

## 6. Calibration

### 6.1 Get Calibration Sessions

```http
GET /api/hr/performance-reviews/calibration-sessions
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| periodYear | Number | Filter by year |
| departmentId | ObjectId | Filter by department |
| status | String | scheduled, in_progress, completed |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64f...",
      "sessionName": "2025 Annual Calibration - Legal Department",
      "periodYear": 2025,
      "departmentId": "64f...",
      "departmentName": "Legal",
      "scheduledDate": "2026-01-25",
      "participants": [
        { "userId": "64f...", "name": "Mohammed Al-Faisal", "role": "facilitator" }
      ],
      "reviewsToCalibrate": 15,
      "status": "scheduled"
    }
  ]
}
```

---

### 6.2 Create Calibration Session

```http
POST /api/hr/performance-reviews/calibration-sessions
```

**Request Body:**

```json
{
  "sessionName": "2025 Annual Calibration - Legal Department",
  "periodYear": 2025,
  "periodType": "annual",
  "departmentId": "64f...",
  "scheduledDate": "2026-01-25",
  "participants": [
    { "userId": "64f...", "role": "facilitator" },
    { "userId": "64f...", "role": "participant" }
  ],
  "reviewIds": ["64f...", "64f...", "64f..."],
  "targetDistribution": {
    "exceptional": 10,
    "exceeds_expectations": 20,
    "meets_expectations": 50,
    "needs_improvement": 15,
    "unsatisfactory": 5
  }
}
```

---

### 6.3 Submit Review for Calibration

```http
POST /api/hr/performance-reviews/:id/calibration
```

**Request Body:**

```json
{
  "calibrationSessionId": "64f...",
  "preCalibrationRating": "exceeds_expectations",
  "managerJustification": "Strong performance across all metrics"
}
```

---

### 6.4 Apply Calibration Result

```http
POST /api/hr/performance-reviews/:id/calibration/apply
```

**Request Body:**

```json
{
  "postCalibrationRating": "exceeds_expectations",
  "ratingAdjusted": false,
  "adjustmentReason": null,
  "comparativeRanking": 3,
  "calibrationNotes": "Rating confirmed in calibration session"
}
```

---

### 6.5 Complete Calibration Session

```http
POST /api/hr/performance-reviews/calibration-sessions/:id/complete
```

**Request Body:**

```json
{
  "finalDistribution": {
    "exceptional": 2,
    "exceeds_expectations": 4,
    "meets_expectations": 7,
    "needs_improvement": 2,
    "unsatisfactory": 0
  },
  "sessionNotes": "All ratings calibrated against team performance",
  "adjustmentsMade": 3
}
```

---

## 7. OKRs (Objectives & Key Results)

### Google-Style OKR Methodology

The system follows Google's OKR methodology:
- **Score Range**: 0.0 to 1.0
- **0.0 - 0.3**: Failed to make real progress (Red)
- **0.4 - 0.6**: Made progress but fell short (Yellow)
- **0.7 - 1.0**: Delivered (Green)

**OKR Types:**
- **Committed**: Must achieve 100% - tied to business commitments
- **Aspirational**: Stretch goals - 70% achievement is success
- **Learning**: Experimental - process of learning matters

---

### 7.1 Get All OKRs

```http
GET /api/hr/okrs
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| ownerId | ObjectId | Filter by owner |
| departmentId | ObjectId | Filter by department |
| teamId | ObjectId | Filter by team |
| level | String | company, department, team, individual |
| period | String | annual, semi_annual, quarterly, monthly |
| periodYear | Number | Filter by year |
| periodQuarter | Number | Filter by quarter (1-4) |
| status | String | draft, active, on_track, at_risk, behind, completed, cancelled, deferred |
| okrType | String | committed, aspirational, learning |
| category | String | growth, efficiency, quality, innovation, customer, people, financial, operational, strategic, learning |
| parentOkrId | ObjectId | Get child OKRs of parent |
| page | Number | Page number |
| limit | Number | Items per page |

**Response:**

```json
{
  "success": true,
  "data": {
    "okrs": [
      {
        "_id": "64f...",
        "okrId": "OKR-0001",
        "title": "Increase Client Retention Rate",
        "titleAr": "زيادة معدل الاحتفاظ بالعملاء",
        "description": "Improve client retention through better service delivery",
        "level": "department",
        "period": "annual",
        "periodYear": 2025,
        "startDate": "2025-01-01",
        "endDate": "2025-12-31",
        "okrType": "committed",
        "targetScore": 1.0,
        "status": "on_track",
        "overallProgress": 72,
        "overallScore": 0.72,
        "scoreGrade": "green",
        "scoreLabel": "On Track",
        "avgConfidence": 0.75,
        "ownerId": "64f...",
        "ownerName": "Mohammed Al-Faisal",
        "departmentId": "64f...",
        "parentOkrId": "64f...",
        "category": "customer",
        "priority": "high",
        "keyResults": [
          {
            "keyResultId": "KR-0001-1",
            "title": "Achieve 95% client satisfaction score",
            "metricType": "percentage",
            "targetValue": 95,
            "currentValue": 92,
            "startValue": 88,
            "score": 0.57,
            "scoreGrade": "yellow",
            "progress": 57,
            "status": "on_track",
            "confidence": 0.7,
            "weight": 1
          },
          {
            "keyResultId": "KR-0001-2",
            "title": "Reduce client churn to under 5%",
            "metricType": "percentage",
            "targetValue": 5,
            "currentValue": 4.2,
            "startValue": 8,
            "score": 0.87,
            "scoreGrade": "green",
            "progress": 87,
            "status": "on_track"
          }
        ],
        "cfrStats": {
          "totalConversations": 12,
          "totalFeedback": 8,
          "totalRecognitions": 5
        }
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "pages": 3
    }
  }
}
```

---

### 7.2 Get Single OKR

```http
GET /api/hr/okrs/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "okrId": "OKR-0001",
    "title": "Increase Client Retention Rate",
    "titleAr": "زيادة معدل الاحتفاظ بالعملاء",
    "description": "Improve client retention through better service delivery",
    "level": "department",
    "period": "annual",
    "periodYear": 2025,
    "periodQuarter": null,
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "parentOkrId": {
      "_id": "64f...",
      "okrId": "OKR-0000",
      "title": "Company Growth Objectives"
    },
    "childOkrIds": [
      {
        "_id": "64f...",
        "okrId": "OKR-0002",
        "title": "Individual Retention Targets"
      }
    ],
    "keyResults": [
      {
        "keyResultId": "KR-0001-1",
        "title": "Achieve 95% client satisfaction score",
        "titleAr": "تحقيق 95% درجة رضا العملاء",
        "description": "Based on quarterly NPS surveys",
        "metricType": "percentage",
        "targetValue": 95,
        "currentValue": 92,
        "startValue": 88,
        "unit": "%",
        "score": 0.57,
        "scoreGrade": "yellow",
        "progress": 57,
        "status": "on_track",
        "confidence": 0.7,
        "confidenceHistory": [
          { "date": "2025-10-01", "confidence": 0.6, "notes": "Good Q3 results" }
        ],
        "weight": 1,
        "ownerId": "64f...",
        "ownerName": "Sara Al-Ahmed",
        "updates": [
          {
            "date": "2025-10-15",
            "previousValue": 90,
            "newValue": 92,
            "note": "Q3 survey results in"
          }
        ],
        "dueDate": "2025-12-31"
      }
    ],
    "okrType": "committed",
    "targetScore": 1.0,
    "status": "on_track",
    "overallProgress": 72,
    "overallScore": 0.72,
    "scoreGrade": "green",
    "scoreLabel": "On Track",
    "scoreLabelAr": "على المسار الصحيح",
    "avgConfidence": 0.75,
    "checkIns": [
      {
        "checkInId": "CHK-001",
        "weekNumber": 42,
        "date": "2025-10-20",
        "overallProgress": 72,
        "overallScore": 0.72,
        "confidence": 0.75,
        "progress": {
          "summary": "Good progress on client satisfaction",
          "accomplishments": ["Completed Q3 surveys", "Implemented feedback system"]
        },
        "plans": {
          "summary": "Focus on at-risk clients",
          "nextActions": ["Schedule meetings with 5 at-risk clients"]
        },
        "problems": {
          "blockers": [
            {
              "blocker": "Resource constraints for client visits",
              "severity": "medium",
              "needsEscalation": false
            }
          ]
        },
        "teamMood": "positive"
      }
    ],
    "cfrs": [
      {
        "cfrId": "CFR-001",
        "type": "feedback",
        "feedbackDetails": {
          "feedbackType": "positive",
          "feedbackDirection": "manager_to_employee",
          "content": "Great progress on client retention initiatives"
        },
        "fromUser": "64f...",
        "fromUserName": "Mohammed Al-Faisal",
        "toUser": "64f...",
        "toUserName": "Sara Al-Ahmed",
        "date": "2025-10-15"
      }
    ],
    "cfrStats": {
      "totalConversations": 12,
      "totalFeedback": 8,
      "totalRecognitions": 5,
      "lastConversationDate": "2025-10-18"
    },
    "scoreHistory": [
      { "date": "2025-10-01", "score": 0.65, "grade": "yellow", "weekNumber": 40 },
      { "date": "2025-10-15", "score": 0.72, "grade": "green", "weekNumber": 42 }
    ],
    "ownerId": "64f...",
    "ownerName": "Mohammed Al-Faisal",
    "departmentId": "64f...",
    "category": "customer",
    "priority": "high",
    "visibility": "public",
    "tags": ["retention", "client-success"],
    "dependencies": [],
    "contributors": [
      {
        "employeeId": "64f...",
        "employeeName": "Sara Al-Ahmed",
        "role": "contributor"
      }
    ]
  }
}
```

---

### 7.3 Create OKR

```http
POST /api/hr/okrs
```

**Request Body:**

```json
{
  "title": "Increase Client Retention Rate",
  "titleAr": "زيادة معدل الاحتفاظ بالعملاء",
  "description": "Improve client retention through better service delivery",
  "descriptionAr": "تحسين الاحتفاظ بالعملاء من خلال تقديم خدمة أفضل",
  "level": "department",
  "period": "annual",
  "periodYear": 2025,
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "parentOkrId": "64f...",
  "okrType": "committed",
  "ownerId": "64f...",
  "departmentId": "64f...",
  "category": "customer",
  "priority": "high",
  "visibility": "public",
  "keyResults": [
    {
      "title": "Achieve 95% client satisfaction score",
      "titleAr": "تحقيق 95% درجة رضا العملاء",
      "metricType": "percentage",
      "targetValue": 95,
      "startValue": 88,
      "unit": "%",
      "weight": 1,
      "ownerId": "64f...",
      "dueDate": "2025-12-31"
    },
    {
      "title": "Reduce client churn to under 5%",
      "titleAr": "تقليل تراجع العملاء إلى أقل من 5%",
      "metricType": "percentage",
      "targetValue": 5,
      "startValue": 8,
      "weight": 1,
      "dueDate": "2025-12-31"
    },
    {
      "title": "Complete 50 client success check-ins",
      "metricType": "number",
      "targetValue": 50,
      "startValue": 0,
      "weight": 0.5,
      "dueDate": "2025-12-31"
    }
  ],
  "contributors": [
    {
      "employeeId": "64f...",
      "role": "contributor"
    }
  ],
  "tags": ["retention", "client-success"]
}
```

**Response:**

```json
{
  "success": true,
  "message": "OKR created successfully",
  "data": {
    "_id": "64f...",
    "okrId": "OKR-0001",
    "status": "draft"
  }
}
```

---

### 7.4 Update OKR

```http
PATCH /api/hr/okrs/:id
```

**Request Body:**

```json
{
  "title": "Increase Client Retention Rate to 95%",
  "priority": "critical",
  "category": "customer"
}
```

---

### 7.5 Activate OKR

```http
POST /api/hr/okrs/:id/activate
```

**Response:**

```json
{
  "success": true,
  "message": "OKR activated successfully",
  "data": {
    "okrId": "OKR-0001",
    "status": "active"
  }
}
```

---

### 7.6 Delete OKR

```http
DELETE /api/hr/okrs/:id
```

---

### 7.7 Get OKR Statistics

```http
GET /api/hr/okrs/stats
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| periodYear | Number | Filter by year |
| departmentId | ObjectId | Filter by department |

**Response:**

```json
{
  "success": true,
  "data": {
    "totalOKRs": 156,
    "byLevel": {
      "company": 5,
      "department": 25,
      "team": 45,
      "individual": 81
    },
    "byStatus": {
      "draft": 12,
      "active": 8,
      "on_track": 65,
      "at_risk": 25,
      "behind": 15,
      "completed": 28,
      "cancelled": 3
    },
    "byOkrType": {
      "committed": 98,
      "aspirational": 45,
      "learning": 13
    },
    "averageScore": 0.65,
    "averageProgress": 68,
    "scoreDistribution": {
      "green": 75,
      "yellow": 52,
      "red": 29
    },
    "completionRate": 17.9,
    "onTrackRate": 56.4
  }
}
```

---

### 7.8 Get OKR Tree (Hierarchical View)

```http
GET /api/hr/okrs/tree
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| periodYear | Number | Filter by year |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64f...",
      "okrId": "OKR-0000",
      "title": "Company Growth Objectives 2025",
      "level": "company",
      "overallScore": 0.68,
      "scoreGrade": "yellow",
      "children": [
        {
          "_id": "64f...",
          "okrId": "OKR-0001",
          "title": "Legal Department Growth",
          "level": "department",
          "overallScore": 0.72,
          "scoreGrade": "green",
          "children": [
            {
              "_id": "64f...",
              "okrId": "OKR-0002",
              "title": "Litigation Team Objectives",
              "level": "team",
              "overallScore": 0.75,
              "children": []
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 8. Key Results

### 8.1 Update Key Result Progress

```http
PATCH /api/hr/okrs/:id/key-results/:keyResultId
```

**Request Body:**

```json
{
  "currentValue": 92,
  "confidence": 0.75,
  "note": "Q3 survey results show improvement",
  "milestones": [
    {
      "milestoneId": "MS-001",
      "completed": true,
      "completedAt": "2025-10-15"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Key result updated successfully",
  "data": {
    "keyResultId": "KR-0001-1",
    "previousValue": 90,
    "currentValue": 92,
    "previousScore": 0.29,
    "newScore": 0.57,
    "progress": 57,
    "scoreGrade": "yellow",
    "status": "on_track"
  }
}
```

---

## 9. OKR Check-ins

### 9.1 Add Check-in (PPP Format)

```http
POST /api/hr/okrs/:id/check-in
```

**Request Body (Google PPP Format: Progress, Plans, Problems):**

```json
{
  "weekNumber": 42,
  "weekStartDate": "2025-10-14",
  "confidence": 0.75,
  "progress": {
    "summary": "Good progress on client satisfaction initiatives",
    "summaryAr": "تقدم جيد في مبادرات رضا العملاء",
    "accomplishments": [
      "Completed Q3 client satisfaction surveys",
      "Implemented new feedback collection system",
      "Conducted 12 client success meetings"
    ]
  },
  "plans": {
    "summary": "Focus on at-risk clients and proactive outreach",
    "summaryAr": "التركيز على العملاء المعرضين للخطر والتواصل الاستباقي",
    "nextActions": [
      "Schedule meetings with 5 at-risk clients",
      "Launch client appreciation program",
      "Complete Q4 survey preparation"
    ]
  },
  "problems": {
    "summary": "Some resource constraints identified",
    "blockers": [
      {
        "blocker": "Resource constraints for client visits",
        "blockerAr": "قيود الموارد لزيارات العملاء",
        "severity": "medium",
        "needsEscalation": false
      }
    ],
    "risksIdentified": [
      "Holiday season may slow response rates"
    ]
  },
  "keyResultUpdates": [
    {
      "keyResultId": "KR-0001-1",
      "newValue": 92,
      "confidence": 0.7,
      "note": "Q3 results in, improvement trend continues"
    },
    {
      "keyResultId": "KR-0001-2",
      "newValue": 4.5,
      "confidence": 0.8,
      "note": "Churn rate stabilizing"
    }
  ],
  "teamMood": "positive",
  "moodNote": "Team energized by Q3 results"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Check-in recorded successfully",
  "data": {
    "checkInId": "CHK-042-2025",
    "weekNumber": 42,
    "overallProgress": 72,
    "overallScore": 0.72,
    "previousScore": 0.65,
    "scoreChange": 0.07,
    "status": "on_track"
  }
}
```

---

## 10. 9-Box Grid Assessment

### 9-Box Grid Reference

The 9-Box Grid plots employees on Performance (X-axis) vs Potential (Y-axis):

```
                    POTENTIAL
           Low (1)     Medium (2)    High (3)
         ┌──────────┬──────────┬──────────┐
High (3) │  Box 7   │  Box 8   │  Box 9   │
         │  Solid   │  High    │  STAR    │
         │ Performer│ Performer│          │
         ├──────────┼──────────┼──────────┤
Med (2)  │  Box 4   │  Box 5   │  Box 6   │
P        │ Up or    │  Core    │  High    │
E        │   Out    │  Player  │ Potential│
R        ├──────────┼──────────┼──────────┤
F (1)    │  Box 1   │  Box 2   │  Box 3   │
         │ Bad Hire │ Grinder  │ Dilemma  │
         └──────────┴──────────┴──────────┘
```

**Box Positions & Strategies:**

| Box | Label | Arabic | Strategy |
|-----|-------|--------|----------|
| 1 | Bad Hire | توظيف خاطئ | Performance Improvement or Exit |
| 2 | Grinder | مجتهد | Focused Development |
| 3 | Dilemma | معضلة | Diagnose and Develop |
| 4 | Up or Out | ترقية أو إنهاء | Maintain or Transition |
| 5 | Core Player | لاعب أساسي | Develop and Engage |
| 6 | High Potential | إمكانات عالية | Accelerated Development |
| 7 | Solid Performer | أداء ثابت | Recognize and Retain |
| 8 | High Performer | أداء عالي | Invest and Grow |
| 9 | Star | نجم | Retain and Accelerate |

---

### 10.1 Get 9-Box Assessments

```http
GET /api/hr/okrs/nine-box
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| periodYear | Number | Assessment year |
| periodType | String | annual, semi_annual, quarterly |
| departmentId | ObjectId | Filter by department |
| boxPosition | Number | Filter by specific box (1-9) |
| isSuccessionCandidate | Boolean | Filter succession candidates |
| flightRisk | String | low, medium, high |
| page | Number | Page number |
| limit | Number | Items per page |

**Response:**

```json
{
  "success": true,
  "data": {
    "assessments": [
      {
        "_id": "64f...",
        "assessmentId": "9BOX-0001",
        "employeeId": {
          "_id": "64f...",
          "firstName": "Ahmed",
          "lastName": "Al-Rashid"
        },
        "employeeName": "Ahmed Al-Rashid",
        "employeeNameAr": "أحمد الراشد",
        "periodYear": 2025,
        "periodType": "annual",
        "performanceRating": 3,
        "performanceLabel": "high",
        "potentialRating": 3,
        "potentialLabel": "high",
        "boxPosition": 9,
        "boxLabel": "star",
        "boxLabelAr": "نجم",
        "isSuccessionCandidate": true,
        "targetRoles": ["Head of Litigation", "Partner"],
        "readinessLevel": "ready_1_year",
        "flightRisk": "medium",
        "retentionPriority": "critical",
        "assessedBy": "64f...",
        "assessedDate": "2026-01-15"
      }
    ],
    "pagination": {
      "total": 85,
      "page": 1,
      "pages": 5
    }
  }
}
```

---

### 10.2 Create/Update 9-Box Assessment

```http
POST /api/hr/okrs/nine-box
```

**Request Body:**

```json
{
  "employeeId": "64f...",
  "periodYear": 2025,
  "periodType": "annual",
  "performanceRating": 3,
  "performanceNotes": "Consistently exceeds targets, strong client outcomes",
  "performanceNotesAr": "يتجاوز الأهداف باستمرار، نتائج قوية مع العملاء",
  "potentialRating": 3,
  "potentialNotes": "Shows leadership potential, ready for senior role",
  "potentialNotesAr": "يظهر إمكانات قيادية، جاهز لدور أعلى",
  "performanceReviewId": "64f...",
  "recentOkrScore": 0.85,
  "skillAssessmentScore": 4.2,
  "recommendedActions": [
    {
      "action": "Fast-track for executive leadership program",
      "actionAr": "المسار السريع لبرنامج القيادة التنفيذية",
      "priority": "high",
      "dueDate": "2026-03-01"
    },
    {
      "action": "Assign C-level mentor",
      "actionAr": "تعيين موجه من المستوى التنفيذي",
      "priority": "high",
      "dueDate": "2026-02-01"
    }
  ],
  "targetRoles": ["Head of Litigation", "Partner"],
  "readinessLevel": "ready_1_year",
  "flightRisk": "medium",
  "calibrated": false
}
```

**Response:**

```json
{
  "success": true,
  "message": "9-Box assessment created successfully",
  "data": {
    "_id": "64f...",
    "assessmentId": "9BOX-0001",
    "boxPosition": 9,
    "boxLabel": "star",
    "boxLabelAr": "نجم",
    "isSuccessionCandidate": true,
    "retentionPriority": "critical",
    "recommendedActions": [
      {
        "action": "Fast-track for executive leadership program",
        "priority": "high"
      }
    ]
  }
}
```

---

### 10.3 Get 9-Box Distribution

```http
GET /api/hr/okrs/nine-box/distribution
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| periodYear | Number | Assessment year |
| departmentId | ObjectId | Filter by department |

**Response:**

```json
{
  "success": true,
  "data": {
    "distribution": [
      {
        "boxPosition": 9,
        "boxLabel": "star",
        "count": 8,
        "percentage": 9.4,
        "employees": [
          { "employeeId": "64f...", "employeeName": "Ahmed Al-Rashid" }
        ]
      },
      {
        "boxPosition": 8,
        "boxLabel": "high_performer",
        "count": 15,
        "percentage": 17.6
      },
      {
        "boxPosition": 7,
        "boxLabel": "solid_performer",
        "count": 12,
        "percentage": 14.1
      },
      {
        "boxPosition": 6,
        "boxLabel": "high_potential",
        "count": 10,
        "percentage": 11.8
      },
      {
        "boxPosition": 5,
        "boxLabel": "core_player",
        "count": 25,
        "percentage": 29.4
      },
      {
        "boxPosition": 4,
        "boxLabel": "up_or_out",
        "count": 5,
        "percentage": 5.9
      },
      {
        "boxPosition": 3,
        "boxLabel": "dilemma",
        "count": 4,
        "percentage": 4.7
      },
      {
        "boxPosition": 2,
        "boxLabel": "grinder",
        "count": 4,
        "percentage": 4.7
      },
      {
        "boxPosition": 1,
        "boxLabel": "bad_hire",
        "count": 2,
        "percentage": 2.4
      }
    ],
    "total": 85,
    "talentPoolStats": {
      "stars": 8,
      "highPerformers": 15,
      "highPotentials": 10,
      "corePlayers": 25,
      "topTalent": 33,
      "topTalentPercentage": 38.8,
      "successionCandidates": 28,
      "flightRiskHigh": 12,
      "retentionCritical": 8,
      "readyNow": 5,
      "readyIn1Year": 12
    }
  }
}
```

---

### 10.4 Get Succession Candidates

```http
GET /api/hr/okrs/nine-box/succession
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| periodYear | Number | Assessment year |
| readinessLevel | String | ready_now, ready_1_year, ready_2_years, ready_3_plus_years |
| minBoxPosition | Number | Minimum box position (default: 6) |
| targetRole | String | Filter by target role |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64f...",
      "assessmentId": "9BOX-0001",
      "employeeId": {
        "_id": "64f...",
        "employeeId": "EMP-001",
        "firstName": "Ahmed",
        "lastName": "Al-Rashid",
        "department": "Legal",
        "designation": "Senior Associate"
      },
      "employeeName": "Ahmed Al-Rashid",
      "boxPosition": 9,
      "boxLabel": "star",
      "targetRoles": ["Head of Litigation", "Partner"],
      "readinessLevel": "ready_1_year",
      "flightRisk": "medium",
      "retentionPriority": "critical",
      "recommendedActions": [
        {
          "action": "Fast-track for executive leadership program",
          "priority": "high",
          "status": "in_progress"
        }
      ]
    }
  ]
}
```

---

### 10.5 Get Employee 9-Box History

```http
GET /api/hr/okrs/nine-box/employee/:employeeId
```

**Response:**

```json
{
  "success": true,
  "data": {
    "employee": {
      "_id": "64f...",
      "employeeName": "Ahmed Al-Rashid"
    },
    "history": [
      {
        "periodYear": 2025,
        "boxPosition": 9,
        "boxLabel": "star",
        "performanceRating": 3,
        "potentialRating": 3,
        "assessedDate": "2026-01-15"
      },
      {
        "periodYear": 2024,
        "boxPosition": 8,
        "boxLabel": "high_performer",
        "performanceRating": 3,
        "potentialRating": 2,
        "assessedDate": "2025-01-12"
      },
      {
        "periodYear": 2023,
        "boxPosition": 5,
        "boxLabel": "core_player",
        "performanceRating": 2,
        "potentialRating": 2,
        "assessedDate": "2024-01-10"
      }
    ],
    "trajectory": "improving",
    "yearsToStar": null,
    "careerProgression": "Core Player → High Performer → Star"
  }
}
```

---

## 11. Review Templates

### 11.1 Get Review Templates

```http
GET /api/hr/performance-reviews/templates
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64f...",
      "templateName": "Annual Review - Legal Staff",
      "templateNameAr": "المراجعة السنوية - الموظفين القانونيين",
      "reviewType": "annual",
      "isDefault": true,
      "applicableTo": {
        "departments": ["Legal"],
        "positions": ["Associate", "Senior Associate", "Counsel"]
      },
      "competencies": [
        {
          "competencyId": "COMP-001",
          "competencyName": "Legal Research",
          "competencyCategory": "technical",
          "weight": 15,
          "required": true
        }
      ],
      "goalCategories": ["operational", "financial", "client", "learning"],
      "kpiTemplates": [
        {
          "kpiName": "Billable Hours",
          "kpiCategory": "financial",
          "defaultTarget": 1800
        }
      ],
      "sections": {
        "selfAssessment": true,
        "managerAssessment": true,
        "competencies": true,
        "goals": true,
        "kpis": true,
        "developmentPlan": true,
        "feedback360": false
      },
      "ratingScale": "1-5"
    }
  ]
}
```

---

### 11.2 Create Review Template

```http
POST /api/hr/performance-reviews/templates
```

**Request Body:**

```json
{
  "templateName": "Quarterly Review - All Staff",
  "templateNameAr": "المراجعة الربعية - جميع الموظفين",
  "reviewType": "quarterly",
  "applicableTo": {
    "departments": [],
    "positions": []
  },
  "competencies": [
    {
      "competencyId": "COMP-001",
      "competencyName": "Job Knowledge",
      "competencyCategory": "technical",
      "weight": 20,
      "required": true
    },
    {
      "competencyId": "COMP-002",
      "competencyName": "Communication",
      "competencyCategory": "behavioral",
      "weight": 15,
      "required": true
    }
  ],
  "goalCategories": ["operational", "learning"],
  "sections": {
    "selfAssessment": true,
    "managerAssessment": true,
    "competencies": true,
    "goals": true,
    "kpis": false,
    "developmentPlan": false,
    "feedback360": false
  },
  "ratingScale": "1-5"
}
```

---

### 11.3 Update Review Template

```http
PATCH /api/hr/performance-reviews/templates/:id
```

---

## Bulk Operations

### Bulk Create Reviews

```http
POST /api/hr/performance-reviews/bulk-create
```

**Request Body:**

```json
{
  "templateId": "64f...",
  "reviewType": "annual",
  "reviewPeriod": {
    "periodType": "annual",
    "periodName": "2025 Annual Review",
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "reviewDueDate": "2026-01-31",
    "selfAssessmentDueDate": "2026-01-15"
  },
  "criteria": {
    "departmentIds": ["64f...", "64f..."],
    "employmentStatuses": ["active"],
    "minimumTenureMonths": 3,
    "excludeProbation": true
  },
  "assignReviewers": "direct_manager"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Bulk review creation completed",
  "data": {
    "created": 45,
    "skipped": 3,
    "errors": 0,
    "skippedReasons": [
      { "employeeId": "EMP-045", "reason": "Already has active review" }
    ]
  }
}
```

---

### Bulk Delete Reviews

```http
POST /api/hr/performance-reviews/bulk-delete
```

**Request Body:**

```json
{
  "reviewIds": ["64f...", "64f...", "64f..."],
  "reason": "Duplicate reviews created in error"
}
```

---

## Review Completion & Acknowledgement

### Complete Review

```http
POST /api/hr/performance-reviews/:id/complete
```

**Request Body:**

```json
{
  "finalRating": "exceeds_expectations",
  "overallScore": 3.85,
  "recommendations": {
    "performanceRecommendation": "exceeds",
    "promotionRecommended": true,
    "promotionTimeline": "Q3 2026",
    "salaryIncreaseRecommended": true,
    "salaryIncreasePercentage": 12,
    "bonusRecommended": true,
    "bonusPercentage": 15
  },
  "nextSteps": {
    "nextReviewDate": "2027-01-31",
    "nextReviewType": "annual",
    "nextPeriodGoals": [
      {
        "goalName": "Lead team expansion",
        "targetMetric": "Team size",
        "targetValue": 5
      }
    ]
  }
}
```

---

### Employee Acknowledge Review

```http
POST /api/hr/performance-reviews/:id/acknowledge
```

**Request Body:**

```json
{
  "agreesWithReview": true,
  "agreement": {
    "overallRating": "agree",
    "competencies": "agree",
    "goals": "partially_agree"
  },
  "employeeComments": "Thank you for the constructive feedback",
  "employeeCommentsAr": "شكراً على الملاحظات البناءة",
  "signature": "Ahmed Al-Rashid"
}
```

---

### Send Reminder

```http
POST /api/hr/performance-reviews/:id/reminder
```

**Request Body:**

```json
{
  "reminderType": "self_assessment_due",
  "customMessage": "Please complete your self-assessment by end of week"
}
```

---

## Rating Scale Reference

### Performance Ratings (1-5)

| Rating | Label | Arabic | Description |
|--------|-------|--------|-------------|
| 5 | Exceptional | استثنائي | Consistently exceeds all expectations |
| 4 | Exceeds Expectations | يتجاوز التوقعات | Exceeds expectations in most areas |
| 3 | Meets Expectations | يلبي التوقعات | Meets all job requirements |
| 2 | Needs Improvement | يحتاج تحسين | Falls short of expectations |
| 1 | Unsatisfactory | غير مرضي | Fails to meet basic requirements |

### Competency Behavior Frequency

| Value | English | Arabic |
|-------|---------|--------|
| never | Never demonstrated | لم يُظهر أبداً |
| rarely | Rarely demonstrated | نادراً ما يُظهر |
| sometimes | Sometimes demonstrated | يُظهر أحياناً |
| often | Often demonstrated | غالباً ما يُظهر |
| always | Always demonstrated | دائماً يُظهر |

---

## Error Codes

| Code | Message |
|------|---------|
| 400 | Invalid review data |
| 400 | Invalid status transition |
| 400 | Self-assessment already submitted |
| 403 | Not authorized to access this review |
| 404 | Performance review not found |
| 404 | OKR not found |
| 409 | Employee already has active review for this period |
| 422 | Cannot complete review - missing required assessments |

---

## Saudi Labor Law Compliance Notes

### Article 64 - Performance Standards
- Employers must establish clear performance standards
- Employees must be informed of performance expectations

### Article 65 - Performance Feedback
- Regular feedback required before termination decisions
- Documentation of performance issues mandatory

### Article 77 - Termination Notice
- Poor performance requires documented warnings
- 60-day notice period for performance-based termination

### Article 80 - Immediate Termination
- Only allowed for gross misconduct (not poor performance)
- Performance issues require improvement opportunity

### Article 81 - Employee Rights During Termination
- Employee can dispute unfair termination
- Labor courts review performance documentation

---

## Best Practices

### Performance Reviews
1. Set clear objectives at start of review period
2. Conduct regular check-ins throughout the year
3. Document specific examples and evidence
4. Use consistent rating criteria across teams
5. Calibrate ratings to ensure fairness

### OKRs
1. Limit to 3-5 objectives per quarter
2. Each objective should have 2-5 key results
3. Make key results measurable and time-bound
4. Review and update weekly
5. Separate committed vs aspirational OKRs

### 9-Box Assessment
1. Assess annually after performance reviews
2. Calibrate across departments
3. Use for succession planning
4. Track movement year-over-year
5. Develop action plans for each box

---

*Part 6 of 12 - Performance Management & OKRs*
