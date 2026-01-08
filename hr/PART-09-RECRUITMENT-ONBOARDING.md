# Part 9: Recruitment, Onboarding & Offboarding API Documentation

## Overview

This document covers the complete employee lifecycle APIs from recruitment to offboarding, with full Saudi Labor Law compliance (Articles 53, 75, 77, 80, 84-87, 98-102, 109).

**Base URLs:**
- Recruitment: `/api/hr/recruitment`
- Onboarding: `/api/hr/onboarding`
- Offboarding: `/api/hr/offboarding`

---

# SECTION 1: RECRUITMENT & ATS (نظام تتبع المتقدمين)

## 1.1 Recruitment Statistics

### Get Recruitment Statistics
```
GET /api/hr/recruitment/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalJobs": 25,
    "openJobs": 8,
    "filledJobs": 12,
    "totalApplications": 450,
    "totalHires": 15,
    "totalOpenings": 30,
    "totalFilled": 22,
    "avgTimeToHire": 28,
    "totalRecruitmentCost": 125000
  }
}
```

---

## 1.2 Job Postings CRUD

### List Job Postings
```
GET /api/hr/recruitment/jobs
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | draft, pending_approval, open, on_hold, filled, cancelled, closed |
| departmentId | ObjectId | Filter by department |
| category | string | legal, finance, hr, it, operations, etc. |
| employmentType | string | full_time, part_time, contract, temporary, internship, freelance |
| positionLevel | string | intern, entry, junior, mid, senior, lead, manager, director, vp, c_level, partner |
| priority | string | low, medium, high, urgent |
| search | string | Search in title/description |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |

**Response:**
```json
{
  "success": true,
  "data": [{
    "_id": "job123",
    "jobId": "JOB-2025-0001",
    "title": "Senior Corporate Lawyer",
    "titleAr": "محامي شركات أول",
    "departmentName": "Legal",
    "status": "open",
    "employmentType": "full_time",
    "positionLevel": "senior",
    "workLocation": {
      "type": "onsite",
      "city": "Riyadh",
      "country": "Saudi Arabia"
    },
    "salary": {
      "minSalary": 25000,
      "maxSalary": 35000,
      "currency": "SAR"
    },
    "openings": 2,
    "filled": 0,
    "remaining": 2,
    "applicationDeadline": "2025-03-15T00:00:00.000Z",
    "statistics": {
      "totalApplications": 45,
      "interviewedCandidates": 12,
      "offersExtended": 2
    },
    "daysSincePosted": 14,
    "daysUntilDeadline": 21
  }],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "pages": 2
  }
}
```

### Create Job Posting
```
POST /api/hr/recruitment/jobs
```

**Request Body:**
```json
{
  "title": "Senior Corporate Lawyer",
  "titleAr": "محامي شركات أول",
  "description": "We are seeking an experienced corporate lawyer...",
  "descriptionAr": "نبحث عن محامي شركات ذو خبرة...",
  "departmentId": "dept123",
  "category": "legal",
  "practiceArea": "corporate",
  "positionLevel": "senior",
  "employmentType": "full_time",
  "contractDuration": "permanent",

  "probationPeriod": {
    "duration": 90,
    "isExtendable": true,
    "maxExtension": 90
  },

  "workingHours": {
    "hoursPerWeek": 48,
    "ramadanHoursPerWeek": 36,
    "hoursPerDay": 8,
    "shiftType": "day"
  },

  "workLocation": {
    "type": "onsite",
    "city": "Riyadh",
    "cityAr": "الرياض",
    "country": "Saudi Arabia"
  },

  "nationalityRequirements": {
    "saudiOnly": false,
    "gccAllowed": true,
    "visaSponsorshipAvailable": true
  },

  "educationRequirements": {
    "minimumLevel": "bachelor",
    "fieldOfStudy": ["Law", "Legal Studies"],
    "isRequired": true
  },

  "experienceRequirements": {
    "minimumYears": 5,
    "preferredYears": 8,
    "specificExperience": ["M&A", "Corporate Governance"]
  },

  "skills": [{
    "skillName": "Corporate Law",
    "category": "legal",
    "proficiencyLevel": "expert",
    "isRequired": true,
    "weight": 10
  }, {
    "skillName": "Contract Drafting",
    "category": "legal",
    "proficiencyLevel": "advanced",
    "isRequired": true,
    "weight": 8
  }],

  "languageRequirements": [{
    "language": "Arabic",
    "readingLevel": "native",
    "writingLevel": "native",
    "speakingLevel": "native",
    "isRequired": true
  }, {
    "language": "English",
    "readingLevel": "advanced",
    "writingLevel": "advanced",
    "speakingLevel": "advanced",
    "isRequired": true
  }],

  "legalRequirements": {
    "barAdmission": true,
    "scaLicense": true,
    "courtExperience": ["Commercial Courts", "Administrative Courts"]
  },

  "responsibilities": [{
    "responsibility": "Draft and review corporate contracts",
    "responsibilityAr": "صياغة ومراجعة العقود التجارية",
    "priority": "primary",
    "percentageOfTime": 40
  }],

  "salary": {
    "currency": "SAR",
    "minSalary": 25000,
    "maxSalary": 35000,
    "paymentFrequency": "monthly",
    "includesHousing": true,
    "housingAllowance": 5000,
    "includesTransportation": true,
    "transportationAllowance": 2000,
    "negotiable": true,
    "displaySalary": false
  },

  "benefits": [{
    "benefitType": "health_insurance",
    "benefitName": "Medical Insurance",
    "description": "Comprehensive medical coverage for employee and family"
  }, {
    "benefitType": "annual_leave",
    "benefitName": "Annual Leave",
    "value": "21-30 days per year"
  }],

  "hiringStages": [{
    "stageOrder": 1,
    "stageName": "Initial Screening",
    "stageType": "screening",
    "isRequired": true
  }, {
    "stageOrder": 2,
    "stageName": "Technical Interview",
    "stageType": "technical_interview",
    "duration": 60,
    "isRequired": true
  }, {
    "stageOrder": 3,
    "stageName": "Panel Interview",
    "stageType": "panel_interview",
    "duration": 90,
    "isRequired": true
  }],

  "recruitmentTeam": {
    "hiringManager": {
      "userId": "user123",
      "name": "Ahmed Al-Rashid",
      "email": "ahmed@firm.com"
    },
    "recruiter": {
      "userId": "user456",
      "name": "Sara Mohammed",
      "email": "sara@firm.com"
    }
  },

  "openings": 2,
  "priority": "high",
  "targetHireDate": "2025-04-01",
  "applicationDeadline": "2025-03-15",
  "visibility": "both"
}
```

### Get Single Job Posting
```
GET /api/hr/recruitment/jobs/:id
```

### Update Job Posting
```
PATCH /api/hr/recruitment/jobs/:id
```

### Delete Job Posting
```
DELETE /api/hr/recruitment/jobs/:id
```

---

## 1.3 Job Posting Actions

### Change Job Status
```
POST /api/hr/recruitment/jobs/:id/status
```

**Request Body:**
```json
{
  "status": "open",
  "reason": "Approved by management"
}
```

**Valid Status Transitions:**
- draft → pending_approval, open
- pending_approval → approved, rejected, draft
- open → on_hold, filled, cancelled, closed
- on_hold → open, cancelled
- filled → closed

### Publish Job
```
POST /api/hr/recruitment/jobs/:id/publish
```

**Request Body:**
```json
{
  "channels": ["company_website", "linkedin", "bayt"],
  "scheduledPublishDate": "2025-02-01T09:00:00.000Z"
}
```

### Clone Job Posting
```
POST /api/hr/recruitment/jobs/:id/clone
```

**Response:**
```json
{
  "success": true,
  "message": "Job posting cloned successfully",
  "data": {
    "_id": "newjob456",
    "jobId": "JOB-2025-0002",
    "title": "Senior Corporate Lawyer (Copy)",
    "status": "draft"
  }
}
```

### Get Job Pipeline
```
GET /api/hr/recruitment/jobs/:id/pipeline
```

**Response:**
```json
{
  "success": true,
  "data": {
    "job": {
      "_id": "job123",
      "title": "Senior Corporate Lawyer",
      "openings": 2,
      "filled": 0
    },
    "pipeline": {
      "applied": { "count": 45, "applicants": [...] },
      "screening": { "count": 20, "applicants": [...] },
      "phone_interview": { "count": 12, "applicants": [...] },
      "technical_interview": { "count": 8, "applicants": [...] },
      "panel_interview": { "count": 4, "applicants": [...] },
      "offer": { "count": 2, "applicants": [...] },
      "hired": { "count": 0, "applicants": [] }
    },
    "statistics": {
      "conversionRates": {
        "appliedToScreening": 44.4,
        "screeningToInterview": 60.0,
        "interviewToOffer": 25.0
      }
    }
  }
}
```

### Get Jobs Nearing Deadline
```
GET /api/hr/recruitment/jobs/nearing-deadline
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| days | number | Days threshold (default: 7) |

