const express = require('express');
const { userMiddleware } = require('../middlewares');
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
    verifyYakeen,
    verifyWathq,
    getWathqData,
    verifyMOJ,
    verifyAttorney
} = require('../controllers/client.controller');

const app = express.Router();

// ─────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────
app.post('/', userMiddleware, createClient);
app.get('/', userMiddleware, getClients);

// ─────────────────────────────────────────────────────────
// SPECIAL QUERIES
// ─────────────────────────────────────────────────────────
app.get('/search', userMiddleware, searchClients);
app.get('/stats', userMiddleware, getClientStats);
app.get('/top-revenue', userMiddleware, getTopClientsByRevenue);

// ─────────────────────────────────────────────────────────
// SINGLE CLIENT
// ─────────────────────────────────────────────────────────
app.get('/:id', userMiddleware, getClient);
app.put('/:id', userMiddleware, updateClient);
app.delete('/:id', userMiddleware, deleteClient);

// ─────────────────────────────────────────────────────────
// BILLING & FINANCE LINKED DATA
// ─────────────────────────────────────────────────────────
app.get('/:id/billing-info', userMiddleware, getBillingInfo);
app.get('/:id/cases', userMiddleware, getClientCases);
app.get('/:id/invoices', userMiddleware, getClientInvoices);
app.get('/:id/payments', userMiddleware, getClientPayments);

// ─────────────────────────────────────────────────────────
// VERIFICATION (Saudi Government Portals)
// ─────────────────────────────────────────────────────────
app.post('/:id/verify/yakeen', userMiddleware, verifyYakeen);     // National ID (requires API - disabled)
app.post('/:id/verify/wathq', userMiddleware, verifyWathq);       // Commercial Registry (Wathq API)
app.get('/:id/wathq/:dataType', userMiddleware, getWathqData);    // Additional Wathq data (managers/owners/capital/branches/status)
app.post('/:id/verify/moj', userMiddleware, verifyMOJ);           // Power of Attorney (free portal)
app.post('/:id/verify/attorney', userMiddleware, verifyAttorney); // Attorney License (free portal)

// ─────────────────────────────────────────────────────────
// ATTACHMENTS
// ─────────────────────────────────────────────────────────
app.post('/:id/attachments', userMiddleware, upload.array('files', 10), uploadAttachments);
app.delete('/:id/attachments/:attachmentId', userMiddleware, deleteAttachment);

// ─────────────────────────────────────────────────────────
// CONFLICT CHECK
// ─────────────────────────────────────────────────────────
app.post('/:id/conflict-check', userMiddleware, runConflictCheck);

// ─────────────────────────────────────────────────────────
// STATUS & FLAGS
// ─────────────────────────────────────────────────────────
app.patch('/:id/status', userMiddleware, updateStatus);
app.patch('/:id/flags', userMiddleware, updateFlags);

// ─────────────────────────────────────────────────────────
// BULK OPERATIONS
// ─────────────────────────────────────────────────────────
app.delete('/bulk', userMiddleware, bulkDeleteClients);

module.exports = app;
