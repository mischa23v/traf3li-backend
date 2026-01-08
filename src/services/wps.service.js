/**
 * Saudi Arabia Wage Protection System (WPS) Service
 * Generates WPS-compliant payroll files for Ministry of Human Resources (HRSD)
 *
 * File Format Specification:
 * - Currency: SAR only
 * - Date format: YYYYMMDD (Gregorian or Hijri)
 * - IBAN: 24 chars for local, 34 for international
 * - All amounts in Halalas (1 SAR = 100 Halalas)
 *
 * Reference: https://www.hrsd.gov.sa/sites/default/files/2017-06/WPS%20Wages%20File%20Technical%20Specification.pdf
 */

const { GOSI_RATES } = require('../constants/gosi.constants');

// SARIE Bank IDs for Saudi Banks
const SARIE_BANK_IDS = {
    'SABB': '45',      // Saudi British Bank
    'SAMB': '55',      // Samba Financial Group (now SNB)
    'RIBL': '20',      // Riyad Bank
    'RAJH': '80',      // Al Rajhi Bank
    'BNPA': '10',      // Saudi National Bank (SNB)
    'NCBK': '10',      // National Commercial Bank (now SNB)
    'ALBI': '70',      // Bank Albilad
    'BJAZ': '60',      // Bank AlJazira
    'ALIN': '05',      // Alinma Bank
    'ARNB': '65',      // Arab National Bank
    'BSFR': '50',      // Banque Saudi Fransi
    'GULB': '75',      // Gulf International Bank
    'FRAB': '30',      // First Abu Dhabi Bank (KSA)
    'KSAB': '85',      // Bank of China (KSA branch)
    'BCSA': '15',      // BNP Paribas (KSA branch)
    'SIBL': '25',      // Saudi Investment Bank
    'CIBS': '90',      // Citibank KSA
    'EGBE': '35',      // Emirates NBD (KSA)
    'MUSD': '95',      // Muscat Bank
};

// Get SARIE ID from IBAN
function getSarieIdFromIban(iban) {
    if (!iban || iban.length < 6) return null;
    const bankCode = iban.substring(4, 6);

    // Map bank code to SARIE ID
    const ibanBankCodes = {
        '45': '45', '55': '55', '20': '20', '80': '80', '10': '10',
        '70': '70', '60': '60', '05': '05', '65': '65', '50': '50',
        '75': '75', '30': '30', '85': '85', '15': '15', '25': '25',
        '90': '90', '35': '35', '95': '95'
    };

    return ibanBankCodes[bankCode] || bankCode;
}

/**
 * Validate Saudi IBAN with ISO 7064 Mod 97 checksum
 * @param {string} iban - IBAN to validate
 * @returns {Object} { valid: boolean, message?: string, bankCode?: string }
 */
function validateIBANChecksum(iban) {
    if (!iban) return { valid: false, message: 'IBAN is required' };

    // Normalize
    const normalizedIban = iban.toUpperCase().replace(/\s/g, '');

    // Check format
    if (!/^SA\d{22}$/.test(normalizedIban)) {
        return { valid: false, message: 'Invalid format. Saudi IBAN: SA + 22 digits' };
    }

    // ISO 7064 Mod 97 checksum
    const rearranged = normalizedIban.slice(4) + normalizedIban.slice(0, 4);

    let numericString = '';
    for (const char of rearranged) {
        if (char >= 'A' && char <= 'Z') {
            numericString += (char.charCodeAt(0) - 55).toString();
        } else {
            numericString += char;
        }
    }

    let remainder = 0;
    for (let i = 0; i < numericString.length; i += 7) {
        const chunk = remainder.toString() + numericString.slice(i, i + 7);
        remainder = parseInt(chunk, 10) % 97;
    }

    if (remainder !== 1) {
        return { valid: false, message: 'IBAN checksum invalid', checksumError: true };
    }

    return {
        valid: true,
        bankCode: normalizedIban.slice(4, 6),
        normalized: normalizedIban
    };
}

