/**
 * Custom JWT Claims - Usage Examples
 *
 * This file demonstrates how to use the custom JWT claims feature
 * in various scenarios.
 */

const customClaimsService = require('../src/services/customClaims.service');
const { generateAccessToken, generateTokenPair } = require('../src/utils/generateToken');

// ============================================================================
// EXAMPLE 1: Getting Custom Claims for a User
// ============================================================================

async function example1_getCustomClaims() {
    console.log('\n=== Example 1: Get Custom Claims ===');

    // Get all claims for a user
    const userId = '64f9b8a1c2e3d4f5a6b7c8d9';
    const claims = await customClaimsService.getCustomClaims(userId);

    console.log('User Claims:', JSON.stringify(claims, null, 2));
    /*
    Output:
    {
      "user_id": "64f9b8a1c2e3d4f5a6b7c8d9",
      "email": "lawyer@example.com",
      "email_verified": true,
      "role": "lawyer",
      "firm_id": "64f9b8a1c2e3d4f5a6b7c8d0",
      "firm_role": "partner",
      "mfa_enabled": true,
      "subscription_tier": "professional",
      "department": "Corporate Law",  // Custom claim
      "clearance_level": 4,           // Custom claim
      "lawyer_verified": true,        // Dynamic claim
      "is_firm_owner": false         // Conditional claim
    }
    */
}

// ============================================================================
// EXAMPLE 2: Setting Custom Claims (Admin Function)
// ============================================================================

async function example2_setCustomClaims() {
    console.log('\n=== Example 2: Set Custom Claims ===');

    const userId = '64f9b8a1c2e3d4f5a6b7c8d9';

    // Set custom claims for a user
    const customClaims = {
        department: 'Corporate Law',
        clearance_level: 4,
        office_location: 'Riyadh Branch',
        special_permissions: ['approve_contracts', 'sign_documents'],
        metadata: {
            employee_id: 'EMP-12345',
            hire_date: '2024-01-15'
        }
    };

    // Merge with existing claims
    await customClaimsService.setCustomClaims(userId, customClaims, {
        merge: true,
        validate: true
    });

    console.log('Custom claims set successfully');
}

// ============================================================================
// EXAMPLE 3: Generating Token with Custom Claims
// ============================================================================

async function example3_generateTokenWithClaims() {
    console.log('\n=== Example 3: Generate Token with Claims ===');

    // Mock user object (normally from database)
    const user = {
        _id: '64f9b8a1c2e3d4f5a6b7c8d9',
        email: 'lawyer@example.com',
        role: 'lawyer',
        firmId: '64f9b8a1c2e3d4f5a6b7c8d0',
        firmRole: 'partner',
        isEmailVerified: true,
        mfaEnabled: true,
        customClaims: {
            department: 'Corporate Law',
            clearance_level: 4
        }
    };

    // Mock firm object (optional context)
    const firm = {
        _id: '64f9b8a1c2e3d4f5a6b7c8d0',
        subscription: {
            plan: 'professional',
            status: 'active'
        },
        settings: {
            timezone: 'Asia/Riyadh',
            language: 'ar'
        }
    };

    // Generate token with custom claims
    const accessToken = await generateAccessToken(user, { firm });

    // Decode token to see claims (in production, don't decode on server)
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(accessToken);

    console.log('Token Claims:', JSON.stringify(decoded, null, 2));
    /*
    Output:
    {
      "id": "64f9b8a1c2e3d4f5a6b7c8d9",
      "email": "lawyer@example.com",
      "role": "lawyer",
      "user_id": "64f9b8a1c2e3d4f5a6b7c8d9",
      "email_verified": true,
      "firm_id": "64f9b8a1c2e3d4f5a6b7c8d0",
      "firm_role": "partner",
      "mfa_enabled": true,
      "subscription_tier": "professional",
      "subscription_status": "active",
      "department": "Corporate Law",
      "clearance_level": 4,
      "firm_timezone": "Asia/Riyadh",
      "firm_language": "ar",
      "iss": "traf3li",
      "aud": "traf3li-users",
      "exp": 1735129800,
      "iat": 1735129000
    }
    */
}

// ============================================================================
// EXAMPLE 4: Validating Claims Before Setting
// ============================================================================

async function example4_validateClaims() {
    console.log('\n=== Example 4: Validate Claims ===');

    const claims = {
        department: 'Legal',
        clearance_level: 3,
        permissions: ['read', 'write'],
        // Invalid: using reserved JWT claim
        exp: 1234567890  // This will fail validation
    };

    const validation = customClaimsService.validateCustomClaims(claims);

    if (validation.valid) {
        console.log('Claims are valid!');
    } else {
        console.log('Validation errors:', validation.errors);
        // Output: ["Cannot use reserved claim name: exp"]
    }

    // Valid claims
    const validClaims = {
        department: 'Legal',
        clearance_level: 3,
        permissions: ['read', 'write']
    };

    const validValidation = customClaimsService.validateCustomClaims(validClaims);
    console.log('Valid claims check:', validValidation.valid); // true
}

// ============================================================================
// EXAMPLE 5: Deleting Specific Claims
// ============================================================================

async function example5_deleteSpecificClaims() {
    console.log('\n=== Example 5: Delete Specific Claims ===');

    const userId = '64f9b8a1c2e3d4f5a6b7c8d9';

    // Delete specific claim keys
    await customClaimsService.deleteCustomClaims(userId, [
        'clearance_level',
        'office_location'
    ]);

    console.log('Specific claims deleted');

    // Delete all custom claims
    await customClaimsService.deleteCustomClaims(userId);
    console.log('All custom claims deleted');
}