---

## 1.4 Applicants CRUD

### List Applicants
```
GET /api/hr/recruitment/applicants
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| jobId | ObjectId | Filter by job posting |
| stage | string | applied, screening, phone_interview, technical_interview, etc. |
| status | string | active, rejected, withdrawn, hired |
| source | string | linkedin, bayt, referral, company_website, etc. |
| rating | number | Minimum rating (1-5) |
| search | string | Search in name/email |
| page | number | Page number |
| limit | number | Items per page |

**Response:**
```json
{
  "success": true,
  "data": [{
    "_id": "app123",
    "applicantId": "APP-2025-0045",
    "personalInfo": {
      "firstName": "Mohammed",
      "firstNameAr": "محمد",
      "lastName": "Al-Hassan",
      "lastNameAr": "الحسن",
      "email": "mohammed@email.com",
      "phone": "+966501234567",
      "nationalId": "1234567890",
      "nationality": "Saudi"
    },
    "jobId": "job123",
    "jobTitle": "Senior Corporate Lawyer",
    "currentStage": "technical_interview",
    "status": "active",
    "source": "linkedin",
    "appliedDate": "2025-01-15T10:00:00.000Z",
    "resume": {
      "url": "https://storage.example.com/resumes/resume123.pdf",
      "parsedData": {
        "yearsOfExperience": 7,
        "skills": ["Corporate Law", "M&A", "Contract Drafting"]
      }
    },
    "fitScore": 85,
    "overallRating": 4.2,
    "inTalentPool": false
  }],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

### Create Applicant
```
POST /api/hr/recruitment/applicants
```

**Request Body:**
```json
{
  "jobId": "job123",
  "personalInfo": {
    "firstName": "Mohammed",
    "firstNameAr": "محمد",
    "lastName": "Al-Hassan",
    "lastNameAr": "الحسن",
    "email": "mohammed@email.com",
    "phone": "+966501234567",
    "nationalId": "1234567890",
    "nationality": "Saudi",
    "dateOfBirth": "1990-05-15",
    "gender": "male",
    "currentCity": "Riyadh"
  },
  "source": "linkedin",
  "resume": {
    "url": "https://storage.example.com/resumes/resume123.pdf"
  },
  "coverLetter": "I am writing to express my interest...",
  "education": [{
    "degree": "LLB",
    "institution": "King Saud University",
    "graduationYear": 2013,
    "grade": "Excellent"
  }],
  "experience": [{
    "jobTitle": "Corporate Lawyer",
    "company": "Major Law Firm",
    "startDate": "2015-01-01",
    "endDate": "2024-12-31",
    "responsibilities": ["M&A transactions", "Corporate governance"],
    "isCurrent": false
  }],
  "skills": [{
    "skillName": "Corporate Law",
    "proficiencyLevel": "expert",
    "yearsExperience": 9
  }],
  "certifications": [{
    "name": "SCA License",
    "issuingBody": "Saudi Council of Attorneys",
    "issueDate": "2015-06-01",
    "expiryDate": "2026-06-01"
  }],
  "expectedSalary": {
    "amount": 30000,
    "currency": "SAR"
  },
  "availableStartDate": "2025-03-01",
  "noticePeriod": 30
}
```

### Get Single Applicant
```
GET /api/hr/recruitment/applicants/:id
```

### Update Applicant
```
PATCH /api/hr/recruitment/applicants/:id
```

### Delete Applicant
```
DELETE /api/hr/recruitment/applicants/:id
```

---

## 1.5 Applicant Pipeline Actions

### Update Applicant Stage
```
POST /api/hr/recruitment/applicants/:id/stage
```

**Request Body:**
```json
{
  "stage": "technical_interview",
  "notes": "Passed phone screening with excellent communication"
}
```

**Valid Stages:**
- applied
- screening
- phone_interview
- technical_interview
- hr_interview
- panel_interview
- assessment
- background_check
- reference_check
- offer
- negotiation
- hired

### Reject Applicant
```
POST /api/hr/recruitment/applicants/:id/reject
```

**Request Body:**
```json
{
  "reason": "insufficient_experience",
  "reasonCategory": "qualifications",
  "notes": "Candidate has only 2 years experience, we need minimum 5",
  "sendRejectionEmail": true,
  "addToTalentPool": true,
  "talentPoolNotes": "Good candidate for junior positions in future"
}
```

**Rejection Reason Categories:**
- qualifications
- experience
- skills
- culture_fit
- salary_expectations
- availability
- background_check
- candidate_withdrew
- position_filled
- other

### Hire Applicant
```
POST /api/hr/recruitment/applicants/:id/hire
```

**Request Body:**
```json
{
  "hireDate": "2025-03-01",
  "startDate": "2025-03-15",
  "acceptedSalary": 32000,
  "department": "Legal",
  "reportingTo": "user789",
  "createOnboarding": true,
  "notes": "Negotiated salary increase from initial offer"
}
```

---

## 1.6 Talent Pool

### Get Talent Pool
```
GET /api/hr/recruitment/talent-pool
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| skills | string | Comma-separated skills to filter |
| category | string | Job category preference |
| minRating | number | Minimum rating |
| page | number | Page number |
| limit | number | Items per page |

### Update Talent Pool Status
```
PATCH /api/hr/recruitment/applicants/:id/talent-pool
```

**Request Body:**
```json
{
  "inTalentPool": true,
  "talentPoolCategory": "future_consideration",
  "preferredRoles": ["Junior Lawyer", "Legal Associate"],
  "notes": "Strong potential, needs more experience"
}
```

---

## 1.7 Interviews

### Schedule Interview
```
POST /api/hr/recruitment/applicants/:id/interviews
```

**Request Body:**
```json
{
  "interviewType": "technical_interview",
  "scheduledDate": "2025-02-10T10:00:00.000Z",
  "duration": 60,
  "location": {
    "type": "in_person",
    "address": "Main Office, Conference Room A"
  },
  "interviewers": [{
    "userId": "user789",
    "name": "Ahmed Al-Rashid",
    "role": "Lead Interviewer"
  }],
  "agenda": "Technical assessment focusing on corporate law expertise",
  "sendCalendarInvite": true,
  "sendCandidateReminder": true,
  "reminderTime": 24
}
```

### Update Interview
```
PATCH /api/hr/recruitment/applicants/:id/interviews/:interviewId
```

**Request Body:**
```json
{
  "scheduledDate": "2025-02-11T14:00:00.000Z",
  "status": "rescheduled",
  "rescheduleReason": "Interviewer conflict"
}
```

### Submit Interview Feedback
```
POST /api/hr/recruitment/applicants/:id/interviews/:interviewId/feedback
```

**Request Body:**
```json
{
  "interviewerId": "user789",
  "overallRating": 4,
  "recommendation": "strong_hire",
  "scorecard": [{
    "criterion": "Technical Knowledge",
    "score": 4,
    "maxScore": 5,
    "comments": "Strong understanding of corporate law"
  }, {
    "criterion": "Communication",
    "score": 5,
    "maxScore": 5,
    "comments": "Excellent communication skills"
  }, {
    "criterion": "Problem Solving",
    "score": 4,
    "maxScore": 5,
    "comments": "Good analytical approach"
  }],
  "strengths": ["Deep corporate law knowledge", "Excellent presentation skills"],
  "concerns": ["Limited M&A experience"],
  "questions": [{
    "question": "Describe a complex M&A transaction you handled",
    "response": "Handled $50M acquisition for tech company...",
    "rating": 4
  }],
  "cultureFitRating": 4,
  "notes": "Highly recommended for the position"
}
```

**Recommendation Options:**
- strong_hire
- hire
- lean_hire
- lean_no_hire
- no_hire
- strong_no_hire

---

## 1.8 Assessments

### Send Assessment
```
POST /api/hr/recruitment/applicants/:id/assessments
```

**Request Body:**
```json
{
  "assessmentType": "technical_test",
  "assessmentName": "Corporate Law Assessment",
  "provider": "internal",
  "duration": 90,
  "passingScore": 70,
  "maxScore": 100,
  "dueDate": "2025-02-15T23:59:59.000Z",
  "instructions": "Complete all questions. You have 90 minutes.",
  "assessmentUrl": "https://assessments.example.com/test123",
  "sendInviteEmail": true
}
```

### Update Assessment Result
```
PATCH /api/hr/recruitment/applicants/:id/assessments/:assessmentId
```

**Request Body:**
```json
{
  "status": "completed",
  "score": 85,
  "passed": true,
  "completedDate": "2025-02-14T15:30:00.000Z",
  "reportUrl": "https://assessments.example.com/reports/123",
  "breakdown": [{
    "section": "Contract Law",
    "score": 90,
    "maxScore": 100
  }, {
    "section": "Corporate Governance",
    "score": 80,
    "maxScore": 100
  }],
  "notes": "Strong performance overall"
}
```

---

## 1.9 Offers

### Create Offer
```
POST /api/hr/recruitment/applicants/:id/offers
```

**Request Body:**
```json
{
  "offerType": "formal",
  "positionTitle": "Senior Corporate Lawyer",
  "department": "Legal",
  "reportingTo": {
    "userId": "user789",
    "name": "Ahmed Al-Rashid"
  },
  "startDate": "2025-03-15",
  "employmentType": "full_time",
  "contractType": "indefinite",
  "probationPeriod": 90,
  "compensation": {
    "basicSalary": 25000,
    "currency": "SAR",
    "housingAllowance": 5000,
    "transportationAllowance": 2000,
    "otherAllowances": [{
      "name": "Phone Allowance",
      "amount": 500
    }],
    "totalMonthly": 32500,
    "annualBonus": {
      "eligible": true,
      "targetPercentage": 10
    }
  },
  "benefits": [
    "Medical Insurance (Family Coverage)",
    "21 Days Annual Leave",
    "Annual Air Ticket"
  ],
  "workSchedule": {
    "hoursPerWeek": 48,
    "daysPerWeek": 5,
    "workLocation": "Riyadh Head Office"
  },
  "validUntil": "2025-02-28",
  "sendOfferLetter": true,
  "requiresApproval": true,
  "approvers": ["user111", "user222"]
}
```

### Update Offer
```
PATCH /api/hr/recruitment/applicants/:id/offers/:offerId
```

**Request Body:**
```json
{
  "status": "accepted",
  "acceptedDate": "2025-02-20",
  "negotiatedSalary": 33000,
  "negotiationNotes": "Increased base salary by 2000 SAR",
  "signedOfferUrl": "https://storage.example.com/offers/signed123.pdf"
}
```

**Offer Status Flow:**
- draft → sent
- sent → accepted, rejected, expired, negotiating
- negotiating → revised, accepted, rejected
- revised → accepted, rejected
- accepted → (hire applicant)

---

## 1.10 Reference & Background Checks

### Add Reference
```
POST /api/hr/recruitment/applicants/:id/references
```

**Request Body:**
```json
{
  "referenceName": "Dr. Khalid Al-Otaibi",
  "relationship": "former_supervisor",
  "company": "Previous Law Firm",
  "position": "Managing Partner",
  "phone": "+966509876543",
  "email": "khalid@previousfirm.com",
  "yearsKnown": 5
}
```

### Update Reference Check
```
PATCH /api/hr/recruitment/applicants/:id/references/:referenceId
```

**Request Body:**
```json
{
  "status": "completed",
  "contactedDate": "2025-02-18",
  "contactMethod": "phone",
  "verificationResults": {
    "employmentVerified": true,
    "datesVerified": true,
    "titleVerified": true,
    "performanceRating": "excellent",
    "wouldRehire": true,
    "strengthsNoted": ["Technical expertise", "Leadership"],
    "concernsNoted": []
  },
  "overallRating": 5,
  "notes": "Excellent reference, highly recommended the candidate"
}
```

### Initiate Background Check
```
POST /api/hr/recruitment/applicants/:id/background-check
```

**Request Body:**
```json
{
  "checkType": "comprehensive",
  "provider": "internal",
  "checksRequested": [
    "criminal_record",
    "education_verification",
    "employment_verification",
    "credit_check",
    "professional_license"
  ],
  "consentReceived": true,
  "consentDate": "2025-02-15"
}
```

### Update Background Check
```
PATCH /api/hr/recruitment/applicants/:id/background-check
```

**Request Body:**
```json
{
  "status": "completed",
  "completedDate": "2025-02-22",
  "results": {
    "criminal_record": {
      "status": "clear",
      "notes": "No criminal record found"
    },
    "education_verification": {
      "status": "verified",
      "notes": "LLB from King Saud University confirmed"
    },
    "employment_verification": {
      "status": "verified",
      "notes": "Employment history verified"
    },
    "professional_license": {
      "status": "verified",
      "notes": "SCA License #12345 valid until 2026"
    }
  },
  "overallResult": "passed",
  "reportUrl": "https://storage.example.com/bgchecks/report123.pdf"
}
```

---

## 1.11 Bulk Operations

### Bulk Update Stage
```
POST /api/hr/recruitment/applicants/bulk-stage-update
```

**Request Body:**
```json
{
  "applicantIds": ["app123", "app456", "app789"],
  "stage": "screening",
  "notes": "Moving to screening phase"
}
```

### Bulk Reject
```
POST /api/hr/recruitment/applicants/bulk-reject
```

**Request Body:**
```json
{
  "applicantIds": ["app111", "app222"],
  "reason": "position_filled",
  "sendRejectionEmail": true
}
```

### Bulk Delete
```
POST /api/hr/recruitment/applicants/bulk-delete
```

**Request Body:**
```json
{
  "applicantIds": ["app333", "app444"]
}
```

---

# SECTION 2: ONBOARDING (التأهيل والإعداد الوظيفي)

## 2.1 Onboarding Statistics

### Get Onboarding Statistics
```
GET /api/hr/onboarding/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalOnboardings": 45,
    "byStatus": [
      { "status": "pending", "count": 5 },
      { "status": "in_progress", "count": 12 },
      { "status": "completed", "count": 25 },
      { "status": "on_hold", "count": 2 },
      { "status": "cancelled", "count": 1 }
    ],
    "byProbationStatus": [
      { "status": "active", "count": 15 },
      { "status": "passed", "count": 28 },
      { "status": "failed", "count": 2 }
    ],
    "averageCompletionRate": 78,
    "overdueOnboardings": 3,
    "upcomingProbationReviews": 8,
    "thisMonth": {
      "started": 4,
      "completed": 6,
      "cancelled": 0
    }
  }
}
```

### Get Upcoming Probation Reviews
```
GET /api/hr/onboarding/upcoming-reviews
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| days | number | Days ahead to look (default: 30) |

