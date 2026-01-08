# HR API Documentation - Part 8: Training & Succession Planning

## Overview

This document covers Training Management and Succession Planning APIs including:
- Training Requests & Approvals
- Training Enrollment & Attendance
- Assessments & Certifications
- CLE Credits (Continuing Legal Education for Attorneys)
- Training Evaluation (Kirkpatrick Model)
- Succession Plans
- Successor Management
- Readiness Assessment

**Compliance Standards:**
- Kirkpatrick 4-Level Training Evaluation Model
- CLE (Continuing Legal Education) Requirements
- Corporate Training Budget Approval Policies

---

## Table of Contents

1. [Training Programs](#1-training-programs)
2. [Training Requests & Approvals](#2-training-requests--approvals)
3. [Training Enrollment](#3-training-enrollment)
4. [Attendance & Progress](#4-attendance--progress)
5. [Assessments](#5-assessments)
6. [Certificates & Completion](#6-certificates--completion)
7. [Training Evaluation](#7-training-evaluation)
8. [CLE Credits (Attorneys)](#8-cle-credits-attorneys)
9. [Succession Plans](#9-succession-plans)
10. [Successors Management](#10-successors-management)

---

## Base URLs

```
/api/hr/trainings          - Training Management
/api/hr/succession-plans   - Succession Planning
```

---

## Training Policies Reference

```json
{
  "approvalThresholds": {
    "level1": 5000,    // Manager approval for costs up to 5000 SAR
    "level2": 15000,   // Department head for costs up to 15000 SAR
    "level3": 50000    // Director/CEO for costs above 15000 SAR
  },
  "attendanceRequirements": {
    "minimumPercentage": 80,
    "graceMinutes": 15
  },
  "assessmentRequirements": {
    "passingScore": 70,
    "maxRetakes": 2
  },
  "cleRequirements": {
    "annualCredits": 15,
    "ethicsCredits": 3,
    "specialtyCredits": 5
  },
  "complianceGracePeriod": 30
}
```

---

## 1. Training Programs

### 1.1 Get All Trainings

```http
GET /api/hr/trainings
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| employeeId | ObjectId | Filter by employee |
| status | String | requested, approved, rejected, enrolled, in_progress, completed, cancelled, failed |
| trainingType | String | internal, external, online, certification, conference, workshop, mentoring, on_the_job |
| trainingCategory | String | technical, soft_skills, leadership, management, compliance, safety, product_knowledge, systems, legal_professional, business_development, language, other |
| deliveryMethod | String | classroom, virtual_live, self_paced_online, blended, on_the_job, simulation, workshop, seminar |
| isCLE | Boolean | Filter CLE trainings (for attorneys) |
| isMandatory | Boolean | Filter mandatory trainings |
| isOverdue | Boolean | Filter overdue compliance trainings |
| startDateFrom | Date | Start date range from |
| startDateTo | Date | Start date range to |
| page | Number | Page number |
| limit | Number | Items per page |

**Response:**

```json
{
  "success": true,
  "data": {
    "trainings": [
      {
        "_id": "64f...",
        "trainingId": "TRN-1A2B3C4D5E-WXYZ",
        "trainingNumber": "TRN-2025-0001",
        "employeeId": {
          "_id": "64f...",
          "firstName": "Ahmed",
          "lastName": "Al-Rashid"
        },
        "employeeName": "Ahmed Al-Rashid",
        "employeeNameAr": "أحمد الراشد",
        "department": "Legal",
        "jobTitle": "Senior Associate",
        "trainingTitle": "Advanced Contract Negotiation",
        "trainingTitleAr": "التفاوض المتقدم على العقود",
        "trainingType": "external",
        "trainingCategory": "legal_professional",
        "deliveryMethod": "classroom",
        "difficultyLevel": "advanced",
        "urgency": "medium",
        "status": "in_progress",
        "requestStatus": "approved",
        "startDate": "2025-12-01",
        "endDate": "2025-12-05",
        "duration": {
          "totalHours": 40,
          "totalDays": 5,
          "sessionsCount": 5
        },
        "provider": {
          "providerType": "external",
          "providerName": "Saudi Bar Association",
          "accredited": true
        },
        "cleDetails": {
          "isCLE": true,
          "cleCredits": 20,
          "cleCategory": "substantive_law",
          "approvedByBar": true
        },
        "costs": {
          "totalCost": 12000,
          "currency": "SAR"
        },
        "attendanceSummary": {
          "attendedSessions": 3,
          "totalSessions": 5,
          "attendancePercentage": 60
        },
        "progress": {
          "progressPercentage": 60
        },
        "complianceTracking": {
          "isMandatory": false,
          "overdue": false
        }
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

### 1.2 Get Single Training

```http
GET /api/hr/trainings/:trainingId
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "trainingId": "TRN-1A2B3C4D5E-WXYZ",
    "trainingNumber": "TRN-2025-0001",
    "employeeId": "64f...",
    "employeeName": "Ahmed Al-Rashid",
    "department": "Legal",
    "jobTitle": "Senior Associate",
    "trainingTitle": "Advanced Contract Negotiation",
    "trainingTitleAr": "التفاوض المتقدم على العقود",
    "trainingDescription": "Comprehensive training on advanced contract negotiation techniques...",
    "trainingType": "external",
    "trainingCategory": "legal_professional",
    "deliveryMethod": "classroom",
    "difficultyLevel": "advanced",
    "urgency": "medium",
    "trainingObjectives": [
      {
        "objective": "Master advanced negotiation techniques",
        "objectiveAr": "إتقان تقنيات التفاوض المتقدمة"
      },
      {
        "objective": "Handle complex multi-party negotiations",
        "objectiveAr": "التعامل مع المفاوضات المعقدة متعددة الأطراف"
      }
    ],
    "learningOutcomes": [
      {
        "outcome": "Analyze contract terms and identify negotiation leverage points",
        "bloomsTaxonomyLevel": "analyze"
      },
      {
        "outcome": "Create winning negotiation strategies",
        "bloomsTaxonomyLevel": "create"
      }
    ],
    "requestDate": "2025-11-01",
    "requestedBy": "employee",
    "businessJustification": "Required for handling upcoming SAR 50M acquisition",
    "requestStatus": "approved",
    "justificationDetails": {
      "alignsWithBusinessGoals": true,
      "alignsWithCareerPath": true,
      "addressesPerformanceGap": false,
      "mandatoryCompliance": false,
      "expectedBenefits": "Better client outcomes, increased win rate",
      "expectedROI": {
        "productivityIncrease": 15,
        "revenueImpact": 500000
      }
    },
    "startDate": "2025-12-01",
    "endDate": "2025-12-05",
    "duration": {
      "totalHours": 40,
      "totalDays": 5,
      "sessionsCount": 5,
      "hoursPerSession": 8
    },
    "locationType": "off_site",
    "venue": {
      "venueName": "Saudi Bar Association Training Center",
      "venueAddress": "King Fahd Road",
      "city": "Riyadh",
      "country": "Saudi Arabia",
      "room": "Conference Hall A"
    },
    "travelRequired": false,
    "provider": {
      "providerType": "professional_association",
      "providerName": "Saudi Bar Association",
      "providerNameAr": "الهيئة السعودية للمحامين",
      "contactPerson": "Mohammed Al-Qahtani",
      "contactEmail": "training@sba.sa",
      "website": "https://sba.sa/training",
      "accredited": true,
      "accreditingBody": "Ministry of Justice",
      "rating": 4.8
    },
    "cleDetails": {
      "isCLE": true,
      "cleCredits": 20,
      "cleHours": 40,
      "cleCategory": "substantive_law",
      "barApprovalNumber": "CLE-2025-1234",
      "approvedByBar": true,
      "barJurisdiction": "Saudi Arabia",
      "ethicsCredits": 2,
      "specialtyArea": "contract_law",
      "specialtyCredits": 15,
      "practiceArea": "corporate",
      "skillLevel": "advanced",
      "targetedCompetencies": ["negotiation", "contract_drafting", "risk_assessment"]
    },
    "status": "in_progress",
    "approvalWorkflow": {
      "required": true,
      "workflowSteps": [
        {
          "stepNumber": 1,
          "stepName": "Manager Approval",
          "approverRole": "direct_manager",
          "approverId": "64f...",
          "approverName": "Mohammed Al-Faisal",
          "status": "approved",
          "actionDate": "2025-11-05",
          "decision": "approve",
          "comments": "Essential for upcoming acquisition"
        },
        {
          "stepNumber": 2,
          "stepName": "HR Approval",
          "approverRole": "hr_manager",
          "approverId": "64f...",
          "approverName": "Sara Al-Ahmed",
          "status": "approved",
          "actionDate": "2025-11-07",
          "decision": "approve",
          "budgetApproval": {
            "budgetAvailable": true,
            "budgetSource": "Training Budget 2025",
            "costCenter": "CC-LEGAL-001"
          }
        }
      ],
      "currentStep": 2,
      "totalSteps": 2,
      "finalStatus": "approved",
      "finalApprovalDate": "2025-11-07"
    },
    "enrollment": {
      "enrolled": true,
      "enrollmentDate": "2025-11-10",
      "registrationNumber": "REG-SBA-2025-1234",
      "confirmationReceived": true,
      "confirmationNumber": "CONF-12345",
      "preWorkRequired": true,
      "preWorkAssignments": [
        {
          "assignmentName": "Pre-reading: Contract Fundamentals",
          "dueDate": "2025-11-28",
          "completed": true,
          "completionDate": "2025-11-25"
        }
      ],
      "preWorkCompleted": true
    },
    "sessions": [
      {
        "sessionNumber": 1,
        "sessionDate": "2025-12-01",
        "startTime": "09:00",
        "endTime": "17:00",
        "duration": 8,
        "topic": "Fundamentals of Contract Negotiation",
        "mandatory": true,
        "attended": true,
        "checkInTime": "08:55",
        "checkOutTime": "17:05",
        "late": false
      },
      {
        "sessionNumber": 2,
        "sessionDate": "2025-12-02",
        "startTime": "09:00",
        "endTime": "17:00",
        "duration": 8,
        "topic": "Multi-Party Negotiation Strategies",
        "attended": true
      },
      {
        "sessionNumber": 3,
        "sessionDate": "2025-12-03",
        "startTime": "09:00",
        "endTime": "17:00",
        "duration": 8,
        "topic": "Risk Assessment in Contracts",
        "attended": true
      }
    ],
    "attendanceSummary": {
      "totalSessions": 5,
      "attendedSessions": 3,
      "missedSessions": 0,
      "attendancePercentage": 60,
      "minimumRequired": 80,
      "meetsMinimum": false,
      "totalHoursAttended": 24
    },
    "assessments": [
      {
        "assessmentId": "ASS-001",
        "assessmentType": "pre_assessment",
        "assessmentTitle": "Pre-Training Assessment",
        "assessmentDate": "2025-11-30",
        "score": 65,
        "maxScore": 100,
        "percentageScore": 65,
        "passingScore": 70,
        "passed": false
      }
    ],
    "costs": {
      "trainingFee": {
        "baseFee": 15000,
        "currency": "SAR",
        "discount": {
          "discountType": "corporate",
          "discountPercentage": 20,
          "discountAmount": 3000
        },
        "netTrainingFee": 12000
      },
      "additionalCosts": [
        {
          "costType": "materials",
          "description": "Training materials and books",
          "amount": 500
        }
      ],
      "totalAdditionalCosts": 500,
      "totalCost": 12500,
      "costAllocation": {
        "companyPaid": 12500,
        "companyPercentage": 100
      },
      "budgetTracking": {
        "budgetYear": 2025,
        "costCenter": "CC-LEGAL-001",
        "budgetAllocated": 50000,
        "budgetUsed": 32500,
        "budgetRemaining": 17500,
        "budgetApproved": true
      },
      "payment": {
        "paymentRequired": true,
        "paymentStatus": "paid",
        "payments": [
          {
            "paymentDate": "2025-11-15",
            "amount": 12500,
            "paymentMethod": "bank_transfer",
            "paymentReference": "PAY-2025-1234",
            "paidBy": "company"
          }
        ],
        "totalPaid": 12500,
        "outstandingAmount": 0
      }
    },
    "complianceTracking": {
      "isMandatory": false,
      "overdue": false
    },
    "documents": [
      {
        "documentType": "registration_form",
        "documentName": "Training Registration Form",
        "fileUrl": "https://...",
        "uploadedOn": "2025-11-10"
      },
      {
        "documentType": "training_materials",
        "documentName": "Course Handbook",
        "fileUrl": "https://...",
        "downloadable": true
      }
    ],
    "analytics": {
      "requestToApprovalTime": 6,
      "approvalToEnrollmentTime": 3,
      "totalLeadTime": 30
    }
  }
}
```

---

### 1.3 Create Training Request

```http
POST /api/hr/trainings
```

**Request Body:**

```json
{
  "employeeId": "64f...",
  "trainingTitle": "Advanced Contract Negotiation",
  "trainingTitleAr": "التفاوض المتقدم على العقود",
  "trainingDescription": "Comprehensive training on advanced contract negotiation techniques",
  "trainingType": "external",
  "trainingCategory": "legal_professional",
  "deliveryMethod": "classroom",
  "difficultyLevel": "advanced",
  "urgency": "medium",
  "trainingObjectives": [
    {
      "objective": "Master advanced negotiation techniques",
      "objectiveAr": "إتقان تقنيات التفاوض المتقدمة"
    }
  ],
  "learningOutcomes": [
    {
      "outcome": "Analyze contract terms and identify leverage points",
      "bloomsTaxonomyLevel": "analyze"
    }
  ],
  "businessJustification": "Required for handling upcoming SAR 50M acquisition",
  "justificationDetails": {
    "alignsWithBusinessGoals": true,
    "alignsWithCareerPath": true,
    "expectedBenefits": "Better client outcomes",
    "expectedROI": {
      "productivityIncrease": 15,
      "revenueImpact": 500000
    }
  },
  "startDate": "2025-12-01",
  "endDate": "2025-12-05",
  "duration": {
    "totalHours": 40,
    "totalDays": 5,
    "sessionsCount": 5
  },
  "locationType": "off_site",
  "venue": {
    "venueName": "Saudi Bar Association Training Center",
    "city": "Riyadh",
    "country": "Saudi Arabia"
  },
  "provider": {
    "providerType": "professional_association",
    "providerName": "Saudi Bar Association",
    "accredited": true
  },
  "cleDetails": {
    "isCLE": true,
    "cleCredits": 20,
    "cleCategory": "substantive_law",
    "practiceArea": "corporate"
  },
  "costs": {
    "trainingFee": {
      "baseFee": 15000,
      "currency": "SAR"
    }
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Training request created successfully",
  "data": {
    "_id": "64f...",
    "trainingId": "TRN-1A2B3C4D5E-WXYZ",
    "trainingNumber": "TRN-2025-0001",
    "status": "requested",
    "requestStatus": "submitted"
  }
}
```

---

### 1.4 Update Training

```http
PATCH /api/hr/trainings/:trainingId
```

---

### 1.5 Delete Training

```http
DELETE /api/hr/trainings/:trainingId
```

---

### 1.6 Get Training Statistics

```http
GET /api/hr/trainings/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalTrainings": 245,
    "byStatus": {
      "requested": 15,
      "approved": 8,
      "enrolled": 12,
      "in_progress": 25,
      "completed": 175,
      "cancelled": 8,
      "failed": 2
    },
    "byType": {
      "internal": 80,
      "external": 65,
      "online": 55,
      "certification": 25,
      "conference": 15,
      "workshop": 5
    },
    "byCategory": {
      "technical": 45,
      "soft_skills": 35,
      "leadership": 30,
      "compliance": 50,
      "legal_professional": 65,
      "other": 20
    },
    "completionMetrics": {
      "totalCompleted": 175,
      "completionRate": 87.5,
      "avgAttendanceRate": 92.3,
      "avgScore": 82.5,
      "passRate": 94.2
    },
    "costMetrics": {
      "totalBudget": 500000,
      "totalSpent": 385000,
      "utilizationRate": 77,
      "avgCostPerTraining": 2200,
      "avgCostPerEmployee": 3850
    },
    "cleMetrics": {
      "totalCleTrainings": 65,
      "totalCleCredits": 1200,
      "avgCreditsPerAttorney": 18.5,
      "complianceRate": 95
    },
    "complianceMetrics": {
      "mandatoryTrainings": 50,
      "completedOnTime": 45,
      "overdue": 5,
      "complianceRate": 90
    },
    "satisfactionMetrics": {
      "avgSatisfactionScore": 4.2,
      "recommendationRate": 88
    }
  }
}
```

---

## 2. Training Requests & Approvals

### 2.1 Submit Training Request

```http
POST /api/hr/trainings/:trainingId/submit
```

**Response:**

```json
{
  "success": true,
  "message": "Training request submitted for approval",
  "data": {
    "trainingId": "TRN-2025-0001",
    "requestStatus": "submitted",
    "approvalWorkflow": {
      "currentStep": 1,
      "totalSteps": 2,
      "nextApprover": "Mohammed Al-Faisal (Manager)"
    }
  }
}
```

---

### 2.2 Approve Training

```http
POST /api/hr/trainings/:trainingId/approve
```

**Request Body:**

```json
{
  "comments": "Approved - essential for upcoming project",
  "budgetApproval": {
    "budgetAvailable": true,
    "budgetSource": "Training Budget 2025",
    "costCenter": "CC-LEGAL-001"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Training approved successfully",
  "data": {
    "trainingId": "TRN-2025-0001",
    "approvalWorkflow": {
      "currentStep": 2,
      "totalSteps": 2,
      "finalStatus": "approved"
    },
    "status": "approved"
  }
}
```

---

### 2.3 Reject Training

```http
POST /api/hr/trainings/:trainingId/reject
```

**Request Body:**

```json
{
  "rejectionReason": "Budget constraints - defer to Q2 2026",
  "comments": "Please resubmit in January 2026"
}
```

---

### 2.4 Get Pending Approvals

```http
GET /api/hr/trainings/pending-approvals
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64f...",
      "trainingNumber": "TRN-2025-0010",
      "employeeName": "Fatima Al-Zahrani",
      "trainingTitle": "Leadership Development Program",
      "totalCost": 25000,
      "requestDate": "2025-12-01",
      "pendingApproverRole": "department_head",
      "daysPending": 3
    }
  ]
}
```

---

## 3. Training Enrollment

### 3.1 Enroll in Training

```http
POST /api/hr/trainings/:trainingId/enroll
```

**Request Body:**

```json
{
  "registrationNumber": "REG-SBA-2025-1234",
  "confirmationNumber": "CONF-12345",
  "confirmationEmail": "ahmed@lawfirm.com",
  "preWorkAssignments": [
    {
      "assignmentName": "Pre-reading: Contract Fundamentals",
      "dueDate": "2025-11-28"
    }
  ],
  "accessCredentials": {
    "username": "ahmed.rashid",
    "loginUrl": "https://learning.sba.sa"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Employee enrolled successfully",
  "data": {
    "trainingId": "TRN-2025-0001",
    "status": "enrolled",
    "enrollment": {
      "enrolled": true,
      "enrollmentDate": "2025-11-10",
      "registrationNumber": "REG-SBA-2025-1234"
    }
  }
}
```

---

### 3.2 Start Training

```http
POST /api/hr/trainings/:trainingId/start
```

**Response:**

```json
{
  "success": true,
  "message": "Training started",
  "data": {
    "trainingId": "TRN-2025-0001",
    "status": "in_progress",
    "startDate": "2025-12-01"
  }
}
```

---

### 3.3 Cancel Training

```http
POST /api/hr/trainings/:trainingId/cancel
```

**Request Body:**

```json
{
  "cancellationReason": "Employee resigned",
  "refundRequested": true
}
```

---

## 4. Attendance & Progress

### 4.1 Record Session Attendance

```http
POST /api/hr/trainings/:trainingId/attendance
```

**Request Body:**

```json
{
  "sessionNumber": 1,
  "attended": true,
  "checkInTime": "08:55",
  "checkOutTime": "17:05",
  "attendanceMethod": "biometric",
  "notes": "Arrived early, participated actively"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Attendance recorded successfully",
  "data": {
    "sessionNumber": 1,
    "attended": true,
    "late": false,
    "attendanceSummary": {
      "attendedSessions": 1,
      "totalSessions": 5,
      "attendancePercentage": 20
    }
  }
}
```

---

### 4.2 Update Progress (Online Courses)

```http
POST /api/hr/trainings/:trainingId/progress
```

**Request Body:**

```json
{
  "moduleNumber": 3,
  "status": "completed",
  "duration": 2,
  "timeSpent": 2.5,
  "score": 85
}
```

**Response:**

```json
{
  "success": true,
  "message": "Progress updated successfully",
  "data": {
    "progress": {
      "totalModules": 10,
      "completedModules": 3,
      "progressPercentage": 30,
      "lastAccessDate": "2025-12-10",
      "totalTimeSpent": 8.5
    }
  }
}
```

---

## 5. Assessments

### 5.1 Submit Assessment

```http
POST /api/hr/trainings/:trainingId/assessments
```

**Request Body:**

```json
{
  "assessmentType": "final_exam",
  "assessmentTitle": "Final Assessment - Contract Negotiation",
  "assessmentDate": "2025-12-05",
  "attemptNumber": 1,
  "score": 88,
  "maxScore": 100,
  "passingScore": 70,
  "timeAllowed": 120,
  "timeSpent": 95,
  "feedback": "Excellent understanding of negotiation strategies",
  "areasOfStrength": ["BATNA analysis", "Multi-party negotiation"],
  "areasForImprovement": ["Time management in complex scenarios"]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Assessment submitted successfully",
  "data": {
    "assessmentId": "ASS-002",
    "percentageScore": 88,
    "passed": true,
    "grade": "A",
    "retakeRequired": false
  }
}
```

---

## 6. Certificates & Completion

### 6.1 Complete Training

```http
POST /api/hr/trainings/:trainingId/complete
```

**Request Body:**

```json
{
  "completionCriteria": {
    "attendanceMet": true,
    "assessmentPassed": true,
    "scoreMet": true
  },
  "finalResults": {
    "overallScore": 88,
    "grade": "A",
    "passed": true,
    "rank": 5,
    "totalParticipants": 25,
    "percentileRank": 80
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Training completed successfully",
  "data": {
    "trainingId": "TRN-2025-0001",
    "status": "completed",
    "completion": {
      "completed": true,
      "completionDate": "2025-12-05",
      "completionCriteria": {
        "allCriteriaMet": true
      },
      "finalResults": {
        "overallScore": 88,
        "grade": "A",
        "passed": true
      }
    }
  }
}
```

---

### 6.2 Issue Certificate

```http
POST /api/hr/trainings/:trainingId/issue-certificate
```

**Request Body:**

```json
{
  "certificateType": "professional",
  "certificateNumber": "CERT-SBA-2025-1234",
  "validFrom": "2025-12-05",
  "validUntil": "2027-12-05",
  "renewalRequired": true,
  "cleCredits": 20,
  "cpdPoints": 40,
  "badge": {
    "badgeName": "Advanced Contract Negotiator",
    "badgeUrl": "https://badges.sba.sa/contract-negotiator",
    "shareableLink": "https://badges.sba.sa/verify/1234"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Certificate issued successfully",
  "data": {
    "certificate": {
      "issued": true,
      "issueDate": "2025-12-06",
      "certificateNumber": "CERT-SBA-2025-1234",
      "certificateUrl": "https://...",
      "verificationUrl": "https://sba.sa/verify/CERT-SBA-2025-1234"
    }
  }
}
```

---

## 7. Training Evaluation

### Kirkpatrick 4-Level Model

| Level | Name | Focus | Timing |
|-------|------|-------|--------|
| 1 | Reaction | Participant satisfaction | Immediately after |
| 2 | Learning | Knowledge/skill acquisition | End of training |
| 3 | Behavior | On-the-job application | 30-90 days after |
| 4 | Results | Business impact | 3-6 months after |

### 7.1 Submit Evaluation

```http
POST /api/hr/trainings/:trainingId/evaluation
```

**Request Body (Level 1 - Reaction):**

```json
{
  "evaluationLevel": 1,
  "ratings": {
    "overallSatisfaction": 5,
    "contentRelevance": 5,
    "contentQuality": 4,
    "instructorKnowledge": 5,
    "instructorEffectiveness": 5,
    "materialsQuality": 4,
    "facilityRating": 4,
    "logisticsRating": 4,
    "recommendToOthers": 5,
    "valueForMoney": 4
  },
  "openEndedFeedback": {
    "whatWasGood": "Excellent case studies and practical exercises",
    "whatCouldImprove": "More time for hands-on practice",
    "mostUsefulTopics": "BATNA analysis, multi-party negotiation",
    "leastUsefulTopics": "None - all relevant",
    "willApplyLearning": true,
    "applicationPlans": "Apply to upcoming SAR 50M acquisition negotiation",
    "additionalComments": "Would attend advanced level"
  }
}
```

**Request Body (Level 3 - Behavior - 90 days post):**

```json
{
  "evaluationLevel": 3,
  "level3Behavior": {
    "behaviorChanges": [
      {
        "targetedBehavior": "Uses BATNA analysis in negotiations",
        "observed": true,
        "frequency": "often",
        "observedBy": "Mohammed Al-Faisal",
        "examples": "Successfully applied in ABC acquisition"
      }
    ],
    "skillsApplication": {
      "appliedOnJob": true,
      "applicationPercentage": 80,
      "barriers": ["Time constraints"],
      "enablers": ["Management support", "Peer encouragement"]
    },
    "managerAssessment": {
      "improvementObserved": true,
      "rating": 5,
      "specificImprovements": "Significantly better negotiation outcomes",
      "recommendationForOthers": true
    }
  }
}
```

**Request Body (Level 4 - Results - 6 months post):**

```json
{
  "evaluationLevel": 4,
  "level4Results": {
    "businessImpact": {
      "productivityIncrease": 20,
      "qualityImprovement": 15,
      "errorReduction": 25,
      "customerSatisfactionIncrease": 0.5,
      "revenueImpact": 750000,
      "costSavings": 50000
    },
    "roi": {
      "totalBenefits": 800000,
      "totalCosts": 12500,
      "netBenefits": 787500,
      "roiPercentage": 6300,
      "paybackPeriod": 1
    }
  }
}
```

---

## 8. CLE Credits (Attorneys)

### 8.1 Get CLE Summary

```http
GET /api/hr/trainings/cle-summary/:employeeId
```

**Response:**

```json
{
  "success": true,
  "data": {
    "employeeId": "64f...",
    "employeeName": "Ahmed Al-Rashid",
    "barStatus": "active",
    "compliancePeriod": {
      "startDate": "2025-01-01",
      "endDate": "2025-12-31"
    },
    "requirements": {
      "annualCredits": 15,
      "ethicsCredits": 3,
      "specialtyCredits": 5
    },
    "earned": {
      "totalCredits": 20,
      "ethicsCredits": 4,
      "specialtyCredits": 12,
      "generalCredits": 4
    },
    "compliance": {
      "totalCreditsCompliant": true,
      "ethicsCompliant": true,
      "specialtyCompliant": true,
      "overallCompliant": true
    },
    "creditsByCategory": {
      "substantive_law": 15,
      "legal_ethics": 4,
      "professional_skills": 1
    },
    "creditsByPracticeArea": {
      "corporate": 12,
      "litigation": 5,
      "labor": 3
    },
    "trainings": [
      {
        "trainingId": "TRN-2025-0001",
        "trainingTitle": "Advanced Contract Negotiation",
        "completionDate": "2025-12-05",
        "cleCredits": 20,
        "cleCategory": "substantive_law",
        "barApprovalNumber": "CLE-2025-1234"
      }
    ],
    "upcomingDeadlines": [
      {
        "requirement": "Annual CLE requirement",
        "deadline": "2025-12-31",
        "daysRemaining": 21
      }
    ]
  }
}
```

---

### 8.2 Get Overdue Compliance Trainings

```http
GET /api/hr/trainings/overdue-compliance
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "employeeId": "64f...",
      "employeeName": "Khalid Al-Salem",
      "trainingTitle": "Annual Ethics Training",
      "complianceDeadline": "2025-11-30",
      "daysOverdue": 10,
      "mandatoryReason": "regulatory",
      "consequencesOfNonCompliance": "Bar license suspension risk"
    }
  ]
}
```

---

## 9. Succession Plans

### 9.1 Get All Succession Plans

```http
GET /api/hr/succession-plans
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| status | String | draft, pending_approval, active, archived |
| positionId | ObjectId | Filter by position |
| departmentId | ObjectId | Filter by department |
| riskLevel | String | critical, high, medium, low |
| hasSuccessors | Boolean | Filter plans with/without successors |
| reviewDue | Boolean | Filter plans needing review |
| page | Number | Page number |
| limit | Number | Items per page |

**Response:**

```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "_id": "64f...",
        "planId": "SP-2025-0001",
        "positionId": "64f...",
        "positionTitle": "Head of Litigation",
        "positionTitleAr": "رئيس التقاضي",
        "incumbentId": "64f...",
        "incumbentName": "Mohammed Al-Faisal",
        "department": "Legal",
        "positionCriticality": "critical",
        "riskLevel": "high",
        "flightRisk": "medium",
        "successorCount": 3,
        "readyNowCount": 1,
        "status": "active",
        "lastReviewDate": "2025-06-15",
        "nextReviewDate": "2025-12-15"
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "pages": 2
    }
  }
}
```

---

### 9.2 Get Single Succession Plan

```http
GET /api/hr/succession-plans/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "planId": "SP-2025-0001",
    "positionId": "64f...",
    "positionTitle": "Head of Litigation",
    "positionTitleAr": "رئيس التقاضي",
    "positionLevel": "senior_management",
    "positionCriticality": "critical",
    "incumbentId": {
      "_id": "64f...",
      "firstName": "Mohammed",
      "lastName": "Al-Faisal"
    },
    "incumbentName": "Mohammed Al-Faisal",
    "incumbentTenure": 8,
    "incumbentAge": 52,
    "expectedVacancy": {
      "type": "retirement",
      "expectedDate": "2028-06-30",
      "timeToVacancy": 30
    },
    "riskAssessment": {
      "riskLevel": "high",
      "flightRisk": "medium",
      "impactIfVacant": "Critical operations disruption",
      "mitigationActions": [
        "Accelerate successor development",
        "Document critical knowledge"
      ]
    },
    "positionRequirements": {
      "minimumExperience": 10,
      "requiredSkills": [
        { "skillId": "64f...", "skillName": "Litigation Strategy", "requiredLevel": 6 },
        { "skillId": "64f...", "skillName": "Team Leadership", "requiredLevel": 5 }
      ],
      "requiredCompetencies": [
        { "competencyId": "64f...", "competencyName": "Strategic Thinking", "requiredLevel": 5 }
      ],
      "requiredCertifications": ["Saudi Bar License", "Litigation Specialist"],
      "otherRequirements": "Minimum 50 cases won"
    },
    "successors": [
      {
        "successorId": "64f...",
        "employeeId": {
          "_id": "64f...",
          "firstName": "Ahmed",
          "lastName": "Al-Rashid"
        },
        "employeeName": "Ahmed Al-Rashid",
        "currentPosition": "Senior Associate",
        "successorRank": 1,
        "readinessLevel": "ready_1_year",
        "readinessPercentage": 75,
        "strengthAreas": ["Litigation skills", "Client relationships"],
        "developmentAreas": ["Leadership experience", "Business development"],
        "nineBoxPosition": 9,
        "performanceRating": 4.5,
        "potentialRating": 5,
        "developmentPlan": {
          "goals": [
            {
              "goal": "Complete Leadership Excellence Program",
              "targetDate": "2026-06-30",
              "status": "in_progress",
              "progress": 40
            },
            {
              "goal": "Lead 3 major litigation cases",
              "targetDate": "2026-12-31",
              "status": "in_progress",
              "progress": 33
            }
          ],
          "mentorAssigned": {
            "mentorId": "64f...",
            "mentorName": "Mohammed Al-Faisal"
          },
          "trainingRecommendations": [
            "Leadership Development Program",
            "Business Development Workshop"
          ]
        },
        "lastAssessmentDate": "2025-12-01",
        "notes": "Strong candidate, needs leadership exposure"
      },
      {
        "successorId": "64f...",
        "employeeName": "Sara Al-Ahmed",
        "currentPosition": "Senior Associate",
        "successorRank": 2,
        "readinessLevel": "ready_2_years",
        "readinessPercentage": 55
      }
    ],
    "talentPoolSize": 5,
    "benchStrength": "moderate",
    "status": "active",
    "reviews": [
      {
        "reviewDate": "2025-06-15",
        "reviewedBy": "Khalid Al-Salem",
        "reviewType": "semi_annual",
        "findings": "Pipeline developing well, accelerate #1 candidate",
        "recommendations": [
          "Assign Ahmed to lead landmark case",
          "Increase Sara's client exposure"
        ]
      }
    ],
    "actions": [
      {
        "actionId": "ACT-001",
        "action": "Assign Ahmed to lead Al-Rashid Corp case",
        "owner": "Mohammed Al-Faisal",
        "dueDate": "2026-01-15",
        "status": "in_progress"
      }
    ],
    "lastReviewDate": "2025-06-15",
    "nextReviewDate": "2025-12-15",
    "approvalStatus": "approved",
    "approvedBy": "Khalid Al-Salem",
    "approvedDate": "2025-06-20"
  }
}
```

---

### 9.3 Create Succession Plan

```http
POST /api/hr/succession-plans
```

**Request Body:**

```json
{
  "positionId": "64f...",
  "positionTitle": "Head of Corporate",
  "positionTitleAr": "رئيس الشركات",
  "positionLevel": "senior_management",
  "positionCriticality": "critical",
  "incumbentId": "64f...",
  "expectedVacancy": {
    "type": "retirement",
    "expectedDate": "2027-12-31"
  },
  "riskAssessment": {
    "riskLevel": "high",
    "flightRisk": "low",
    "impactIfVacant": "Major client relationship risk"
  },
  "positionRequirements": {
    "minimumExperience": 12,
    "requiredSkills": [
      { "skillId": "64f...", "requiredLevel": 6 }
    ],
    "requiredCompetencies": [
      { "competencyId": "64f...", "requiredLevel": 5 }
    ]
  }
}
```

---

### 9.4 Update Succession Plan

```http
PATCH /api/hr/succession-plans/:id
```

---

### 9.5 Delete Succession Plan

```http
DELETE /api/hr/succession-plans/:id
```

---

### 9.6 Get Succession Plan Statistics

```http
GET /api/hr/succession-plans/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalPlans": 25,
    "byStatus": {
      "draft": 3,
      "pending_approval": 2,
      "active": 18,
      "archived": 2
    },
    "byCriticality": {
      "critical": 8,
      "high": 10,
      "medium": 5,
      "low": 2
    },
    "coverage": {
      "criticalPositions": 12,
      "coveredPositions": 10,
      "coverageRate": 83.3
    },
    "successorMetrics": {
      "totalSuccessors": 45,
      "avgSuccessorsPerPlan": 1.8,
      "readyNow": 12,
      "ready1Year": 18,
      "ready2Years": 15
    },
    "benchStrength": {
      "strong": 8,
      "moderate": 12,
      "weak": 5
    },
    "riskMetrics": {
      "highRiskPlans": 5,
      "plansWithoutSuccessors": 2,
      "overdueReviews": 3
    }
  }
}
```

---

### 9.7 Get Plans Needing Review

```http
GET /api/hr/succession-plans/review-due
```

---

### 9.8 Get High Risk Plans

```http
GET /api/hr/succession-plans/high-risk
```

---

### 9.9 Get Critical Positions Without Successors

```http
GET /api/hr/succession-plans/critical-without-successors
```

---

## 10. Successors Management

### 10.1 Add Successor

```http
POST /api/hr/succession-plans/:id/successors
```

**Request Body:**

```json
{
  "employeeId": "64f...",
  "successorRank": 2,
  "readinessLevel": "ready_2_years",
  "readinessPercentage": 55,
  "strengthAreas": ["Technical skills", "Client management"],
  "developmentAreas": ["Leadership", "Strategic planning"],
  "developmentPlan": {
    "goals": [
      {
        "goal": "Complete leadership training",
        "targetDate": "2026-06-30"
      }
    ],
    "trainingRecommendations": ["Leadership Program", "Executive MBA"]
  },
  "notes": "Strong potential, needs more exposure"
}
```

---

### 10.2 Update Successor

```http
PATCH /api/hr/succession-plans/:id/successors/:successorId
```

---

### 10.3 Remove Successor

```http
DELETE /api/hr/succession-plans/:id/successors/:successorId
```

---

### 10.4 Update Successor Readiness

```http
PATCH /api/hr/succession-plans/:id/successors/:successorId/readiness
```

**Request Body:**

```json
{
  "readinessLevel": "ready_1_year",
  "readinessPercentage": 80,
  "assessmentDate": "2026-01-15",
  "assessmentNotes": "Significant progress in leadership skills",
  "skillGapsAddressed": ["Team management", "Decision making"]
}
```

---

### 10.5 Update Successor Development Plan

```http
PATCH /api/hr/succession-plans/:id/successors/:successorId/development
```

**Request Body:**

```json
{
  "goals": [
    {
      "goal": "Lead Q2 restructuring project",
      "targetDate": "2026-06-30",
      "status": "in_progress",
      "progress": 30
    }
  ],
  "mentorAssigned": {
    "mentorId": "64f...",
    "mentorName": "Mohammed Al-Faisal"
  },
  "trainingRecommendations": [
    "Strategic Leadership Program"
  ]
}
```

---

## Succession Plan Workflow

### Submit for Approval

```http
POST /api/hr/succession-plans/:id/submit-for-approval
```

### Approve Plan

```http
POST /api/hr/succession-plans/:id/approve
```

### Reject Plan

```http
POST /api/hr/succession-plans/:id/reject
```

**Request Body:**

```json
{
  "rejectionReason": "Need more successor candidates identified"
}
```

### Activate Plan

```http
POST /api/hr/succession-plans/:id/activate
```

### Archive Plan

```http
POST /api/hr/succession-plans/:id/archive
```

---

## Review & Actions

### Add Review

```http
POST /api/hr/succession-plans/:id/reviews
```

**Request Body:**

```json
{
  "reviewType": "semi_annual",
  "findings": "Progress is on track for primary successor",
  "recommendations": [
    "Accelerate leadership development for Ahmed",
    "Add one more candidate to pipeline"
  ],
  "successorUpdates": [
    {
      "successorId": "64f...",
      "readinessChange": "improved",
      "notes": "Completed leadership module"
    }
  ]
}
```

### Add Action

```http
POST /api/hr/succession-plans/:id/actions
```

**Request Body:**

```json
{
  "action": "Assign Ahmed to lead landmark case",
  "owner": "Mohammed Al-Faisal",
  "dueDate": "2026-02-28",
  "priority": "high"
}
```

### Update Action

```http
PATCH /api/hr/succession-plans/:id/actions/:actionId
```

**Request Body:**

```json
{
  "status": "completed",
  "completionDate": "2026-02-15",
  "outcome": "Successfully led case, demonstrated leadership capability"
}
```

---

## Error Codes

| Code | Message |
|------|---------|
| 400 | Invalid training data |
| 400 | Assessment score below passing threshold |
| 403 | Not authorized to approve this training |
| 404 | Training not found |
| 404 | Succession plan not found |
| 409 | Training already completed |
| 409 | Successor already exists in plan |
| 422 | Cannot complete - attendance requirements not met |
| 422 | Cannot issue certificate - assessment not passed |

---

## Best Practices

### Training Management
1. Define clear learning objectives for each training
2. Use multi-level approval for high-cost trainings
3. Track attendance and enforce minimum requirements
4. Evaluate training effectiveness using Kirkpatrick model
5. Link trainings to skill development plans

### CLE Compliance
1. Track CLE requirements by jurisdiction
2. Monitor ethics credit requirements separately
3. Set up proactive reminders before deadlines
4. Maintain records of bar-approved trainings
5. Generate compliance reports for audits

### Succession Planning
1. Identify critical positions first
2. Maintain 2-3 successors per critical position
3. Review plans at least semi-annually
4. Link successor development to performance reviews
5. Track readiness progress over time
6. Address high-risk gaps immediately

---

*Part 8 of 12 - Training & Succession Planning*
