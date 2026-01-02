# Task Controller Refactoring Phase 4 - Design Document

## Overview
Technical design for extracting Template and Attachment management functions from `task.controller.js` into dedicated controllers.

**Requirements Document:** `.specs/task-refactor-phase4/requirements.md`

---

## 📋 Impact Analysis

### Files to CREATE (New)
| File | Purpose | Est. Lines |
|------|---------|------------|
| `src/controllers/taskTemplate.controller.js` | Template CRUD operations | ~400 |
| `src/controllers/taskAttachment.controller.js` | File attachment handling | ~250 |

### Files to MODIFY (Existing)
| File | What Changes | Lines Affected | Risk |
|------|--------------|----------------|------|
| `src/controllers/task.controller.js` | Remove 11 functions, update exports | ~650 lines removed | Low |
| `src/routes/task.route.js` | Update imports only | ~10 lines | Low |

### Files NOT Touched (Explicitly Safe)
| File | Why Safe |
|------|----------|
| `src/controllers/taskDocument.controller.js` | Separate domain (Phase 3) |
| `src/controllers/taskVoice.controller.js` | Separate domain (Phase 3) |
| `src/services/task.service.js` | No template/attachment helpers |
| `src/models/task.model.js` | Schema unchanged |

### Dependency Check
| Dependency | Status | Notes |
|------------|--------|-------|
| Task model | ✅ Exists | Used for templates (isTemplate: true) |
| S3 config | ✅ Exists | `taskUpload.js` for attachments |
| ALLOWED_FIELDS constants | ⚠️ Copy | Need to copy TEMPLATE_* and related |
| sanitizeObjectId | ✅ Exists | Import from securityUtils |

---

## ⚠️ Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Missing imports in new controllers | Low | Medium | Copy exact imports from task.controller.js |
| Route import path typo | Low | High | Verify with node --check |
| ALLOWED_FIELDS not copied | Low | High | Copy all TEMPLATE_* constants |
| Contract verification fails | Low | High | Run verify-task-contract.js |

### Rollback Plan
If something breaks:
1. All changes in separate commits per controller
2. Revert: `git revert <commit-hash>`
3. Files to restore: `task.controller.js`, `task.route.js`
4. Baseline commit: Run `git log -1 --oneline` before starting

---

## Architecture

### File Structure After Phase 4
```
src/
├── controllers/
│   ├── task.controller.js           # Core CRUD (~2,200 lines)
│   ├── taskDocument.controller.js   # Documents (Phase 3)
│   ├── taskVoice.controller.js      # Voice/NLP (Phase 3)
│   ├── taskTemplate.controller.js   # Templates (~400 lines) - NEW
│   └── taskAttachment.controller.js # Attachments (~250 lines) - NEW
└── routes/
    └── task.route.js                # Imports from 5 controllers
```

### Data Flow
```
Request → Route → Controller → Task Model → Database
                      ↓
              S3 (attachments only)
```

---

## Controller Implementations

### taskTemplate.controller.js

#### Required Imports
```javascript
const mongoose = require('mongoose');
const { Task, User, Case } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Constants (copy from task.controller.js)
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const ALLOWED_FIELDS = {
    TEMPLATE_CREATE: [
        'title', 'templateName', 'description', 'priority', 'label', 'tags',
        'subtasks', 'checklists', 'timeTracking', 'reminders', 'notes', 'isPublic'
    ],
    TEMPLATE_UPDATE: [
        'title', 'templateName', 'description', 'priority', 'label', 'tags',
        'subtasks', 'checklists', 'timeTracking', 'reminders', 'notes', 'isPublic'
    ],
    TEMPLATE_CREATE_TASK: ['title', 'dueDate', 'dueTime', 'assignedTo', 'caseId', 'clientId', 'notes'],
    SAVE_AS_TEMPLATE: ['templateName', 'isPublic']
};
```

#### Functions (7 total)
| Function | Lines | Security Patterns |
|----------|-------|-------------------|
| `getTemplates` | 1511-1531 | User-scoped query (createdBy OR isPublic) |
| `getTemplate` | 1537-1563 | sanitizeObjectId, User-scoped query |
| `createTemplate` | 1569-1633 | pickAllowedFields, priority validation |
| `updateTemplate` | 1639-1676 | sanitizeObjectId, pickAllowedFields, owner check |
| `deleteTemplate` | 1682-1703 | sanitizeObjectId, owner check |
| `createFromTemplate` | 1709-1828 | sanitizeObjectId × 4, firmId isolation |
| `saveAsTemplate` | 1834-1908 | sanitizeObjectId, firmId isolation, pickAllowedFields |

#### Module Exports
```javascript
module.exports = {
    getTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createFromTemplate,
    saveAsTemplate
};
```

---

### taskAttachment.controller.js