---

## 2.2 Onboarding CRUD

### List Onboardings
```
GET /api/hr/onboarding
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | pending, in_progress, completed, on_hold, cancelled |
| probationStatus | string | active, passed, failed |
| departmentId | ObjectId | Filter by department |
| managerId | ObjectId | Filter by manager |
| startDateFrom | date | Start date range from |
| startDateTo | date | Start date range to |
| search | string | Search in employee name |
| page | number | Page number |
| limit | number | Items per page |

**Response:**
```json
{
  "success": true,
  "data": [{
    "_id": "onb123",
    "onboardingId": "ONB-2025-001",
    "employeeId": {
      "_id": "emp123",
      "employeeId": "EMP-2025-001",
      "personalInfo": {
        "fullNameEnglish": "Mohammed Al-Hassan",
        "fullNameArabic": "محمد الحسن"
      }
    },
    "employeeName": "Mohammed Al-Hassan",
    "jobTitle": "Senior Corporate Lawyer",
    "department": "Legal",
    "startDate": "2025-03-15",
    "status": "in_progress",
    "probation": {
      "probationPeriod": 90,
      "probationStartDate": "2025-03-15",
      "probationEndDate": "2025-06-13",
      "onProbation": true,
      "probationStatus": "active"
    },
    "completion": {
      "tasksCompleted": 15,
      "tasksTotal": 25,
      "completionPercentage": 60
    }
  }],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "pages": 1
  }
}
```

### Create Onboarding
```
POST /api/hr/onboarding
```

**Request Body:**
```json
{
  "employeeId": "emp123",
  "employeeName": "Mohammed Al-Hassan",
  "employeeNameAr": "محمد الحسن",
  "email": "mohammed@firm.com",
  "phone": "+966501234567",
  "jobTitle": "Senior Corporate Lawyer",
  "jobTitleAr": "محامي شركات أول",
  "department": "Legal",
  "location": "Riyadh Head Office",
  "employmentType": "full_time",
  "contractType": "indefinite",
  "hireDate": "2025-03-15",
  "startDate": "2025-03-15",

  "managerId": "user789",
  "managerName": "Ahmed Al-Rashid",
  "managerEmail": "ahmed@firm.com",

  "probation": {
    "probationPeriod": 90,
    "onProbation": true
  },

  "preBoarding": {
    "documentsCollection": {
      "documentsRequired": [{
        "documentType": "national_id",
        "documentName": "National ID Copy",
        "required": true
      }, {
        "documentType": "degree",
        "documentName": "Law Degree Certificate",
        "required": true
      }, {
        "documentType": "bar_admission",
        "documentName": "SCA License",
        "required": true
      }]
    }
  },

  "onboardingChecklist": {
    "categories": [{
      "categoryName": "IT Setup",
      "tasks": [{
        "taskName": "Create email account",
        "responsible": "it",
        "priority": "high"
      }, {
        "taskName": "Setup workstation",
        "responsible": "it",
        "priority": "high"
      }]
    }, {
      "categoryName": "HR Tasks",
      "tasks": [{
        "taskName": "Complete employment contract",
        "responsible": "hr",
        "priority": "critical"
      }, {
        "taskName": "GOSI registration",
        "responsible": "hr",
        "priority": "high"
      }]
    }]
  }
}
```

### Get Single Onboarding
```
GET /api/hr/onboarding/:onboardingId
```

### Get Onboarding by Employee
```
GET /api/hr/onboarding/by-employee/:employeeId
```

### Update Onboarding
```
PATCH /api/hr/onboarding/:onboardingId
```

### Delete Onboarding
```
DELETE /api/hr/onboarding/:onboardingId
```

---

## 2.3 Status & Completion

### Update Status
```
PATCH /api/hr/onboarding/:onboardingId/status
```

**Request Body:**
```json
{
  "status": "in_progress",
  "notes": "Employee started, onboarding in progress"
}
```

### Complete Onboarding
```
POST /api/hr/onboarding/:onboardingId/complete
```

**Request Body:**
```json
{
  "completionNotes": "All tasks completed successfully",
  "overallAssessment": "Excellent onboarding experience",
  "readyForFullRole": true,
  "handoffToManager": true
}
```

---

## 2.4 Phase Completion

### Complete First Day
```
POST /api/hr/onboarding/:onboardingId/complete-first-day
```

**Request Body:**
```json
{
  "completedTasks": [
    "orientation",
    "id_badge",
    "workstation_setup",
    "team_introduction"
  ],
  "firstDayFeedback": {
    "rating": 4,
    "experience": "Very welcoming environment",
    "challenges": "Information overload",
    "suggestions": "More breaks between sessions"
  }
}
```

### Complete First Week
```
POST /api/hr/onboarding/:onboardingId/complete-first-week
```

**Request Body:**
```json
{
  "policiesReviewed": true,
  "laborLawTrainingCompleted": true,
  "systemsTrainingCompleted": true,
  "goalsSet": true,
  "buddyAssigned": true,
  "weeklyCheckInConducted": true,
  "employeeFeedback": {
    "howIsItGoing": "Getting comfortable with the role",
    "challenges": "Learning the case management system",
    "support": "Need more time with buddy"
  }
}
```

### Complete First Month
```
POST /api/hr/onboarding/:onboardingId/complete-first-month
```

**Request Body:**
```json
{
  "weeklyCheckInsCompleted": 4,
  "roleSpecificTrainingCompleted": true,
  "initialFeedback": {
    "overallRating": 4,
    "strengths": ["Quick learner", "Good team player"],
    "areasForImprovement": ["Case management system proficiency"],
    "developmentPlan": [{
      "area": "Case Management",
      "action": "Complete advanced training",
      "timeline": "Next 30 days"
    }]
  }
}
```

---

## 2.5 Task Management

### Complete Task
```
POST /api/hr/onboarding/:onboardingId/tasks/:taskId/complete
```

**Request Body:**
```json
{
  "completedBy": "user123",
  "notes": "Task completed successfully",
  "attachments": ["https://storage.example.com/docs/task-evidence.pdf"]
}
```

---

## 2.6 Probation Reviews (Saudi Labor Law Article 53)

**Important:** Saudi Labor Law Article 53 allows maximum 180 days probation with NO extension.

### Add Probation Review
```
POST /api/hr/onboarding/:onboardingId/probation-reviews
```

**Request Body:**
```json
{
  "reviewType": "30_day",
  "reviewDay": 30,
  "scheduledDate": "2025-04-14",
  "performanceAssessment": {
    "workQuality": 4,
    "productivity": 4,
    "reliability": 5,
    "teamwork": 4,
    "communication": 4,
    "initiative": 3,
    "adaptability": 4,
    "professionalism": 5,
    "overallRating": 4
  },
  "competencyRatings": [{
    "competency": "Legal Research",
    "rating": 4,
    "comments": "Strong research skills"
  }, {
    "competency": "Client Communication",
    "rating": 4,
    "comments": "Professional and clear"
  }],
  "goalsProgress": [{
    "goalName": "Complete system training",
    "achievementPercentage": 80,
    "onTrack": true
  }],
  "strengths": ["Quick learner", "Professional demeanor"],
  "areasForImprovement": ["Time management on complex cases"],
  "recommendation": "on_track",
  "recommendationReason": "Meeting all expectations",
  "actionItems": [{
    "action": "Provide time management training",
    "owner": "Manager",
    "dueDate": "2025-04-30"
  }],
  "nextReviewDate": "2025-05-14"
}
```

**Recommendation Options:**
- on_track
- needs_improvement
- at_risk
- recommend_confirmation
- recommend_termination

### Complete Probation
```
POST /api/hr/onboarding/:onboardingId/complete-probation
```

**Request Body:**
```json
{
  "decision": "confirm",
  "decisionReason": "Excellent performance throughout probation period",
  "finalAssessment": {
    "technicalCompetence": 4,
    "jobKnowledge": 4,
    "workQuality": 5,
    "productivity": 4,
    "reliability": 5,
    "teamwork": 4,
    "communication": 4,
    "professionalism": 5,
    "culturalFit": 5,
    "overallRating": 4
  },
  "keyAchievements": [
    "Successfully handled 3 corporate transactions",
    "Excellent client feedback"
  ],
  "confirmation": {
    "confirmationDate": "2025-06-13",
    "salaryReview": {
      "salaryAdjusted": true,
      "newSalary": 27000,
      "adjustmentPercentage": 8,
      "effectiveDate": "2025-06-14"
    },
    "benefitsActivation": {
      "date": "2025-06-14",
      "benefits": ["Enhanced medical coverage", "Annual bonus eligibility"]
    }
  },
  "issueConfirmationLetter": true
}
```

**Decision Options:**
- confirm - Employee passes probation
- terminate - Employee fails probation (Saudi Labor Law allows termination during probation without compensation)

---

## 2.7 Documents

### Upload Document
```
POST /api/hr/onboarding/:onboardingId/documents
Content-Type: multipart/form-data
```

**Form Fields:**
| Field | Type | Description |
|-------|------|-------------|
| file | file | Document file |
| documentType | string | contract, handbook_acknowledgment, policy_acknowledgment, etc. |
| documentName | string | Document name |
| required | boolean | Is document required |

### Verify Document
```
POST /api/hr/onboarding/:onboardingId/documents/:type/verify
```

**Request Body:**
```json
{
  "verified": true,
  "verificationNotes": "Document verified and accepted"
}
```

---

## 2.8 Checklist Management

### Add Checklist Category
```
POST /api/hr/onboarding/:onboardingId/checklist/categories
```

**Request Body:**
```json
{
  "categoryName": "Department Orientation",
  "categoryNameAr": "التوجيه القسمي"
}
```

### Add Checklist Task
```
POST /api/hr/onboarding/:onboardingId/checklist/categories/:categoryId/tasks
```

**Request Body:**
```json
{
  "taskName": "Meet department colleagues",
  "taskNameAr": "لقاء زملاء القسم",
  "responsible": "manager",
  "dueDate": "2025-03-20",
  "priority": "medium"
}
```

---

## 2.9 Employee Feedback

### Add Employee Feedback
```
POST /api/hr/onboarding/:onboardingId/feedback
```

**Request Body:**
```json
{
  "sessionType": "first_week",
  "overallSatisfaction": 4,
  "experienceRatings": {
    "preboarding": 4,
    "firstDay": 5,
    "training": 4,
    "managerSupport": 5,
    "teamIntegration": 4,
    "resources": 4,
    "clarity": 4
  },
  "positiveAspects": "Very welcoming team and clear expectations",
  "challenges": "Information overload in first few days",
  "suggestions": "Spread training over more days",
  "wouldRecommend": true
}
```

---

# SECTION 3: OFFBOARDING (إنهاء الخدمة والمغادرة)

## 3.1 Offboarding Statistics

### Get Offboarding Statistics
```
GET /api/hr/offboarding/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalOffboardings": 28,
    "byStatus": [
      { "status": "initiated", "count": 3 },
      { "status": "in_progress", "count": 5 },
      { "status": "clearance_pending", "count": 4 },
      { "status": "completed", "count": 15 },
      { "status": "cancelled", "count": 1 }
    ],
    "byExitType": [
      { "exitType": "resignation", "count": 18 },
      { "exitType": "termination", "count": 5 },
      { "exitType": "contract_end", "count": 3 },
      { "exitType": "retirement", "count": 2 }
    ],
    "pendingClearances": 4,
    "pendingSettlements": 3,
    "thisMonth": {
      "initiated": 2,
      "completed": 4,
      "cancelled": 0
    },
    "averageProcessingDays": 21
  }
}
```

### Get Pending Clearances
```
GET /api/hr/offboarding/pending-clearances
```

### Get Pending Settlements
```
GET /api/hr/offboarding/pending-settlements
```

---

## 3.2 Offboarding CRUD

### List Offboardings
```
GET /api/hr/offboarding
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | initiated, in_progress, clearance_pending, completed, cancelled |
| exitType | string | resignation, termination, contract_end, retirement, death, mutual_agreement, medical |
| exitCategory | string | voluntary, involuntary |
| departmentId | ObjectId | Filter by department |
| lastWorkingDayFrom | date | Last working day from |
| lastWorkingDayTo | date | Last working day to |
| search | string | Search in employee name |
| page | number | Page number |
| limit | number | Items per page |

