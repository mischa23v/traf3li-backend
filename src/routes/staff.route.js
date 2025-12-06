const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    createStaff,
    getStaff,
    getStaffById,
    updateStaff,
    deleteStaff,
    getTeam,
    getStats
} = require('../controllers/staff.controller');

const router = express.Router();

// Apply authentication and firm filter to all routes
router.use(userMiddleware, firmFilter);

// ============================================
// SPECIAL ROUTES (before :id routes)
// ============================================
router.get('/team', getTeam);
router.get('/stats', getStats);

// ============================================
// CRUD OPERATIONS
// ============================================
router.get('/', getStaff);
router.post('/', createStaff);
router.get('/:id', getStaffById);
router.put('/:id', updateStaff);
router.patch('/:id', updateStaff);  // Support both PUT and PATCH
router.delete('/:id', deleteStaff);

module.exports = router;