/**
 * Validate Saudi National ID or Iqama with Luhn algorithm
 * Saudi ID: starts with "1", 10 digits
 * Iqama: starts with "2", 10 digits
 * GCC ID: variable format (not validated with Luhn - marked as 'gcc_id')
 * Passport: alphanumeric (not validated with Luhn - marked as 'passport')
 *
 * The Saudi variant of Luhn:
 * - For each digit from left to right (excluding the last check digit)
 * - Multiply odd positions (1st, 3rd, 5th...) by 2
 * - If result >= 10, subtract 9
 * - Sum all digits
 * - The check digit makes (sum % 10) == 0
 *
 * @param {string} id - National ID or Iqama number
 * @param {string} idType - Optional: 'saudi_id', 'iqama', 'gcc_id', 'passport'
 * @returns {Object} { valid: boolean, type?: string, message?: string }
 */
function validateSaudiNationalId(id, idType = null) {
    if (!id) {
        return {
            valid: false,
            message: 'رقم الهوية مطلوب / National ID or Iqama is required'
        };
    }

    // Normalize - remove spaces and dashes
    const normalizedId = id.toString().replace(/[\s-]/g, '');

    // Handle passport - alphanumeric, no Luhn validation
    if (idType === 'passport' || /[A-Za-z]/.test(normalizedId)) {
        if (normalizedId.length < 5 || normalizedId.length > 20) {
            return {
                valid: false,
                type: 'passport',
                message: 'رقم الجواز غير صالح (5-20 حرف) / Invalid passport number (5-20 characters)'
            };
        }
        return {
            valid: true,
            type: 'passport',
            normalized: normalizedId.toUpperCase(),
            typeLabel: 'جواز سفر / Passport'
        };
    }

    // Handle GCC ID - numeric but not Saudi format
    if (idType === 'gcc_id' || (normalizedId.length > 0 && !/^[12]/.test(normalizedId) && /^\d+$/.test(normalizedId))) {
        if (normalizedId.length < 8 || normalizedId.length > 15) {
            return {
                valid: false,
                type: 'gcc_id',
                message: 'رقم هوية مواطني الخليج غير صالح (8-15 رقم) / Invalid GCC ID (8-15 digits)'
            };
        }
        return {
            valid: true,
            type: 'gcc_id',
            normalized: normalizedId,
            typeLabel: 'هوية خليجية / GCC ID'
        };
    }

    // Standard Saudi ID / Iqama validation
    // Check format: 10 digits starting with 1 or 2
    if (!/^[12]\d{9}$/.test(normalizedId)) {
        if (normalizedId.length !== 10) {
            return {
                valid: false,
                message: 'رقم الهوية يجب أن يكون 10 أرقام / ID must be exactly 10 digits'
            };
        }
        if (!/^[12]/.test(normalizedId)) {
            return {
                valid: false,
                message: 'رقم الهوية يجب أن يبدأ بـ 1 (مواطن) أو 2 (مقيم) / ID must start with 1 (Saudi) or 2 (Iqama)'
            };
        }
        return {
            valid: false,
            message: 'رقم الهوية يحتوي على أحرف غير صالحة / ID contains invalid characters'
        };
    }

    // Determine type
    const detectedType = normalizedId.charAt(0) === '1' ? 'saudi_id' : 'iqama';

    // Luhn algorithm (Saudi variant)
    // Odd positions (1st, 3rd, 5th...) are doubled
    let sum = 0;
    for (let i = 0; i < normalizedId.length; i++) {
        let digit = parseInt(normalizedId.charAt(i), 10);

        // Saudi variant: multiply odd positions (1-indexed, so even indices)
        if (i % 2 === 0) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
    }

    // Valid if sum is divisible by 10
    if (sum % 10 !== 0) {
        return {
            valid: false,
            type: detectedType,
            message: detectedType === 'saudi_id'
                ? 'رقم الهوية الوطنية غير صالح - خطأ في رقم التحقق / Invalid Saudi ID - checksum error'
                : 'رقم الإقامة غير صالح - خطأ في رقم التحقق / Invalid Iqama - checksum error',
            checksumError: true
        };
    }

    return {
        valid: true,
        type: detectedType,
        normalized: normalizedId,
        typeLabel: detectedType === 'saudi_id' ? 'هوية وطنية / Saudi National ID' : 'إقامة / Iqama'
    };
}

/**
 * Validate Iqama expiry date
 * @param {Date|string} expiryDate - Iqama expiry date
 * @returns {Object} { valid: boolean, daysRemaining?: number, warning?: string, expired?: boolean }
 */