### Create Offboarding
```
POST /api/hr/offboarding
```

**Request Body:**
```json
{
  "employeeId": "emp456",
  "employeeName": "Khalid Al-Fahad",
  "employeeNameAr": "خالد الفهد",
  "nationalId": "1098765432",
  "email": "khalid@firm.com",
  "department": "Legal",
  "jobTitle": "Associate Lawyer",
  "hireDate": "2020-01-15",

  "exitType": "resignation",

  "dates": {
    "noticeDate": "2025-02-01",
    "lastWorkingDay": "2025-03-02"
  },

  "noticePeriod": {
    "requiredDays": 30
  },

  "resignation": {
    "resignationDate": "2025-02-01",
    "resignationLetter": {
      "submitted": true,
      "submittedDate": "2025-02-01"
    },
    "resignationReasonCategory": "better_opportunity",
    "resignationReason": "Received offer from international firm"
  },

  "exitInterview": {
    "required": true
  },

  "clearance": {
    "required": true,
    "itemsToReturn": [{
      "itemType": "laptop",
      "itemDescription": "MacBook Pro 16\"",
      "serialNumber": "C02XL1234567"
    }, {
      "itemType": "id_badge",
      "itemDescription": "Employee ID Badge"
    }, {
      "itemType": "access_card",
      "itemDescription": "Building Access Card"
    }]
  },

  "knowledgeTransfer": {
    "required": true
  }
}
```

