const express = require('express');
const { userMiddleware } = require('../middlewares');
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
    getTasksByCase
} = require('../controllers/task.controller');

const app = express.Router();

// Static routes (must be before parameterized routes)
app.get('/stats', userMiddleware, getTaskStats);
app.get('/upcoming', userMiddleware, getUpcomingTasks);
app.get('/overdue', userMiddleware, getOverdueTasks);
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

module.exports = app;
