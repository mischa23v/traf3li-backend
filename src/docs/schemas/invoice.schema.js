/**
 * @openapi
 * components:
 *   schemas:
 *     Invoice:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *         invoiceNumber:
 *           type: string
 *           example: INV-2024-001
 *           description: Unique invoice number
 *         clientId:
 *           type: string
 *           example: 507f1f77bcf86cd799439012
 *           description: Associated client's ID
 *         caseId:
 *           type: string
 *           example: 507f1f77bcf86cd799439013
 *           description: Associated case's ID (optional)
 *         status:
 *           type: string
 *           enum: [draft, pending, sent, paid, overdue, cancelled, void]
 *           example: sent
 *           description: Invoice status
 *         issueDate:
 *           type: string
 *           format: date
 *           example: '2024-01-15'
 *           description: Invoice issue date
 *         dueDate:
 *           type: string
 *           format: date
 *           example: '2024-02-15'
 *           description: Payment due date
 *         lineItems:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InvoiceLineItem'
 *         subtotal:
 *           type: number
 *           example: 10000
 *           description: Subtotal before tax in SAR
 *         taxRate:
 *           type: number
 *           example: 15
 *           description: Tax rate percentage (VAT)
 *         taxAmount:
 *           type: number
 *           example: 1500
 *           description: Tax amount in SAR
 *         discount:
 *           type: number
 *           example: 500
 *           description: Discount amount in SAR
 *         total:
 *           type: number
 *           example: 11000
 *           description: Total amount including tax in SAR
 *         amountPaid:
 *           type: number
 *           example: 5000
 *           description: Amount already paid
 *         amountDue:
 *           type: number
 *           example: 6000
 *           description: Remaining amount due
 *         currency:
 *           type: string
 *           example: SAR
 *           default: SAR
 *         notes:
 *           type: string
 *           example: "Payment terms - Net 30 days"
 *         paymentInstructions:
 *           type: string
 *           example: Bank transfer to account IBAN...
 *         approvalStatus:
 *           type: string
 *           enum: [pending_approval, approved, rejected]
 *           example: approved
 *         zatcaStatus:
 *           type: string
 *           enum: [not_submitted, submitted, approved, rejected]
 *           example: approved
 *           description: ZATCA e-invoice submission status
 *         zatcaUUID:
 *           type: string
 *           example: 8e3b5e3c-3e3b-4e3b-8e3b-5e3c3e3b4e3b
 *           description: ZATCA invoice UUID
 *         firmId:
 *           type: string
 *           example: 507f1f77bcf86cd799439015
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     InvoiceLineItem:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 507f1f77bcf86cd799439020
 *         description:
 *           type: string
 *           example: Legal consultation - 10 hours
 *         quantity:
 *           type: number
 *           example: 10
 *           description: Quantity of items/hours
 *         rate:
 *           type: number
 *           example: 500
 *           description: Rate per unit in SAR
 *         amount:
 *           type: number
 *           example: 5000
 *           description: Total line item amount (quantity * rate)
 *         type:
 *           type: string
 *           enum: [service, expense, product, time_entry]
 *           example: service
 *         referenceId:
 *           type: string
 *           example: 507f1f77bcf86cd799439021
 *           description: Reference to time entry, expense, or other source
 *         taxable:
 *           type: boolean
 *           example: true
 *           description: Whether this item is subject to tax
 *
 *     CreateInvoiceRequest:
 *       type: object
 *       required:
 *         - clientId
 *         - issueDate
 *         - dueDate
 *         - lineItems
 *       properties:
 *         clientId:
 *           type: string
 *           example: 507f1f77bcf86cd799439012
 *         caseId:
 *           type: string
 *           example: 507f1f77bcf86cd799439013
 *         issueDate:
 *           type: string
 *           format: date
 *           example: '2024-01-15'
 *         dueDate:
 *           type: string
 *           format: date
 *           example: '2024-02-15'
 *         lineItems:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - description
 *               - quantity
 *               - rate
 *             properties:
 *               description:
 *                 type: string
 *               quantity:
 *                 type: number
 *               rate:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [service, expense, product, time_entry]
 *               taxable:
 *                 type: boolean
 *         taxRate:
 *           type: number
 *           example: 15
 *         discount:
 *           type: number
 *           example: 0
 *         notes:
 *           type: string
 *         paymentInstructions:
 *           type: string
 *
 *     UpdateInvoiceRequest:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [draft, pending, sent, paid, overdue, cancelled, void]
 *         dueDate:
 *           type: string
 *           format: date
 *         lineItems:
 *           type: array
 *           items:
 *             type: object
 *         discount:
 *           type: number
 *         notes:
 *           type: string
 *         paymentInstructions:
 *           type: string
 *
 *     RecordPaymentRequest:
 *       type: object
 *       required:
 *         - amount
 *         - paymentMethod
 *         - paymentDate
 *       properties:
 *         amount:
 *           type: number
 *           example: 5000
 *           description: Payment amount in SAR
 *         paymentMethod:
 *           type: string
 *           enum: [cash, bank_transfer, credit_card, cheque, online]
 *           example: bank_transfer
 *         paymentDate:
 *           type: string
 *           format: date
 *           example: '2024-01-20'
 *         reference:
 *           type: string
 *           example: TRX123456
 *           description: Payment reference/transaction ID
 *         notes:
 *           type: string
 *           example: Partial payment received
 *
 *     InvoiceListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Invoice'
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
 *     InvoiceResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Invoice'
 *
 *     InvoiceStats:
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
 *               example: 100
 *             draft:
 *               type: number
 *               example: 10
 *             sent:
 *               type: number
 *               example: 40
 *             paid:
 *               type: number
 *               example: 35
 *             overdue:
 *               type: number
 *               example: 15
 *             totalAmount:
 *               type: number
 *               example: 500000
 *               description: Total invoiced amount
 *             paidAmount:
 *               type: number
 *               example: 350000
 *               description: Total paid amount
 *             outstandingAmount:
 *               type: number
 *               example: 150000
 *               description: Total outstanding amount
 */
