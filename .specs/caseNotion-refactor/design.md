# CaseNotion Controller Refactoring - Design Document

## Overview
Technical design for extracting caseNotion.controller.js (3,964 lines) into 5 domain-specific controllers.

**Requirements Document:** `.specs/caseNotion-refactor/requirements.md`
**API Contract:** `.specs/caseNotion-api-contract.md`

---

## 📋 Impact Analysis

### Files to CREATE (New)
| File | Purpose | Est. Lines |
|------|---------|------------|
| `src/utils/caseNotionHelpers.js` | Shared security helpers | ~150 |
| `src/controllers/caseNotionWhiteboard.controller.js` | Whiteboard/canvas features | ~1,500 |
| `src/controllers/caseNotionActivity.controller.js` | Comments, Activity, Search | ~400 |
| `src/controllers/caseNotionExport.controller.js` | PDF, Markdown, HTML export | ~200 |
| `src/controllers/caseNotionTemplate.controller.js` | Templates, Task linking | ~350 |

### Files to MODIFY (Existing)
| File | What Changes | Lines Affected | Risk |
|------|--------------|----------------|------|
| `src/controllers/caseNotion.controller.js` | Remove ~50 functions, update imports | ~3,100 lines removed | Medium |
| `src/routes/caseNotion.route.js` | Update imports, extract inline handlers | ~50 lines | Low |

### Files NOT Touched (Explicitly Safe)
| File | Why Safe |
|------|----------|
| `src/validators/caseNotion.validator.js` | Validators stay unchanged |
| `src/middlewares/caseNotion.middleware.js` | Middleware stays unchanged |
| `src/models/caseNotionPage.model.js` | Schema unchanged |
| `src/models/caseNotionBlock.model.js` | Schema unchanged |
| `src/models/blockConnection.model.js` | Schema unchanged |
| `src/services/caseNotion.service.js` | Service stays unchanged |

---

## ⚠️ Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Missing helper imports | Medium | High | Extract helpers first, verify all controllers compile |
| Circular dependencies | Low | High | Helpers in utils/, no cross-controller imports |
| Route import typo | Low | High | Verify with node --check after each change |
| Inline handlers not extracted | Medium | Medium | Track all 3 inline handlers explicitly |
| Verify functions missing | Low | High | Copy exact helper implementations |

### Rollback Plan
If something breaks:
1. All changes in separate commits per controller
2. Revert: `git revert <commit-hash>`
3. Baseline: `.specs/caseNotion-api-contract.md` has full specification
4. Current commit: `ebc55c7`

---

## Controller Implementations

### 1. caseNotionHelpers.js (Create First)

#### Required Imports
```javascript
const mongoose = require('mongoose');
const sanitizeHtml = require('sanitize-html');
const { sanitizeObjectId } = require('./securityUtils');
const Case = require('../models/case.model');
const CaseNotionPage = require('../models/caseNotionPage.model');
const CaseNotionBlock = require('../models/caseNotionBlock.model');
```

#### Functions to Include
| Function | From Lines | Purpose |
|----------|------------|---------|
| `sanitizeContent` | 30-44 | XSS prevention |
| `verifyCaseOwnership` | 49-75 | IDOR protection |
| `verifyPageOwnership` | 80-100 | IDOR protection |
| `verifyBlockOwnership` | 105-125 | IDOR protection |

#### Module Exports
```javascript
module.exports = {
    sanitizeContent,
    verifyCaseOwnership,
    verifyPageOwnership,
    verifyBlockOwnership
};
```

---

### 2. caseNotionWhiteboard.controller.js (Largest Extraction)

#### Required Imports
```javascript
const mongoose = require('mongoose');
const CaseNotionPage = require('../models/caseNotionPage.model');
const CaseNotionBlock = require('../models/caseNotionBlock.model');
const BlockConnection = require('../models/blockConnection.model');
const PageHistory = require('../models/pageHistory.model');
const PageActivity = require('../models/pageActivity.model');
const logger = require('../utils/logger');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const {
    sanitizeContent,
    verifyCaseOwnership,
    verifyPageOwnership,
    verifyBlockOwnership
} = require('../utils/caseNotionHelpers');
```

