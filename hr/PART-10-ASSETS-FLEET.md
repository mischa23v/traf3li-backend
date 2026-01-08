# Part 10: Assets & Fleet Management API Documentation

## Overview

This document covers comprehensive asset and fleet management APIs for enterprise-level tracking, depreciation, maintenance, and employee assignment management.

**Base URLs:**
- Fixed Assets: `/api/assets`
- Asset Assignments (HR): `/api/hr/asset-assignments`
- Fleet Management: `/api/hr/fleet`

---

# SECTION 1: FIXED ASSETS (الأصول الثابتة)

## 1.1 Asset Statistics

### Get Asset Statistics
```
GET /api/assets/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAssets": 450,
    "totalValue": 2500000,
    "totalDepreciation": 750000,
    "netValue": 1750000,
    "inMaintenance": 12,
    "fullyDepreciated": 85,
    "byCategory": [
      { "categoryId": "cat1", "categoryName": "IT Equipment", "count": 200, "totalValue": 1000000, "netValue": 750000 },
      { "categoryId": "cat2", "categoryName": "Furniture", "count": 150, "totalValue": 500000, "netValue": 400000 }
    ]
  }
}
```

---

## 1.2 Asset Categories

### List Categories
```
GET /api/assets/categories
```

**Response:**
```json
{
  "success": true,
  "data": [{
    "_id": "cat123",
    "name": "IT Equipment",
    "nameAr": "معدات تقنية المعلومات",
    "code": "IT-EQUIP",
    "parentCategory": null,
    "depreciationMethod": "straight_line",
    "defaultUsefulLife": 36,
    "defaultDepreciationRate": 33.33,
    "assetCount": 200,
    "isActive": true
  }]
}
```

### Create Category
```
POST /api/assets/categories
```

**Request Body:**
```json
{
  "name": "Laptops",
  "nameAr": "أجهزة الحاسب المحمول",
  "code": "LAPTOP",
  "parentCategory": "cat123",
  "depreciationMethod": "straight_line",
  "defaultUsefulLife": 36,
  "defaultDepreciationRate": 33.33,
  "description": "Company laptops and notebooks"
}
```

### Get Single Category
```
GET /api/assets/categories/:id
```

### Update Category
```
PUT /api/assets/categories/:id
```

### Delete Category
```
DELETE /api/assets/categories/:id
```

---

## 1.3 Assets CRUD

### List Assets
```
GET /api/assets
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | draft, submitted, partially_depreciated, fully_depreciated, sold, scrapped, in_maintenance |
| assetCategory | ObjectId | Filter by category |
| location | string | Filter by location |
| custodian | ObjectId | Filter by custodian |
| department | string | Filter by department |
| search | string | Search in name, serial number |
| page | number | Page number |
| limit | number | Items per page |

**Response:**
```json
{
  "success": true,
  "data": [{
    "_id": "asset123",
    "assetId": "AST-20250115-0001",
    "assetNumber": "ASSET-000001",
    "assetName": "MacBook Pro 16\"",
    "assetNameAr": "ماك بوك برو 16 بوصة",
    "serialNo": "C02XL1234567",
    "assetCategory": {
      "_id": "cat456",
      "name": "Laptops"
    },
    "status": "partially_depreciated",
    "location": "Riyadh HQ - Floor 5",
    "custodian": {
      "_id": "user123",
      "name": "Mohammed Al-Hassan"
    },
    "department": "Legal",
    "purchaseDate": "2024-01-15",
    "grossPurchaseAmount": 12000,
    "currentValue": 12000,
    "accumulatedDepreciation": 4000,
    "valueAfterDepreciation": 8000,
    "depreciationMethod": "straight_line",
    "warrantyExpiryDate": "2027-01-15",
    "isWarrantyExpired": false
  }],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 450,
    "pages": 23
  }
}
```

### Create Asset
```
POST /api/assets
```

**Request Body:**
```json
{
  "assetName": "MacBook Pro 16\"",
  "assetNameAr": "ماك بوك برو 16 بوصة",
  "description": "M3 Pro chip, 18GB RAM, 512GB SSD",
  "serialNo": "C02XL1234567",
  "assetCategory": "cat456",
  "location": "Riyadh HQ - Floor 5",
  "custodian": "user123",
  "custodianName": "Mohammed Al-Hassan",
  "department": "Legal",

  "purchaseDate": "2024-01-15",
  "supplierId": "vendor123",
  "supplierName": "Apple Saudi Arabia",
  "grossPurchaseAmount": 12000,
  "currency": "SAR",
  "assetQuantity": 1,
  "availableForUseDate": "2024-01-16",

  "depreciationMethod": "straight_line",
  "totalNumberOfDepreciations": 36,
  "frequencyOfDepreciation": "monthly",
  "depreciationStartDate": "2024-02-01",
  "expectedValueAfterUsefulLife": 1000,
  "openingAccumulatedDepreciation": 0,

  "warrantyExpiryDate": "2027-01-15",

  "insuranceDetails": {
    "insurer": "TAWUNIYA",
    "policyNo": "POL-2024-12345",
    "startDate": "2024-01-15",
    "endDate": "2025-01-14",
    "insuredValue": 12000
  },

  "tags": ["laptop", "development", "legal"],
  "image": "https://storage.example.com/assets/macbook123.jpg"
}
```

### Get Single Asset
```
GET /api/assets/:id
```

### Update Asset
```
PUT /api/assets/:id
```

### Submit Asset for Approval
```
POST /api/assets/:id/submit
```

**Response:**
```json
{
  "success": true,
  "message": "Asset submitted for approval",
  "data": {
    "_id": "asset123",
    "status": "submitted"
  }
}
```

### Delete Asset
```
DELETE /api/assets/:id
```

---

## 1.4 Depreciation Methods

### Supported Methods:
| Method | Description | Formula |
|--------|-------------|---------|
| straight_line | Equal depreciation each period | (Cost - Salvage) / Useful Life |
| double_declining_balance | Accelerated, higher early depreciation | Book Value × (2 / Useful Life) |
| written_down_value | Percentage of current value | Current Value × Rate% |

### Frequency Options:
- monthly
- quarterly
- half_yearly
- yearly

---

## 1.5 Maintenance Schedules

### List Maintenance Schedules
```
GET /api/assets/maintenance
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| assetId | ObjectId | Filter by asset |
| status | string | scheduled, completed, cancelled |
| type | string | preventive, corrective, inspection |
| page | number | Page number |

