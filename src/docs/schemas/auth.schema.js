/**
 * @openapi
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: lawyer@example.com
 *           description: User's email address
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           example: SecureP@ss123
 *           description: User's password (minimum 8 characters)
 *
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *         - role
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: newlawyer@example.com
 *           description: User's email address
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           example: SecureP@ss123
 *           description: Strong password with minimum 8 characters
 *         firstName:
 *           type: string
 *           example: John
 *           description: User's first name
 *         lastName:
 *           type: string
 *           example: Doe
 *           description: User's last name
 *         role:
 *           type: string
 *           enum: [admin, lawyer, client, staff]
 *           example: lawyer
 *           description: User role in the system
 *         phone:
 *           type: string
 *           example: '+966501234567'
 *           description: Optional phone number
 *         firmName:
 *           type: string
 *           example: 'Doe Legal Associates'
 *           description: Law firm name (for admin/lawyer registration)
 *
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Login successful
 *         token:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *           description: JWT access token
 *         refreshToken:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *           description: JWT refresh token
 *         user:
 *           $ref: '#/components/schemas/User'
 *
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 507f1f77bcf86cd799439011
 *           description: User's unique identifier
 *         email:
 *           type: string
 *           format: email
 *           example: lawyer@example.com
 *         firstName:
 *           type: string
 *           example: John
 *         lastName:
 *           type: string
 *           example: Doe
 *         role:
 *           type: string
 *           enum: [admin, lawyer, client, staff]
 *           example: lawyer
 *         firmId:
 *           type: string
 *           example: 507f1f77bcf86cd799439012
 *           description: Associated firm's ID
 *         phone:
 *           type: string
 *           example: '+966501234567'
 *         avatar:
 *           type: string
 *           example: 'https://example.com/avatar.jpg'
 *         isActive:
 *           type: boolean
 *           example: true
 *         isVerified:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: '2024-01-01T00:00:00.000Z'
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: '2024-01-15T12:30:00.000Z'
 *
 *     SendOTPRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: lawyer@example.com
 *           description: Email address to send OTP to
 *
 *     VerifyOTPRequest:
 *       type: object
 *       required:
 *         - email
 *         - otp
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: lawyer@example.com
 *           description: Email address
 *         otp:
 *           type: string
 *           example: '123456'
 *           minLength: 6
 *           maxLength: 6
 *           description: 6-digit OTP code
 *
 *     OTPResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: OTP sent successfully
 *         expiresIn:
 *           type: number
 *           example: 300
 *           description: OTP expiration time in seconds
 *
 *     CheckAvailabilityRequest:
 *       type: object
 *       required:
 *         - field
 *         - value
 *       properties:
 *         field:
 *           type: string
 *           enum: [email, username, phone]
 *           example: email
 *           description: Field to check availability for
 *         value:
 *           type: string
 *           example: newuser@example.com
 *           description: Value to check
 *
 *     AvailabilityResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         available:
 *           type: boolean
 *           example: true
 *           description: Whether the value is available
 *         message:
 *           type: string
 *           example: Email is available
 */
