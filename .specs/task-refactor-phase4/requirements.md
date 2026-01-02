# Task Controller Refactoring - Phase 4 Requirements

## Overview

Continue splitting `task.controller.js` (now 3,055 lines) by extracting Template and Attachment management into separate controllers.

**Scope:** Extract ~650 lines into 2 new controllers
**Scale:** Standard (6 files affected)
**Risk Level:** Low (follows Phase 3 pattern)

---

## 🧠 Reasoning (Thinking Out Loud)

### What I Searched
- Checked `task.controller.js` → 44 functions remaining, 3,055 lines
- Checked Phase 3 outcome → Document/Voice extraction successful
- Verified `task.route.js` → Template routes on lines 85-91, Attachment routes on 150-154

### Decisions Made
| Decision | Why | Alternatives Considered |
|----------|-----|------------------------|
| Extract Templates next | Self-contained domain (7 functions) | Attachments first (smaller but less cohesive) |
| Extract Attachments together | Same phase, related to task content | Separate phase (rejected: too small alone) |
| Keep route imports in task.route.js | Follows Phase 3 pattern | Separate route files (rejected: over-engineering) |

### What Could Break
| File | Risk | Likelihood | Mitigation |
|------|------|------------|------------|
| `task.controller.js` | Removing functions | Low | Identical to Phase 3 pattern |
| `task.route.js` | Import changes | Low | Only import source changes |
| New controllers | Missing imports | Low | Copy pattern from taskDocument.controller.js |

---

## Gold Standard Compliance

### Applicable Patterns
| Category | Pattern | How It Applies |
|----------|---------|----------------|
| Security | Multi-tenant isolation | All queries use `...req.firmQuery` |
| Security | IDOR protection | Use `findOne({ _id, ...req.firmQuery })` |
| Security | Mass assignment | `pickAllowedFields()` for template bodies |
| Reliability | Non-blocking logging | `QueueService` for activity logging |

### Not Applicable
| Pattern | Why N/A |
|---------|---------|
| OAuth state | No OAuth in template/attachment features |
| RFC 5545 | No calendar exports |
| External API retry | No external calls |

---

## User Stories

### 1. Extract Template Management Controller
As a developer, I want template-related functions in a separate controller so that I can maintain them independently.

**Current Location:** `task.controller.js` lines 1511-1918 (~400 lines)

**Functions to Extract:**
| Function | Lines | Purpose |
|----------|-------|---------|
| `getTemplates` | 1511-1536 | List task templates |
| `getTemplate` | 1537-1568 | Get single template |
| `createTemplate` | 1569-1638 | Create new template |
| `updateTemplate` | 1639-1681 | Update template |
| `deleteTemplate` | 1682-1708 | Delete template |
| `createFromTemplate` | 1709-1833 | Create task from template |
| `saveAsTemplate` | 1834-1918 | Save task as template |

**Acceptance Criteria:**
1. WHEN template functions are extracted THE SYSTEM SHALL maintain identical API contracts
2. WHEN `taskTemplate.controller.js` is created THE SYSTEM SHALL import shared utilities
3. WHEN routes are updated THE SYSTEM SHALL preserve all endpoint paths
4. WHEN `node --check` runs THE SYSTEM SHALL pass with no syntax errors

**Gold Standard Requirements:**
- THE SYSTEM SHALL use `...req.firmQuery` in all template queries
- THE SYSTEM SHALL use `pickAllowedFields()` for template bodies
- THE SYSTEM SHALL validate template IDs via `sanitizeObjectId()`

### 2. Extract Attachment Management Controller
As a developer, I want attachment-related functions in a separate controller so that file handling is isolated.

**Current Location:** `task.controller.js` scattered (~250 lines)

**Functions to Extract:**
| Function | Lines | Purpose |
|----------|-------|---------|
| `addAttachment` | 1919-2004 | Upload file to task |
| `deleteAttachment` | 2005-2079 | Remove attachment |
| `getAttachmentDownloadUrl` | 2657-2738 | Get signed download URL |
| `getAttachmentVersions` | 2739-2810 | List attachment versions |