### Create Maintenance Schedule
```
POST /api/assets/maintenance
```

**Request Body:**
```json
{
  "assetId": "asset123",
  "maintenanceType": "preventive",
  "description": "Annual maintenance and cleaning",
  "scheduledDate": "2025-02-15",
  "assignedTo": "user456",
  "estimatedCost": 500,
  "priority": "medium",
  "notes": "Replace thermal paste if needed"
}
```

### Get Single Schedule
```
GET /api/assets/maintenance/:id
```

### Update Schedule
```
PUT /api/assets/maintenance/:id
```

### Complete Maintenance
```
POST /api/assets/maintenance/:id/complete
```

**Request Body:**
```json
{
  "completionDate": "2025-02-15",
  "actualCost": 450,
  "workPerformed": "Cleaned fans, replaced thermal paste, updated firmware",
  "partsReplaced": [{
    "partName": "Thermal Paste",
    "partNumber": "TP-2025",
    "quantity": 1,
    "cost": 50
  }],
  "technicianNotes": "System running 10°C cooler after maintenance"
}
```

---

## 1.6 Asset Movements

### List Movements
```
GET /api/assets/movements
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| assetId | ObjectId | Filter by asset |
| movementType | string | transfer, issue, receipt, disposal |
| dateFrom | date | Movement date from |
| dateTo | date | Movement date to |

### Create Movement
```
POST /api/assets/movements
```

**Request Body:**
```json
{
  "assetId": "asset123",
  "movementType": "transfer",
  "transactionDate": "2025-01-20",
  "sourceLocation": "Riyadh HQ - Floor 5",
  "targetLocation": "Riyadh HQ - Floor 3",
  "fromCustodian": "user123",
  "toCustodian": "user456",
  "fromDepartment": "Legal",
  "toDepartment": "Compliance",
  "reason": "Employee department transfer",
  "authorizedBy": "user789",
  "notes": "Asset in good condition"
}
```

**Movement Types:**
| Type | Description |
|------|-------------|
| transfer | Move between locations/custodians |
| issue | Issue to employee |
| receipt | Receive from vendor/return |
| disposal | Mark as disposed/sold/scrapped |

---

## 1.7 Asset Settings

### Get Settings
```
GET /api/assets/settings
```

**Response:**
```json
{
  "success": true,
  "data": {
    "assetIdPrefix": "AST",
    "autoGenerateAssetNumber": true,
    "assetNumberPrefix": "ASSET",
    "assetNumberSequence": 1250,
    "defaultDepreciationMethod": "straight_line",
    "defaultCurrency": "SAR",
    "warrantyAlertDays": 30,
    "insuranceAlertDays": 30,
    "maintenanceAlertDays": 14,
    "enableBarcodeScan": true,
    "requireCustodianApproval": true
  }
}
```

### Update Settings
```
PUT /api/assets/settings
```

---

# SECTION 2: ASSET ASSIGNMENTS (HR) (تخصيص الأصول للموظفين)

## 2.1 Assignment Statistics

### Get Assignment Statistics
```
GET /api/hr/asset-assignments/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAssignments": 380,
    "byStatus": {
      "assigned": 320,
      "in_use": 280,
      "returned": 45,
      "lost": 3,
      "damaged": 8,
      "maintenance": 4
    },
    "byAssetType": {
      "laptop": 150,
      "mobile_phone": 100,
      "desktop": 50,
      "access_card": 80
    },
    "totalAssetValue": 2500000,
    "overdueReturns": 5,
    "maintenanceDue": 12,
    "warrantyExpiring": 15,
    "insuranceExpiring": 8
  }
}
```

### Get Overdue Returns
```
GET /api/hr/asset-assignments/overdue
```

### Get Maintenance Due
```
GET /api/hr/asset-assignments/maintenance-due
```

### Get Warranty Expiring
```
GET /api/hr/asset-assignments/warranty-expiring
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| days | number | Days ahead (default: 30) |

---

## 2.2 Assignment CRUD