function validateIqamaExpiry(expiryDate) {
    if (!expiryDate) {
        return {
            valid: false,
            message: 'تاريخ انتهاء الإقامة مطلوب / Iqama expiry date is required'
        };
    }

    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime())) {
        return {
            valid: false,
            message: 'تاريخ انتهاء الإقامة غير صالح / Invalid expiry date format'
        };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Expired
    if (daysRemaining < 0) {
        return {
            valid: false,
            expired: true,
            daysRemaining,
            message: `الإقامة منتهية منذ ${Math.abs(daysRemaining)} يوم / Iqama expired ${Math.abs(daysRemaining)} days ago`
        };
    }

    // Expiring within 30 days - critical warning
    if (daysRemaining <= 30) {
        return {
            valid: true,
            daysRemaining,
            warning: 'critical',
            message: `تنبيه عاجل: الإقامة تنتهي خلال ${daysRemaining} يوم / URGENT: Iqama expires in ${daysRemaining} days`
        };
    }

    // Expiring within 90 days - warning
    if (daysRemaining <= 90) {
        return {
            valid: true,
            daysRemaining,
            warning: 'moderate',
            message: `تنبيه: الإقامة تنتهي خلال ${daysRemaining} يوم / Warning: Iqama expires in ${daysRemaining} days`
        };
    }

    return {
        valid: true,
        daysRemaining,
        message: `الإقامة صالحة لـ ${daysRemaining} يوم / Iqama valid for ${daysRemaining} days`
    };
}

class WPSService {
    /**
     * Generate WPS file header record
     * @param {Object} establishment - Company/establishment details
     * @param {Object} paymentDetails - Payment batch details
     */
    generateHeader(establishment, paymentDetails) {
        const header = {
            // Record type identifier
            recordType: 'HDR',
            // MOL (Ministry of Labor) establishment ID - 10 digits
            molEstablishmentId: this.padNumber(establishment.molId, 10),
            // Establishment bank IBAN - 24 characters
            establishmentIban: establishment.iban.toUpperCase().padEnd(24, ' '),
            // SARIE ID of establishment's bank
            establishmentBankId: getSarieIdFromIban(establishment.iban),
            // Payment date YYYYMMDD
            paymentDate: this.formatDate(paymentDetails.paymentDate),
            // File creation date YYYYMMDD
            fileCreationDate: this.formatDate(new Date()),
            // File creation time HHMMSS
            fileCreationTime: this.formatTime(new Date()),
            // Total number of employee records
            totalRecords: this.padNumber(paymentDetails.totalRecords, 6),
            // Total amount in Halalas
            totalAmount: this.padNumber(paymentDetails.totalAmount, 15),
            // Currency code - always SAR
            currency: 'SAR',
            // Batch reference number
            batchReference: paymentDetails.batchReference.substring(0, 16).padEnd(16, ' '),
            // File sequence number for the day
            fileSequence: this.padNumber(paymentDetails.fileSequence || 1, 4),
        };

        return this.formatHeaderLine(header);
    }

    /**
     * Generate employee salary record
     * @param {Object} employee - Employee details
     * @param {Object} salary - Salary breakdown
     */
    generateEmployeeRecord(employee, salary) {
        const record = {
            // Record type
            recordType: 'DTL',
            // Employee MOL ID - 10 digits (National ID or Iqama number)
            employeeMolId: this.padNumber(employee.molId || employee.nationalId, 10),
            // Employee ID type: 1 = Saudi National ID, 2 = Iqama
            idType: employee.nationality === 'SA' ? '1' : '2',
            // Employee name - 50 characters (Arabic or English)
            employeeName: employee.name.substring(0, 50).padEnd(50, ' '),
            // Employee bank IBAN - 24 characters
            employeeIban: employee.iban.toUpperCase().padEnd(24, ' '),
            // SARIE ID of employee's bank
            employeeBankId: getSarieIdFromIban(employee.iban),
            // Salary components (all in Halalas)
            basicSalary: this.padNumber(Math.round(salary.basic * 100), 12),
            housingAllowance: this.padNumber(Math.round((salary.housing || 0) * 100), 12),
            otherEarnings: this.padNumber(Math.round((salary.otherEarnings || 0) * 100), 12),
            deductions: this.padNumber(Math.round((salary.deductions || 0) * 100), 12),
            // Net salary = Basic + Housing + Other Earnings - Deductions
            netSalary: this.padNumber(Math.round(salary.netSalary * 100), 15),
            // Payment month YYYYMM
            paymentMonth: this.formatMonth(salary.paymentMonth || new Date()),
            // Leave days (unpaid leave)
            leaveDays: this.padNumber(salary.leaveDays || 0, 3),
            // Working days
            workingDays: this.padNumber(salary.workingDays || 30, 3),
        };

        return this.formatDetailLine(record);
    }

