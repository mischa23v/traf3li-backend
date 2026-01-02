# CaseNotion Controller Refactoring - Requirements

## Overview

Split `caseNotion.controller.js` (3,964 lines, 63 functions) into domain-specific controllers for maintainability.

**Scope:** Extract ~3,200 lines into 4-5 new controllers
**Scale:** Large (10+ files affected)
**Risk Level:** Medium (many interconnected functions, follows Phase 4 pattern)

---

## 🧠 Reasoning (Thinking Out Loud)

### What I Analyzed
- `caseNotion.controller.js` → 63 exported functions, 3,964 lines
- Functions are naturally grouped by domain:
  - Page CRUD (11 functions, ~500 lines)
  - Block CRUD (7 functions, ~400 lines)
  - Whiteboard features (22 functions, ~1,500 lines)
  - Comments, Search, Export, Templates (16 functions, ~600 lines)
  - Synced blocks, Task linking, Activity (7 functions, ~350 lines)

### Decisions Made
| Decision | Why | Alternatives Considered |
|----------|-----|-------------------------|
| Extract Whiteboard first | Largest domain (1,500+ lines), self-contained | Pages first (smaller, safer) |
| Keep Pages/Blocks together | Pages own blocks, tightly coupled queries | Separate files (rejected: too fragmented) |
| Group Comments/Activity/Search | Similar utility patterns | Separate each (rejected: too many files) |
| Keep route imports in single file | Same pattern as task refactoring | Separate route files (rejected: over-engineering) |

### What Could Break
| File | Risk | Likelihood | Mitigation |
|------|------|------------|------------|
| `caseNotion.controller.js` | Removing functions | Low | Identical to Phase 4 pattern |
| `caseNotion.route.js` | Import changes | Low | Only import source changes |
| New controllers | Missing helper functions | Medium | Copy security helpers to shared file |
| Inline route handlers | Currently in route file | Medium | Extract to controller |

---

## Gold Standard Compliance

### Applicable Patterns
| Category | Pattern | How It Applies |
|----------|---------|----------------|
| Security | Multi-tenant isolation | All queries use firmId/lawyerId checks |
| Security | IDOR protection | verifyCaseOwnership, verifyPageOwnership, verifyBlockOwnership |
| Security | Mass assignment | `pickAllowedFields()` on all create/update |
| Security | XSS prevention | `sanitizeContent()` on text fields |
| Security | ReDoS prevention | `escapeRegex()` on search queries |

### Helper Functions to Share
These security helpers are used across all domains and should be moved to a shared utility:
```javascript
// src/utils/caseNotionHelpers.js
- sanitizeContent()
- verifyCaseOwnership()
- verifyPageOwnership()
- verifyBlockOwnership()
- escapeRegex() // Already in securityUtils
```

---

## Proposed File Structure

```
src/
├── controllers/
│   ├── caseNotion.controller.js        # Core pages/blocks (~800 lines) - REFACTORED
│   ├── caseNotionWhiteboard.controller.js  # Whiteboard features (~1,200 lines) - NEW
│   ├── caseNotionActivity.controller.js    # Comments, Activity, Search (~400 lines) - NEW
│   ├── caseNotionExport.controller.js      # PDF, Markdown, HTML export (~200 lines) - NEW
│   └── caseNotionTemplate.controller.js    # Templates, Task linking (~350 lines) - NEW
├── routes/
│   └── caseNotion.route.js             # Imports from 5 controllers - MODIFIED
└── utils/
    └── caseNotionHelpers.js            # Shared security helpers - NEW
```

---

## User Stories

### 1. Extract Whiteboard Features
As a developer, I want whiteboard-related functions in a separate controller for easier maintenance.

