/**
 * Payment Integration Tests
 * Tests for creating payments, applying to invoices, refunds, reconciliation, and validation
 */

const mongoose = require('mongoose');
const Payment = require('../../src/models/payment.model');
const Invoice = require('../../src/models/invoice.model');
const Client = require('../../src/models/client.model');
const Firm = require('../../src/models/firm.model');
const User = require('../../src/models/user.model');

describe('Payment Integration Tests', () => {
    let testFirm, testLawyer, testClient, testInvoice;

    beforeEach(async () => {
        // Create test firm
        testFirm = await Firm.create({
            name: 'Test Law Firm',
            nameArabic: 'مكتب اختبار قانوني',
            crNumber: '1234567890',
            status: 'active'
        });

        // Create test lawyer
        testLawyer = await User.create({
            firstName: 'Ahmed',
            lastName: 'Ali',
            email: 'ahmed@testfirm.com',
            phone: '+966501234567',
            password: 'hashedPassword',
            role: 'lawyer',
            firmId: testFirm._id
        });

        // Create test client
        testClient = await Client.create({
            clientType: 'individual',
            firstName: 'Test',
            lastName: 'Client',
            fullNameArabic: 'عميل اختبار',
            phone: '+966501111111',
            lawyerId: testLawyer._id,
            firmId: testFirm._id
        });

        // Create test invoice
        testInvoice = await Invoice.create({
            clientId: testClient._id,
            lawyerId: testLawyer._id,
            firmId: testFirm._id,
            status: 'sent',
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            items: [{
                type: 'time',
                description: 'Legal services',
                quantity: 1,
                unitPrice: 1000,
                taxable: true
            }]
        });
    });

    // ============ CREATE PAYMENT ============

    describe('Create Payment', () => {
        it('should create customer payment', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                status: 'completed'
            });

            expect(payment).toBeDefined();
            expect(payment.paymentType).toBe('customer_payment');
            expect(payment.amount).toBe(1000);
            expect(payment.paymentNumber).toMatch(/^PAY-\d{6}-\d{4}$/);
        });

        it('should auto-generate payment number', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'cash',
                paymentDate: new Date()
            });

            expect(payment.paymentNumber).toBeDefined();
            expect(payment.paymentNumber).toMatch(/^PAY-\d{6}-\d{4}$/);
        });

        it('should create payment with different methods', async () => {
            const methods = ['cash', 'bank_transfer', 'sarie', 'check', 'mada', 'credit_card'];

            for (const method of methods) {
                const payment = await Payment.create({
                    paymentType: 'customer_payment',
                    customerId: testClient._id,
                    lawyerId: testLawyer._id,
                    firmId: testFirm._id,
                    amount: 1000,
                    paymentMethod: method,
                    paymentDate: new Date()
                });

                expect(payment.paymentMethod).toBe(method);
            }
        });

        it('should create payment with check details', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 5000,
                paymentMethod: 'check',
                paymentDate: new Date(),
                checkDetails: {
                    checkNumber: 'CHK-123456',
                    checkDate: new Date(),
                    bank: 'Al Rajhi Bank',
                    branch: 'Riyadh Main',
                    status: 'received'
                }
            });

            expect(payment.checkDetails.checkNumber).toBe('CHK-123456');
            expect(payment.checkDetails.bank).toBe('Al Rajhi Bank');
            expect(payment.checkDetails.status).toBe('received');
        });

        it('should create payment with card details', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 2000,
                paymentMethod: 'credit_card',
                paymentDate: new Date(),
                cardDetails: {
                    lastFour: '4242',
                    cardType: 'visa',
                    authCode: 'AUTH123',
                    transactionId: 'TXN789'
                }
            });

            expect(payment.cardDetails.lastFour).toBe('4242');
            expect(payment.cardDetails.cardType).toBe('visa');
            expect(payment.cardDetails.authCode).toBe('AUTH123');
        });

        it('should create payment with reference number', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                referenceNumber: 'REF-2024-001'
            });

            expect(payment.referenceNumber).toBe('REF-2024-001');
        });

        it('should sync customerId with clientId', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                clientId: testClient._id, // Using legacy clientId
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'cash',
                paymentDate: new Date()
            });

            expect(payment.customerId.toString()).toBe(testClient._id.toString());
            expect(payment.clientId.toString()).toBe(testClient._id.toString());
        });
    });

    // ============ APPLY TO INVOICES ============

    describe('Apply Payment to Invoices', () => {
        it('should apply payment to single invoice', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: testInvoice.totalAmount,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                status: 'completed'
            });

            await payment.applyToInvoices([{
                invoiceId: testInvoice._id,
                amount: testInvoice.totalAmount
            }]);

            expect(payment.invoiceApplications).toHaveLength(1);
            expect(payment.totalApplied).toBe(testInvoice.totalAmount);
            expect(payment.unappliedAmount).toBe(0);

            const updatedInvoice = await Invoice.findById(testInvoice._id);
            expect(updatedInvoice.status).toBe('paid');
        });

        it('should apply payment to multiple invoices', async () => {
            const invoice2 = await Invoice.create({
                clientId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                status: 'sent',
                issueDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: [{
                    type: 'time',
                    description: 'More services',
                    quantity: 1,
                    unitPrice: 500,
                    taxable: true
                }]
            });

            const totalAmount = testInvoice.totalAmount + invoice2.totalAmount;
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: totalAmount,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                status: 'completed'
            });

            await payment.applyToInvoices([
                { invoiceId: testInvoice._id, amount: testInvoice.totalAmount },
                { invoiceId: invoice2._id, amount: invoice2.totalAmount }
            ]);

            expect(payment.invoiceApplications).toHaveLength(2);
            expect(payment.totalApplied).toBe(totalAmount);
        });

        it('should apply partial payment to invoice', async () => {
            const partialAmount = testInvoice.totalAmount / 2;
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: partialAmount,
                paymentMethod: 'cash',
                paymentDate: new Date(),
                status: 'completed'
            });

            await payment.applyToInvoices([{
                invoiceId: testInvoice._id,
                amount: partialAmount
            }]);

            const updatedInvoice = await Invoice.findById(testInvoice._id);
            expect(updatedInvoice.status).toBe('partial');
            expect(updatedInvoice.balanceDue).toBeGreaterThan(0);
        });

        it('should leave unapplied amount when payment exceeds invoice', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: testInvoice.totalAmount + 500,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                status: 'completed'
            });

            await payment.applyToInvoices([{
                invoiceId: testInvoice._id,
                amount: testInvoice.totalAmount
            }]);

            expect(payment.unappliedAmount).toBe(500);
        });

        it('should unapply payment from invoice', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: testInvoice.totalAmount,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                status: 'completed',
                invoiceApplications: [{
                    invoiceId: testInvoice._id,
                    amount: testInvoice.totalAmount,
                    appliedAt: new Date()
                }]
            });

            // First apply the payment
            testInvoice.amountPaid = testInvoice.totalAmount;
            testInvoice.status = 'paid';
            await testInvoice.save();

            // Then unapply it
            await payment.unapplyFromInvoice(testInvoice._id);

            expect(payment.invoiceApplications).toHaveLength(0);
            expect(payment.unappliedAmount).toBe(payment.amount);

            const updatedInvoice = await Invoice.findById(testInvoice._id);
            expect(updatedInvoice.status).toBe('sent');
        });
    });

    // ============ REFUND ============

    describe('Refund', () => {
        it('should create refund payment', async () => {
            const originalPayment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                status: 'completed'
            });

            const refund = await Payment.create({
                paymentType: 'refund',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                status: 'completed',
                isRefund: true,
                refundDetails: {
                    originalPaymentId: originalPayment._id,
                    reason: 'duplicate',
                    method: 'original'
                }
            });

            expect(refund.isRefund).toBe(true);
            expect(refund.refundDetails.reason).toBe('duplicate');
            expect(refund.refundDetails.originalPaymentId.toString()).toBe(originalPayment._id.toString());
        });

        it('should create partial refund', async () => {
            const originalPayment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                status: 'completed'
            });

            const refund = await Payment.create({
                paymentType: 'refund',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 500,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                status: 'completed',
                isRefund: true,
                refundDetails: {
                    originalPaymentId: originalPayment._id,
                    reason: 'overpayment'
                }
            });

            expect(refund.amount).toBe(500);
            expect(refund.refundDetails.reason).toBe('overpayment');
        });

        it('should handle different refund reasons', async () => {
            const reasons = ['duplicate', 'overpayment', 'service_cancelled', 'client_request', 'error'];

            for (const reason of reasons) {
                const payment = await Payment.create({
                    paymentType: 'customer_payment',
                    customerId: testClient._id,
                    lawyerId: testLawyer._id,
                    firmId: testFirm._id,
                    amount: 1000,
                    paymentMethod: 'cash',
                    paymentDate: new Date(),
                    status: 'completed'
                });

                const refund = await Payment.create({
                    paymentType: 'refund',
                    customerId: testClient._id,
                    lawyerId: testLawyer._id,
                    firmId: testFirm._id,
                    amount: 1000,
                    paymentMethod: 'cash',
                    paymentDate: new Date(),
                    status: 'completed',
                    isRefund: true,
                    refundDetails: {
                        originalPaymentId: payment._id,
                        reason: reason
                    }
                });

                expect(refund.refundDetails.reason).toBe(reason);
            }
        });
    });

    // ============ RECONCILIATION ============

    describe('Reconciliation', () => {
        it('should reconcile payment', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                status: 'completed'
            });

            await payment.reconcile(testLawyer._id, 'STMT-2024-001');

            expect(payment.reconciliation.isReconciled).toBe(true);
            expect(payment.reconciliation.reconciledBy.toString()).toBe(testLawyer._id.toString());
            expect(payment.reconciliation.bankStatementRef).toBe('STMT-2024-001');
            expect(payment.status).toBe('reconciled');
        });

        it('should not reconcile already reconciled payment', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                status: 'completed',
                reconciliation: {
                    isReconciled: true,
                    reconciledDate: new Date(),
                    reconciledBy: testLawyer._id
                }
            });

            await expect(payment.reconcile(testLawyer._id)).rejects.toThrow('Payment already reconciled');
        });

        it('should only reconcile completed payments', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                status: 'pending'
            });

            await expect(payment.reconcile(testLawyer._id)).rejects.toThrow('Only completed payments can be reconciled');
        });

        it('should get unreconciled payments', async () => {
            await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                status: 'completed',
                reconciliation: { isReconciled: false }
            });

            const unreconciled = await Payment.getUnreconciledPayments({ firmId: testFirm._id });

            expect(unreconciled.length).toBeGreaterThan(0);
        });
    });

    // ============ CHECK HANDLING ============

    describe('Check Handling', () => {
        it('should update check status to deposited', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 5000,
                paymentMethod: 'check',
                paymentDate: new Date(),
                status: 'pending',
                checkDetails: {
                    checkNumber: 'CHK-123456',
                    checkDate: new Date(),
                    bank: 'Al Rajhi Bank',
                    status: 'received'
                }
            });

            await payment.updateCheckStatus('deposited', {
                depositDate: new Date()
            });

            expect(payment.checkDetails.status).toBe('deposited');
            expect(payment.checkDetails.depositDate).toBeInstanceOf(Date);
        });

        it('should update check status to cleared', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 5000,
                paymentMethod: 'check',
                paymentDate: new Date(),
                status: 'pending',
                checkDetails: {
                    checkNumber: 'CHK-123456',
                    checkDate: new Date(),
                    bank: 'Al Rajhi Bank',
                    status: 'deposited',
                    depositDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
                }
            });

            await payment.updateCheckStatus('cleared', {
                clearanceDate: new Date()
            });

            expect(payment.checkDetails.status).toBe('cleared');
            expect(payment.checkDetails.clearanceDate).toBeInstanceOf(Date);
            expect(payment.status).toBe('completed');
        });

        it('should handle bounced check', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 5000,
                paymentMethod: 'check',
                paymentDate: new Date(),
                status: 'pending',
                checkDetails: {
                    checkNumber: 'CHK-123456',
                    checkDate: new Date(),
                    bank: 'Al Rajhi Bank',
                    status: 'deposited'
                }
            });

            await payment.updateCheckStatus('bounced', {
                bounceReason: 'Insufficient funds'
            });

            expect(payment.checkDetails.status).toBe('bounced');
            expect(payment.checkDetails.bounceReason).toBe('Insufficient funds');
            expect(payment.status).toBe('failed');
        });

        it('should get pending checks', async () => {
            await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 5000,
                paymentMethod: 'check',
                paymentDate: new Date(),
                checkDetails: {
                    checkNumber: 'CHK-789',
                    checkDate: new Date(),
                    bank: 'Bank',
                    status: 'received'
                }
            });

            const pendingChecks = await Payment.getPendingChecks({ firmId: testFirm._id });

            expect(pendingChecks.length).toBeGreaterThan(0);
        });
    });

    // ============ FEES AND CALCULATIONS ============

    describe('Fees and Calculations', () => {
        it('should calculate payment fees', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'credit_card',
                paymentDate: new Date(),
                fees: {
                    bankFees: 10,
                    processingFees: 20,
                    otherFees: 5,
                    paidBy: 'office'
                }
            });

            expect(payment.fees.totalFees).toBe(35);
            expect(payment.netAmount).toBe(965); // 1000 - 35 (fees paid by office)
        });

        it('should calculate net amount when client pays fees', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'credit_card',
                paymentDate: new Date(),
                fees: {
                    bankFees: 10,
                    processingFees: 20,
                    paidBy: 'client'
                }
            });

            expect(payment.fees.totalFees).toBe(30);
            expect(payment.netAmount).toBe(1000); // Full amount (client paid fees)
        });

        it('should handle currency conversion', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                currency: 'USD',
                exchangeRate: 3.75,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date()
            });

            expect(payment.currency).toBe('USD');
            expect(payment.exchangeRate).toBe(3.75);
            expect(payment.amountInBaseCurrency).toBe(3750); // 1000 * 3.75
        });
    });

    // ============ OVERPAYMENT/UNDERPAYMENT ============

    describe('Overpayment/Underpayment Handling', () => {
        it('should handle overpayment with credit', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 2000,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                status: 'completed'
            });

            await payment.applyToInvoices([{
                invoiceId: testInvoice._id,
                amount: testInvoice.totalAmount
            }]);

            await payment.handleOverpayment('credit');

            expect(payment.overpaymentAction).toBe('credit');
            expect(payment.unappliedAmount).toBeGreaterThan(0);
        });

        it('should handle overpayment with hold', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 2000,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                status: 'completed'
            });

            await payment.applyToInvoices([{
                invoiceId: testInvoice._id,
                amount: testInvoice.totalAmount
            }]);

            await payment.handleOverpayment('hold');

            expect(payment.overpaymentAction).toBe('hold');
        });

        it('should handle overpayment with refund', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 2000,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                status: 'completed'
            });

            await payment.applyToInvoices([{
                invoiceId: testInvoice._id,
                amount: testInvoice.totalAmount
            }]);

            await payment.handleOverpayment('refund');

            expect(payment.overpaymentAction).toBe('refund');
        });
    });

    // ============ VALIDATION ============

    describe('Validation', () => {
        it('should require amount', async () => {
            const paymentData = {
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                paymentMethod: 'cash',
                paymentDate: new Date()
            };

            await expect(Payment.create(paymentData)).rejects.toThrow();
        });

        it('should require paymentMethod', async () => {
            const paymentData = {
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                amount: 1000,
                paymentDate: new Date()
            };

            await expect(Payment.create(paymentData)).rejects.toThrow();
        });

        it('should require lawyerId', async () => {
            const paymentData = {
                paymentType: 'customer_payment',
                customerId: testClient._id,
                amount: 1000,
                paymentMethod: 'cash',
                paymentDate: new Date()
            };

            await expect(Payment.create(paymentData)).rejects.toThrow();
        });

        it('should validate paymentType enum', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'cash',
                paymentDate: new Date()
            });

            payment.paymentType = 'invalid_type';
            await expect(payment.save()).rejects.toThrow();
        });

        it('should validate paymentMethod enum', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'cash',
                paymentDate: new Date()
            });

            payment.paymentMethod = 'invalid_method';
            await expect(payment.save()).rejects.toThrow();
        });

        it('should validate status enum', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'cash',
                paymentDate: new Date()
            });

            payment.status = 'invalid_status';
            await expect(payment.save()).rejects.toThrow();
        });

        it('should validate amount is non-negative', async () => {
            const paymentData = {
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: -100,
                paymentMethod: 'cash',
                paymentDate: new Date()
            };

            await expect(Payment.create(paymentData)).rejects.toThrow();
        });
    });

    // ============ STATIC METHODS ============

    describe('Static Methods', () => {
        beforeEach(async () => {
            await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                status: 'completed'
            });

            await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 500,
                paymentMethod: 'cash',
                paymentDate: new Date(),
                status: 'pending'
            });
        });

        it('should get payment statistics', async () => {
            const stats = await Payment.getPaymentStats({ firmId: testFirm._id });

            expect(stats).toBeDefined();
            expect(stats.totalPayments).toBeGreaterThan(0);
            expect(stats.totalAmount).toBeGreaterThan(0);
        });

        it('should get payments by method', async () => {
            const byMethod = await Payment.getPaymentsByMethod({ firmId: testFirm._id });

            expect(byMethod).toBeDefined();
            expect(Array.isArray(byMethod)).toBe(true);
        });

        it('should filter statistics by lawyer', async () => {
            const stats = await Payment.getPaymentStats({ lawyerId: testLawyer._id });

            expect(stats.totalPayments).toBeGreaterThan(0);
        });

        it('should filter statistics by date range', async () => {
            const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const endDate = new Date();

            const stats = await Payment.getPaymentStats({
                firmId: testFirm._id,
                startDate,
                endDate
            });

            expect(stats).toBeDefined();
        });
    });

    // ============ ATTACHMENTS AND NOTES ============

    describe('Attachments and Notes', () => {
        it('should add attachments to payment', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                attachments: [{
                    filename: 'receipt.pdf',
                    url: 'https://s3.example.com/receipt.pdf',
                    size: 204800,
                    mimeType: 'application/pdf'
                }]
            });

            expect(payment.attachments).toHaveLength(1);
            expect(payment.attachments[0].filename).toBe('receipt.pdf');
        });

        it('should add customer notes', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'bank_transfer',
                paymentDate: new Date(),
                customerNotes: 'Payment for invoice #123',
                internalNotes: 'Verified by accounting team'
            });

            expect(payment.customerNotes).toBe('Payment for invoice #123');
            expect(payment.internalNotes).toBe('Verified by accounting team');
        });
    });

    // ============ RECEIPTS ============

    describe('Receipts', () => {
        it('should track receipt sending', async () => {
            const payment = await Payment.create({
                paymentType: 'customer_payment',
                customerId: testClient._id,
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                amount: 1000,
                paymentMethod: 'cash',
                paymentDate: new Date(),
                receiptUrl: 'https://example.com/receipt.pdf',
                receiptSent: true,
                receiptSentAt: new Date(),
                receiptSentTo: 'client@example.com'
            });

            expect(payment.receiptSent).toBe(true);
            expect(payment.receiptSentAt).toBeInstanceOf(Date);
            expect(payment.receiptSentTo).toBe('client@example.com');
        });
    });
});
