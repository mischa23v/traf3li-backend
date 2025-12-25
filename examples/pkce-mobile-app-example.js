/**
 * PKCE OAuth Flow Example for Mobile Apps
 *
 * This example demonstrates how a mobile app should implement
 * OAuth with PKCE (Proof Key for Code Exchange) for secure authentication.
 */

const crypto = require('crypto');

// ============================================================================
// Example 1: Simple Mobile App Flow
// ============================================================================

console.log('='.repeat(80));
console.log('EXAMPLE 1: Mobile App OAuth with PKCE');
console.log('='.repeat(80));
console.log();

async function mobileAppOAuthFlow() {
    console.log('Step 1: Mobile app requests authorization URL with PKCE');
    console.log('-'.repeat(80));

    // Mobile app makes request to backend
    const authRequest = {
        method: 'GET',
        url: '/api/auth/sso/google/authorize',
        params: {
            use_pkce: 'true',  // Enable PKCE for mobile app
            returnUrl: '/dashboard'
        }
    };

    console.log('Request:', JSON.stringify(authRequest, null, 2));
    console.log();

    // Backend response (simulated)
    const authResponse = {
        error: false,
        message: 'Authorization URL generated successfully',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?' +
                 'client_id=your-client-id&' +
                 'redirect_uri=https://api.example.com/api/auth/sso/google/callback&' +
                 'response_type=code&' +
                 'scope=openid+profile+email&' +
                 'state=a1b2c3d4e5f6...&' +
                 'code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&' +
                 'code_challenge_method=S256',
        pkceEnabled: true
    };

    console.log('Response:', JSON.stringify(authResponse, null, 2));
    console.log();

    console.log('Step 2: Mobile app opens system browser with authorization URL');
    console.log('-'.repeat(80));
    console.log('Browser URL:', authResponse.authUrl);
    console.log();

    console.log('Step 3: User authenticates with provider (Google)');
    console.log('-'.repeat(80));
    console.log('- User enters credentials');
    console.log('- User grants permissions');
    console.log();

    console.log('Step 4: Provider redirects back to backend with authorization code');
    console.log('-'.repeat(80));
    const callbackUrl = 'https://api.example.com/api/auth/sso/google/callback?' +
                        'code=4/0AY0e-g7X...&' +
                        'state=a1b2c3d4e5f6...';
    console.log('Callback URL:', callbackUrl);
    console.log();

    console.log('Step 5: Backend exchanges code for tokens (with PKCE verification)');
    console.log('-'.repeat(80));
    console.log('Backend automatically:');
    console.log('- Verifies state token (CSRF protection)');
    console.log('- Retrieves code_verifier from Redis');
    console.log('- Sends token request with code_verifier');
    console.log('- Provider validates code_verifier matches code_challenge');
    console.log();

    console.log('Step 6: Backend redirects to frontend with authentication token');
    console.log('-'.repeat(80));
    const finalRedirect = 'https://app.example.com/dashboard?sso=success&isNewUser=false';
    console.log('Redirect URL:', finalRedirect);
    console.log('Cookie: accessToken=eyJhbGciOiJIUzI1...');
    console.log();

    console.log('✓ Mobile app successfully authenticated with PKCE');
    console.log();
}

mobileAppOAuthFlow();

// ============================================================================
// Example 2: PKCE Flow Step-by-Step (Technical Details)
// ============================================================================

console.log('='.repeat(80));
console.log('EXAMPLE 2: PKCE Technical Flow');
console.log('='.repeat(80));
console.log();

