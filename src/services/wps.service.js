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
     * Includes ISO 7064 Mod 97 IBAN checksum validation
     */
    validateEmployeeData(employees) {
        const errors = [];
        const warnings = [];

        employees.forEach((emp, index) => {
            const empLabel = `Employee ${index + 1} (${emp.name || 'Unknown'})`;

            // Validate IBAN with full checksum validation
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
                }
            }

            // Validate MOL ID / National ID
            if (!emp.molId && !emp.nationalId) {
                errors.push(`${empLabel}: رقم الهوية أو رقم وزارة العمل مطلوب / Missing MOL ID or National ID.`);
            }

            // Validate salary
            if (!emp.salary || emp.salary.netSalary <= 0) {
                errors.push(`${empLabel}: صافي الراتب غير صالح / Invalid net salary.`);
            }

            // GOSI validation
            if (emp.nationality === 'SA' && emp.salary && emp.salary.basic) {
                const expectedGosi = emp.salary.basic * 0.0975; // 9.75% for Saudi employee
                if (emp.salary.gosiDeduction !== undefined && Math.abs(emp.salary.gosiDeduction - expectedGosi) > 1) {
                    warnings.push(`${empLabel}: حسم التأمينات قد يكون غير صحيح / GOSI deduction may be incorrect.`);
                }
            }

            // Minimum wage validation (currently 4000 SAR for Saudis)
            if (emp.nationality === 'SA' && emp.salary && emp.salary.basic < 4000) {
                warnings.push(`${empLabel}: الراتب الأساسي أقل من الحد الأدنى (4000 ريال) / Basic salary below minimum wage (4000 SAR).`);
            }
        });

        return { valid: errors.length === 0, errors, warnings };
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

// Export constants for use in other modules
module.exports = {
    WPSService: new WPSService(),
    SARIE_BANK_IDS,
    getSarieIdFromIban,
    validateIBANChecksum,
};
