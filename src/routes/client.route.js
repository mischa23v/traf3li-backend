const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const upload = require('../configs/multer');
const {
    validateCreateClient,
    validateUpdateClient,
    validateUpdateBalance,
    validateUpdateStatus,
    validateUpdateFlags,
    validateSearchClients,
    validateConflictCheck,
    validateVerifyWathq,
    validateBulkDelete,
    validateIdParam
} = require('../validators/client.validator');
const {
    createClient,
    getClients,
    getClient,
    getBillingInfo,
    getClientCases,
    getClientInvoices,
    getClientPayments,
    updateClient,
    deleteClient,
    searchClients,
    getClientStats,
    getTopClientsByRevenue,
    bulkDeleteClients,
    runConflictCheck,
    updateStatus,
    updateFlags,
    uploadAttachments,
    deleteAttachment,
    verifyWathq,
    getWathqData
} = require('../controllers/client.controller');

const app = express.Router();

// ─────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────
app.post('/', userMiddleware, firmFilter, validateCreateClient, createClient);
app.get('/', userMiddleware, firmFilter, getClients);

// ─────────────────────────────────────────────────────────
// SPECIAL QUERIES
// ─────────────────────────────────────────────────────────
app.get('/search', userMiddleware, firmFilter, validateSearchClients, searchClients);
app.get('/stats', userMiddleware, firmFilter, getClientStats);
app.get('/top-revenue', userMiddleware, firmFilter, getTopClientsByRevenue);

// ─────────────────────────────────────────────────────────
// SINGLE CLIENT
// ─────────────────────────────────────────────────────────
app.get('/:id', userMiddleware, firmFilter, validateIdParam, getClient);
app.put('/:id', userMiddleware, firmFilter, validateIdParam, validateUpdateClient, updateClient);
app.delete('/:id', userMiddleware, firmFilter, validateIdParam, deleteClient);

// ─────────────────────────────────────────────────────────
// BILLING & FINANCE LINKED DATA
// ─────────────────────────────────────────────────────────
app.get('/:id/billing-info', userMiddleware, firmFilter, validateIdParam, getBillingInfo);
app.get('/:id/cases', userMiddleware, firmFilter, validateIdParam, getClientCases);
app.get('/:id/invoices', userMiddleware, firmFilter, validateIdParam, getClientInvoices);
app.get('/:id/payments', userMiddleware, firmFilter, validateIdParam, getClientPayments);

// ─────────────────────────────────────────────────────────
// VERIFICATION (Saudi Government Portals)
// ─────────────────────────────────────────────────────────
app.post('/:id/verify/wathq', userMiddleware, firmFilter, validateIdParam, validateVerifyWathq, verifyWathq);       // Commercial Registry (Wathq API)
app.get('/:id/wathq/:dataType', userMiddleware, firmFilter, validateIdParam, getWathqData);    // Additional Wathq data (managers/owners/capital/branches/status)

// ─────────────────────────────────────────────────────────
// ATTACHMENTS
// ─────────────────────────────────────────────────────────
app.post('/:id/attachments', userMiddleware, firmFilter, validateIdParam, upload.array('files', 10), uploadAttachments);
app.delete('/:id/attachments/:attachmentId', userMiddleware, firmFilter, validateIdParam, deleteAttachment);

// ─────────────────────────────────────────────────────────
// CONFLICT CHECK
// ─────────────────────────────────────────────────────────
app.post('/:id/conflict-check', userMiddleware, firmFilter, validateIdParam, validateConflictCheck, runConflictCheck);

// ─────────────────────────────────────────────────────────
// STATUS & FLAGS
// ─────────────────────────────────────────────────────────
app.patch('/:id/status', userMiddleware, firmFilter, validateIdParam, validateUpdateStatus, updateStatus);
app.patch('/:id/flags', userMiddleware, firmFilter, validateIdParam, validateUpdateFlags, updateFlags);

// ─────────────────────────────────────────────────────────
// BULK OPERATIONS
// ─────────────────────────────────────────────────────────
app.delete('/bulk', userMiddleware, firmFilter, validateBulkDelete, bulkDeleteClients);

module.exports = app;