### Get Single Offboarding
```
GET /api/hr/offboarding/:offboardingId
```

### Get Offboarding by Employee
```
GET /api/hr/offboarding/by-employee/:employeeId
```

### Update Offboarding
```
PATCH /api/hr/offboarding/:offboardingId
```

### Delete Offboarding
```
DELETE /api/hr/offboarding/:offboardingId
```

---

## 3.3 Status Management

### Update Status
```
PATCH /api/hr/offboarding/:offboardingId/status
```

**Request Body:**
```json
{
  "status": "clearance_pending",
  "notes": "Exit interview completed, starting clearance process"
}
```

### Complete Offboarding
```
POST /api/hr/offboarding/:offboardingId/complete
```

**Request Body:**
```json
{
  "completionNotes": "All clearances obtained, settlement paid",
  "finalApproval": {
    "approved": true,
    "approvalDate": "2025-03-05"
  }
}
```

---

## 3.4 Exit Interview

### Complete Exit Interview
```
POST /api/hr/offboarding/:offboardingId/exit-interview
```

**Request Body:**
```json
{
  "conductedDate": "2025-02-25",
  "interviewMethod": "in_person",
  "responses": {
    "primaryReasonCategory": "better_opportunity",
    "primaryReason": "Career advancement opportunity",
    "detailedReason": "Received offer with senior position and higher compensation",

    "ratings": {
      "overallSatisfaction": 4,
      "jobRole": 4,
      "compensation": 3,
      "benefits": 4,
      "workLifeBalance": 4,
      "careerDevelopment": 3,
      "training": 4,
      "management": 4,
      "teamwork": 5,
      "workEnvironment": 4,
      "facilities": 4,
      "recognition": 3
    },

    "whatYouLikedMost": "Great team and learning environment",
    "whatCouldBeImproved": "Career progression path and compensation reviews",

    "managerRelationship": {
      "rating": 4,
      "feedback": "Supportive manager, good mentorship"
    },

    "compensationAndBenefits": {
      "competitive": false,
      "feedback": "Below market rate for similar positions"
    },

    "suggestions": "Implement regular market salary benchmarking",
    "wouldRecommendCompany": true,
    "wouldConsiderReturning": true
  },

  "keyInsights": [
    "Compensation competitiveness concern",
    "Limited career advancement opportunities"
  ],

  "actionItems": [{
    "action": "Review compensation structure for legal team",
    "category": "retention",
    "priority": "high",
    "assignedTo": "HR Director"
  }]
}
```

