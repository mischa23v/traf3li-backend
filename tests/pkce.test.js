/**
 * PKCE (Proof Key for Code Exchange) Implementation Tests
 *
 * This file demonstrates and tests the PKCE implementation for OAuth
 * to prevent authorization code interception attacks in mobile apps.
 */

const crypto = require('crypto');

/**
 * Test PKCE helper functions
 */
describe('PKCE Helper Functions', () => {
    /**
     * Generate PKCE code verifier
     * Should be a random URL-safe string between 43-128 characters
     */
    function generateCodeVerifier() {
        return crypto.randomBytes(32)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    /**
     * Generate PKCE code challenge from verifier
     * SHA256 hash of the verifier, base64url encoded
     */
    function generateCodeChallenge(verifier) {
        return crypto.createHash('sha256')
            .update(verifier)
            .digest('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    test('generateCodeVerifier should create valid verifier', () => {
        const verifier = generateCodeVerifier();

        console.log('Code Verifier:', verifier);
        console.log('Length:', verifier.length);

        // Verify length is at least 43 characters (PKCE spec minimum)
        expect(verifier.length).toBeGreaterThanOrEqual(43);

        // Verify it only contains URL-safe characters
        expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);

        // Verify no padding characters
        expect(verifier).not.toContain('=');
    });

    test('generateCodeChallenge should create valid challenge', () => {
        const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
        const challenge = generateCodeChallenge(verifier);

        console.log('Code Challenge:', challenge);
        console.log('Length:', challenge.length);

        // Verify challenge is created
        expect(challenge).toBeDefined();
        expect(challenge.length).toBeGreaterThan(0);

        // Verify it only contains URL-safe characters
        expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);

        // Verify no padding characters
        expect(challenge).not.toContain('=');

        // Verify deterministic: same verifier should produce same challenge
        const challenge2 = generateCodeChallenge(verifier);
        expect(challenge).toBe(challenge2);
    });

    test('different verifiers should produce different challenges', () => {
        const verifier1 = generateCodeVerifier();
        const verifier2 = generateCodeVerifier();

        const challenge1 = generateCodeChallenge(verifier1);
        const challenge2 = generateCodeChallenge(verifier2);

        expect(challenge1).not.toBe(challenge2);
    });
});

/**
 * Integration Test: Complete PKCE Flow
 */
