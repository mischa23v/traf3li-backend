# HR API Documentation - Part 3: Leave Management

## Overview

This document covers the Leave Management system including leave requests, types, balances, policies, and allocations.
Fully compliant with Saudi Labor Law leave entitlements.

**Base URL:** `/api/hr`

**Authentication:** `Authorization: Bearer <JWT_TOKEN>`

---

## Table of Contents

1. [Leave Types](#leave-types)
2. [Leave Requests](#leave-requests)
3. [Leave Balances](#leave-balances)
4. [Leave Allocations](#leave-allocations)
5. [Leave Policies](#leave-policies)
6. [Leave Periods](#leave-periods)
7. [Leave Encashment](#leave-encashment)
8. [Who's Out Calendar](#whos-out-calendar)
9. [Schemas](#schemas)

---

## Leave Types

### Saudi Labor Law Leave Entitlements

| Leave Type | Article | Duration | Paid | Requirements |
|------------|---------|----------|------|--------------|
| Annual Leave | 109 | 21-30 days | Yes | Based on service years |
| Sick Leave | 117 | 120 days | Partial | Medical certificate |
| Maternity Leave | 151 | 84 days (12 weeks) | Yes | Female employees |
| Paternity Leave | 113 | 3 days | Yes | Male employees |
| Marriage Leave | 113 | 5 days | Yes | Marriage certificate |
| Death Leave | 113 | 5 days | Yes | Death certificate |
| Hajj Leave | 114 | 10-15 days | Yes | Once per employer, 2+ years |
| Iddah Leave | 160 | 130/15 days | Yes | Widowed females |
| Exam Leave | 115 | Exam duration | Yes | Exam proof |

---

### GET /leave-types

Get all leave types.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| isActive | boolean | No | Filter by active status |
| isPaid | boolean | No | Filter by paid/unpaid |

**Response:**

```json
{
  "success": true,
  "data": {
    "leaveTypes": [
      {
        "_id": "ObjectId",
        "code": "ANNUAL",
        "leaveTypeNumber": "LT-0001",
        "name": "Annual Leave",
        "nameAr": "إجازة سنوية",
        "description": "Paid annual leave entitlement based on years of service",
        "descriptionAr": "استحقاق الإجازة السنوية المدفوعة بناءً على سنوات الخدمة",
        "laborLawArticle": "Article 109",
        "laborLawArticleAr": "المادة 109",
        "maxDays": 30,
        "minDays": 0.5,
        "isPaid": true,
        "payPercentage": 100,
        "requiresApproval": true,
        "requiresDocument": false,
        "documentType": null,
        "isAccrued": true,
        "accrualRate": 2.5,
        "allowCarryForward": true,
        "maxCarryForwardDays": 10,
        "allowEncashment": true,
        "maxEncashableDays": 15,
        "applicableGender": "all",
        "applicableEmploymentTypes": ["full_time", "part_time", "contract"],
        "minServiceDays": 0,
        "color": "#10B981",
        "sortOrder": 1,
        "isActive": true,
        "isSystemDefault": true
      },
      {
        "_id": "ObjectId",
        "code": "SICK",
        "name": "Sick Leave",
        "nameAr": "إجازة مرضية",
        "laborLawArticle": "Article 117",
        "laborLawArticleAr": "المادة 117",
        "maxDays": 120,
        "isPaid": true,
        "requiresDocument": true,
        "documentType": "medical_certificate",
        "color": "#EF4444",
        "isSystemDefault": true,
        "sickLeaveBreakdown": {
          "fullPay": { "days": 30, "percentage": 100 },
          "partialPay": { "days": 60, "percentage": 75 },
          "unpaid": { "days": 30, "percentage": 0 }
        }
      },
      {
        "_id": "ObjectId",
        "code": "MATERNITY",
        "name": "Maternity Leave",
        "nameAr": "إجازة وضع",
        "laborLawArticle": "Article 151",
        "laborLawArticleAr": "المادة 151",
        "maxDays": 84,
        "isPaid": true,
        "requiresDocument": true,
        "documentType": "medical_certificate",
        "applicableGender": "female",
        "color": "#F472B6",
        "isSystemDefault": true,
        "maternityDetails": {
          "preBirthAllowed": 28,
          "postBirthRequired": 56,
          "nursingBreaks": "1 hour per day for 2 years"
        }
      },
      {
        "_id": "ObjectId",
        "code": "HAJJ",
        "name": "Hajj Leave",
        "nameAr": "إجازة حج",
        "laborLawArticle": "Article 114",
        "laborLawArticleAr": "المادة 114",
        "maxDays": 15,
        "minDays": 10,
        "isPaid": true,
        "minServiceDays": 730,
        "color": "#8B5CF6",
        "isSystemDefault": true,
        "hajjRestrictions": {
          "oncePerEmployer": true,
          "requiresMinService": true,
          "minServiceYears": 2
        }
      },
      {
        "_id": "ObjectId",
        "code": "IDDAH",
        "name": "Iddah Leave (Widow)",
        "nameAr": "إجازة العدة",
        "laborLawArticle": "Article 160",
        "laborLawArticleAr": "المادة 160",
        "maxDays": 130,
        "isPaid": true,
        "requiresDocument": true,
        "documentType": "death_certificate",
        "applicableGender": "female",
        "color": "#1F2937",
        "isSystemDefault": true,
        "iddahDetails": {
          "muslimDays": 130,
          "nonMuslimDays": 15,
          "note": "Duration based on employee religion (personalInfo.religion)"
        }
      }
    ]
  }
}
```

---

### POST /leave-types

Create custom leave type.

**Request Body:**

```json
{
  "code": "STUDY",
  "name": "Study Leave",
  "nameAr": "إجازة دراسية",
  "description": "Leave for academic studies",
  "maxDays": 30,
  "minDays": 1,
  "isPaid": false,
  "payPercentage": 0,
  "requiresApproval": true,
  "requiresDocument": true,
  "documentType": "other",
  "isAccrued": false,
  "allowCarryForward": false,
  "applicableGender": "all",
  "applicableEmploymentTypes": ["full_time"],
  "minServiceDays": 365,
  "color": "#F59E0B"
}
```

---

### PATCH /leave-types/:id

Update leave type.

---

### DELETE /leave-types/:id

Delete leave type (only custom types, not system defaults).

---

### POST /leave-types/initialize

Initialize default Saudi Labor Law leave types for firm.

**Response:**

```json
{
  "success": true,
  "message": "Default leave types initialized",
  "data": {
    "created": 12,
    "leaveTypes": [/* Array of created leave types */]
  }
}
```

---

## Leave Requests

### GET /leave-requests

Get leave requests with filtering.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number |
| limit | number | No | Items per page |
| employeeId | ObjectId | No | Filter by employee |
| leaveType | string | No | Filter by leave type code |
| status | string | No | `draft`, `submitted`, `pending_approval`, `approved`, `rejected`, `cancelled`, `completed` |
| dateFrom | string | No | Start date range |
| dateTo | string | No | End date range |
| department | string | No | Filter by department |

**Response:**

```json
{
  "success": true,
  "data": {
    "leaveRequests": [
      {
        "_id": "ObjectId",
        "requestId": "LR-2024-00001",
        "requestNumber": "LR-2024-00001",
        "employeeId": "ObjectId",
        "employeeNumber": "EMP0001",
        "employeeName": "Ahmed Al-Shammari",
        "employeeNameAr": "أحمد الشمري",
        "nationalId": "1234567890",
        "department": "Engineering",
        "jobTitle": "Software Engineer",
        "leaveType": "annual",
        "leaveTypeName": "Annual Leave",
        "leaveTypeNameAr": "إجازة سنوية",
        "dates": {
          "startDate": "2024-02-10T00:00:00Z",
          "endDate": "2024-02-14T00:00:00Z",
          "totalDays": 5,
          "workingDays": 5,
          "halfDay": false,
          "returnDate": "2024-02-18T00:00:00Z"
        },
        "reason": "Family vacation",
        "reasonAr": "إجازة عائلية",
        "status": "approved",
        "requestedOn": "2024-01-25T10:00:00Z",
        "submittedOn": "2024-01-25T10:05:00Z",
        "approvedBy": "ObjectId",
        "approverName": "Ali Hassan",
        "approvedOn": "2024-01-26T09:00:00Z",
        "approvalComments": "Approved. Enjoy your vacation.",
        "balanceBefore": 21,
        "balanceAfter": 16,
        "leaveDetails": {
          "leaveCategory": "paid",
          "payPercentage": 100,
          "isEmergency": false,
          "contactDuringLeave": {
            "available": true,
            "contactNumber": "+966501234567",
            "email": "ahmed@company.com"
          },
          "annualLeave": {
            "entitlement": 21,
            "serviceYears": 2.5,
            "balanceBefore": 21,
            "balanceAfter": 16
          }
        },
        "workHandover": {
          "required": true,
          "delegateTo": {
            "employeeId": "ObjectId",
            "employeeName": "Sara Al-Mohsen",
            "notified": true,
            "accepted": true
          },
          "tasks": [
            {
              "taskName": "API Development",
              "priority": "high",
              "status": "pending",
              "handedOver": true,
              "instructions": "Continue with Phase 2 implementation"
            }
          ],
          "handoverCompleted": true
        },
        "approvalWorkflow": {
          "required": true,
          "steps": [
            {
              "stepNumber": 1,
              "stepName": "Direct Manager",
              "approverRole": "manager",
              "approverId": "ObjectId",
              "approverName": "Ali Hassan",
              "status": "approved",
              "actionDate": "2024-01-26T09:00:00Z",
              "comments": "Approved"
            }
          ],
          "currentStep": 1,
          "totalSteps": 1,
          "finalStatus": "approved"
        },
        "documents": [],
        "returnFromLeave": {
          "expectedReturnDate": "2024-02-18T00:00:00Z",
          "returned": false
        },
        "conflicts": {
          "hasConflicts": false,
          "teamImpact": {
            "teamSize": 10,
            "onLeaveCount": 2,
            "availableCount": 8,
            "coveragePercentage": 80,
            "acceptable": true
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

---

### GET /leave-requests/:id

Get single leave request details.

---

### POST /leave-requests

Create leave request.

**Request Body:**

```json
{
  "employeeId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "leaveType": "annual",
  "dates": {
    "startDate": "2024-02-10",
    "endDate": "2024-02-14",
    "halfDay": false,
    "halfDayPeriod": null
  },
  "reason": "Family vacation",
  "reasonAr": "إجازة عائلية",
  "leaveDetails": {
    "contactDuringLeave": {
      "available": true,
      "contactNumber": "+966501234567",
      "email": "ahmed@company.com"
    }
  },
  "workHandover": {
    "required": true,
    "delegateTo": {
      "employeeId": "64a1b2c3d4e5f6g7h8i9j0k2"
    },
    "tasks": [
      {
        "taskName": "API Development",
        "taskDescription": "Continue with Phase 2",
        "priority": "high",
        "dueDate": "2024-02-15"
      }
    ]
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Leave request created successfully",
  "data": {
    "leaveRequest": {
      "_id": "ObjectId",
      "requestId": "LR-2024-00002",
      "status": "draft",
      "dates": {
        "startDate": "2024-02-10T00:00:00Z",
        "endDate": "2024-02-14T00:00:00Z",
        "totalDays": 5,
        "workingDays": 5,
        "returnDate": "2024-02-18T00:00:00Z"
      },
      "balanceBefore": 21,
      "balanceAfter": 16
    }
  }
}
```

---

### POST /leave-requests/:id/submit

Submit leave request for approval.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | ObjectId | Yes | Leave request ID |

**Response:**

```json
{
  "success": true,
  "message": "Leave request submitted for approval",
  "data": {
    "leaveRequest": {
      "status": "pending_approval",
      "submittedOn": "2024-01-25T10:05:00Z",
      "approvalWorkflow": {
        "currentStep": 1,
        "steps": [
          {
            "stepNumber": 1,
            "stepName": "Direct Manager",
            "approverId": "ObjectId",
            "status": "pending",
            "notificationSent": true
          }
        ]
      }
    }
  }
}
```

---

### POST /leave-requests/:id/approve

Approve leave request.

**Request Body:**

```json
{
  "comments": "Approved. Please ensure handover is complete.",
  "commentsAr": "تمت الموافقة. يرجى التأكد من اكتمال التسليم."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Leave request approved",
  "data": {
    "leaveRequest": {
      "status": "approved",
      "approvedBy": "ObjectId",
      "approvedOn": "2024-01-26T09:00:00Z"
    },
    "balanceUpdated": true,
    "newBalance": 16
  }
}
```

---

### POST /leave-requests/:id/reject

Reject leave request.

**Request Body:**

```json
{
  "reason": "Critical project deadline during requested period",
  "reasonAr": "موعد نهائي حرج للمشروع خلال الفترة المطلوبة"
}
```

---

### POST /leave-requests/:id/cancel

Cancel leave request.

**Request Body:**

```json
{
  "reason": "Plans changed"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Leave request cancelled",
  "data": {
    "leaveRequest": {
      "status": "cancelled",
      "cancellation": {
        "cancelled": true,
        "cancellationDate": "2024-01-27T10:00:00Z",
        "cancellationReason": "Plans changed",
        "balanceRestored": true,
        "restoredAmount": 5
      }
    },
    "newBalance": 21
  }
}
```

---

### POST /leave-requests/:id/return

Record employee return from leave.

**Request Body:**

```json
{
  "actualReturnDate": "2024-02-18",
  "medicalClearanceProvided": false
}
```

---

### POST /leave-requests/check-conflicts

Check for leave conflicts before submission.

**Request Body:**

```json
{
  "employeeId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "startDate": "2024-02-10",
  "endDate": "2024-02-14"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "hasConflicts": false,
    "overlappingLeaves": [],
    "teamImpact": {
      "teamSize": 10,
      "onLeaveCount": 1,
      "availableCount": 9,
      "coveragePercentage": 90,
      "acceptable": true
    },
    "blackoutPeriod": {
      "inBlackoutPeriod": false
    }
  }
}
```

---

## Leave Balances

### GET /leave-balances

Get leave balances for all employees.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| employeeId | ObjectId | No | Filter by employee |
| leaveTypeCode | string | No | Filter by leave type |
| periodYear | number | No | Filter by year |

**Response:**

```json
{
  "success": true,
  "data": {
    "balances": [
      {
        "_id": "ObjectId",
        "employeeId": "ObjectId",
        "employeeName": "Ahmed Al-Shammari",
        "employeeNumber": "EMP0001",
        "periodYear": 2024,
        "leaveBalances": [
          {
            "leaveTypeId": "ObjectId",
            "leaveTypeCode": "ANNUAL",
            "leaveTypeName": "Annual Leave",
            "leaveTypeNameAr": "إجازة سنوية",
            "entitlement": 21,
            "carriedForward": 5,
            "adjustments": 0,
            "totalAvailable": 26,
            "used": 5,
            "pending": 3,
            "remaining": 18,
            "encashed": 0
          },
          {
            "leaveTypeId": "ObjectId",
            "leaveTypeCode": "SICK",
            "leaveTypeName": "Sick Leave",
            "fullPayUsed": 0,
            "fullPayRemaining": 30,
            "partialPayUsed": 0,
            "partialPayRemaining": 60,
            "unpaidUsed": 0,
            "unpaidRemaining": 30,
            "totalUsed": 0,
            "totalRemaining": 120
          },
          {
            "leaveTypeId": "ObjectId",
            "leaveTypeCode": "HAJJ",
            "leaveTypeName": "Hajj Leave",
            "entitlement": 15,
            "used": 0,
            "remaining": 15,
            "eligibleForHajj": true,
            "hajjUsedWithCurrentEmployer": false
          }
        ]
      }
    ]
  }
}
```

---

### GET /leave-balances/employee/:employeeId

Get leave balance for specific employee.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| employeeId | ObjectId | Yes | Employee ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| periodYear | number | No | Year (default: current) |

**Response:**

```json
{
  "success": true,
  "data": {
    "employee": {
      "_id": "ObjectId",
      "employeeId": "EMP0001",
      "name": "Ahmed Al-Shammari",
      "hireDate": "2022-01-15T00:00:00Z",
      "yearsOfService": 2.5
    },
    "periodYear": 2024,
    "balances": [
      {
        "leaveType": "ANNUAL",
        "name": "Annual Leave",
        "nameAr": "إجازة سنوية",
        "entitlement": 21,
        "carriedForward": 5,
        "used": 5,
        "pending": 3,
        "remaining": 18,
        "canEncash": true,
        "maxEncashable": 10
      },
      {
        "leaveType": "SICK",
        "name": "Sick Leave",
        "nameAr": "إجازة مرضية",
        "breakdown": {
          "fullPay": { "total": 30, "used": 0, "remaining": 30 },
          "partialPay": { "total": 60, "used": 0, "remaining": 60 },
          "unpaid": { "total": 30, "used": 0, "remaining": 30 }
        },
        "totalUsed": 0,
        "totalRemaining": 120
      },
      {
        "leaveType": "HAJJ",
        "name": "Hajj Leave",
        "nameAr": "إجازة حج",
        "entitlement": 15,
        "used": 0,
        "remaining": 15,
        "eligibility": {
          "eligible": true,
          "serviceYears": 2.5,
          "requiredYears": 2,
          "alreadyUsed": false
        }
      },
      {
        "leaveType": "MATERNITY",
        "name": "Maternity Leave",
        "nameAr": "إجازة وضع",
        "entitlement": 84,
        "applicable": false,
        "reason": "Employee gender is male"
      }
    ],
    "summary": {
      "totalEntitlement": 156,
      "totalUsed": 5,
      "totalPending": 3,
      "totalRemaining": 148
    }
  }
}
```

---

### POST /leave-balances/adjust

Adjust leave balance manually.

**Request Body:**

```json
{
  "employeeId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "leaveTypeCode": "ANNUAL",
  "adjustmentType": "add",
  "days": 5,
  "reason": "Compensatory days for project completion",
  "reasonAr": "أيام تعويضية عن إنجاز المشروع",
  "effectiveDate": "2024-02-01"
}
```

**Adjustment Types:**
- `add` - Add days to balance
- `deduct` - Deduct days from balance
- `reset` - Reset to specific value

---

## Leave Allocations

### GET /leave-allocations

Get leave allocations.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| employeeId | ObjectId | No | Filter by employee |
| leaveTypeCode | string | No | Filter by leave type |
| periodYear | number | No | Filter by year |
| status | string | No | `active`, `expired` |

**Response:**

```json
{
  "success": true,
  "data": {
    "allocations": [
      {
        "_id": "ObjectId",
        "allocationId": "LA-2024-00001",
        "employeeId": "ObjectId",
        "employeeName": "Ahmed Al-Shammari",
        "leaveTypeId": "ObjectId",
        "leaveTypeCode": "ANNUAL",
        "leaveTypeName": "Annual Leave",
        "periodYear": 2024,
        "periodStart": "2024-01-01T00:00:00Z",
        "periodEnd": "2024-12-31T00:00:00Z",
        "allocation": {
          "baseEntitlement": 21,
          "carriedForward": 5,
          "adjustments": 0,
          "total": 26
        },
        "used": 5,
        "pending": 3,
        "remaining": 18,
        "accrual": {
          "isAccrued": true,
          "monthlyRate": 1.75,
          "accruedToDate": 3.5,
          "nextAccrualDate": "2024-02-01T00:00:00Z"
        },
        "status": "active",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### POST /leave-allocations

Create leave allocation.

**Request Body:**

```json
{
  "employeeId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "leaveTypeCode": "ANNUAL",
  "periodYear": 2024,
  "baseEntitlement": 21,
  "carriedForward": 5,
  "notes": "Standard annual allocation"
}
```

---

### POST /leave-allocations/bulk-create

Bulk create allocations for all employees.

**Request Body:**

```json
{
  "periodYear": 2024,
  "leaveTypeCodes": ["ANNUAL", "SICK", "HAJJ"],
  "calculateCarryForward": true,
  "includeNewEmployees": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "processed": 150,
    "created": 450,
    "skipped": 0,
    "errors": []
  }
}
```

---

## Leave Policies

### GET /leave-policies

Get leave policies.

**Response:**

```json
{
  "success": true,
  "data": {
    "policies": [
      {
        "_id": "ObjectId",
        "policyId": "LP-001",
        "name": "Standard Leave Policy",
        "nameAr": "سياسة الإجازات القياسية",
        "description": "Default leave policy for all employees",
        "applicableTo": {
          "allEmployees": true,
          "departments": [],
          "employmentTypes": ["full_time", "part_time", "contract"],
          "locations": []
        },
        "rules": {
          "annual": {
            "advanceNotice": {
              "required": true,
              "minDays": 14,
              "waiverAllowed": true,
              "waiverApprover": "department_head"
            },
            "maxConsecutiveDays": 15,
            "blackoutPeriods": [
              {
                "name": "Year End",
                "startDate": "2024-12-15",
                "endDate": "2024-12-31",
                "reason": "Year-end close activities"
              }
            ],
            "minTeamCoverage": 50,
            "carryForward": {
              "allowed": true,
              "maxDays": 10,
              "expiryMonths": 3
            }
          },
          "sick": {
            "consecutiveDaysForCertificate": 3,
            "certificateMandatory": true,
            "notificationTimeframe": "same_day"
          },
          "approval": {
            "levels": [
              {
                "level": 1,
                "role": "direct_manager",
                "maxDays": 5
              },
              {
                "level": 2,
                "role": "department_head",
                "maxDays": 15
              },
              {
                "level": 3,
                "role": "hr_manager",
                "maxDays": null
              }
            ],
            "autoApproval": {
              "enabled": false,
              "afterDays": 3
            },
            "escalation": {
              "enabled": true,
              "afterDays": 2
            }
          }
        },
        "isActive": true,
        "isDefault": true,
        "effectiveFrom": "2024-01-01T00:00:00Z",
        "createdAt": "2023-12-01T00:00:00Z"
      }
    ]
  }
}
```

---

### POST /leave-policies

Create leave policy.

**Request Body:**

```json
{
  "name": "Executive Leave Policy",
  "nameAr": "سياسة إجازات المدراء التنفيذيين",
  "description": "Enhanced leave policy for executives",
  "applicableTo": {
    "allEmployees": false,
    "departments": ["Executive"],
    "employmentTypes": ["full_time"]
  },
  "rules": {
    "annual": {
      "additionalDays": 5,
      "advanceNotice": {
        "required": true,
        "minDays": 7
      },
      "maxConsecutiveDays": 21
    },
    "approval": {
      "levels": [
        {
          "level": 1,
          "role": "ceo",
          "maxDays": null
        }
      ]
    }
  }
}
```

---

## Leave Periods

### GET /leave-periods

Get leave periods (calendar years for leave management).

**Response:**

```json
{
  "success": true,
  "data": {
    "periods": [
      {
        "_id": "ObjectId",
        "periodId": "2024",
        "name": "Leave Period 2024",
        "nameAr": "فترة الإجازات 2024",
        "year": 2024,
        "startDate": "2024-01-01T00:00:00Z",
        "endDate": "2024-12-31T00:00:00Z",
        "carryForwardDeadline": "2024-03-31T00:00:00Z",
        "encashmentDeadline": "2024-06-30T00:00:00Z",
        "status": "active",
        "holidays": [
          {
            "name": "National Day",
            "nameAr": "اليوم الوطني",
            "date": "2024-09-23",
            "days": 1
          },
          {
            "name": "Eid Al-Fitr",
            "nameAr": "عيد الفطر",
            "startDate": "2024-04-09",
            "endDate": "2024-04-12",
            "days": 4
          }
        ],
        "statistics": {
          "totalEmployees": 150,
          "allocationsCreated": 450,
          "totalLeavesTaken": 1250,
          "averageLeavesPerEmployee": 8.3
        }
      }
    ]
  }
}
```

---

### POST /leave-periods

Create leave period.

**Request Body:**

```json
{
  "year": 2025,
  "name": "Leave Period 2025",
  "nameAr": "فترة الإجازات 2025",
  "startDate": "2025-01-01",
  "endDate": "2025-12-31",
  "carryForwardDeadline": "2025-03-31",
  "encashmentDeadline": "2025-06-30",
  "holidays": [
    {
      "name": "National Day",
      "nameAr": "اليوم الوطني",
      "date": "2025-09-23",
      "days": 1
    }
  ]
}
```

---

## Leave Encashment

### GET /leave-encashments

Get leave encashment requests.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| employeeId | ObjectId | No | Filter by employee |
| status | string | No | `pending`, `approved`, `processed`, `rejected` |
| periodYear | number | No | Filter by year |

**Response:**

```json
{
  "success": true,
  "data": {
    "encashments": [
      {
        "_id": "ObjectId",
        "encashmentId": "LE-2024-00001",
        "employeeId": "ObjectId",
        "employeeName": "Ahmed Al-Shammari",
        "employeeNumber": "EMP0001",
        "periodYear": 2024,
        "leaveTypeCode": "ANNUAL",
        "leaveTypeName": "Annual Leave",
        "daysRequested": 10,
        "daysApproved": 10,
        "calculation": {
          "dailyRate": 750,
          "grossAmount": 7500,
          "deductions": 0,
          "netAmount": 7500
        },
        "balanceBefore": 26,
        "balanceAfter": 16,
        "reason": "Personal financial needs",
        "status": "approved",
        "approvedBy": "ObjectId",
        "approverName": "Ali Hassan",
        "approvedOn": "2024-03-15T10:00:00Z",
        "processedInPayrollRun": null,
        "paidOn": null,
        "createdAt": "2024-03-10T10:00:00Z"
      }
    ]
  }
}
```

---

### POST /leave-encashments

Request leave encashment.

**Request Body:**

```json
{
  "employeeId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "leaveTypeCode": "ANNUAL",
  "daysRequested": 10,
  "reason": "Personal financial needs"
}
```

**Validation:**
- Cannot encash more than `maxEncashableDays` defined in leave type
- Must have sufficient leave balance
- Must be within encashment deadline for the period

**Response:**

```json
{
  "success": true,
  "message": "Encashment request submitted",
  "data": {
    "encashment": {
      "encashmentId": "LE-2024-00002",
      "daysRequested": 10,
      "calculation": {
        "dailyRate": 750,
        "grossAmount": 7500
      },
      "status": "pending"
    }
  }
}
```

---

### POST /leave-encashments/:id/approve

Approve encashment request.

---

### POST /leave-encashments/:id/reject

Reject encashment request.

---

## Who's Out Calendar

### GET /leave-calendar

Get who's out calendar view.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | number | Yes | Month (1-12) |
| year | number | Yes | Year |
| department | string | No | Filter by department |
| view | string | No | `month`, `week`, `day` (default: `month`) |

**Response:**

```json
{
  "success": true,
  "data": {
    "period": {
      "month": 2,
      "year": 2024,
      "startDate": "2024-02-01",
      "endDate": "2024-02-29"
    },
    "leaves": [
      {
        "date": "2024-02-10",
        "employees": [
          {
            "_id": "ObjectId",
            "employeeId": "EMP0001",
            "name": "Ahmed Al-Shammari",
            "nameAr": "أحمد الشمري",
            "department": "Engineering",
            "leaveType": "annual",
            "leaveTypeName": "Annual Leave",
            "color": "#10B981",
            "isPartial": false,
            "startDate": "2024-02-10",
            "endDate": "2024-02-14",
            "daysRemaining": 5
          }
        ]
      },
      {
        "date": "2024-02-15",
        "employees": [
          {
            "_id": "ObjectId",
            "employeeId": "EMP0005",
            "name": "Sara Al-Mohsen",
            "department": "Marketing",
            "leaveType": "sick",
            "leaveTypeName": "Sick Leave",
            "color": "#EF4444",
            "isPartial": false
          }
        ]
      }
    ],
    "summary": {
      "totalOnLeave": 12,
      "byDepartment": {
        "Engineering": 5,
        "Marketing": 3,
        "HR": 2,
        "Finance": 2
      },
      "byLeaveType": {
        "annual": 8,
        "sick": 3,
        "maternity": 1
      },
      "peakDays": [
        { "date": "2024-02-10", "count": 5 },
        { "date": "2024-02-11", "count": 5 }
      ]
    }
  }
}
```

---

### GET /leave-calendar/team/:managerId

Get team calendar for manager.

**Response:**

```json
{
  "success": true,
  "data": {
    "manager": {
      "_id": "ObjectId",
      "name": "Ali Hassan",
      "teamSize": 10
    },
    "leaves": [/* Same format as above */],
    "coverage": {
      "averageCoverage": 85,
      "lowCoverageDays": [
        { "date": "2024-02-12", "coverage": 60, "available": 6 }
      ]
    }
  }
}
```

---

## Schemas

### LeaveRequest Schema

```typescript
interface LeaveRequest {
  _id: ObjectId;
  requestId: string;  // LR-2024-00001
  requestNumber: string;

  // Employee
  employeeId: ObjectId;
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  nationalId?: string;
  department?: string;
  jobTitle?: string;

  // Leave Type
  leaveType: 'annual' | 'sick' | 'hajj' | 'marriage' | 'birth' | 'death' |
             'eid' | 'maternity' | 'paternity' | 'exam' | 'unpaid' | 'iddah';
  leaveTypeName?: string;
  leaveTypeNameAr?: string;

  // Dates
  dates: {
    startDate: Date;
    endDate: Date;
    totalDays: number;
    workingDays?: number;
    halfDay: boolean;
    halfDayPeriod?: 'first_half' | 'second_half';
    returnDate?: Date;
  };

  // Reason
  reason?: string;
  reasonAr?: string;

  // Status
  status: 'draft' | 'submitted' | 'pending_approval' | 'approved' |
          'rejected' | 'cancelled' | 'completed';
  requestedOn: Date;
  submittedOn?: Date;

  // Approval
  approvedBy?: ObjectId;
  approverName?: string;
  approvedOn?: Date;
  approvalComments?: string;
  rejectedBy?: ObjectId;
  rejectedOn?: Date;
  rejectionReason?: string;

  // Balance
  balanceBefore?: number;
  balanceAfter?: number;

  // Leave Details (type-specific)
  leaveDetails?: LeaveDetails;

  // Work Handover
  workHandover?: WorkHandover;

  // Approval Workflow
  approvalWorkflow?: ApprovalWorkflow;

  // Documents
  documents?: LeaveDocument[];

  // Return from Leave
  returnFromLeave?: ReturnFromLeave;

  // Conflicts
  conflicts?: Conflicts;

  // Cancellation
  cancellation?: Cancellation;

  // Multi-tenancy
  firmId: ObjectId;
  lawyerId?: ObjectId;
  createdBy?: ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

interface LeaveDetails {
  leaveCategory: 'paid' | 'unpaid' | 'partial_pay';
  payPercentage: number;
  isEmergency: boolean;
  emergencyReason?: string;

  contactDuringLeave?: {
    available: boolean;
    contactNumber?: string;
    email?: string;
  };

  // Type-specific fields
  annualLeave?: {
    entitlement: number;
    serviceYears: number;
    balanceBefore: number;
    balanceAfter: number;
  };

  sickLeave?: {
    sickLeaveType: 'full_pay' | 'partial_pay' | 'unpaid';
    payPercentage: number;
    medicalCertificate?: MedicalCertificate;
    hospitalized?: boolean;
  };

  hajjLeave?: {
    eligibility: {
      serviceYears: number;
      eligible: boolean;
      previouslyTaken: boolean;
    };
    hajjPermit?: {
      provided: boolean;
      permitNumber?: string;
    };
  };

  maternityLeave?: {
    totalDuration: number;
    preBirthLeave: number;
    postBirthLeave: number;
    expectedDeliveryDate?: Date;
    actualDeliveryDate?: Date;
    nursingBreaksEligible: boolean;
  };
}
```

### LeaveType Schema

```typescript
interface LeaveType {
  _id: ObjectId;
  code: string;
  leaveTypeNumber: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  laborLawArticle?: string;
  laborLawArticleAr?: string;

  // Configuration
  maxDays?: number;  // null = unlimited
  minDays: number;
  isPaid: boolean;
  payPercentage: number;

  // Requirements
  requiresApproval: boolean;
  requiresDocument: boolean;
  documentType?: 'medical_certificate' | 'marriage_certificate' |
                 'death_certificate' | 'birth_certificate' |
                 'travel_document' | 'other';

  // Accrual
  isAccrued: boolean;
  accrualRate: number;  // Days per month

  // Carry Forward
  allowCarryForward: boolean;
  maxCarryForwardDays: number;

  // Encashment
  allowEncashment: boolean;
  maxEncashableDays: number;

  // Applicability
  applicableGender: 'all' | 'male' | 'female';
  applicableEmploymentTypes: string[];
  minServiceDays: number;

  // Display
  color: string;
  sortOrder: number;
  isActive: boolean;
  isSystemDefault: boolean;

  // Multi-tenancy
  firmId: ObjectId;
  lawyerId?: ObjectId;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## Saudi Labor Law Reference

### Sick Leave Pay Structure (Article 117)

| Period | Duration | Pay |
|--------|----------|-----|
| First period | 30 days | 100% |
| Second period | 60 days | 75% |
| Third period | 30 days | 0% (Unpaid) |
| **Total** | **120 days** | |

### Annual Leave Entitlement (Article 109)

| Service Duration | Minimum Days |
|-----------------|--------------|
| Under 5 years | 21 days |
| 5+ years | 30 days |

### Hajj Leave Rules (Article 114)

- Duration: 10-15 days
- Paid: Yes (100%)
- Minimum service: 2 years
- Once per employer

### Iddah Leave (Article 160)

| Religion | Duration |
|----------|----------|
| Muslim widow | 130 days |
| Non-Muslim widow | 15 days |

---

**Previous:** [Part 2: Attendance & Shifts](./PART-02-ATTENDANCE-SHIFTS.md)

**Next:** [Part 4: Payroll & Compensation](./PART-04-PAYROLL-COMPENSATION.md)