### List Assignments
```
GET /api/hr/asset-assignments
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | assigned, in_use, returned, lost, damaged, maintenance, stolen, retired |
| employeeId | ObjectId | Filter by employee |
| assetType | string | laptop, desktop, mobile_phone, tablet, etc. |
| assetCategory | string | IT_equipment, office_equipment, vehicle, etc. |
| department | string | Filter by department |
| assignmentType | string | permanent, temporary, project_based, pool |
| overdueReturn | boolean | Show only overdue returns |
| search | string | Search in asset name, serial, employee name |
| page | number | Page number |
| limit | number | Items per page |

**Response:**
```json
{
  "success": true,
  "data": [{
    "_id": "asgn123",
    "assignmentId": "ASG-1234567890-ABCD",
    "assignmentNumber": "ASG-2025-0001",
    "employeeId": "emp123",
    "employeeName": "Mohammed Al-Hassan",
    "employeeNameAr": "محمد الحسن",
    "department": "Legal",
    "assetTag": "AST-LAP-001",
    "assetName": "MacBook Pro 16\"",
    "assetType": "laptop",
    "assetCategory": "IT_equipment",
    "serialNumber": "C02XL1234567",
    "status": "in_use",
    "assignmentType": "permanent",
    "assignedDate": "2024-01-15",
    "conditionAtAssignment": "new",
    "purchasePrice": 12000,
    "currentValue": 8000,
    "warranty": {
      "hasWarranty": true,
      "warrantyEndDate": "2027-01-15"
    },
    "acknowledgment": {
      "acknowledged": true,
      "acknowledgmentDate": "2024-01-15"
    },
    "daysAssigned": 365,
    "isOverdueReturn": false
  }],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 320
  }
}
```

### Get Employee's Assignments
```
GET /api/hr/asset-assignments/by-employee/:employeeId
```

### Create Assignment
```
POST /api/hr/asset-assignments
```

**Request Body:**
```json
{
  "employeeId": "emp123",
  "employeeName": "Mohammed Al-Hassan",
  "employeeNameAr": "محمد الحسن",
  "nationalId": "1234567890",
  "email": "mohammed@firm.com",
  "phone": "+966501234567",
  "department": "Legal",
  "departmentId": "dept123",
  "jobTitle": "Senior Lawyer",
  "location": "Riyadh HQ",
  "managerId": "mgr456",
  "managerName": "Ahmed Al-Rashid",

  "assetId": "AST-20250115-0001",
  "assetTag": "AST-LAP-001",
  "assetNumber": "ASSET-000001",
  "serialNumber": "C02XL1234567",
  "modelNumber": "MPHH3LL/A",
  "assetName": "MacBook Pro 16\"",
  "assetNameAr": "ماك بوك برو 16 بوصة",
  "assetType": "laptop",
  "assetCategory": "IT_equipment",
  "brand": "Apple",
  "model": "MacBook Pro",

  "specifications": {
    "processor": "Apple M3 Pro",
    "ram": "18GB",
    "storage": "512GB SSD",
    "screenSize": "16.2 inches",
    "operatingSystem": "macOS Sonoma"
  },

  "conditionAtAssignment": "new",
  "purchasePrice": 12000,
  "purchaseDate": "2024-01-10",
  "currency": "SAR",
  "depreciationRate": 33.33,

  "warranty": {
    "hasWarranty": true,
    "warrantyProvider": "Apple",
    "warrantyStartDate": "2024-01-15",
    "warrantyEndDate": "2027-01-15",
    "warrantyType": "manufacturer",
    "coverageDetails": "Hardware warranty and AppleCare+"
  },

  "insurance": {
    "insured": true,
    "insuranceProvider": "TAWUNIYA",
    "policyNumber": "POL-2024-12345",
    "coverageAmount": 12000,
    "policyStartDate": "2024-01-15",
    "policyEndDate": "2025-01-14"
  },

  "assignmentType": "permanent",
  "assignedDate": "2024-01-15",
  "assignmentPurpose": "Daily work equipment",
  "assignmentPurposeCategory": "job_requirement",

  "assignmentLocation": {
    "primaryLocation": "Riyadh HQ",
    "homeUseAllowed": true,
    "internationalTravelAllowed": false
  },

  "handover": {
    "handoverDate": "2024-01-15",
    "handoverMethod": "in_person",
    "handoverLocation": "IT Office",
    "accessories": [{
      "accessoryType": "charger",
      "description": "96W USB-C Power Adapter",
      "quantity": 1
    }, {
      "accessoryType": "cable",
      "description": "USB-C to MagSafe 3 Cable",
      "quantity": 1
    }],
    "handoverChecklist": [{
      "item": "Device powers on",
      "checked": true
    }, {
      "item": "All accessories present",
      "checked": true
    }]
  },

  "termsAndConditions": {
    "acceptableUse": {
      "businessUseOnly": false,
      "personalUseAllowed": true,
      "personalUseLimits": "Limited personal use allowed"
    },
    "liability": {
      "employeeLiableForLoss": true,
      "employeeLiableForDamage": true,
      "maxLiabilityAmount": 12000
    },
    "returnConditions": {
      "returnRequired": true,
      "returnConditionRequired": "good_working_order",
      "accessoriesReturnRequired": true
    }
  },

  "maintenanceSchedule": {
    "required": true,
    "maintenanceType": "preventive",
    "frequency": "annual",
    "nextMaintenanceDue": "2025-01-15"
  }
}
```

### Get Single Assignment
```
GET /api/hr/asset-assignments/:id
```

### Update Assignment
```
PATCH /api/hr/asset-assignments/:id
```

### Delete Assignment
```
DELETE /api/hr/asset-assignments/:id
```

---

## 2.3 Workflow Operations

### Employee Acknowledges Receipt
```
POST /api/hr/asset-assignments/:id/acknowledge
```

**Request Body:**
```json
{
  "acknowledgedTerms": [{
    "term": "I will use this asset responsibly",
    "accepted": true
  }, {
    "term": "I am liable for loss or damage due to negligence",
    "accepted": true
  }],
  "acknowledgmentMethod": "digital_signature",
  "signature": "data:image/png;base64,..."
}
```

### Initiate Return
```
POST /api/hr/asset-assignments/:id/return/initiate
```

**Request Body:**
```json
{
  "returnReason": "resignation",
  "returnReasonDetails": "Employee resignation effective 2025-02-28",
  "returnDueDate": "2025-02-28"
}
```

**Return Reasons:**
- resignation
- termination
- upgrade
- project_end
- replacement
- no_longer_needed
- defective
- lease_end

### Complete Return
```
POST /api/hr/asset-assignments/:id/return/complete
```

**Request Body:**
```json
{
  "actualReturnDate": "2025-02-28",
  "returnMethod": "hand_delivery",
  "returnLocation": "IT Office",
  "inspection": {
    "conditionAtReturn": "good",
    "damageAssessment": {
      "hasDamage": false
    },
    "completenessCheck": {
      "complete": true,
      "missingItems": []
    },
    "dataCheck": {
      "dataWiped": true,
      "wipingMethod": "software",
      "verificationCertificate": "https://storage.example.com/certs/wipe123.pdf"
    },
    "functionalityTest": {
      "tested": true,
      "functional": true,
      "usableForReassignment": true
    }
  },
  "nextSteps": {
    "assetStatus": "available_for_reassignment"
  }
}
```

### Update Status
```
PUT /api/hr/asset-assignments/:id/status
```

**Request Body:**
```json
{
  "status": "maintenance",
  "statusReason": "Keyboard malfunction - sent for repair"
}
```

**Valid Statuses:**
- assigned
- in_use
- returned
- lost
- damaged
- maintenance
- stolen
- retired

### Transfer Asset
```
POST /api/hr/asset-assignments/:id/transfer
```

**Request Body:**
```json
{
  "transferType": "employee_transfer",
  "transferTo": {
    "employeeId": "emp456",
    "employeeName": "Sara Al-Fahad",
    "department": "Compliance",
    "location": "Riyadh HQ - Floor 3"
  },
  "transferReason": "Employee role change",
  "temporary": false
}
```

### Issue Clearance Certificate
```
POST /api/hr/asset-assignments/:id/clearance
```

**Response:**
```json
{
  "success": true,
  "message": "Clearance certificate issued",
  "data": {
    "clearanceCertificate": "https://storage.example.com/certs/clearance-asgn123.pdf",
    "clearanceDate": "2025-02-28"
  }
}
```

---

## 2.4 Maintenance & Repairs

### Record Maintenance
```
POST /api/hr/asset-assignments/:id/maintenance
```

**Request Body:**
```json
{
  "maintenanceType": "preventive",
  "maintenanceDate": "2025-01-20",
  "performedBy": "vendor",
  "vendorName": "Apple Authorized Service",
  "description": "Annual maintenance and diagnostic check",
  "partsReplaced": [{
    "partName": "Battery",
    "partNumber": "A2519",
    "quantity": 1,
    "cost": 500
  }],
  "laborCost": 200,
  "totalCost": 700,
  "downtime": 24,
  "nextServiceDue": "2026-01-20",
  "notes": "Battery health was at 78%, replaced under warranty"
}
```

### Report Repair Needed
```
POST /api/hr/asset-assignments/:id/repair
```

**Request Body:**
```json
{
  "issueDescription": "Keyboard keys sticking, trackpad not responding properly",
  "severity": "moderate",
  "causeOfDamage": "normal_wear"
}
```

### Update Repair Status
```
PUT /api/hr/asset-assignments/:id/repair/:repairId
```

**Request Body:**
```json
{
  "repairStatus": "completed",
  "assessment": {
    "diagnosis": "Liquid damage under keyboard",
    "repairEstimate": 1500,
    "repairRecommendation": "repair"
  },
  "repairCompletionDate": "2025-01-25",
  "totalRepairCost": 1200,
  "employeeCharge": {
    "chargeAmount": 600,
    "deductedFromSalary": true
  },
  "assetFunctional": true
}
```

---

## 2.5 Incident Reporting

### Report Incident
```
POST /api/hr/asset-assignments/:id/incident
```

**Request Body:**
```json
{
  "incidentType": "theft",
  "incidentDate": "2025-01-18",
  "incidentDescription": "Laptop stolen from employee's vehicle",
  "location": "Company parking lot",
  "circumstances": {
    "howItHappened": "Vehicle break-in during lunch hours",
    "policeReportFiled": true,
    "policeReportNumber": "PR-2025-12345",
    "policeStation": "Riyadh Central Police",
    "cctv": {
      "cctvAvailable": true,
      "cctvReviewed": true
    }
  },
  "impact": {
    "severity": "major",
    "assetRecoverable": false,
    "dataLoss": true,
    "dataType": "Client documents",
    "financialLoss": 12000
  },
  "insuranceClaim": {
    "claimFiled": true,
    "claimDate": "2025-01-19",
    "claimAmount": 12000
  }
}
```

**Incident Types:**
- loss
- theft
- damage
- malfunction
- data_breach
- unauthorized_access
- misuse
- accident

---

## 2.6 Export & Policies

### Export Assignments
```
GET /api/hr/asset-assignments/export
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| format | string | csv, xlsx, pdf |
| status | string | Filter by status |
| department | string | Filter by department |