function pkceFlowStepByStep() {
    console.log('CLIENT SIDE (Backend - on behalf of mobile app)');
    console.log('-'.repeat(80));

    // Step 1: Generate code_verifier
    const codeVerifier = crypto.randomBytes(32)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    console.log('1. Generated code_verifier:');
    console.log('   Value:', codeVerifier);
    console.log('   Length:', codeVerifier.length, 'characters');
    console.log('   Type: Base64URL encoded random bytes');
    console.log();

    // Step 2: Generate code_challenge
    const codeChallenge = crypto.createHash('sha256')
        .update(codeVerifier)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    console.log('2. Generated code_challenge (SHA256 hash):');
    console.log('   Value:', codeChallenge);
    console.log('   Length:', codeChallenge.length, 'characters');
    console.log('   Algorithm: SHA256');
    console.log();

    // Step 3: Store in Redis
    console.log('3. Store code_verifier in Redis:');
    const stateToken = crypto.randomBytes(32).toString('hex');
    const redisKey = `oauth:state:${stateToken}`;
    const redisValue = {
        providerId: '507f1f77bcf86cd799439011',
        providerType: 'google',
        returnUrl: '/dashboard',
        firmId: null,
        redirectUri: 'https://api.example.com/api/auth/sso/google/callback',
        codeVerifier: codeVerifier,  // ← PKCE verifier stored here
        usePKCE: true,
        timestamp: Date.now()
    };

    console.log('   Key:', redisKey);
    console.log('   Value:', JSON.stringify(redisValue, null, 6));
    console.log('   TTL: 900 seconds (15 minutes)');
    console.log();

    console.log('AUTHORIZATION REQUEST');
    console.log('-'.repeat(80));

    // Step 4: Build authorization URL
    const authParams = {
        client_id: 'your-google-client-id',
        redirect_uri: 'https://api.example.com/api/auth/sso/google/callback',
        response_type: 'code',
        scope: 'openid profile email',
        state: stateToken,
        code_challenge: codeChallenge,  // ← Send challenge (not verifier!)
        code_challenge_method: 'S256',  // ← SHA256 method
        access_type: 'offline',
        prompt: 'consent'
    };

    console.log('4. Authorization URL parameters:');
    Object.entries(authParams).forEach(([key, value]) => {
        if (key === 'code_challenge') {
            console.log(`   ${key}: ${value} ← PKCE challenge`);
        } else if (key === 'code_challenge_method') {
            console.log(`   ${key}: ${value} ← PKCE method`);
        } else {
            console.log(`   ${key}: ${value}`);
        }
    });
    console.log();

    console.log('PROVIDER VALIDATION (Google)');
    console.log('-'.repeat(80));
    console.log('5. Provider stores code_challenge with authorization code');
    console.log('   - User authenticates');
    console.log('   - User grants permissions');
    console.log('   - Provider generates authorization code');
    console.log('   - Provider stores: code → code_challenge mapping');
    console.log();

    console.log('TOKEN EXCHANGE');
    console.log('-'.repeat(80));

    // Simulate callback
    const authorizationCode = 'mock-auth-code-' + crypto.randomBytes(16).toString('hex');

    console.log('6. Token request parameters:');
    const tokenParams = {
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: 'https://api.example.com/api/auth/sso/google/callback',
        client_id: 'your-google-client-id',
        client_secret: 'your-google-client-secret',
        code_verifier: codeVerifier  // ← PKCE verifier sent here
    };

    Object.entries(tokenParams).forEach(([key, value]) => {
        if (key === 'code_verifier') {
            console.log(`   ${key}: ${value} ← PKCE verifier`);
        } else if (key === 'client_secret') {
            console.log(`   ${key}: *** (hidden)`);
        } else {
            console.log(`   ${key}: ${value}`);
        }
    });
    console.log();

    console.log('7. Provider validates PKCE:');

    // Provider recomputes challenge from received verifier
    const recomputedChallenge = crypto.createHash('sha256')
        .update(codeVerifier)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    console.log('   a) Retrieve stored code_challenge for authorization code');
    console.log('      Stored challenge:', codeChallenge);
    console.log();
    console.log('   b) Compute SHA256(code_verifier) from token request');
    console.log('      Computed challenge:', recomputedChallenge);
    console.log();
    console.log('   c) Compare challenges:');
    console.log('      Match:', codeChallenge === recomputedChallenge ? '✓ YES' : '✗ NO');

    if (codeChallenge === recomputedChallenge) {
        console.log('      Result: ✓ PKCE validation successful');
        console.log('      Action: Issue access token');
    } else {
        console.log('      Result: ✗ PKCE validation failed');
        console.log('      Action: Return error (invalid_grant)');
    }
    console.log();

    console.log('8. Provider response:');
    const tokenResponse = {
        access_token: 'ya29.a0AfH6SMB...',
        expires_in: 3600,
        refresh_token: '1//0g...',
        scope: 'openid profile email',
        token_type: 'Bearer',
        id_token: 'eyJhbGciOiJSUzI1...'
    };
    console.log(JSON.stringify(tokenResponse, null, 2));
    console.log();

    console.log('✓ PKCE flow completed successfully!');
    console.log();
}

