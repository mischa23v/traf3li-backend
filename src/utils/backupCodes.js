/**
 * Backup Codes Utility for MFA Recovery
 *
 * Generates, hashes, and verifies backup codes for multi-factor authentication recovery.
 * Backup codes are 8-character alphanumeric codes formatted as "ABCD-1234".
 *
 * Security:
 * - Codes are hashed with bcrypt before storage
 * - Each code can only be used once
 * - Codes are marked as used after verification
 */

const bcrypt = require('bcrypt');

// Salt rounds for bcrypt hashing - OWASP recommends minimum 10, we use 12 for better security
const SALT_ROUNDS = 12;

// Character set for backup codes (uppercase letters and numbers, excluding ambiguous characters)
// Excluded: 0, O, I, 1, L to avoid confusion
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate random backup codes
 *
 * @param {number} count - Number of backup codes to generate (default: 10)
 * @returns {string[]} - Array of backup codes in format "ABCD-1234"
 *
 * @example
 * const codes = generateBackupCodes(10);
 * // Returns: ['ABCD-1234', 'EFGH-5678', ...]
 */
const generateBackupCodes = (count = 10) => {
    const codes = [];

    for (let i = 0; i < count; i++) {
        // Generate 8 random characters
        let code = '';
        for (let j = 0; j < 8; j++) {
            const randomIndex = Math.floor(Math.random() * CHARSET.length);
            code += CHARSET[randomIndex];
        }

        // Format as ABCD-1234 (4 chars - 4 chars)
        const formattedCode = `${code.substring(0, 4)}-${code.substring(4, 8)}`;
        codes.push(formattedCode);
    }

    return codes;
};

/**
 * Hash a backup code using bcrypt
 *
 * @param {string} code - Backup code to hash
 * @returns {Promise<string>} - Hashed backup code
 *
 * @example
 * const hashed = await hashBackupCode('ABCD-1234');
 */
const hashBackupCode = async (code) => {
    // Remove any whitespace and convert to uppercase for consistency
    const normalizedCode = code.trim().toUpperCase();

    // Hash the code using bcrypt
    const hashedCode = await bcrypt.hash(normalizedCode, SALT_ROUNDS);

    return hashedCode;
};

/**
 * Verify a backup code against stored hashed codes and mark as used
 *
 * @param {string} code - Backup code to verify
 * @param {Array<Object>} hashedCodes - Array of backup code objects with {code: string, used: boolean}
 * @returns {Promise<Object>} - Verification result {valid: boolean, codeIndex: number|null}
 *
 * @example
 * const result = await verifyBackupCode('ABCD-1234', user.mfaBackupCodes);
 * if (result.valid) {
 *   // Code is valid and has been marked as used
 *   console.log('Backup code verified at index:', result.codeIndex);
 * }
 */
const verifyBackupCode = async (code, hashedCodes) => {
    // Normalize the input code
    const normalizedCode = code.trim().toUpperCase();

    // Try to match against each stored code
    for (let i = 0; i < hashedCodes.length; i++) {
        const storedCode = hashedCodes[i];

        // Skip if code has already been used
        if (storedCode.used) {
            continue;
        }

        // Compare the code with the stored hash
        const isMatch = await bcrypt.compare(normalizedCode, storedCode.code);

        if (isMatch) {
            return {
                valid: true,
                codeIndex: i
            };
        }
    }

    // No match found
    return {
        valid: false,
        codeIndex: null
    };
};

/**
 * Synchronously hash a backup code using bcrypt
 * Use this for initial generation when performance is not critical
 *
 * @param {string} code - Backup code to hash
 * @returns {string} - Hashed backup code
 *
 * @example
 * const hashed = hashBackupCodeSync('ABCD-1234');
 */
const hashBackupCodeSync = (code) => {
    // Remove any whitespace and convert to uppercase for consistency
    const normalizedCode = code.trim().toUpperCase();

    // Hash the code using bcrypt synchronously
    const hashedCode = bcrypt.hashSync(normalizedCode, SALT_ROUNDS);

    return hashedCode;
};

/**
 * Validate backup code format
 *
 * @param {string} code - Backup code to validate
 * @returns {boolean} - Whether the code format is valid
 *
 * @example
 * const isValid = validateBackupCodeFormat('ABCD-1234'); // true
 * const isInvalid = validateBackupCodeFormat('invalid'); // false
 */
const validateBackupCodeFormat = (code) => {
    if (!code || typeof code !== 'string') {
        return false;
    }

    // Remove whitespace and convert to uppercase
    const normalized = code.trim().toUpperCase();

    // Check format: XXXX-XXXX (8 characters + 1 hyphen)
    const formatRegex = /^[A-Z2-9]{4}-[A-Z2-9]{4}$/;
    return formatRegex.test(normalized);
};

module.exports = {
    generateBackupCodes,
    hashBackupCode,
    hashBackupCodeSync,
    verifyBackupCode,
    validateBackupCodeFormat
};