### Get Asset Policies
```
GET /api/hr/asset-assignments/policies
```

**Response:**
```json
{
  "success": true,
  "data": {
    "depreciationRates": {
      "laptop": 33.33,
      "desktop": 33.33,
      "mobile_phone": 50,
      "tablet": 33.33,
      "monitor": 20,
      "furniture": 10,
      "vehicle": 20
    },
    "maintenanceIntervals": {
      "laptop": 365,
      "desktop": 365,
      "vehicle": 90,
      "printer": 180
    },
    "returnGracePeriod": 7,
    "liabilityThresholds": {
      "fullLiability": 10000,
      "partialLiability": 5000
    }
  }
}
```

---

# SECTION 3: FLEET MANAGEMENT (إدارة الأسطول)

## 3.1 Fleet Statistics & Alerts

### Get Fleet Statistics
```
GET /api/hr/fleet/stats
```

**Response:**
```json
{
  "success": true,
  "data": [{
    "totalVehicles": 45,
    "activeVehicles": 38,
    "inMaintenance": 4,
    "outOfService": 3,
    "assigned": 35,
    "unassigned": 3,
    "totalValue": 2500000,
    "avgOdometer": 45000,
    "byType": [
      { "type": "sedan", "count": 20 },
      { "type": "suv", "count": 15 },
      { "type": "pickup", "count": 8 },
      { "type": "van", "count": 2 }
    ]
  }]
}
```

