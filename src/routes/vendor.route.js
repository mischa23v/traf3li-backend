const express = require('express');
const { userMiddleware } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    createVendor,
    getVendors,
    getVendor,
    updateVendor,
    deleteVendor,
    getVendorSummary
} = require('../controllers/vendor.controller');

const app = express.Router();

app.use(apiRateLimiter);

// Collection routes
app.post('/', userMiddleware, createVendor);
app.get('/', userMiddleware, getVendors);

// Single vendor routes
app.get('/:id', userMiddleware, getVendor);
app.put('/:id', userMiddleware, updateVendor);
app.delete('/:id', userMiddleware, deleteVendor);

// Vendor summary
app.get('/:id/summary', userMiddleware, getVendorSummary);

module.exports = app;
