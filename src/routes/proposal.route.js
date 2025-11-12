const express = require('express');
const { userMiddleware } = require('../middlewares');
const { 
    createProposal, 
    getJobProposals, 
    getMyProposals,
    acceptProposal,
    rejectProposal,
    withdrawProposal
} = require('../controllers/proposal.controller');

const app = express.Router();

// Create proposal
app.post('/', userMiddleware, createProposal);

// Get proposals for a job (client only)
app.get('/job/:jobId', userMiddleware, getJobProposals);

// Get my proposals (lawyer)
app.get('/my-proposals', userMiddleware, getMyProposals);

// Accept proposal (client)
app.patch('/accept/:_id', userMiddleware, acceptProposal);

// Reject proposal (client)
app.patch('/reject/:_id', userMiddleware, rejectProposal);

// Withdraw proposal (lawyer)
app.patch('/withdraw/:_id', userMiddleware, withdrawProposal);

module.exports = app;
