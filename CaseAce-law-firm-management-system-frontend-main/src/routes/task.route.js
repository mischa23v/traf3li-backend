const express = require('express');
const { userMiddleware } = require('../middlewares');
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
    getTimeTrackingSummary
} = require('../controllers/task.controller');

const app = express.Router();

// ==============================================
// TEMPLATE ROUTES (MUST BE BEFORE /:id ROUTES!)
// ==============================================
app.get('/templates', userMiddleware, getTemplates);
app.post('/templates', userMiddleware, createTemplate);
app.get('/templates/:templateId', userMiddleware, getTemplate);
app.put('/templates/:templateId', userMiddleware, updateTemplate);
app.patch('/templates/:templateId', userMiddleware, updateTemplate);
app.delete('/templates/:templateId', userMiddleware, deleteTemplate);
app.post('/templates/:templateId/create', userMiddleware, createFromTemplate);

// Static routes (must be before parameterized routes)
app.get('/stats', userMiddleware, getTaskStats);
app.get('/upcoming', userMiddleware, getUpcomingTasks);
app.get('/overdue', userMiddleware, getOverdueTasks);
app.get('/due-today', userMiddleware, getTasksDueToday);
app.get('/case/:caseId', userMiddleware, getTasksByCase);

// Bulk operations
app.put('/bulk', userMiddleware, bulkUpdateTasks);
app.delete('/bulk', userMiddleware, bulkDeleteTasks);

// Task CRUD
app.post('/', userMiddleware, createTask);
app.get('/', userMiddleware, getTasks);
app.get('/:id', userMiddleware, getTask);
app.put('/:id', userMiddleware, updateTask);
app.patch('/:id', userMiddleware, updateTask);
app.delete('/:id', userMiddleware, deleteTask);

// Task actions
app.post('/:id/complete', userMiddleware, completeTask);

// Subtask management
app.post('/:id/subtasks', userMiddleware, addSubtask);
app.patch('/:id/subtasks/:subtaskId/toggle', userMiddleware, toggleSubtask);
app.delete('/:id/subtasks/:subtaskId', userMiddleware, deleteSubtask);

// Time tracking
app.post('/:id/timer/start', userMiddleware, startTimer);
app.post('/:id/timer/stop', userMiddleware, stopTimer);
app.post('/:id/time', userMiddleware, addManualTime);

// Comments
app.post('/:id/comments', userMiddleware, addComment);
app.put('/:id/comments/:commentId', userMiddleware, updateComment);
app.delete('/:id/comments/:commentId', userMiddleware, deleteComment);

// Save task as template
app.post('/:id/save-as-template', userMiddleware, saveAsTemplate);

// ==============================================
// ATTACHMENT ROUTES
// ==============================================
app.post('/:id/attachments', userMiddleware, taskUpload.single('file'), addAttachment);
app.get('/:id/attachments/:attachmentId/download-url', userMiddleware, getAttachmentDownloadUrl);
app.get('/:id/attachments/:attachmentId/versions', userMiddleware, getAttachmentVersions);
app.delete('/:id/attachments/:attachmentId', userMiddleware, deleteAttachment);

// ==============================================
// DOCUMENT ROUTES (in-app text editor)
// ==============================================
app.post('/:id/documents', userMiddleware, createDocument);
app.get('/:id/documents', userMiddleware, getDocuments);
app.get('/:id/documents/:documentId', userMiddleware, getDocument);
app.patch('/:id/documents/:documentId', userMiddleware, updateDocument);
// Document versioning
app.get('/:id/documents/:documentId/versions', userMiddleware, getDocumentVersions);
app.get('/:id/documents/:documentId/versions/:versionId', userMiddleware, getDocumentVersion);
app.post('/:id/documents/:documentId/versions/:versionId/restore', userMiddleware, restoreDocumentVersion);

// ==============================================
// VOICE MEMO ROUTES
// ==============================================
app.post('/:id/voice-memos', userMiddleware, taskUpload.single('file'), addVoiceMemo);
app.patch('/:id/voice-memos/:memoId/transcription', userMiddleware, updateVoiceMemoTranscription);

// ==============================================
// DEPENDENCY ROUTES
// ==============================================
app.post('/:id/dependencies', userMiddleware, addDependency);
app.delete('/:id/dependencies/:dependencyTaskId', userMiddleware, removeDependency);
app.patch('/:id/status', userMiddleware, updateTaskStatus);

// ==============================================
// PROGRESS ROUTES
// ==============================================
app.patch('/:id/progress', userMiddleware, updateProgress);

// ==============================================
// WORKFLOW ROUTES
// ==============================================
app.post('/:id/workflow-rules', userMiddleware, addWorkflowRule);
app.patch('/:id/outcome', userMiddleware, updateOutcome);

// ==============================================
// BUDGET/ESTIMATE ROUTES
// ==============================================
app.patch('/:id/estimate', userMiddleware, updateEstimate);
app.get('/:id/time-tracking/summary', userMiddleware, getTimeTrackingSummary);

// ==============================================
// ENHANCED SUBTASK ROUTES
// ==============================================
app.patch('/:id/subtasks/:subtaskId', userMiddleware, updateSubtask);

module.exports = app;