### Get Expiring Documents
```
GET /api/hr/fleet/expiring-documents
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| days | number | Days ahead (default: 30) |

### Get Maintenance Due
```
GET /api/hr/fleet/maintenance-due
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| days | number | Days ahead (default: 14) |

### Get Driver Safety Rankings
```
GET /api/hr/fleet/driver-rankings
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| limit | number | Number of drivers (default: 10) |

---

## 3.2 Vehicles CRUD

### List Vehicles
```
GET /api/hr/fleet/vehicles
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | active, maintenance, out_of_service, reserved, disposed |
| vehicleType | string | sedan, suv, pickup, van, truck, bus, motorcycle |
| currentDriverId | ObjectId | Filter by assigned driver |
| assignedDepartmentId | ObjectId | Filter by department |
| search | string | Search in plate number, make, model |
| page | number | Page number |
| limit | number | Items per page |

**Response:**
```json
{
  "success": true,
  "data": [{
    "_id": "veh123",
    "vehicleId": "VH-0001",
    "plateNumber": "ABC 1234",
    "plateNumberAr": "أ ب ج ١٢٣٤",
    "make": "Toyota",
    "model": "Camry",
    "year": 2023,
    "color": "White",
    "vin": "JTDBF3EK5PJ123456",
    "vehicleType": "sedan",
    "ownershipType": "owned",
    "fuelType": "petrol",
    "status": "active",
    "currentOdometer": 25000,
    "currentDriverId": {
      "_id": "emp123",
      "name": "Mohammed Al-Hassan"
    },
    "currentDriverName": "Mohammed Al-Hassan",
    "registration": {
      "number": "REG-2023-12345",
      "expiryDate": "2025-12-31"
    },
    "insurance": {
      "provider": "TAWUNIYA",
      "policyNumber": "AUTO-2023-12345",
      "expiryDate": "2025-06-30",
      "coverageType": "comprehensive"
    },
    "nextServiceDue": "2025-02-15",
    "lastInspectionDate": "2025-01-01",
    "lastInspectionStatus": "passed"
  }],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

### Create Vehicle
```
POST /api/hr/fleet/vehicles
```

**Request Body:**
```json
{
  "plateNumber": "ABC 1234",
  "plateNumberAr": "أ ب ج ١٢٣٤",
  "make": "Toyota",
  "model": "Camry",
  "year": 2023,
  "color": "White",
  "colorAr": "أبيض",
  "vin": "JTDBF3EK5PJ123456",
  "engineNumber": "ENG123456",
  "chassisNumber": "CHS123456",

  "vehicleType": "sedan",
  "vehicleClass": "Economy",

  "ownershipType": "owned",
  "purchaseDate": "2023-01-15",
  "purchasePrice": 120000,
  "depreciationMethod": "straight_line",
  "depreciationRate": 20,

  "fuelType": "petrol",
  "engineCapacity": 2500,
  "horsepower": 203,
  "transmission": "automatic",
  "driveType": "fwd",
  "tankCapacity": 60,
  "seatingCapacity": 5,
  "doors": 4,

  "currentOdometer": 25000,
  "odometerUnit": "km",

  "registration": {
    "number": "REG-2023-12345",
    "issuedDate": "2023-01-20",
    "expiryDate": "2025-12-31",
    "issuedBy": "Traffic Department",
    "registrationType": "private",
    "renewalAlertDays": 30
  },

  "insurance": {
    "provider": "TAWUNIYA",
    "providerAr": "التعاونية",
    "policyNumber": "AUTO-2023-12345",
    "startDate": "2023-06-01",
    "expiryDate": "2024-05-31",
    "premium": 3500,
    "premiumFrequency": "annual",
    "coverageType": "comprehensive",
    "coverageAmount": 120000,
    "deductible": 1000,
    "renewalAlertDays": 30
  },

  "serviceIntervalDays": 180,
  "serviceIntervalKm": 10000,
  "maintenanceAlertDays": 14,

  "gpsEnabled": true,
  "gpsDeviceId": "GPS-12345",

  "assignedDepartmentId": "dept123",
  "assignedDepartmentName": "Legal",
  "costCenter": "CC-LEGAL-001",

  "notes": "Executive vehicle for senior management"
}
```

### Get Single Vehicle
```
GET /api/hr/fleet/vehicles/:id
```

### Update Vehicle
```
PATCH /api/hr/fleet/vehicles/:id
```

### Delete Vehicle (Soft Delete)
```
DELETE /api/hr/fleet/vehicles/:id
```

### Update Vehicle Location (GPS)
```
PUT /api/hr/fleet/vehicles/:id/location
```

**Request Body:**
```json
{
  "latitude": 24.7136,
  "longitude": 46.6753,
  "altitude": 612,
  "heading": 180,
  "speed": 60,
  "address": "King Fahd Road, Riyadh"
}
```

### Get Location History
```
GET /api/hr/fleet/vehicles/:id/location-history
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| dateFrom | date | Start date |
| dateTo | date | End date |
| page | number | Page number |
| limit | number | Items per page |

