const express = require('express');
const { userMiddleware } = require('../middlewares');
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

// Collection routes
app.post('/', userMiddleware, createBill);
app.get('/', userMiddleware, getBills);

// Static routes (must come before /:id)
app.get('/overdue', userMiddleware, getOverdueBills);
app.get('/summary', userMiddleware, getSummary);
app.get('/recurring', userMiddleware, getRecurringBills);
app.get('/reports/aging', userMiddleware, getAgingReport);
app.get('/export', userMiddleware, exportBills);

// Single bill routes
app.get('/:id', userMiddleware, getBill);
app.put('/:id', userMiddleware, updateBill);
app.delete('/:id', userMiddleware, deleteBill);

// Bill actions
app.post('/:id/receive', userMiddleware, receiveBill);
app.post('/:id/cancel', userMiddleware, cancelBill);
app.post('/:id/duplicate', userMiddleware, duplicateBill);
app.post('/:id/stop-recurring', userMiddleware, stopRecurring);
app.post('/:id/generate-next', userMiddleware, generateNextBill);
app.post('/:id/approve', userMiddleware, approveBill);
app.post('/:id/pay', userMiddleware, payBill);
app.post('/:id/post-to-gl', userMiddleware, postToGL);

// Attachment routes
app.post('/:id/attachments', userMiddleware, uploadAttachment);
app.delete('/:id/attachments/:attachmentId', userMiddleware, deleteAttachment);

module.exports = app;
