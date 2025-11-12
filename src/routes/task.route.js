const express = require('express');
const { userMiddleware } = require('../middlewares');
const { 
    createTask, 
    getTasks, 
    getTask, 
    updateTask, 
    deleteTask,
    completeTask,
    getUpcomingTasks,
    getOverdueTasks,
    getTasksByCase
} = require('../controllers/task.controller');

const app = express.Router();

// Create task
app.post('/', userMiddleware, createTask);

// Get all tasks (with filters)
app.get('/', userMiddleware, getTasks);

// Get upcoming tasks (next 7 days)
app.get('/upcoming', userMiddleware, getUpcomingTasks);

// Get overdue tasks
app.get('/overdue', userMiddleware, getOverdueTasks);

// Get tasks by case
app.get('/case/:caseId', userMiddleware, getTasksByCase);

// Get single task
app.get('/:_id', userMiddleware, getTask);

// Update task
app.patch('/:_id', userMiddleware, updateTask);

// Delete task
app.delete('/:_id', userMiddleware, deleteTask);

// Mark task as complete
app.post('/:_id/complete', userMiddleware, completeTask);

module.exports = app;