pkceFlowStepByStep();

// ============================================================================
// Example 3: Security Comparison (With vs Without PKCE)
// ============================================================================

console.log('='.repeat(80));
console.log('EXAMPLE 3: Security Comparison');
console.log('='.repeat(80));
console.log();

console.log('WITHOUT PKCE (Vulnerable to Code Interception)');
console.log('-'.repeat(80));
console.log('1. App → Provider: Request authorization code');
console.log('2. Provider → App: Redirect with code=ABC123');
console.log('3. 🔴 ATTACKER intercepts code: ABC123');
console.log('4. Attacker → Provider: Exchange code ABC123 for tokens');
console.log('5. Provider → Attacker: Here are the tokens ✗');
console.log('   ↳ Attacker successfully obtained tokens!');
console.log();

console.log('WITH PKCE (Protected Against Code Interception)');
console.log('-'.repeat(80));
console.log('1. App generates code_verifier (secret): XYZ789');
console.log('2. App computes code_challenge: SHA256(XYZ789) = abc123');
console.log('3. App → Provider: Request code with challenge=abc123');
console.log('4. Provider → App: Redirect with code=ABC123');
console.log('5. 🔴 ATTACKER intercepts code: ABC123');
console.log('6. Attacker → Provider: Exchange code ABC123 (without verifier)');
console.log('7. Provider → Attacker: Error: invalid_grant ✓');
console.log('   ↳ Attacker cannot use code without verifier!');
console.log('8. App → Provider: Exchange code ABC123 with verifier=XYZ789');
console.log('9. Provider validates: SHA256(XYZ789) == abc123 ✓');
console.log('10. Provider → App: Here are the tokens ✓');
console.log();

// ============================================================================
// Example 4: React Native / Mobile App Integration
// ============================================================================

console.log('='.repeat(80));
console.log('EXAMPLE 4: React Native Integration');
console.log('='.repeat(80));
console.log();

console.log('// React Native OAuth with PKCE Example');
console.log('// Install: npm install react-native-app-auth');
console.log();

console.log(`
import { authorize } from 'react-native-app-auth';

const config = {
  issuer: 'https://accounts.google.com',
  clientId: 'your-google-client-id.apps.googleusercontent.com',
  redirectUrl: 'com.yourapp:/oauth/callback',
  scopes: ['openid', 'profile', 'email'],

  // PKCE is automatically enabled by react-native-app-auth
  // Backend should detect this and handle appropriately
};

async function signInWithGoogle() {
  try {
    // Step 1: Start OAuth flow (PKCE handled automatically)
    const result = await authorize(config);

    // Step 2: Send authorization code to your backend
    const response = await fetch('https://api.example.com/api/auth/sso/google/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: result.authorizationCode,
        // Backend will validate with PKCE
      })
    });

    // Step 3: Get authentication token from backend
    const { token, user } = await response.json();

    // Step 4: Store token and update app state
    await AsyncStorage.setItem('authToken', token);

    console.log('Successfully authenticated:', user);

  } catch (error) {
    console.error('OAuth error:', error);
  }
}
`);

console.log('='.repeat(80));
console.log();

// ============================================================================
// Summary
// ============================================================================

console.log('='.repeat(80));
console.log('SUMMARY: PKCE Implementation Benefits');
console.log('='.repeat(80));
console.log();

const benefits = [
    {
        title: 'Enhanced Security',
        description: 'Prevents authorization code interception attacks'
    },
    {
        title: 'Mobile App Protection',
        description: 'Secures OAuth flow for native mobile applications'
    },
    {
        title: 'No Client Secret Required',
        description: 'Eliminates need to embed secrets in mobile apps'
    },
    {
        title: 'Backward Compatible',
        description: 'Optional for providers that support it, required for those that need it'
    },
    {
        title: 'Simple Integration',
        description: 'Just add ?use_pkce=true to authorization request'
    },
    {
        title: 'Automatic Handling',
        description: 'Backend automatically manages code_verifier storage and validation'
    }
];

benefits.forEach((benefit, index) => {
    console.log(`${index + 1}. ${benefit.title}`);
    console.log(`   ${benefit.description}`);
    console.log();
});

console.log('='.repeat(80));
console.log('For more information, see: /docs/PKCE_IMPLEMENTATION.md');
console.log('='.repeat(80));
console.log();