    /**
     * Generate WPS file trailer/footer record
     */
    generateTrailer(totalRecords, totalAmount, hashTotal) {
        const trailer = {
            recordType: 'TRL',
            totalRecords: this.padNumber(totalRecords, 6),
            totalAmount: this.padNumber(totalAmount, 15),
            hashTotal: this.padNumber(hashTotal, 20),
        };

        return this.formatTrailerLine(trailer);
    }

    /**
     * Generate complete WPS file
     * @param {Object} establishment - Company details
     * @param {Array} employees - List of employees with salary data
     * @param {Object} options - File generation options
     */
    generateWPSFile(establishment, employees, options = {}) {
        const lines = [];
        let totalAmount = 0;
        let hashTotal = 0;

        // Calculate totals
        employees.forEach(emp => {
            totalAmount += Math.round(emp.salary.netSalary * 100);
            // Hash total is sum of all employee MOL IDs (for validation)
            hashTotal += parseInt(emp.molId || emp.nationalId) || 0;
        });

        const paymentDetails = {
            paymentDate: options.paymentDate || new Date(),
            totalRecords: employees.length,
            totalAmount: totalAmount,
            batchReference: options.batchReference || `WPS${Date.now()}`,
            fileSequence: options.fileSequence || 1,
        };

        // Generate header
        lines.push(this.generateHeader(establishment, paymentDetails));

        // Generate employee records
        employees.forEach(emp => {
            lines.push(this.generateEmployeeRecord(emp, emp.salary));
        });

        // Generate trailer
        lines.push(this.generateTrailer(employees.length, totalAmount, hashTotal));

        return {
            content: lines.join('\n'),
            filename: this.generateFilename(establishment.molId, options.paymentDate),
            totalRecords: employees.length,
            totalAmount: totalAmount / 100, // Convert back to SAR
            batchReference: paymentDetails.batchReference,
        };
    }