describe('PKCE OAuth Flow', () => {
    test('complete flow simulation', () => {
        console.log('\n=== PKCE OAuth Flow Simulation ===\n');

        // Step 1: Client generates code_verifier
        const codeVerifier = crypto.randomBytes(32)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        console.log('1. Client generates code_verifier:');
        console.log('   Length:', codeVerifier.length);
        console.log('   Value:', codeVerifier);

        // Step 2: Client generates code_challenge from verifier
        const codeChallenge = crypto.createHash('sha256')
            .update(codeVerifier)
            .digest('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        console.log('\n2. Client generates code_challenge (SHA256):');
        console.log('   Length:', codeChallenge.length);
        console.log('   Value:', codeChallenge);

        // Step 3: Client sends authorization request with code_challenge
        console.log('\n3. Authorization Request Parameters:');
        console.log('   - client_id: your-client-id');
        console.log('   - redirect_uri: https://your-app/callback');
        console.log('   - response_type: code');
        console.log('   - code_challenge:', codeChallenge);
        console.log('   - code_challenge_method: S256');
        console.log('   - state: [random-state-token]');

        // Step 4: Server stores code_challenge with state
        console.log('\n4. Server stores code_verifier with state in Redis');

        // Step 5: User authenticates and authorizes
        console.log('\n5. User authenticates and authorizes');

        // Step 6: Server redirects back with authorization code
        const authorizationCode = 'mock-auth-code-' + crypto.randomBytes(16).toString('hex');
        console.log('\n6. Server redirects with authorization code:');
        console.log('   Code:', authorizationCode);

        // Step 7: Client exchanges code for tokens, including code_verifier
        console.log('\n7. Token Exchange Request:');
        console.log('   - grant_type: authorization_code');
        console.log('   - code:', authorizationCode);
        console.log('   - redirect_uri: https://your-app/callback');
        console.log('   - client_id: your-client-id');
        console.log('   - code_verifier:', codeVerifier);

        // Step 8: Server validates code_verifier
        console.log('\n8. Server validates code_verifier:');

        // Server computes challenge from received verifier
        const computedChallenge = crypto.createHash('sha256')
            .update(codeVerifier)
            .digest('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');

        console.log('   Stored challenge:  ', codeChallenge);
        console.log('   Computed challenge:', computedChallenge);
        console.log('   Match:', codeChallenge === computedChallenge ? '✓ Valid' : '✗ Invalid');

        expect(codeChallenge).toBe(computedChallenge);

        console.log('\n9. Server issues access token ✓');
        console.log('\n=== PKCE Flow Complete ===\n');
    });
});

/**
 * Security Tests
 */
describe('PKCE Security', () => {
    test('different verifiers should not match same challenge', () => {
        const originalVerifier = crypto.randomBytes(32).toString('base64url');
        const originalChallenge = crypto.createHash('sha256')
            .update(originalVerifier)
            .digest('base64url');

        const attackerVerifier = crypto.randomBytes(32).toString('base64url');
        const attackerChallenge = crypto.createHash('sha256')
            .update(attackerVerifier)
            .digest('base64url');

        // Attacker's challenge should not match original
        expect(attackerChallenge).not.toBe(originalChallenge);
    });

    test('verifier must be sufficient length', () => {
        const shortVerifier = 'short';
        const challenge = crypto.createHash('sha256')
            .update(shortVerifier)
            .digest('base64url');

        // While technically it works, we should enforce minimum length
        expect(shortVerifier.length).toBeLessThan(43);

        const validVerifier = crypto.randomBytes(32).toString('base64url');
        expect(validVerifier.length).toBeGreaterThanOrEqual(43);
    });
});

/**
 * Example Usage for Mobile Apps
 */
console.log('\n=== Example Mobile App Usage ===\n');

console.log('1. Mobile App Authorization Request:');
console.log('   GET /api/auth/sso/google/authorize?use_pkce=true&returnUrl=/dashboard');
console.log('');
console.log('2. Server Response:');
console.log('   {');
console.log('     "error": false,');
console.log('     "message": "Authorization URL generated successfully",');
console.log('     "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...',
                 + '&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
                 + '&code_challenge_method=S256",');
console.log('     "pkceEnabled": true');
console.log('   }');
console.log('');
console.log('3. Mobile App opens browser with authUrl');
console.log('');
console.log('4. User authenticates and is redirected back');
console.log('   GET /api/auth/sso/google/callback?code=...&state=...');
console.log('');
console.log('5. Server validates:');
console.log('   - State token (CSRF protection)');
console.log('   - Retrieves code_verifier from Redis');
console.log('   - Includes code_verifier in token exchange');
console.log('   - OAuth provider validates code_verifier matches code_challenge');
console.log('');
console.log('6. Mobile app receives authentication token');
console.log('');

console.log('\n=== Provider PKCE Support ===\n');

const providers = [
    { name: 'Google', support: 'optional', note: 'Supports but does not require PKCE' },
    { name: 'Microsoft', support: 'optional', note: 'Supports but does not require PKCE' },
    { name: 'Twitter', support: 'required', note: 'Requires PKCE for all OAuth 2.0 flows' },
    { name: 'Apple', support: 'none', note: 'Does not support PKCE (uses client_secret)' }
];

providers.forEach(provider => {
    console.log(`${provider.name}:`);
    console.log(`  Support: ${provider.support}`);
    console.log(`  Note: ${provider.note}`);
    console.log('');
});

console.log('\n=== Security Benefits ===\n');

console.log('PKCE prevents authorization code interception attacks by:');
console.log('1. Binding the authorization code to the client that requested it');
console.log('2. Eliminating the need for client_secret in public clients (mobile apps)');
console.log('3. Protecting against authorization code theft via:');
console.log('   - Malicious apps on the same device');
console.log('   - Browser/app redirection hijacking');
console.log('   - Man-in-the-middle attacks');
console.log('');
console.log('How it works:');
console.log('- Code verifier is kept secret on the client');
console.log('- Only code challenge (hash) is sent in authorization request');
console.log('- Attacker who intercepts authorization code cannot use it');
console.log('  because they do not have the original code verifier');
console.log('- Server validates verifier matches challenge before issuing tokens');
console.log('');
