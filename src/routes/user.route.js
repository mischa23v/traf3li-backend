const express = require('express');
const { userMiddleware } = require('../middlewares');
const { 
    getUserProfile, 
    getLawyerProfile, 
    getLawyers,  // ✅ ADD THIS
    updateUserProfile, 
    deleteUser 
} = require('../controllers/user.controller');

const app = express.Router();

// Get all lawyers with filters (public - no auth required) ✅
app.get('/lawyers', getLawyers);

// Get user profile (public - no auth required)
app.get('/:_id', getUserProfile);

// Get comprehensive lawyer profile with stats (public - no auth required)
app.get('/lawyer/:username', getLawyerProfile);

// Update user profile (protected - must be own profile)
app.patch('/:_id', userMiddleware, updateUserProfile);

// Delete user account (protected - must be own account)
app.delete('/:_id', userMiddleware, deleteUser);

module.exports = app;