**Acceptance Criteria:**
1. WHEN attachment functions are extracted THE SYSTEM SHALL maintain identical API contracts
2. WHEN `taskAttachment.controller.js` is created THE SYSTEM SHALL use existing S3 utilities
3. WHEN routes are updated THE SYSTEM SHALL preserve all endpoint paths
4. WHEN file upload fails THE SYSTEM SHALL return proper error message

**Gold Standard Requirements:**
- THE SYSTEM SHALL validate task exists before attachment operations
- THE SYSTEM SHALL use `...req.firmQuery` for all attachment queries
- THE SYSTEM SHALL block departed users from uploading attachments

---

## API Requirements

### Template Endpoints (taskTemplate.controller.js)
| Method | Endpoint | Handler |
|--------|----------|---------|
| GET | /templates | getTemplates |
| GET | /templates/:templateId | getTemplate |
| POST | /templates | createTemplate |
| PUT | /templates/:templateId | updateTemplate |
| PATCH | /templates/:templateId | updateTemplate |
| DELETE | /templates/:templateId | deleteTemplate |
| POST | /templates/:templateId/create | createFromTemplate |
| POST | /:id/save-as-template | saveAsTemplate |

### Attachment Endpoints (taskAttachment.controller.js)
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /:id/attachments | addAttachment |
| DELETE | /:id/attachments/:attachmentId | deleteAttachment |
| GET | /:id/attachments/:attachmentId/download-url | getAttachmentDownloadUrl |
| GET | /:id/attachments/:attachmentId/versions | getAttachmentVersions |

---

## Non-Functional Requirements

### Security (Gold Standard)
- THE SYSTEM SHALL maintain all existing firmId/lawyerId isolation
- THE SYSTEM SHALL preserve `req.isDeparted` checks for write operations
- THE SYSTEM SHALL validate file types before accepting uploads
- THE SYSTEM SHALL use signed URLs for S3 downloads

### Reliability (Gold Standard)
- WHEN S3 upload fails THE SYSTEM SHALL return 500 with clear message
- THE SYSTEM SHALL log errors via `logger.error()` with context
- THE SYSTEM SHALL NOT expose internal error details to client

### Code Quality
- THE SYSTEM SHALL maintain 100% backward compatibility
- THE SYSTEM SHALL pass `node scripts/verify-task-contract.js`
- THE SYSTEM SHALL have no circular dependencies between controllers

---

## File Structure After Phase 4

```
src/
├── controllers/
│   ├── task.controller.js           # Core CRUD, subtasks, comments, time (~2,200 lines)
│   ├── taskDocument.controller.js   # Document management (Phase 3)
│   ├── taskVoice.controller.js      # Voice/NLP features (Phase 3)
│   ├── taskTemplate.controller.js   # Template management (~400 lines) - NEW
│   └── taskAttachment.controller.js # Attachment handling (~250 lines) - NEW
├── routes/
│   └── task.route.js                # Main routes + imports from 4 controllers
└── services/
    └── task.service.js              # Shared helpers (Phase 2)
```

---

## Out of Scope

- Time tracking extraction (Phase 5)
- Subtask management extraction (Phase 5)
- Dependency/workflow extraction (Phase 6)
- Creating new API endpoints
- Changing request/response contracts

---

## Verification Plan

After implementation:
- [ ] `node --check src/controllers/task.controller.js` passes
- [ ] `node --check src/controllers/taskTemplate.controller.js` passes
- [ ] `node --check src/controllers/taskAttachment.controller.js` passes
- [ ] `node scripts/verify-task-contract.js` passes (23/23)
- [ ] All template endpoints work (manual test)
- [ ] All attachment endpoints work (manual test)
- [ ] No new lint errors

---

## Estimated Impact

| Metric | Before | After |
|--------|--------|-------|
| task.controller.js lines | 3,055 | ~2,200 |
| taskTemplate.controller.js | 0 | ~400 |
| taskAttachment.controller.js | 0 | ~250 |
| Total task controllers | 3 | 5 |
| Net reduction in main | - | ~855 lines |
