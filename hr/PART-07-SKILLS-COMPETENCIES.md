# HR API Documentation - Part 7: Skills & Competencies

## Overview

This document covers Skills and Competency Management APIs including:
- SFIA 7-Level Proficiency Framework
- Skill Types (Hierarchical Categories)
- Skills (Technical, Legal, Language, Software, etc.)
- Competencies (Core, Leadership, Behavioral, Functional)
- Skill Assessments (360-Degree)
- Certification & CPD Tracking
- Skill Matrix & Gap Analysis
- Verification & Endorsements

**Industry Standards Applied:**
- SFIA Framework (Skills Framework for the Information Age)
- Odoo HR Skills Hierarchy
- SAP SuccessFactors Competency Matrix
- Workday Skills Cloud

---

## Table of Contents

1. [SFIA Framework](#1-sfia-7-level-proficiency-framework)
2. [Skill Types](#2-skill-types)
3. [Skills](#3-skills)
4. [Competencies](#4-competencies)
5. [Skill Assessments](#5-skill-assessments)
6. [Certification & CPD](#6-certification--cpd)
7. [Skill Matrix](#7-skill-matrix)
8. [Gap Analysis](#8-gap-analysis)
9. [Employee Skills](#9-employee-skills)
10. [Verification & Endorsements](#10-verification--endorsements)

---

## Base URL

```
/api/hr/skills
```

---

## 1. SFIA 7-Level Proficiency Framework

### SFIA Levels Reference

| Level | Code | Name | Arabic | Description |
|-------|------|------|--------|-------------|
| 1 | Follow | Follow | متابع | Works under close direction, uses little discretion |
| 2 | Assist | Assist | مساعد | Works under routine direction, limited discretion |
| 3 | Apply | Apply | تطبيق | Works under general direction, uses discretion for complex issues |
| 4 | Enable | Enable | تمكين | Works under general guidance, substantial responsibility |
| 5 | Ensure/Advise | Ensure & Advise | ضمان وإرشاد | Full accountability for technical work |
| 6 | Initiate/Influence | Initiate & Influence | مبادرة وتأثير | Defined authority, establishes organizational objectives |
| 7 | Set Strategy/Inspire | Set Strategy & Inspire | وضع استراتيجية وإلهام | Highest authority, sets direction and shapes culture |

### 1.1 Get SFIA Levels

```http
GET /api/hr/skills/sfia-levels
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "level": 1,
      "code": "Follow",
      "name": "Follow",
      "nameAr": "متابع",
      "description": "Works under close direction. Uses little discretion. Expected to seek guidance.",
      "descriptionAr": "يعمل تحت إشراف وثيق. يستخدم القليل من التقدير. يتوقع طلب التوجيه.",
      "autonomy": "Works under supervision",
      "complexity": "Routine tasks",
      "businessSkills": "Learning basic business processes",
      "influence": "Minimal impact on team"
    },
    {
      "level": 2,
      "code": "Assist",
      "name": "Assist",
      "nameAr": "مساعد",
      "description": "Works under routine direction. Uses limited discretion. Work is reviewed frequently.",
      "descriptionAr": "يعمل تحت توجيه روتيني. يستخدم تقدير محدود. يتم مراجعة العمل بشكل متكرر.",
      "autonomy": "Works with moderate supervision",
      "complexity": "Routine and straightforward tasks",
      "businessSkills": "Understands basic business processes",
      "influence": "Limited impact within team"
    },
    {
      "level": 3,
      "code": "Apply",
      "name": "Apply",
      "nameAr": "تطبيق",
      "description": "Works under general direction. Uses discretion in identifying and responding to complex issues.",
      "autonomy": "Works with limited supervision",
      "complexity": "Varied work activities",
      "businessSkills": "Demonstrates effective communication",
      "influence": "Interacts with and influences immediate team"
    },
    {
      "level": 4,
      "code": "Enable",
      "name": "Enable",
      "nameAr": "تمكين",
      "description": "Works under general guidance. Substantial responsibility. Influences team practices.",
      "autonomy": "Works with broad guidance",
      "complexity": "Complex technical activities",
      "businessSkills": "Facilitates collaboration within team",
      "influence": "Influences practices of immediate team"
    },
    {
      "level": 5,
      "code": "Ensure/Advise",
      "name": "Ensure & Advise",
      "nameAr": "ضمان وإرشاد",
      "description": "Works under broad direction. Full accountability for technical work. Advises on scope of work.",
      "autonomy": "Full accountability for actions",
      "complexity": "Broad range of complex activities",
      "businessSkills": "Communicates effectively to all levels",
      "influence": "Influences across the organization"
    },
    {
      "level": 6,
      "code": "Initiate/Influence",
      "name": "Initiate & Influence",
      "nameAr": "مبادرة وتأثير",
      "description": "Has defined authority and accountability. Establishes organizational objectives.",
      "autonomy": "Defined authority within organization",
      "complexity": "Highly complex work involving innovation",
      "businessSkills": "Champions organizational initiatives",
      "influence": "Significant influence on organizational policy"
    },
    {
      "level": 7,
      "code": "Set Strategy/Inspire",
      "name": "Set Strategy & Inspire",
      "nameAr": "وضع استراتيجية وإلهام",
      "description": "Has authority and accountability for all aspects. Sets direction and shapes culture.",
      "autonomy": "Highest level of authority",
      "complexity": "Strategic leadership and innovation",
      "businessSkills": "Shapes organizational culture",
      "influence": "Inspires and influences across industry"
    }
  ]
}
```

---

## 2. Skill Types

Skill Types provide hierarchical categorization for skills (e.g., "Technical" → "Programming" → "Web Development").

### 2.1 Get All Skill Types

```http
GET /api/hr/skills/types
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| classification | String | Filter by: technical, functional, behavioral, leadership, industry, certification, language, tool, regulatory |
| flat | Boolean | If true, returns flat list; if false (default), returns hierarchical tree |

**Response (Hierarchical):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64f...",
      "typeId": "ST-0001",
      "name": "Technical Skills",
      "nameAr": "المهارات التقنية",
      "description": "Hard skills related to technology and systems",
      "classification": "technical",
      "icon": "code",
      "color": "#3B82F6",
      "displayOrder": 1,
      "isActive": true,
      "children": [
        {
          "_id": "64f...",
          "typeId": "ST-0002",
          "name": "Programming",
          "nameAr": "البرمجة",
          "classification": "technical",
          "parentTypeId": "64f...",
          "children": [
            {
              "_id": "64f...",
              "typeId": "ST-0003",
              "name": "Web Development",
              "nameAr": "تطوير الويب",
              "children": []
            }
          ]
        },
        {
          "_id": "64f...",
          "typeId": "ST-0004",
          "name": "Database Management",
          "nameAr": "إدارة قواعد البيانات",
          "children": []
        }
      ]
    },
    {
      "_id": "64f...",
      "typeId": "ST-0010",
      "name": "Legal Skills",
      "nameAr": "المهارات القانونية",
      "classification": "functional",
      "children": [
        {
          "name": "Litigation",
          "nameAr": "التقاضي",
          "children": []
        },
        {
          "name": "Corporate Law",
          "nameAr": "قانون الشركات",
          "children": []
        }
      ]
    }
  ]
}
```

---

### 2.2 Create Skill Type

```http
POST /api/hr/skills/types
```

**Request Body:**

```json
{
  "name": "Regulatory Compliance",
  "nameAr": "الامتثال التنظيمي",
  "description": "Skills related to regulatory and compliance requirements",
  "descriptionAr": "مهارات متعلقة بالمتطلبات التنظيمية والامتثال",
  "parentTypeId": "64f...",
  "classification": "regulatory",
  "icon": "shield-check",
  "color": "#10B981",
  "displayOrder": 5
}
```

**Response:**

```json
{
  "success": true,
  "message": "Skill type created successfully",
  "data": {
    "_id": "64f...",
    "typeId": "ST-0020",
    "name": "Regulatory Compliance"
  }
}
```

---

### 2.3 Update Skill Type

```http
PATCH /api/hr/skills/types/:id
```

**Request Body:**

```json
{
  "name": "Legal & Regulatory Compliance",
  "description": "Updated description",
  "color": "#059669"
}
```

---

## 3. Skills

### 3.1 Get All Skills

```http
GET /api/hr/skills
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| category | String | Filter by: technical, legal, language, software, management, communication, analytical, interpersonal, industry_specific, certification, other |
| skillTypeId | ObjectId | Filter by skill type |
| isVerifiable | Boolean | Filter verifiable skills only |
| isCoreSkill | Boolean | Filter core skills only |
| isActive | Boolean | Filter by active status |
| search | String | Search in name, description, tags |
| page | Number | Page number (default: 1) |
| limit | Number | Items per page (default: 20) |
| sortBy | String | Sort field (default: name) |
| sortOrder | String | asc or desc |

**Response:**

```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "_id": "64f...",
        "skillId": "SK-0001",
        "name": "Saudi Labor Law",
        "nameAr": "نظام العمل السعودي",
        "description": "Knowledge of Saudi Arabia labor law and regulations",
        "descriptionAr": "معرفة نظام العمل السعودي ولوائحه",
        "skillTypeId": {
          "_id": "64f...",
          "name": "Legal Skills"
        },
        "category": "legal",
        "subcategory": "Employment Law",
        "useSfiaLevels": true,
        "targetProficiency": 4,
        "tags": ["labor-law", "saudi", "compliance"],
        "isVerifiable": true,
        "verificationMethod": "certification",
        "certificationInfo": {
          "certificationName": "Saudi Labor Law Specialist",
          "issuingBody": "Saudi Human Resources Development Fund",
          "validityPeriodMonths": 24,
          "renewalRequired": true,
          "cpdCredits": 20,
          "estimatedCost": 5000
        },
        "learningResources": [
          {
            "type": "course",
            "title": "Saudi Labor Law Fundamentals",
            "provider": "HRDF",
            "url": "https://hrdf.org.sa/courses/labor-law",
            "duration": "20 hours",
            "forLevel": 3
          }
        ],
        "stats": {
          "employeesWithSkill": 25,
          "avgProficiency": 3.5,
          "verifiedCount": 18
        },
        "isActive": true,
        "isCoreSkill": true
      }
    ],
    "pagination": {
      "total": 145,
      "page": 1,
      "pages": 8,
      "limit": 20
    }
  }
}
```

---

### 3.2 Get Single Skill

```http
GET /api/hr/skills/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "skillId": "SK-0001",
    "name": "Contract Drafting",
    "nameAr": "صياغة العقود",
    "description": "Ability to draft, review, and negotiate legal contracts",
    "descriptionAr": "القدرة على صياغة ومراجعة والتفاوض على العقود القانونية",
    "skillTypeId": "64f...",
    "category": "legal",
    "subcategory": "Contract Law",
    "useSfiaLevels": true,
    "proficiencyLevels": [
      {
        "level": 1,
        "code": "Follow",
        "name": "Follow",
        "nameAr": "متابع",
        "description": "Can review standard templates under supervision",
        "autonomy": "Requires constant supervision",
        "complexity": "Simple standard contracts"
      },
      {
        "level": 2,
        "code": "Assist",
        "name": "Assist",
        "nameAr": "مساعد",
        "description": "Can draft simple contracts with review",
        "autonomy": "Works with moderate supervision",
        "complexity": "Standard contracts with minor modifications"
      },
      {
        "level": 3,
        "code": "Apply",
        "name": "Apply",
        "nameAr": "تطبيق",
        "description": "Independently drafts moderately complex contracts",
        "autonomy": "Works with limited supervision",
        "complexity": "Standard to moderately complex contracts"
      },
      {
        "level": 4,
        "code": "Enable",
        "name": "Enable",
        "nameAr": "تمكين",
        "description": "Drafts complex contracts, guides junior staff",
        "autonomy": "Full responsibility for own work",
        "complexity": "Complex multi-party agreements"
      },
      {
        "level": 5,
        "code": "Ensure/Advise",
        "name": "Ensure & Advise",
        "nameAr": "ضمان وإرشاد",
        "description": "Expert in contract law, advises on strategy",
        "autonomy": "Advises on approach and methodology",
        "complexity": "Highly complex, high-value transactions"
      },
      {
        "level": 6,
        "code": "Initiate/Influence",
        "name": "Initiate & Influence",
        "nameAr": "مبادرة وتأثير",
        "description": "Sets firm's contract standards and best practices",
        "autonomy": "Sets direction for the practice area",
        "complexity": "Novel and precedent-setting agreements"
      },
      {
        "level": 7,
        "code": "Set Strategy/Inspire",
        "name": "Set Strategy & Inspire",
        "nameAr": "وضع استراتيجية وإلهام",
        "description": "Industry-recognized expert, shapes legal practice",
        "autonomy": "Shapes industry standards",
        "complexity": "Landmark, industry-defining agreements"
      }
    ],
    "targetProficiency": 4,
    "tags": ["contracts", "drafting", "negotiation", "legal-writing"],
    "relatedSkills": [
      {
        "skillId": "64f...",
        "skillName": "Legal Research",
        "relationship": "complementary"
      },
      {
        "skillId": "64f...",
        "skillName": "Negotiation",
        "relationship": "complementary"
      }
    ],
    "isVerifiable": true,
    "verificationMethod": "assessment",
    "certificationInfo": {
      "certificationName": "Certified Contract Specialist",
      "issuingBody": "Saudi Bar Association",
      "validityPeriodMonths": 36,
      "renewalRequired": true,
      "cpdCredits": 30,
      "examRequired": true
    },
    "learningResources": [
      {
        "type": "course",
        "title": "Advanced Contract Drafting",
        "titleAr": "صياغة العقود المتقدمة",
        "provider": "Saudi Bar Association",
        "duration": "40 hours",
        "cost": 8000,
        "forLevel": 4
      },
      {
        "type": "book",
        "title": "Contract Law in Saudi Arabia",
        "provider": "Legal Publications",
        "forLevel": 3
      }
    ],
    "relatedTrainings": ["64f...", "64f..."],
    "requiredForRoles": [
      {
        "roleId": "64f...",
        "roleName": "Legal Counsel",
        "requiredLevel": 5
      },
      {
        "roleId": "64f...",
        "roleName": "Associate",
        "requiredLevel": 3
      }
    ],
    "industryStandards": [
      {
        "framework": "SFIA",
        "standardCode": "CNTR",
        "standardName": "Contract Management"
      }
    ],
    "stats": {
      "employeesWithSkill": 42,
      "avgProficiency": 3.8,
      "verifiedCount": 28,
      "lastUpdated": "2025-12-15"
    },
    "isCoreSkill": true,
    "isActive": true
  }
}
```

---

### 3.3 Create Skill

```http
POST /api/hr/skills
```

**Request Body:**

```json
{
  "name": "Artificial Intelligence in Legal",
  "nameAr": "الذكاء الاصطناعي في القانون",
  "description": "Application of AI and machine learning in legal practice",
  "descriptionAr": "تطبيق الذكاء الاصطناعي والتعلم الآلي في الممارسة القانونية",
  "skillTypeId": "64f...",
  "category": "technical",
  "subcategory": "Legal Tech",
  "useSfiaLevels": true,
  "targetProficiency": 3,
  "tags": ["AI", "legal-tech", "machine-learning", "automation"],
  "tagsAr": ["ذكاء اصطناعي", "تقنية قانونية", "أتمتة"],
  "relatedSkills": [
    {
      "skillId": "64f...",
      "relationship": "prerequisite"
    }
  ],
  "isVerifiable": true,
  "verificationMethod": "certification",
  "certificationInfo": {
    "certificationName": "Legal AI Specialist",
    "issuingBody": "Legal Tech Institute",
    "validityPeriodMonths": 24,
    "renewalRequired": true,
    "cpdCredits": 15,
    "estimatedCost": 12000
  },
  "learningResources": [
    {
      "type": "course",
      "title": "AI for Legal Professionals",
      "provider": "Coursera",
      "url": "https://coursera.org/ai-legal",
      "duration": "30 hours",
      "cost": 500,
      "forLevel": 2
    }
  ],
  "isCoreSkill": false
}
```

**Response:**

```json
{
  "success": true,
  "message": "Skill created successfully",
  "data": {
    "_id": "64f...",
    "skillId": "SK-0050",
    "name": "Artificial Intelligence in Legal"
  }
}
```

---

### 3.4 Update Skill

```http
PATCH /api/hr/skills/:id
```

**Request Body:**

```json
{
  "targetProficiency": 4,
  "isCoreSkill": true,
  "learningResources": [
    {
      "type": "course",
      "title": "Advanced Legal AI",
      "provider": "MIT",
      "forLevel": 4
    }
  ]
}
```

---

### 3.5 Delete Skill

```http
DELETE /api/hr/skills/:id
```

**Note:** Soft-deletes if skill is assigned to employees.

---

### 3.6 Get Skills by Category

```http
GET /api/hr/skills/by-category
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "legal",
      "skills": [
        { "_id": "64f...", "name": "Contract Drafting", "nameAr": "صياغة العقود" },
        { "_id": "64f...", "name": "Legal Research", "nameAr": "البحث القانوني" }
      ],
      "count": 15
    },
    {
      "_id": "technical",
      "skills": [
        { "_id": "64f...", "name": "Document Management", "nameAr": "إدارة الوثائق" }
      ],
      "count": 8
    },
    {
      "_id": "language",
      "skills": [
        { "_id": "64f...", "name": "Arabic (Legal)", "nameAr": "العربية القانونية" },
        { "_id": "64f...", "name": "English (Legal)", "nameAr": "الإنجليزية القانونية" }
      ],
      "count": 5
    }
  ]
}
```

---

### 3.7 Get Skill Statistics

```http
GET /api/hr/skills/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalSkills": 145,
    "activeSkills": 140,
    "coreSkills": 25,
    "verifiableSkills": 68,
    "byCategory": {
      "legal": 35,
      "technical": 28,
      "language": 12,
      "software": 25,
      "management": 18,
      "communication": 15,
      "other": 12
    },
    "byClassification": {
      "technical": 53,
      "functional": 42,
      "behavioral": 28,
      "certification": 22
    },
    "certificationStats": {
      "totalCertifiable": 45,
      "expiringIn30Days": 8,
      "expiringIn90Days": 15
    },
    "topSkillsByEmployees": [
      { "skillName": "Contract Drafting", "employeeCount": 42 },
      { "skillName": "Legal Research", "employeeCount": 38 }
    ]
  }
}
```

---

## 4. Competencies

### 4.1 Get All Competencies

```http
GET /api/hr/skills/competencies
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| type | String | core, leadership, functional, behavioral, strategic |
| cluster | String | communication, collaboration, problem_solving, decision_making, innovation, customer_focus, results_orientation, leadership, people_development, strategic_thinking, change_management, integrity, adaptability, accountability |
| isMandatory | Boolean | Filter mandatory competencies |
| search | String | Search in name, description |
| page | Number | Page number |
| limit | Number | Items per page |

