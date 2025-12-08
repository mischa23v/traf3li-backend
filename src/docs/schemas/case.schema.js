/**
 * @openapi
 * components:
 *   schemas:
 *     Case:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *           description: Case's unique identifier
 *         caseNumber:
 *           type: string
 *           example: CASE-2024-001
 *           description: Unique case number
 *         title:
 *           type: string
 *           example: Commercial Dispute - ABC Corp vs XYZ Ltd
 *           description: Case title
 *         description:
 *           type: string
 *           example: Contract dispute regarding payment terms
 *           description: Detailed case description
 *         caseType:
 *           type: string
 *           enum: [civil, criminal, commercial, family, labor, administrative, other]
 *           example: commercial
 *           description: Type of legal case
 *         status:
 *           type: string
 *           enum: [open, in_progress, pending, closed, won, lost, settled]
 *           example: in_progress
 *           description: Current case status
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           example: high
 *           description: Case priority level
 *         clientId:
 *           type: string
 *           example: 507f1f77bcf86cd799439012
 *           description: Associated client's ID
 *         assignedLawyers:
 *           type: array
 *           items:
 *             type: string
 *           example: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014']
 *           description: Array of assigned lawyer IDs
 *         court:
 *           type: string
 *           example: Riyadh Commercial Court
 *           description: Court handling the case
 *         caseValue:
 *           type: number
 *           example: 500000
 *           description: Monetary value of the case in SAR
 *         filingDate:
 *           type: string
 *           format: date
 *           example: '2024-01-15'
 *           description: Date when case was filed
 *         hearings:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Hearing'
 *         documents:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CaseDocument'
 *         notes:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CaseNote'
 *         timeline:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TimelineEvent'
 *         claims:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Claim'
 *         outcome:
 *           type: object
 *           properties:
 *             result:
 *               type: string
 *               enum: [won, lost, settled, dismissed]
 *             details:
 *               type: string
 *             date:
 *               type: string
 *               format: date
 *         progress:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           example: 65
 *           description: Case completion percentage
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
 *     Hearing:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 507f1f77bcf86cd799439020
 *         date:
 *           type: string
 *           format: date-time
 *           example: '2024-02-15T10:00:00.000Z'
 *         location:
 *           type: string
 *           example: Courtroom 3, Riyadh Commercial Court
 *         judge:
 *           type: string
 *           example: Judge Abdullah Al-Saud
 *         type:
 *           type: string
 *           enum: [preliminary, main, appeal, execution]
 *           example: main
 *         status:
 *           type: string
 *           enum: [scheduled, completed, postponed, cancelled]
 *           example: scheduled
 *         notes:
 *           type: string
 *           example: Bring all evidence documents
 *         outcome:
 *           type: string
 *           example: Postponed to next month for additional evidence
 *         attendees:
 *           type: array
 *           items:
 *             type: string
 *
 *     CaseDocument:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 507f1f77bcf86cd799439021
 *         title:
 *           type: string
 *           example: Contract Agreement
 *         description:
 *           type: string
 *           example: Original signed contract
 *         type:
 *           type: string
 *           enum: [contract, evidence, pleading, correspondence, court_order, other]
 *           example: contract
 *         fileUrl:
 *           type: string
 *           example: https://s3.amazonaws.com/bucket/document.pdf
 *         fileKey:
 *           type: string
 *           example: documents/case-001/contract.pdf
 *         fileName:
 *           type: string
 *           example: contract.pdf
 *         fileSize:
 *           type: number
 *           example: 1024000
 *         mimeType:
 *           type: string
 *           example: application/pdf
 *         uploadedBy:
 *           type: string
 *           example: 507f1f77bcf86cd799439013
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *
 *     CaseNote:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 507f1f77bcf86cd799439022
 *         content:
 *           type: string
 *           example: Client called to discuss settlement options
 *         author:
 *           type: string
 *           example: 507f1f77bcf86cd799439013
 *           description: User ID of note author
 *         isPrivate:
 *           type: boolean
 *           example: false
 *           description: Whether note is private to lawyers only
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     TimelineEvent:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 507f1f77bcf86cd799439023
 *         title:
 *           type: string
 *           example: Case Filed
 *         description:
 *           type: string
 *           example: Initial case filing with court
 *         date:
 *           type: string
 *           format: date-time
 *         type:
 *           type: string
 *           enum: [filing, hearing, decision, settlement, appeal, other]
 *           example: filing
 *         icon:
 *           type: string
 *           example: gavel
 *
 *     Claim:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 507f1f77bcf86cd799439024
 *         description:
 *           type: string
 *           example: Breach of contract - Payment default
 *         amount:
 *           type: number
 *           example: 250000
 *           description: Claim amount in SAR
 *         type:
 *           type: string
 *           enum: [main, counter, additional]
 *           example: main
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected, settled]
 *           example: pending
 *
 *     CreateCaseRequest:
 *       type: object
 *       required:
 *         - title
 *         - caseType
 *         - clientId
 *       properties:
 *         title:
 *           type: string
 *           example: Commercial Dispute
 *         description:
 *           type: string
 *           example: Contract dispute case
 *         caseType:
 *           type: string
 *           enum: [civil, criminal, commercial, family, labor, administrative, other]
 *         status:
 *           type: string
 *           enum: [open, in_progress, pending, closed, won, lost, settled]
 *           default: open
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           default: medium
 *         clientId:
 *           type: string
 *         assignedLawyers:
 *           type: array
 *           items:
 *             type: string
 *         court:
 *           type: string
 *         caseValue:
 *           type: number
 *         filingDate:
 *           type: string
 *           format: date
 *
 *     UpdateCaseRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         status:
 *           type: string
 *         priority:
 *           type: string
 *         assignedLawyers:
 *           type: array
 *           items:
 *             type: string
 *         court:
 *           type: string
 *         caseValue:
 *           type: number
 *
 *     CaseListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Case'
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
 *     CaseResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Case'
 */