    /**
     * Validate employee data before file generation
     * Includes ISO 7064 Mod 97 IBAN checksum and Saudi National ID Luhn validation
     * Banks reject files with: duplicate IDs, invalid checksums, format violations
     */
    validateEmployeeData(employees) {
        const errors = [];
        const warnings = [];
        const iqamaExpiryWarnings = [];

        // Track duplicates (banks reject files with duplicate employee IDs)
        const seenIds = new Set();
        const seenIbans = new Set();
        let hashTotal = 0; // Sum of all MOL IDs for hash verification

        employees.forEach((emp, index) => {
            const empLabel = `Employee ${index + 1} (${emp.name || 'Unknown'})`;

            // ═══════════════════════════════════════════════════════════════
            // NAME VALIDATION (WPS requires max 50 characters)
            // ═══════════════════════════════════════════════════════════════
            if (!emp.name || emp.name.trim().length === 0) {
                errors.push(`${empLabel}: اسم الموظف مطلوب / Employee name is required.`);
            } else if (emp.name.length > 50) {
                warnings.push(`${empLabel}: الاسم سيتم اختصاره إلى 50 حرف / Name will be truncated to 50 characters.`);
            }

            // ═══════════════════════════════════════════════════════════════
            // IBAN VALIDATION (Banks reject invalid checksums)
            // ═══════════════════════════════════════════════════════════════
            if (!emp.iban) {
                errors.push(`${empLabel}: رقم IBAN مطلوب / IBAN is required.`);
            } else {
                const ibanValidation = validateIBANChecksum(emp.iban);
                if (!ibanValidation.valid) {
                    if (ibanValidation.checksumError) {
                        errors.push(`${empLabel}: رقم IBAN غير صالح - فشل التحقق من الرقم / IBAN checksum invalid.`);
                    } else {
                        errors.push(`${empLabel}: ${ibanValidation.message}`);
                    }
                } else {
                    // Check for duplicate IBANs (same account for multiple employees)
                    const normalizedIban = ibanValidation.normalized;
                    if (seenIbans.has(normalizedIban)) {
                        warnings.push(`${empLabel}: رقم IBAN مكرر - قد يتم رفضه من البنك / Duplicate IBAN - may be rejected by bank.`);
                    }
                    seenIbans.add(normalizedIban);
                }
            }

            // ═══════════════════════════════════════════════════════════════
            // NATIONAL ID / MOL ID VALIDATION (Luhn checksum + duplicate check)
            // ═══════════════════════════════════════════════════════════════
            const nationalId = emp.molId || emp.nationalId;
            const nationalIdType = emp.nationalIdType || emp.idType; // Support both field names
            if (!nationalId) {
                errors.push(`${empLabel}: رقم الهوية أو رقم وزارة العمل مطلوب / Missing MOL ID or National ID.`);
            } else {
                const idValidation = validateSaudiNationalId(nationalId, nationalIdType);
                if (!idValidation.valid) {
                    errors.push(`${empLabel}: ${idValidation.message}`);
                } else {
                    // Check for duplicate IDs (CRITICAL: banks reject files with duplicate MOL IDs)
                    const normalizedNationalId = idValidation.normalized || nationalId.toString();
                    if (seenIds.has(normalizedNationalId)) {
                        errors.push(`${empLabel}: رقم الهوية مكرر - سيتم رفض الملف / Duplicate ID - file will be rejected by bank.`);
                    }
                    seenIds.add(normalizedNationalId);

                    // Add to hash total (banks verify this checksum)
                    const numericId = parseInt(normalizedNationalId.replace(/\D/g, ''), 10);
                    if (!isNaN(numericId)) {
                        hashTotal += numericId;
                    }

                    // Validate ID type matches nationality (only for Saudi ID and Iqama)
                    if (idValidation.type === 'saudi_id' || idValidation.type === 'iqama') {
                        if (emp.nationality === 'SA' && idValidation.type === 'iqama') {
                            warnings.push(`${empLabel}: موظف سعودي لكن رقم الهوية إقامة / Saudi employee has Iqama number instead of National ID.`);
                        } else if (emp.nationality !== 'SA' && idValidation.type === 'saudi_id') {
                            warnings.push(`${empLabel}: موظف غير سعودي لكن رقم الهوية سعودية / Non-Saudi employee has Saudi National ID.`);
                        }
                    }
                }

                // Validate Iqama/ID expiry for non-Saudi employees or Iqama holders
                const requiresExpiryCheck = emp.nationality !== 'SA' ||
                    (idValidation && idValidation.type === 'iqama') ||
                    (idValidation && idValidation.type === 'gcc_id') ||
                    (idValidation && idValidation.type === 'passport');

                if (requiresExpiryCheck) {
                    if (emp.iqamaExpiry || emp.nationalIdExpiry) {
                        const expiryValidation = validateIqamaExpiry(emp.iqamaExpiry || emp.nationalIdExpiry);
                        if (!expiryValidation.valid) {
                            errors.push(`${empLabel}: ${expiryValidation.message}`);
                        } else if (expiryValidation.warning === 'critical') {
                            iqamaExpiryWarnings.push(`${empLabel}: ${expiryValidation.message}`);
                        } else if (expiryValidation.warning === 'moderate') {
                            warnings.push(`${empLabel}: ${expiryValidation.message}`);
                        }
                    } else {
                        warnings.push(`${empLabel}: تاريخ انتهاء الإقامة/الجواز غير محدد / ID/Passport expiry date not specified.`);
                    }
                }
            }

            // Validate salary
            if (!emp.salary || emp.salary.netSalary <= 0) {
                errors.push(`${empLabel}: صافي الراتب غير صالح / Invalid net salary.`);
            }

            // GOSI validation using centralized rates from constants
            if (emp.salary && emp.salary.basic) {
                const isSaudi = emp.nationality === 'SA';
                const rates = isSaudi ? GOSI_RATES.SAUDI : GOSI_RATES.NON_SAUDI;
                const cappedSalary = Math.min(emp.salary.basic, GOSI_RATES.MAX_CONTRIBUTION_BASE);
                const expectedGosi = Math.round(cappedSalary * rates.employee);

                if (emp.salary.gosiDeduction !== undefined && Math.abs(emp.salary.gosiDeduction - expectedGosi) > 1) {
                    warnings.push(`${empLabel}: حسم التأمينات قد يكون غير صحيح (المتوقع: ${expectedGosi} ريال) / GOSI deduction may be incorrect (expected: ${expectedGosi} SAR).`);
                }
            }

            // Minimum wage validation using centralized constants
            if (emp.nationality === 'SA' && emp.salary && emp.salary.basic < GOSI_RATES.MINIMUM_WAGE_SAUDI) {
                warnings.push(`${empLabel}: الراتب الأساسي أقل من الحد الأدنى (${GOSI_RATES.MINIMUM_WAGE_SAUDI} ريال) / Basic salary below minimum wage (${GOSI_RATES.MINIMUM_WAGE_SAUDI} SAR).`);
            }
        });

        // Add critical Iqama expiry warnings at the top
        if (iqamaExpiryWarnings.length > 0) {
            warnings.unshift(...iqamaExpiryWarnings);
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            // Metadata for WPS file generation and verification
            metadata: {
                totalEmployees: employees.length,
                uniqueIds: seenIds.size,
                uniqueIbans: seenIbans.size,
                hashTotal, // Banks verify this against file trailer
                hasDuplicateIds: seenIds.size !== employees.length,
                hasDuplicateIbans: seenIbans.size !== employees.length
            }
        };
    }