**Response:**

```json
{
  "success": true,
  "data": {
    "competencies": [
      {
        "_id": "64f...",
        "competencyId": "CP-0001",
        "name": "Client Focus",
        "nameAr": "التركيز على العميل",
        "description": "Anticipates and meets client needs, builds trust",
        "descriptionAr": "توقع وتلبية احتياجات العميل، بناء الثقة",
        "type": "core",
        "cluster": "customer_focus",
        "clusterAr": "التركيز على العميل",
        "behavioralIndicators": [
          {
            "level": 1,
            "levelName": "Basic",
            "indicators": [
              "Responds to client queries promptly",
              "Shows courtesy and respect"
            ],
            "indicatorsAr": [
              "يرد على استفسارات العملاء بسرعة",
              "يظهر الاحترام واللباقة"
            ],
            "examples": [
              "Returns calls within 24 hours"
            ],
            "negativeIndicators": [
              "Ignores client communications",
              "Dismissive attitude"
            ]
          },
          {
            "level": 3,
            "levelName": "Proficient",
            "indicators": [
              "Proactively addresses client concerns",
              "Builds rapport and trust",
              "Provides regular updates"
            ]
          },
          {
            "level": 5,
            "levelName": "Expert",
            "indicators": [
              "Anticipates client needs before they arise",
              "Serves as trusted advisor",
              "Develops long-term client relationships"
            ]
          }
        ],
        "assessmentMethods": ["self_assessment", "manager_assessment", "peer_360"],
        "importance": "critical",
        "weight": 20,
        "developmentActivities": [
          {
            "activity": "Client communication workshop",
            "type": "training",
            "forLevel": 2,
            "estimatedDuration": "2 days"
          }
        ],
        "isMandatory": true,
        "isActive": true
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

### 4.2 Get Single Competency

```http
GET /api/hr/skills/competencies/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "competencyId": "CP-0005",
    "name": "Strategic Thinking",
    "nameAr": "التفكير الاستراتيجي",
    "description": "Ability to analyze complex situations and develop long-term strategies",
    "type": "leadership",
    "cluster": "strategic_thinking",
    "behavioralIndicators": [
      {
        "level": 3,
        "levelName": "Apply",
        "levelNameAr": "تطبيق",
        "indicators": [
          "Identifies patterns and trends",
          "Considers multiple perspectives",
          "Anticipates consequences of decisions"
        ],
        "indicatorsAr": [
          "يحدد الأنماط والاتجاهات",
          "يأخذ في الاعتبار وجهات نظر متعددة",
          "يتوقع عواقب القرارات"
        ],
        "examples": [
          "Develops quarterly plans aligned with firm goals",
          "Identifies market opportunities"
        ],
        "negativeIndicators": [
          "Focuses only on immediate tasks",
          "Fails to see broader implications"
        ]
      },
      {
        "level": 5,
        "levelName": "Ensure & Advise",
        "indicators": [
          "Develops multi-year strategic plans",
          "Aligns team efforts with organizational vision",
          "Anticipates industry changes"
        ]
      },
      {
        "level": 7,
        "levelName": "Set Strategy & Inspire",
        "indicators": [
          "Sets organizational direction",
          "Creates vision that inspires others",
          "Shapes industry standards"
        ]
      }
    ],
    "assessmentMethods": [
      "self_assessment",
      "manager_assessment",
      "behavioral_interview",
      "case_study"
    ],
    "importance": "critical",
    "weight": 15,
    "developmentActivities": [
      {
        "activity": "Strategic Leadership Program",
        "activityAr": "برنامج القيادة الاستراتيجية",
        "type": "training",
        "forLevel": 5,
        "estimatedDuration": "5 days"
      },
      {
        "activity": "Executive coaching on strategic planning",
        "type": "coaching",
        "forLevel": 6,
        "estimatedDuration": "6 months"
      },
      {
        "activity": "Lead strategic initiative project",
        "type": "project",
        "forLevel": 5,
        "estimatedDuration": "3 months"
      }
    ],
    "isMandatory": true,
    "isActive": true
  }
}
```

---

### 4.3 Create Competency

```http
POST /api/hr/skills/competencies
```

**Request Body:**

```json
{
  "name": "Digital Transformation Leadership",
  "nameAr": "قيادة التحول الرقمي",
  "description": "Ability to lead and drive digital transformation initiatives",
  "descriptionAr": "القدرة على قيادة ودفع مبادرات التحول الرقمي",
  "type": "leadership",
  "cluster": "change_management",
  "behavioralIndicators": [
    {
      "level": 3,
      "levelName": "Apply",
      "indicators": [
        "Embraces new technologies",
        "Supports digital initiatives",
        "Adapts workflows to digital tools"
      ],
      "negativeIndicators": [
        "Resists technological change",
        "Clings to manual processes"
      ]
    },
    {
      "level": 5,
      "levelName": "Ensure & Advise",
      "indicators": [
        "Champions digital transformation",
        "Develops digital roadmaps",
        "Coaches others on digital adoption"
      ]
    }
  ],
  "assessmentMethods": ["self_assessment", "manager_assessment", "observation"],
  "importance": "important",
  "weight": 12,
  "developmentActivities": [
    {
      "activity": "Digital Leadership Workshop",
      "type": "training",
      "forLevel": 4,
      "estimatedDuration": "3 days"
    }
  ],
  "isMandatory": false
}
```

---

### 4.4 Update Competency

```http
PATCH /api/hr/skills/competencies/:id
```

---

### 4.5 Delete Competency

```http
DELETE /api/hr/skills/competencies/:id
```

---

## 5. Skill Assessments

### 5.1 Get Skill Assessments

```http
GET /api/hr/skills/assessments
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| employeeId | ObjectId | Filter by employee |
| assessmentType | String | annual, quarterly, probation, promotion, project_end, skill_gap, 360_review, certification_prep |
| status | String | draft, self_assessment, manager_review, peer_review, calibration, completed, acknowledged |
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
        "assessmentId": "SA-00001",
        "employeeId": {
          "_id": "64f...",
          "firstName": "Ahmed",
          "lastName": "Al-Rashid"
        },
        "assessmentPeriod": {
          "startDate": "2025-01-01",
          "endDate": "2025-12-31",
          "periodName": "2025 Annual"
        },
        "assessmentType": "annual",
        "status": "completed",
        "overallSummary": {
          "totalSkillsAssessed": 12,
          "avgSkillRating": 4.2,
          "totalCompetenciesAssessed": 8,
          "avgCompetencyRating": 3.8,
          "strengthAreas": ["Contract Drafting", "Legal Research"],
          "developmentAreas": ["Team Leadership"]
        },
        "workflow": {
          "selfAssessmentCompleted": "2025-12-10",
          "managerReviewCompleted": "2025-12-20",
          "acknowledgedAt": "2025-12-22"
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

### 5.2 Get Single Assessment

```http
GET /api/hr/skills/assessments/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "assessmentId": "SA-00001",
    "employeeId": "64f...",
    "assessmentPeriod": {
      "startDate": "2025-01-01",
      "endDate": "2025-12-31",
      "periodName": "2025 Annual Assessment",
      "periodNameAr": "تقييم 2025 السنوي"
    },
    "assessmentType": "annual",
    "skillRatings": [
      {
        "skillId": "64f...",
        "skillName": "Contract Drafting",
        "skillNameAr": "صياغة العقود",
        "category": "legal",
        "selfRating": {
          "level": 4,
          "levelProgress": 60,
          "confidence": 4,
          "notes": "Drafted 45 contracts this year",
          "ratedAt": "2025-12-10"
        },
        "managerRating": {
          "level": 5,
          "levelProgress": 20,
          "notes": "Excellent work on complex IP contracts",
          "ratedBy": "64f...",
          "ratedAt": "2025-12-18"
        },
        "peerRatings": [
          {
            "level": 4,
            "levelProgress": 75,
            "notes": "Great collaboration on joint contracts",
            "ratedBy": "64f...",
            "relationship": "peer",
            "ratedAt": "2025-12-15"
          }
        ],
        "finalRating": {
          "level": 5,
          "levelProgress": 10,
          "calculationMethod": "weighted_average",
          "calibrated": true,
          "calibratedBy": "64f...",
          "calibratedAt": "2025-12-22"
        },
        "previousRating": 4,
        "targetRating": 5,
        "gap": 0,
        "trend": "improving",
        "evidence": [
          {
            "type": "project",
            "description": "Led SAR 50M acquisition contract",
            "date": "2025-06-15",
            "verifiedBy": "64f..."
          },
          {
            "type": "achievement",
            "description": "Zero revisions on 20 contracts"
          }
        ]
      }
    ],
    "competencyRatings": [
      {
        "competencyId": "64f...",
        "competencyName": "Client Focus",
        "competencyNameAr": "التركيز على العميل",
        "type": "core",
        "selfRating": {
          "level": 4,
          "notes": "Maintained 95% client satisfaction"
        },
        "managerRating": {
          "level": 4,
          "notes": "Strong client relationships"
        },
        "finalRating": {
          "level": 4,
          "calibrated": true
        },
        "behavioralExamples": [
          {
            "behavior": "Proactively updated clients on case progress",
            "situation": "Complex litigation case",
            "action": "Weekly status calls and reports",
            "result": "Client commended service quality",
            "observedBy": "64f...",
            "observedAt": "2025-09-15"
          }
        ]
      }
    ],
    "overallSummary": {
      "totalSkillsAssessed": 12,
      "avgSkillRating": 4.2,
      "totalCompetenciesAssessed": 8,
      "avgCompetencyRating": 3.8,
      "strengthAreas": [
        "Contract Drafting",
        "Legal Research",
        "Client Communication"
      ],
      "strengthAreasAr": [
        "صياغة العقود",
        "البحث القانوني",
        "التواصل مع العملاء"
      ],
      "developmentAreas": [
        "Team Leadership",
        "Business Development"
      ],
      "developmentAreasAr": [
        "قيادة الفريق",
        "تطوير الأعمال"
      ],
      "overallNotes": "Strong technical performer ready for leadership role"
    },
    "developmentPlan": {
      "shortTermGoals": [
        {
          "goal": "Complete leadership training program",
          "goalAr": "إكمال برنامج التدريب القيادي",
          "skillId": null,
          "targetLevel": null,
          "dueDate": "2026-06-30",
          "actions": ["Enroll in executive program", "Monthly coaching sessions"]
        }
      ],
      "longTermGoals": [
        {
          "goal": "Achieve Partner level",
          "goalAr": "الوصول لمستوى شريك",
          "targetDate": "2028-12-31"
        }
      ],
      "recommendedTraining": [
        {
          "trainingId": "64f...",
          "trainingName": "Leadership Excellence Program",
          "priority": "high"
        }
      ],
      "mentorAssigned": "64f..."
    },
    "status": "completed",
    "workflow": {
      "selfAssessmentDue": "2025-12-15",
      "selfAssessmentCompleted": "2025-12-10",
      "managerReviewDue": "2025-12-22",
      "managerReviewCompleted": "2025-12-18",
      "peerReviewDue": "2025-12-20",
      "peerReviewCompleted": "2025-12-16",
      "calibrationDate": "2025-12-22",
      "acknowledgedBy": "64f...",
      "acknowledgedAt": "2025-12-23"
    }
  }
}
```

---

### 5.3 Create Skill Assessment

```http
POST /api/hr/skills/assessments
```

**Request Body:**

```json
{
  "employeeId": "64f...",
  "assessmentPeriod": {
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "periodName": "2025 Annual Assessment",
    "periodNameAr": "تقييم 2025 السنوي"
  },
  "assessmentType": "annual",
  "skillRatings": [
    {
      "skillId": "64f...",
      "targetRating": 5
    },
    {
      "skillId": "64f...",
      "targetRating": 4
    }
  ],
  "competencyRatings": [
    {
      "competencyId": "64f..."
    }
  ],
  "workflow": {
    "selfAssessmentDue": "2025-12-15",
    "managerReviewDue": "2025-12-22",
    "peerReviewDue": "2025-12-20"
  }
}
```

---

### 5.4 Update Assessment

```http
PATCH /api/hr/skills/assessments/:id
```

**Request Body (Manager completing review):**

```json
{
  "skillRatings": [
    {
      "skillId": "64f...",
      "managerRating": {
        "level": 5,
        "levelProgress": 20,
        "notes": "Excellent work this year"
      }
    }
  ],
  "status": "calibration"
}
```

---

### 5.5 Submit Self-Assessment

```http
POST /api/hr/skills/assessments/:id/self-assessment
```

**Request Body:**

```json
{
  "skillRatings": [
    {
      "skillId": "64f...",
      "selfRating": {
        "level": 4,
        "levelProgress": 60,
        "confidence": 4,
        "notes": "Drafted 45 contracts this year with zero critical issues"
      },
      "evidence": [
        {
          "type": "project",
          "description": "Led SAR 50M acquisition contract"
        }
      ]
    }
  ],
  "competencyRatings": [
    {
      "competencyId": "64f...",
      "selfRating": {
        "level": 4,
        "notes": "Maintained 95% client satisfaction rating"
      }
    }
  ],
  "overallSummary": {
    "strengthAreas": ["Contract Drafting", "Legal Research"],
    "developmentAreas": ["Team Leadership"]
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Self-assessment submitted successfully",
  "data": {
    "assessmentId": "SA-00001",
    "status": "manager_review",
    "workflow": {
      "selfAssessmentCompleted": "2025-12-10"
    }
  }
}
```

---

## 6. Certification & CPD

### 6.1 Get Expiring Certifications

```http
GET /api/hr/skills/expiring-certifications
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| days | Number | Days until expiry (default: 30) |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "employeeId": "64f...",
      "employeeName": "Ahmed Al-Rashid",
      "skillId": "64f...",
      "skillName": "Saudi Labor Law",
      "certification": {
        "certificationName": "Saudi Labor Law Specialist",
        "issuingBody": "HRDF",
        "expiryDate": "2026-01-15",
        "daysUntilExpiry": 25
      }
    }
  ]
}
```

---

### 6.2 Get CPD Non-Compliant Employees

```http
GET /api/hr/skills/cpd-non-compliant
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "employeeId": "64f...",
      "employeeName": "Sara Al-Ahmed",
      "requiredCpdCredits": 30,
      "earnedCpdCredits": 18,
      "shortfall": 12,
      "deadline": "2026-03-31",
      "daysRemaining": 82
    }
  ]
}
```

---

### 6.3 Get Skills Needing Review

```http
GET /api/hr/skills/needing-review
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| days | Number | 0 = overdue, positive = upcoming within days |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "employeeId": "64f...",
      "employeeName": "Mohammed Al-Faisal",
      "skillId": "64f...",
      "skillName": "Contract Law",
      "lastAssessedDate": "2024-06-15",
      "nextReviewDate": "2025-06-15",
      "status": "overdue",
      "daysOverdue": 180
    }
  ]
}
```

---

## 7. Skill Matrix

### 7.1 Get Team Skill Matrix

```http
GET /api/hr/skills/matrix
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| departmentId | ObjectId | Filter by department |
| skillCategory | String | Filter by skill category |
| skillIds | String | Comma-separated skill IDs |

**Response:**

```json
{
  "success": true,
  "data": {
    "skills": [
      {
        "skillId": "64f...",
        "skillName": "Contract Drafting",
        "category": "legal"
      },
      {
        "skillId": "64f...",
        "skillName": "Legal Research",
        "category": "legal"
      }
    ],
    "employees": [
      {
        "employeeId": "64f...",
        "employeeName": "Ahmed Al-Rashid",
        "position": "Senior Associate",
        "skillLevels": {
          "64f...": { "level": 5, "verified": true },
          "64f...": { "level": 4, "verified": true }
        }
      },
      {
        "employeeId": "64f...",
        "employeeName": "Sara Al-Ahmed",
        "position": "Associate",
        "skillLevels": {
          "64f...": { "level": 3, "verified": false },
          "64f...": { "level": 4, "verified": true }
        }
      }
    ],
    "summary": {
      "totalEmployees": 15,
      "avgProficiencyBySkill": {
        "64f...": 3.8,
        "64f...": 4.1
      },
      "skillCoverage": {
        "64f...": { "total": 15, "verified": 12 },
        "64f...": { "total": 14, "verified": 10 }
      }
    }
  }
}
```

---

## 8. Gap Analysis

### 8.1 Get Skill Gap Analysis

```http
GET /api/hr/skills/gap-analysis
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| departmentId | ObjectId | Filter by department |
| roleId | ObjectId | Filter by job role |
| targetProficiency | Number | Override target proficiency level |

**Response:**

```json
{
  "success": true,
  "data": {
    "department": {
      "_id": "64f...",
      "name": "Legal Department"
    },
    "skillGaps": [
      {
        "skillId": "64f...",
        "skillName": "Artificial Intelligence in Legal",
        "targetLevel": 3,
        "currentAvgLevel": 1.5,
        "gap": 1.5,
        "employeesAtTarget": 2,
        "employeesBelowTarget": 13,
        "totalEmployees": 15,
        "coveragePercent": 13.3,
        "priority": "high",
        "recommendedActions": [
          "Enroll 10 employees in AI for Legal Professionals course",
          "Identify 2 employees for certification program"
        ]
      },
      {
        "skillId": "64f...",
        "skillName": "Contract Drafting",
        "targetLevel": 4,
        "currentAvgLevel": 3.8,
        "gap": 0.2,
        "employeesAtTarget": 12,
        "employeesBelowTarget": 3,
        "totalEmployees": 15,
        "coveragePercent": 80,
        "priority": "low"
      }
    ],
    "competencyGaps": [
      {
        "competencyId": "64f...",
        "competencyName": "Strategic Thinking",
        "targetLevel": 4,
        "currentAvgLevel": 3.2,
        "gap": 0.8,
        "priority": "medium"
      }
    ],
    "overallGapScore": 2.3,
    "criticalGaps": 2,
    "totalTrainingInvestmentNeeded": 125000
  }
}
```

---

## 9. Employee Skills

### 9.1 Get Employee Skills

```http
GET /api/hr/skills/employee/:employeeId
```

**Response:**

```json
{
  "success": true,
  "data": {
    "employeeId": "64f...",
    "employeeName": "Ahmed Al-Rashid",
    "skills": [
      {
        "skillId": "64f...",
        "skillName": "Contract Drafting",
        "skillNameAr": "صياغة العقود",
        "category": "legal",
        "proficiencyLevel": 5,
        "proficiencyName": "Ensure & Advise",
        "proficiencyNameAr": "ضمان وإرشاد",
        "targetLevel": 5,
        "gap": 0,
        "verified": true,
        "verifiedBy": "64f...",
        "verifiedAt": "2025-06-15",
        "endorsements": 8,
        "lastAssessed": "2025-12-15",
        "certifications": [
          {
            "certificationName": "Certified Contract Specialist",
            "issuingBody": "Saudi Bar Association",
            "issueDate": "2024-06-01",
            "expiryDate": "2027-06-01",
            "status": "active"
          }
        ]
      }
    ],
    "competencies": [
      {
        "competencyId": "64f...",
        "competencyName": "Client Focus",
        "type": "core",
        "proficiencyLevel": 4,
        "lastAssessed": "2025-12-15"
      }
    ],
    "summary": {
      "totalSkills": 12,
      "verifiedSkills": 10,
      "avgProficiency": 4.2,
      "skillsByCategory": {
        "legal": 5,
        "technical": 3,
        "language": 2,
        "management": 2
      },
      "gapsToClose": 2,
      "certificationsExpiringSoon": 1,
      "cpdCreditsEarned": 25,
      "cpdCreditsRequired": 30
    }
  }
}
```

---

### 9.2 Assign Skill to Employee

```http
POST /api/hr/skills/assign
```

**Request Body:**

```json
{
  "employeeId": "64f...",
  "skillId": "64f...",
  "proficiencyLevel": 3,
  "notes": "Based on project experience",
  "certificationDetails": {
    "certificationName": "Legal AI Specialist",
    "issuingBody": "Legal Tech Institute",
    "issueDate": "2025-01-15",
    "expiryDate": "2027-01-15",
    "certificateNumber": "LAI-2025-001",
    "certificateUrl": "https://..."
  }
}
```

---

### 9.3 Remove Skill from Employee

```http
DELETE /api/hr/skills/assign/:employeeId/:skillId
```

---

### 9.4 Get Employees with Specific Skill

```http
GET /api/hr/skills/:skillId/employees
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| minProficiency | Number | Minimum proficiency level (1-7) |
| verified | Boolean | Only verified skills |

**Response:**

```json
{
  "success": true,
  "data": {
    "skill": {
      "_id": "64f...",
      "skillName": "Contract Drafting",
      "targetProficiency": 4
    },
    "employees": [
      {
        "employeeId": "64f...",
        "employeeName": "Ahmed Al-Rashid",
        "department": "Legal",
        "position": "Senior Associate",
        "proficiencyLevel": 5,
        "proficiencyName": "Ensure & Advise",
        "verified": true,
        "endorsements": 8
      },
      {
        "employeeId": "64f...",
        "employeeName": "Sara Al-Ahmed",
        "department": "Legal",
        "position": "Associate",
        "proficiencyLevel": 3,
        "proficiencyName": "Apply",
        "verified": true,
        "endorsements": 4
      }
    ],
    "summary": {
      "totalWithSkill": 42,
      "verifiedCount": 28,
      "avgProficiency": 3.8,
      "atOrAboveTarget": 30,
      "belowTarget": 12
    }
  }
}
```

---

## 10. Verification & Endorsements

### 10.1 Verify Employee Skill

```http
POST /api/hr/skills/verify
```

**Request Body:**

```json
{
  "employeeId": "64f...",
  "skillId": "64f...",
  "verificationMethod": "assessment",
  "proficiencyLevel": 4,
  "notes": "Passed practical assessment with 92% score",
  "evidenceUrls": ["https://..."],
  "certificationDetails": {
    "certificationName": "Contract Drafting Proficiency",
    "issuingBody": "Internal Assessment",
    "issueDate": "2025-12-15"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Skill verified successfully",
  "data": {
    "employeeId": "64f...",
    "skillId": "64f...",
    "verified": true,
    "verifiedBy": "64f...",
    "verifiedAt": "2025-12-15",
    "proficiencyLevel": 4
  }
}
```

---

### 10.2 Endorse Employee Skill

```http
POST /api/hr/skills/endorse
```

**Request Body:**

```json
{
  "employeeId": "64f...",
  "skillId": "64f...",
  "endorsementNote": "Excellent contract drafting skills demonstrated on project X",
  "relationship": "peer"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Skill endorsed successfully",
  "data": {
    "employeeId": "64f...",
    "skillId": "64f...",
    "totalEndorsements": 9,
    "endorsedBy": "64f...",
    "endorsedAt": "2025-12-15"
  }
}
```

---

## Skill Categories Reference

| Category | Description | Examples |
|----------|-------------|----------|
| technical | Hard technical skills | Programming, Data Analysis |
| legal | Legal domain expertise | Contract Law, Litigation, IP Law |
| language | Language proficiency | Arabic, English, French |
| software | Software tools | MS Office, Legal Tech, ERP |
| management | Management capabilities | Project Management, Risk Management |
| communication | Communication skills | Presentation, Writing, Negotiation |
| analytical | Analysis capabilities | Research, Problem Solving |
| interpersonal | People skills | Collaboration, Conflict Resolution |
| industry_specific | Industry knowledge | Saudi Labor Law, GOSI Regulations |
| certification | Certifiable skills | CPA, PMP, CIPP |

---

## Competency Types Reference

| Type | Description | Examples |
|------|-------------|----------|
| core | Required for all employees | Client Focus, Integrity, Teamwork |
| leadership | Required for managers | Strategic Thinking, People Development |
| functional | Job-specific competencies | Legal Analysis, Financial Acumen |
| behavioral | Soft skills/behaviors | Adaptability, Initiative |
| strategic | Executive-level competencies | Vision Setting, Industry Leadership |

---

## Competency Clusters Reference

| Cluster | Arabic | Description |
|---------|--------|-------------|
| communication | التواصل | Verbal, written, presentation skills |
| collaboration | التعاون | Teamwork, partnership building |
| problem_solving | حل المشكلات | Analysis, creative solutions |
| decision_making | اتخاذ القرارات | Judgment, risk assessment |
| innovation | الابتكار | Creativity, continuous improvement |
| customer_focus | التركيز على العميل | Client service, relationship building |
| results_orientation | التوجه نحو النتائج | Goal achievement, accountability |
| leadership | القيادة | Guiding, motivating others |
| people_development | تطوير الأشخاص | Coaching, mentoring |
| strategic_thinking | التفكير الاستراتيجي | Long-term planning, vision |
| change_management | إدارة التغيير | Adaptability, transformation |
| integrity | النزاهة | Ethics, trustworthiness |
| adaptability | المرونة | Flexibility, resilience |
| accountability | المسؤولية | Ownership, reliability |

---

## Error Codes

| Code | Message |
|------|---------|
| 400 | Invalid skill data |
| 400 | Invalid proficiency level (must be 1-7) |
| 403 | Not authorized to verify skills |
| 404 | Skill not found |
| 404 | Employee not found |
| 409 | Skill already assigned to employee |
| 409 | Cannot self-endorse skills |
| 422 | Missing required certification details |

---

## Best Practices

### Skill Management
1. Use SFIA 7-level framework for consistency
2. Create hierarchical skill types for organization
3. Link skills to job roles for gap analysis
4. Track certifications and CPD requirements
5. Conduct regular skill assessments (at least annually)

### Competency Framework
1. Define core competencies for all employees
2. Create leadership competencies for managers
3. Include behavioral indicators for each level
4. Use multiple assessment methods (360-degree)
5. Link competencies to performance reviews

### Assessment Best Practices
1. Combine self, manager, and peer assessments
2. Calibrate ratings across teams
3. Document evidence for ratings
4. Create development plans from gaps
5. Track progress over time

---

*Part 7 of 12 - Skills & Competencies*