#### Functions to Extract (35 total)
| Group | Functions | Lines |
|-------|-----------|-------|
| Position/Size | updateBlockPosition, updateBlockSize, updateBlockColor, updateBlockPriority | 1909-2091 |
| Entity Linking | linkBlockToEvent, linkBlockToHearing, linkBlockToDocument, unlinkBlock | 2092-2275 |
| Connections | getConnections, createConnection, updateConnection, deleteConnection, updateConnectionPaths | 2276-2527 |
| View Mode | updateViewMode, updateWhiteboardConfig | 2528-2671 |
| Frames | addToFrame, removeFromFrame, getFrameChildren, autoDetectFrameChildren, moveFrameWithChildren | 2672-2921 |
| History | undo, redo, getHistoryStatus, recordHistory | 2922-3633 |
| Multi-Select | duplicateElements, bulkDeleteElements, groupElements, ungroupElements, alignElements, distributeElements | 3190-3623 |
| Shapes | createShape, createArrow, createFrame, updateZIndex, batchUpdateElements | 3634-end |
| Inline Route | updateBlockRotation, updateBlockOpacity, updateBlockStyle | (from route file) |

#### Module Exports
```javascript
module.exports = {
    // Position/Size
    updateBlockPosition,
    updateBlockSize,
    updateBlockColor,
    updateBlockPriority,

    // Entity Linking
    linkBlockToEvent,
    linkBlockToHearing,
    linkBlockToDocument,
    unlinkBlock,

    // Connections
    getConnections,
    createConnection,
    updateConnection,
    deleteConnection,
    updateConnectionPaths,

    // View Mode
    updateViewMode,
    updateWhiteboardConfig,

    // Frames
    addToFrame,
    removeFromFrame,
    getFrameChildren,
    autoDetectFrameChildren,
    moveFrameWithChildren,

    // History
    undo,
    redo,
    getHistoryStatus,
    recordHistory,

    // Multi-Select
    duplicateElements,
    bulkDeleteElements,
    groupElements,
    ungroupElements,
    alignElements,
    distributeElements,

    // Shapes
    createShape,
    createArrow,
    createFrame,
    updateZIndex,
    batchUpdateElements,

    // Inline (extracted from routes)
    updateBlockRotation,
    updateBlockOpacity,
    updateBlockStyle
};
```

---

### 3. caseNotionActivity.controller.js

#### Required Imports
```javascript
const mongoose = require('mongoose');
const CaseNotionPage = require('../models/caseNotionPage.model');
const CaseNotionBlock = require('../models/caseNotionBlock.model');
const BlockComment = require('../models/blockComment.model');
const PageActivity = require('../models/pageActivity.model');
const logger = require('../utils/logger');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const {
    sanitizeContent,
    verifyCaseOwnership,
    verifyPageOwnership,
    verifyBlockOwnership
} = require('../utils/caseNotionHelpers');
```

#### Functions to Extract (6 total)
| Function | Lines | Purpose |
|----------|-------|---------|
| `getComments` | 1379-1395 | List block comments |
| `addComment` | 1397-1436 | Add comment |
| `resolveComment` | 1438-1460 | Resolve comment |
| `deleteComment` | 1462-1485 | Delete comment |
| `getPageActivity` | 1487-1511 | Page activity log |
| `search` | 1513-1596 | Full-text search |

#### Module Exports
```javascript
module.exports = {
    getComments,
    addComment,
    resolveComment,
    deleteComment,
    getPageActivity,
    search
};
```

---

### 4. caseNotionExport.controller.js

#### Required Imports
```javascript
const CaseNotionPage = require('../models/caseNotionPage.model');
const CaseNotionBlock = require('../models/caseNotionBlock.model');
const logger = require('../utils/logger');
const { sanitizeObjectId } = require('../utils/securityUtils');
const { verifyCaseOwnership, verifyPageOwnership } = require('../utils/caseNotionHelpers');
```

#### Functions to Extract (3 total)
| Function | Lines | Purpose |
|----------|-------|---------|
| `exportPdf` | 1598-1625 | PDF export |
| `exportMarkdown` | 1627-1654 | Markdown export |
| `exportHtml` | 1656-1687 | HTML export |

#### Module Exports
```javascript
module.exports = {
    exportPdf,
    exportMarkdown,
    exportHtml
};
```

---

### 5. caseNotionTemplate.controller.js

#### Required Imports
```javascript
const mongoose = require('mongoose');
const CaseNotionPage = require('../models/caseNotionPage.model');
const CaseNotionBlock = require('../models/caseNotionBlock.model');
const PageTemplate = require('../models/pageTemplate.model');
const SyncedBlock = require('../models/syncedBlock.model');
const Task = require('../models/task.model');
const PageActivity = require('../models/pageActivity.model');
const logger = require('../utils/logger');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const {
    sanitizeContent,
    verifyCaseOwnership,
    verifyPageOwnership,
    verifyBlockOwnership
} = require('../utils/caseNotionHelpers');
```

