/**
 * @openapi
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *         paymentNumber:
 *           type: string
 *           example: PAY-2024-001
 *           description: Unique payment number
 *         clientId:
 *           type: string
 *           example: 507f1f77bcf86cd799439012
 *           description: Associated client's ID
 *         invoiceIds:
 *           type: array
 *           items:
 *             type: string
 *           example: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014']
 *           description: Array of invoice IDs this payment applies to
 *         amount:
 *           type: number
 *           example: 10000
 *           description: Payment amount in SAR
 *         currency:
 *           type: string
 *           example: SAR
 *           default: SAR
 *         paymentMethod:
 *           type: string
 *           enum: [cash, bank_transfer, credit_card, debit_card, cheque, online, wire_transfer]
 *           example: bank_transfer
 *           description: Payment method used
 *         status:
 *           type: string
 *           enum: [pending, completed, failed, refunded, cancelled]
 *           example: completed
 *           description: Payment status
 *         paymentDate:
 *           type: string
 *           format: date-time
 *           example: '2024-01-20T10:00:00.000Z'
 *           description: Date payment was made
 *         reference:
 *           type: string
 *           example: TRX123456789
 *           description: Payment reference or transaction ID
 *         chequeNumber:
 *           type: string
 *           example: CHQ-98765
 *           description: Cheque number (if payment method is cheque)
 *         chequeDate:
 *           type: string
 *           format: date
 *           example: '2024-01-20'
 *           description: Cheque date
 *         chequeStatus:
 *           type: string
 *           enum: [pending, deposited, cleared, bounced]
 *           example: cleared
 *           description: Status of cheque payment
 *         bankAccount:
 *           type: string
 *           example: 507f1f77bcf86cd799439015
 *           description: Bank account ID where payment was received
 *         appliedToInvoices:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439013
 *               amount:
 *                 type: number
 *                 example: 5000
 *                 description: Amount applied to this invoice
 *           description: Breakdown of payment application to invoices
 *         notes:
 *           type: string
 *           example: Partial payment for multiple invoices
 *         isReconciled:
 *           type: boolean
 *           example: true
 *           description: Whether payment has been reconciled with bank statement
 *         reconciledDate:
 *           type: string
 *           format: date-time
 *           description: Date payment was reconciled
 *         stripePaymentIntentId:
 *           type: string
 *           example: pi_1234567890
 *           description: Stripe payment intent ID (if paid via Stripe)
 *         receiptUrl:
 *           type: string
 *           example: https://example.com/receipts/pay-001.pdf
 *           description: URL to payment receipt
 *         receiptSent:
 *           type: boolean
 *           example: true
 *           description: Whether receipt was sent to client
 *         firmId:
 *           type: string
 *           example: 507f1f77bcf86cd799439016
 *         createdBy:
 *           type: string
 *           example: 507f1f77bcf86cd799439017
 *           description: User who created the payment record
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     CreatePaymentRequest:
 *       type: object
 *       required:
 *         - clientId
 *         - amount
 *         - paymentMethod
 *         - paymentDate
 *       properties:
 *         clientId:
 *           type: string
 *           example: 507f1f77bcf86cd799439012
 *         amount:
 *           type: number
 *           example: 10000
 *           description: Payment amount in SAR
 *         paymentMethod:
 *           type: string
 *           enum: [cash, bank_transfer, credit_card, debit_card, cheque, online, wire_transfer]
 *           example: bank_transfer
 *         paymentDate:
 *           type: string
 *           format: date-time
 *           example: '2024-01-20T10:00:00.000Z'
 *         reference:
 *           type: string
 *           example: TRX123456789
 *         chequeNumber:
 *           type: string
 *           example: CHQ-98765
 *         chequeDate:
 *           type: string
 *           format: date
 *         bankAccount:
 *           type: string
 *           example: 507f1f77bcf86cd799439015
 *         notes:
 *           type: string
 *
 *     UpdatePaymentRequest:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [pending, completed, failed, refunded, cancelled]
 *         paymentDate:
 *           type: string
 *           format: date-time
 *         reference:
 *           type: string
 *         chequeStatus:
 *           type: string
 *           enum: [pending, deposited, cleared, bounced]
 *         notes:
 *           type: string
 *
 *     ApplyPaymentRequest:
 *       type: object
 *       required:
 *         - applications
 *       properties:
 *         applications:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - invoiceId
 *               - amount
 *             properties:
 *               invoiceId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439013
 *               amount:
 *                 type: number
 *                 example: 5000
 *           description: Array of invoice applications
 *           example:
 *             - invoiceId: '507f1f77bcf86cd799439013'
 *               amount: 5000
 *             - invoiceId: '507f1f77bcf86cd799439014'
 *               amount: 5000
 *
 *     RefundRequest:
 *       type: object
 *       required:
 *         - amount
 *         - reason
 *       properties:
 *         amount:
 *           type: number
 *           example: 2000
 *           description: Refund amount in SAR
 *         reason:
 *           type: string
 *           example: Client overpaid - issuing partial refund
 *         notes:
 *           type: string
 *
 *     PaymentListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Payment'
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: number
 *             limit:
 *               type: number
 *             total:
 *               type: number
 *             pages:
 *               type: number
 *
 *     PaymentResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Payment'
 *
 *     PaymentStats:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             total:
 *               type: number
 *               example: 150
 *               description: Total number of payments
 *             pending:
 *               type: number
 *               example: 10
 *             completed:
 *               type: number
 *               example: 130
 *             failed:
 *               type: number
 *               example: 5
 *             refunded:
 *               type: number
 *               example: 5
 *             totalAmount:
 *               type: number
 *               example: 750000
 *               description: Total payment amount in SAR
 *             averagePayment:
 *               type: number
 *               example: 5000
 *               description: Average payment amount
 *             unreconciledCount:
 *               type: number
 *               example: 8
 *               description: Number of unreconciled payments
 *             unreconciledAmount:
 *               type: number
 *               example: 40000
 *               description: Total unreconciled amount
 */
