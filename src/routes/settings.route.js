const express = require('express');
const multer = require('multer');
const path = require('path');
const { userMiddleware } = require('../middlewares');
const { firmFilter } = require('../middlewares/firmFilter.middleware');
const {
    // User settings
    getUserSettings,
    updateAccountSettings,
    updateAppearanceSettings,
    updateDisplaySettings,
    updateNotificationSettings,
    // Company settings
    getCompanySettings,
    updateCompanySettings,
    uploadCompanyLogo,
    // Tax settings
    getTaxes,
    createTax,
    updateTax,
    deleteTax,
    setDefaultTax,
    // Payment mode settings
    getPaymentModes,
    createPaymentMode,
    updatePaymentMode,
    deletePaymentMode,
    setDefaultPaymentMode,
    // Finance settings
    getFinanceSettings,
    updateFinanceSettings
} = require('../controllers/settings.controller');

const router = express.Router();

// Configure multer for logo uploads
const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/logos/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const logoUpload = multer({
    storage: logoStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    }
});

// Apply authentication to all routes
router.use(userMiddleware);
router.use(firmFilter);

// ============ USER SETTINGS ============

// GET /settings - Get all user settings
router.get('/', getUserSettings);

// PATCH /settings/account - Update account settings
router.patch('/account', updateAccountSettings);

// PATCH /settings/appearance - Update appearance settings
router.patch('/appearance', updateAppearanceSettings);

// PATCH /settings/display - Update display settings
router.patch('/display', updateDisplaySettings);

// PATCH /settings/notifications - Update notification settings
router.patch('/notifications', updateNotificationSettings);

// ============ COMPANY SETTINGS ============

// GET /settings/company - Get company settings
router.get('/company', getCompanySettings);

// PUT /settings/company - Update company settings
router.put('/company', updateCompanySettings);

// POST /settings/company/logo - Upload company logo
router.post('/company/logo', logoUpload.single('logo'), uploadCompanyLogo);

// ============ TAX SETTINGS ============

// GET /settings/taxes - Get all taxes
router.get('/taxes', getTaxes);

// POST /settings/taxes - Create tax
router.post('/taxes', createTax);

// PUT /settings/taxes/:id - Update tax
router.put('/taxes/:id', updateTax);

// DELETE /settings/taxes/:id - Delete tax
router.delete('/taxes/:id', deleteTax);

// PATCH /settings/taxes/:id/default - Set as default tax
router.patch('/taxes/:id/default', setDefaultTax);

// ============ PAYMENT MODE SETTINGS ============

// GET /settings/payment-modes - Get all payment modes
router.get('/payment-modes', getPaymentModes);

// POST /settings/payment-modes - Create payment mode
router.post('/payment-modes', createPaymentMode);

// PUT /settings/payment-modes/:id - Update payment mode
router.put('/payment-modes/:id', updatePaymentMode);

// DELETE /settings/payment-modes/:id - Delete payment mode
router.delete('/payment-modes/:id', deletePaymentMode);

// PATCH /settings/payment-modes/:id/default - Set as default
router.patch('/payment-modes/:id/default', setDefaultPaymentMode);

// ============ FINANCE SETTINGS ============

// GET /settings/finance - Get finance settings
router.get('/finance', getFinanceSettings);

// PUT /settings/finance - Update finance settings
router.put('/finance', updateFinanceSettings);

module.exports = router;
