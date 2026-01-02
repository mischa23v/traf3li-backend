# CaseNotion API Contract

**Generated:** 2026-01-02
**Purpose:** Verify refactoring doesn't break frontend expectations

---

## Valid Enum Values

### Page Types
```javascript
['general', 'strategy', 'timeline', 'evidence', 'arguments', 'research',
 'meeting_notes', 'correspondence', 'witnesses', 'discovery', 'pleadings',
 'settlement', 'brainstorm']
```

### Block Types
```javascript
['text', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list', 'numbered_list',
 'todo', 'toggle', 'quote', 'callout', 'divider', 'code', 'table', 'image',
 'file', 'bookmark', 'embed', 'synced_block', 'template', 'column_list',
 'column', 'link_to_page', 'mention', 'equation', 'timeline_entry',
 'party_statement', 'evidence_item', 'legal_citation']
```

### Block Colors
```javascript
['default', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray']
```

### Priority Levels
```javascript
['low', 'medium', 'high', 'urgent']
```

### Shape Types (Whiteboard)
```javascript
['note', 'rectangle', 'ellipse', 'diamond', 'triangle', 'hexagon',
 'star', 'arrow', 'line', 'sticky', 'frame', 'image', 'embed', 'text_shape']
```

### Fill Styles (Whiteboard)
```javascript
['solid', 'hachure', 'cross-hatch', 'none']
```

### Arrow Head Types
```javascript
['none', 'arrow', 'triangle', 'circle', 'diamond', 'bar']
```

### Handle Positions
```javascript
['top', 'right', 'bottom', 'left', 'center']
```

### Path Types (Connections)
```javascript
['straight', 'bezier', 'smoothstep', 'step']
```

### Party Types (Legal)
```javascript
['plaintiff', 'defendant', 'witness', 'expert', 'judge']
```

### Evidence Types (Legal)
```javascript
['document', 'testimony', 'physical', 'digital', 'expert_opinion']
```

### Citation Types (Legal)
```javascript
['law', 'regulation', 'case_precedent', 'legal_principle']
```

---

## Allowed Request Body Fields

### POST /cases/:caseId/notion/pages (Create Page)
```javascript
['title', 'titleAr', 'pageType', 'icon', 'cover', 'parentPageId', 'templateId']
```

### PATCH /cases/:caseId/notion/pages/:pageId (Update Page)
```javascript
['title', 'titleAr', 'pageType', 'icon', 'cover', 'isFavorite', 'isPinned',
 'viewMode', 'whiteboardConfig', 'gridSize', 'snapToGrid', 'showGrid']
```

### POST /cases/:caseId/notion/pages/:pageId/blocks (Create Block)
```javascript
['type', 'content', 'properties', 'parentId', 'afterBlockId', 'canvasX',
 'canvasY', 'canvasWidth', 'canvasHeight', 'blockColor', 'checked', 'language',
 'icon', 'color', 'tableData', 'fileUrl', 'fileName', 'caption', 'indent']
```

### PATCH /cases/:caseId/notion/blocks/:blockId (Update Block)
```javascript
['content', 'type', 'order', 'indent', 'isCollapsed', 'checked', 'language',
 'icon', 'color', 'tableData', 'fileUrl', 'fileName', 'caption', 'canvasX',
 'canvasY', 'canvasWidth', 'canvasHeight', 'blockColor', 'priority',
 'linkedEventId', 'linkedTaskId', 'linkedHearingId', 'linkedDocumentId',
 'groupId', 'groupName', 'partyType', 'statementDate', 'evidenceType',
 'evidenceDate', 'evidenceSource', 'citationType', 'citationReference',
 'eventDate', 'eventType', 'properties']
```

### POST /cases/:caseId/notion/blocks/:blockId/move (Move Block)
```javascript
['targetPageId', 'afterBlockId', 'parentId', 'newOrder']
```

### POST /cases/:caseId/notion/pages/merge (Merge Pages)
```javascript
['sourcePageIds', 'targetTitle', 'deleteSourcePages']
```

### POST /cases/:caseId/notion/blocks/:blockId/comments (Add Comment)
```javascript
['content', 'parentCommentId', 'mentions']
```

