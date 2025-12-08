/**
 * Payment Validator Unit Tests
 *
 * Tests payment validation schemas and error messages
 */

const {
    schemas,
    enums,
    validate
} = require('../../../src/validators/payment.validator');

describe('Payment Validator Tests', () => {
    describe('Create Payment Schema', () => {
        const schema = schemas.createPayment;

        it('should validate valid payment data', () => {
            const validPayment = {
                clientId: '507f1f77bcf86cd799439011',
                amount: 1000,
                method: 'cash',
                status: 'pending',
                reference: 'PAY-123',
                notes: 'Payment for services'
            };

            const { error, value } = schema.validate(validPayment);
            expect(error).toBeUndefined();
            expect(value.amount).toBe(1000);
            expect(value.method).toBe('cash');
        });

        it('should require clientId', () => {
            const invalidPayment = {
                amount: 1000,
                method: 'cash'
            };

            const { error } = schema.validate(invalidPayment);
            expect(error).toBeDefined();
            expect(error.details[0].path[0]).toBe('clientId');
            expect(error.details[0].message).toContain('Client ID is required');
        });

        it('should require amount', () => {
            const invalidPayment = {
                clientId: '507f1f77bcf86cd799439011',
                method: 'cash'
            };

            const { error } = schema.validate(invalidPayment);
            expect(error).toBeDefined();
            expect(error.details[0].path[0]).toBe('amount');
            expect(error.details[0].message).toContain('Amount is required');
        });

        it('should reject negative amount', () => {
            const invalidPayment = {
                clientId: '507f1f77bcf86cd799439011',
                amount: -500,
                method: 'cash'
            };

            const { error } = schema.validate(invalidPayment);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('positive');
        });

        it('should reject zero amount', () => {
            const invalidPayment = {
                clientId: '507f1f77bcf86cd799439011',
                amount: 0,
                method: 'cash'
            };

            const { error } = schema.validate(invalidPayment);
            expect(error).toBeDefined();
        });

        it('should require payment method', () => {
            const invalidPayment = {
                clientId: '507f1f77bcf86cd799439011',
                amount: 1000
            };

            const { error } = schema.validate(invalidPayment);
            expect(error).toBeDefined();
            expect(error.details[0].path[0]).toBe('method');
            expect(error.details[0].message).toContain('Payment method is required');
        });

        it('should reject invalid payment method', () => {
            const invalidPayment = {
                clientId: '507f1f77bcf86cd799439011',
                amount: 1000,
                method: 'invalid_method'
            };

            const { error } = schema.validate(invalidPayment);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Invalid payment method');
        });

        it('should accept all valid payment methods', () => {
            const methods = enums.paymentMethods;
            
            methods.forEach(method => {
                const payment = {
                    clientId: '507f1f77bcf86cd799439011',
                    amount: 1000,
                    method
                };

                const { error } = schema.validate(payment);
                expect(error).toBeUndefined();
            });
        });

        it('should default status to pending', () => {
            const payment = {
                clientId: '507f1f77bcf86cd799439011',
                amount: 1000,
                method: 'cash'
            };

            const { value } = schema.validate(payment);
            expect(value.status).toBe('pending');
        });

        it('should reject future payment dates', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);

            const invalidPayment = {
                clientId: '507f1f77bcf86cd799439011',
                amount: 1000,
                method: 'cash',
                date: futureDate
            };

            const { error } = schema.validate(invalidPayment);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('cannot be in the future');
        });

        it('should accept past payment dates', () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);

            const validPayment = {
                clientId: '507f1f77bcf86cd799439011',
                amount: 1000,
                method: 'cash',
                date: pastDate
            };

            const { error } = schema.validate(validPayment);
            expect(error).toBeUndefined();
        });

        it('should limit reference length', () => {
            const longReference = 'A'.repeat(101);

            const invalidPayment = {
                clientId: '507f1f77bcf86cd799439011',
                amount: 1000,
                method: 'cash',
                reference: longReference
            };

            const { error } = schema.validate(invalidPayment);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('too long');
        });

        it('should limit notes length', () => {
            const longNotes = 'A'.repeat(1001);

            const invalidPayment = {
                clientId: '507f1f77bcf86cd799439011',
                amount: 1000,
                method: 'cash',
                notes: longNotes
            };

            const { error } = schema.validate(invalidPayment);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('too long');
        });

        describe('Check payment validation', () => {
            it('should require checkNumber for check payments', () => {
                const checkPayment = {
                    clientId: '507f1f77bcf86cd799439011',
                    amount: 1000,
                    method: 'check'
                };

                const { error } = schema.validate(checkPayment);
                expect(error).toBeDefined();
                expect(error.details[0].path[0]).toBe('checkNumber');
                expect(error.details[0].message).toContain('Check number is required');
            });

            it('should require checkDate for check payments', () => {
                const checkPayment = {
                    clientId: '507f1f77bcf86cd799439011',
                    amount: 1000,
                    method: 'check',
                    checkNumber: 'CHK-123'
                };

                const { error } = schema.validate(checkPayment);
                expect(error).toBeDefined();
                expect(error.details[0].path[0]).toBe('checkDate');
            });

            it('should validate complete check payment', () => {
                const checkPayment = {
                    clientId: '507f1f77bcf86cd799439011',
                    amount: 1000,
                    method: 'check',
                    checkNumber: 'CHK-123',
                    checkDate: new Date(),
                    bankName: 'Test Bank'
                };

                const { error } = schema.validate(checkPayment);
                expect(error).toBeUndefined();
            });
        });

        it('should validate invoice application', () => {
            const paymentWithInvoices = {
                clientId: '507f1f77bcf86cd799439011',
                amount: 1000,
                method: 'cash',
                invoices: [
                    { invoiceId: '507f1f77bcf86cd799439012', amount: 500 },
                    { invoiceId: '507f1f77bcf86cd799439013', amount: 500 }
                ]
            };

            const { error } = schema.validate(paymentWithInvoices);
            expect(error).toBeUndefined();
        });

        it('should strip unknown fields', () => {
            const paymentWithExtra = {
                clientId: '507f1f77bcf86cd799439011',
                amount: 1000,
                method: 'cash',
                unknownField: 'should be removed'
            };

            const { value } = schema.validate(paymentWithExtra, {
                stripUnknown: true
            });
            expect(value.unknownField).toBeUndefined();
        });
    });

    describe('Update Payment Schema', () => {
        const schema = schemas.updatePayment;

        it('should validate valid update data', () => {
            const update = {
                amount: 1500,
                notes: 'Updated payment'
            };

            const { error } = schema.validate(update);
            expect(error).toBeUndefined();
        });

        it('should require at least one field', () => {
            const emptyUpdate = {};

            const { error } = schema.validate(emptyUpdate);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('At least one field');
        });

        it('should validate partial updates', () => {
            const updates = [
                { amount: 2000 },
                { method: 'bank_transfer' },
                { status: 'completed' },
                { reference: 'NEW-REF' },
                { notes: 'New notes' }
            ];

            updates.forEach(update => {
                const { error } = schema.validate(update);
                expect(error).toBeUndefined();
            });
        });

        it('should reject negative amount in update', () => {
            const invalidUpdate = {
                amount: -100
            };

            const { error } = schema.validate(invalidUpdate);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('positive');
        });
    });

    describe('Apply Payment Schema', () => {
        const schema = schemas.applyPayment;

        it('should validate invoice application', () => {
            const application = {
                invoices: [
                    { invoiceId: '507f1f77bcf86cd799439012', amount: 500 },
                    { invoiceId: '507f1f77bcf86cd799439013', amount: 300 }
                ]
            };

            const { error } = schema.validate(application);
            expect(error).toBeUndefined();
        });

        it('should require invoices array', () => {
            const invalidApplication = {};

            const { error } = schema.validate(invalidApplication);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Invoices list is required');
        });

        it('should require at least one invoice', () => {
            const invalidApplication = {
                invoices: []
            };

            const { error } = schema.validate(invalidApplication);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('at least one invoice');
        });

        it('should require invoiceId and amount for each invoice', () => {
            const invalidApplication = {
                invoices: [
                    { invoiceId: '507f1f77bcf86cd799439012' } // Missing amount
                ]
            };

            const { error } = schema.validate(invalidApplication);
            expect(error).toBeDefined();
        });

        it('should reject negative invoice amounts', () => {
            const invalidApplication = {
                invoices: [
                    { invoiceId: '507f1f77bcf86cd799439012', amount: -100 }
                ]
            };

            const { error } = schema.validate(invalidApplication);
            expect(error).toBeDefined();
        });
    });

    describe('Create Refund Schema', () => {
        const schema = schemas.createRefund;

        it('should validate valid refund data', () => {
            const refund = {
                amount: 500,
                reason: 'Customer request',
                method: 'cash',
                notes: 'Refunded in full'
            };

            const { error } = schema.validate(refund);
            expect(error).toBeUndefined();
        });

        it('should require amount', () => {
            const invalidRefund = {
                reason: 'Test reason'
            };

            const { error } = schema.validate(invalidRefund);
            expect(error).toBeDefined();
            expect(error.details[0].path[0]).toBe('amount');
            expect(error.details[0].message).toContain('Refund amount is required');
        });

        it('should require reason', () => {
            const invalidRefund = {
                amount: 500
            };

            const { error } = schema.validate(invalidRefund);
            expect(error).toBeDefined();
            expect(error.details[0].path[0]).toBe('reason');
            expect(error.details[0].message).toContain('Refund reason is required');
        });

        it('should reject negative amount', () => {
            const invalidRefund = {
                amount: -100,
                reason: 'Test'
            };

            const { error } = schema.validate(invalidRefund);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('positive');
        });

        it('should limit reason length', () => {
            const longReason = 'A'.repeat(501);

            const invalidRefund = {
                amount: 500,
                reason: longReason
            };

            const { error } = schema.validate(invalidRefund);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('too long');
        });
    });

    describe('Update Check Status Schema', () => {
        const schema = schemas.updateCheckStatus;

        it('should validate valid status update', () => {
            const update = {
                status: 'cleared',
                statusDate: new Date(),
                notes: 'Check cleared successfully'
            };

            const { error } = schema.validate(update);
            expect(error).toBeUndefined();
        });

        it('should require status', () => {
            const invalidUpdate = {
                notes: 'Some notes'
            };

            const { error } = schema.validate(invalidUpdate);
            expect(error).toBeDefined();
            expect(error.details[0].path[0]).toBe('status');
            expect(error.details[0].message).toContain('Check status is required');
        });

        it('should accept all valid check statuses', () => {
            const statuses = enums.checkStatuses;

            statuses.forEach(status => {
                const update = { status };
                const { error } = schema.validate(update);
                expect(error).toBeUndefined();
            });
        });

        it('should reject invalid check status', () => {
            const invalidUpdate = {
                status: 'invalid_status'
            };

            const { error } = schema.validate(invalidUpdate);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Invalid check status');
        });

        it('should require bounceReason for bounced checks', () => {
            const bouncedCheck = {
                status: 'bounced'
            };

            const { error } = schema.validate(bouncedCheck);
            expect(error).toBeDefined();
            expect(error.details[0].path[0]).toBe('bounceReason');
            expect(error.details[0].message).toContain('Bounce reason is required');
        });

        it('should validate bounced check with reason', () => {
            const bouncedCheck = {
                status: 'bounced',
                bounceReason: 'Insufficient funds'
            };

            const { error } = schema.validate(bouncedCheck);
            expect(error).toBeUndefined();
        });

        it('should default statusDate to current date', () => {
            const update = {
                status: 'cleared'
            };

            const { value } = schema.validate(update);
            expect(value.statusDate).toBeDefined();
            expect(value.statusDate).toBeInstanceOf(Date);
        });
    });

    describe('Reconcile Payment Schema', () => {
        const schema = schemas.reconcilePayment;

        it('should validate valid reconciliation', () => {
            const reconciliation = {
                bankTransactionId: 'BANK-TXN-123',
                reconciledDate: new Date(),
                notes: 'Reconciled with bank statement'
            };

            const { error } = schema.validate(reconciliation);
            expect(error).toBeUndefined();
        });

        it('should require bankTransactionId', () => {
            const invalid = {
                notes: 'Some notes'
            };

            const { error } = schema.validate(invalid);
            expect(error).toBeDefined();
            expect(error.details[0].path[0]).toBe('bankTransactionId');
            expect(error.details[0].message).toContain('Bank transaction ID is required');
        });
    });

    describe('Payment Query Schema', () => {
        const schema = schemas.paymentQuery;

        it('should validate query parameters', () => {
            const query = {
                clientId: '507f1f77bcf86cd799439011',
                method: 'cash',
                status: 'completed',
                page: 2,
                limit: 25
            };

            const { error } = schema.validate(query);
            expect(error).toBeUndefined();
        });

        it('should default page to 1', () => {
            const query = {};
            const { value } = schema.validate(query);
            expect(value.page).toBe(1);
        });

        it('should default limit to 50', () => {
            const query = {};
            const { value } = schema.validate(query);
            expect(value.limit).toBe(50);
        });

        it('should default sortOrder to desc', () => {
            const query = {};
            const { value } = schema.validate(query);
            expect(value.sortOrder).toBe('desc');
        });

        it('should validate date range', () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-12-31');

            const query = {
                startDate,
                endDate
            };

            const { error } = schema.validate(query);
            expect(error).toBeUndefined();
        });

        it('should reject endDate before startDate', () => {
            const startDate = new Date('2024-12-31');
            const endDate = new Date('2024-01-01');

            const query = {
                startDate,
                endDate
            };

            const { error } = schema.validate(query);
            expect(error).toBeDefined();
        });

        it('should validate amount range', () => {
            const query = {
                minAmount: 100,
                maxAmount: 1000
            };

            const { error } = schema.validate(query);
            expect(error).toBeUndefined();
        });

        it('should reject maxAmount less than minAmount', () => {
            const query = {
                minAmount: 1000,
                maxAmount: 100
            };

            const { error } = schema.validate(query);
            expect(error).toBeDefined();
        });

        it('should limit maximum page size', () => {
            const query = {
                limit: 101
            };

            const { error } = schema.validate(query);
            expect(error).toBeDefined();
        });
    });

    describe('Bulk Delete Schema', () => {
        const schema = schemas.bulkDelete;

        it('should validate bulk delete with IDs', () => {
            const bulkDelete = {
                ids: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012']
            };

            const { error } = schema.validate(bulkDelete);
            expect(error).toBeUndefined();
        });

        it('should require ids array', () => {
            const invalid = {};

            const { error } = schema.validate(invalid);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('IDs list is required');
        });

        it('should require at least one ID', () => {
            const invalid = {
                ids: []
            };

            const { error } = schema.validate(invalid);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('at least one payment');
        });

        it('should limit maximum IDs to 100', () => {
            const tooMany = {
                ids: Array(101).fill('507f1f77bcf86cd799439011')
            };

            const { error } = schema.validate(tooMany);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('more than 100');
        });
    });

    describe('Validation Middleware', () => {
        it('should create validation middleware', () => {
            const middleware = validate(schemas.createPayment);
            expect(middleware).toBeInstanceOf(Function);
            expect(middleware.length).toBe(3); // req, res, next
        });

        it('should validate request body', () => {
            const middleware = validate(schemas.createPayment, 'body');
            
            const req = {
                body: {
                    clientId: '507f1f77bcf86cd799439011',
                    amount: 1000,
                    method: 'cash'
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should return errors for invalid data', () => {
            const middleware = validate(schemas.createPayment, 'body');
            
            const req = {
                body: {
                    amount: -100 // Invalid
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();

            const jsonCall = res.json.mock.calls[0][0];
            expect(jsonCall.success).toBe(false);
            expect(jsonCall.errors).toBeDefined();
            expect(jsonCall.errors.length).toBeGreaterThan(0);
        });
    });

    describe('Enums', () => {
        it('should export payment methods', () => {
            expect(enums.paymentMethods).toBeDefined();
            expect(Array.isArray(enums.paymentMethods)).toBe(true);
            expect(enums.paymentMethods).toContain('cash');
            expect(enums.paymentMethods).toContain('check');
            expect(enums.paymentMethods).toContain('credit_card');
        });

        it('should export payment statuses', () => {
            expect(enums.paymentStatuses).toBeDefined();
            expect(Array.isArray(enums.paymentStatuses)).toBe(true);
            expect(enums.paymentStatuses).toContain('pending');
            expect(enums.paymentStatuses).toContain('completed');
            expect(enums.paymentStatuses).toContain('failed');
        });

        it('should export check statuses', () => {
            expect(enums.checkStatuses).toBeDefined();
            expect(Array.isArray(enums.checkStatuses)).toBe(true);
            expect(enums.checkStatuses).toContain('received');
            expect(enums.checkStatuses).toContain('cleared');
            expect(enums.checkStatuses).toContain('bounced');
        });
    });
});
