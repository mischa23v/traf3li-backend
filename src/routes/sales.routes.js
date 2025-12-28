/**
 * Sales Module Routes
 * Includes: Sales Orders, Deliveries, Returns, Commissions
 *
 * Note: Authentication and firm context are handled globally by authenticatedApi middleware
 */

const express = require('express');
const router = express.Router();

// Controllers
const SalesOrderController = require('../controllers/salesOrder.controller');
const DeliveryController = require('../controllers/delivery.controller');
const ReturnsController = require('../controllers/returns.controller');
const CommissionController = require('../controllers/commission.controller');

// ═══════════════════════════════════════════════════════════════
// SALES ORDERS
// ═══════════════════════════════════════════════════════════════

// List and get
router.get('/orders', SalesOrderController.getSalesOrders);
router.get('/orders/statistics', SalesOrderController.getStatistics);
router.get('/orders/by-salesperson', SalesOrderController.getSalesBySalesperson);
router.get('/orders/top-customers', SalesOrderController.getTopCustomers);
router.get('/orders/:id', SalesOrderController.getSalesOrder);

// Create
router.post('/orders/from-quote', SalesOrderController.createFromQuote);
router.post('/orders/from-lead', SalesOrderController.createFromLead);
router.post('/orders', SalesOrderController.createForClient);

// Lifecycle
router.post('/orders/:id/confirm', SalesOrderController.confirmOrder);
router.post('/orders/:id/cancel', SalesOrderController.cancelOrder);
router.post('/orders/:id/complete', SalesOrderController.completeOrder);

// Items
router.post('/orders/:id/items', SalesOrderController.addItem);
router.put('/orders/:id/items/:itemId', SalesOrderController.updateItem);
router.delete('/orders/:id/items/:itemId', SalesOrderController.removeItem);

// Pricing
router.post('/orders/:id/apply-pricing', SalesOrderController.applyPricingRules);
router.post('/orders/:id/discount', SalesOrderController.applyDiscount);

// Fulfillment
router.post('/orders/:id/delivery', SalesOrderController.createDeliveryNote);
router.post('/orders/:id/invoice', SalesOrderController.createInvoice);
router.post('/orders/:id/payment', SalesOrderController.recordPayment);

// ═══════════════════════════════════════════════════════════════
// DELIVERIES
// ═══════════════════════════════════════════════════════════════

// List and get
router.get('/deliveries', DeliveryController.getDeliveries);
router.get('/deliveries/pending', DeliveryController.getPendingDeliveries);
router.get('/deliveries/in-transit', DeliveryController.getInTransit);
router.get('/deliveries/statistics', DeliveryController.getStatistics);
router.get('/deliveries/by-carrier', DeliveryController.getByCarrier);
router.get('/deliveries/:id', DeliveryController.getDelivery);
router.get('/deliveries/:id/tracking', DeliveryController.getTrackingHistory);

// Create and update
router.post('/deliveries', DeliveryController.createDelivery);
router.put('/deliveries/:id', DeliveryController.updateDelivery);

// Workflow
router.post('/deliveries/:id/start-picking', DeliveryController.startPicking);
router.post('/deliveries/:id/complete-picking', DeliveryController.completePicking);
router.post('/deliveries/:id/complete-packing', DeliveryController.completePacking);
router.post('/deliveries/:id/ship', DeliveryController.shipDelivery);

// Tracking
router.post('/deliveries/:id/tracking', DeliveryController.addTrackingEvent);

// Proof of delivery
router.post('/deliveries/:id/deliver', DeliveryController.recordDelivery);
router.post('/deliveries/:id/failed-attempt', DeliveryController.recordFailedAttempt);

// Cancel and returns
router.post('/deliveries/:id/cancel', DeliveryController.cancelDelivery);
router.post('/deliveries/:id/return-pickup', DeliveryController.createReturnPickup);

// ═══════════════════════════════════════════════════════════════
// RETURNS (RMA)
// ═══════════════════════════════════════════════════════════════

// List and get
router.get('/returns', ReturnsController.getReturns);
router.get('/returns/pending', ReturnsController.getPendingReturns);
router.get('/returns/requiring-inspection', ReturnsController.getRequiringInspection);
router.get('/returns/statistics', ReturnsController.getStatistics);
router.get('/returns/rate', ReturnsController.getReturnRate);
router.get('/returns/:id', ReturnsController.getReturn);

// Create
router.post('/returns/from-order', ReturnsController.createFromSalesOrder);
router.post('/returns/from-delivery', ReturnsController.createFromDelivery);

// Workflow
router.post('/returns/:id/submit', ReturnsController.submitReturn);
router.post('/returns/:id/approve', ReturnsController.approveReturn);
router.post('/returns/:id/reject', ReturnsController.rejectReturn);

// Receiving and inspection
router.post('/returns/:id/receive', ReturnsController.receiveItems);
router.post('/returns/:id/inspect', ReturnsController.recordInspection);

// Resolution
router.post('/returns/:id/process', ReturnsController.processResolution);
router.post('/returns/:id/complete', ReturnsController.completeReturn);

// Shipping
router.post('/returns/:id/schedule-pickup', ReturnsController.schedulePickup);
router.post('/returns/:id/return-label', ReturnsController.generateReturnLabel);

// ═══════════════════════════════════════════════════════════════
// COMMISSIONS
// ═══════════════════════════════════════════════════════════════

// Plans
router.get('/commissions/plans', CommissionController.getPlans);
router.get('/commissions/plans/:id', CommissionController.getPlan);
router.post('/commissions/plans', CommissionController.createPlan);
router.put('/commissions/plans/:id', CommissionController.updatePlan);
router.post('/commissions/plans/:id/assign', CommissionController.assignPlan);

// Calculation
router.post('/commissions/calculate', CommissionController.calculateForTransaction);
router.post('/commissions/calculate-period', CommissionController.calculateForPeriod);

// Settlements
router.get('/commissions/settlements', CommissionController.getSettlements);
router.get('/commissions/settlements/pending', CommissionController.getPendingSettlements);
router.get('/commissions/settlements/pending-payments', CommissionController.getPendingPayments);
router.get('/commissions/settlements/:id', CommissionController.getSettlement);
router.get('/commissions/settlements/:id/statement', CommissionController.generateStatement);
router.post('/commissions/settlements', CommissionController.createSettlement);
router.post('/commissions/settlements/:id/submit', CommissionController.submitSettlement);
router.post('/commissions/settlements/:id/approve', CommissionController.approveSettlement);
router.post('/commissions/settlements/:id/reject', CommissionController.rejectSettlement);
router.post('/commissions/settlements/:id/schedule-payment', CommissionController.schedulePayment);
router.post('/commissions/settlements/:id/record-payment', CommissionController.recordPayment);
router.post('/commissions/settlements/:id/clawback', CommissionController.processClawback);

// Analytics
router.get('/commissions/by-salesperson', CommissionController.getSummaryBySalesperson);
router.get('/commissions/monthly-trend', CommissionController.getMonthlyTrend);

module.exports = router;