    /**
     * Validate establishment data
     * Includes ISO 7064 Mod 97 IBAN checksum validation
     */
    validateEstablishmentData(establishment) {
        const errors = [];

        if (!establishment.molId || establishment.molId.length < 10) {
            errors.push('رقم منشأة وزارة العمل غير صالح. يجب أن يكون 10 أرقام على الأقل / Invalid MOL Establishment ID. Must be at least 10 digits.');
        }

        // Validate establishment IBAN with checksum
        if (!establishment.iban) {
            errors.push('رقم IBAN المنشأة مطلوب / Establishment IBAN is required.');
        } else {
            const ibanValidation = validateIBANChecksum(establishment.iban);
            if (!ibanValidation.valid) {
                if (ibanValidation.checksumError) {
                    errors.push('رقم IBAN المنشأة غير صالح - فشل التحقق من الرقم / Establishment IBAN checksum invalid.');
                } else {
                    errors.push(`رقم IBAN المنشأة: ${ibanValidation.message} / Establishment IBAN: ${ibanValidation.message}`);
                }
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Parse WPS response file from bank
     * Banks return this file after processing
     */
    parseWPSResponseFile(fileContent) {
        const lines = fileContent.split('\n').filter(line => line.trim());
        const results = {
            header: null,
            records: [],
            trailer: null,
            successful: [],
            failed: [],
        };

        lines.forEach(line => {
            const recordType = line.substring(0, 3);

            if (recordType === 'HDR') {
                results.header = this.parseHeaderLine(line);
            } else if (recordType === 'DTL') {
                const record = this.parseDetailLine(line);
                results.records.push(record);

                if (record.status === 'SUCCESS' || record.status === '00') {
                    results.successful.push(record);
                } else {
                    results.failed.push(record);
                }
            } else if (recordType === 'TRL') {
                results.trailer = this.parseTrailerLine(line);
            }
        });

        return results;
    }

    // Helper methods
    padNumber(num, length) {
        return String(num).padStart(length, '0');
    }

    formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }

    formatTime(date) {
        const d = new Date(date);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return `${hours}${minutes}${seconds}`;
    }

    formatMonth(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}${month}`;
    }

    generateFilename(molId, paymentDate) {
        const date = this.formatDate(paymentDate || new Date());
        return `WPS_${molId}_${date}.txt`;
    }

    formatHeaderLine(header) {
        return [
            header.recordType,
            header.molEstablishmentId,
            header.establishmentIban,
            header.establishmentBankId,
            header.paymentDate,
            header.fileCreationDate,
            header.fileCreationTime,
            header.totalRecords,
            header.totalAmount,
            header.currency,
            header.batchReference,
            header.fileSequence,
        ].join('|');
    }

    formatDetailLine(record) {
        return [
            record.recordType,
            record.employeeMolId,
            record.idType,
            record.employeeName,
            record.employeeIban,
            record.employeeBankId,
            record.basicSalary,
            record.housingAllowance,
            record.otherEarnings,
            record.deductions,
            record.netSalary,
            record.paymentMonth,
            record.leaveDays,
            record.workingDays,
        ].join('|');
    }

    formatTrailerLine(trailer) {
        return [
            trailer.recordType,
            trailer.totalRecords,
            trailer.totalAmount,
            trailer.hashTotal,
        ].join('|');
    }

    parseHeaderLine(line) {
        const parts = line.split('|');
        return {
            recordType: parts[0],
            molEstablishmentId: parts[1],
            establishmentIban: parts[2],
            paymentDate: parts[4],
            totalRecords: parseInt(parts[7]),
            totalAmount: parseInt(parts[8]) / 100,
        };
    }

    parseDetailLine(line) {
        const parts = line.split('|');
        return {
            recordType: parts[0],
            employeeMolId: parts[1],
            employeeName: parts[3]?.trim(),
            employeeIban: parts[4],
            netSalary: parseInt(parts[10]) / 100,
            status: parts[14] || 'PENDING',
            errorCode: parts[15],
            errorMessage: parts[16],
        };
    }

    parseTrailerLine(line) {
        const parts = line.split('|');
        return {
            recordType: parts[0],
            totalRecords: parseInt(parts[1]),
            totalAmount: parseInt(parts[2]) / 100,
        };
    }
}

/**
 * Validate file content encoding for WPS submission
 * Saudi banks accept: Windows-1256 (Arabic), UTF-8, or ASCII
 * @param {string} content - File content to validate
 * @returns {Object} { valid: boolean, encoding: string, issues: string[] }
 */
function validateFileEncoding(content) {
    const issues = [];
    let encoding = 'UTF-8';

    // Handle empty or invalid content
    if (!content || typeof content !== 'string') {
        return {
            valid: false,
            encoding: 'UNKNOWN',
            hasArabic: false,
            lineEnding: 'NONE',
            issues: ['الملف فارغ أو غير صالح / File is empty or invalid']
        };
    }

    // Check for null bytes (indicates binary or corrupt file)
    if (content.includes('\0')) {
        issues.push('الملف يحتوي على بايتات غير صالحة / File contains null bytes - may be binary or corrupt');
        return { valid: false, encoding: 'UNKNOWN', issues };
    }

    // Check for BOM markers
    if (content.charCodeAt(0) === 0xFEFF) {
        encoding = 'UTF-8-BOM';
        issues.push('الملف يحتوي على BOM - قد لا يتم قبوله / File has BOM marker - may not be accepted by some banks');
    }

    // Check line endings - WPS typically expects Windows-style (CRLF)
    const hasCRLF = content.includes('\r\n');
    const hasLF = content.includes('\n') && !content.includes('\r\n');
    const hasCR = content.includes('\r') && !content.includes('\r\n');

    if (hasLF && !hasCRLF) {
        issues.push('تحذير: الملف يستخدم نهاية أسطر Unix - قد تحتاج إلى تحويله / Warning: File uses Unix line endings (LF) - may need conversion to CRLF');
    }
    if (hasCR && !hasCRLF) {
        issues.push('تحذير: الملف يستخدم نهاية أسطر Mac القديمة / Warning: File uses old Mac line endings (CR)');
    }

    // Check for problematic characters that may not display correctly
    const arabicPattern = /[\u0600-\u06FF]/;
    const hasArabic = arabicPattern.test(content);

    // Check for mixed Arabic/English without proper Unicode handling
    if (hasArabic) {
        encoding = 'UTF-8 (Arabic)';
        // Check for common encoding issues with Arabic
        const brokenArabic = /[\uFFFD\uFFFE\uFFFF]/;
        if (brokenArabic.test(content)) {
            issues.push('الملف يحتوي على أحرف عربية تالفة - تحقق من الترميز / File contains broken Arabic characters - check encoding');
        }
    }

    // Check field separators - WPS uses pipe (|) delimiters
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    if (lines.length > 0) {
        const firstLine = lines[0];
        if (!firstLine.includes('|')) {
            issues.push('تنسيق الملف غير صحيح - يجب أن يستخدم فاصل | / Invalid file format - must use pipe (|) delimiter');
        }
    }

    return {
        valid: issues.filter(i => !i.includes('تحذير') && !i.includes('Warning')).length === 0,
        encoding,
        hasArabic,
        lineEnding: hasCRLF ? 'CRLF' : hasLF ? 'LF' : hasCR ? 'CR' : 'MIXED',
        issues
    };
}

/**
 * Get WPS and GOSI compliance deadlines for current month
 * WPS: 10th of following month
 * GOSI: 15th of following month
 * @param {Date} referenceDate - Reference date (defaults to today)
 * @returns {Object} { wps: {...}, gosi: {...}, currentMonth: {...} }
 */
function getComplianceDeadlines(referenceDate = new Date()) {
    const today = new Date(referenceDate);
    today.setHours(0, 0, 0, 0);

    // Get last day of current month
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // WPS deadline: 10th of following month
    const wpsDeadline = new Date(currentYear, currentMonth + 1, 10);
    const wpsDeadlineDays = Math.ceil((wpsDeadline - today) / (1000 * 60 * 60 * 24));

    // GOSI deadline: 15th of following month
    const gosiDeadline = new Date(currentYear, currentMonth + 1, 15);
    const gosiDeadlineDays = Math.ceil((gosiDeadline - today) / (1000 * 60 * 60 * 24));

    // Determine urgency levels
    const getUrgency = (days) => {
        if (days < 0) return 'overdue';
        if (days <= 3) return 'critical';
        if (days <= 7) return 'urgent';
        if (days <= 14) return 'soon';
        return 'normal';
    };

    // Format deadline messages
    const formatDeadlineMessage = (days, type) => {
        const typeAr = type === 'WPS' ? 'حماية الأجور' : 'التأمينات';
        if (days < 0) {
            return `⚠️ تأخرت ${Math.abs(days)} يوم عن موعد ${typeAr} / ${type} is ${Math.abs(days)} days OVERDUE`;
        }
        if (days === 0) {
            return `🔴 آخر يوم لـ ${typeAr} اليوم / ${type} deadline is TODAY`;
        }
        if (days === 1) {
            return `🔴 آخر يوم لـ ${typeAr} غداً / ${type} deadline is TOMORROW`;
        }
        if (days <= 3) {
            return `🟠 متبقي ${days} أيام لموعد ${typeAr} / ${days} days until ${type} deadline`;
        }
        if (days <= 7) {
            return `🟡 متبقي ${days} أيام لموعد ${typeAr} / ${days} days until ${type} deadline`;
        }
        return `🟢 متبقي ${days} يوم لموعد ${typeAr} / ${days} days until ${type} deadline`;
    };

    // Month names in Arabic and English
    const monthNames = {
        ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
        en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    };

    return {
        wps: {
            deadline: wpsDeadline,
            daysRemaining: wpsDeadlineDays,
            urgency: getUrgency(wpsDeadlineDays),
            message: formatDeadlineMessage(wpsDeadlineDays, 'WPS'),
            description: 'موعد رفع ملف حماية الأجور / Wage Protection System file upload deadline',
            penalty: 'غرامة 10,000 ريال + توقف خدمات المنشأة / 10,000 SAR fine + establishment services suspended'
        },
        gosi: {
            deadline: gosiDeadline,
            daysRemaining: gosiDeadlineDays,
            urgency: getUrgency(gosiDeadlineDays),
            message: formatDeadlineMessage(gosiDeadlineDays, 'GOSI'),
            description: 'موعد سداد التأمينات الاجتماعية / Social Insurance payment deadline',
            penalty: 'غرامة 2% شهرياً على المبلغ المتأخر / 2% monthly penalty on overdue amount'
        },
        currentMonth: {
            year: currentYear,
            month: currentMonth,
            nameAr: monthNames.ar[currentMonth],
            nameEn: monthNames.en[currentMonth],
            payrollPeriod: `${monthNames.en[currentMonth]} ${currentYear}`
        },
        today: today,
        summary: {
            mostUrgent: wpsDeadlineDays < gosiDeadlineDays ? 'WPS' : 'GOSI',
            daysToNextDeadline: Math.min(wpsDeadlineDays, gosiDeadlineDays),
            hasOverdue: wpsDeadlineDays < 0 || gosiDeadlineDays < 0,
            hasCritical: wpsDeadlineDays <= 3 || gosiDeadlineDays <= 3
        }
    };
}

// Export constants for use in other modules
module.exports = {
    WPSService: new WPSService(),
    SARIE_BANK_IDS,
    getSarieIdFromIban,
    validateIBANChecksum,
    validateSaudiNationalId,
    validateIqamaExpiry,
    validateFileEncoding,
    getComplianceDeadlines,
};