### POST /cases/:caseId/notion/blocks/:blockId/link-task (Link Task)
```javascript
['taskId']
```

### POST /cases/:caseId/notion/pages/:pageId/apply-template (Apply Template)
```javascript
['templateId']
```

### POST /cases/:caseId/notion/pages/:pageId/shapes (Create Shape)
```javascript
['shapeType', 'x', 'y', 'width', 'height', 'angle', 'opacity', 'strokeColor',
 'strokeWidth', 'fillStyle', 'blockColor', 'text', 'roughness', 'handles']
```

### POST /cases/:caseId/notion/pages/:pageId/arrows (Create Arrow)
```javascript
['startX', 'startY', 'endX', 'endY', 'startType', 'endType', 'strokeColor',
 'strokeWidth', 'sourceBlockId', 'targetBlockId', 'sourceHandle', 'targetHandle']
```

### POST /cases/:caseId/notion/pages/:pageId/frames (Create Frame)
```javascript
['x', 'y', 'width', 'height', 'name', 'backgroundColor']
```

### PATCH /cases/:caseId/notion/blocks/:blockId/z-index (Update Z-Index)
```javascript
['action']  // Values: 'front', 'back', 'forward', 'backward'
```

### PATCH /cases/:caseId/notion/pages/:pageId/batch-update (Batch Update)
```javascript
{
    updates: [{
        id: 'ObjectId',
        changes: {
            canvasX, canvasY, canvasWidth, canvasHeight, angle, opacity
        }
    }]
}
```

### POST /cases/:caseId/notion/pages/:pageId/connections (Create Connection)
```javascript
['sourceBlockId', 'targetBlockId', 'sourceHandle', 'targetHandle',
 'connectionType', 'pathType', 'label', 'color', 'strokeWidth', 'animated',
 'markerStart', 'markerEnd']
```

### PATCH /cases/:caseId/notion/blocks/:blockId/style (Update Style)
```javascript
['strokeColor', 'strokeWidth', 'fillStyle', 'roughness']
```

### PATCH /cases/:caseId/notion/blocks/:blockId/rotation (Update Rotation)
```javascript
['angle']  // 0 to 2*PI radians
```

### PATCH /cases/:caseId/notion/blocks/:blockId/opacity (Update Opacity)
```javascript
['opacity']  // 0 to 100
```

---

## API Endpoints

### Case List (Dashboard)
| Method | Endpoint | Handler |
|--------|----------|---------|
| GET | /notion/cases | listCasesWithNotion |

### Page Operations
| Method | Endpoint | Handler |
|--------|----------|---------|
| GET | /cases/:caseId/notion/pages | listPages |
| GET | /cases/:caseId/notion/pages/:pageId | getPage |
| POST | /cases/:caseId/notion/pages | createPage |
| PATCH | /cases/:caseId/notion/pages/:pageId | updatePage |
| DELETE | /cases/:caseId/notion/pages/:pageId | deletePage |
| POST | /cases/:caseId/notion/pages/:pageId/archive | archivePage |
| POST | /cases/:caseId/notion/pages/:pageId/restore | restorePage |
| POST | /cases/:caseId/notion/pages/:pageId/duplicate | duplicatePage |
| POST | /cases/:caseId/notion/pages/:pageId/favorite | toggleFavorite |
| POST | /cases/:caseId/notion/pages/:pageId/pin | togglePin |
| POST | /cases/:caseId/notion/pages/merge | mergePages |

### Block Operations
| Method | Endpoint | Handler |
|--------|----------|---------|
| GET | /cases/:caseId/notion/pages/:pageId/blocks | getBlocks |
| POST | /cases/:caseId/notion/pages/:pageId/blocks | createBlock |
| PATCH | /cases/:caseId/notion/blocks/:blockId | updateBlock |
| DELETE | /cases/:caseId/notion/blocks/:blockId | deleteBlock |
| POST | /cases/:caseId/notion/blocks/:blockId/move | moveBlock |
| POST | /cases/:caseId/notion/blocks/:blockId/lock | lockBlock |
| POST | /cases/:caseId/notion/blocks/:blockId/unlock | unlockBlock |

### Synced Blocks
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /cases/:caseId/notion/synced-blocks | createSyncedBlock |
| GET | /cases/:caseId/notion/synced-blocks/:blockId | getSyncedBlock |
| POST | /cases/:caseId/notion/synced-blocks/:blockId/unsync | unsyncBlock |