**Functions to Extract (22 total, ~1,500 lines):**
| Function | Lines | Purpose |
|----------|-------|---------|
| `updateBlockPosition` | 1909-1951 | Canvas X/Y positioning |
| `updateBlockSize` | 1952-2003 | Canvas width/height |
| `updateBlockColor` | 2004-2045 | Block colors |
| `updateBlockPriority` | 2046-2091 | Priority levels |
| `linkBlockToEvent` | 2092-2139 | Event linking |
| `linkBlockToHearing` | 2140-2187 | Hearing linking |
| `linkBlockToDocument` | 2188-2235 | Document linking |
| `unlinkBlock` | 2236-2275 | Unlink entities |
| `getConnections` | 2276-2294 | List connections |
| `createConnection` | 2295-2407 | Create connection |
| `updateConnection` | 2408-2442 | Update connection |
| `deleteConnection` | 2443-2499 | Delete connection |
| `updateConnectionPaths` | 2500-2527 | Recalculate paths |
| `updateViewMode` | 2528-2624 | Toggle document/whiteboard |
| `updateWhiteboardConfig` | 2625-2671 | Grid, snap, zoom |
| `addToFrame` | 2672-2713 | Add to frame |
| `removeFromFrame` | 2714-2743 | Remove from frame |
| `getFrameChildren` | 2744-2769 | List frame children |
| `autoDetectFrameChildren` | 2770-2812 | Auto-detect bounds |
| `moveFrameWithChildren` | 2813-2921 | Move group |
| `undo` | 2922-3045 | Undo operation |
| `redo` | 3046-3154 | Redo operation |
| `getHistoryStatus` | 3155-3189 | History state |
| `duplicateElements` | 3190-3236 | Duplicate selected |
| `bulkDeleteElements` | 3237-3295 | Bulk delete |
| `groupElements` | 3296-3335 | Group selection |
| `ungroupElements` | 3336-3362 | Ungroup |
| `alignElements` | 3363-3475 | Align elements |
| `distributeElements` | 3476-3623 | Distribute evenly |
| `recordHistory` | 3624-3633 | Record history entry |
| `createShape` | 3634-3706 | Create shape |
| `createArrow` | 3707-3792 | Create arrow |
| `createFrame` | 3793-3838 | Create frame |
| `updateZIndex` | 3839-3907 | Z-index control |
| `batchUpdateElements` | 3908-end | Batch update |

**Acceptance Criteria:**
1. WHEN whiteboard functions are extracted THE SYSTEM SHALL maintain identical API contracts
2. WHEN `caseNotionWhiteboard.controller.js` is created THE SYSTEM SHALL import shared helpers
3. WHEN routes are updated THE SYSTEM SHALL preserve all endpoint paths

### 2. Extract Activity Features
As a developer, I want activity-related functions grouped together.

**Functions to Extract (~400 lines):**
| Function | Purpose |
|----------|---------|
| `getComments` | List block comments |
| `addComment` | Add comment |
| `resolveComment` | Resolve comment |
| `deleteComment` | Delete comment |
| `getPageActivity` | Page activity log |
| `search` | Full-text search |

### 3. Extract Export Features
As a developer, I want export functions isolated for maintainability.

**Functions to Extract (~200 lines):**
| Function | Purpose |
|----------|---------|
| `exportPdf` | PDF export |
| `exportMarkdown` | Markdown export |
| `exportHtml` | HTML export |

### 4. Extract Template Features
As a developer, I want template and task-linking functions grouped.

**Functions to Extract (~350 lines):**
| Function | Purpose |
|----------|---------|
| `getTemplates` | List templates |
| `applyTemplate` | Apply template to page |
| `saveAsTemplate` | Save page as template |
| `linkTask` | Link task to block |
| `unlinkTask` | Unlink task from block |
| `createTaskFromBlock` | Create task from block content |
| `createSyncedBlock` | Create synced block |
| `getSyncedBlock` | Get synced block |
| `unsyncBlock` | Unsync block |

### 5. Keep Core CRUD in Main Controller
The main controller will keep page and block CRUD (~800 lines):

**Functions to Keep:**
| Function | Purpose |
|----------|---------|
| `listCasesWithNotion` | Dashboard list |
| `listPages` | List pages |
| `getPage` | Get page with blocks |
| `createPage` | Create page |
| `updatePage` | Update page |
| `deletePage` | Soft delete |
| `archivePage` | Archive page |
| `restorePage` | Restore page |
| `duplicatePage` | Duplicate page |
| `toggleFavorite` | Toggle favorite |
| `togglePin` | Toggle pin |
| `mergePages` | Merge pages |
| `getBlocks` | List blocks |
| `createBlock` | Create block |
| `updateBlock` | Update block |
| `deleteBlock` | Delete block |
| `moveBlock` | Move block |
| `lockBlock` | Lock for editing |
| `unlockBlock` | Unlock |