---

## 3.3 Fuel Logs

### List Fuel Logs
```
GET /api/hr/fleet/fuel-logs
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| vehicleId | ObjectId | Filter by vehicle |
| driverId | ObjectId | Filter by driver |
| dateFrom | date | Date from |
| dateTo | date | Date to |
| fuelType | string | petrol, diesel, hybrid, electric |
| page | number | Page number |

### Create Fuel Log
```
POST /api/hr/fleet/fuel-logs
```

**Request Body:**
```json
{
  "vehicleId": "veh123",
  "driverId": "emp123",
  "date": "2025-01-20",
  "time": "14:30",
  "odometerReading": 26500,
  "previousOdometer": 26000,
  "fuelType": "petrol",
  "quantity": 45,
  "pricePerUnit": 2.33,
  "totalCost": 104.85,
  "fullTank": true,
  "station": "Saudi Aramco Station",
  "stationLocation": "King Fahd Road",
  "stationLatitude": 24.7136,
  "stationLongitude": 46.6753,
  "paymentMethod": "fuel_card",
  "fuelCardNumber": "FC-12345",
  "receiptNumber": "RCP-2025-12345"
}
```

**Response (with calculated fields):**
```json
{
  "success": true,
  "data": {
    "_id": "fuel123",
    "logId": "FL-00001",
    "distanceTraveled": 500,
    "fuelEfficiency": 11.11,
    "co2Emissions": 103.95
  }
}
```

### Verify Fuel Log
```
POST /api/hr/fleet/fuel-logs/:id/verify
```

---

## 3.4 Maintenance Records

### List Maintenance Records
```
GET /api/hr/fleet/maintenance
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| vehicleId | ObjectId | Filter by vehicle |
| status | string | scheduled, in_progress, completed, cancelled, deferred |
| maintenanceType | string | scheduled_service, oil_change, tire_rotation, etc. |
| maintenanceCategory | string | preventive, corrective, predictive, emergency |
| priority | string | low, medium, high, critical |
| page | number | Page number |

### Create Maintenance Record
```
POST /api/hr/fleet/maintenance
```

**Request Body:**
```json
{
  "vehicleId": "veh123",
  "maintenanceType": "scheduled_service",
  "maintenanceCategory": "preventive",
  "priority": "medium",
  "description": "30,000 km scheduled service",
  "scheduledDate": "2025-01-25",
  "odometerAtService": 30000,
  "serviceProvider": "Toyota Service Center",
  "serviceLocation": "Riyadh",
  "requiresApproval": true
}
```

### Update Maintenance Record
```
PATCH /api/hr/fleet/maintenance/:id
```

**Request Body:**
```json
{
  "status": "completed",
  "completionDate": "2025-01-25",
  "workPerformed": "Full service including oil change, filter replacement, brake inspection",
  "laborCost": 500,
  "laborHours": 3,
  "partsReplaced": [{
    "partName": "Engine Oil",
    "partNumber": "08880-10806",
    "manufacturer": "Toyota",
    "quantity": 5,
    "unitCost": 80,
    "totalCost": 400,
    "isOem": true
  }, {
    "partName": "Oil Filter",
    "partNumber": "04152-YZZA1",
    "manufacturer": "Toyota",
    "quantity": 1,
    "unitCost": 50,
    "totalCost": 50,
    "isOem": true
  }],
  "taxAmount": 67.50,
  "totalCost": 1017.50,
  "invoiceNumber": "INV-2025-0001"
}
```

**Maintenance Types:**
| Type | Description |
|------|-------------|
| scheduled_service | Regular maintenance |
| oil_change | Oil and filter change |
| tire_rotation | Tire rotation |
| tire_replacement | New tires |
| brake_service | Brake inspection/service |
| brake_replacement | Brake pad/rotor replacement |
| battery_replacement | New battery |
| transmission_service | Transmission fluid/service |
| engine_repair | Engine repairs |
| body_repair | Body/paint work |
| accident_repair | Post-accident repairs |
| recall | Manufacturer recall |

---

## 3.5 Vehicle Inspections

### Get Inspection Checklist
```
GET /api/hr/fleet/inspections/checklist
```