### Comments
| Method | Endpoint | Handler |
|--------|----------|---------|
| GET | /cases/:caseId/notion/blocks/:blockId/comments | getComments |
| POST | /cases/:caseId/notion/blocks/:blockId/comments | addComment |
| POST | /cases/:caseId/notion/comments/:commentId/resolve | resolveComment |
| DELETE | /cases/:caseId/notion/comments/:commentId | deleteComment |

### Activity & Search
| Method | Endpoint | Handler |
|--------|----------|---------|
| GET | /cases/:caseId/notion/pages/:pageId/activity | getPageActivity |
| GET | /cases/:caseId/notion/search | search |

### Export
| Method | Endpoint | Handler |
|--------|----------|---------|
| GET | /cases/:caseId/notion/pages/:pageId/export/pdf | exportPdf |
| GET | /cases/:caseId/notion/pages/:pageId/export/markdown | exportMarkdown |
| GET | /cases/:caseId/notion/pages/:pageId/export/html | exportHtml |

### Templates
| Method | Endpoint | Handler |
|--------|----------|---------|
| GET | /notion/templates | getTemplates |
| POST | /cases/:caseId/notion/pages/:pageId/apply-template | applyTemplate |
| POST | /cases/:caseId/notion/pages/:pageId/save-as-template | saveAsTemplate |

### Task Linking
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /cases/:caseId/notion/blocks/:blockId/link-task | linkTask |
| POST | /cases/:caseId/notion/blocks/:blockId/unlink-task | unlinkTask |
| POST | /cases/:caseId/notion/blocks/:blockId/create-task | createTaskFromBlock |

### Whiteboard - Position/Size/Styling
| Method | Endpoint | Handler |
|--------|----------|---------|
| PATCH | /cases/:caseId/notion/blocks/:blockId/position | updateBlockPosition |
| PATCH | /cases/:caseId/notion/blocks/:blockId/size | updateBlockSize |
| PATCH | /cases/:caseId/notion/blocks/:blockId/color | updateBlockColor |
| PATCH | /cases/:caseId/notion/blocks/:blockId/priority | updateBlockPriority |
| PATCH | /cases/:caseId/notion/blocks/:blockId/rotation | (inline handler) |
| PATCH | /cases/:caseId/notion/blocks/:blockId/opacity | (inline handler) |
| PATCH | /cases/:caseId/notion/blocks/:blockId/style | (inline handler) |

### Whiteboard - Entity Linking
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /cases/:caseId/notion/blocks/:blockId/link-event | linkBlockToEvent |
| POST | /cases/:caseId/notion/blocks/:blockId/link-hearing | linkBlockToHearing |
| POST | /cases/:caseId/notion/blocks/:blockId/link-document | linkBlockToDocument |
| DELETE | /cases/:caseId/notion/blocks/:blockId/unlink | unlinkBlock |

### Whiteboard - Connections
| Method | Endpoint | Handler |
|--------|----------|---------|
| GET | /cases/:caseId/notion/pages/:pageId/connections | getConnections |
| POST | /cases/:caseId/notion/pages/:pageId/connections | createConnection |
| PATCH | /cases/:caseId/notion/connections/:connectionId | updateConnection |
| DELETE | /cases/:caseId/notion/connections/:connectionId | deleteConnection |

### Whiteboard - View Mode
| Method | Endpoint | Handler |
|--------|----------|---------|
| PATCH | /cases/:caseId/notion/pages/:pageId/view-mode | updateViewMode |
| PATCH | /cases/:caseId/notion/pages/:pageId/whiteboard-config | updateWhiteboardConfig |

### Whiteboard - Shapes
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /cases/:caseId/notion/pages/:pageId/shapes | createShape |
| POST | /cases/:caseId/notion/pages/:pageId/arrows | createArrow |
| POST | /cases/:caseId/notion/pages/:pageId/frames | createFrame |
| PATCH | /cases/:caseId/notion/blocks/:blockId/z-index | updateZIndex |
| PATCH | /cases/:caseId/notion/pages/:pageId/batch-update | batchUpdateElements |
| GET | /cases/:caseId/notion/blocks/:blockId/connections | updateConnectionPaths |

