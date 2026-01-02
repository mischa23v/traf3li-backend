# Task Controller Refactoring - Phase 3 Requirements

## Overview

Split `task.controller.js` (4,278 lines) into domain-specific controllers to improve maintainability, reduce cognitive load, and enable parallel development.

**Scope:** Extract ~1,200 lines into 2 new controllers
**Risk Level:** Medium (requires route updates)

---

## Gold Standard Compliance

### Applicable Patterns
| Category | Pattern | How It Applies |
|----------|---------|----------------|
| Security | Multi-tenant isolation | All queries use `...req.firmQuery` |
| Security | IDOR protection | Use `findOne({ _id, ...req.firmQuery })` |
| Security | Mass assignment | `pickAllowedFields()` for all bodies |
| Reliability | Non-blocking logging | `QueueService` for activity logging |
| Data Integrity | Pre-save hooks | Use `.save()` for updates |

### Not Applicable
| Pattern | Why N/A |
|---------|---------|
| OAuth state | No OAuth in document/voice features |
| RFC 5545 | No calendar exports |

---

## User Stories

### 1. Extract Document Management Controller
As a developer, I want document-related functions in a separate controller so that I can maintain them independently.

**Current Location:** `task.controller.js` lines 2801-3530 (~730 lines)

**Functions to Extract:**
| Function | Lines | Purpose |
|----------|-------|---------|
| `createDocument` | 2809-2897 | Create in-task document |
| `getDocuments` | 2904-2958 | List task documents |
| `updateDocument` | 2960-3070 | Edit document content |
| `getDocument` | 3072-3153 | Get single document |
| `getDocumentVersions` | 3155-3220 | List document history |
| `getDocumentVersion` | 3317-3384 | Get specific version |
| `restoreDocumentVersion` | 3222-3315 | Restore previous version |

**Acceptance Criteria:**
1. WHEN document functions are extracted THE SYSTEM SHALL maintain identical API contracts
2. WHEN `taskDocument.controller.js` is created THE SYSTEM SHALL import shared utilities from task.service.js
3. WHEN routes are updated THE SYSTEM SHALL preserve all endpoint paths
4. WHEN `node --check` runs THE SYSTEM SHALL pass with no syntax errors

**Gold Standard Requirements:**
- THE SYSTEM SHALL use `...req.firmQuery` in all document queries
- THE SYSTEM SHALL use `pickAllowedFields()` for document bodies
- THE SYSTEM SHALL validate document IDs via `sanitizeObjectId()`

### 2. Extract Voice/NLP Controller
As a developer, I want voice/AI functions in a separate controller so that I can extend AI features independently.

**Current Location:** `task.controller.js` lines 3386-3977 (~590 lines)

**Functions to Extract:**
| Function | Lines | Purpose |
|----------|-------|---------|
| `addVoiceMemo` | 3386-3485 | Upload voice memo to task |
| `updateVoiceMemoTranscription` | 3487-3537 | Update memo transcription |
| `processVoiceToItem` | 3539-3625 | Convert voice to task/reminder/event |
| `batchProcessVoiceMemos` | 3631-3680 | Batch process voice memos |
| `createTaskFromNaturalLanguage` | 3682-3752 | Parse natural language to task |
| `createTaskFromVoice` | 3754-3826 | Create task from voice input |
| `getSmartScheduleSuggestions` | 3828-3903 | AI scheduling suggestions |
| `autoScheduleTasks` | 3905-3976 | Auto-schedule tasks |

**Acceptance Criteria:**
1. WHEN voice/NLP functions are extracted THE SYSTEM SHALL maintain identical API contracts
2. WHEN `taskVoice.controller.js` is created THE SYSTEM SHALL use existing voiceToTask.service.js
3. WHEN routes are updated THE SYSTEM SHALL preserve all endpoint paths
4. WHEN external AI services fail THE SYSTEM SHALL return graceful errors

**Gold Standard Requirements:**
- THE SYSTEM SHALL block departed users from creating items
- THE SYSTEM SHALL validate transcription input before processing
- THE SYSTEM SHALL use `logger.error()` for AI service failures

### 3. Update Task Routes
As a developer, I want routes split by domain so that route files are maintainable.