---

## 3.5 Clearance Process

### Add Clearance Item
```
POST /api/hr/offboarding/:offboardingId/clearance/items
```

**Request Body:**
```json
{
  "itemType": "laptop",
  "itemDescription": "Dell XPS 15 Laptop",
  "serialNumber": "DELL-XPS-12345",
  "assetId": "ASSET-001"
}
```

### Update Clearance Item
```
PATCH /api/hr/offboarding/:offboardingId/clearance/items/:itemId
```

**Request Body:**
```json
{
  "returned": true,
  "returnedDate": "2025-03-02",
  "returnedTo": "IT Department",
  "condition": "good"
}
```

### Complete Clearance Section
```
POST /api/hr/offboarding/:offboardingId/clearance/:section/complete
```

**Valid Sections:**
- itClearance
- financeClearance
- hrClearance
- departmentClearance
- managerClearance

**Request Body:**
```json
{
  "cleared": true,
  "notes": "All IT equipment returned and accounts deactivated",
  "outstandingAmount": 0
}
```

---

## 3.6 Final Settlement (Saudi Labor Law Articles 84-87)

### Calculate Final Settlement
```
POST /api/hr/offboarding/:offboardingId/calculate-settlement
```

**Request Body:**
```json
{
  "lastBasicSalary": 20000,
  "lastGrossSalary": 25000,
  "includeItems": {
    "outstandingSalary": true,
    "unusedAnnualLeave": true,
    "eosb": true,
    "unpaidOvertime": false,
    "unpaidBonuses": false
  },
  "deductions": {
    "outstandingLoans": [{
      "loanId": "LOAN-001",
      "loanType": "Personal Loan",
      "remainingBalance": 5000
    }],
    "noticeShortfall": {
      "applicable": false
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "calculationBase": {
      "lastBasicSalary": 20000,
      "dailyWage": 666.67,
      "serviceYears": 5,
      "serviceMonths": 1,
      "totalServiceMonths": 61
    },
    "earnings": {
      "outstandingSalary": {
        "applicable": true,
        "unpaidDays": 2,
        "amount": 1333.34
      },
      "unusedAnnualLeave": {
        "applicable": true,
        "totalUnusedDays": 12,
        "dailyRate": 666.67,
        "amount": 8000.04
      },
      "eosb": {
        "applicable": true,
        "calculation": {
          "years1to5": {
            "years": 5,
            "rate": 0.5,
            "amount": 50000
          },
          "yearsOver5": {
            "years": 0,
            "rate": 1.0,
            "amount": 0
          },
          "totalEOSB": 50000
        },
        "resignationAdjustment": {
          "exitType": "resignation",
          "serviceYears": 5.08,
          "entitlementPercentage": 66.67,
          "fullEOSB": 50000,
          "adjustedEOSB": 33335
        },
        "finalEOSB": 33335
      },
      "totalEarnings": 42668.38
    },
    "deductions": {
      "outstandingLoans": {
        "applicable": true,
        "totalLoansDeduction": 5000
      },
      "totalDeductions": 5000
    },
    "netSettlement": {
      "grossAmount": 42668.38,
      "totalDeductions": 5000,
      "netPayable": 37668.38,
      "netPayableInWords": "Thirty-seven thousand six hundred sixty-eight Saudi Riyals and thirty-eight Halalas"
    }
  }
}
```