#### Required Imports
```javascript
const mongoose = require('mongoose');
const { Task, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { deleteFile, listFileVersions, logFileAccess } = require('../configs/s3');
const { isS3Configured, getTaskFilePresignedUrl } = require('../configs/taskUpload');
const { sanitizeObjectId } = require('../utils/securityUtils');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
```

#### Functions (4 total)
| Function | Lines | Security Patterns |
|----------|-------|-------------------|
| `addAttachment` | 1919-1998 | sanitizeObjectId, firmId isolation |
| `deleteAttachment` | 2005-2070 | sanitizeObjectId × 2, permission check |
| `getAttachmentDownloadUrl` | 2657-2732 | firmId/userId query, S3 presigned URL |
| `getAttachmentVersions` | 2739-2799 | firmId/userId query |

#### Module Exports
```javascript
module.exports = {
    addAttachment,
    deleteAttachment,
    getAttachmentDownloadUrl,
    getAttachmentVersions
};
```

---

## Route Updates

### task.route.js Changes

#### Current Import (lines 5-55)
```javascript
// Core task controller
const {
    createTask,
    // ... many functions ...
    getTemplates,          // REMOVE
    getTemplate,           // REMOVE
    createTemplate,        // REMOVE
    updateTemplate,        // REMOVE
    deleteTemplate,        // REMOVE
    createFromTemplate,    // REMOVE
    saveAsTemplate,        // REMOVE
    addAttachment,         // REMOVE
    deleteAttachment,      // REMOVE
    getAttachmentDownloadUrl,  // REMOVE
    getAttachmentVersions,     // REMOVE
    // ... remaining functions ...
} = require('../controllers/task.controller');
```

#### New Imports to Add
```javascript
// Template controller (extracted for maintainability)
const {
    getTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createFromTemplate,
    saveAsTemplate
} = require('../controllers/taskTemplate.controller');

// Attachment controller (extracted for maintainability)
const {
    addAttachment,
    deleteAttachment,
    getAttachmentDownloadUrl,
    getAttachmentVersions
} = require('../controllers/taskAttachment.controller');
```

#### Routes (No Changes Needed)
All existing routes remain unchanged - only import sources change.

---

## Security Considerations

### Multi-Tenant Isolation
- [x] Templates: User-scoped (createdBy) or public templates only
- [x] Attachments: firmId isolation OR userId fallback for solo lawyers
- [x] createFromTemplate: Validates assignedTo/caseId belong to firm

### Input Validation
- [x] All ObjectIds validated via `sanitizeObjectId()`
- [x] Request body filtered via `pickAllowedFields()`
- [x] Priority values validated against VALID_PRIORITIES

### Permission Checks
- [x] updateTemplate: Only creator can update
- [x] deleteTemplate: Only creator can delete
- [x] deleteAttachment: Only uploader OR task creator can delete

---

## Requirement Traceability

| Requirement | Implementation |
|-------------|----------------|
| REQ-1: Extract Template functions | taskTemplate.controller.js with 7 functions |
| REQ-2: Extract Attachment functions | taskAttachment.controller.js with 4 functions |
| REQ-3: Update routes | task.route.js imports from new controllers |
| REQ-4: Maintain API contracts | All endpoints unchanged |
| REQ-5: Pass verification | node --check + verify-task-contract.js |

---

## Testing Strategy

### Syntax Verification
```bash
node --check src/controllers/task.controller.js
node --check src/controllers/taskTemplate.controller.js
node --check src/controllers/taskAttachment.controller.js
node --check src/routes/task.route.js
```

### Contract Verification
```bash
node scripts/verify-task-contract.js
# Expected: 23/23 passed
```

### Manual Testing
- [ ] GET /api/tasks/templates - List templates
- [ ] POST /api/tasks/templates - Create template
- [ ] GET /api/tasks/templates/:id - Get template
- [ ] PUT /api/tasks/templates/:id - Update template
- [ ] DELETE /api/tasks/templates/:id - Delete template
- [ ] POST /api/tasks/templates/:id/create - Create from template
- [ ] POST /api/tasks/:id/save-as-template - Save as template
- [ ] POST /api/tasks/:id/attachments - Upload file
- [ ] DELETE /api/tasks/:id/attachments/:attachmentId - Delete file
- [ ] GET /api/tasks/:id/attachments/:attachmentId/download-url - Get URL
- [ ] GET /api/tasks/:id/attachments/:attachmentId/versions - List versions

---

## ✅ APPROVAL CHECKPOINT

Does this technical design look correct? Any concerns about the approach?

**Key points:**
- 11 functions extracted into 2 new controllers
- All security patterns preserved (firmId, sanitizeObjectId, pickAllowedFields)
- Route changes are import-only (no path changes)
- Follows Phase 3 pattern exactly

**DO NOT proceed to `/complete-phase` until user explicitly approves**