**Response:**
```json
{
  "success": true,
  "data": [{
    "code": "EXT_LIGHTS",
    "name": "Exterior Lights",
    "nameAr": "الأضواء الخارجية",
    "category": "exterior"
  }, {
    "code": "BRAKES",
    "name": "Brakes",
    "nameAr": "الفرامل",
    "category": "mechanical"
  }]
}
```

### List Inspections
```
GET /api/hr/fleet/inspections
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| vehicleId | ObjectId | Filter by vehicle |
| inspectorId | ObjectId | Filter by inspector |
| inspectionType | string | pre_trip, post_trip, daily, weekly, monthly, annual, dvir |
| overallStatus | string | passed, failed, passed_with_defects |
| dateFrom | date | Date from |
| dateTo | date | Date to |

### Create Inspection
```
POST /api/hr/fleet/inspections
```

**Request Body:**
```json
{
  "vehicleId": "veh123",
  "inspectorId": "emp123",
  "inspectorName": "Mohammed Al-Hassan",
  "inspectionType": "pre_trip",
  "inspectionDate": "2025-01-20T08:00:00.000Z",
  "odometerReading": 26500,
  "location": "Riyadh HQ Parking",
  "checklistItems": [{
    "code": "EXT_LIGHTS",
    "name": "Exterior Lights",
    "status": "pass"
  }, {
    "code": "BRAKES",
    "name": "Brakes",
    "status": "pass"
  }, {
    "code": "TIRES",
    "name": "Tires & Wheels",
    "status": "needs_attention",
    "severity": "minor",
    "notes": "Front left tire pressure low - inflated to 35 PSI"
  }],
  "overallStatus": "passed_with_defects",
  "driverCertification": {
    "driverConfirmed": true,
    "confirmationTime": "2025-01-20T08:15:00.000Z"
  },
  "notes": "Minor issue with tire pressure, corrected on site"
}
```

**Inspection Types:**
| Type | Description |
|------|-------------|
| pre_trip | Before starting trip |
| post_trip | After completing trip |
| daily | Daily vehicle check |
| weekly | Weekly inspection |
| monthly | Monthly detailed inspection |
| annual | Annual comprehensive inspection |
| dvir | Driver Vehicle Inspection Report (DVIR) |
| dot | Department of Transportation inspection |

---

## 3.6 Trips

### List Trips
```
GET /api/hr/fleet/trips
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| vehicleId | ObjectId | Filter by vehicle |
| driverId | ObjectId | Filter by driver |
| tripType | string | business, personal, commute, delivery, service_call, client_visit |
| status | string | planned, in_progress, completed, cancelled |
| dateFrom | date | Date from |
| dateTo | date | Date to |

### Create/Start Trip
```
POST /api/hr/fleet/trips
```

**Request Body:**
```json
{
  "vehicleId": "veh123",
  "driverId": "emp123",
  "tripType": "client_visit",
  "purpose": "Client meeting at SABIC headquarters",
  "clientId": "client456",
  "startTime": "2025-01-20T09:00:00.000Z",
  "startLocation": {
    "name": "Riyadh HQ",
    "address": "King Fahd Road, Riyadh",
    "latitude": 24.7136,
    "longitude": 46.6753
  },
  "endLocation": {
    "name": "SABIC HQ",
    "address": "Jubail Industrial City",
    "latitude": 27.0174,
    "longitude": 49.6225
  },
  "startOdometer": 26500,
  "estimatedDistance": 420,
  "isReimbursable": true,
  "reimbursementRate": 0.50
}
```

### End Trip
```
POST /api/hr/fleet/trips/:id/end
```

**Request Body:**
```json
{
  "endTime": "2025-01-20T17:00:00.000Z",
  "endOdometer": 26920,
  "drivingMetrics": {
    "avgSpeed": 85,
    "maxSpeed": 120,
    "idleTime": 15,
    "harshBraking": 2,
    "harshAcceleration": 1
  },
  "fuelUsed": 35,
  "fuelCost": 81.55,
  "tollCost": 50,
  "parkingCost": 20,
  "receipts": [{
    "type": "toll",
    "amount": 50,
    "description": "Riyadh-Dammam toll"
  }],
  "notes": "Successful client meeting"
}
```

**Response (with calculations):**
```json
{
  "success": true,
  "data": {
    "_id": "trip123",
    "tripId": "TR-00001",
    "distance": 420,
    "totalCost": 151.55,
    "costPerKm": 0.36,
    "reimbursementAmount": 210,
    "drivingMetrics": {
      "drivingScore": 85
    }
  }
}
```

---

## 3.7 Incidents

