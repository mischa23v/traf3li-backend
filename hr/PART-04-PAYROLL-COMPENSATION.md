# HR API Documentation - Part 4: Payroll & Compensation

## Overview

This document covers Payroll Processing, Salary Components, GOSI, WPS, and Compensation Management.
Compliant with Saudi Labor Law and GOSI regulations.

**Base URL:** `/api/hr`

**Authentication:** `Authorization: Bearer <JWT_TOKEN>`

---

## Table of Contents

1. [Payroll Runs](#payroll-runs)
2. [Salary Slips](#salary-slips)
3. [Salary Components](#salary-components)
4. [GOSI Integration](#gosi-integration)
5. [WPS (Wage Protection System)](#wps-wage-protection-system)
6. [Bonuses & Incentives](#bonuses--incentives)
7. [End of Service Benefits (EOSB)](#end-of-service-benefits)
8. [Schemas](#schemas)

---

## Payroll Runs

### GET /payroll/runs

Get payroll runs with filtering.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number |
| limit | number | No | Items per page |
| status | string | No | `draft`, `calculating`, `calculated`, `approved`, `processing_payment`, `paid`, `cancelled` |
| year | number | No | Filter by year |
| month | number | No | Filter by month |

**Response:**

```json
{
  "success": true,
  "data": {
    "runs": [
      {
        "_id": "ObjectId",
        "runId": "RUN-2024-001",
        "runNumber": "RUN-2024-001",
        "runName": "January 2024 Payroll",
        "runNameAr": "رواتب يناير 2024",
        "payPeriod": {
          "month": 1,
          "year": 2024,
          "calendarType": "gregorian",
          "periodStart": "2024-01-01T00:00:00Z",
          "periodEnd": "2024-01-31T00:00:00Z",
          "paymentDate": "2024-01-28T00:00:00Z",
          "cutoffDate": "2024-01-25T00:00:00Z"
        },
        "employees": {
          "totalEmployees": 150,
          "processedEmployees": 150,
          "pendingEmployees": 0,
          "failedEmployees": 0,
          "onHoldEmployees": 2
        },
        "financialSummary": {
          "totalBasicSalary": 1500000,
          "totalAllowances": 600000,
          "totalGrossPay": 2100000,
          "totalGOSI": 146250,
          "totalDeductions": 180000,
          "totalNetPay": 1920000,
          "totalEmployerGOSI": 176250
        },
        "status": "approved",
        "configuration": {
          "calendarType": "gregorian",
          "includedEmployeeTypes": ["full_time", "part_time", "contract"],
          "calculateGOSI": true,
          "gosiRate": 9.75
        },
        "approvalWorkflow": {
          "required": true,
          "currentStep": 2,
          "totalSteps": 2,
          "finalStatus": "approved"
        },
        "wps": {
          "required": true,
          "sifFile": {
            "generated": true,
            "fileName": "WPS_202401.sif",
            "recordCount": 150,
            "totalAmount": 1920000
          },
          "submission": {
            "submitted": false,
            "status": "pending"
          }
        },
        "createdAt": "2024-01-20T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "pages": 1
    }
  }
}
```

---

### GET /payroll/runs/:id

Get single payroll run with full details.

**Response:**

```json
{
  "success": true,
  "data": {
    "run": {
      "_id": "ObjectId",
      "runId": "RUN-2024-001",
      "runName": "January 2024 Payroll",
      "payPeriod": {
        "month": 1,
        "year": 2024,
        "periodStart": "2024-01-01T00:00:00Z",
        "periodEnd": "2024-01-31T00:00:00Z",
        "paymentDate": "2024-01-28T00:00:00Z"
      },
      "employees": {
        "totalEmployees": 150,
        "processedEmployees": 150
      },
      "financialSummary": {
        "totalBasicSalary": 1500000,
        "totalAllowances": 600000,
        "totalGrossPay": 2100000,
        "totalGOSI": 146250,
        "totalDeductions": 180000,
        "totalNetPay": 1920000
      },
      "employeeList": [
        {
          "employeeId": "ObjectId",
          "employeeNumber": "EMP0001",
          "employeeName": "Ahmed Al-Shammari",
          "employeeNameAr": "أحمد الشمري",
          "nationalId": "1234567890",
          "department": "Engineering",
          "jobTitle": "Software Engineer",
          "slipId": "ObjectId",
          "slipNumber": "SLIP-2024-00001",
          "earnings": {
            "basicSalary": 15000,
            "allowances": 5250,
            "overtime": 750,
            "bonus": 0,
            "grossPay": 21000
          },
          "deductions": {
            "gosi": 1462.50,
            "loans": 0,
            "advances": 500,
            "absences": 0,
            "totalDeductions": 1962.50
          },
          "netPay": 19037.50,
          "status": "calculated",
          "paymentMethod": "bank_transfer",
          "bankName": "Al Rajhi Bank",
          "iban": "SA03800000006080****19",
          "wpsIncluded": true
        }
      ],
      "financialBreakdown": {
        "earnings": {
          "totalBasicSalary": 1500000,
          "allowancesBreakdown": {
            "housingAllowance": 375000,
            "transportationAllowance": 150000,
            "foodAllowance": 50000,
            "otherAllowances": 25000,
            "totalAllowances": 600000
          },
          "variablePayBreakdown": {
            "totalOvertime": 45000,
            "overtimeHours": 600,
            "totalBonus": 50000,
            "bonusRecipients": 25,
            "totalVariablePay": 95000
          },
          "grossPay": 2195000
        },
        "deductions": {
          "statutory": {
            "totalEmployeeGOSI": 146250,
            "totalEmployerGOSI": 176250,
            "gosiBreakdown": {
              "saudiEmployees": 95,
              "saudiEmployeeContribution": 138937.50,
              "saudiEmployerContribution": 167062.50,
              "nonSaudiEmployees": 55,
              "nonSaudiEmployerContribution": 9187.50
            }
          },
          "loans": {
            "totalLoanRepayments": 25000,
            "employeesWithLoans": 15
          },
          "advances": {
            "totalAdvanceRecoveries": 8000,
            "employeesWithAdvances": 10
          },
          "attendance": {
            "totalAbsenceDeductions": 3500,
            "totalLateDeductions": 1500
          },
          "totalDeductions": 180000
        },
        "netPay": 1920000,
        "costToCompany": {
          "totalSalaries": 2195000,
          "totalEmployerGOSI": 176250,
          "totalCost": 2371250,
          "averageCostPerEmployee": 15808.33
        }
      },
      "breakdowns": {
        "byDepartment": [
          {
            "departmentName": "Engineering",
            "employeeCount": 45,
            "totalGrossPay": 945000,
            "totalNetPay": 865000,
            "averageSalary": 21000
          },
          {
            "departmentName": "Sales",
            "employeeCount": 30,
            "totalGrossPay": 450000,
            "totalNetPay": 412000,
            "averageSalary": 15000
          }
        ],
        "byPaymentMethod": [
          {
            "paymentMethod": "bank_transfer",
            "employeeCount": 145,
            "totalAmount": 1870000
          },
          {
            "paymentMethod": "cash",
            "employeeCount": 5,
            "totalAmount": 50000
          }
        ]
      },
      "validation": {
        "validated": true,
        "errorCount": 0,
        "warningCount": 3,
        "canProceed": true
      },
      "comparison": {
        "previousRunId": "ObjectId",
        "previousRunName": "December 2023 Payroll",
        "grossPayChange": 50000,
        "grossPayChangePercentage": 2.4,
        "newEmployees": 3,
        "separatedEmployees": 1
      },
      "status": "approved",
      "approvalWorkflow": {
        "steps": [
          {
            "stepNumber": 1,
            "stepName": "HR Manager",
            "approverId": "ObjectId",
            "approverName": "Sara Al-Hassan",
            "status": "approved",
            "actionDate": "2024-01-24T10:00:00Z"
          },
          {
            "stepNumber": 2,
            "stepName": "Finance Director",
            "approverId": "ObjectId",
            "approverName": "Khalid Al-Omar",
            "status": "approved",
            "actionDate": "2024-01-25T14:00:00Z"
          }
        ],
        "finalStatus": "approved"
      }
    }
  }
}
```

---

### POST /payroll/runs

Create new payroll run.

**Request Body:**

```json
{
  "runName": "January 2024 Payroll",
  "runNameAr": "رواتب يناير 2024",
  "payPeriod": {
    "month": 1,
    "year": 2024,
    "calendarType": "gregorian",
    "periodStart": "2024-01-01",
    "periodEnd": "2024-01-31",
    "paymentDate": "2024-01-28",
    "cutoffDate": "2024-01-25"
  },
  "configuration": {
    "includedEmployeeTypes": ["full_time", "part_time", "contract"],
    "includedDepartments": [],
    "includedEmploymentStatuses": ["active", "on_leave"],
    "processNewJoiners": true,
    "processSeparations": true,
    "prorateSalaries": true,
    "prorateMethod": "calendar_days",
    "includeOvertime": true,
    "overtimeApprovalRequired": true,
    "includeBonuses": true,
    "processLoans": true,
    "processAdvances": true,
    "attendanceBasedDeductions": true,
    "calculateGOSI": true
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Payroll run created",
  "data": {
    "run": {
      "_id": "ObjectId",
      "runId": "RUN-2024-001",
      "status": "draft",
      "employees": {
        "totalEmployees": 150
      }
    }
  }
}
```

---

### POST /payroll/runs/:id/calculate

Calculate payroll for all employees in the run.

**Response:**

```json
{
  "success": true,
  "message": "Payroll calculation completed",
  "data": {
    "run": {
      "status": "calculated",
      "employees": {
        "totalEmployees": 150,
        "processedEmployees": 148,
        "failedEmployees": 2
      },
      "financialSummary": {
        "totalGrossPay": 2100000,
        "totalDeductions": 180000,
        "totalNetPay": 1920000
      },
      "processingLog": [
        {
          "action": "Calculation started",
          "timestamp": "2024-01-24T09:00:00Z",
          "status": "success"
        },
        {
          "action": "Basic salary calculation",
          "affectedEmployees": 150,
          "status": "success"
        },
        {
          "action": "Allowances calculation",
          "status": "success"
        },
        {
          "action": "GOSI calculation",
          "status": "success"
        },
        {
          "action": "Deductions processing",
          "status": "success"
        },
        {
          "action": "Calculation completed",
          "timestamp": "2024-01-24T09:05:00Z",
          "duration": 300000,
          "status": "success"
        }
      ],
      "validation": {
        "errorCount": 2,
        "warningCount": 5,
        "errorMessages": [
          {
            "errorCode": "MISSING_IBAN",
            "errorMessage": "Employee EMP0045 has no bank account",
            "employeeId": "ObjectId",
            "employeeName": "Test Employee"
          }
        ]
      }
    }
  }
}
```

---

### POST /payroll/runs/:id/approve

Approve payroll run.

**Request Body:**

```json
{
  "comments": "Approved for payment",
  "commentsAr": "تمت الموافقة للصرف"
}
```

---

### POST /payroll/runs/:id/reject

Reject payroll run.

**Request Body:**

```json
{
  "reason": "Discrepancies found in overtime calculations",
  "reasonAr": "تم العثور على تناقضات في حسابات العمل الإضافي"
}
```

---

### POST /payroll/runs/:id/process-payment

Process payments for approved payroll run.

**Response:**

```json
{
  "success": true,
  "message": "Payment processing initiated",
  "data": {
    "paymentProcessing": {
      "bankTransfer": {
        "employeeCount": 145,
        "totalAmount": 1870000,
        "batchFile": {
          "generated": true,
          "fileName": "PAYMENT_202401.txt"
        },
        "status": "processing"
      },
      "cash": {
        "employeeCount": 5,
        "totalAmount": 50000,
        "status": "pending_disbursement"
      },
      "paymentStatus": "processing"
    }
  }
}
```

---

### POST /payroll/runs/:id/generate-wps

Generate WPS SIF file.

**Response:**

```json
{
  "success": true,
  "message": "WPS file generated",
  "data": {
    "wps": {
      "sifFile": {
        "generated": true,
        "fileName": "WPS_202401.sif",
        "fileUrl": "https://...",
        "fileSize": 15420,
        "recordCount": 150,
        "totalAmount": 1920000,
        "fileFormat": "MOL_SIF"
      },
      "molDetails": {
        "establishmentId": "700123456",
        "laborOfficeId": "10"
      }
    }
  }
}
```

---

### GET /payroll/stats

Get payroll statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "totalRuns": 12,
    "draftRuns": 1,
    "pendingApproval": 0,
    "completedThisMonth": 1,
    "totalPaidThisMonth": 1920000,
    "yearToDate": {
      "totalPaid": 23040000,
      "averageMonthly": 1920000,
      "totalEmployeesPaid": 150
    }
  }
}
```

---

## Salary Slips

### GET /payroll/slips

Get salary slips.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| employeeId | ObjectId | No | Filter by employee |
| payrollRunId | ObjectId | No | Filter by payroll run |
| month | number | No | Filter by month |
| year | number | No | Filter by year |
| status | string | No | `draft`, `generated`, `sent`, `viewed` |

**Response:**

```json
{
  "success": true,
  "data": {
    "slips": [
      {
        "_id": "ObjectId",
        "slipNumber": "SLIP-2024-00001",
        "payrollRunId": "ObjectId",
        "employeeId": "ObjectId",
        "employeeNumber": "EMP0001",
        "employeeName": "Ahmed Al-Shammari",
        "employeeNameAr": "أحمد الشمري",
        "nationalId": "****567890",
        "department": "Engineering",
        "jobTitle": "Software Engineer",
        "payPeriod": {
          "month": 1,
          "year": 2024,
          "periodStart": "2024-01-01",
          "periodEnd": "2024-01-31"
        },
        "earnings": {
          "basicSalary": 15000,
          "allowances": [
            { "name": "Housing", "nameAr": "بدل سكن", "amount": 3750 },
            { "name": "Transportation", "nameAr": "بدل مواصلات", "amount": 1500 }
          ],
          "totalAllowances": 5250,
          "overtime": { "hours": 10, "rate": 1.5, "amount": 750 },
          "bonus": 0,
          "otherEarnings": 0,
          "grossPay": 21000
        },
        "deductions": {
          "gosi": { "percentage": 9.75, "amount": 1462.50 },
          "loans": [],
          "advances": [{ "advanceId": "ObjectId", "amount": 500 }],
          "absenceDeductions": 0,
          "lateDeductions": 0,
          "otherDeductions": 0,
          "totalDeductions": 1962.50
        },
        "netPay": 19037.50,
        "payment": {
          "method": "bank_transfer",
          "bankName": "Al Rajhi Bank",
          "iban": "SA03800000006080****19",
          "status": "paid",
          "paidOn": "2024-01-28T00:00:00Z",
          "reference": "TXN202401280001"
        },
        "ytd": {
          "grossPay": 21000,
          "gosiDeductions": 1462.50,
          "netPay": 19037.50
        },
        "status": "sent",
        "sentOn": "2024-01-28T10:00:00Z",
        "viewedOn": "2024-01-28T14:30:00Z"
      }
    ]
  }
}
```

---

### GET /payroll/slips/:id

Get single salary slip.

---

### GET /payroll/slips/:id/pdf

Download salary slip as PDF.

**Response:** PDF file download

---

### POST /payroll/slips/:id/send

Send salary slip to employee.

**Request Body:**

```json
{
  "method": "email",
  "includeAttachment": true
}
```

---

## Salary Components

### GET /payroll/components

Get salary components.

**Response:**

```json
{
  "success": true,
  "data": {
    "components": [
      {
        "_id": "ObjectId",
        "code": "BASIC",
        "name": "Basic Salary",
        "nameAr": "الراتب الأساسي",
        "type": "earning",
        "category": "fixed",
        "isTaxable": false,
        "includedInGOSI": true,
        "includedInEOSB": true,
        "calculationType": "fixed",
        "isSystemDefault": true,
        "isActive": true,
        "sortOrder": 1
      },
      {
        "_id": "ObjectId",
        "code": "HOUSING",
        "name": "Housing Allowance",
        "nameAr": "بدل سكن",
        "type": "earning",
        "category": "allowance",
        "isTaxable": false,
        "includedInGOSI": false,
        "includedInEOSB": true,
        "calculationType": "percentage",
        "calculationBase": "basic_salary",
        "defaultPercentage": 25,
        "isActive": true,
        "sortOrder": 2
      },
      {
        "_id": "ObjectId",
        "code": "TRANSPORT",
        "name": "Transportation Allowance",
        "nameAr": "بدل مواصلات",
        "type": "earning",
        "category": "allowance",
        "isTaxable": false,
        "includedInGOSI": false,
        "includedInEOSB": true,
        "calculationType": "fixed",
        "defaultAmount": 1500,
        "isActive": true,
        "sortOrder": 3
      },
      {
        "_id": "ObjectId",
        "code": "GOSI_EMP",
        "name": "GOSI Employee Contribution",
        "nameAr": "اشتراك التأمينات - الموظف",
        "type": "deduction",
        "category": "statutory",
        "isMandatory": true,
        "calculationType": "percentage",
        "calculationBase": "basic_salary",
        "defaultPercentage": 9.75,
        "applicableTo": "saudi_only",
        "isSystemDefault": true,
        "isActive": true,
        "sortOrder": 1
      },
      {
        "_id": "ObjectId",
        "code": "OVERTIME",
        "name": "Overtime Pay",
        "nameAr": "أجر العمل الإضافي",
        "type": "earning",
        "category": "variable",
        "calculationType": "formula",
        "formula": "(basicSalary / 30 / 8) * overtimeHours * overtimeRate",
        "isActive": true,
        "sortOrder": 10
      }
    ]
  }
}
```

---

### POST /payroll/components

Create salary component.

**Request Body:**

```json
{
  "code": "MOBILE",
  "name": "Mobile Allowance",
  "nameAr": "بدل جوال",
  "type": "earning",
  "category": "allowance",
  "isTaxable": false,
  "includedInGOSI": false,
  "includedInEOSB": false,
  "calculationType": "fixed",
  "defaultAmount": 500,
  "applicableTo": "all"
}
```

---

## GOSI Integration

### GET /payroll/gosi/summary

Get GOSI contribution summary.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | number | Yes | Month |
| year | number | Yes | Year |

**Response:**

```json
{
  "success": true,
  "data": {
    "period": {
      "month": 1,
      "year": 2024
    },
    "summary": {
      "totalEmployees": 150,
      "saudiEmployees": 95,
      "nonSaudiEmployees": 55,
      "totalContributableWages": 1500000,
      "contributions": {
        "saudiEmployee": {
          "count": 95,
          "totalWages": 1425000,
          "employeeRate": 9.75,
          "employerRate": 11.75,
          "employeeContribution": 138937.50,
          "employerContribution": 167437.50,
          "totalContribution": 306375
        },
        "nonSaudi": {
          "count": 55,
          "totalWages": 75000,
          "employeeRate": 0,
          "employerRate": 2,
          "employeeContribution": 0,
          "employerContribution": 1500,
          "totalContribution": 1500
        },
        "total": {
          "employeeContribution": 138937.50,
          "employerContribution": 168937.50,
          "grandTotal": 307875
        }
      }
    },
    "breakdown": [
      {
        "employeeId": "ObjectId",
        "employeeNumber": "EMP0001",
        "employeeName": "Ahmed Al-Shammari",
        "nationalId": "1234567890",
        "gosiNumber": "1234567890",
        "nationality": "Saudi",
        "basicSalary": 15000,
        "contributableWage": 15000,
        "employeeContribution": 1462.50,
        "employerContribution": 1762.50
      }
    ]
  }
}
```

---

### POST /payroll/gosi/generate-report

Generate GOSI monthly report.

**Request Body:**

```json
{
  "month": 1,
  "year": 2024,
  "format": "excel"
}
```

---

## WPS (Wage Protection System)

### GET /payroll/wps/submissions

Get WPS submission history.

**Response:**

```json
{
  "success": true,
  "data": {
    "submissions": [
      {
        "_id": "ObjectId",
        "payrollRunId": "ObjectId",
        "runName": "January 2024 Payroll",
        "period": {
          "month": 1,
          "year": 2024
        },
        "sifFile": {
          "fileName": "WPS_202401.sif",
          "fileUrl": "https://...",
          "generatedOn": "2024-01-26T10:00:00Z",
          "recordCount": 150,
          "totalAmount": 1920000
        },
        "submission": {
          "submitted": true,
          "submissionDate": "2024-01-27T09:00:00Z",
          "submissionMethod": "mol_portal",
          "submissionReference": "WPS202401270001",
          "batchNumber": "10001234",
          "status": "accepted",
          "statusDate": "2024-01-28T00:00:00Z",
          "acceptedCount": 149,
          "rejectedCount": 1,
          "rejectedEmployees": [
            {
              "employeeName": "Test Employee",
              "nationalId": "2987654321",
              "rejectionReason": "Invalid IBAN",
              "rejectionCode": "E001"
            }
          ]
        },
        "molDetails": {
          "establishmentId": "700123456",
          "establishmentNameAr": "شركة تراف3لي",
          "laborOfficeId": "10"
        }
      }
    ]
  }
}
```

---

### POST /payroll/wps/validate

Validate employees for WPS compliance.

**Request Body:**

```json
{
  "payrollRunId": "64a1b2c3d4e5f6g7h8i9j0k1"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "valid": 148,
    "invalid": 2,
    "issues": [
      {
        "employeeId": "ObjectId",
        "employeeName": "Test Employee",
        "issues": [
          {
            "field": "iban",
            "issue": "Missing bank account IBAN"
          }
        ]
      }
    ]
  }
}
```

---

## Bonuses & Incentives

### GET /payroll/bonuses

Get bonus records.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| employeeId | ObjectId | No | Filter by employee |
| type | string | No | `performance`, `annual`, `project`, `retention`, `signing`, `referral` |
| status | string | No | `pending`, `approved`, `paid`, `cancelled` |
| year | number | No | Filter by year |

**Response:**

```json
{
  "success": true,
  "data": {
    "bonuses": [
      {
        "_id": "ObjectId",
        "bonusId": "BON-2024-00001",
        "employeeId": "ObjectId",
        "employeeName": "Ahmed Al-Shammari",
        "employeeNumber": "EMP0001",
        "type": "performance",
        "typeName": "Performance Bonus",
        "typeNameAr": "مكافأة أداء",
        "amount": 5000,
        "currency": "SAR",
        "reason": "Exceptional performance in Q4 2023",
        "reasonAr": "أداء استثنائي في الربع الرابع 2023",
        "effectiveDate": "2024-01-15",
        "paymentDate": "2024-01-28",
        "status": "approved",
        "approvedBy": "ObjectId",
        "approverName": "Ali Hassan",
        "approvedOn": "2024-01-10T10:00:00Z",
        "paidInPayrollRun": "ObjectId",
        "paidOn": "2024-01-28T00:00:00Z"
      }
    ]
  }
}
```

---

### POST /payroll/bonuses

Create bonus.

**Request Body:**

```json
{
  "employeeId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "type": "performance",
  "amount": 5000,
  "reason": "Exceptional performance in Q4 2023",
  "reasonAr": "أداء استثنائي في الربع الرابع 2023",
  "effectiveDate": "2024-01-15"
}
```

---

### POST /payroll/bonuses/bulk

Bulk create bonuses.

**Request Body:**

```json
{
  "type": "annual",
  "bonuses": [
    { "employeeId": "ObjectId", "amount": 5000 },
    { "employeeId": "ObjectId", "amount": 4500 },
    { "employeeId": "ObjectId", "amount": 4000 }
  ],
  "reason": "Annual bonus 2023",
  "effectiveDate": "2024-01-15"
}
```

---

## End of Service Benefits

### GET /payroll/eosb/calculate/:employeeId

Calculate EOSB for employee.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| terminationDate | string | No | Termination date (default: today) |
| terminationReason | string | No | Reason code |

**Response:**

```json
{
  "success": true,
  "data": {
    "employee": {
      "_id": "ObjectId",
      "employeeId": "EMP0001",
      "name": "Ahmed Al-Shammari",
      "hireDate": "2019-06-15T00:00:00Z",
      "terminationDate": "2024-01-31T00:00:00Z"
    },
    "serviceDetails": {
      "totalYears": 4.62,
      "totalMonths": 55.5,
      "totalDays": 1692
    },
    "wages": {
      "basicSalary": 15000,
      "housingAllowance": 3750,
      "transportAllowance": 1500,
      "otherIncludedAllowances": 0,
      "totalEOSBWage": 20250
    },
    "calculation": {
      "terminationReason": "resignation",
      "article": "Article 85",
      "method": "standard",
      "breakdown": {
        "firstFiveYears": {
          "years": 4.62,
          "rate": 0.5,
          "amount": 46743.75,
          "formula": "4.62 years × 20250 × 0.5"
        },
        "afterFiveYears": {
          "years": 0,
          "rate": 1,
          "amount": 0
        }
      },
      "grossEOSB": 46743.75,
      "deductions": {
        "outstandingLoans": 0,
        "outstandingAdvances": 500,
        "pendingDeductions": 0,
        "totalDeductions": 500
      },
      "netEOSB": 46243.75
    },
    "resignationRules": {
      "lessThan2Years": "No EOSB",
      "2to5Years": "1/3 of EOSB",
      "5to10Years": "2/3 of EOSB",
      "moreThan10Years": "Full EOSB",
      "appliedRule": "2to5Years",
      "adjustedAmount": 30829.17
    },
    "laborLawReference": {
      "article": "85",
      "description": "End of Service Award calculation for resignation"
    }
  }
}
```

---

### POST /payroll/eosb/process

Process EOSB payment.

**Request Body:**

```json
{
  "employeeId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "terminationDate": "2024-01-31",
  "terminationReason": "resignation",
  "calculatedAmount": 30829.17,
  "paymentMethod": "bank_transfer"
}
```

---

## Schemas

### PayrollRun Schema

```typescript
interface PayrollRun {
  _id: ObjectId;
  runId: string;  // RUN-2024-001
  runNumber?: string;
  runName: string;
  runNameAr?: string;

  payPeriod: {
    month: number;
    year: number;
    calendarType: 'hijri' | 'gregorian';
    periodStart: Date;
    periodEnd: Date;
    paymentDate: Date;
    cutoffDate?: Date;
  };

  employees: {
    totalEmployees: number;
    processedEmployees: number;
    pendingEmployees: number;
    failedEmployees: number;
    onHoldEmployees: number;
  };

  financialSummary: {
    totalBasicSalary: number;
    totalAllowances: number;
    totalGrossPay: number;
    totalGOSI: number;
    totalDeductions: number;
    totalNetPay: number;
    totalEmployerGOSI: number;
  };

  status: 'draft' | 'calculating' | 'calculated' | 'approved' |
          'processing_payment' | 'paid' | 'cancelled';

  configuration: PayrollConfiguration;
  employeeList: EmployeePayrollItem[];
  financialBreakdown?: FinancialBreakdown;
  breakdowns?: Breakdowns;
  wps?: WPSDetails;
  paymentProcessing?: PaymentProcessing;
  approvalWorkflow?: ApprovalWorkflow;
  validation?: Validation;
  comparison?: Comparison;
  processingLog?: ProcessingLog[];
  statistics?: Statistics;

  firmId: ObjectId;
  lawyerId?: ObjectId;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface EmployeePayrollItem {
  employeeId: ObjectId;
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  nationalId?: string;
  department?: string;
  jobTitle?: string;
  slipId?: ObjectId;
  slipNumber?: string;
  earnings: {
    basicSalary: number;
    allowances: number;
    overtime: number;
    bonus: number;
    commission: number;
    otherEarnings: number;
    grossPay: number;
  };
  deductions: {
    gosi: number;
    loans: number;
    advances: number;
    absences: number;
    lateDeductions: number;
    violations: number;
    otherDeductions: number;
    totalDeductions: number;
  };
  netPay: number;
  status: 'pending' | 'calculating' | 'calculated' | 'approved' | 'paid' | 'failed' | 'on_hold';
  paymentMethod: 'bank_transfer' | 'cash' | 'check';
  bankName?: string;
  iban?: string;
  wpsIncluded: boolean;
}
```

---

## GOSI Contribution Rates

### Saudi Employees

| Contribution | Rate | Covered By |
|-------------|------|------------|
| Annuities | 9% | Employee: 9%, Employer: 9% |
| Occupational Hazards | 2% | Employer only |
| SANED | 0.75% | Employee: 0.75%, Employer: 0.75% |
| **Total Employee** | **9.75%** | |
| **Total Employer** | **11.75%** | |

### Non-Saudi Employees

| Contribution | Rate | Covered By |
|-------------|------|------------|
| Occupational Hazards | 2% | Employer only |
| **Total Employer** | **2%** | |

---

## EOSB Calculation (Article 84-85)

### Employer Termination or Contract End

| Service Period | Calculation |
|---------------|-------------|
| First 5 years | Half month salary per year |
| After 5 years | Full month salary per year |

### Employee Resignation (Article 85)

| Service Period | Entitlement |
|---------------|-------------|
| Less than 2 years | No EOSB |
| 2-5 years | 1/3 of EOSB |
| 5-10 years | 2/3 of EOSB |
| More than 10 years | Full EOSB |

### Wage Base for EOSB

- Basic Salary
- Housing Allowance (if provided)
- Other contractual allowances marked as EOSB-eligible

---

**Previous:** [Part 3: Leave Management](./PART-03-LEAVE-MANAGEMENT.md)

**Next:** [Part 5: Benefits, Advances & Loans](./PART-05-BENEFITS-ADVANCES-LOANS.md)
