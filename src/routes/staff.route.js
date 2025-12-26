const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createStaff,
    getStaff,
    getStaffById,
    updateStaff,
    deleteStaff,
    bulkDeleteStaff,
    getTeam,
    getStats
} = require('../controllers/staff.controller');

const router = express.Router();

// Apply authentication to all routes
router.use(userMiddleware);

// ============================================
// SPECIAL ROUTES (before :id routes)
// ============================================
router.get('/team', getTeam);
router.get('/stats', getStats);
router.post('/bulk-delete', bulkDeleteStaff);

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