### List Incidents
```
GET /api/hr/fleet/incidents
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| vehicleId | ObjectId | Filter by vehicle |
| driverId | ObjectId | Filter by driver |
| incidentType | string | accident, theft, vandalism, breakdown, etc. |
| severity | string | minor, moderate, major, critical |
| status | string | reported, under_investigation, resolved, closed |
| dateFrom | date | Date from |
| dateTo | date | Date to |

### Get Single Incident
```
GET /api/hr/fleet/incidents/:id
```

### Create Incident
```
POST /api/hr/fleet/incidents
```

**Request Body:**
```json
{
  "vehicleId": "veh123",
  "driverId": "emp123",
  "driverName": "Mohammed Al-Hassan",
  "incidentType": "accident",
  "severity": "moderate",
  "incidentDate": "2025-01-20",
  "incidentTime": "14:30",
  "location": "King Fahd Road, near Exit 15",
  "latitude": 24.7500,
  "longitude": 46.7000,
  "address": "King Fahd Road, Riyadh",
  "city": "Riyadh",
  "odometerReading": 26800,
  "description": "Rear-end collision at traffic signal",
  "driverStatement": "Vehicle ahead stopped suddenly",

  "accidentDetails": {
    "weatherConditions": "clear",
    "roadConditions": "dry",
    "lightConditions": "daylight",
    "policeReportFiled": true,
    "policeReportNumber": "TR-2025-12345",
    "policeStation": "Traffic Police - Riyadh Central",
    "faultDetermination": "other_party",
    "otherVehiclesInvolved": [{
      "plateNumber": "XYZ 5678",
      "make": "Hyundai",
      "model": "Sonata",
      "color": "Silver",
      "driverName": "Other Driver Name",
      "driverPhone": "+966501234567",
      "insuranceCompany": "TAWUNIYA",
      "damages": "Front bumper damage"
    }]
  },

  "vehicleDamages": {
    "description": "Rear bumper cracked, tail light broken",
    "affectedAreas": ["rear_bumper", "tail_light"],
    "isDriveable": true,
    "estimatedRepairCost": 3500
  },

  "insuranceClaim": {
    "claimFiled": true,
    "claimDate": "2025-01-21",
    "claimAmount": 3500
  }
}
```

**Incident Types:**
| Type | Description |
|------|-------------|
| accident | Vehicle collision/crash |
| theft | Vehicle stolen |
| vandalism | Deliberate damage |
| breakdown | Mechanical breakdown |
| traffic_violation | Traffic law violation |
| near_miss | Near-accident event |
| injury | Injury-related incident |
| property_damage | Damage to third-party property |

### Update Incident
```
PATCH /api/hr/fleet/incidents/:id
```

---

## 3.8 Driver Profiles

### List Driver Profiles
```
GET /api/hr/fleet/drivers
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | active, suspended, inactive, terminated |
| search | string | Search in name |
| page | number | Page number |
| limit | number | Items per page |

### Get Single Driver Profile
```
GET /api/hr/fleet/drivers/:id
```

### Create Driver Profile
```
POST /api/hr/fleet/drivers
```

**Request Body:**
```json
{
  "employeeId": "emp123",
  "employeeName": "Mohammed Al-Hassan",
  "employeeNameAr": "محمد الحسن",
  "license": {
    "number": "DL-1234567890",
    "type": "private",
    "issuedDate": "2020-01-15",
    "expiryDate": "2030-01-14",
    "issuingAuthority": "Saudi Traffic Department",
    "endorsements": [],
    "restrictions": []
  },
  "medicalCertificate": {
    "isRequired": true,
    "issueDate": "2024-06-01",
    "expiryDate": "2026-05-31"
  },
  "drivingHistory": {
    "yearsOfExperience": 10
  },
  "training": [{
    "name": "Defensive Driving Course",
    "type": "defensive_driving",
    "provider": "Saudi Driving Academy",
    "completedDate": "2024-03-15",
    "score": 95
  }],
  "availability": {
    "isAvailable": true,
    "preferredVehicleTypes": ["sedan", "suv"],
    "maxDailyHours": 8
  }
}
```

### Update Driver Profile
```
PATCH /api/hr/fleet/drivers/:id
```

---

## 3.9 Vehicle Assignments

### Assign Vehicle
```
POST /api/hr/fleet/assignments
```

**Request Body:**
```json
{
  "vehicleId": "veh123",
  "driverId": "emp123",
  "driverName": "Mohammed Al-Hassan",
  "startDate": "2025-01-20",
  "assignmentType": "permanent",
  "purpose": "Daily commute and client visits",
  "dailyKmLimit": 200,
  "personalUseAllowed": false,
  "weekendUseAllowed": false,
  "fuelCardProvided": true,
  "fuelCardNumber": "FC-12345",
  "initialCondition": {
    "exteriorCondition": "excellent",
    "interiorCondition": "excellent",
    "fuelLevel": 100,
    "damages": [],
    "notes": "New vehicle assignment"
  }
}
```

### End Assignment
```
POST /api/hr/fleet/assignments/:id/end
```

**Request Body:**
```json
{
  "endDate": "2025-06-30",
  "endOdometer": 35000,
  "returnCondition": {
    "exteriorCondition": "good",
    "interiorCondition": "good",
    "fuelLevel": 50,
    "newDamages": [],
    "notes": "Normal wear and tear"
  }
}
```

---

# SECTION 4: COMMON PATTERNS

## 4.1 Asset Status Flow

```
Asset Creation: draft → submitted → partially_depreciated → fully_depreciated
                                                        ↓
                                              sold / scrapped
```

## 4.2 Assignment Status Flow

```
New Assignment: assigned → in_use → returned
                      ↓         ↓
                   lost    maintenance
                      ↓         ↓
                  stolen    damaged → retired
```

## 4.3 Vehicle Status Flow

```
active → maintenance → active
      → out_of_service → active
      → reserved → active
      → disposed
```

## 4.4 Multi-tenancy

All records include:
```json
{
  "firmId": "ObjectId (required)",
  "lawyerId": "ObjectId (for solo practitioners)"
}
```

## 4.5 Error Responses

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {}
}
```

**Common Error Codes:**
- VALIDATION_ERROR
- NOT_FOUND
- UNAUTHORIZED
- FORBIDDEN
- DUPLICATE_ENTRY
- INVALID_STATUS_TRANSITION