### EOSB Calculation Rules (Articles 84-87)

**For Years 1-5:**
- Rate: 0.5 month salary per year

**For Years 5+:**
- Rate: 1.0 month salary per year

**Resignation Adjustments (Article 87):**
| Service Years | EOSB Entitlement |
|--------------|------------------|
| < 2 years | 0% |
| 2-5 years | 33.33% |
| 5-10 years | 66.67% |
| 10+ years | 100% |

**Article 80 - Immediate Termination (No EOSB):**
- Assault on employer/colleagues
- Failure to perform essential duties
- Violation of work instructions
- Misconduct/dishonesty
- Intentional damage
- Unauthorized absence (20+ days/year or 10+ consecutive days)
- Disclosure of confidential information

### Approve Settlement
```
POST /api/hr/offboarding/:offboardingId/approve-settlement
```

**Request Body:**
```json
{
  "approved": true,
  "comments": "Settlement calculation verified and approved"
}
```

### Process Payment
```
POST /api/hr/offboarding/:offboardingId/process-payment
```

**Request Body:**
```json
{
  "paymentMethod": "bank_transfer",
  "bankDetails": {
    "bankName": "Al Rajhi Bank",
    "iban": "SA1234567890123456789012",
    "accountNumber": "1234567890"
  },
  "paymentDate": "2025-03-05",
  "paymentReference": "PAY-2025-0045"
}
```

