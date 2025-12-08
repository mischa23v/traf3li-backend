/**
 * @openapi
 * components:
 *   schemas:
 *     Client:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *           description: Client's unique identifier
 *         clientType:
 *           type: string
 *           enum: [individual, company, government]
 *           example: individual
 *           description: Type of client
 *         firstName:
 *           type: string
 *           example: Ahmed
 *           description: Client's first name (for individuals)
 *         lastName:
 *           type: string
 *           example: Al-Rashid
 *           description: Client's last name (for individuals)
 *         companyName:
 *           type: string
 *           example: Tech Solutions Ltd
 *           description: Company name (for companies)
 *         email:
 *           type: string
 *           format: email
 *           example: ahmed@example.com
 *         phone:
 *           type: string
 *           example: '+966501234567'
 *         nationalId:
 *           type: string
 *           example: '1234567890'
 *           description: National ID number (for individuals)
 *         commercialRegister:
 *           type: string
 *           example: '1010123456'
 *           description: Commercial registration number (for companies)
 *         vatNumber:
 *           type: string
 *           example: '300001234567890'
 *           description: VAT registration number
 *         address:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *               example: King Fahd Road
 *             city:
 *               type: string
 *               example: Riyadh
 *             state:
 *               type: string
 *               example: Riyadh Province
 *             country:
 *               type: string
 *               example: Saudi Arabia
 *             postalCode:
 *               type: string
 *               example: '12345'
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended, blacklisted]
 *           example: active
 *           description: Client status
 *         billingRate:
 *           type: number
 *           example: 500
 *           description: Hourly billing rate in SAR
 *         paymentTerms:
 *           type: number
 *           example: 30
 *           description: Payment terms in days
 *         balance:
 *           type: number
 *           example: 15000
 *           description: Current account balance
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ['corporate', 'vip']
 *         notes:
 *           type: string
 *           example: Important client - priority service
 *         firmId:
 *           type: string
 *           example: 507f1f77bcf86cd799439012
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: '2024-01-01T00:00:00.000Z'
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: '2024-01-15T12:30:00.000Z'
 *
 *     CreateClientRequest:
 *       type: object
 *       required:
 *         - clientType
 *         - email
 *       properties:
 *         clientType:
 *           type: string
 *           enum: [individual, company, government]
 *           example: individual
 *         firstName:
 *           type: string
 *           example: Ahmed
 *         lastName:
 *           type: string
 *           example: Al-Rashid
 *         companyName:
 *           type: string
 *           example: Tech Solutions Ltd
 *         email:
 *           type: string
 *           format: email
 *           example: ahmed@example.com
 *         phone:
 *           type: string
 *           example: '+966501234567'
 *         nationalId:
 *           type: string
 *           example: '1234567890'
 *         commercialRegister:
 *           type: string
 *           example: '1010123456'
 *         vatNumber:
 *           type: string
 *           example: '300001234567890'
 *         address:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             country:
 *               type: string
 *             postalCode:
 *               type: string
 *         billingRate:
 *           type: number
 *           example: 500
 *         paymentTerms:
 *           type: number
 *           example: 30
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         notes:
 *           type: string
 *
 *     UpdateClientRequest:
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
 *         address:
 *           type: object
 *         billingRate:
 *           type: number
 *         paymentTerms:
 *           type: number
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         notes:
 *           type: string
 *
 *     ClientListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Client'
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: number
 *               example: 1
 *             limit:
 *               type: number
 *               example: 10
 *             total:
 *               type: number
 *               example: 50
 *             pages:
 *               type: number
 *               example: 5
 *
 *     ClientResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Client'
 *
 *     ClientStats:
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
 *             active:
 *               type: number
 *               example: 120
 *             inactive:
 *               type: number
 *               example: 25
 *             suspended:
 *               type: number
 *               example: 5
 *             totalRevenue:
 *               type: number
 *               example: 500000
 *             averageBalance:
 *               type: number
 *               example: 3333.33
 */