#### Functions to Extract (9 total)
| Function | Lines | Purpose |
|----------|-------|---------|
| `getTemplates` | 1689-1718 | List templates |
| `applyTemplate` | 1720-1748 | Apply template |
| `saveAsTemplate` | 1750-1801 | Save as template |
| `linkTask` | 1803-1827 | Link task to block |
| `unlinkTask` | 1829-1853 | Unlink task |
| `createTaskFromBlock` | 1855-1907 | Create task from block |
| `createSyncedBlock` | 1274-1324 | Create synced block |
| `getSyncedBlock` | 1326-1342 | Get synced block |
| `unsyncBlock` | 1344-1377 | Unsync block |

#### Module Exports
```javascript
module.exports = {
    getTemplates,
    applyTemplate,
    saveAsTemplate,
    linkTask,
    unlinkTask,
    createTaskFromBlock,
    createSyncedBlock,
    getSyncedBlock,
    unsyncBlock
};
```

---

## Route Updates

### Current Imports (to REPLACE)
```javascript
const caseNotionController = require('../controllers/caseNotion.controller');
```

### New Imports (to ADD)
```javascript
// Core pages and blocks
const caseNotionController = require('../controllers/caseNotion.controller');

// Whiteboard features
const caseNotionWhiteboardController = require('../controllers/caseNotionWhiteboard.controller');

// Comments, Activity, Search
const caseNotionActivityController = require('../controllers/caseNotionActivity.controller');

// Export features
const caseNotionExportController = require('../controllers/caseNotionExport.controller');

// Templates and task linking
const caseNotionTemplateController = require('../controllers/caseNotionTemplate.controller');
```

### Routes to Update (Handler References)
| Current Handler | New Handler |
|-----------------|-------------|
| `caseNotionController.updateBlockPosition` | `caseNotionWhiteboardController.updateBlockPosition` |
| `caseNotionController.getComments` | `caseNotionActivityController.getComments` |
| `caseNotionController.exportPdf` | `caseNotionExportController.exportPdf` |
| `caseNotionController.getTemplates` | `caseNotionTemplateController.getTemplates` |
| (inline rotation handler) | `caseNotionWhiteboardController.updateBlockRotation` |
| (inline opacity handler) | `caseNotionWhiteboardController.updateBlockOpacity` |
| (inline style handler) | `caseNotionWhiteboardController.updateBlockStyle` |

---

## Testing Strategy

### Syntax Verification
```bash
node --check src/utils/caseNotionHelpers.js
node --check src/controllers/caseNotion.controller.js
node --check src/controllers/caseNotionWhiteboard.controller.js
node --check src/controllers/caseNotionActivity.controller.js
node --check src/controllers/caseNotionExport.controller.js
node --check src/controllers/caseNotionTemplate.controller.js
node --check src/routes/caseNotion.route.js
```

### Contract Verification
Compare against `.specs/caseNotion-api-contract.md`:
- [ ] All 71 endpoints respond correctly
- [ ] All 63 functions are exported from correct controllers
- [ ] All enum values unchanged
- [ ] All allowed fields unchanged
- [ ] Response shapes identical

### Manual Testing Priority
1. Page CRUD (create, get, update, delete)
2. Block CRUD (create, get, update, delete)
3. Whiteboard positioning (most complex)
4. Comments and search
5. Export functions
6. Template operations

---

## ✅ APPROVAL CHECKPOINT

Does this technical design look correct? Any concerns about the approach?

**Key points:**
- 63 functions extracted into 5 controllers + 1 helper file
- All security patterns preserved (IDOR, XSS, mass assignment)
- Route changes are handler reference updates only (no path changes)
- Follows Phase 4 pattern exactly
- Inline route handlers extracted to whiteboard controller

**DO NOT proceed to implementation until user explicitly approves**

---

## Requirement Traceability

| Requirement | Implementation |
|-------------|----------------|
| REQ-1: Shared helpers | caseNotionHelpers.js with 4 security functions |
| REQ-2: Extract Whiteboard | caseNotionWhiteboard.controller.js with 38 functions |
| REQ-3: Extract Activity | caseNotionActivity.controller.js with 6 functions |
| REQ-4: Extract Export | caseNotionExport.controller.js with 3 functions |
| REQ-5: Extract Templates | caseNotionTemplate.controller.js with 9 functions |
| REQ-6: Update routes | Import from 5 controllers, extract inline handlers |
| REQ-7: Maintain contracts | All endpoints and shapes unchanged |
