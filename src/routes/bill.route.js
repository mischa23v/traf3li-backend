const express = require('express');
const { userMiddleware } = require('../middlewares');
const { requiredIdempotency } = require('../middlewares/idempotency');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    createBill,
    getBills,
    getBill,
    updateBill,
    deleteBill,
    receiveBill,
    cancelBill,
    uploadAttachment,
    deleteAttachment,
    duplicateBill,
    getOverdueBills,
    getSummary,
    getRecurringBills,
    stopRecurring,
    generateNextBill,
    getAgingReport,
    exportBills,
    approveBill,
    payBill,
    postToGL
} = require('../controllers/bill.controller');

const app = express.Router();

// Apply rate limiting
app.use(apiRateLimiter);

// Collection routes
app.post('/', userMiddleware, requiredIdempotency, createBill);
app.get('/', userMiddleware, getBills);

// Static routes (must come before /:id)
app.get('/overdue', userMiddleware, getOverdueBills);
app.get('/summary', userMiddleware, getSummary);
app.get('/recurring', userMiddleware, getRecurringBills);
app.get('/reports/aging', userMiddleware, getAgingReport);
app.get('/export', userMiddleware, exportBills);

// Single bill routes
app.get('/:id', userMiddleware, getBill);
app.put('/:id', userMiddleware, requiredIdempotency, updateBill);
app.delete('/:id', userMiddleware, requiredIdempotency, deleteBill);

// Bill actions
app.post('/:id/receive', userMiddleware, requiredIdempotency, receiveBill);
app.post('/:id/cancel', userMiddleware, requiredIdempotency, cancelBill);
app.post('/:id/duplicate', userMiddleware, requiredIdempotency, duplicateBill);
app.post('/:id/stop-recurring', userMiddleware, requiredIdempotency, stopRecurring);
app.post('/:id/generate-next', userMiddleware, requiredIdempotency, generateNextBill);
app.post('/:id/approve', userMiddleware, requiredIdempotency, approveBill);
app.post('/:id/pay', userMiddleware, requiredIdempotency, payBill);
app.post('/:id/post-to-gl', userMiddleware, requiredIdempotency, postToGL);

// Attachment routes
app.post('/:id/attachments', userMiddleware, uploadAttachment);
app.delete('/:id/attachments/:attachmentId', userMiddleware, requiredIdempotency, deleteAttachment);

module.exports = app;