### Whiteboard - Frame Management
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /cases/:caseId/notion/frames/:frameId/children | addToFrame |
| DELETE | /cases/:caseId/notion/frames/:frameId/children/:elementId | removeFromFrame |
| GET | /cases/:caseId/notion/frames/:frameId/children | getFrameChildren |
| POST | /cases/:caseId/notion/frames/:frameId/auto-detect | autoDetectFrameChildren |
| PATCH | /cases/:caseId/notion/frames/:frameId/move | moveFrameWithChildren |

### Undo/Redo
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /cases/:caseId/notion/pages/:pageId/undo | undo |
| POST | /cases/:caseId/notion/pages/:pageId/redo | redo |
| GET | /cases/:caseId/notion/pages/:pageId/history-status | getHistoryStatus |

### Multi-Select Operations
| Method | Endpoint | Handler |
|--------|----------|---------|
| POST | /cases/:caseId/notion/pages/:pageId/duplicate | duplicateElements |
| DELETE | /cases/:caseId/notion/pages/:pageId/bulk-delete | bulkDeleteElements |
| POST | /cases/:caseId/notion/pages/:pageId/group | groupElements |
| POST | /cases/:caseId/notion/pages/:pageId/ungroup | ungroupElements |
| POST | /cases/:caseId/notion/pages/:pageId/align | alignElements |
| POST | /cases/:caseId/notion/pages/:pageId/distribute | distributeElements |

---

## Response Shapes

### Success Response
```json
{
    "success": true,
    "data": { ... }
}
```

### Error Response
```json
{
    "error": true,
    "message": "Error message"
}
```

### Page Object Shape
```json
{
    "_id": "ObjectId",
    "caseId": "ObjectId",
    "title": "string",
    "titleAr": "string (optional)",
    "pageType": "general|strategy|timeline|evidence|...",
    "icon": { "type": "emoji|file|external", "emoji": "...", "url": "..." },
    "cover": { "type": "external|file|gradient", "url": "...", "gradient": "..." },
    "parentPageId": "ObjectId (optional)",
    "childPageIds": ["ObjectId"],
    "isFavorite": false,
    "isPinned": false,
    "isArchived": false,
    "viewMode": "document|whiteboard",
    "whiteboardConfig": { ... },
    "version": 1,
    "firmId": "ObjectId",
    "lawyerId": "ObjectId",
    "createdBy": { "_id": "...", "firstName": "...", "lastName": "..." },
    "lastEditedBy": { "_id": "...", "firstName": "...", "lastName": "..." },
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
}
```

### Block Object Shape
```json
{
    "_id": "ObjectId",
    "pageId": "ObjectId",
    "type": "text|heading_1|heading_2|...",
    "content": "array|string",
    "properties": {},
    "order": 0,
    "indent": 0,
    "checked": false,
    "isCollapsed": false,
    "language": "string (for code blocks)",
    "icon": "string",
    "color": "string",
    "tableData": {},
    "fileUrl": "string",
    "fileName": "string",
    "caption": "string",
    "canvasX": 0,
    "canvasY": 0,
    "canvasWidth": 200,
    "canvasHeight": 150,
    "angle": 0,
    "opacity": 100,
    "zIndex": "a0",
    "shapeType": "note|rectangle|...",
    "strokeColor": "#000000",
    "strokeWidth": 2,
    "fillStyle": "solid|hachure|...",
    "blockColor": "default|red|...",
    "priority": "low|medium|high|urgent",
    "handles": [{ "id": "top", "position": "top", "type": "both" }],
    "boundElements": [],
    "groupId": "string",
    "groupName": "string",
    "linkedTaskId": "ObjectId",
    "linkedEventId": "ObjectId",
    "linkedHearingId": "ObjectId",
    "linkedDocumentId": "ObjectId",
    "lockedBy": "ObjectId",
    "lockedAt": "ISO date",
    "lastEditedBy": { "_id": "...", "firstName": "...", "lastName": "..." },
    "lastEditedAt": "ISO date",
    "version": 1
}
```

