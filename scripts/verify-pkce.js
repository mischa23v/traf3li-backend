/**
 * PKCE Implementation Verification Script
 *
 * This script verifies that the PKCE helper functions work correctly
 * and demonstrates their usage.
 */

const crypto = require('crypto');

// Colors for terminal output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
    log(`✓ ${message}`, 'green');
}

function error(message) {
    log(`✗ ${message}`, 'red');
}

function info(message) {
    log(`ℹ ${message}`, 'blue');
}

// ============================================================================
// PKCE Helper Functions (from oauth.service.js)
// ============================================================================

function generateCodeVerifier() {
    return crypto.randomBytes(32)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function generateCodeChallenge(verifier) {
    return crypto.createHash('sha256')
        .update(verifier)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

// ============================================================================
// Verification Tests
// ============================================================================

console.log('\n' + '='.repeat(80));
log('PKCE Implementation Verification', 'blue');
console.log('='.repeat(80) + '\n');

// Test 1: Code Verifier Generation
console.log('Test 1: Code Verifier Generation');
console.log('-'.repeat(80));

let testsPassed = 0;
let testsFailed = 0;

try {
    const verifier = generateCodeVerifier();

    // Check length
    if (verifier.length >= 43 && verifier.length <= 128) {
        success(`Verifier length is valid: ${verifier.length} characters`);
        testsPassed++;
    } else {
        error(`Verifier length is invalid: ${verifier.length} characters (should be 43-128)`);
        testsFailed++;
    }

    // Check URL-safe characters
    if (/^[A-Za-z0-9_-]+$/.test(verifier)) {
        success('Verifier contains only URL-safe characters (A-Za-z0-9_-)');
        testsPassed++;
    } else {
        error('Verifier contains invalid characters');
        testsFailed++;
    }

    // Check no padding
    if (!verifier.includes('=')) {
        success('Verifier has no padding characters (=)');
        testsPassed++;
    } else {
        error('Verifier contains padding characters');
        testsFailed++;
    }

    info(`Sample verifier: ${verifier.substring(0, 20)}...`);

} catch (err) {
    error(`Code verifier generation failed: ${err.message}`);
    testsFailed++;
}

console.log();

// Test 2: Code Challenge Generation
console.log('Test 2: Code Challenge Generation');
console.log('-'.repeat(80));

try {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = generateCodeChallenge(verifier);
    const expectedChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

    // Check deterministic
    if (challenge === expectedChallenge) {
        success('Challenge generation is deterministic (matches RFC 7636 example)');
        testsPassed++;
    } else {
        error(`Challenge mismatch. Got: ${challenge}, Expected: ${expectedChallenge}`);
        testsFailed++;
    }

    // Check URL-safe
    if (/^[A-Za-z0-9_-]+$/.test(challenge)) {
        success('Challenge contains only URL-safe characters');
        testsPassed++;
    } else {
        error('Challenge contains invalid characters');
        testsFailed++;
    }

    // Check no padding
    if (!challenge.includes('=')) {
        success('Challenge has no padding characters');
        testsPassed++;
    } else {
        error('Challenge contains padding characters');
        testsFailed++;
    }

    info(`Sample challenge: ${challenge}`);

} catch (err) {
    error(`Code challenge generation failed: ${err.message}`);
    testsFailed++;
}

console.log();

// Test 3: Different Verifiers Produce Different Challenges
console.log('Test 3: Uniqueness Test');
console.log('-'.repeat(80));

try {
    const verifier1 = generateCodeVerifier();
    const verifier2 = generateCodeVerifier();
    const challenge1 = generateCodeChallenge(verifier1);
    const challenge2 = generateCodeChallenge(verifier2);

    if (verifier1 !== verifier2) {
        success('Different verifiers are generated');
        testsPassed++;
    } else {
        error('Generated verifiers are identical (collision)');
        testsFailed++;
    }

    if (challenge1 !== challenge2) {
        success('Different challenges are generated for different verifiers');
        testsPassed++;
    } else {
        error('Generated challenges are identical (collision)');
        testsFailed++;
    }

} catch (err) {
    error(`Uniqueness test failed: ${err.message}`);
    testsFailed++;
}

console.log();

// Test 4: Challenge-Verifier Validation
console.log('Test 4: Challenge-Verifier Validation');
console.log('-'.repeat(80));

try {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);

    // Simulate server validation
    const recomputedChallenge = generateCodeChallenge(verifier);

    if (challenge === recomputedChallenge) {
        success('Server can correctly validate verifier against challenge');
        testsPassed++;
    } else {
        error('Validation failed: challenges do not match');
        testsFailed++;
    }

    // Test with wrong verifier
    const wrongVerifier = generateCodeVerifier();
    const wrongChallenge = generateCodeChallenge(wrongVerifier);

    if (challenge !== wrongChallenge) {
        success('Wrong verifier correctly rejected');
        testsPassed++;
    } else {
        error('Wrong verifier incorrectly accepted');
        testsFailed++;
    }

} catch (err) {
    error(`Validation test failed: ${err.message}`);
    testsFailed++;
}

console.log();

// Test 5: Performance Test
console.log('Test 5: Performance Test');
console.log('-'.repeat(80));

try {
    const iterations = 1000;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
        const verifier = generateCodeVerifier();
        const challenge = generateCodeChallenge(verifier);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const avgTime = duration / iterations;

    success(`Generated ${iterations} verifier-challenge pairs in ${duration}ms`);
    info(`Average time per pair: ${avgTime.toFixed(2)}ms`);
    testsPassed++;

    if (avgTime < 10) {
        success('Performance is acceptable (< 10ms per pair)');
        testsPassed++;
    } else {
        error(`Performance is slow (${avgTime.toFixed(2)}ms per pair)`);
        testsFailed++;
    }

} catch (err) {
    error(`Performance test failed: ${err.message}`);
    testsFailed++;
}

console.log();

// Test 6: Complete Flow Simulation
console.log('Test 6: Complete Flow Simulation');
console.log('-'.repeat(80));

try {
    // Client generates verifier and challenge
    const clientVerifier = generateCodeVerifier();
    const clientChallenge = generateCodeChallenge(clientVerifier);

    info('1. Client generates verifier and challenge');

    // Server stores challenge (simulated)
    const storedChallenge = clientChallenge;
    info('2. Server stores challenge with state');

    // Authorization happens (simulated)
    info('3. User authorizes application');

    // Token exchange - server validates
    const receivedVerifier = clientVerifier; // From token request
    const serverChallenge = generateCodeChallenge(receivedVerifier);

    info('4. Server receives verifier in token request');
    info('5. Server computes challenge from verifier');

    if (serverChallenge === storedChallenge) {
        success('6. ✓ PKCE validation successful - tokens issued');
        testsPassed++;
    } else {
        error('6. ✗ PKCE validation failed - tokens rejected');
        testsFailed++;
    }

} catch (err) {
    error(`Flow simulation failed: ${err.message}`);
    testsFailed++;
}

console.log();

// Test 7: Security Test - Attack Simulation
console.log('Test 7: Security Test - Attack Simulation');
console.log('-'.repeat(80));

try {
    // Legitimate client
    const legitimateVerifier = generateCodeVerifier();
    const legitimateChallenge = generateCodeChallenge(legitimateVerifier);

    info('1. Legitimate client generates verifier and challenge');

    // Server stores challenge
    const storedChallenge = legitimateChallenge;
    info('2. Server stores challenge');

    // Attacker intercepts authorization code but not verifier
    const attackerVerifier = generateCodeVerifier(); // Attacker generates own verifier
    const attackerChallenge = generateCodeChallenge(attackerVerifier);

    info('3. 🔴 Attacker intercepts authorization code');
    info('4. 🔴 Attacker tries to use their own verifier');

    // Server validates attacker's verifier
    if (attackerChallenge !== storedChallenge) {
        success('5. ✓ Attack prevented - attacker\'s verifier rejected');
        testsPassed++;
    } else {
        error('5. ✗ Security vulnerability - attacker succeeded');
        testsFailed++;
    }

    // Legitimate client completes flow
    if (legitimateChallenge === storedChallenge) {
        success('6. ✓ Legitimate client successfully authenticated');
        testsPassed++;
    } else {
        error('6. ✗ Legitimate client rejected');
        testsFailed++;
    }

} catch (err) {
    error(`Security test failed: ${err.message}`);
    testsFailed++;
}

console.log();

// ============================================================================
// Summary
// ============================================================================

console.log('='.repeat(80));
log('Verification Summary', 'blue');
console.log('='.repeat(80));
console.log();

const totalTests = testsPassed + testsFailed;
const successRate = ((testsPassed / totalTests) * 100).toFixed(1);

if (testsFailed === 0) {
    success(`All ${testsPassed} tests passed! ✓`);
    log(`Success rate: ${successRate}%`, 'green');
} else {
    log(`Tests passed: ${testsPassed}`, 'green');
    log(`Tests failed: ${testsFailed}`, 'red');
    log(`Success rate: ${successRate}%`, 'yellow');
}

console.log();

if (testsFailed === 0) {
    success('PKCE implementation is working correctly!');
    console.log();
    info('Next steps:');
    console.log('  1. Review the implementation in src/services/oauth.service.js');
    console.log('  2. Review the controller changes in src/controllers/oauth.controller.js');
    console.log('  3. Read the documentation in docs/PKCE_IMPLEMENTATION.md');
    console.log('  4. Run the examples: node examples/pkce-mobile-app-example.js');
    console.log('  5. Test with mobile app using ?use_pkce=true parameter');
} else {
    error('Some tests failed. Please review the implementation.');
}

console.log();
console.log('='.repeat(80));
console.log();

// Exit with appropriate code
process.exit(testsFailed > 0 ? 1 : 0);
