const express = require('express');
const {
    getConfig,
    saveConfig,
    testConnection,
    testAuth,
    syncUsers,
    login
} = require('../controllers/ldap.controller');
const { authenticate, requireAdmin } = require('../middlewares');
const { authRateLimiter, sensitiveRateLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

// ========================================================================
// ADMIN ROUTES - LDAP Configuration Management
// ========================================================================

/**
 * @openapi
 * /api/admin/ldap/config:
 *   get:
 *     summary: Get LDAP configuration
 *     description: Retrieve LDAP/Active Directory configuration for the firm
 *     tags:
 *       - LDAP
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: LDAP configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 config:
 *                   type: object
 *                   description: LDAP configuration (sensitive fields removed)
 *                 status:
 *                   type: object
 *                   description: Configuration status
 *                 exists:
 *                   type: boolean
 *                   description: Whether configuration exists
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/config', authenticate, requireAdmin(), getConfig);

/**
 * @openapi
 * /api/admin/ldap/config:
 *   post:
 *     summary: Save LDAP configuration
 *     description: Create or update LDAP/Active Directory configuration
 *     tags:
 *       - LDAP
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serverUrl
 *               - baseDn
 *             properties:
 *               name:
 *                 type: string
 *                 description: Configuration name
 *                 example: "Company LDAP"
 *               serverUrl:
 *                 type: string
 *                 description: LDAP server URL
 *                 example: "ldaps://ldap.example.com:636"
 *               baseDn:
 *                 type: string
 *                 description: Base DN for searches
 *                 example: "dc=example,dc=com"
 *               bindDn:
 *                 type: string
 *                 description: Bind DN (service account)
 *                 example: "cn=admin,dc=example,dc=com"
 *               bindPassword:
 *                 type: string
 *                 description: Bind password (encrypted on server)
 *               userFilter:
 *                 type: string
 *                 description: User search filter
 *                 example: "(uid={username})"
 *               attributeMapping:
 *                 type: object
 *                 description: LDAP attribute mapping
 *               groupMapping:
 *                 type: object
 *                 description: Group to role mapping
 *               defaultRole:
 *                 type: string
 *                 enum: [lawyer, paralegal, secretary, accountant, partner]
 *               useSsl:
 *                 type: boolean
 *               useStarttls:
 *                 type: boolean
 *               verifyCertificate:
 *                 type: boolean
 *               isEnabled:
 *                 type: boolean
 *               autoProvisionUsers:
 *                 type: boolean
 *               updateUserAttributes:
 *                 type: boolean
 *               timeout:
 *                 type: number
 *               searchScope:
 *                 type: string
 *                 enum: [base, one, sub]
 *     responses:
 *       200:
 *         description: Configuration saved successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/config', authenticate, requireAdmin(), sensitiveRateLimiter, saveConfig);

/**
 * @openapi
 * /api/admin/ldap/test:
 *   post:
 *     summary: Test LDAP connection
 *     description: Test LDAP server connection and optionally test user authentication
 *     tags:
 *       - LDAP
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               testUser:
 *                 type: string
 *                 description: Optional username to test authentication
 *               testPassword:
 *                 type: string
 *                 description: Password for test user
 *     responses:
 *       200:
 *         description: Connection test successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 details:
 *                   type: object
 *                 responseTime:
 *                   type: number
 *       400:
 *         description: Connection test failed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/test', authenticate, requireAdmin(), authRateLimiter, testConnection);

/**
 * @openapi
 * /api/admin/ldap/test-auth:
 *   post:
 *     summary: Test user authentication
 *     description: Test LDAP authentication for a specific user (without creating account)
 *     tags:
 *       - LDAP
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username to test
 *               password:
 *                 type: string
 *                 description: Password to test
 *     responses:
 *       200:
 *         description: Authentication test successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   description: User attributes from LDAP
 *       400:
 *         description: Authentication test failed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/test-auth', authenticate, requireAdmin(), authRateLimiter, testAuth);

/**
 * @openapi
 * /api/admin/ldap/sync:
 *   post:
 *     summary: Sync users from LDAP
 *     description: Synchronize users from LDAP/Active Directory to local database
 *     tags:
 *       - LDAP
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filter:
 *                 type: string
 *                 description: Optional LDAP filter for user search
 *                 example: "(objectClass=person)"
 *     responses:
 *       200:
 *         description: User sync completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     usersCreated:
 *                       type: number
 *                     usersUpdated:
 *                       type: number
 *                     usersFailed:
 *                       type: number
 *                     duration:
 *                       type: number
 *       400:
 *         description: Sync failed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/sync', authenticate, requireAdmin(), sensitiveRateLimiter, syncUsers);

// ========================================================================
// PUBLIC AUTH ROUTES - LDAP Login
// ========================================================================

/**
 * @openapi
 * /api/auth/ldap/login:
 *   post:
 *     summary: LDAP login
 *     description: Authenticate user via LDAP/Active Directory
 *     tags:
 *       - Authentication
 *       - LDAP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firmId
 *               - username
 *               - password
 *             properties:
 *               firmId:
 *                 type: string
 *                 description: Firm ID
 *               username:
 *                 type: string
 *                 description: LDAP username
 *               password:
 *                 type: string
 *                 description: LDAP password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   description: User data
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: token=eyJhbGc...; HttpOnly; Secure; SameSite=None
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Authentication failed
 */
router.post('/login', authRateLimiter, login);

module.exports = router;
