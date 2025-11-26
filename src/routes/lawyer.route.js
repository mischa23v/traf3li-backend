const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    getLawyers,
    getLawyer,
    getTeamMembers,
    getStaff,
    getStaffMember,
    createStaff,
    updateStaff,
    deleteStaff,
    bulkDeleteStaff
} = require('../controllers/lawyer.controller');

const app = express.Router();

// Staff/Team CRUD
app.post('/', userMiddleware, createStaff);
app.get('/', userMiddleware, getStaff);

// Special queries (before :_id to avoid conflicts)
app.get('/team', userMiddleware, getTeamMembers);
app.get('/all-lawyers', userMiddleware, getLawyers);

// Bulk operations
app.post('/bulk-delete', userMiddleware, bulkDeleteStaff);

// Single staff member
app.get('/:_id', userMiddleware, getStaffMember);
app.patch('/:_id', userMiddleware, updateStaff);
app.delete('/:_id', userMiddleware, deleteStaff);

module.exports = app;
