const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const refundPolicyService = require('../../../src/services/refundPolicy.service');
const Refund = require('../../../src/models/refund.model');
const Payment = require('../../../src/models/payment.model');
const Case = require('../../../src/models/case.model');
const Invoice = require('../../../src/models/invoice.model');

let mongoServer;

describe('Refund Policy Service', () => {
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        // Clear collections before each test
        await Promise.all([
            Refund.deleteMany({}),
            Payment.deleteMany({}),
            Case.deleteMany({}),
            Invoice.deleteMany({})
        ]);
    });

    describe('getRefundEligibility', () => {
        it('should return FULL_REFUND for payment within 24 hours and service not started', async () => {
            // Create a recent payment
            const payment = await Payment.create({
                paymentNumber: 'PAY-TEST-001',
                amount: 1000,
                currency: 'SAR',
                paymentDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                paymentMethod: 'credit_card',
                status: 'completed',
                lawyerId: new mongoose.Types.ObjectId(),
                customerId: new mongoose.Types.ObjectId()
            });

            const eligibility = await refundPolicyService.getRefundEligibility(payment._id);

            expect(eligibility.eligible).toBe(true);
            expect(eligibility.policy).toBe('FULL_REFUND');
            expect(eligibility.refundPercent).toBe(100);
            expect(eligibility.refundAmount).toBe(1000);
            expect(eligibility.requiresApproval).toBe(false);
        });

        it('should return PARTIAL_75 for payment within 7 days and service not started', async () => {
            const payment = await Payment.create({
                paymentNumber: 'PAY-TEST-002',
                amount: 2000,
                currency: 'SAR',
                paymentDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
                paymentMethod: 'credit_card',
                status: 'completed',
                lawyerId: new mongoose.Types.ObjectId(),
                customerId: new mongoose.Types.ObjectId()
            });

            const eligibility = await refundPolicyService.getRefundEligibility(payment._id);

            expect(eligibility.eligible).toBe(true);
            expect(eligibility.policy).toBe('PARTIAL_75');
            expect(eligibility.refundPercent).toBe(75);
            expect(eligibility.refundAmount).toBe(1500);
            expect(eligibility.requiresApproval).toBe(true);
        });

        it('should return PARTIAL_50 for service less than 25% complete', async () => {
            const caseData = await Case.create({
                title: 'Test Case',
                status: 'active',  // 25% complete
                progress: 20
            });

            const payment = await Payment.create({
                paymentNumber: 'PAY-TEST-003',
                amount: 5000,
                currency: 'SAR',
                paymentDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
                paymentMethod: 'credit_card',
                status: 'completed',
                lawyerId: new mongoose.Types.ObjectId(),
                customerId: new mongoose.Types.ObjectId(),
                caseId: caseData._id
            });

            const eligibility = await refundPolicyService.getRefundEligibility(payment._id);

            expect(eligibility.eligible).toBe(true);
            expect(eligibility.policy).toBe('PARTIAL_50');
            expect(eligibility.refundPercent).toBe(50);
            expect(eligibility.refundAmount).toBe(2500);
        });

        it('should return PARTIAL_25 for service between 25% and 50% complete', async () => {
            const caseData = await Case.create({
                title: 'Test Case',
                status: 'in_progress',
                progress: 40
            });

            const payment = await Payment.create({
                paymentNumber: 'PAY-TEST-004',
                amount: 4000,
                currency: 'SAR',
                paymentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
                paymentMethod: 'credit_card',
                status: 'completed',
                lawyerId: new mongoose.Types.ObjectId(),
                customerId: new mongoose.Types.ObjectId(),
                caseId: caseData._id
            });

            const eligibility = await refundPolicyService.getRefundEligibility(payment._id);

            expect(eligibility.eligible).toBe(true);
            expect(eligibility.policy).toBe('PARTIAL_25');
            expect(eligibility.refundPercent).toBe(25);
            expect(eligibility.refundAmount).toBe(1000);
        });

        it('should return NO_REFUND for service more than 50% complete', async () => {
            const caseData = await Case.create({
                title: 'Test Case',
                status: 'hearing_scheduled',
                progress: 60
            });

            const payment = await Payment.create({
                paymentNumber: 'PAY-TEST-005',
                amount: 3000,
                currency: 'SAR',
                paymentDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
                paymentMethod: 'credit_card',
                status: 'completed',
                lawyerId: new mongoose.Types.ObjectId(),
                customerId: new mongoose.Types.ObjectId(),
                caseId: caseData._id
            });

            const eligibility = await refundPolicyService.getRefundEligibility(payment._id);

            expect(eligibility.eligible).toBe(false);
            expect(eligibility.policy).toBe('NO_REFUND');
            expect(eligibility.refundPercent).toBe(0);
            expect(eligibility.refundAmount).toBe(0);
        });

        it('should not be eligible for already refunded payment', async () => {
            const payment = await Payment.create({
                paymentNumber: 'PAY-TEST-006',
                amount: 1000,
                currency: 'SAR',
                paymentDate: new Date(),
                paymentMethod: 'credit_card',
                status: 'refunded',
                lawyerId: new mongoose.Types.ObjectId(),
                customerId: new mongoose.Types.ObjectId(),
                isRefund: true
            });

            const eligibility = await refundPolicyService.getRefundEligibility(payment._id);

            expect(eligibility.eligible).toBe(false);
            expect(eligibility.reason).toBe('Payment already refunded');
        });
    });

    describe('calculateRefundAmount', () => {
        it('should calculate correct refund amount', async () => {
            const payment = await Payment.create({
                paymentNumber: 'PAY-TEST-007',
                amount: 1500,
                currency: 'SAR',
                paymentDate: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
                paymentMethod: 'credit_card',
                status: 'completed',
                lawyerId: new mongoose.Types.ObjectId(),
                customerId: new mongoose.Types.ObjectId()
            });

            const result = await refundPolicyService.calculateRefundAmount(
                payment._id,
                'policy_based'
            );

            expect(result.success).toBe(true);
            expect(result.eligible).toBe(true);
            expect(result.refundAmount).toBe(1500);
            expect(result.refundPercent).toBe(100);
        });
    });

    describe('processRefund', () => {
        it('should create a refund request with policy-based amount', async () => {
            const userId = new mongoose.Types.ObjectId();
            const customerId = new mongoose.Types.ObjectId();

            const payment = await Payment.create({
                paymentNumber: 'PAY-TEST-008',
                amount: 2000,
                currency: 'SAR',
                paymentDate: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10 hours ago
                paymentMethod: 'credit_card',
                status: 'completed',
                lawyerId: new mongoose.Types.ObjectId(),
                customerId: customerId
            });

            const result = await refundPolicyService.processRefund(
                payment._id,
                null,  // Use policy amount
                'service_cancelled',
                userId,
                {
                    reasonDetails: 'Client cancelled service',
                    internalNotes: 'VIP client'
                }
            );

            expect(result.success).toBe(true);
            expect(result.refund).toBeDefined();
            expect(result.refund.requestedAmount).toBe(2000);
            expect(result.refund.status).toBe('approved');  // Auto-approved for FULL_REFUND
            expect(result.refund.reason).toBe('service_cancelled');
            expect(result.refund.policyApplied.policyName).toBe('FULL_REFUND');
        });

        it('should create pending refund for policies requiring approval', async () => {
            const userId = new mongoose.Types.ObjectId();
            const customerId = new mongoose.Types.ObjectId();

            const payment = await Payment.create({
                paymentNumber: 'PAY-TEST-009',
                amount: 3000,
                currency: 'SAR',
                paymentDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
                paymentMethod: 'credit_card',
                status: 'completed',
                lawyerId: new mongoose.Types.ObjectId(),
                customerId: customerId
            });

            const result = await refundPolicyService.processRefund(
                payment._id,
                null,
                'client_request',
                userId
            );

            expect(result.success).toBe(true);
            expect(result.refund.status).toBe('pending');
            expect(result.refund.requiresApproval).toBe(true);
            expect(result.refund.policyApplied.policyName).toBe('PARTIAL_75');
        });

        it('should allow custom refund amount', async () => {
            const userId = new mongoose.Types.ObjectId();
            const customerId = new mongoose.Types.ObjectId();

            const payment = await Payment.create({
                paymentNumber: 'PAY-TEST-010',
                amount: 5000,
                currency: 'SAR',
                paymentDate: new Date(Date.now() - 1 * 60 * 60 * 1000),
                paymentMethod: 'credit_card',
                status: 'completed',
                lawyerId: new mongoose.Types.ObjectId(),
                customerId: customerId
            });

            const result = await refundPolicyService.processRefund(
                payment._id,
                2500,  // Custom amount
                'overpayment',
                userId
            );

            expect(result.success).toBe(true);
            expect(result.refund.requestedAmount).toBe(2500);
        });
    });

    describe('approveRefund', () => {
        it('should approve a pending refund', async () => {
            const userId = new mongoose.Types.ObjectId();
            const approverId = new mongoose.Types.ObjectId();

            const refund = await Refund.create({
                firmId: new mongoose.Types.ObjectId(),
                paymentId: new mongoose.Types.ObjectId(),
                originalAmount: 1000,
                requestedAmount: 750,
                currency: 'SAR',
                reason: 'client_request',
                status: 'pending',
                customerId: new mongoose.Types.ObjectId(),
                requestedBy: userId,
                serviceTracking: {
                    purchaseDate: new Date(),
                    serviceStarted: false,
                    serviceCompletionPercent: 0,
                    timeSincePurchase: 3 * 24 * 60 * 60 * 1000
                }
            });

            const approved = await refundPolicyService.approveRefund(
                refund._id,
                approverId,
                750,
                'Approved as per policy'
            );

            expect(approved.status).toBe('approved');
            expect(approved.approvedBy.toString()).toBe(approverId.toString());
            expect(approved.approvedAmount).toBe(750);
            expect(approved.approvalHistory.length).toBe(1);
        });

        it('should not approve non-pending refund', async () => {
            const refund = await Refund.create({
                firmId: new mongoose.Types.ObjectId(),
                paymentId: new mongoose.Types.ObjectId(),
                originalAmount: 1000,
                requestedAmount: 1000,
                currency: 'SAR',
                reason: 'duplicate',
                status: 'completed',
                customerId: new mongoose.Types.ObjectId(),
                requestedBy: new mongoose.Types.ObjectId(),
                serviceTracking: {
                    purchaseDate: new Date(),
                    serviceStarted: false,
                    serviceCompletionPercent: 0,
                    timeSincePurchase: 1000
                }
            });

            await expect(
                refundPolicyService.approveRefund(
                    refund._id,
                    new mongoose.Types.ObjectId()
                )
            ).rejects.toThrow('Only pending refunds can be approved');
        });
    });

    describe('rejectRefund', () => {
        it('should reject a pending refund', async () => {
            const userId = new mongoose.Types.ObjectId();
            const rejectorId = new mongoose.Types.ObjectId();

            const refund = await Refund.create({
                firmId: new mongoose.Types.ObjectId(),
                paymentId: new mongoose.Types.ObjectId(),
                originalAmount: 1000,
                requestedAmount: 250,
                currency: 'SAR',
                reason: 'client_request',
                status: 'pending',
                customerId: new mongoose.Types.ObjectId(),
                requestedBy: userId,
                serviceTracking: {
                    purchaseDate: new Date(),
                    serviceStarted: true,
                    serviceCompletionPercent: 60,
                    timeSincePurchase: 30 * 24 * 60 * 60 * 1000
                }
            });

            const rejected = await refundPolicyService.rejectRefund(
                refund._id,
                rejectorId,
                'Service already 60% complete - beyond policy threshold'
            );

            expect(rejected.status).toBe('rejected');
            expect(rejected.rejectedBy.toString()).toBe(rejectorId.toString());
            expect(rejected.rejectionReason).toBe('Service already 60% complete - beyond policy threshold');
        });
    });

    describe('getRefundHistory', () => {
        it('should return refund history for a customer', async () => {
            const customerId = new mongoose.Types.ObjectId();

            // Create multiple refunds
            await Refund.create([
                {
                    firmId: new mongoose.Types.ObjectId(),
                    paymentId: new mongoose.Types.ObjectId(),
                    originalAmount: 1000,
                    requestedAmount: 1000,
                    currency: 'SAR',
                    reason: 'duplicate',
                    status: 'completed',
                    customerId,
                    requestedBy: customerId,
                    serviceTracking: {
                        purchaseDate: new Date(),
                        serviceStarted: false,
                        serviceCompletionPercent: 0,
                        timeSincePurchase: 1000
                    }
                },
                {
                    firmId: new mongoose.Types.ObjectId(),
                    paymentId: new mongoose.Types.ObjectId(),
                    originalAmount: 2000,
                    requestedAmount: 1500,
                    currency: 'SAR',
                    reason: 'service_cancelled',
                    status: 'pending',
                    customerId,
                    requestedBy: customerId,
                    serviceTracking: {
                        purchaseDate: new Date(),
                        serviceStarted: false,
                        serviceCompletionPercent: 0,
                        timeSincePurchase: 5000
                    }
                }
            ]);

            const history = await refundPolicyService.getRefundHistory(customerId, {
                limit: 10
            });

            expect(history.refunds.length).toBe(2);
            expect(history.total).toBe(2);
            expect(history.hasMore).toBe(false);
        });

        it('should filter refunds by status', async () => {
            const customerId = new mongoose.Types.ObjectId();

            await Refund.create([
                {
                    firmId: new mongoose.Types.ObjectId(),
                    paymentId: new mongoose.Types.ObjectId(),
                    originalAmount: 1000,
                    requestedAmount: 1000,
                    currency: 'SAR',
                    reason: 'duplicate',
                    status: 'completed',
                    customerId,
                    requestedBy: customerId,
                    serviceTracking: {
                        purchaseDate: new Date(),
                        serviceStarted: false,
                        serviceCompletionPercent: 0,
                        timeSincePurchase: 1000
                    }
                },
                {
                    firmId: new mongoose.Types.ObjectId(),
                    paymentId: new mongoose.Types.ObjectId(),
                    originalAmount: 2000,
                    requestedAmount: 2000,
                    currency: 'SAR',
                    reason: 'error',
                    status: 'pending',
                    customerId,
                    requestedBy: customerId,
                    serviceTracking: {
                        purchaseDate: new Date(),
                        serviceStarted: false,
                        serviceCompletionPercent: 0,
                        timeSincePurchase: 2000
                    }
                }
            ]);

            const history = await refundPolicyService.getRefundHistory(customerId, {
                status: 'completed'
            });

            expect(history.refunds.length).toBe(1);
            expect(history.refunds[0].status).toBe('completed');
        });
    });

    describe('getPendingRefunds', () => {
        it('should return all pending refunds', async () => {
            const firmId = new mongoose.Types.ObjectId();

            await Refund.create([
                {
                    firmId,
                    paymentId: new mongoose.Types.ObjectId(),
                    originalAmount: 1000,
                    requestedAmount: 750,
                    currency: 'SAR',
                    reason: 'client_request',
                    status: 'pending',
                    customerId: new mongoose.Types.ObjectId(),
                    requestedBy: new mongoose.Types.ObjectId(),
                    serviceTracking: {
                        purchaseDate: new Date(),
                        serviceStarted: false,
                        serviceCompletionPercent: 0,
                        timeSincePurchase: 3000
                    }
                },
                {
                    firmId,
                    paymentId: new mongoose.Types.ObjectId(),
                    originalAmount: 2000,
                    requestedAmount: 1000,
                    currency: 'SAR',
                    reason: 'service_cancelled',
                    status: 'pending',
                    customerId: new mongoose.Types.ObjectId(),
                    requestedBy: new mongoose.Types.ObjectId(),
                    serviceTracking: {
                        purchaseDate: new Date(),
                        serviceStarted: false,
                        serviceCompletionPercent: 0,
                        timeSincePurchase: 4000
                    }
                },
                {
                    firmId,
                    paymentId: new mongoose.Types.ObjectId(),
                    originalAmount: 3000,
                    requestedAmount: 3000,
                    currency: 'SAR',
                    reason: 'duplicate',
                    status: 'completed',
                    customerId: new mongoose.Types.ObjectId(),
                    requestedBy: new mongoose.Types.ObjectId(),
                    serviceTracking: {
                        purchaseDate: new Date(),
                        serviceStarted: false,
                        serviceCompletionPercent: 0,
                        timeSincePurchase: 5000
                    }
                }
            ]);

            const pending = await refundPolicyService.getPendingRefunds(firmId);

            expect(pending.refunds.length).toBe(2);
            expect(pending.total).toBe(2);
            pending.refunds.forEach(refund => {
                expect(refund.status).toBe('pending');
            });
        });
    });

    describe('getRefundStatistics', () => {
        it('should return correct statistics', async () => {
            const firmId = new mongoose.Types.ObjectId();

            await Refund.create([
                {
                    firmId,
                    paymentId: new mongoose.Types.ObjectId(),
                    originalAmount: 1000,
                    requestedAmount: 1000,
                    approvedAmount: 1000,
                    processedAmount: 1000,
                    currency: 'SAR',
                    reason: 'duplicate',
                    status: 'completed',
                    customerId: new mongoose.Types.ObjectId(),
                    requestedBy: new mongoose.Types.ObjectId(),
                    policyApplied: {
                        policyName: 'FULL_REFUND',
                        refundPercent: 100
                    },
                    serviceTracking: {
                        purchaseDate: new Date(),
                        serviceStarted: false,
                        serviceCompletionPercent: 0,
                        timeSincePurchase: 1000
                    }
                },
                {
                    firmId,
                    paymentId: new mongoose.Types.ObjectId(),
                    originalAmount: 2000,
                    requestedAmount: 1500,
                    approvedAmount: 1500,
                    processedAmount: 0,
                    currency: 'SAR',
                    reason: 'client_request',
                    status: 'pending',
                    customerId: new mongoose.Types.ObjectId(),
                    requestedBy: new mongoose.Types.ObjectId(),
                    policyApplied: {
                        policyName: 'PARTIAL_75',
                        refundPercent: 75
                    },
                    serviceTracking: {
                        purchaseDate: new Date(),
                        serviceStarted: false,
                        serviceCompletionPercent: 0,
                        timeSincePurchase: 2000
                    }
                }
            ]);

            const stats = await refundPolicyService.getRefundStatistics({ firmId });

            expect(stats.overview.totalRefunds).toBe(2);
            expect(stats.overview.totalRequested).toBe(2500);
            expect(stats.overview.totalApproved).toBe(2500);
            expect(stats.overview.totalProcessed).toBe(1000);
            expect(stats.overview.pendingCount).toBe(1);
            expect(stats.overview.completedCount).toBe(1);
        });
    });
});
