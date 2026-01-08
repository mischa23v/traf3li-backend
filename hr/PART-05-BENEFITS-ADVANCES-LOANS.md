# HR API Documentation - Part 5: Benefits, Advances & Loans

## Overview

This document covers Employee Benefits, Salary Advances, Loans, and Expense Claims management.

**Base URL:** `/api/hr`

**Authentication:** `Authorization: Bearer <JWT_TOKEN>`

---

## Table of Contents

1. [Employee Benefits](#employee-benefits)
2. [Salary Advances](#salary-advances)
3. [Employee Loans](#employee-loans)
4. [Expense Claims](#expense-claims)
5. [Expense Policies](#expense-policies)
6. [Schemas](#schemas)

---

## Employee Benefits

### GET /benefits

Get employee benefits.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| employeeId | ObjectId | No | Filter by employee |
| type | string | No | `medical`, `life_insurance`, `housing`, `education`, `transportation`, `other` |
| status | string | No | `active`, `pending`, `expired` |

**Response:**

```json
{
  "success": true,
  "data": {
    "benefits": [
      {
        "_id": "ObjectId",
        "benefitId": "BEN-2024-00001",
        "employeeId": "ObjectId",
        "employeeName": "Ahmed Al-Shammari",
        "employeeNumber": "EMP0001",
        "type": "medical",
        "typeName": "Medical Insurance",
        "typeNameAr": "تأمين طبي",
        "provider": {
          "name": "Bupa Arabia",
          "policyNumber": "MED-2024-123456",
          "contactPhone": "+966112345678"
        },
        "coverage": {
          "class": "VIP",
          "annualLimit": 500000,
          "usedAmount": 15000,
          "remainingAmount": 485000,
          "coverageDetails": {
            "inpatient": 100,
            "outpatient": 80,
            "dental": 5000,
            "optical": 2000,
            "maternity": 50000
          }
        },
        "dependents": [
          {
            "name": "Fatima Al-Shammari",
            "relationship": "spouse",
            "dateOfBirth": "1992-03-15",
            "memberNumber": "DEP-001"
          },
          {
            "name": "Mohammed Al-Shammari",
            "relationship": "child",
            "dateOfBirth": "2018-07-20",
            "memberNumber": "DEP-002"
          }
        ],
        "cost": {
          "monthlyPremium": 2500,
          "employeeContribution": 500,
          "employerContribution": 2000,
          "currency": "SAR"
        },
        "validFrom": "2024-01-01T00:00:00Z",
        "validTo": "2024-12-31T00:00:00Z",
        "status": "active",
        "enrollmentDate": "2023-12-15T00:00:00Z"
      }
    ]
  }
}
```

---

### POST /benefits

Enroll employee in benefit.

**Request Body:**

```json
{
  "employeeId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "type": "medical",
  "provider": {
    "name": "Bupa Arabia",
    "policyNumber": "MED-2024-123456"
  },
  "coverage": {
    "class": "VIP",
    "annualLimit": 500000
  },
  "dependents": [
    {
      "name": "Fatima Al-Shammari",
      "relationship": "spouse",
      "dateOfBirth": "1992-03-15"
    }
  ],
  "cost": {
    "monthlyPremium": 2500,
    "employeeContribution": 500,
    "employerContribution": 2000
  },
  "validFrom": "2024-01-01",
  "validTo": "2024-12-31"
}
```

---

### GET /benefits/plans

Get available benefit plans.

**Response:**

```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "_id": "ObjectId",
        "planId": "PLAN-MED-VIP",
        "name": "VIP Medical Coverage",
        "nameAr": "تغطية طبية VIP",
        "type": "medical",
        "provider": "Bupa Arabia",
        "description": "Premium medical coverage for executives",
        "features": [
          "500,000 SAR annual limit",
          "100% inpatient coverage",
          "80% outpatient coverage",
          "Dental and optical included"
        ],
        "eligibility": {
          "employmentTypes": ["full_time"],
          "minServiceMonths": 0,
          "grades": ["G7", "G8", "G9"]
        },
        "cost": {
          "employeePerMonth": 500,
          "employerPerMonth": 2000,
          "dependentPerMonth": 300
        },
        "isActive": true
      }
    ]
  }
}
```

---

## Salary Advances

### GET /advances

Get salary advance requests.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| employeeId | ObjectId | No | Filter by employee |
| status | string | No | `pending`, `approved`, `rejected`, `disbursed`, `recovered`, `cancelled` |
| month | number | No | Filter by month |
| year | number | No | Filter by year |

**Response:**

```json
{
  "success": true,
  "data": {
    "advances": [
      {
        "_id": "ObjectId",
        "advanceId": "ADV-2024-00001",
        "advanceNumber": "ADV-2024-00001",
        "employeeId": "ObjectId",
        "employeeName": "Ahmed Al-Shammari",
        "employeeNumber": "EMP0001",
        "department": "Engineering",
        "requestDate": "2024-01-10T10:00:00Z",
        "amount": 5000,
        "currency": "SAR",
        "reason": "Emergency medical expenses",
        "reasonAr": "نفقات طبية طارئة",
        "category": "emergency",
        "eligibility": {
          "monthlyBasic": 15000,
          "maxAdvanceAllowed": 15000,
          "currentOutstanding": 0,
          "availableLimit": 15000,
          "isEligible": true
        },
        "recovery": {
          "method": "single",
          "deductFromPayroll": true,
          "recoveryMonth": 1,
          "recoveryYear": 2024,
          "installments": 1,
          "installmentAmount": 5000,
          "schedule": [
            {
              "installmentNumber": 1,
              "dueDate": "2024-01-28",
              "amount": 5000,
              "status": "pending"
            }
          ],
          "recovered": 0,
          "outstanding": 5000
        },
        "status": "approved",
        "approvedBy": "ObjectId",
        "approverName": "Ali Hassan",
        "approvedOn": "2024-01-11T09:00:00Z",
        "disbursement": {
          "method": "bank_transfer",
          "disbursedOn": "2024-01-12T00:00:00Z",
          "reference": "TXN202401120001"
        },
        "documents": [],
        "createdAt": "2024-01-10T10:00:00Z"
      }
    ],
    "summary": {
      "totalRequests": 25,
      "totalAmount": 75000,
      "pendingApproval": 3,
      "pendingDisbursement": 2,
      "totalOutstanding": 45000
    }
  }
}
```

---

### POST /advances

Request salary advance.

**Request Body:**

```json
{
  "amount": 5000,
  "reason": "Emergency medical expenses",
  "reasonAr": "نفقات طبية طارئة",
  "category": "emergency",
  "recovery": {
    "method": "single",
    "recoveryMonth": 1,
    "recoveryYear": 2024
  },
  "documents": []
}
```

**Advance Categories:**
- `emergency` - Emergency expenses
- `medical` - Medical expenses
- `education` - Education expenses
- `personal` - Personal needs
- `other` - Other reasons

**Recovery Methods:**
- `single` - Full deduction from next payroll
- `installments` - Split across multiple payrolls

**Response:**

```json
{
  "success": true,
  "message": "Advance request submitted",
  "data": {
    "advance": {
      "advanceId": "ADV-2024-00002",
      "amount": 5000,
      "status": "pending",
      "eligibility": {
        "isEligible": true,
        "availableLimit": 15000
      }
    }
  }
}
```

---

### POST /advances/:id/approve

Approve advance request.

**Request Body:**

```json
{
  "comments": "Approved for emergency",
  "disbursementDate": "2024-01-15"
}
```

---

### POST /advances/:id/reject

Reject advance request.

**Request Body:**

```json
{
  "reason": "Outstanding advance not yet recovered"
}
```

---

### POST /advances/:id/disburse

Disburse approved advance.

**Request Body:**

```json
{
  "method": "bank_transfer",
  "reference": "TXN202401150001"
}
```

---

### GET /advances/eligibility/:employeeId

Check advance eligibility for employee.

**Response:**

```json
{
  "success": true,
  "data": {
    "employee": {
      "_id": "ObjectId",
      "name": "Ahmed Al-Shammari"
    },
    "eligibility": {
      "isEligible": true,
      "monthlyBasic": 15000,
      "maxAdvancePercentage": 100,
      "maxAdvanceAllowed": 15000,
      "currentOutstanding": 2000,
      "availableLimit": 13000,
      "pendingRequests": 0,
      "restrictions": []
    },
    "policy": {
      "maxPercentage": 100,
      "minServiceMonths": 3,
      "maxOutstandingAdvances": 1,
      "coolingPeriodDays": 30
    }
  }
}
```

---

## Employee Loans

### GET /loans

Get employee loans.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| employeeId | ObjectId | No | Filter by employee |
| type | string | No | `personal`, `housing`, `vehicle`, `education`, `emergency` |
| status | string | No | `pending`, `approved`, `active`, `completed`, `defaulted` |

**Response:**

```json
{
  "success": true,
  "data": {
    "loans": [
      {
        "_id": "ObjectId",
        "loanId": "LOAN-2024-00001",
        "loanNumber": "LOAN-2024-00001",
        "employeeId": "ObjectId",
        "employeeName": "Ahmed Al-Shammari",
        "employeeNumber": "EMP0001",
        "type": "personal",
        "typeName": "Personal Loan",
        "typeNameAr": "قرض شخصي",
        "amount": {
          "principal": 50000,
          "interestRate": 0,
          "totalPayable": 50000,
          "currency": "SAR"
        },
        "purpose": "Home renovation",
        "purposeAr": "تجديد المنزل",
        "disbursement": {
          "date": "2024-01-15T00:00:00Z",
          "method": "bank_transfer",
          "reference": "LOAN-TXN-001"
        },
        "repayment": {
          "startDate": "2024-02-01T00:00:00Z",
          "endDate": "2025-01-31T00:00:00Z",
          "tenure": 12,
          "installmentAmount": 4166.67,
          "deductFromPayroll": true,
          "schedule": [
            {
              "installmentNumber": 1,
              "dueDate": "2024-02-28",
              "principalAmount": 4166.67,
              "interestAmount": 0,
              "totalAmount": 4166.67,
              "status": "paid",
              "paidOn": "2024-02-28",
              "payrollRunId": "ObjectId"
            },
            {
              "installmentNumber": 2,
              "dueDate": "2024-03-28",
              "principalAmount": 4166.67,
              "totalAmount": 4166.67,
              "status": "pending"
            }
          ]
        },
        "balance": {
          "totalPaid": 4166.67,
          "outstanding": 45833.33,
          "remainingInstallments": 11
        },
        "guarantor": {
          "required": false
        },
        "status": "active",
        "approvedBy": "ObjectId",
        "approverName": "Sara Al-Hassan",
        "approvedOn": "2024-01-12T10:00:00Z",
        "documents": [
          {
            "type": "application_form",
            "fileName": "loan_application.pdf",
            "fileUrl": "https://..."
          }
        ],
        "createdAt": "2024-01-10T10:00:00Z"
      }
    ],
    "summary": {
      "totalLoans": 15,
      "activeLoans": 12,
      "totalDisbursed": 500000,
      "totalOutstanding": 350000,
      "totalRepaid": 150000
    }
  }
}
```

---

### POST /loans

Request new loan.

**Request Body:**

```json
{
  "type": "personal",
  "amount": 50000,
  "purpose": "Home renovation",
  "purposeAr": "تجديد المنزل",
  "repayment": {
    "tenure": 12,
    "deductFromPayroll": true
  },
  "guarantor": {
    "required": false
  },
  "documents": []
}
```

**Loan Types:**
- `personal` - Personal loan
- `housing` - Housing/Home loan
- `vehicle` - Vehicle loan
- `education` - Education loan
- `emergency` - Emergency loan
- `other` - Other

**Response:**

```json
{
  "success": true,
  "message": "Loan request submitted",
  "data": {
    "loan": {
      "loanId": "LOAN-2024-00002",
      "amount": {
        "principal": 50000,
        "interestRate": 0,
        "totalPayable": 50000
      },
      "repayment": {
        "tenure": 12,
        "installmentAmount": 4166.67
      },
      "status": "pending"
    },
    "eligibility": {
      "isEligible": true,
      "maxLoanAmount": 100000,
      "maxTenure": 24
    }
  }
}
```

---

### POST /loans/:id/approve

Approve loan request.

**Request Body:**

```json
{
  "approvedAmount": 50000,
  "tenure": 12,
  "disbursementDate": "2024-01-15",
  "comments": "Approved as requested"
}
```

---

### GET /loans/:id/schedule

Get loan repayment schedule.

**Response:**

```json
{
  "success": true,
  "data": {
    "loan": {
      "loanId": "LOAN-2024-00001",
      "principal": 50000,
      "tenure": 12
    },
    "schedule": [
      {
        "installmentNumber": 1,
        "dueDate": "2024-02-28",
        "openingBalance": 50000,
        "principalAmount": 4166.67,
        "interestAmount": 0,
        "totalAmount": 4166.67,
        "closingBalance": 45833.33,
        "status": "paid"
      }
    ],
    "summary": {
      "totalInstallments": 12,
      "paidInstallments": 1,
      "pendingInstallments": 11,
      "totalPaid": 4166.67,
      "totalOutstanding": 45833.33
    }
  }
}
```

---

### GET /loans/eligibility/:employeeId

Check loan eligibility.

**Response:**

```json
{
  "success": true,
  "data": {
    "eligibility": {
      "isEligible": true,
      "maxLoanAmount": 100000,
      "maxTenure": 24,
      "existingLoans": 1,
      "existingOutstanding": 45833.33,
      "availableLimit": 54166.67,
      "restrictions": []
    },
    "policy": {
      "maxMultipleOfSalary": 6,
      "maxLoansAtOnce": 2,
      "minServiceMonths": 12,
      "maxEMIPercentage": 30
    }
  }
}
```

---

## Expense Claims

### GET /expense-claims

Get expense claims.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| employeeId | ObjectId | No | Filter by employee |
| status | string | No | `draft`, `submitted`, `approved`, `rejected`, `processing`, `reimbursed` |
| category | string | No | Filter by category |
| dateFrom | string | No | Start date |
| dateTo | string | No | End date |

**Response:**

```json
{
  "success": true,
  "data": {
    "claims": [
      {
        "_id": "ObjectId",
        "claimId": "EXP-2024-00001",
        "claimNumber": "EXP-2024-00001",
        "employeeId": "ObjectId",
        "employeeName": "Ahmed Al-Shammari",
        "employeeNumber": "EMP0001",
        "department": "Engineering",
        "claimDate": "2024-01-15T00:00:00Z",
        "period": {
          "from": "2024-01-01",
          "to": "2024-01-15"
        },
        "expenses": [
          {
            "expenseId": "EXP-ITEM-001",
            "date": "2024-01-05",
            "category": "travel",
            "categoryName": "Travel",
            "categoryNameAr": "سفر",
            "description": "Client visit - Jeddah",
            "descriptionAr": "زيارة عميل - جدة",
            "amount": 1500,
            "currency": "SAR",
            "receipt": {
              "hasReceipt": true,
              "receiptUrl": "https://...",
              "receiptNumber": "RCP-001"
            },
            "isReimbursable": true,
            "costCenter": "CC-ENG-001",
            "project": "Project Alpha",
            "status": "approved"
          },
          {
            "expenseId": "EXP-ITEM-002",
            "date": "2024-01-08",
            "category": "meals",
            "categoryName": "Meals",
            "description": "Client dinner",
            "amount": 350,
            "currency": "SAR",
            "receipt": {
              "hasReceipt": true,
              "receiptUrl": "https://..."
            },
            "isReimbursable": true,
            "status": "approved"
          }
        ],
        "totals": {
          "claimedAmount": 1850,
          "approvedAmount": 1850,
          "rejectedAmount": 0,
          "currency": "SAR"
        },
        "status": "approved",
        "approvedBy": "ObjectId",
        "approverName": "Ali Hassan",
        "approvedOn": "2024-01-16T10:00:00Z",
        "reimbursement": {
          "method": "payroll",
          "expectedDate": "2024-01-28",
          "status": "pending"
        },
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ],
    "summary": {
      "totalClaims": 45,
      "pendingApproval": 5,
      "totalClaimedAmount": 125000,
      "totalApprovedAmount": 118000,
      "pendingReimbursement": 25000
    }
  }
}
```

---

### POST /expense-claims

Submit expense claim.

**Request Body:**

```json
{
  "period": {
    "from": "2024-01-01",
    "to": "2024-01-15"
  },
  "expenses": [
    {
      "date": "2024-01-05",
      "category": "travel",
      "description": "Client visit - Jeddah",
      "descriptionAr": "زيارة عميل - جدة",
      "amount": 1500,
      "receipt": {
        "hasReceipt": true,
        "receiptUrl": "https://..."
      },
      "costCenter": "CC-ENG-001",
      "project": "Project Alpha"
    },
    {
      "date": "2024-01-08",
      "category": "meals",
      "description": "Client dinner",
      "amount": 350,
      "receipt": {
        "hasReceipt": true,
        "receiptUrl": "https://..."
      }
    }
  ],
  "notes": "Business trip expenses"
}
```

**Expense Categories:**
- `travel` - Travel expenses
- `accommodation` - Hotel/Lodging
- `meals` - Food & Meals
- `transportation` - Local transport
- `communication` - Phone/Internet
- `office_supplies` - Office supplies
- `software` - Software/Subscriptions
- `training` - Training/Courses
- `entertainment` - Client entertainment
- `other` - Other expenses

---

### POST /expense-claims/:id/approve

Approve expense claim.

**Request Body:**

```json
{
  "expenses": [
    {
      "expenseId": "EXP-ITEM-001",
      "approved": true,
      "approvedAmount": 1500
    },
    {
      "expenseId": "EXP-ITEM-002",
      "approved": true,
      "approvedAmount": 350
    }
  ],
  "comments": "All expenses verified and approved"
}
```

---

### POST /expense-claims/:id/reject

Reject expense claim.

**Request Body:**

```json
{
  "reason": "Missing receipts for meal expenses"
}
```

---

## Expense Policies

### GET /expense-policies

Get expense policies.

**Response:**

```json
{
  "success": true,
  "data": {
    "policies": [
      {
        "_id": "ObjectId",
        "policyId": "POL-EXP-001",
        "name": "Standard Expense Policy",
        "nameAr": "سياسة المصروفات القياسية",
        "description": "Default expense policy for all employees",
        "applicableTo": {
          "allEmployees": true,
          "departments": [],
          "grades": []
        },
        "limits": {
          "daily": {
            "meals": 200,
            "transportation": 300,
            "accommodation": 500
          },
          "perTrip": {
            "domestic": 5000,
            "international": 15000
          },
          "monthly": 10000,
          "annual": 50000
        },
        "categories": [
          {
            "code": "travel",
            "name": "Travel",
            "nameAr": "سفر",
            "requiresReceipt": true,
            "requiresPreApproval": true,
            "maxAmount": 5000
          },
          {
            "code": "meals",
            "name": "Meals",
            "nameAr": "وجبات",
            "requiresReceipt": true,
            "requiresPreApproval": false,
            "maxAmount": 200
          }
        ],
        "approvalWorkflow": {
          "levels": [
            {
              "level": 1,
              "role": "direct_manager",
              "maxAmount": 2000
            },
            {
              "level": 2,
              "role": "department_head",
              "maxAmount": 10000
            },
            {
              "level": 3,
              "role": "finance_director",
              "maxAmount": null
            }
          ]
        },
        "rules": {
          "receiptRequired": true,
          "receiptThreshold": 50,
          "advanceNoticeForTravel": 3,
          "submissionDeadlineDays": 30,
          "reimbursementMethod": "payroll"
        },
        "isActive": true,
        "isDefault": true
      }
    ]
  }
}
```

---

### POST /expense-policies

Create expense policy.

**Request Body:**

```json
{
  "name": "Executive Expense Policy",
  "nameAr": "سياسة مصروفات المدراء التنفيذيين",
  "applicableTo": {
    "allEmployees": false,
    "grades": ["G8", "G9"]
  },
  "limits": {
    "daily": {
      "meals": 500,
      "transportation": 500,
      "accommodation": 1500
    },
    "monthly": 25000
  },
  "rules": {
    "receiptRequired": true,
    "receiptThreshold": 100
  }
}
```

---

## Schemas

### EmployeeAdvance Schema

```typescript
interface EmployeeAdvance {
  _id: ObjectId;
  advanceId: string;
  advanceNumber: string;
  employeeId: ObjectId;
  employeeName?: string;
  employeeNumber?: string;
  department?: string;

  requestDate: Date;
  amount: number;
  currency: string;
  reason: string;
  reasonAr?: string;
  category: 'emergency' | 'medical' | 'education' | 'personal' | 'other';

  eligibility: {
    monthlyBasic: number;
    maxAdvanceAllowed: number;
    currentOutstanding: number;
    availableLimit: number;
    isEligible: boolean;
  };

  recovery: {
    method: 'single' | 'installments';
    deductFromPayroll: boolean;
    recoveryMonth: number;
    recoveryYear: number;
    installments: number;
    installmentAmount: number;
    schedule: RecoveryInstallment[];
    recovered: number;
    outstanding: number;
  };

  status: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'recovered' | 'cancelled';
  approvedBy?: ObjectId;
  approverName?: string;
  approvedOn?: Date;
  rejectedBy?: ObjectId;
  rejectionReason?: string;

  disbursement?: {
    method: 'bank_transfer' | 'cash' | 'check';
    disbursedOn?: Date;
    reference?: string;
  };

  documents?: Document[];
  notes?: string;

  firmId: ObjectId;
  lawyerId?: ObjectId;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface RecoveryInstallment {
  installmentNumber: number;
  dueDate: Date;
  amount: number;
  status: 'pending' | 'deducted' | 'skipped';
  deductedOn?: Date;
  payrollRunId?: ObjectId;
}
```

### ExpenseClaim Schema

```typescript
interface ExpenseClaim {
  _id: ObjectId;
  claimId: string;
  claimNumber: string;
  employeeId: ObjectId;
  employeeName?: string;
  employeeNumber?: string;
  department?: string;

  claimDate: Date;
  period: {
    from: Date;
    to: Date;
  };

  expenses: ExpenseItem[];

  totals: {
    claimedAmount: number;
    approvedAmount: number;
    rejectedAmount: number;
    currency: string;
  };

  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'processing' | 'reimbursed';
  approvedBy?: ObjectId;
  approverName?: string;
  approvedOn?: Date;

  reimbursement?: {
    method: 'payroll' | 'bank_transfer' | 'cash';
    expectedDate?: Date;
    processedDate?: Date;
    reference?: string;
    status: 'pending' | 'processing' | 'completed';
  };

  notes?: string;

  firmId: ObjectId;
  lawyerId?: ObjectId;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface ExpenseItem {
  expenseId: string;
  date: Date;
  category: string;
  categoryName?: string;
  categoryNameAr?: string;
  description: string;
  descriptionAr?: string;
  amount: number;
  currency: string;
  receipt: {
    hasReceipt: boolean;
    receiptUrl?: string;
    receiptNumber?: string;
  };
  isReimbursable: boolean;
  costCenter?: string;
  project?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}
```

---

**Previous:** [Part 4: Payroll & Compensation](./PART-04-PAYROLL-COMPENSATION.md)

**Next:** [Part 6: Performance & OKRs](./PART-06-PERFORMANCE-OKRS.md)