// ============================================================================
// EXAMPLE 6: Using Claims in Middleware
// ============================================================================

function example6_claimsMiddleware() {
    console.log('\n=== Example 6: Claims Middleware ===');

    /**
     * Middleware to check clearance level
     */
    const requireClearanceLevel = (minLevel) => {
        return (req, res, next) => {
            const jwt = require('jsonwebtoken');
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);

                if (!decoded.clearance_level || decoded.clearance_level < minLevel) {
                    return res.status(403).json({
                        error: true,
                        message: `Clearance level ${minLevel} required`,
                        current: decoded.clearance_level || 0
                    });
                }

                next();
            } catch (error) {
                return res.status(401).json({ error: 'Invalid token' });
            }
        };
    };

    /**
     * Middleware to check department access
     */
    const requireDepartment = (allowedDepartments) => {
        return (req, res, next) => {
            const jwt = require('jsonwebtoken');
            const token = req.headers.authorization?.split(' ')[1];

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);

                if (!decoded.department || !allowedDepartments.includes(decoded.department)) {
                    return res.status(403).json({
                        error: true,
                        message: 'Department access denied',
                        allowed: allowedDepartments
                    });
                }

                next();
            } catch (error) {
                return res.status(401).json({ error: 'Invalid token' });
            }
        };
    };

    // Usage in Express routes
    const express = require('express');
    const app = express();

    // Route requiring clearance level 4
    app.delete('/api/sensitive-data/:id',
        requireClearanceLevel(4),
        (req, res) => {
            res.json({ message: 'Sensitive data deleted' });
        }
    );

    // Route requiring specific departments
    app.get('/api/financial-reports',
        requireDepartment(['Finance', 'Accounting', 'Corporate Law']),
        (req, res) => {
            res.json({ message: 'Financial reports' });
        }
    );

    console.log('Middleware examples defined');
}

// ============================================================================
// EXAMPLE 7: Frontend Usage
// ============================================================================

function example7_frontendUsage() {
    console.log('\n=== Example 7: Frontend Usage ===');

    // This is example frontend code (React/Vue/Angular)
    const frontendExample = `
// Decode JWT token to access claims
import jwt_decode from 'jwt-decode';

function MyComponent() {
    const token = localStorage.getItem('accessToken');
    const user = jwt_decode(token);

    // Access custom claims
    const department = user.department;
    const clearanceLevel = user.clearance_level;
    const permissions = user.permissions || [];

    // Conditional rendering based on claims
    return (
        <div>
            <h1>Welcome {user.email}</h1>
            <p>Department: {department}</p>
            <p>Clearance Level: {clearanceLevel}</p>

            {user.is_admin && (
                <AdminPanel />
            )}

            {clearanceLevel >= 4 && (
                <SensitiveDataAccess />
            )}

            {permissions.includes('approve_contracts') && (
                <ContractApprovalButton />
            )}

            {user.subscription_tier === 'enterprise' && (
                <EnterpriseFeatures />
            )}
        </div>
    );
}
`;

    console.log(frontendExample);
}

// ============================================================================
// EXAMPLE 8: Admin API Usage
// ============================================================================

async function example8_adminAPIUsage() {
    console.log('\n=== Example 8: Admin API Usage ===');

    const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    const userId = '64f9b8a1c2e3d4f5a6b7c8d9';

    // 1. Set custom claims
    const setResponse = await fetch(`/api/admin/users/${userId}/claims`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            claims: {
                department: 'Corporate Law',
                clearance_level: 4
            },
            merge: true
        })
    });

    console.log('Set claims response:', await setResponse.json());

    // 2. Get current claims
    const getResponse = await fetch(`/api/admin/users/${userId}/claims`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${adminToken}`
        }
    });

    console.log('Get claims response:', await getResponse.json());

    // 3. Preview token claims
    const previewResponse = await fetch(`/api/admin/users/${userId}/claims/preview`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${adminToken}`
        }
    });

    console.log('Preview response:', await previewResponse.json());

    // 4. Validate claims before setting
    const validateResponse = await fetch(`/api/admin/users/${userId}/claims/validate`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            claims: {
                new_field: 'value',
                another_field: 123
            }
        })
    });

    console.log('Validate response:', await validateResponse.json());

    // 5. Delete specific claims
    const deleteResponse = await fetch(`/api/admin/users/${userId}/claims`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            keys: ['clearance_level']
        })
    });

    console.log('Delete response:', await deleteResponse.json());
}

// ============================================================================
// Run Examples
// ============================================================================

async function runExamples() {
    try {
        await example1_getCustomClaims();
        await example2_setCustomClaims();
        await example3_generateTokenWithClaims();
        await example4_validateClaims();
        await example5_deleteSpecificClaims();
        example6_claimsMiddleware();
        example7_frontendUsage();
        await example8_adminAPIUsage();
    } catch (error) {
        console.error('Error running examples:', error);
    }
}

// Uncomment to run examples
// runExamples();

module.exports = {
    example1_getCustomClaims,
    example2_setCustomClaims,
    example3_generateTokenWithClaims,
    example4_validateClaims,
    example5_deleteSpecificClaims,
    example6_claimsMiddleware,
    example7_frontendUsage,
    example8_adminAPIUsage
};
