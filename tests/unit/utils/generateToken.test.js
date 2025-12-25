/**
 * JWT Security Tests for Token Generation Utility
 *
 * Tests cover:
 * 1. Access token generation with proper structure
 * 2. Access token 15-minute expiration
 * 3. Refresh token with separate secret
 * 4. Refresh token 7-day expiration
 * 5. Valid token verification
 * 6. Expired token rejection
 * 7. Invalid signature rejection
 * 8. Secret validation requirements
 * 9. Separate secrets enforcement
 * 10. Token payload claims validation
 *
 * Note: These are pure utility tests that don't require database connection.
 * We skip the global database setup hooks for performance.
 */

// Skip global MongoDB setup for these unit tests
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    connect: jest.fn(),
    disconnect: jest.fn(),
    connection: {
      readyState: 0,
      collections: {},
    },
  };
});

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiration,
  isTokenExpired,
  validateSecrets,
} = require('../../../src/utils/generateToken');

// Mock logger to prevent console output during tests
jest.mock('../../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('JWT Security Tests - generateToken Utility', () => {
  // Test secrets (must be 32+ characters and different)
  const VALID_ACCESS_SECRET = 'a'.repeat(64);
  const VALID_REFRESH_SECRET = 'b'.repeat(64);
  const SHORT_SECRET = 'tooshort'; // Less than 32 chars

  // Mock user object for testing
  const mockUser = {
    _id: new mongoose.Types.ObjectId(),
    email: 'test@example.com',
    role: 'user',
  };

  // Store original env vars
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Set valid secrets for most tests
    process.env.JWT_SECRET = VALID_ACCESS_SECRET;
    process.env.JWT_REFRESH_SECRET = VALID_REFRESH_SECRET;

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Test 1: Access Token Generation - Token Structure and Claims', () => {
    it('should generate a valid access token with correct structure', () => {
      const token = generateAccessToken(mockUser);

      // Verify token exists and is a string
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts: header.payload.signature
    });

    it('should include correct JWT header in access token', () => {
      const token = generateAccessToken(mockUser);
      const decoded = jwt.decode(token, { complete: true });

      // Verify header structure
      expect(decoded.header).toBeDefined();
      expect(decoded.header.alg).toBe('HS256');
      expect(decoded.header.typ).toBe('JWT');
    });

    it('should include all required claims in access token', () => {
      const token = generateAccessToken(mockUser);
      const decoded = jwt.decode(token);

      // Verify payload contains all required fields
      expect(decoded.id).toBe(mockUser._id.toString());
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
      expect(decoded.iss).toBe('traf3li');
      expect(decoded.aud).toBe('traf3li-users');
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should not include sensitive data in access token', () => {
      const userWithPassword = {
        ...mockUser,
        password: 'secretPassword123',
        passwordHash: 'hashedPassword',
      };

      const token = generateAccessToken(userWithPassword);
      const decoded = jwt.decode(token);

      // Verify sensitive fields are not present
      expect(decoded.password).toBeUndefined();
      expect(decoded.passwordHash).toBeUndefined();
    });
  });

  describe('Test 2: Access Token Expiration - 15 Minute Expiry', () => {
    it('should set access token expiration to 15 minutes', () => {
      const beforeGeneration = Math.floor(Date.now() / 1000);
      const token = generateAccessToken(mockUser);
      const decoded = jwt.decode(token);

      const expectedExpiry = 15 * 60; // 15 minutes in seconds
      const actualExpiry = decoded.exp - decoded.iat;

      // Allow 1 second tolerance for execution time
      expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - 1);
      expect(actualExpiry).toBeLessThanOrEqual(expectedExpiry + 1);
    });

    it('should generate access token that expires in approximately 15 minutes from now', () => {
      const token = generateAccessToken(mockUser);
      const expiration = getTokenExpiration(token);
      const now = new Date();

      const differenceInMinutes = (expiration - now) / (1000 * 60);

      // Should be approximately 15 minutes (allow small variance)
      expect(differenceInMinutes).toBeGreaterThan(14.9);
      expect(differenceInMinutes).toBeLessThan(15.1);
    });

    it('should report access token as not expired immediately after generation', () => {
      const token = generateAccessToken(mockUser);
      expect(isTokenExpired(token)).toBe(false);
    });

    it('should correctly identify future expiration date', () => {
      const token = generateAccessToken(mockUser);
      const expiration = getTokenExpiration(token);
      const now = new Date();

      expect(expiration).toBeInstanceOf(Date);
      expect(expiration.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('Test 3: Refresh Token Generation - Separate Secret Used', () => {
    it('should generate refresh token using different secret than access token', () => {
      const accessToken = generateAccessToken(mockUser);
      const refreshToken = generateRefreshToken(mockUser);

      // Tokens should be different
      expect(refreshToken).not.toBe(accessToken);

      // Access token should verify with access secret but not refresh secret
      expect(() => {
        jwt.verify(accessToken, VALID_ACCESS_SECRET, {
          issuer: 'traf3li',
          audience: 'traf3li-users',
        });
      }).not.toThrow();

      expect(() => {
        jwt.verify(accessToken, VALID_REFRESH_SECRET, {
          issuer: 'traf3li',
          audience: 'traf3li-users',
        });
      }).toThrow();

      // Refresh token should verify with refresh secret but not access secret
      expect(() => {
        jwt.verify(refreshToken, VALID_REFRESH_SECRET, {
          issuer: 'traf3li',
          audience: 'traf3li-users',
        });
      }).not.toThrow();

      expect(() => {
        jwt.verify(refreshToken, VALID_ACCESS_SECRET, {
          issuer: 'traf3li',
          audience: 'traf3li-users',
        });
      }).toThrow();
    });

    it('should generate refresh token with minimal payload (security)', () => {
      const refreshToken = generateRefreshToken(mockUser);
      const decoded = jwt.decode(refreshToken);

      // Refresh token should only contain id, not email or role
      expect(decoded.id).toBe(mockUser._id.toString());
      expect(decoded.email).toBeUndefined();
      expect(decoded.role).toBeUndefined();

      // But should still have standard JWT claims
      expect(decoded.iss).toBe('traf3li');
      expect(decoded.aud).toBe('traf3li-users');
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should generate valid JWT structure for refresh token', () => {
      const token = generateRefreshToken(mockUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);

      const decoded = jwt.decode(token, { complete: true });
      expect(decoded.header.alg).toBe('HS256');
      expect(decoded.header.typ).toBe('JWT');
    });
  });

  describe('Test 4: Refresh Token Expiration - 7 Day Expiry', () => {
    it('should set refresh token expiration to 7 days', () => {
      const token = generateRefreshToken(mockUser);
      const decoded = jwt.decode(token);

      const expectedExpiry = 7 * 24 * 60 * 60; // 7 days in seconds
      const actualExpiry = decoded.exp - decoded.iat;

      // Allow 1 second tolerance
      expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - 1);
      expect(actualExpiry).toBeLessThanOrEqual(expectedExpiry + 1);
    });

    it('should generate refresh token that expires in approximately 7 days from now', () => {
      const token = generateRefreshToken(mockUser);
      const expiration = getTokenExpiration(token);
      const now = new Date();

      const differenceInDays = (expiration - now) / (1000 * 60 * 60 * 24);

      // Should be approximately 7 days (allow small variance)
      expect(differenceInDays).toBeGreaterThan(6.99);
      expect(differenceInDays).toBeLessThan(7.01);
    });

    it('should have longer expiration than access token', () => {
      const accessToken = generateAccessToken(mockUser);
      const refreshToken = generateRefreshToken(mockUser);

      const accessDecoded = jwt.decode(accessToken);
      const refreshDecoded = jwt.decode(refreshToken);

      const accessExpiry = accessDecoded.exp - accessDecoded.iat;
      const refreshExpiry = refreshDecoded.exp - refreshDecoded.iat;

      expect(refreshExpiry).toBeGreaterThan(accessExpiry);
      expect(refreshExpiry / accessExpiry).toBeGreaterThan(600); // At least 600x longer
    });
  });

  describe('Test 5: Token Verification - Valid Tokens Pass', () => {
    it('should successfully verify valid access token', () => {
      const token = generateAccessToken(mockUser);
      const verified = verifyAccessToken(token);

      expect(verified).toBeDefined();
      expect(verified.id).toBe(mockUser._id.toString());
      expect(verified.email).toBe(mockUser.email);
      expect(verified.role).toBe(mockUser.role);
    });

    it('should successfully verify valid refresh token', () => {
      const token = generateRefreshToken(mockUser);
      const verified = verifyRefreshToken(token);

      expect(verified).toBeDefined();
      expect(verified.id).toBe(mockUser._id.toString());
    });

    it('should verify tokens with correct issuer and audience', () => {
      const accessToken = generateAccessToken(mockUser);
      const refreshToken = generateRefreshToken(mockUser);

      const accessVerified = verifyAccessToken(accessToken);
      const refreshVerified = verifyRefreshToken(refreshToken);

      expect(accessVerified.iss).toBe('traf3li');
      expect(accessVerified.aud).toBe('traf3li-users');
      expect(refreshVerified.iss).toBe('traf3li');
      expect(refreshVerified.aud).toBe('traf3li-users');
    });

    it('should generate token pair with both valid tokens', () => {
      const { accessToken, refreshToken } = generateTokenPair(mockUser);

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      const accessVerified = verifyAccessToken(accessToken);
      const refreshVerified = verifyRefreshToken(refreshToken);

      expect(accessVerified.id).toBe(mockUser._id.toString());
      expect(refreshVerified.id).toBe(mockUser._id.toString());
    });

    it('should decode token without verification', () => {
      const token = generateAccessToken(mockUser);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(mockUser._id.toString());
      expect(decoded.email).toBe(mockUser.email);
    });
  });

  describe('Test 6: Expired Token Rejection - Expired Tokens Fail', () => {
    it('should reject expired access token', () => {
      // Create token that expired 1 hour ago
      const expiredToken = jwt.sign(
        { id: mockUser._id.toString(), email: mockUser.email, role: mockUser.role },
        VALID_ACCESS_SECRET,
        {
          expiresIn: '-1h',
          issuer: 'traf3li',
          audience: 'traf3li-users',
          algorithm: 'HS256',
        }
      );

      expect(() => verifyAccessToken(expiredToken)).toThrow('TOKEN_EXPIRED');
    });

    it('should reject expired refresh token', () => {
      // Create token that expired 1 day ago
      const expiredToken = jwt.sign(
        { id: mockUser._id.toString() },
        VALID_REFRESH_SECRET,
        {
          expiresIn: '-1d',
          issuer: 'traf3li',
          audience: 'traf3li-users',
          algorithm: 'HS256',
        }
      );

      expect(() => verifyRefreshToken(expiredToken)).toThrow('REFRESH_TOKEN_EXPIRED');
    });

    it('should correctly identify expired token using isTokenExpired', () => {
      const expiredToken = jwt.sign(
        { id: mockUser._id.toString() },
        VALID_ACCESS_SECRET,
        { expiresIn: '-1h' }
      );

      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it('should return past date for expired token expiration', () => {
      const expiredToken = jwt.sign(
        { id: mockUser._id.toString() },
        VALID_ACCESS_SECRET,
        { expiresIn: '-1h' }
      );

      const expiration = getTokenExpiration(expiredToken);
      const now = new Date();

      expect(expiration).toBeInstanceOf(Date);
      expect(expiration.getTime()).toBeLessThan(now.getTime());
    });
  });

  describe('Test 7: Invalid Signature Rejection - Tampered Tokens Fail', () => {
    it('should reject access token with invalid signature', () => {
      const token = generateAccessToken(mockUser);

      // Tamper with the signature by changing last character
      const tamperedToken = token.slice(0, -1) + 'X';

      expect(() => verifyAccessToken(tamperedToken)).toThrow('INVALID_TOKEN');
    });

    it('should reject refresh token with invalid signature', () => {
      const token = generateRefreshToken(mockUser);

      // Tamper with the signature
      const tamperedToken = token.slice(0, -5) + 'XXXXX';

      expect(() => verifyRefreshToken(tamperedToken)).toThrow('INVALID_REFRESH_TOKEN');
    });

    it('should reject token signed with wrong secret', () => {
      const wrongSecret = 'c'.repeat(64);

      const tokenWithWrongSecret = jwt.sign(
        { id: mockUser._id.toString(), email: mockUser.email, role: mockUser.role },
        wrongSecret,
        {
          expiresIn: '15m',
          issuer: 'traf3li',
          audience: 'traf3li-users',
          algorithm: 'HS256',
        }
      );

      expect(() => verifyAccessToken(tokenWithWrongSecret)).toThrow('INVALID_TOKEN');
    });

    it('should reject malformed token', () => {
      const malformedToken = 'not.a.valid.jwt.token';

      expect(() => verifyAccessToken(malformedToken)).toThrow('INVALID_TOKEN');
    });

    it('should reject token with tampered payload', () => {
      const token = generateAccessToken(mockUser);
      const parts = token.split('.');

      // Decode and modify payload
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      payload.role = 'admin'; // Attempt privilege escalation

      // Re-encode modified payload
      parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64');
      const tamperedToken = parts.join('.');

      expect(() => verifyAccessToken(tamperedToken)).toThrow('INVALID_TOKEN');
    });

    it('should reject access token verified with refresh secret', () => {
      const accessToken = generateAccessToken(mockUser);

      expect(() => {
        jwt.verify(accessToken, VALID_REFRESH_SECRET, {
          issuer: 'traf3li',
          audience: 'traf3li-users',
        });
      }).toThrow();
    });

    it('should reject refresh token verified with access secret', () => {
      const refreshToken = generateRefreshToken(mockUser);

      expect(() => {
        jwt.verify(refreshToken, VALID_ACCESS_SECRET, {
          issuer: 'traf3li',
          audience: 'traf3li-users',
        });
      }).toThrow();
    });
  });

  describe('Test 8: Secret Validation - Minimum 32-Character Secret Required', () => {
    it('should reject JWT_SECRET shorter than 32 characters', () => {
      process.env.JWT_SECRET = SHORT_SECRET;
      process.env.JWT_REFRESH_SECRET = VALID_REFRESH_SECRET;

      expect(() => validateSecrets()).toThrow('JWT_SECRET must be at least 32 characters long');
    });

    it('should reject JWT_REFRESH_SECRET shorter than 32 characters', () => {
      process.env.JWT_SECRET = VALID_ACCESS_SECRET;
      process.env.JWT_REFRESH_SECRET = SHORT_SECRET;

      expect(() => validateSecrets()).toThrow('JWT_REFRESH_SECRET must be at least 32 characters long');
    });

    it('should reject both secrets if both are too short', () => {
      process.env.JWT_SECRET = 'short1';
      process.env.JWT_REFRESH_SECRET = 'short2';

      expect(() => validateSecrets()).toThrow('JWT_SECRET must be at least 32 characters long');
    });

    it('should accept secrets that are exactly 32 characters', () => {
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);

      expect(() => validateSecrets()).not.toThrow();
      expect(validateSecrets()).toBe(true);
    });

    it('should accept secrets longer than 32 characters', () => {
      process.env.JWT_SECRET = 'a'.repeat(100);
      process.env.JWT_REFRESH_SECRET = 'b'.repeat(100);

      expect(() => validateSecrets()).not.toThrow();
      expect(validateSecrets()).toBe(true);
    });

    it('should throw error when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      process.env.JWT_REFRESH_SECRET = VALID_REFRESH_SECRET;

      expect(() => validateSecrets()).toThrow('JWT_SECRET is not set');
    });

    it('should throw error when JWT_REFRESH_SECRET is missing', () => {
      process.env.JWT_SECRET = VALID_ACCESS_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => validateSecrets()).toThrow('JWT_REFRESH_SECRET is not set');
    });

    it('should fail token generation with missing JWT_SECRET', () => {
      delete process.env.JWT_SECRET;

      expect(() => generateAccessToken(mockUser)).toThrow('Token generation failed');
    });

    it('should fail token generation with missing JWT_REFRESH_SECRET', () => {
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => generateRefreshToken(mockUser)).toThrow('Token generation failed');
    });
  });

  describe('Test 9: Separate Secrets - Access and Refresh Use Different Secrets', () => {
    it('should reject when JWT_SECRET equals JWT_REFRESH_SECRET', () => {
      const sameSecret = 'a'.repeat(64);
      process.env.JWT_SECRET = sameSecret;
      process.env.JWT_REFRESH_SECRET = sameSecret;

      expect(() => validateSecrets()).toThrow(
        'JWT_SECRET and JWT_REFRESH_SECRET must be different'
      );
    });

    it('should enforce different secrets even if both are valid length', () => {
      const secret = 'x'.repeat(128);
      process.env.JWT_SECRET = secret;
      process.env.JWT_REFRESH_SECRET = secret;

      expect(() => validateSecrets()).toThrow(
        'JWT_SECRET and JWT_REFRESH_SECRET must be different'
      );
    });

    it('should accept when secrets are different and valid', () => {
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);

      expect(() => validateSecrets()).not.toThrow();
      expect(validateSecrets()).toBe(true);
    });

    it('should generate different token signatures with different secrets', () => {
      const accessToken = generateAccessToken(mockUser);
      const refreshToken = generateRefreshToken(mockUser);

      // Extract signatures (third part of JWT)
      const accessSignature = accessToken.split('.')[2];
      const refreshSignature = refreshToken.split('.')[2];

      // Signatures should be different even for same user
      expect(accessSignature).not.toBe(refreshSignature);
    });

    it('should prevent cross-verification of access and refresh tokens', () => {
      const accessToken = generateAccessToken(mockUser);
      const refreshToken = generateRefreshToken(mockUser);

      // Access token should not verify as refresh token
      expect(() => verifyRefreshToken(accessToken)).toThrow();

      // Refresh token should not verify as access token
      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
  });

  describe('Test 10: Token Payload - Verify Correct Claims (id, email, role)', () => {
    it('should include user id in access token payload', () => {
      const token = generateAccessToken(mockUser);
      const verified = verifyAccessToken(token);

      expect(verified.id).toBe(mockUser._id.toString());
      expect(typeof verified.id).toBe('string');
    });

    it('should include user email in access token payload', () => {
      const token = generateAccessToken(mockUser);
      const verified = verifyAccessToken(token);

      expect(verified.email).toBe(mockUser.email);
      expect(verified.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/); // Valid email format
    });

    it('should include user role in access token payload', () => {
      const token = generateAccessToken(mockUser);
      const verified = verifyAccessToken(token);

      expect(verified.role).toBe(mockUser.role);
      expect(typeof verified.role).toBe('string');
    });

    it('should handle different user roles correctly', () => {
      const roles = ['user', 'admin', 'moderator', 'guest'];

      roles.forEach(role => {
        const userWithRole = { ...mockUser, role };
        const token = generateAccessToken(userWithRole);
        const verified = verifyAccessToken(token);

        expect(verified.role).toBe(role);
      });
    });

    it('should only include user id in refresh token payload (not email or role)', () => {
      const token = generateRefreshToken(mockUser);
      const verified = verifyRefreshToken(token);

      expect(verified.id).toBe(mockUser._id.toString());
      expect(verified.email).toBeUndefined();
      expect(verified.role).toBeUndefined();
    });

    it('should include standard JWT claims in access token', () => {
      const token = generateAccessToken(mockUser);
      const verified = verifyAccessToken(token);

      // Standard claims
      expect(verified.iat).toBeDefined(); // Issued at
      expect(verified.exp).toBeDefined(); // Expiration
      expect(verified.iss).toBe('traf3li'); // Issuer
      expect(verified.aud).toBe('traf3li-users'); // Audience

      // Verify iat and exp are numbers (Unix timestamps)
      expect(typeof verified.iat).toBe('number');
      expect(typeof verified.exp).toBe('number');
      expect(verified.exp).toBeGreaterThan(verified.iat);
    });

    it('should include standard JWT claims in refresh token', () => {
      const token = generateRefreshToken(mockUser);
      const verified = verifyRefreshToken(token);

      expect(verified.iat).toBeDefined();
      expect(verified.exp).toBeDefined();
      expect(verified.iss).toBe('traf3li');
      expect(verified.aud).toBe('traf3li-users');

      expect(typeof verified.iat).toBe('number');
      expect(typeof verified.exp).toBe('number');
      expect(verified.exp).toBeGreaterThan(verified.iat);
    });

    it('should handle ObjectId conversion to string correctly', () => {
      const userWithObjectId = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        email: 'test@example.com',
        role: 'user',
      };

      const token = generateAccessToken(userWithObjectId);
      const verified = verifyAccessToken(token);

      expect(verified.id).toBe('507f1f77bcf86cd799439011');
      expect(typeof verified.id).toBe('string');
    });

    it('should maintain payload integrity across token lifecycle', () => {
      const { accessToken, refreshToken } = generateTokenPair(mockUser);

      const accessDecoded = decodeToken(accessToken);
      const refreshDecoded = decodeToken(refreshToken);

      // Both should have same user ID
      expect(accessDecoded.id).toBe(mockUser._id.toString());
      expect(refreshDecoded.id).toBe(mockUser._id.toString());

      // Access token should have additional claims
      expect(accessDecoded.email).toBe(mockUser.email);
      expect(accessDecoded.role).toBe(mockUser.role);

      // Refresh token should not have additional claims
      expect(refreshDecoded.email).toBeUndefined();
      expect(refreshDecoded.role).toBeUndefined();
    });

    it('should not leak sensitive user data into token payload', () => {
      const sensitiveUser = {
        _id: mockUser._id,
        email: mockUser.email,
        role: mockUser.role,
        password: 'hashedPassword123',
        passwordResetToken: 'resetToken',
        sessionToken: 'sessionToken',
        privateKey: 'privateKey',
        creditCard: '1234-5678-9012-3456',
      };

      const token = generateAccessToken(sensitiveUser);
      const decoded = decodeToken(token);

      // Should only include safe fields
      expect(decoded.id).toBeDefined();
      expect(decoded.email).toBeDefined();
      expect(decoded.role).toBeDefined();

      // Should NOT include sensitive fields
      expect(decoded.password).toBeUndefined();
      expect(decoded.passwordResetToken).toBeUndefined();
      expect(decoded.sessionToken).toBeUndefined();
      expect(decoded.privateKey).toBeUndefined();
      expect(decoded.creditCard).toBeUndefined();
    });
  });

  describe('Additional Security Tests', () => {
    it('should handle null or undefined user gracefully', () => {
      expect(() => generateAccessToken(null)).toThrow();
      expect(() => generateAccessToken(undefined)).toThrow();
      expect(() => generateRefreshToken(null)).toThrow();
      expect(() => generateRefreshToken(undefined)).toThrow();
    });

    it('should handle empty string token gracefully', () => {
      expect(() => verifyAccessToken('')).toThrow();
      expect(() => verifyRefreshToken('')).toThrow();
      expect(decodeToken('')).toBeNull();
      expect(getTokenExpiration('')).toBeNull();
    });

    it('should handle null token in utility functions', () => {
      expect(decodeToken(null)).toBeNull();
      expect(getTokenExpiration(null)).toBeNull();
      expect(isTokenExpired(null)).toBe(true);
    });

    it('should generate unique tokens for each call', async () => {
      const token1 = generateAccessToken(mockUser);

      // Wait 1 second to ensure different iat (issued at) timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));

      const token2 = generateAccessToken(mockUser);

      // Tokens should be different due to different iat (issued at) timestamps
      expect(token1).not.toBe(token2);

      // Verify they have different iat values
      const decoded1 = jwt.decode(token1);
      const decoded2 = jwt.decode(token2);
      expect(decoded2.iat).toBeGreaterThan(decoded1.iat);
    });

    it('should maintain consistent algorithm (HS256)', () => {
      const accessToken = generateAccessToken(mockUser);
      const refreshToken = generateRefreshToken(mockUser);

      const accessDecoded = jwt.decode(accessToken, { complete: true });
      const refreshDecoded = jwt.decode(refreshToken, { complete: true });

      expect(accessDecoded.header.alg).toBe('HS256');
      expect(refreshDecoded.header.alg).toBe('HS256');
    });
  });
});
