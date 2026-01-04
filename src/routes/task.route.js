const express = require('express');
const taskUpload = require('../configs/taskUpload');

// Core task controller
const {
    createTask,
    getTasks,
    getTask,
    updateTask,
    deleteTask,
    completeTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    updateSubtask,
    startTimer,
    stopTimer,
    addManualTime,
    addComment,
    updateComment,
    deleteComment,
    bulkUpdateTasks,
    bulkDeleteTasks,
    getTaskStats,
    getUpcomingTasks,
    getOverdueTasks,
    getTasksByCase,
    getTasksDueToday,
    // Dependency functions
    addDependency,
    removeDependency,
    updateTaskStatus,
    // Progress functions
    updateProgress,
    // Workflow functions
    addWorkflowRule,
    updateOutcome,
    // Budget functions
    updateEstimate,
    getTimeTrackingSummary,
    // Aggregated endpoints
    getTaskFull,
    getTasksOverview,
    // NEW: Missing endpoints
    getActiveTimers,
    pauseTimer,
    resumeTimer,
    cloneTask,
    getTaskActivity,
    getTasksByClient,
    convertTaskToEvent,
    searchTasks,
    bulkCreateTasks,
    rescheduleTask,
    getTaskConflicts
} = require('../controllers/task.controller');

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

// Document controller (extracted for maintainability)
const {
    createDocument,
    getDocuments,
    updateDocument,
    getDocument,
    getDocumentVersions,
    getDocumentVersion,
    restoreDocumentVersion
} = require('../controllers/taskDocument.controller');

// Voice & NLP controller (extracted for maintainability)
const {
    addVoiceMemo,
    updateVoiceMemoTranscription,
    processVoiceToItem,
    batchProcessVoiceMemos,
    createTaskFromNaturalLanguage,
    createTaskFromVoice,
    getSmartScheduleSuggestions,
    autoScheduleTasks
} = require('../controllers/taskVoice.controller');

const app = express.Router();

// Template routes (must be before /:id routes)
app.get('/templates', getTemplates);
app.post('/templates', createTemplate);
app.get('/templates/:templateId', getTemplate);
app.put('/templates/:templateId', updateTemplate);
app.patch('/templates/:templateId', updateTemplate);
app.delete('/templates/:templateId', deleteTemplate);
app.post('/templates/:templateId/create', createFromTemplate);

// Batch endpoint: Tasks Overview
app.get('/overview', getTasksOverview);

// NEW: Active timers, search, conflicts (must be before parameterized routes)
app.get('/timers/active', getActiveTimers);
app.get('/search', searchTasks);
app.get('/conflicts', getTaskConflicts);
app.get('/client/:clientId', getTasksByClient);

// Static routes (must be before parameterized routes)
app.get('/stats', getTaskStats);
app.get('/upcoming', getUpcomingTasks);
app.get('/overdue', getOverdueTasks);
app.get('/due-today', getTasksDueToday);
app.get('/case/:caseId', getTasksByCase);

// Bulk operations
app.post('/bulk', bulkCreateTasks);
app.put('/bulk', bulkUpdateTasks);
app.delete('/bulk', bulkDeleteTasks);

// NLP & AI-powered task routes
app.post('/parse', createTaskFromNaturalLanguage);
app.post('/voice', createTaskFromVoice);
app.get('/smart-schedule', getSmartScheduleSuggestions);
app.post('/auto-schedule', autoScheduleTasks);

// Voice-to-task conversion routes
app.post('/voice-to-item', processVoiceToItem);
app.post('/voice-to-item/batch', batchProcessVoiceMemos);

// Task CRUD
app.post('/', createTask);
app.get('/', getTasks);

// Aggregated endpoint - get task with all related data
app.get('/:id/full', getTaskFull);

app.get('/:id', getTask);
app.put('/:id', updateTask);
app.patch('/:id', updateTask);
app.delete('/:id', deleteTask);

// Task actions
app.post('/:id/complete', completeTask);
app.post('/:id/clone', cloneTask);
app.post('/:id/reschedule', rescheduleTask);
app.get('/:id/activity', getTaskActivity);
app.post('/:id/convert-to-event', convertTaskToEvent);

// Subtask management
app.post('/:id/subtasks', addSubtask);
app.patch('/:id/subtasks/:subtaskId/toggle', toggleSubtask);
app.delete('/:id/subtasks/:subtaskId', deleteSubtask);

// Time tracking
app.post('/:id/timer/start', startTimer);
app.post('/:id/timer/stop', stopTimer);
app.patch('/:id/timer/pause', pauseTimer);
app.patch('/:id/timer/resume', resumeTimer);
app.post('/:id/time', addManualTime);

// Comments
app.post('/:id/comments', addComment);
app.put('/:id/comments/:commentId', updateComment);
app.delete('/:id/comments/:commentId', deleteComment);

// Save task as template
app.post('/:id/save-as-template', saveAsTemplate);

// Attachment routes
app.post('/:id/attachments', taskUpload.single('file'), taskUpload.malwareScan, addAttachment);
app.get('/:id/attachments/:attachmentId/download-url', getAttachmentDownloadUrl);
app.get('/:id/attachments/:attachmentId/versions', getAttachmentVersions);
app.delete('/:id/attachments/:attachmentId', deleteAttachment);

// Document routes (in-app text editor)
app.post('/:id/documents', createDocument);
app.get('/:id/documents', getDocuments);
app.get('/:id/documents/:documentId', getDocument);
app.patch('/:id/documents/:documentId', updateDocument);
// Document versioning
app.get('/:id/documents/:documentId/versions', getDocumentVersions);
app.get('/:id/documents/:documentId/versions/:versionId', getDocumentVersion);
app.post('/:id/documents/:documentId/versions/:versionId/restore', restoreDocumentVersion);

// Voice memo routes
app.post('/:id/voice-memos', taskUpload.single('file'), taskUpload.malwareScan, addVoiceMemo);
app.patch('/:id/voice-memos/:memoId/transcription', updateVoiceMemoTranscription);

// Dependency routes
app.post('/:id/dependencies', addDependency);
app.delete('/:id/dependencies/:dependencyTaskId', removeDependency);
app.patch('/:id/status', updateTaskStatus);

// Progress routes
app.patch('/:id/progress', updateProgress);

// Workflow routes
app.post('/:id/workflow-rules', addWorkflowRule);
app.patch('/:id/outcome', updateOutcome);

// Budget/estimate routes
app.patch('/:id/estimate', updateEstimate);
app.get('/:id/time-tracking/summary', getTimeTrackingSummary);

// Enhanced subtask routes
app.patch('/:id/subtasks/:subtaskId', updateSubtask);

module.exports = app;