---

## 3.7 Final Documents

### Issue Experience Certificate
```
POST /api/hr/offboarding/:offboardingId/issue-experience-certificate
```

**Request Body:**
```json
{
  "certificateContent": {
    "jobDescription": "Handled corporate transactions, contract drafting, and legal advisory",
    "skills": ["Corporate Law", "Contract Negotiation", "Legal Research"],
    "goodConduct": true,
    "reasonForLeaving": "Resignation"
  },
  "generateArabic": true,
  "generateEnglish": true,
  "includeOfficialStamp": true,
  "deliveryMethod": "email"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Experience certificate issued",
  "data": {
    "certificateNumber": "EXP-2025-0045",
    "arabicVersion": {
      "generated": true,
      "certificateUrl": "https://storage.example.com/certs/exp-2025-0045-ar.pdf"
    },
    "englishVersion": {
      "generated": true,
      "certificateUrl": "https://storage.example.com/certs/exp-2025-0045-en.pdf"
    }
  }
}
```

---

## 3.8 Rehire Eligibility

### Update Rehire Eligibility
```
PATCH /api/hr/offboarding/:offboardingId/rehire-eligibility
```

**Request Body:**
```json
{
  "eligible": true,
  "eligibilityCategory": "eligible",
  "eligibilityReason": "Good performance, left on good terms",
  "notes": "Would be a strong rehire candidate",
  "coolingOffPeriod": {
    "required": false
  }
}
```

**Eligibility Categories:**
- eligible - Can be rehired
- not_eligible - Cannot be rehired
- conditional - Can be rehired under certain conditions
- blacklisted - Permanently barred from rehire

---

## 3.9 Bulk Operations

### Bulk Delete Offboardings
```
POST /api/hr/offboarding/bulk-delete
```

**Request Body:**
```json
{
  "offboardingIds": ["off123", "off456"]
}
```

---

# SECTION 4: COMMON PATTERNS

## 4.1 Multi-tenancy

All records include:
```json
{
  "firmId": "ObjectId (required)",
  "lawyerId": "ObjectId (for solo practitioners)"
}
```

## 4.2 Audit Fields

All records include:
```json
{
  "createdBy": "ObjectId",
  "lastModifiedBy": "ObjectId",
  "createdAt": "ISO Date",
  "updatedAt": "ISO Date"
}
```

## 4.3 Status Flows

### Recruitment Status Flow
```
draft → pending_approval → open → filled/closed/cancelled
                               → on_hold → open/cancelled
```

### Onboarding Status Flow
```
pending → in_progress → completed
                     → on_hold → in_progress
                     → cancelled
```

### Offboarding Status Flow
```
initiated → in_progress → clearance_pending → completed
                                           → cancelled
```

## 4.4 Saudi Labor Law Key Articles Reference

| Article | Topic | Application |
|---------|-------|-------------|
| 53 | Probation | Max 90 days, extendable once to 180 days total |
| 75 | Notice Period | 30 days (hourly), 60 days (monthly salary) |
| 77 | Termination Notice | Written notice required |
| 80 | Immediate Termination | Valid grounds for immediate dismissal |
| 84 | EOSB Eligibility | All employees entitled after probation |
| 85 | EOSB Calculation 1-5 years | Half month per year |
| 86 | EOSB Calculation 5+ years | Full month per year |
| 87 | Resignation EOSB Adjustment | Varies by service length |
| 98-108 | Working Hours | 48 hours/week, 36 during Ramadan |
| 109 | Unused Leave | Must be paid on termination |

---

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
- VALIDATION_ERROR - Invalid request data
- NOT_FOUND - Resource not found
- UNAUTHORIZED - Authentication required
- FORBIDDEN - Permission denied
- DUPLICATE_ENTRY - Duplicate record
- INVALID_STATUS_TRANSITION - Invalid status change
- BUSINESS_RULE_VIOLATION - Business logic error
