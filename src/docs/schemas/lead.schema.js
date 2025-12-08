/**
 * @openapi
 * components:
 *   schemas:
 *     Lead:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *         leadType:
 *           type: string
 *           enum: [individual, company]
 *           example: individual
 *           description: Type of lead
 *         firstName:
 *           type: string
 *           example: Mohammed
 *           description: Lead's first name (for individuals)
 *         lastName:
 *           type: string
 *           example: Al-Zahrani
 *           description: Lead's last name (for individuals)
 *         companyName:
 *           type: string
 *           example: Future Tech LLC
 *           description: Company name (for companies)
 *         email:
 *           type: string
 *           format: email
 *           example: mohammed@example.com
 *         phone:
 *           type: string
 *           example: '+966501234567'
 *         source:
 *           type: string
 *           enum: [website, referral, social_media, cold_call, event, advertisement, other]
 *           example: website
 *           description: How the lead was acquired
 *         status:
 *           type: string
 *           enum: [new, contacted, qualified, proposal_sent, negotiation, converted, lost]
 *           example: qualified
 *           description: Lead status in sales pipeline
 *         pipelineId:
 *           type: string
 *           example: 507f1f77bcf86cd799439012
 *           description: CRM pipeline ID
 *         pipelineStage:
 *           type: string
 *           example: 507f1f77bcf86cd799439013
 *           description: Current pipeline stage ID
 *         assignedTo:
 *           type: string
 *           example: 507f1f77bcf86cd799439014
 *           description: User ID of assigned sales rep/lawyer
 *         value:
 *           type: number
 *           example: 50000
 *           description: Estimated deal value in SAR
 *         probability:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           example: 75
 *           description: Win probability percentage
 *         legalService:
 *           type: string
 *           example: Corporate Law
 *           description: Type of legal service needed
 *         notes:
 *           type: string
 *           example: Interested in company formation services
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ['high-value', 'corporate']
 *         lastContactDate:
 *           type: string
 *           format: date-time
 *           description: Date of last contact
 *         nextFollowUpDate:
 *           type: string
 *           format: date-time
 *           description: Scheduled next follow-up date
 *         convertedToClientId:
 *           type: string
 *           example: 507f1f77bcf86cd799439015
 *           description: Client ID after conversion (if converted)
 *         convertedDate:
 *           type: string
 *           format: date-time
 *           description: Date when lead was converted to client
 *         lostReason:
 *           type: string
 *           example: Chose another firm
 *           description: Reason for losing the lead
 *         firmId:
 *           type: string
 *           example: 507f1f77bcf86cd799439016
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     CreateLeadRequest:
 *       type: object
 *       required:
 *         - leadType
 *         - email
 *       properties:
 *         leadType:
 *           type: string
 *           enum: [individual, company]
 *           example: individual
 *         firstName:
 *           type: string
 *           example: Mohammed
 *         lastName:
 *           type: string
 *           example: Al-Zahrani
 *         companyName:
 *           type: string
 *           example: Future Tech LLC
 *         email:
 *           type: string
 *           format: email
 *           example: mohammed@example.com
 *         phone:
 *           type: string
 *           example: '+966501234567'
 *         source:
 *           type: string
 *           enum: [website, referral, social_media, cold_call, event, advertisement, other]
 *           example: website
 *         pipelineId:
 *           type: string
 *         assignedTo:
 *           type: string
 *         value:
 *           type: number
 *           example: 50000
 *         legalService:
 *           type: string
 *         notes:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *
 *     UpdateLeadRequest:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         companyName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         status:
 *           type: string
 *           enum: [new, contacted, qualified, proposal_sent, negotiation, converted, lost]
 *         assignedTo:
 *           type: string
 *         value:
 *           type: number
 *         probability:
 *           type: number
 *         legalService:
 *           type: string
 *         notes:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *
 *     ConvertToClientRequest:
 *       type: object
 *       properties:
 *         createCase:
 *           type: boolean
 *           example: true
 *           description: Whether to create a case for the new client
 *         caseDetails:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *               example: Company Formation
 *             caseType:
 *               type: string
 *               example: commercial
 *             description:
 *               type: string
 *         clientNotes:
 *           type: string
 *           description: Additional notes for the new client record
 *
 *     LeadActivity:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 507f1f77bcf86cd799439020
 *         leadId:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *         type:
 *           type: string
 *           enum: [call, email, meeting, note, status_change, stage_change]
 *           example: call
 *           description: Type of activity
 *         description:
 *           type: string
 *           example: Called to discuss legal services
 *         outcome:
 *           type: string
 *           example: Interested in corporate law services
 *         duration:
 *           type: number
 *           example: 30
 *           description: Duration in minutes (for calls/meetings)
 *         scheduledDate:
 *           type: string
 *           format: date-time
 *           description: Scheduled date (for future activities)
 *         completedDate:
 *           type: string
 *           format: date-time
 *           description: Completion date (for completed activities)
 *         userId:
 *           type: string
 *           example: 507f1f77bcf86cd799439014
 *           description: User who performed the activity
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     LogActivityRequest:
 *       type: object
 *       required:
 *         - type
 *         - description
 *       properties:
 *         type:
 *           type: string
 *           enum: [call, email, meeting, note, status_change, stage_change]
 *           example: call
 *         description:
 *           type: string
 *           example: Discussed legal requirements
 *         outcome:
 *           type: string
 *         duration:
 *           type: number
 *           example: 30
 *         completedDate:
 *           type: string
 *           format: date-time
 *
 *     ScheduleFollowUpRequest:
 *       type: object
 *       required:
 *         - date
 *         - description
 *       properties:
 *         date:
 *           type: string
 *           format: date-time
 *           example: '2024-02-01T10:00:00.000Z'
 *         description:
 *           type: string
 *           example: Follow up on proposal
 *         type:
 *           type: string
 *           enum: [call, email, meeting]
 *           example: call
 *
 *     LeadListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Lead'
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
 *     LeadResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Lead'
 *
 *     LeadStats:
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
 *               example: 200
 *             new:
 *               type: number
 *               example: 50
 *             qualified:
 *               type: number
 *               example: 80
 *             converted:
 *               type: number
 *               example: 40
 *             lost:
 *               type: number
 *               example: 30
 *             conversionRate:
 *               type: number
 *               example: 20
 *               description: Conversion rate percentage
 *             totalValue:
 *               type: number
 *               example: 2000000
 *               description: Total pipeline value in SAR
 *             averageValue:
 *               type: number
 *               example: 10000
 *               description: Average deal value
 */
