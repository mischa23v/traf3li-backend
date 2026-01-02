# Task API Contract (Baseline)

**Captured:** 2026-01-02
**Purpose:** Compare after refactoring to ensure no breaking changes

---

## API Endpoints (50 total)

### Templates (7 endpoints)
| Method | Endpoint | Handler | Source |
|--------|----------|---------|--------|
| GET | /templates | getTemplates | taskTemplate.controller |
| POST | /templates | createTemplate | taskTemplate.controller |
| GET | /templates/:templateId | getTemplate | taskTemplate.controller |
| PUT | /templates/:templateId | updateTemplate | taskTemplate.controller |
| PATCH | /templates/:templateId | updateTemplate | taskTemplate.controller |
| DELETE | /templates/:templateId | deleteTemplate | taskTemplate.controller |
| POST | /templates/:templateId/create | createFromTemplate | taskTemplate.controller |

### Overview & Stats (6 endpoints)
| Method | Endpoint | Handler | Source |
|--------|----------|---------|--------|
| GET | /overview | getTasksOverview | task.controller |
| GET | /stats | getTaskStats | task.controller |
| GET | /upcoming | getUpcomingTasks | task.controller |
| GET | /overdue | getOverdueTasks | task.controller |
| GET | /due-today | getTasksDueToday | task.controller |
| GET | /case/:caseId | getTasksByCase | task.controller |

### Bulk Operations (2 endpoints)
| Method | Endpoint | Handler | Source |
|--------|----------|---------|--------|
| PUT | /bulk | bulkUpdateTasks | task.controller |
| DELETE | /bulk | bulkDeleteTasks | task.controller |

### Voice & NLP (6 endpoints)
| Method | Endpoint | Handler | Source |
|--------|----------|---------|--------|
| POST | /parse | createTaskFromNaturalLanguage | taskVoice.controller |
| POST | /voice | createTaskFromVoice | taskVoice.controller |
| GET | /smart-schedule | getSmartScheduleSuggestions | taskVoice.controller |
| POST | /auto-schedule | autoScheduleTasks | taskVoice.controller |
| POST | /voice-to-item | processVoiceToItem | taskVoice.controller |
| POST | /voice-to-item/batch | batchProcessVoiceMemos | taskVoice.controller |

### Core CRUD (7 endpoints)
| Method | Endpoint | Handler | Source |
|--------|----------|---------|--------|
| POST | / | createTask | task.controller |
| GET | / | getTasks | task.controller |
| GET | /:id/full | getTaskFull | task.controller |
| GET | /:id | getTask | task.controller |
| PUT | /:id | updateTask | task.controller |
| PATCH | /:id | updateTask | task.controller |
| DELETE | /:id | deleteTask | task.controller |

### Task Actions (1 endpoint)
| Method | Endpoint | Handler | Source |
|--------|----------|---------|--------|
| POST | /:id/complete | completeTask | task.controller |

### Subtasks (3 endpoints)
| Method | Endpoint | Handler | Source |
|--------|----------|---------|--------|
| POST | /:id/subtasks | addSubtask | task.controller |
| PATCH | /:id/subtasks/:subtaskId/toggle | toggleSubtask | task.controller |
| DELETE | /:id/subtasks/:subtaskId | deleteSubtask | task.controller |

### Time Tracking (4 endpoints)
| Method | Endpoint | Handler | Source |
|--------|----------|---------|--------|
| POST | /:id/timer/start | startTimer | task.controller |
| POST | /:id/timer/stop | stopTimer | task.controller |
| POST | /:id/time | addManualTime | task.controller |
| GET | /:id/time-tracking/summary | getTimeTrackingSummary | task.controller |

### Comments (3 endpoints)
| Method | Endpoint | Handler | Source |
|--------|----------|---------|--------|
| POST | /:id/comments | addComment | task.controller |
| PUT | /:id/comments/:commentId | updateComment | task.controller |
| DELETE | /:id/comments/:commentId | deleteComment | task.controller |

### Save as Template (1 endpoint)
| Method | Endpoint | Handler | Source |
|--------|----------|---------|--------|
| POST | /:id/save-as-template | saveAsTemplate | taskTemplate.controller |

### Attachments (4 endpoints)
| Method | Endpoint | Handler | Source |
|--------|----------|---------|--------|
| POST | /:id/attachments | addAttachment | taskAttachment.controller |
| GET | /:id/attachments/:attachmentId/download-url | getAttachmentDownloadUrl | taskAttachment.controller |
| GET | /:id/attachments/:attachmentId/versions | getAttachmentVersions | taskAttachment.controller |
| DELETE | /:id/attachments/:attachmentId | deleteAttachment | taskAttachment.controller |

### Documents (7 endpoints)
| Method | Endpoint | Handler | Source |
|--------|----------|---------|--------|
| POST | /:id/documents | createDocument | taskDocument.controller |
| GET | /:id/documents | getDocuments | taskDocument.controller |
| GET | /:id/documents/:documentId | getDocument | taskDocument.controller |
| PATCH | /:id/documents/:documentId | updateDocument | taskDocument.controller |
| GET | /:id/documents/:documentId/versions | getDocumentVersions | taskDocument.controller |
| GET | /:id/documents/:documentId/versions/:versionId | getDocumentVersion | taskDocument.controller |
| POST | /:id/documents/:documentId/versions/:versionId/restore | restoreDocumentVersion | taskDocument.controller |

