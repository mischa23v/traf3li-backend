/**
 * Income Tax Slab Routes
 *
 * @module routes/incomeTaxSlab
 */

const express = require('express');
const router = express.Router();
const { userMiddleware } = require('../middlewares/user-middleware');
const { firmFilter } = require('../middlewares/firmContext');
const {
    getTaxSlabs,
    getTaxSlab,
    createTaxSlab,
    updateTaxSlab,
    deleteTaxSlab,
    calculateTax,
    calculateTaxByCountry,
    initializeDefaults,
    getSupportedCountries
} = require('../controllers/incomeTaxSlab.controller');

// Apply authentication middleware
router.use(userMiddleware);
router.use(firmFilter);

// Special routes (before :id)
router.get('/countries', getSupportedCountries);
router.post('/initialize-defaults', initializeDefaults);
router.post('/calculate-by-country', calculateTaxByCountry);

// CRUD operations
router.get('/', getTaxSlabs);
router.post('/', createTaxSlab);
router.get('/:id', getTaxSlab);
router.put('/:id', updateTaxSlab);
router.delete('/:id', deleteTaxSlab);

// Calculate tax using specific slab
router.post('/:id/calculate', calculateTax);

module.exports = router;
