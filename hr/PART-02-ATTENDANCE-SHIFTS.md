# HR API Documentation - Part 2: Attendance, Shifts & Time Tracking

## Overview

This document covers the Attendance Management, Shift Configuration, and Time Tracking APIs.
Compliant with Saudi Labor Law (Articles 98, 101, 104, 106, 107).

**Base URL:** `/api/hr`

**Authentication:** `Authorization: Bearer <JWT_TOKEN>`

---

## Table of Contents

1. [Attendance Records](#attendance-records)
2. [Check-in / Check-out](#check-in--check-out)
3. [Breaks Management](#breaks-management)
4. [Shift Types](#shift-types)
5. [Shift Assignments](#shift-assignments)
6. [Overtime Management](#overtime-management)
7. [Attendance Corrections](#attendance-corrections)
8. [Geofencing](#geofencing)
9. [Reports & Analytics](#reports--analytics)
10. [Schemas](#schemas)

---

## Attendance Records

### GET /attendance

Get attendance records with filtering.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20) |
| employeeId | ObjectId | No | Filter by employee |
| department | string | No | Filter by department |
| date | string | No | Specific date (YYYY-MM-DD) |
| dateFrom | string | No | Start date range |
| dateTo | string | No | End date range |
| status | string | No | Filter: `present`, `absent`, `late`, `half_day`, `on_leave`, `holiday`, `weekend` |
| month | number | No | Month (1-12) |
| year | number | No | Year |

**Response:**

```json
{
  "success": true,
  "data": {
    "records": [
      {
        "_id": "ObjectId",
        "attendanceId": "ATT-20240115-0001",
        "employeeId": "ObjectId",
        "employeeName": "Ahmed Al-Shammari",
        "employeeNameAr": "أحمد الشمري",
        "employeeNumber": "EMP0001",
        "department": "Engineering",
        "departmentAr": "الهندسة",
        "position": "Software Engineer",
        "positionAr": "مهندس برمجيات",
        "date": "2024-01-15T00:00:00Z",
        "dayOfWeek": "monday",
        "dayOfWeekAr": "الاثنين",
        "weekNumber": 3,
        "month": 1,
        "year": 2024,
        "isWeekend": false,
        "isHoliday": false,
        "isRamadan": false,
        "shift": {
          "shiftId": "ObjectId",
          "name": "Regular",
          "nameAr": "دوام عادي",
          "type": "regular",
          "scheduledStart": "2024-01-15T08:00:00Z",
          "scheduledEnd": "2024-01-15T17:00:00Z",
          "scheduledHours": 8,
          "breakDuration": 60,
          "graceMinutes": 15
        },
        "checkIn": {
          "time": "2024-01-15T08:05:00Z",
          "location": {
            "type": "Point",
            "coordinates": [46.6753, 24.7136],
            "address": "Riyadh HQ",
            "isWithinGeofence": true,
            "distanceFromOffice": 15
          },
          "biometric": {
            "method": "fingerprint",
            "deviceId": "BIO-001",
            "verified": true,
            "verificationScore": 98
          },
          "source": "biometric",
          "deviceType": "biometric_terminal"
        },
        "checkOut": {
          "time": "2024-01-15T17:30:00Z",
          "location": {
            "type": "Point",
            "coordinates": [46.6753, 24.7136],
            "address": "Riyadh HQ",
            "isWithinGeofence": true
          },
          "source": "biometric"
        },
        "hours": {
          "scheduled": 8,
          "worked": 9.42,
          "regular": 8,
          "overtime": 0.5,
          "undertime": 0,
          "break": 1,
          "net": 8.42,
          "paid": 8.5,
          "unpaid": 0
        },
        "status": "present",
        "statusAr": "حاضر",
        "statusDetails": {
          "isPresent": true,
          "isAbsent": false,
          "isLate": false,
          "isEarlyDeparture": false,
          "isHalfDay": false,
          "isOvertime": true,
          "isOnLeave": false,
          "isRemote": false,
          "hasViolation": false
        },
        "lateArrival": {
          "isLate": false
        },
        "earlyDeparture": {
          "isEarly": false
        },
        "overtime": {
          "hasOvertime": true,
          "regularOvertime": {
            "hours": 0,
            "minutes": 30,
            "rate": 1.5
          },
          "weekendOvertime": {
            "hours": 0,
            "minutes": 0,
            "rate": 2.0
          },
          "totalOvertimeMinutes": 30,
          "preApproved": true
        },
        "breaks": [
          {
            "type": "lunch",
            "typeAr": "غداء",
            "startTime": "2024-01-15T12:00:00Z",
            "endTime": "2024-01-15T13:00:00Z",
            "duration": 60,
            "isPaid": true,
            "status": "completed"
          }
        ],
        "breakSummary": {
          "totalBreaks": 1,
          "totalDuration": 60,
          "paidBreakMinutes": 60,
          "unpaidBreakMinutes": 0,
          "exceededBreaks": 0
        },
        "violations": [],
        "violationSummary": {
          "totalViolations": 0,
          "unresolvedViolations": 0,
          "totalPenalties": 0
        },
        "compliance": {
          "dailyHoursCompliant": true,
          "weeklyHoursCompliant": true,
          "maxDailyHours": 8,
          "actualDailyHours": 8.42,
          "fridayRestCompliant": true,
          "restPeriodCompliant": true,
          "restPeriodMinutes": 60,
          "overtimeCompliant": true,
          "isFullyCompliant": true,
          "violations": []
        },
        "payroll": {
          "processed": false,
          "regularPayHours": 8,
          "overtimePayHours": 0.5
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 500,
      "pages": 25
    }
  }
}
```

---

### GET /attendance/:id

Get single attendance record.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | ObjectId | Yes | Attendance record ID |

**Response:** Single attendance record object.

---

### GET /attendance/today

Get today's attendance for all employees.

**Response:**

```json
{
  "success": true,
  "data": {
    "date": "2024-01-15",
    "summary": {
      "totalEmployees": 150,
      "present": 135,
      "absent": 5,
      "late": 8,
      "onLeave": 2,
      "notCheckedIn": 10
    },
    "records": [/* Attendance records */]
  }
}
```

---

### GET /attendance/employee/:employeeId

Get attendance history for specific employee.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| employeeId | ObjectId | Yes | Employee ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | number | No | Month (1-12) |
| year | number | No | Year |
| dateFrom | string | No | Start date |
| dateTo | string | No | End date |

**Response:**

```json
{
  "success": true,
  "data": {
    "employee": {
      "_id": "ObjectId",
      "employeeId": "EMP0001",
      "name": "Ahmed Al-Shammari"
    },
    "summary": {
      "totalDays": 22,
      "presentDays": 20,
      "absentDays": 1,
      "lateDays": 3,
      "halfDays": 0,
      "leaveDays": 1,
      "weekends": 8,
      "holidays": 0,
      "workFromHome": 2,
      "totalWorkedHours": 176,
      "totalOvertimeHours": 12,
      "totalUndertimeHours": 2,
      "averageCheckIn": "08:12",
      "averageCheckOut": "17:25",
      "violations": 0
    },
    "records": [/* Attendance records */]
  }
}
```

---

## Check-in / Check-out

### POST /attendance/check-in

Record employee check-in.

**Request Body:**

```json
{
  "employeeId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "source": "mobile_app",
  "deviceType": "mobile",
  "location": {
    "coordinates": [46.6753, 24.7136],
    "address": "Riyadh HQ"
  },
  "biometric": {
    "method": "facial",
    "verificationScore": 95
  },
  "photo": "base64_encoded_selfie",
  "notes": "Working from office today"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Check-in recorded successfully",
  "data": {
    "record": {
      "_id": "ObjectId",
      "attendanceId": "ATT-20240115-0001",
      "checkIn": {
        "time": "2024-01-15T08:05:00Z",
        "source": "mobile_app",
        "location": {
          "isWithinGeofence": true,
          "distanceFromOffice": 15
        }
      },
      "status": "present",
      "lateArrival": {
        "isLate": false
      }
    }
  }
}
```

---

### POST /attendance/check-out

Record employee check-out.

**Request Body:**

```json
{
  "employeeId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "source": "mobile_app",
  "deviceType": "mobile",
  "location": {
    "coordinates": [46.6753, 24.7136],
    "address": "Riyadh HQ"
  },
  "notes": "Completed all tasks"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Check-out recorded successfully",
  "data": {
    "record": {
      "_id": "ObjectId",
      "checkOut": {
        "time": "2024-01-15T17:30:00Z",
        "source": "mobile_app"
      },
      "hours": {
        "worked": 9.42,
        "regular": 8,
        "overtime": 0.5,
        "net": 8.42
      },
      "status": "present",
      "earlyDeparture": {
        "isEarly": false
      }
    }
  }
}
```

---

### POST /attendance/bulk-check-in

Bulk check-in from biometric devices.

**Request Body:**

```json
{
  "deviceId": "BIO-001",
  "records": [
    {
      "employeeNumber": "EMP0001",
      "time": "2024-01-15T08:05:00Z",
      "biometricData": {
        "method": "fingerprint",
        "verified": true,
        "verificationScore": 98
      }
    },
    {
      "employeeNumber": "EMP0002",
      "time": "2024-01-15T08:10:00Z",
      "biometricData": {
        "method": "fingerprint",
        "verified": true,
        "verificationScore": 96
      }
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "processed": 2,
    "successful": 2,
    "failed": 0,
    "results": [
      {
        "employeeNumber": "EMP0001",
        "status": "success",
        "attendanceId": "ATT-20240115-0001"
      },
      {
        "employeeNumber": "EMP0002",
        "status": "success",
        "attendanceId": "ATT-20240115-0002"
      }
    ]
  }
}
```

---

## Breaks Management

### POST /attendance/:id/break/start

Start a break.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | ObjectId | Yes | Attendance record ID |

**Request Body:**

```json
{
  "type": "lunch",
  "isPaid": true,
  "notes": "Lunch break"
}
```

**Break Types:**
- `prayer` - صلاة
- `lunch` - غداء
- `personal` - شخصي
- `medical` - طبي
- `other` - آخر

**Response:**

```json
{
  "success": true,
  "message": "Break started",
  "data": {
    "break": {
      "type": "lunch",
      "typeAr": "غداء",
      "startTime": "2024-01-15T12:00:00Z",
      "status": "ongoing",
      "isPaid": true
    }
  }
}
```

---

### POST /attendance/:id/break/end

End current break.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | ObjectId | Yes | Attendance record ID |

**Response:**

```json
{
  "success": true,
  "message": "Break ended",
  "data": {
    "break": {
      "type": "lunch",
      "startTime": "2024-01-15T12:00:00Z",
      "endTime": "2024-01-15T13:00:00Z",
      "duration": 60,
      "status": "completed",
      "exceededBy": 0
    },
    "breakSummary": {
      "totalBreaks": 1,
      "totalDuration": 60,
      "paidBreakMinutes": 60
    }
  }
}
```

---

## Shift Types

### GET /shifts/types

Get all shift types.

**Response:**

```json
{
  "success": true,
  "data": {
    "shiftTypes": [
      {
        "_id": "ObjectId",
        "code": "REG",
        "name": "Regular Shift",
        "nameAr": "دوام عادي",
        "description": "Standard 8-hour workday",
        "descriptionAr": "يوم عمل قياسي 8 ساعات",
        "type": "regular",
        "timing": {
          "startTime": "08:00",
          "endTime": "17:00",
          "duration": 9,
          "workingHours": 8,
          "breakDuration": 60
        },
        "settings": {
          "graceMinutes": 15,
          "earlyCheckInAllowed": true,
          "earlyCheckInMinutes": 30,
          "lateCheckOutAllowed": true,
          "autoCheckOut": false,
          "autoCheckOutTime": "23:59",
          "requiresLocation": true,
          "requiresBiometric": false,
          "allowRemoteCheckIn": true
        },
        "overtime": {
          "allowed": true,
          "requiresApproval": true,
          "maxDailyOvertime": 2,
          "overtimeRate": 1.5,
          "weekendRate": 2.0,
          "holidayRate": 2.0
        },
        "deductions": {
          "lateDeduction": {
            "enabled": true,
            "graceMinutes": 15,
            "deductionType": "percentage",
            "deductionValue": 0.5
          },
          "absenceDeduction": {
            "enabled": true,
            "deductionType": "day",
            "deductionValue": 1
          }
        },
        "applicableDays": ["sunday", "monday", "tuesday", "wednesday", "thursday"],
        "color": "#3B82F6",
        "isActive": true,
        "isDefault": true,
        "createdAt": "2023-01-01T00:00:00Z"
      },
      {
        "_id": "ObjectId",
        "code": "EVE",
        "name": "Evening Shift",
        "nameAr": "دوام مسائي",
        "type": "evening",
        "timing": {
          "startTime": "14:00",
          "endTime": "23:00",
          "duration": 9,
          "workingHours": 8,
          "breakDuration": 60
        },
        "isActive": true
      },
      {
        "_id": "ObjectId",
        "code": "NIG",
        "name": "Night Shift",
        "nameAr": "دوام ليلي",
        "type": "night",
        "timing": {
          "startTime": "22:00",
          "endTime": "07:00",
          "duration": 9,
          "workingHours": 8,
          "breakDuration": 60,
          "crossesMidnight": true
        },
        "isActive": true
      },
      {
        "_id": "ObjectId",
        "code": "RAM",
        "name": "Ramadan Shift",
        "nameAr": "دوام رمضان",
        "type": "custom",
        "timing": {
          "startTime": "10:00",
          "endTime": "16:00",
          "duration": 6,
          "workingHours": 6,
          "breakDuration": 0
        },
        "compliance": {
          "laborLawArticle": "Article 106",
          "maxHoursForMuslims": 6
        },
        "isActive": true
      }
    ]
  }
}
```

---

### POST /shifts/types

Create shift type.

**Request Body:**

```json
{
  "code": "FLX",
  "name": "Flexible Shift",
  "nameAr": "دوام مرن",
  "description": "Flexible working hours with core time",
  "type": "flexible",
  "timing": {
    "startTime": "07:00",
    "endTime": "19:00",
    "coreStartTime": "10:00",
    "coreEndTime": "15:00",
    "duration": 12,
    "workingHours": 8,
    "breakDuration": 60,
    "flexibleWindow": 120
  },
  "settings": {
    "graceMinutes": 30,
    "requiresLocation": false,
    "allowRemoteCheckIn": true
  },
  "overtime": {
    "allowed": true,
    "requiresApproval": true
  },
  "applicableDays": ["sunday", "monday", "tuesday", "wednesday", "thursday"],
  "color": "#10B981"
}
```

---

### PATCH /shifts/types/:id

Update shift type.

---

### DELETE /shifts/types/:id

Delete shift type.

---

## Shift Assignments

### GET /shifts/assignments

Get shift assignments.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| employeeId | ObjectId | No | Filter by employee |
| shiftTypeId | ObjectId | No | Filter by shift type |
| department | string | No | Filter by department |
| dateFrom | string | No | Start date |
| dateTo | string | No | End date |
| status | string | No | `active`, `upcoming`, `completed` |

**Response:**

```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "_id": "ObjectId",
        "employeeId": "ObjectId",
        "employeeName": "Ahmed Al-Shammari",
        "employeeNumber": "EMP0001",
        "shiftTypeId": "ObjectId",
        "shiftName": "Regular Shift",
        "shiftNameAr": "دوام عادي",
        "startDate": "2024-01-01T00:00:00Z",
        "endDate": null,
        "isPermanent": true,
        "isRotating": false,
        "status": "active",
        "createdBy": "ObjectId",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### POST /shifts/assignments

Create shift assignment.

**Request Body:**

```json
{
  "employeeId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "shiftTypeId": "64a1b2c3d4e5f6g7h8i9j0k2",
  "startDate": "2024-01-15",
  "endDate": null,
  "isPermanent": true,
  "notes": "Assigned to regular shift"
}
```

---

### POST /shifts/assignments/bulk

Bulk assign shifts.

**Request Body:**

```json
{
  "shiftTypeId": "64a1b2c3d4e5f6g7h8i9j0k2",
  "employeeIds": [
    "64a1b2c3d4e5f6g7h8i9j0k1",
    "64a1b2c3d4e5f6g7h8i9j0k3",
    "64a1b2c3d4e5f6g7h8i9j0k4"
  ],
  "startDate": "2024-01-15",
  "isPermanent": true
}
```

---

### POST /shifts/swap

Request shift swap between employees.

**Request Body:**

```json
{
  "requesterId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "targetEmployeeId": "64a1b2c3d4e5f6g7h8i9j0k3",
  "requesterDate": "2024-01-20",
  "targetDate": "2024-01-22",
  "reason": "Personal appointment"
}
```

---

## Overtime Management

### GET /overtime

Get overtime records.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| employeeId | ObjectId | No | Filter by employee |
| status | string | No | `pending`, `approved`, `rejected`, `paid` |
| month | number | No | Month |
| year | number | No | Year |

**Response:**

```json
{
  "success": true,
  "data": {
    "records": [
      {
        "_id": "ObjectId",
        "attendanceRecordId": "ObjectId",
        "employeeId": "ObjectId",
        "employeeName": "Ahmed Al-Shammari",
        "date": "2024-01-15",
        "overtimeType": "regular",
        "hours": 2,
        "minutes": 30,
        "rate": 1.5,
        "baseHourlyRate": 62.5,
        "amount": 234.38,
        "reason": "Project deadline",
        "taskDescription": "API development completion",
        "status": "approved",
        "approvedBy": "ObjectId",
        "approverName": "Ali Hassan",
        "approvedAt": "2024-01-16T10:00:00Z",
        "compensation": {
          "type": "payment",
          "calculatedAmount": 234.38
        }
      }
    ],
    "summary": {
      "totalHours": 45.5,
      "totalAmount": 4256.25,
      "pendingApproval": 5,
      "approved": 40,
      "rejected": 2
    }
  }
}
```

---

### POST /overtime/request

Request overtime approval (pre-approval).

**Request Body:**

```json
{
  "employeeId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "date": "2024-01-20",
  "estimatedHours": 3,
  "reason": "Client deliverable deadline",
  "taskDescription": "Complete API integration for client X",
  "compensationType": "payment"
}
```

**Compensation Types:**
- `payment` - Paid overtime
- `time_off` - Compensatory time off
- `both` - Combination

---

### POST /overtime/:id/approve

Approve overtime request.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | ObjectId | Yes | Overtime record ID |

**Request Body:**

```json
{
  "approvalNotes": "Approved for project deadline"
}
```

---

### POST /overtime/:id/reject

Reject overtime request.

**Request Body:**

```json
{
  "rejectionReason": "Overtime not justified"
}
```

---

## Attendance Corrections

### GET /attendance/corrections

Get correction requests.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | `pending`, `approved`, `rejected` |
| employeeId | ObjectId | No | Filter by employee |

**Response:**

```json
{
  "success": true,
  "data": {
    "corrections": [
      {
        "_id": "ObjectId",
        "requestId": "COR-2024-00001",
        "attendanceRecordId": "ObjectId",
        "employeeId": "ObjectId",
        "employeeName": "Ahmed Al-Shammari",
        "date": "2024-01-15",
        "field": "checkIn",
        "originalValue": {
          "time": "2024-01-15T08:35:00Z"
        },
        "requestedValue": {
          "time": "2024-01-15T08:00:00Z"
        },
        "reason": "Biometric device was not working, used manual sign-in",
        "supportingDocument": "https://...",
        "status": "pending",
        "requestedBy": "ObjectId",
        "requestedAt": "2024-01-15T17:00:00Z"
      }
    ]
  }
}
```

---

### POST /attendance/:id/correction

Submit attendance correction request.

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | ObjectId | Yes | Attendance record ID |

**Request Body:**

```json
{
  "field": "checkIn",
  "requestedValue": {
    "time": "2024-01-15T08:00:00Z"
  },
  "reason": "Biometric device was not working",
  "supportingDocument": "https://..."
}
```

**Correctable Fields:**
- `checkIn` - Check-in time
- `checkOut` - Check-out time
- `breaks` - Break records
- `overtime` - Overtime entries
- `status` - Attendance status

---

### POST /attendance/corrections/:id/approve

Approve correction request.

**Request Body:**

```json
{
  "reviewNotes": "Verified with security log"
}
```

---

### POST /attendance/corrections/:id/reject

Reject correction request.

**Request Body:**

```json
{
  "reviewNotes": "No supporting evidence provided"
}
```

---

## Geofencing

### GET /geofences

Get geofence locations.

**Response:**

```json
{
  "success": true,
  "data": {
    "geofences": [
      {
        "_id": "ObjectId",
        "name": "Riyadh HQ",
        "nameAr": "المقر الرئيسي - الرياض",
        "type": "office",
        "location": {
          "type": "Point",
          "coordinates": [46.6753, 24.7136]
        },
        "radius": 100,
        "address": "King Fahd Road, Riyadh",
        "addressAr": "طريق الملك فهد، الرياض",
        "isActive": true,
        "checkInRequired": true,
        "checkOutRequired": true,
        "allowedDevices": ["mobile", "biometric_terminal"],
        "createdAt": "2023-01-01T00:00:00Z"
      },
      {
        "_id": "ObjectId",
        "name": "Jeddah Branch",
        "nameAr": "فرع جدة",
        "type": "branch",
        "location": {
          "type": "Point",
          "coordinates": [39.1925, 21.4858]
        },
        "radius": 150,
        "isActive": true
      }
    ]
  }
}
```

---

### POST /geofences

Create geofence.

**Request Body:**

```json
{
  "name": "Client Site - ABC Corp",
  "nameAr": "موقع العميل - شركة ABC",
  "type": "client_site",
  "location": {
    "type": "Point",
    "coordinates": [46.7000, 24.7500]
  },
  "radius": 200,
  "address": "ABC Corp Building, Riyadh",
  "checkInRequired": false,
  "checkOutRequired": false,
  "validFrom": "2024-01-15",
  "validTo": "2024-06-30"
}
```

**Geofence Types:**
- `office` - Main office
- `branch` - Branch office
- `warehouse` - Warehouse
- `client_site` - Client location
- `project_site` - Project location
- `custom` - Custom location

---

### POST /attendance/verify-location

Verify if coordinates are within any geofence.

**Request Body:**

```json
{
  "coordinates": [46.6753, 24.7136]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "isWithinGeofence": true,
    "matchedGeofence": {
      "_id": "ObjectId",
      "name": "Riyadh HQ",
      "type": "office",
      "distance": 15
    }
  }
}
```

---

## Reports & Analytics

### GET /attendance/reports/summary

Get attendance summary report.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | number | Yes | Month (1-12) |
| year | number | Yes | Year |
| department | string | No | Filter by department |

**Response:**

```json
{
  "success": true,
  "data": {
    "period": {
      "month": 1,
      "year": 2024,
      "workingDays": 22,
      "holidays": 0
    },
    "summary": {
      "totalEmployees": 150,
      "totalRecords": 3300,
      "presentDays": 3100,
      "absentDays": 50,
      "lateDays": 120,
      "halfDays": 30,
      "leaveDays": 100,
      "averageAttendance": 97.5,
      "averageLateness": 3.6,
      "totalWorkedHours": 26400,
      "totalOvertimeHours": 450,
      "averageWorkedHoursPerDay": 8.0
    },
    "byDepartment": [
      {
        "department": "Engineering",
        "employeeCount": 45,
        "presentDays": 950,
        "absentDays": 10,
        "lateDays": 25,
        "attendanceRate": 98.9,
        "overtimeHours": 150
      }
    ],
    "byDay": [
      {
        "date": "2024-01-01",
        "dayOfWeek": "monday",
        "present": 140,
        "absent": 5,
        "late": 8,
        "onLeave": 5
      }
    ],
    "trends": {
      "attendanceByWeek": [97.2, 98.1, 97.5, 97.8],
      "latenessbyWeek": [4.2, 3.8, 3.5, 3.2],
      "comparison": {
        "previousMonth": {
          "attendanceRate": 96.8,
          "change": "+0.7%"
        }
      }
    }
  }
}
```

---

### GET /attendance/reports/employee/:employeeId

Get individual employee attendance report.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | number | No | Month |
| year | number | No | Year |

**Response:**

```json
{
  "success": true,
  "data": {
    "employee": {
      "_id": "ObjectId",
      "employeeId": "EMP0001",
      "name": "Ahmed Al-Shammari",
      "department": "Engineering"
    },
    "period": {
      "month": 1,
      "year": 2024
    },
    "summary": {
      "scheduledDays": 22,
      "presentDays": 20,
      "absentDays": 0,
      "lateDays": 2,
      "leaveDays": 2,
      "attendanceRate": 100,
      "punctualityRate": 90.9,
      "totalWorkedHours": 168,
      "averageCheckIn": "08:12",
      "averageCheckOut": "17:25",
      "overtimeHours": 12,
      "undertimeHours": 0
    },
    "dailyRecords": [/* Daily attendance records */],
    "violations": [],
    "complianceStatus": {
      "dailyHoursCompliant": true,
      "weeklyHoursCompliant": true,
      "restPeriodCompliant": true
    }
  }
}
```

---

### POST /attendance/mark-absences

Mark absences for employees who didn't check in (End of day job).

**Request Body:**

```json
{
  "date": "2024-01-15"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "processed": 150,
    "markedAbsent": 3,
    "alreadyRecorded": 147,
    "errors": []
  }
}
```

---

## Schemas

### AttendanceRecord Schema

```typescript
interface AttendanceRecord {
  _id: ObjectId;
  attendanceId: string; // ATT-YYYYMMDD-XXXX

  // Employee Info
  employeeId: ObjectId;
  employeeName?: string;
  employeeNameAr?: string;
  employeeNumber?: string;
  department?: string;
  departmentAr?: string;
  position?: string;
  positionAr?: string;

  // Date Info
  date: Date;
  dayOfWeek: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  dayOfWeekAr?: string;
  weekNumber?: number;
  month: number;
  year: number;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isRamadan: boolean;

  // Shift Info
  shift: {
    shiftId?: ObjectId;
    name: string;
    nameAr?: string;
    type: 'regular' | 'morning' | 'evening' | 'night' | 'flexible' | 'split' | 'custom';
    scheduledStart: Date;
    scheduledEnd: Date;
    scheduledHours: number;
    breakDuration: number;
    graceMinutes: number;
  };

  // Check-in/out
  checkIn?: CheckDetails;
  checkOut?: CheckDetails;

  // Hours
  hours: {
    scheduled: number;
    worked: number;
    regular: number;
    overtime: number;
    undertime: number;
    break: number;
    net: number;
    paid: number;
    unpaid: number;
  };

  // Status
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' |
          'holiday' | 'weekend' | 'work_from_home' | 'field_work' |
          'training' | 'incomplete' | 'pending';
  statusAr?: string;
  statusDetails: {
    isPresent: boolean;
    isAbsent: boolean;
    isLate: boolean;
    isEarlyDeparture: boolean;
    isHalfDay: boolean;
    isOvertime: boolean;
    isOnLeave: boolean;
    isRemote: boolean;
    hasViolation: boolean;
  };

  // Late/Early
  lateArrival?: LateArrival;
  earlyDeparture?: EarlyDeparture;
  absence?: Absence;
  overtime?: OvertimeDetails;

  // Breaks
  breaks: Break[];
  breakSummary: {
    totalBreaks: number;
    totalDuration: number;
    paidBreakMinutes: number;
    unpaidBreakMinutes: number;
    exceededBreaks: number;
  };

  // Violations
  violations: Violation[];
  violationSummary: {
    totalViolations: number;
    unresolvedViolations: number;
    totalPenalties: number;
  };

  // Compliance
  compliance: ComplianceCheck;

  // Corrections
  corrections: CorrectionRequest[];

  // Payroll
  payroll: {
    processed: boolean;
    processedAt?: Date;
    payrollRunId?: ObjectId;
    regularPayHours: number;
    overtimePayHours: number;
    deductions: {
      lateDeduction: number;
      absenceDeduction: number;
      totalDeduction: number;
    };
    additions: {
      overtimeAddition: number;
      totalAddition: number;
    };
  };

  // Multi-tenancy
  firmId: ObjectId;
  lawyerId?: ObjectId;
  createdBy?: ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

interface CheckDetails {
  time: Date;
  location?: {
    type: 'Point';
    coordinates: number[];
    address?: string;
    isWithinGeofence: boolean;
    geofenceId?: ObjectId;
    distanceFromOffice?: number;
    accuracy?: number;
  };
  biometric?: {
    method: 'fingerprint' | 'facial' | 'card' | 'pin' | 'mobile' | 'manual' | 'qr_code';
    deviceId?: string;
    verified: boolean;
    verificationScore?: number;
  };
  source: 'web' | 'mobile_app' | 'biometric' | 'manual_entry' | 'import' | 'api';
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'biometric_terminal' | 'other';
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
  photo?: string;
}

interface Break {
  type: 'prayer' | 'lunch' | 'personal' | 'medical' | 'other';
  typeAr?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  isPaid: boolean;
  isScheduled: boolean;
  status: 'ongoing' | 'completed' | 'exceeded';
  exceededBy?: number;
}

interface ComplianceCheck {
  dailyHoursCompliant: boolean;
  weeklyHoursCompliant: boolean;
  maxDailyHours: number;
  actualDailyHours?: number;
  fridayRestCompliant: boolean;
  workedOnFriday: boolean;
  restPeriodCompliant: boolean;
  restPeriodMinutes?: number;
  requiredRestMinutes: number;
  ramadanHoursApplied: boolean;
  ramadanMaxHours: number;
  overtimeCompliant: boolean;
  monthlyOvertimeHours?: number;
  maxMonthlyOvertime: number;
  isFullyCompliant: boolean;
  violations: string[];
  checkedAt: Date;
}
```

---

## Saudi Labor Law Compliance

### Working Hours (Article 98)

| Limit | Value |
|-------|-------|
| Maximum daily hours | 8 hours |
| Maximum weekly hours | 48 hours |

### Friday Rest (Article 101)

- Friday is the rest day for all employees
- If Friday work is required, overtime compensation applies

### Rest Periods (Article 104)

| Work Duration | Required Break |
|---------------|----------------|
| 5+ consecutive hours | 30 minutes minimum |

### Ramadan Hours (Article 106)

| Employee Type | Maximum Hours |
|---------------|---------------|
| Muslim employees | 6 hours/day |

### Overtime (Article 107)

| Type | Rate |
|------|------|
| Regular overtime | 150% of hourly rate |
| Weekend overtime | 200% of hourly rate |
| Holiday overtime | 200% of hourly rate |

---

**Previous:** [Part 1: Employees & Organization](./PART-01-EMPLOYEES-ORGANIZATION.md)

**Next:** [Part 3: Leave Management](./PART-03-LEAVE-MANAGEMENT.md)
