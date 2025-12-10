const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const taskUpload = require('../configs/taskUpload');
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
    // Template functions
    getTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createFromTemplate,
    saveAsTemplate,
    // Attachment functions
    addAttachment,
    deleteAttachment,
    getAttachmentDownloadUrl,
    getAttachmentVersions,
    // Document functions
    createDocument,
    getDocuments,
    updateDocument,
    getDocument,
    getDocumentVersions,
    getDocumentVersion,
    restoreDocumentVersion,
    // Voice memo functions
    addVoiceMemo,
    updateVoiceMemoTranscription,
    // Voice-to-task conversion functions
    processVoiceToItem,
    batchProcessVoiceMemos,
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
    // NLP & AI functions
    createTaskFromNaturalLanguage,
    createTaskFromVoice,
    getSmartScheduleSuggestions,
    autoScheduleTasks
} = require('../controllers/task.controller');

const app = express.Router();

// ==============================================
// TEMPLATE ROUTES (MUST BE BEFORE /:id ROUTES!)
// ==============================================
app.get('/templates', userMiddleware, firmFilter, getTemplates);
app.post('/templates', userMiddleware, firmFilter, createTemplate);
app.get('/templates/:templateId', userMiddleware, firmFilter, getTemplate);
app.put('/templates/:templateId', userMiddleware, firmFilter, updateTemplate);
app.patch('/templates/:templateId', userMiddleware, firmFilter, updateTemplate);
app.delete('/templates/:templateId', userMiddleware, firmFilter, deleteTemplate);
app.post('/templates/:templateId/create', userMiddleware, firmFilter, createFromTemplate);

// Static routes (must be before parameterized routes)
app.get('/stats', userMiddleware, firmFilter, getTaskStats);
app.get('/upcoming', userMiddleware, firmFilter, getUpcomingTasks);
app.get('/overdue', userMiddleware, firmFilter, getOverdueTasks);
app.get('/due-today', userMiddleware, firmFilter, getTasksDueToday);
app.get('/case/:caseId', userMiddleware, firmFilter, getTasksByCase);

// Bulk operations
app.put('/bulk', userMiddleware, firmFilter, bulkUpdateTasks);
app.delete('/bulk', userMiddleware, firmFilter, bulkDeleteTasks);

// ==============================================
// NLP & AI-POWERED TASK ROUTES
// ==============================================
app.post('/parse', userMiddleware, firmFilter, createTaskFromNaturalLanguage);
app.post('/voice', userMiddleware, firmFilter, createTaskFromVoice);
app.get('/smart-schedule', userMiddleware, firmFilter, getSmartScheduleSuggestions);
app.post('/auto-schedule', userMiddleware, firmFilter, autoScheduleTasks);

// ==============================================
// VOICE-TO-TASK CONVERSION ROUTES
// ==============================================
app.post('/voice-to-item', userMiddleware, firmFilter, processVoiceToItem);
app.post('/voice-to-item/batch', userMiddleware, firmFilter, batchProcessVoiceMemos);

// Task CRUD
app.post('/', userMiddleware, firmFilter, createTask);
app.get('/', userMiddleware, firmFilter, getTasks);
app.get('/:id', userMiddleware, firmFilter, getTask);
app.put('/:id', userMiddleware, firmFilter, updateTask);
app.patch('/:id', userMiddleware, firmFilter, updateTask);
app.delete('/:id', userMiddleware, firmFilter, deleteTask);

// Task actions
app.post('/:id/complete', userMiddleware, firmFilter, completeTask);

// Subtask management
app.post('/:id/subtasks', userMiddleware, firmFilter, addSubtask);
app.patch('/:id/subtasks/:subtaskId/toggle', userMiddleware, firmFilter, toggleSubtask);
app.delete('/:id/subtasks/:subtaskId', userMiddleware, firmFilter, deleteSubtask);

// Time tracking
app.post('/:id/timer/start', userMiddleware, firmFilter, startTimer);
app.post('/:id/timer/stop', userMiddleware, firmFilter, stopTimer);
app.post('/:id/time', userMiddleware, firmFilter, addManualTime);

// Comments
app.post('/:id/comments', userMiddleware, firmFilter, addComment);
app.put('/:id/comments/:commentId', userMiddleware, firmFilter, updateComment);
app.delete('/:id/comments/:commentId', userMiddleware, firmFilter, deleteComment);

// Save task as template
app.post('/:id/save-as-template', userMiddleware, firmFilter, saveAsTemplate);

// ==============================================
// ATTACHMENT ROUTES
// ==============================================
app.post('/:id/attachments', userMiddleware, firmFilter, taskUpload.single('file'), addAttachment);
app.get('/:id/attachments/:attachmentId/download-url', userMiddleware, firmFilter, getAttachmentDownloadUrl);
app.get('/:id/attachments/:attachmentId/versions', userMiddleware, firmFilter, getAttachmentVersions);
app.delete('/:id/attachments/:attachmentId', userMiddleware, firmFilter, deleteAttachment);

// ==============================================
// DOCUMENT ROUTES (in-app text editor)
// ==============================================
app.post('/:id/documents', userMiddleware, firmFilter, createDocument);
app.get('/:id/documents', userMiddleware, firmFilter, getDocuments);
app.get('/:id/documents/:documentId', userMiddleware, firmFilter, getDocument);
app.patch('/:id/documents/:documentId', userMiddleware, firmFilter, updateDocument);
// Document versioning
app.get('/:id/documents/:documentId/versions', userMiddleware, firmFilter, getDocumentVersions);
app.get('/:id/documents/:documentId/versions/:versionId', userMiddleware, firmFilter, getDocumentVersion);
app.post('/:id/documents/:documentId/versions/:versionId/restore', userMiddleware, firmFilter, restoreDocumentVersion);

// ==============================================
// VOICE MEMO ROUTES
// ==============================================
app.post('/:id/voice-memos', userMiddleware, firmFilter, taskUpload.single('file'), addVoiceMemo);
app.patch('/:id/voice-memos/:memoId/transcription', userMiddleware, firmFilter, updateVoiceMemoTranscription);

// ==============================================
// DEPENDENCY ROUTES
// ==============================================
app.post('/:id/dependencies', userMiddleware, firmFilter, addDependency);
app.delete('/:id/dependencies/:dependencyTaskId', userMiddleware, firmFilter, removeDependency);
app.patch('/:id/status', userMiddleware, firmFilter, updateTaskStatus);

// ==============================================
// PROGRESS ROUTES
// ==============================================
app.patch('/:id/progress', userMiddleware, firmFilter, updateProgress);

// ==============================================
// WORKFLOW ROUTES
// ==============================================
app.post('/:id/workflow-rules', userMiddleware, firmFilter, addWorkflowRule);
app.patch('/:id/outcome', userMiddleware, firmFilter, updateOutcome);

// ==============================================
// BUDGET/ESTIMATE ROUTES
// ==============================================
app.patch('/:id/estimate', userMiddleware, firmFilter, updateEstimate);
app.get('/:id/time-tracking/summary', userMiddleware, firmFilter, getTimeTrackingSummary);

// ==============================================
// ENHANCED SUBTASK ROUTES
// ==============================================
app.patch('/:id/subtasks/:subtaskId', userMiddleware, firmFilter, updateSubtask);

module.exports = app;