**Acceptance Criteria:**
1. WHEN document routes are extracted THE SYSTEM SHALL create `taskDocument.route.js`
2. WHEN voice routes are extracted THE SYSTEM SHALL create `taskVoice.route.js`
3. WHEN main task routes are updated THE SYSTEM SHALL import sub-routers
4. WHEN API is called THE SYSTEM SHALL return identical responses

---

## API Requirements

### Document Endpoints (taskDocument.controller.js)
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /:id/documents | createDocument |
| GET | /:id/documents | getDocuments |
| GET | /:id/documents/:documentId | getDocument |
| PATCH | /:id/documents/:documentId | updateDocument |
| GET | /:id/documents/:documentId/versions | getDocumentVersions |
| GET | /:id/documents/:documentId/versions/:versionId | getDocumentVersion |
| POST | /:id/documents/:documentId/versions/:versionId/restore | restoreDocumentVersion |

### Voice/NLP Endpoints (taskVoice.controller.js)
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /:id/voice-memos | addVoiceMemo |
| PATCH | /:id/voice-memos/:memoId/transcription | updateVoiceMemoTranscription |
| POST | /voice-to-item | processVoiceToItem |
| POST | /voice-to-item/batch | batchProcessVoiceMemos |
| POST | /parse | createTaskFromNaturalLanguage |
| POST | /voice | createTaskFromVoice |
| GET | /smart-schedule | getSmartScheduleSuggestions |
| POST | /auto-schedule | autoScheduleTasks |

---

## Non-Functional Requirements

### Security (Gold Standard)
- THE SYSTEM SHALL maintain all existing firmId/lawyerId isolation
- THE SYSTEM SHALL preserve `req.isDeparted` checks for write operations
- THE SYSTEM SHALL use `sanitizeRichText()` for document content
- THE SYSTEM SHALL validate `hasDangerousContent()` before saving

### Reliability (Gold Standard)
- WHEN AI service fails THE SYSTEM SHALL return 500 with clear message
- THE SYSTEM SHALL log errors via `logger.error()` with context
- THE SYSTEM SHALL NOT expose internal error details to client

### Code Quality
- THE SYSTEM SHALL maintain 100% backward compatibility
- THE SYSTEM SHALL pass `node scripts/verify-task-contract.js`
- THE SYSTEM SHALL have no circular dependencies between controllers

---

## File Structure After Phase 3

```
src/
├── controllers/
│   ├── task.controller.js        # Core CRUD, subtasks, comments, time (~2,800 lines)
│   ├── taskDocument.controller.js # Document management (~730 lines) - NEW
│   └── taskVoice.controller.js    # Voice/NLP features (~590 lines) - NEW
├── routes/
│   ├── task.route.js             # Main routes + sub-router imports
│   ├── taskDocument.route.js     # Document routes - NEW
│   └── taskVoice.route.js        # Voice routes - NEW
└── services/
    ├── task.service.js           # Shared helpers (Phase 2)
    └── voiceToTask.service.js    # Voice processing (existing)
```

---

## Out of Scope

- Template functions extraction (Phase 4)
- Attachment functions extraction (Phase 4)
- Time tracking extraction (Phase 5)
- Creating new API endpoints
- Changing request/response contracts

---

## Open Questions

1. ~~Should document controller be nested under task routes or separate?~~ → Nested (`:id/documents/*`)
2. ~~Should voice controller use same service pattern?~~ → Yes, use existing voiceToTask.service.js

---

## Verification Plan

After implementation:
- [ ] `node --check src/controllers/task.controller.js` passes
- [ ] `node --check src/controllers/taskDocument.controller.js` passes
- [ ] `node --check src/controllers/taskVoice.controller.js` passes
- [ ] `node scripts/verify-task-contract.js` passes
- [ ] All document endpoints work (manual test)
- [ ] All voice endpoints work (manual test)
- [ ] No new lint errors

---

## Estimated Impact

| Metric | Before | After |
|--------|--------|-------|
| task.controller.js lines | 4,278 | ~2,800 |
| taskDocument.controller.js | 0 | ~730 |
| taskVoice.controller.js | 0 | ~590 |
| Total controllers | 1 | 3 |
| Net reduction in main | - | ~1,478 lines |