### Connection Object Shape
```json
{
    "_id": "ObjectId",
    "pageId": "ObjectId",
    "sourceBlockId": "ObjectId",
    "targetBlockId": "ObjectId",
    "sourceHandle": { "id": "right", "position": "right" },
    "targetHandle": { "id": "left", "position": "left" },
    "connectionType": "arrow|line|dashed|bidirectional",
    "pathType": "straight|bezier|smoothstep|step",
    "label": "string",
    "color": "#6b7280",
    "strokeWidth": 2,
    "animated": false,
    "markerStart": { "type": "none|arrow|...", "color": "...", "width": 0, "height": 0 },
    "markerEnd": { "type": "arrow|...", "color": "...", "width": 0, "height": 0 },
    "createdBy": { "_id": "...", "firstName": "...", "lastName": "..." }
}
```

---

## Exported Functions (63 total)

### Case Dashboard
- `listCasesWithNotion`

### Page CRUD (11)
- `listPages`
- `getPage`
- `createPage`
- `updatePage`
- `deletePage`
- `archivePage`
- `restorePage`
- `duplicatePage`
- `toggleFavorite`
- `togglePin`
- `mergePages`

### Block CRUD (7)
- `getBlocks`
- `createBlock`
- `updateBlock`
- `deleteBlock`
- `moveBlock`
- `lockBlock`
- `unlockBlock`

### Synced Blocks (3)
- `createSyncedBlock`
- `getSyncedBlock`
- `unsyncBlock`

### Comments (4)
- `getComments`
- `addComment`
- `resolveComment`
- `deleteComment`

### Activity & Search (2)
- `getPageActivity`
- `search`

### Export (3)
- `exportPdf`
- `exportMarkdown`
- `exportHtml`

### Templates (3)
- `getTemplates`
- `applyTemplate`
- `saveAsTemplate`

### Task Linking (3)
- `linkTask`
- `unlinkTask`
- `createTaskFromBlock`

### Whiteboard Position/Size (4)
- `updateBlockPosition`
- `updateBlockSize`
- `updateBlockColor`
- `updateBlockPriority`

### Whiteboard Entity Linking (4)
- `linkBlockToEvent`
- `linkBlockToHearing`
- `linkBlockToDocument`
- `unlinkBlock`

### Whiteboard Connections (5)
- `getConnections`
- `createConnection`
- `updateConnection`
- `deleteConnection`
- `updateConnectionPaths`

### Whiteboard View (2)
- `updateViewMode`
- `updateWhiteboardConfig`

### Frame Management (5)
- `addToFrame`
- `removeFromFrame`
- `getFrameChildren`
- `autoDetectFrameChildren`
- `moveFrameWithChildren`

### Undo/Redo (4)
- `undo`
- `redo`
- `getHistoryStatus`
- `recordHistory`

### Multi-Select (6)
- `duplicateElements`
- `bulkDeleteElements`
- `groupElements`
- `ungroupElements`
- `alignElements`
- `distributeElements`

### Shapes (4)
- `createShape`
- `createArrow`
- `createFrame`
- `updateZIndex`
- `batchUpdateElements`

---

## Verification Checklist

After refactoring, verify:

- [ ] All 71 endpoints still work
- [ ] Field names match frontend expectations
- [ ] Enum values haven't changed
- [ ] Response shapes are identical
- [ ] Error messages are consistent
- [ ] Joi validators still match controller expectations

### Quick Verification Commands

```bash
# Check all exports exist
grep -c "exports\." src/controllers/caseNotion*.controller.js

# Check route imports match
node --check src/routes/caseNotion.route.js

# Verify no syntax errors in all files
node --check src/controllers/caseNotion.controller.js
node --check src/controllers/caseNotionPage.controller.js
node --check src/controllers/caseNotionBlock.controller.js
node --check src/controllers/caseNotionWhiteboard.controller.js

# Count endpoints
grep -c "router\." src/routes/caseNotion.route.js
```

---

## Change Log

| Date | Change | Breaking? |
|------|--------|-----------|
| 2026-01-02 | Initial contract created (baseline before refactoring) | No |

---

## Statistics

| Metric | Value |
|--------|-------|
| Total Endpoints | 71 |
| Controller Functions | 63 |
| Enum Types | 13 |
| Allowed Fields Sets | 18+ |
| Controller Lines | 3,964 |