---

## Route Updates

### Inline Route Handlers to Extract
The route file has 3 inline handlers that should be moved to controller:
```javascript
// Lines 487-518: rotation handler
// Lines 524-558: opacity handler
// Lines 563-595: style handler
```

These should be added to `caseNotionWhiteboard.controller.js`:
- `updateBlockRotation`
- `updateBlockOpacity`
- `updateBlockStyle`

---

## Security Considerations

### Shared Helper File
Create `src/utils/caseNotionHelpers.js` with:
```javascript
const { pickAllowedFields, sanitizeObjectId } = require('./securityUtils');
const sanitizeHtml = require('sanitize-html');

// Sanitize HTML content to prevent XSS
const sanitizeContent = (content) => { ... };

// Verify case ownership - IDOR protection
const verifyCaseOwnership = async (caseId, user) => { ... };

// Verify page ownership - IDOR protection
const verifyPageOwnership = async (pageId, user) => { ... };

// Verify block ownership - IDOR protection
const verifyBlockOwnership = async (blockId, user) => { ... };

module.exports = {
    sanitizeContent,
    verifyCaseOwnership,
    verifyPageOwnership,
    verifyBlockOwnership
};
```

---

## Non-Functional Requirements

### Security (Gold Standard)
- THE SYSTEM SHALL maintain all existing firmId/lawyerId isolation
- THE SYSTEM SHALL preserve all IDOR protection patterns
- THE SYSTEM SHALL validate all ObjectIds via `sanitizeObjectId()`
- THE SYSTEM SHALL sanitize all HTML content via `sanitizeContent()`

### Reliability
- THE SYSTEM SHALL maintain 100% backward compatibility
- THE SYSTEM SHALL pass all syntax checks (`node --check`)
- THE SYSTEM SHALL have no circular dependencies

### Code Quality
- THE SYSTEM SHALL follow existing patterns from Phase 4
- THE SYSTEM SHALL use consistent error response format
- THE SYSTEM SHALL log errors via `logger.error()` with context

---

## Verification Plan

After implementation:
- [ ] `node --check src/controllers/caseNotion.controller.js` passes
- [ ] `node --check src/controllers/caseNotionWhiteboard.controller.js` passes
- [ ] `node --check src/controllers/caseNotionActivity.controller.js` passes
- [ ] `node --check src/controllers/caseNotionExport.controller.js` passes
- [ ] `node --check src/controllers/caseNotionTemplate.controller.js` passes
- [ ] `node --check src/routes/caseNotion.route.js` passes
- [ ] All 71 endpoints respond correctly
- [ ] No new lint errors

---

## Estimated Impact

| Metric | Before | After |
|--------|--------|-------|
| caseNotion.controller.js lines | 3,964 | ~800 |
| caseNotionWhiteboard.controller.js | 0 | ~1,500 |
| caseNotionActivity.controller.js | 0 | ~400 |
| caseNotionExport.controller.js | 0 | ~200 |
| caseNotionTemplate.controller.js | 0 | ~350 |
| caseNotionHelpers.js | 0 | ~150 |
| Total controllers | 1 | 5 |
| Net reduction in main | - | ~3,164 lines |

---

## Phased Implementation

### Phase 1: Create Shared Helpers
1. Create `src/utils/caseNotionHelpers.js`
2. Move security helpers from controller
3. Update controller to import from helpers

### Phase 2: Extract Whiteboard Controller
1. Create `caseNotionWhiteboard.controller.js`
2. Move 30+ whiteboard functions
3. Extract inline route handlers
4. Update route imports

### Phase 3: Extract Activity/Export/Template Controllers
1. Create remaining 3 controllers
2. Move functions to respective controllers
3. Update route imports

### Phase 4: Cleanup
1. Remove extracted functions from main controller
2. Verify all endpoints
3. Run contract verification

---

## Out of Scope

- Changing API contracts
- Modifying Joi validators
- Creating new API endpoints
- Changing request/response shapes
- Database schema changes

---

## Rollback Plan

If something breaks:
1. All changes in separate commits per controller
2. Revert: `git revert <commit-hash>`
3. Files to restore: `caseNotion.controller.js`, `caseNotion.route.js`
4. Baseline commit: `ebc55c7` (API contract created)
