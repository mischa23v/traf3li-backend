const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
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

// Apply rate limiting to all routes
router.use(apiRateLimiter);

// Apply authentication and firm filter to all routes
router.use(userMiddleware, firmFilter);

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
