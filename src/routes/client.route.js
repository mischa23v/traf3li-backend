const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const upload = require('../configs/multer');
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
app.post('/', userMiddleware, firmFilter, createClient);
app.get('/', userMiddleware, firmFilter, getClients);

// ─────────────────────────────────────────────────────────
// SPECIAL QUERIES
// ─────────────────────────────────────────────────────────
app.get('/search', userMiddleware, firmFilter, searchClients);
app.get('/stats', userMiddleware, firmFilter, getClientStats);
app.get('/top-revenue', userMiddleware, firmFilter, getTopClientsByRevenue);

// ─────────────────────────────────────────────────────────
// SINGLE CLIENT
// ─────────────────────────────────────────────────────────
app.get('/:id', userMiddleware, firmFilter, getClient);
app.put('/:id', userMiddleware, firmFilter, updateClient);
app.delete('/:id', userMiddleware, firmFilter, deleteClient);

// ─────────────────────────────────────────────────────────
// BILLING & FINANCE LINKED DATA
// ─────────────────────────────────────────────────────────
app.get('/:id/billing-info', userMiddleware, firmFilter, getBillingInfo);
app.get('/:id/cases', userMiddleware, firmFilter, getClientCases);
app.get('/:id/invoices', userMiddleware, firmFilter, getClientInvoices);
app.get('/:id/payments', userMiddleware, firmFilter, getClientPayments);

// ─────────────────────────────────────────────────────────
// VERIFICATION (Saudi Government Portals)
// ─────────────────────────────────────────────────────────
app.post('/:id/verify/wathq', userMiddleware, firmFilter, verifyWathq);       // Commercial Registry (Wathq API)
app.get('/:id/wathq/:dataType', userMiddleware, firmFilter, getWathqData);    // Additional Wathq data (managers/owners/capital/branches/status)

// ─────────────────────────────────────────────────────────
// ATTACHMENTS
// ─────────────────────────────────────────────────────────
app.post('/:id/attachments', userMiddleware, firmFilter, upload.array('files', 10), uploadAttachments);
app.delete('/:id/attachments/:attachmentId', userMiddleware, firmFilter, deleteAttachment);

// ─────────────────────────────────────────────────────────
// CONFLICT CHECK
// ─────────────────────────────────────────────────────────
app.post('/:id/conflict-check', userMiddleware, firmFilter, runConflictCheck);

// ─────────────────────────────────────────────────────────
// STATUS & FLAGS
// ─────────────────────────────────────────────────────────
app.patch('/:id/status', userMiddleware, firmFilter, updateStatus);
app.patch('/:id/flags', userMiddleware, firmFilter, updateFlags);

// ─────────────────────────────────────────────────────────
// BULK OPERATIONS
// ─────────────────────────────────────────────────────────
app.delete('/bulk', userMiddleware, firmFilter, bulkDeleteClients);

module.exports = app;
