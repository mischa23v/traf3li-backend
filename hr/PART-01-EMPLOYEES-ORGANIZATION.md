# HR API Documentation - Part 1: Employees & Organization Structure

## Overview

This document covers the Employee Management and Organization Structure APIs for the HR system.
All endpoints require authentication via JWT token in the Authorization header.

**Base URL:** `/api/hr`

**Authentication:** `Authorization: Bearer <JWT_TOKEN>`

---

## Table of Contents

1. [Employee Management](#employee-management)
2. [Department Management](#department-management)
3. [Branch/Location Management](#branch-management)
4. [Job Description Management](#job-description-management)
5. [Organization Chart](#organization-chart)
6. [Schemas](#schemas)

---

## Employee Management

### GET /employees

Get all employees with pagination and filtering.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20, max: 100) |
| status | string | No | Filter by status: `active`, `on_leave`, `suspended`, `terminated`, `resigned` |
| department | string | No | Filter by department name |
| search | string | No | Search by name, employee ID, or national ID |
| employmentType | string | No | Filter: `full_time`, `part_time`, `contract`, `temporary` |
| isSaudi | boolean | No | Filter by nationality |
| sortBy | string | No | Sort field (default: `createdAt`) |
| sortOrder | string | No | Sort direction: `asc`, `desc` (default: `desc`) |

**Response:**

```json
{
  "success": true,
  "data": {
    "employees": [
      {
        "_id": "ObjectId",
        "employeeId": "EMP0001",
        "officeType": "firm",
        "personalInfo": {
          "fullNameArabic": "أحمد محمد الشمري",
          "fullNameEnglish": "Ahmed Mohammed Al-Shammari",
          "nationalId": "1234567890",
          "nationalIdType": "saudi_id",
          "nationalIdExpiry": "2027-06-15T00:00:00Z",
          "nationality": "Saudi",
          "isSaudi": true,
          "gender": "male",
          "dateOfBirth": "1990-05-20T00:00:00Z",
          "mobile": "+966501234567",
          "email": "ahmed@company.com",
          "personalEmail": "ahmed.personal@gmail.com",
          "currentAddress": {
            "city": "Riyadh",
            "region": "Riyadh",
            "country": "Saudi Arabia"
          },
          "emergencyContact": {
            "name": "Mohammed Al-Shammari",
            "relationship": "Father",
            "phone": "+966509876543"
          },
          "maritalStatus": "married",
          "numberOfDependents": 2,
          "religion": "muslim",
          "bloodType": "A+",
          "medicalConditions": []
        },
        "employment": {
          "employmentStatus": "active",
          "jobTitle": "Software Engineer",
          "jobTitleArabic": "مهندس برمجيات",
          "employmentType": "full_time",
          "contractType": "indefinite",
          "contractStartDate": "2022-01-15T00:00:00Z",
          "hireDate": "2022-01-15T00:00:00Z",
          "probationPeriod": 180,
          "onProbation": false,
          "workSchedule": {
            "weeklyHours": 48,
            "dailyHours": 8,
            "workDays": ["sunday", "monday", "tuesday", "wednesday", "thursday"],
            "restDay": "Friday"
          },
          "reportsTo": "ObjectId",
          "departmentName": "Engineering"
        },
        "compensation": {
          "basicSalary": 15000,
          "currency": "SAR",
          "allowances": [
            {
              "_id": "ObjectId",
              "name": "Housing Allowance",
              "nameAr": "بدل سكن",
              "amount": 3750,
              "taxable": false,
              "includedInEOSB": true,
              "includedInGOSI": false
            },
            {
              "_id": "ObjectId",
              "name": "Transportation Allowance",
              "nameAr": "بدل مواصلات",
              "amount": 1500,
              "taxable": false,
              "includedInEOSB": true,
              "includedInGOSI": false
            }
          ],
          "paymentFrequency": "monthly",
          "paymentMethod": "bank_transfer",
          "bankDetails": {
            "bankName": "Al Rajhi Bank",
            "iban": "SA0380000000608010167519"
          }
        },
        "gosi": {
          "registered": true,
          "gosiNumber": "1234567890",
          "employeeContribution": 9.75,
          "employerContribution": 11.75
        },
        "organization": {
          "branchId": "main",
          "departmentName": "Engineering",
          "teamId": "backend",
          "supervisorId": "ObjectId",
          "costCenter": "CC-ENG-001"
        },
        "leave": {
          "annualLeaveEntitlement": 21
        },
        "fullName": "Ahmed Mohammed Al-Shammari",
        "fullNameAr": "أحمد محمد الشمري",
        "totalAllowances": 5250,
        "grossSalary": 20250,
        "gosiDeduction": 1462.50,
        "netSalary": 18787.50,
        "status": "active",
        "yearsOfService": 4.02,
        "minAnnualLeave": 21,
        "createdAt": "2022-01-15T10:30:00Z",
        "updatedAt": "2024-01-10T14:22:00Z"
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

### GET /employees/:id

Get single employee details.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | ObjectId | Yes | Employee ID |

**Response:** Same as single employee object above.

---

### POST /employees

Create new employee.

**Request Body:**

```json
{
  "officeType": "firm",
  "personalInfo": {
    "fullNameArabic": "أحمد محمد الشمري",
    "fullNameEnglish": "Ahmed Mohammed Al-Shammari",
    "nationalId": "1234567890",
    "nationalIdType": "saudi_id",
    "nationalIdExpiry": "2027-06-15",
    "nationality": "Saudi",
    "isSaudi": true,
    "gender": "male",
    "dateOfBirth": "1990-05-20",
    "mobile": "+966501234567",
    "email": "ahmed@company.com",
    "currentAddress": {
      "city": "Riyadh",
      "region": "Riyadh",
      "country": "Saudi Arabia"
    },
    "emergencyContact": {
      "name": "Mohammed Al-Shammari",
      "relationship": "Father",
      "phone": "+966509876543"
    },
    "maritalStatus": "married",
    "numberOfDependents": 2,
    "religion": "muslim"
  },
  "employment": {
    "jobTitle": "Software Engineer",
    "jobTitleArabic": "مهندس برمجيات",
    "employmentType": "full_time",
    "contractType": "indefinite",
    "contractStartDate": "2024-01-15",
    "hireDate": "2024-01-15",
    "probationPeriod": 180,
    "departmentName": "Engineering",
    "reportsTo": "64a1b2c3d4e5f6g7h8i9j0k1"
  },
  "compensation": {
    "basicSalary": 15000,
    "currency": "SAR",
    "allowances": [
      {
        "name": "Housing Allowance",
        "nameAr": "بدل سكن",
        "amount": 3750,
        "taxable": false,
        "includedInEOSB": true,
        "includedInGOSI": false
      },
      {
        "name": "Transportation Allowance",
        "nameAr": "بدل مواصلات",
        "amount": 1500,
        "taxable": false,
        "includedInEOSB": true,
        "includedInGOSI": false
      }
    ],
    "paymentFrequency": "monthly",
    "paymentMethod": "bank_transfer",
    "bankDetails": {
      "bankName": "Al Rajhi Bank",
      "iban": "SA0380000000608010167519"
    }
  },
  "gosi": {
    "registered": true,
    "gosiNumber": "1234567890",
    "employeeContribution": 9.75,
    "employerContribution": 11.75
  },
  "organization": {
    "branchId": "main",
    "departmentName": "Engineering",
    "costCenter": "CC-ENG-001"
  },
  "leave": {
    "annualLeaveEntitlement": 21
  }
}
```

**Validation Rules:**

1. **National ID Validation (Saudi Labor Law):**
   - Saudi ID (`saudi_id`): 10 digits starting with `1`, Luhn checksum validated
   - Iqama (`iqama`): 10 digits starting with `2`, Luhn checksum validated
   - GCC ID and Passport: No specific validation

2. **IBAN Validation (ISO 7064 Mod 97):**
   - Format: `SA` + 2 check digits + 22 alphanumeric characters
   - Total: 24 characters
   - Must pass ISO 7064 Mod 97-10 checksum

3. **Probation Period (Article 53):**
   - Maximum: 180 days (updated February 2025)
   - Can be extended once by written agreement for max 90 additional days

**Response:**

```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "employee": { /* Employee object */ },
    "employeeId": "EMP0001"
  }
}
```

---

### PATCH /employees/:id

Update employee.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | ObjectId | Yes | Employee ID |

**Request Body:** Any subset of the fields from POST request.

**Response:**

```json
{
  "success": true,
  "message": "Employee updated successfully",
  "data": {
    "employee": { /* Updated employee object */ }
  }
}
```

---

### DELETE /employees/:id

Soft delete (terminate) employee.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | ObjectId | Yes | Employee ID |

**Request Body:**

```json
{
  "terminationDate": "2024-06-30",
  "terminationReason": "resignation",
  "terminationDetails": {
    "article": "resignation",
    "noticeServed": true,
    "noticePeriodDays": 60,
    "noticeStartDate": "2024-05-01",
    "lastWorkingDay": "2024-06-30"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Employee terminated successfully",
  "data": {
    "employee": { /* Updated employee with terminated status */ }
  }
}
```

---

### GET /employees/stats

Get employee statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "totalEmployees": 150,
    "activeEmployees": 142,
    "totalBasicSalary": 2250000,
    "byDepartment": {
      "Engineering": 45,
      "Sales": 30,
      "HR": 10,
      "Finance": 15,
      "Operations": 50
    },
    "byStatus": {
      "active": 142,
      "on_leave": 5,
      "suspended": 2,
      "terminated": 1
    },
    "byNationality": {
      "saudi": 95,
      "nonSaudi": 55
    },
    "byGender": {
      "male": 110,
      "female": 40
    }
  }
}
```

---

## Department Management

### GET /departments

Get all departments.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number |
| limit | number | No | Items per page |
| isActive | boolean | No | Filter by active status |
| search | string | No | Search by name |

**Response:**

```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "_id": "ObjectId",
        "code": "ENG",
        "name": "Engineering",
        "nameAr": "الهندسة",
        "description": "Software development and engineering team",
        "descriptionAr": "فريق تطوير البرمجيات والهندسة",
        "parentDepartmentId": null,
        "managerId": "ObjectId",
        "managerName": "Ali Hassan",
        "headCount": 45,
        "budget": {
          "annual": 5000000,
          "currency": "SAR",
          "fiscalYear": 2024
        },
        "costCenter": "CC-ENG-001",
        "location": "Riyadh HQ",
        "isActive": true,
        "sortOrder": 1,
        "createdAt": "2022-01-01T00:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "pages": 1
    }
  }
}
```

---

### POST /departments

Create department.

**Request Body:**

```json
{
  "code": "MKT",
  "name": "Marketing",
  "nameAr": "التسويق",
  "description": "Marketing and brand management",
  "descriptionAr": "التسويق وإدارة العلامة التجارية",
  "parentDepartmentId": null,
  "managerId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "budget": {
    "annual": 2000000,
    "currency": "SAR",
    "fiscalYear": 2024
  },
  "costCenter": "CC-MKT-001",
  "location": "Riyadh HQ"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Department created successfully",
  "data": {
    "department": { /* Department object */ }
  }
}
```

---

### PATCH /departments/:id

Update department.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | ObjectId | Yes | Department ID |

**Request Body:** Any subset of department fields.

---

### DELETE /departments/:id

Delete department.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | ObjectId | Yes | Department ID |

**Response:**

```json
{
  "success": true,
  "message": "Department deleted successfully"
}
```

---

## Branch Management

### GET /branches

Get all company branches/locations.

**Response:**

```json
{
  "success": true,
  "data": {
    "branches": [
      {
        "_id": "ObjectId",
        "code": "RUH-HQ",
        "name": "Riyadh Headquarters",
        "nameAr": "المقر الرئيسي - الرياض",
        "address": {
          "street": "King Fahd Road",
          "streetAr": "طريق الملك فهد",
          "city": "Riyadh",
          "cityAr": "الرياض",
          "region": "Riyadh",
          "regionAr": "منطقة الرياض",
          "country": "Saudi Arabia",
          "countryAr": "المملكة العربية السعودية",
          "postalCode": "12345",
          "coordinates": {
            "latitude": 24.7136,
            "longitude": 46.6753
          }
        },
        "contactInfo": {
          "phone": "+966112345678",
          "email": "hq@company.com",
          "fax": "+966112345679"
        },
        "isHeadquarters": true,
        "isActive": true,
        "managerId": "ObjectId",
        "managerName": "Mohammed Al-Saud",
        "employeeCount": 100,
        "timezone": "Asia/Riyadh",
        "workingHours": {
          "start": "08:00",
          "end": "17:00",
          "breakStart": "12:00",
          "breakEnd": "13:00"
        },
        "createdAt": "2020-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### POST /branches

Create new branch.

**Request Body:**

```json
{
  "code": "JED-01",
  "name": "Jeddah Branch",
  "nameAr": "فرع جدة",
  "address": {
    "street": "Palestine Street",
    "streetAr": "شارع فلسطين",
    "city": "Jeddah",
    "cityAr": "جدة",
    "region": "Makkah",
    "regionAr": "منطقة مكة",
    "country": "Saudi Arabia",
    "postalCode": "23456",
    "coordinates": {
      "latitude": 21.4858,
      "longitude": 39.1925
    }
  },
  "contactInfo": {
    "phone": "+966122345678",
    "email": "jeddah@company.com"
  },
  "managerId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "timezone": "Asia/Riyadh",
  "workingHours": {
    "start": "08:00",
    "end": "17:00"
  }
}
```

---

## Job Description Management

### GET /job-descriptions

Get all job descriptions.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| department | string | No | Filter by department |
| level | string | No | Filter by level: `entry`, `mid`, `senior`, `lead`, `manager`, `director`, `executive` |
| isActive | boolean | No | Filter by active status |

**Response:**

```json
{
  "success": true,
  "data": {
    "jobDescriptions": [
      {
        "_id": "ObjectId",
        "code": "SE-001",
        "title": "Software Engineer",
        "titleAr": "مهندس برمجيات",
        "department": "Engineering",
        "departmentAr": "الهندسة",
        "level": "mid",
        "reportsTo": "Engineering Manager",
        "summary": "Design, develop, and maintain software applications",
        "summaryAr": "تصميم وتطوير وصيانة تطبيقات البرمجيات",
        "responsibilities": [
          "Write clean, maintainable code",
          "Participate in code reviews",
          "Collaborate with team members",
          "Debug and fix issues"
        ],
        "responsibilitiesAr": [
          "كتابة كود نظيف وقابل للصيانة",
          "المشاركة في مراجعات الكود",
          "التعاون مع أعضاء الفريق",
          "تصحيح الأخطاء وإصلاح المشاكل"
        ],
        "requirements": {
          "education": "Bachelor's degree in Computer Science or related field",
          "educationAr": "بكالوريوس في علوم الحاسب أو مجال ذي صلة",
          "experience": "3-5 years of software development experience",
          "experienceAr": "3-5 سنوات خبرة في تطوير البرمجيات",
          "skills": [
            "JavaScript/TypeScript",
            "Node.js",
            "React or Vue.js",
            "MongoDB or SQL"
          ],
          "certifications": []
        },
        "compensation": {
          "salaryRange": {
            "min": 12000,
            "max": 18000,
            "currency": "SAR"
          },
          "gradeLevel": "G5"
        },
        "workConditions": {
          "employmentType": "full_time",
          "workLocation": "office",
          "travelRequired": false
        },
        "isActive": true,
        "createdAt": "2023-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### POST /job-descriptions

Create job description.

**Request Body:**

```json
{
  "code": "PM-001",
  "title": "Project Manager",
  "titleAr": "مدير مشروع",
  "department": "Engineering",
  "level": "senior",
  "reportsTo": "Director of Engineering",
  "summary": "Lead and manage software development projects",
  "summaryAr": "قيادة وإدارة مشاريع تطوير البرمجيات",
  "responsibilities": [
    "Plan and execute project timelines",
    "Manage project resources and budget",
    "Coordinate with stakeholders",
    "Report project status to leadership"
  ],
  "requirements": {
    "education": "Bachelor's degree in Computer Science or related field",
    "experience": "5-7 years with 2+ years in project management",
    "skills": ["Agile", "Scrum", "JIRA", "Communication"],
    "certifications": ["PMP", "PSM"]
  },
  "compensation": {
    "salaryRange": {
      "min": 18000,
      "max": 25000,
      "currency": "SAR"
    },
    "gradeLevel": "G7"
  }
}
```

---

## Organization Chart

### GET /organization/chart

Get organization hierarchy tree.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| rootId | ObjectId | No | Start from specific employee/department |
| depth | number | No | Maximum depth level (default: all) |
| includeVacant | boolean | No | Include vacant positions |

**Response:**

```json
{
  "success": true,
  "data": {
    "chart": {
      "root": {
        "_id": "ObjectId",
        "type": "employee",
        "employeeId": "EMP0001",
        "name": "Abdullah Al-Rashid",
        "nameAr": "عبدالله الراشد",
        "title": "CEO",
        "titleAr": "الرئيس التنفيذي",
        "department": "Executive",
        "email": "ceo@company.com",
        "photo": "https://...",
        "children": [
          {
            "_id": "ObjectId",
            "type": "employee",
            "employeeId": "EMP0002",
            "name": "Sara Al-Hassan",
            "nameAr": "سارة الحسن",
            "title": "CFO",
            "titleAr": "المدير المالي",
            "department": "Finance",
            "children": [
              {
                "_id": "ObjectId",
                "type": "employee",
                "name": "Khalid Al-Omar",
                "title": "Finance Manager",
                "department": "Finance",
                "children": []
              }
            ]
          },
          {
            "_id": "ObjectId",
            "type": "employee",
            "employeeId": "EMP0003",
            "name": "Ali Hassan",
            "nameAr": "علي حسن",
            "title": "CTO",
            "titleAr": "المدير التقني",
            "department": "Engineering",
            "children": [
              {
                "_id": "ObjectId",
                "type": "employee",
                "name": "Mohammed Al-Qahtani",
                "title": "Engineering Manager",
                "department": "Engineering",
                "directReports": 15,
                "children": []
              }
            ]
          }
        ]
      },
      "statistics": {
        "totalNodes": 150,
        "maxDepth": 5,
        "averageSpan": 6
      }
    }
  }
}
```

---

### GET /organization/reporting-line/:employeeId

Get reporting line for specific employee.

**Response:**

```json
{
  "success": true,
  "data": {
    "upward": [
      {
        "level": 1,
        "employee": {
          "_id": "ObjectId",
          "name": "Ali Hassan",
          "title": "Engineering Manager"
        }
      },
      {
        "level": 2,
        "employee": {
          "_id": "ObjectId",
          "name": "Ahmed Al-Rashid",
          "title": "CTO"
        }
      },
      {
        "level": 3,
        "employee": {
          "_id": "ObjectId",
          "name": "Abdullah Al-Rashid",
          "title": "CEO"
        }
      }
    ],
    "downward": [
      {
        "level": 1,
        "employees": [
          {
            "_id": "ObjectId",
            "name": "Sara Al-Mohsen",
            "title": "Senior Developer"
          },
          {
            "_id": "ObjectId",
            "name": "Khalid Al-Amri",
            "title": "Junior Developer"
          }
        ]
      }
    ]
  }
}
```

---

## Schemas

### Employee Schema

```typescript
interface Employee {
  _id: ObjectId;
  employeeId: string; // Auto-generated: EMP0001
  officeType: 'solo' | 'small' | 'medium' | 'firm';

  personalInfo: {
    fullNameArabic: string;
    fullNameEnglish?: string;
    nationalId: string; // Validated: Luhn checksum
    nationalIdType: 'saudi_id' | 'iqama' | 'gcc_id' | 'passport';
    nationalIdExpiry?: Date;
    nationality: string;
    isSaudi: boolean;
    gender: 'male' | 'female';
    dateOfBirth?: Date;
    mobile: string;
    email: string;
    personalEmail?: string;
    currentAddress?: {
      city?: string;
      region?: string;
      country?: string;
    };
    emergencyContact?: {
      name?: string;
      relationship?: string;
      phone?: string;
    };
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
    numberOfDependents: number;
    religion: 'muslim' | 'non_muslim'; // For Iddah leave calculation
    bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
    medicalConditions?: string[];
  };

  employment: {
    employmentStatus: 'active' | 'on_leave' | 'suspended' | 'terminated' | 'resigned';
    jobTitle?: string;
    jobTitleArabic?: string;
    employmentType: 'full_time' | 'part_time' | 'contract' | 'temporary';
    contractType: 'indefinite' | 'fixed_term';
    contractStartDate?: Date;
    contractEndDate?: Date;
    hireDate: Date;
    probationPeriod: number; // Max 180 days (Article 53)
    probationExtendedTo?: Date;
    onProbation: boolean;
    workSchedule?: {
      weeklyHours: number; // Default 48
      dailyHours: number; // Default 8
      workDays: string[];
      restDay: string; // Default Friday
    };
    reportsTo?: ObjectId;
    departmentName?: string;
    terminationDate?: Date;
    terminationReason?: string;
    terminationDetails?: {
      article: 'article_74_mutual' | 'article_75_expiry' | 'article_77_indefinite' |
               'article_80_employer' | 'article_81_employee' | 'resignation' |
               'retirement' | 'death' | 'force_majeure';
      noticeServed: boolean;
      noticePeriodDays: number; // 60 indefinite, 30 fixed-term
      noticeStartDate?: Date;
      lastWorkingDay?: Date;
      settlementStatus: 'pending' | 'calculated' | 'approved' | 'paid';
      exitInterviewDone: boolean;
      clearanceCompleted: boolean;
    };
  };

  compensation: {
    basicSalary: number; // Encrypted
    currency: string;
    allowances: Allowance[];
    paymentFrequency: 'monthly' | 'bi_weekly' | 'weekly';
    paymentMethod: 'bank_transfer' | 'cash' | 'check';
    bankDetails?: {
      bankName?: string;
      iban?: string; // Encrypted, validated ISO 7064
    };
  };

  gosi: {
    registered: boolean;
    gosiNumber?: string;
    employeeContribution: number; // Saudi: 9.75%, Non-Saudi: 0%
    employerContribution: number; // Saudi: 11.75%, Non-Saudi: 2%
  };

  organization?: {
    branchId?: string;
    departmentName?: string;
    teamId?: string;
    supervisorId?: ObjectId;
    costCenter?: string;
  };

  leave: {
    annualLeaveEntitlement: number; // 21 or 30 days (Article 109)
  };

  // Virtual fields (computed)
  fullName: string;
  fullNameAr: string;
  totalAllowances: number;
  grossSalary: number;
  gosiDeduction: number;
  netSalary: number;
  status: string;
  yearsOfService: number;
  minAnnualLeave: number; // Based on years of service

  // Multi-tenancy
  firmId?: ObjectId;
  lawyerId?: ObjectId;
  createdBy: ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

interface Allowance {
  _id: ObjectId;
  name: string;
  nameAr?: string;
  amount: number;
  taxable: boolean;
  includedInEOSB: boolean;
  includedInGOSI: boolean;
}
```

---

### Department Schema

```typescript
interface Department {
  _id: ObjectId;
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  parentDepartmentId?: ObjectId;
  managerId?: ObjectId;
  managerName?: string;
  headCount?: number;
  budget?: {
    annual?: number;
    currency?: string;
    fiscalYear?: number;
  };
  costCenter?: string;
  location?: string;
  isActive: boolean;
  sortOrder: number;
  firmId: ObjectId;
  lawyerId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### Branch Schema

```typescript
interface Branch {
  _id: ObjectId;
  code: string;
  name: string;
  nameAr?: string;
  address: {
    street?: string;
    streetAr?: string;
    city: string;
    cityAr?: string;
    region?: string;
    regionAr?: string;
    country: string;
    countryAr?: string;
    postalCode?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
  contactInfo?: {
    phone?: string;
    email?: string;
    fax?: string;
  };
  isHeadquarters: boolean;
  isActive: boolean;
  managerId?: ObjectId;
  managerName?: string;
  employeeCount?: number;
  timezone: string;
  workingHours?: {
    start?: string;
    end?: string;
    breakStart?: string;
    breakEnd?: string;
  };
  firmId: ObjectId;
  lawyerId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Saudi Labor Law Compliance Notes

### National ID Validation

| ID Type | Format | Validation |
|---------|--------|------------|
| Saudi ID | 10 digits starting with `1` | Luhn checksum |
| Iqama | 10 digits starting with `2` | Luhn checksum |
| GCC ID | Variable | No checksum |
| Passport | Variable | No checksum |

### GOSI Contributions

| Employee Type | Employee % | Employer % |
|--------------|------------|------------|
| Saudi | 9.75% | 11.75% |
| Non-Saudi | 0% | 2% |

### Probation Period (Article 53)

- Maximum: 180 days
- Can be extended once by written agreement for max 90 additional days
- Updated in February 2025

### Notice Period (Article 75)

| Contract Type | Notice Period |
|--------------|---------------|
| Indefinite | 60 days |
| Fixed-term | 30 days or remaining contract (whichever is less) |

### Annual Leave (Article 109)

| Service Duration | Minimum Leave |
|-----------------|---------------|
| Under 5 years | 21 days |
| 5+ years | 30 days |

---

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "personalInfo.nationalId",
      "message": "Invalid National ID. Must be 10 digits starting with 1 (Saudi) or 2 (Iqama) with valid Luhn checksum"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "Permission denied"
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Employee not found"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error",
  "errorCode": "INTERNAL_ERROR"
}
```

---

**Next:** [Part 2: Attendance, Shifts & Time Tracking](./PART-02-ATTENDANCE-SHIFTS.md)