### Voice Memos (2 endpoints)
| Method | Endpoint | Handler | Source |
|--------|----------|---------|--------|
| POST | /:id/voice-memos | addVoiceMemo | taskVoice.controller |
| PATCH | /:id/voice-memos/:memoId/transcription | updateVoiceMemoTranscription | taskVoice.controller |

### Dependencies & Status (3 endpoints)
| Method | Endpoint | Handler | Source |
|--------|----------|---------|--------|
| POST | /:id/dependencies | addDependency | task.controller |
| DELETE | /:id/dependencies/:dependencyTaskId | removeDependency | task.controller |
| PATCH | /:id/status | updateTaskStatus | task.controller |

### Progress & Workflow (3 endpoints)
| Method | Endpoint | Handler | Source |
|--------|----------|---------|--------|
| PATCH | /:id/progress | updateProgress | task.controller |
| POST | /:id/workflow-rules | addWorkflowRule | task.controller |
| PATCH | /:id/outcome | updateOutcome | task.controller |

### Estimates (1 endpoint)
| Method | Endpoint | Handler | Source |
|--------|----------|---------|--------|
| PATCH | /:id/estimate | updateEstimate | task.controller |

---

## ALLOWED_FIELDS (Request Body Validation)

\`\`\`javascript
const ALLOWED_FIELDS = {
    // Core task operations
    CREATE: [
        'title', 'description', 'priority', 'status', 'label', 'tags',
        'dueDate', 'dueTime', 'startDate', 'assignedTo', 'caseId', 'clientId',
        'parentTaskId', 'subtasks', 'checklists', 'timeTracking', 'recurring',
        'reminders', 'notes', 'points'
    ],
    UPDATE: [
        'title', 'description', 'status', 'priority', 'label', 'tags',
        'dueDate', 'dueTime', 'startDate', 'assignedTo', 'caseId', 'clientId',
        'subtasks', 'checklists', 'timeTracking', 'recurring', 'reminders',
        'notes', 'points', 'progress'
    ],
    SUBTASK: ['title', 'autoReset'],
    SUBTASK_UPDATE: ['title', 'completed'],
    TIMER_START: ['notes'],
    TIMER_STOP: ['notes', 'isBillable'],
    MANUAL_TIME: ['minutes', 'notes', 'date', 'isBillable'],
    COMMENT_CREATE: ['content', 'text', 'mentions'],
    COMMENT_UPDATE: ['content', 'text'],
    BULK_UPDATE: ['taskIds', 'updates'],
    BULK_DELETE: ['taskIds'],
    BULK_UPDATE_FIELDS: ['status', 'priority', 'assignedTo', 'dueDate', 'label', 'tags'],
    TEMPLATE_CREATE: [
        'title', 'templateName', 'description', 'priority', 'label', 'tags',
        'subtasks', 'checklists', 'timeTracking', 'reminders', 'notes', 'isPublic'
    ],
    TEMPLATE_UPDATE: [
        'title', 'templateName', 'description', 'priority', 'label', 'tags',
        'subtasks', 'checklists', 'timeTracking', 'reminders', 'notes', 'isPublic'
    ],
    TEMPLATE_CREATE_TASK: ['title', 'dueDate', 'dueTime', 'assignedTo', 'caseId', 'clientId', 'notes'],
    SAVE_AS_TEMPLATE: ['templateName', 'isPublic'],
    COMPLETE: ['completionNote'],
    DEPENDENCY: ['dependsOn', 'type'],
    STATUS_UPDATE: ['status'],
    PROGRESS: ['progress', 'autoCalculate']
};
\`\`\`

---

## Valid Enum Values

\`\`\`javascript
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const VALID_STATUSES = ['todo', 'pending', 'in_progress', 'done', 'canceled'];
\`\`\`

---

## Controller Distribution

| Controller | Functions | Lines |
|------------|-----------|-------|
| task.controller.js | 33 | 2,343 |
| taskTemplate.controller.js | 7 | 370 |
| taskAttachment.controller.js | 4 | 290 |
| taskDocument.controller.js | 7 | 602 |
| taskVoice.controller.js | 8 | 624 |
| **Total** | **59** | **4,229** |

---

## Verification After Refactoring

\`\`\`bash
# 1. Syntax check all controllers
node --check src/controllers/task.controller.js
node --check src/controllers/taskTemplate.controller.js
node --check src/controllers/taskAttachment.controller.js
node --check src/controllers/taskDocument.controller.js
node --check src/controllers/taskVoice.controller.js
node --check src/routes/task.route.js

# 2. Contract verification
node scripts/verify-task-contract.js

# 3. Endpoint count should match
grep -c "^app\." src/routes/task.route.js  # Expected: 50
\`\`\`

## Route Checksum (for verification)

```
Checksum: c37fc2ed2ebd3e1b3674e94e421e0d78
Endpoint count: 61
```

To verify after changes:
```bash
grep "^app\." src/routes/task.route.js | md5sum  # Should match above
```
