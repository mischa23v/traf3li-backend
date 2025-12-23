const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize.middleware');
const billingController = require('../controllers/billing.controller');

// Plans (public)
router.get('/plans', billingController.getPlans);

// Subscription (requires auth)
router.get('/subscription', authenticate, billingController.getCurrentSubscription);
router.post('/subscription', authenticate, authorize(['owner', 'admin']), billingController.createSubscription);
router.put('/subscription', authenticate, authorize(['owner', 'admin']), billingController.changeSubscription);
router.delete('/subscription', authenticate, authorize(['owner', 'admin']), billingController.cancelSubscription);
router.post('/subscription/reactivate', authenticate, authorize(['owner', 'admin']), billingController.reactivateSubscription);

// Payment Methods
router.get('/payment-methods', authenticate, authorize(['owner', 'admin']), billingController.getPaymentMethods);
router.post('/payment-methods', authenticate, authorize(['owner', 'admin']), billingController.addPaymentMethod);
router.delete('/payment-methods/:id', authenticate, authorize(['owner', 'admin']), billingController.removePaymentMethod);
router.put('/payment-methods/:id/default', authenticate, authorize(['owner', 'admin']), billingController.setDefaultPaymentMethod);

// Setup Intent for Stripe Elements
router.post('/setup-intent', authenticate, authorize(['owner', 'admin']), billingController.createSetupIntent);

// Invoices
router.get('/invoices', authenticate, authorize(['owner', 'admin']), billingController.getInvoices);
router.get('/invoices/:id', authenticate, authorize(['owner', 'admin']), billingController.getInvoice);
router.get('/invoices/:id/pdf', authenticate, authorize(['owner', 'admin']), billingController.downloadInvoicePdf);

// Usage
router.get('/usage', authenticate, billingController.getUsage);

// Stripe Webhook (no auth, uses Stripe signature)
router.post('/webhook', express.raw({ type: 'application/json' }), billingController.handleStripeWebhook);

module.exports = router;
