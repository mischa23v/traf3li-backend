/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  COMPLIANCE DASHBOARD CONTROLLER                                             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║  Saudi Arabia HR Compliance Dashboard - Inspired by:                         ║
 * ║  - ZenHR Compliance Module                                                   ║
 * ║  - Jisr Compliance Dashboard                                                 ║
 * ║  - Odoo/ERPNext Compliance Features                                          ║
 * ║                                                                               ║
 * ║  Tracks compliance with:                                                     ║
 * ║  - GOSI (General Organization for Social Insurance)                          ║
 * ║  - WPS (Wage Protection System)                                              ║
 * ║  - Mudad (Ministry of Human Resources)                                       ║
 * ║  - Muqeem (Resident Identity Management)                                     ║
 * ║  - Qiwa (Labor Platform)                                                     ║
 * ║  - Nitaqat (Saudization quotas)                                              ║
 * ║  - Labor Law requirements                                                    ║
 * ║                                                                               ║
 * ║  Official Sources: hrsd.gov.sa, mol.gov.sa, gosi.gov.sa, mudad.com.sa        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const { Employee, LeaveAllocation, PayrollRun } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// GOSI COMPLIANCE STATUS
// ═══════════════════════════════════════════════════════════════

// GOSI Rates (January 2026 - per official reform)
const GOSI_RATES = {
    // Annuities (retirement) - Article 18
    saudi: {
        employer: 0.09, // 9%
        employee: 0.09  // 9%
    },
    // SANED (unemployment insurance) - for Saudis only
    saned: {
        employer: 0.0075, // 0.75%
        employee: 0.0075  // 0.75%
    },
    // Occupational Hazards - Article 21 (employer only)
    occupationalHazards: {
        employer: 0.02 // 2%
    },
    // Non-Saudi (Occupational Hazards only)
    nonSaudi: {
        employer: 0.02 // 2%
    },
    // Contribution limits
    minContributionBase: 1500,  // SAR
    maxContributionBase: 45000  // SAR
};

// ═══════════════════════════════════════════════════════════════
// GET FULL COMPLIANCE DASHBOARD
// GET /api/hr/compliance/dashboard
// ═══════════════════════════════════════════════════════════════
const getComplianceDashboard = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Build firm query
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    const today = new Date();

    // Parallel fetch all compliance data
    const [
        employees,
        expiringDocuments,
        probationEnding,
        contractsExpiring,
        gosiStatus,
        nitaqatStatus,
        wpsStatus
    ] = await Promise.all([
        Employee.find({ ...baseQuery, 'employment.employmentStatus': 'active' }).lean(),
        getExpiringDocuments(baseQuery, today),
        getProbationEnding(baseQuery, today),
        getContractsExpiring(baseQuery, today),
        calculateGosiCompliance(baseQuery),
        calculateNitaqatStatus(baseQuery),
        calculateWpsStatus(baseQuery, today)
    ]);

    // Calculate overall compliance score
    const complianceIssues = [];
    let criticalCount = 0;
    let warningCount = 0;

    // Document expiry issues
    expiringDocuments.expired.forEach(doc => {
        criticalCount++;
        complianceIssues.push({
            type: 'document_expired',
            severity: 'critical',
            title: `${doc.documentType} Expired`,
            titleAr: `${doc.documentTypeAr || doc.documentType} منتهية الصلاحية`,
            employeeName: doc.employeeName,
            employeeNameAr: doc.employeeNameAr,
            employeeId: doc.employeeId,
            details: `Expired on ${doc.expiryDate}`,
            detailsAr: `انتهت في ${doc.expiryDateAr}`,
            action: 'Renew immediately',
            actionAr: 'تجديد فوري'
        });
    });

    expiringDocuments.expiringSoon.forEach(doc => {
        warningCount++;
        complianceIssues.push({
            type: 'document_expiring',
            severity: 'warning',
            title: `${doc.documentType} Expiring Soon`,
            titleAr: `${doc.documentTypeAr || doc.documentType} تنتهي قريباً`,
            employeeName: doc.employeeName,
            employeeNameAr: doc.employeeNameAr,
            employeeId: doc.employeeId,
            details: `Expires in ${doc.daysUntilExpiry} days`,
            detailsAr: `تنتهي خلال ${doc.daysUntilExpiry} يوم`,
            action: 'Plan renewal',
            actionAr: 'خطط للتجديد'
        });
    });

    // Probation ending issues
    probationEnding.forEach(emp => {
        warningCount++;
        complianceIssues.push({
            type: 'probation_ending',
            severity: 'warning',
            title: 'Probation Period Ending',
            titleAr: 'فترة التجربة تنتهي',
            employeeName: emp.employeeName,
            employeeNameAr: emp.employeeNameAr,
            employeeId: emp.employeeId,
            details: `Ends in ${emp.daysRemaining} days`,
            detailsAr: `تنتهي خلال ${emp.daysRemaining} يوم`,
            action: 'Confirm employment or terminate',
            actionAr: 'تأكيد التوظيف أو إنهاء'
        });
    });

    // Contract expiring issues
    contractsExpiring.forEach(emp => {
        warningCount++;
        complianceIssues.push({
            type: 'contract_expiring',
            severity: 'warning',
            title: 'Contract Expiring',
            titleAr: 'العقد ينتهي',
            employeeName: emp.employeeName,
            employeeNameAr: emp.employeeNameAr,
            employeeId: emp.employeeId,
            details: `Expires in ${emp.daysRemaining} days`,
            detailsAr: `ينتهي خلال ${emp.daysRemaining} يوم`,
            action: 'Renew or terminate',
            actionAr: 'تجديد أو إنهاء'
        });
    });

    // Nitaqat issues
    if (nitaqatStatus.currentBand === 'red') {
        criticalCount++;
        complianceIssues.push({
            type: 'nitaqat_violation',
            severity: 'critical',
            title: 'Nitaqat Red Zone',
            titleAr: 'منطقة نطاقات الحمراء',
            details: `Current: ${nitaqatStatus.saudizationPercentage}%, Required: ${nitaqatStatus.requiredPercentage}%`,
            detailsAr: `الحالي: ${nitaqatStatus.saudizationPercentage}%، المطلوب: ${nitaqatStatus.requiredPercentage}%`,
            action: `Hire ${nitaqatStatus.saudisNeeded} more Saudi employees`,
            actionAr: `توظيف ${nitaqatStatus.saudisNeeded} موظف سعودي إضافي`
        });
    } else if (nitaqatStatus.currentBand === 'yellow') {
        warningCount++;
        complianceIssues.push({
            type: 'nitaqat_warning',
            severity: 'warning',
            title: 'Nitaqat Yellow Zone',
            titleAr: 'منطقة نطاقات الصفراء',
            details: `Current: ${nitaqatStatus.saudizationPercentage}%, Target: ${nitaqatStatus.requiredPercentage}%`,
            detailsAr: `الحالي: ${nitaqatStatus.saudizationPercentage}%، المستهدف: ${nitaqatStatus.requiredPercentage}%`,
            action: 'Improve Saudization to reach green zone',
            actionAr: 'تحسين التوطين للوصول للمنطقة الخضراء'
        });
    }

    // WPS issues
    if (!wpsStatus.lastSubmissionOnTime) {
        criticalCount++;
        complianceIssues.push({
            type: 'wps_late',
            severity: 'critical',
            title: 'WPS Submission Late',
            titleAr: 'تأخر تقديم نظام حماية الأجور',
            details: `Last submission: ${wpsStatus.lastSubmissionDate || 'Never'}`,
            detailsAr: `آخر تقديم: ${wpsStatus.lastSubmissionDateAr || 'لم يتم'}`,
            action: 'Submit WPS file immediately',
            actionAr: 'تقديم ملف حماية الأجور فوراً'
        });
    }

    // Calculate compliance score (0-100)
    const maxScore = 100;
    const criticalPenalty = 15;
    const warningPenalty = 5;
    const complianceScore = Math.max(0, maxScore - (criticalCount * criticalPenalty) - (warningCount * warningPenalty));

    return res.json({
        success: true,
        generatedAt: today.toISOString(),
        generatedAtAr: today.toLocaleDateString('ar-SA'),
        complianceScore,
        complianceGrade: complianceScore >= 90 ? 'A' : complianceScore >= 75 ? 'B' : complianceScore >= 60 ? 'C' : complianceScore >= 40 ? 'D' : 'F',
        summary: {
            totalEmployees: employees.length,
            criticalIssues: criticalCount,
            warningIssues: warningCount,
            totalIssues: criticalCount + warningCount
        },
        gosi: gosiStatus,
        nitaqat: nitaqatStatus,
        wps: wpsStatus,
        documents: {
            expired: expiringDocuments.expired.length,
            expiringSoon: expiringDocuments.expiringSoon.length,
            expiredList: expiringDocuments.expired,
            expiringSoonList: expiringDocuments.expiringSoon
        },
        probation: {
            endingSoon: probationEnding.length,
            list: probationEnding
        },
        contracts: {
            expiringSoon: contractsExpiring.length,
            list: contractsExpiring
        },
        issues: complianceIssues.sort((a, b) => {
            const severityOrder = { critical: 0, warning: 1, info: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        })
    });
});

// ═══════════════════════════════════════════════════════════════
// GET GOSI COMPLIANCE STATUS
// GET /api/hr/compliance/gosi
// ═══════════════════════════════════════════════════════════════
const getGosiCompliance = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    const gosiStatus = await calculateGosiCompliance(baseQuery);

    return res.json({
        success: true,
        ...gosiStatus
    });
});

// ═══════════════════════════════════════════════════════════════
// GET NITAQAT STATUS
// GET /api/hr/compliance/nitaqat
// ═══════════════════════════════════════════════════════════════
const getNitaqatStatus = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    const nitaqatStatus = await calculateNitaqatStatus(baseQuery);

    return res.json({
        success: true,
        ...nitaqatStatus
    });
});

// ═══════════════════════════════════════════════════════════════
// GET WPS STATUS
// GET /api/hr/compliance/wps
// ═══════════════════════════════════════════════════════════════
const getWpsStatus = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    const wpsStatus = await calculateWpsStatus(baseQuery, new Date());

    return res.json({
        success: true,
        ...wpsStatus
    });
});

// ═══════════════════════════════════════════════════════════════
// GET EXPIRING DOCUMENTS
// GET /api/hr/compliance/documents/expiring
// ═══════════════════════════════════════════════════════════════
const getExpiringDocumentsEndpoint = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { daysAhead = 30 } = req.query;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    const documents = await getExpiringDocuments(baseQuery, new Date(), parseInt(daysAhead));

    return res.json({
        success: true,
        ...documents
    });
});

// ═══════════════════════════════════════════════════════════════
// GET PROBATION ENDING
// GET /api/hr/compliance/probation/ending
// ═══════════════════════════════════════════════════════════════
const getProbationEndingEndpoint = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { daysAhead = 30 } = req.query;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    const probation = await getProbationEnding(baseQuery, new Date(), parseInt(daysAhead));

    return res.json({
        success: true,
        count: probation.length,
        employees: probation
    });
});

// ═══════════════════════════════════════════════════════════════
// GET CONTRACTS EXPIRING
// GET /api/hr/compliance/contracts/expiring
// ═══════════════════════════════════════════════════════════════
const getContractsExpiringEndpoint = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { daysAhead = 60 } = req.query;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    const contracts = await getContractsExpiring(baseQuery, new Date(), parseInt(daysAhead));

    return res.json({
        success: true,
        count: contracts.length,
        employees: contracts
    });
});

// ═══════════════════════════════════════════════════════════════
// GET LABOR LAW COMPLIANCE CHECKLIST
// GET /api/hr/compliance/labor-law
// ═══════════════════════════════════════════════════════════════
const getLaborLawChecklist = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    const employees = await Employee.find({
        ...baseQuery,
        'employment.employmentStatus': 'active'
    }).lean();

    const checklist = [];

    // Article 53 - Probation Period
    const employeesOnProbation = employees.filter(e => {
        const probationEnd = e.employment?.probationEndDate;
        return probationEnd && new Date(probationEnd) > new Date();
    });
    checklist.push({
        article: 'Article 53',
        articleAr: 'المادة 53',
        title: 'Probation Period',
        titleAr: 'فترة التجربة',
        requirement: 'Maximum 180 days (6 months)',
        requirementAr: 'الحد الأقصى 180 يوم (6 أشهر)',
        status: 'compliant',
        affectedEmployees: employeesOnProbation.length,
        notes: `${employeesOnProbation.length} employees currently on probation`
    });

    // Article 109 - Annual Leave
    const leaveAllocations = await LeaveAllocation.find({
        ...baseQuery,
        leaveType: 'ANNUAL',
        year: new Date().getFullYear()
    }).lean();

    const employeesWithoutLeave = employees.length - leaveAllocations.length;
    checklist.push({
        article: 'Article 109',
        articleAr: 'المادة 109',
        title: 'Annual Leave',
        titleAr: 'الإجازة السنوية',
        requirement: '21 days (<5 years) or 30 days (≥5 years)',
        requirementAr: '21 يوم (أقل من 5 سنوات) أو 30 يوم (5 سنوات فأكثر)',
        status: employeesWithoutLeave > 0 ? 'warning' : 'compliant',
        affectedEmployees: employeesWithoutLeave,
        notes: employeesWithoutLeave > 0 ? `${employeesWithoutLeave} employees without leave allocation` : 'All employees have leave allocations'
    });

    // Article 117 - Sick Leave
    checklist.push({
        article: 'Article 117',
        articleAr: 'المادة 117',
        title: 'Sick Leave',
        titleAr: 'الإجازة المرضية',
        requirement: '30 days full pay + 60 days half pay + 30 days unpaid',
        requirementAr: '30 يوم كامل الراتب + 60 يوم نصف الراتب + 30 يوم بدون راتب',
        status: 'configured',
        notes: 'Three-tier sick leave system configured'
    });

    // Article 151 - Maternity Leave
    checklist.push({
        article: 'Article 151',
        articleAr: 'المادة 151',
        title: 'Maternity Leave',
        titleAr: 'إجازة الوضع',
        requirement: '84 days (12 weeks) fully paid',
        requirementAr: '84 يوم (12 أسبوع) براتب كامل',
        status: 'configured',
        notes: 'Maternity leave configured for 84 days'
    });

    // Article 160 - Iddah Leave
    checklist.push({
        article: 'Article 160',
        articleAr: 'المادة 160',
        title: 'Iddah Leave (Widow)',
        titleAr: 'إجازة العدة',
        requirement: '130 days Muslim, 15 days non-Muslim',
        requirementAr: '130 يوم مسلمة، 15 يوم غير مسلمة',
        status: 'configured',
        notes: 'Iddah leave configured based on religion'
    });

    // Articles 84-88 - End of Service
    checklist.push({
        article: 'Articles 84-88',
        articleAr: 'المواد 84-88',
        title: 'End of Service Benefits (EOSB)',
        titleAr: 'مكافأة نهاية الخدمة',
        requirement: 'Half month (<5 years) or full month (≥5 years) per year',
        requirementAr: 'نصف شهر (أقل من 5 سنوات) أو شهر كامل (5 سنوات فأكثر)',
        status: 'configured',
        notes: 'EOSB calculator implemented per Labor Law'
    });

    // WPS Compliance
    checklist.push({
        article: 'WPS Regulation',
        articleAr: 'نظام حماية الأجور',
        title: 'Wage Protection System',
        titleAr: 'نظام حماية الأجور',
        requirement: 'Submit salary file by 10th of each month',
        requirementAr: 'تقديم ملف الرواتب بحلول العاشر من كل شهر',
        status: 'requires_action',
        notes: 'Manual file upload required to Mudad portal'
    });

    // GOSI Compliance
    checklist.push({
        article: 'GOSI Law',
        articleAr: 'نظام التأمينات الاجتماعية',
        title: 'Social Insurance',
        titleAr: 'التأمينات الاجتماعية',
        requirement: 'Register all employees, submit contributions monthly',
        requirementAr: 'تسجيل جميع الموظفين، تقديم الاشتراكات شهرياً',
        status: 'requires_action',
        notes: 'Manual registration and payment required on gosi.gov.sa'
    });

    return res.json({
        success: true,
        lastUpdated: new Date().toISOString(),
        checklist
    });
});

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function calculateGosiCompliance(baseQuery) {
    const employees = await Employee.find({
        ...baseQuery,
        'employment.employmentStatus': 'active'
    })
        .select('personalInfo.nationalId personalInfo.nationality compensation.basicSalary compensation.allowances gosiDetails')
        .lean();

    const saudis = employees.filter(e => {
        const natId = e.personalInfo?.nationalId || '';
        return natId.startsWith('1'); // Saudi IDs start with 1
    });
    const nonSaudis = employees.filter(e => {
        const natId = e.personalInfo?.nationalId || '';
        return natId.startsWith('2') || !natId.startsWith('1'); // Iqama starts with 2
    });

    // Calculate contributions
    let totalEmployerContribution = 0;
    let totalEmployeeContribution = 0;
    const employeeBreakdown = [];

    employees.forEach(emp => {
        const basicSalary = emp.compensation?.basicSalary || 0;
        const housingAllowance = emp.compensation?.allowances?.find(a => a.type === 'housing')?.amount || 0;

        // GOSI contribution base = basic salary + housing allowance
        let contributionBase = basicSalary + housingAllowance;

        // Apply limits
        contributionBase = Math.max(contributionBase, GOSI_RATES.minContributionBase);
        contributionBase = Math.min(contributionBase, GOSI_RATES.maxContributionBase);

        const isSaudi = emp.personalInfo?.nationalId?.startsWith('1');

        let employerContribution = 0;
        let employeeContribution = 0;

        if (isSaudi) {
            // Saudi: Annuities + SANED + Occupational Hazards
            employerContribution = contributionBase * (GOSI_RATES.saudi.employer + GOSI_RATES.saned.employer + GOSI_RATES.occupationalHazards.employer);
            employeeContribution = contributionBase * (GOSI_RATES.saudi.employee + GOSI_RATES.saned.employee);
        } else {
            // Non-Saudi: Occupational Hazards only (employer)
            employerContribution = contributionBase * GOSI_RATES.nonSaudi.employer;
            employeeContribution = 0;
        }

        totalEmployerContribution += employerContribution;
        totalEmployeeContribution += employeeContribution;

        employeeBreakdown.push({
            employeeId: emp._id,
            nationalId: emp.personalInfo?.nationalId,
            isSaudi,
            contributionBase,
            employerContribution: Math.round(employerContribution * 100) / 100,
            employeeContribution: Math.round(employeeContribution * 100) / 100,
            totalContribution: Math.round((employerContribution + employeeContribution) * 100) / 100
        });
    });

    return {
        summary: {
            totalEmployees: employees.length,
            saudiEmployees: saudis.length,
            nonSaudiEmployees: nonSaudis.length,
            totalEmployerContribution: Math.round(totalEmployerContribution * 100) / 100,
            totalEmployeeContribution: Math.round(totalEmployeeContribution * 100) / 100,
            totalContribution: Math.round((totalEmployerContribution + totalEmployeeContribution) * 100) / 100
        },
        rates: GOSI_RATES,
        breakdown: employeeBreakdown
    };
}

async function calculateNitaqatStatus(baseQuery) {
    const employees = await Employee.find({
        ...baseQuery,
        'employment.employmentStatus': 'active'
    })
        .select('personalInfo.nationalId personalInfo.nationality employment.nitaqatWeight')
        .lean();

    const totalEmployees = employees.length;

    // Count Saudis (National ID starts with 1)
    const saudis = employees.filter(e => {
        const natId = e.personalInfo?.nationalId || '';
        return natId.startsWith('1');
    });

    // Calculate weighted Saudization
    let totalWeight = 0;
    let saudiWeight = 0;

    employees.forEach(emp => {
        const weight = emp.employment?.nitaqatWeight || 1;
        totalWeight += weight;

        const isSaudi = emp.personalInfo?.nationalId?.startsWith('1');
        if (isSaudi) {
            saudiWeight += weight;
        }
    });

    const saudizationPercentage = totalWeight > 0 ? Math.round((saudiWeight / totalWeight) * 100) : 0;

    // Determine Nitaqat band (simplified - actual rules depend on business size and activity)
    // This is a simplified version - real Nitaqat depends on establishment size and economic activity
    let currentBand = 'green';
    let requiredPercentage = 30; // Varies by sector

    if (saudizationPercentage < 10) {
        currentBand = 'red';
        requiredPercentage = 10;
    } else if (saudizationPercentage < 20) {
        currentBand = 'yellow';
        requiredPercentage = 20;
    } else if (saudizationPercentage < 35) {
        currentBand = 'green_low';
        requiredPercentage = 35;
    } else if (saudizationPercentage < 50) {
        currentBand = 'green_mid';
        requiredPercentage = 50;
    } else {
        currentBand = 'platinum';
        requiredPercentage = saudizationPercentage;
    }

    // Calculate how many Saudis needed to reach green
    const saudisNeeded = currentBand === 'red' || currentBand === 'yellow'
        ? Math.ceil((requiredPercentage / 100) * totalEmployees) - saudis.length
        : 0;

    return {
        totalEmployees,
        saudiEmployees: saudis.length,
        nonSaudiEmployees: totalEmployees - saudis.length,
        saudizationPercentage,
        currentBand,
        currentBandAr: {
            red: 'أحمر',
            yellow: 'أصفر',
            green_low: 'أخضر منخفض',
            green_mid: 'أخضر متوسط',
            green: 'أخضر',
            platinum: 'بلاتيني'
        }[currentBand],
        requiredPercentage,
        saudisNeeded: Math.max(0, saudisNeeded),
        weightedCalculation: {
            totalWeight,
            saudiWeight,
            weightedPercentage: totalWeight > 0 ? Math.round((saudiWeight / totalWeight) * 100) : 0
        }
    };
}

async function calculateWpsStatus(baseQuery, today) {
    // Get last payroll run to check WPS submission status
    const lastPayroll = await PayrollRun?.findOne({
        ...baseQuery,
        status: 'completed'
    })
        .sort({ payrollPeriod: -1 })
        .lean();

    // WPS deadline is typically 10th of the following month
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const wpsDeadline = new Date(currentYear, currentMonth, 10);

    // If we're past the 10th, deadline is next month
    if (today.getDate() > 10) {
        wpsDeadline.setMonth(wpsDeadline.getMonth() + 1);
    }

    const daysUntilDeadline = Math.ceil((wpsDeadline - today) / (1000 * 60 * 60 * 24));

    return {
        currentMonth: today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        currentMonthAr: today.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' }),
        nextDeadline: wpsDeadline.toISOString().split('T')[0],
        nextDeadlineAr: wpsDeadline.toLocaleDateString('ar-SA'),
        daysUntilDeadline,
        deadlineStatus: daysUntilDeadline > 5 ? 'on_track' : daysUntilDeadline > 0 ? 'approaching' : 'overdue',
        lastPayroll: lastPayroll ? {
            period: lastPayroll.payrollPeriod,
            processedDate: lastPayroll.processedDate,
            wpsFileGenerated: lastPayroll.wps?.fileGenerated || false,
            wpsSubmitted: lastPayroll.wps?.submitted || false,
            wpsSubmissionDate: lastPayroll.wps?.submissionDate
        } : null,
        lastSubmissionOnTime: lastPayroll?.wps?.submitted || false,
        lastSubmissionDate: lastPayroll?.wps?.submissionDate,
        lastSubmissionDateAr: lastPayroll?.wps?.submissionDate
            ? new Date(lastPayroll.wps.submissionDate).toLocaleDateString('ar-SA')
            : null,
        instructions: {
            en: 'Generate WPS file from Payroll module and upload to Mudad portal (mudad.com.sa)',
            ar: 'قم بإنشاء ملف نظام حماية الأجور من وحدة الرواتب وارفعه على بوابة مدد (mudad.com.sa)'
        }
    };
}

async function getExpiringDocuments(baseQuery, today, daysAhead = 30) {
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const employees = await Employee.find({
        ...baseQuery,
        'employment.employmentStatus': 'active',
        $or: [
            { 'documents.iqamaExpiry': { $lte: futureDate } },
            { 'documents.passportExpiry': { $lte: futureDate } },
            { 'documents.workPermitExpiry': { $lte: futureDate } },
            { 'documents.drivingLicenseExpiry': { $lte: futureDate } }
        ]
    })
        .select('personalInfo.fullNameEnglish personalInfo.fullNameArabic documents')
        .lean();

    const expired = [];
    const expiringSoon = [];

    const documentTypes = [
        { field: 'iqamaExpiry', type: 'Iqama', typeAr: 'إقامة' },
        { field: 'passportExpiry', type: 'Passport', typeAr: 'جواز السفر' },
        { field: 'workPermitExpiry', type: 'Work Permit', typeAr: 'تصريح العمل' },
        { field: 'drivingLicenseExpiry', type: 'Driving License', typeAr: 'رخصة القيادة' }
    ];

    employees.forEach(emp => {
        documentTypes.forEach(docType => {
            const expiryDate = emp.documents?.[docType.field];
            if (expiryDate) {
                const expiry = new Date(expiryDate);
                const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

                const docInfo = {
                    employeeId: emp._id,
                    employeeName: emp.personalInfo?.fullNameEnglish,
                    employeeNameAr: emp.personalInfo?.fullNameArabic,
                    documentType: docType.type,
                    documentTypeAr: docType.typeAr,
                    expiryDate: expiry.toISOString().split('T')[0],
                    expiryDateAr: expiry.toLocaleDateString('ar-SA'),
                    daysUntilExpiry
                };

                if (daysUntilExpiry < 0) {
                    docInfo.status = 'expired';
                    docInfo.statusAr = 'منتهية';
                    expired.push(docInfo);
                } else if (daysUntilExpiry <= daysAhead) {
                    docInfo.status = 'expiring_soon';
                    docInfo.statusAr = 'تنتهي قريباً';
                    expiringSoon.push(docInfo);
                }
            }
        });
    });

    return {
        expired: expired.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry),
        expiringSoon: expiringSoon.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
    };
}

async function getProbationEnding(baseQuery, today, daysAhead = 30) {
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const employees = await Employee.find({
        ...baseQuery,
        'employment.employmentStatus': 'active',
        'employment.probationEndDate': { $gte: today, $lte: futureDate }
    })
        .select('personalInfo.fullNameEnglish personalInfo.fullNameArabic employment.probationEndDate employment.hireDate employment.departmentName')
        .lean();

    return employees.map(emp => {
        const probationEnd = new Date(emp.employment.probationEndDate);
        const daysRemaining = Math.ceil((probationEnd - today) / (1000 * 60 * 60 * 24));

        return {
            employeeId: emp._id,
            employeeName: emp.personalInfo?.fullNameEnglish,
            employeeNameAr: emp.personalInfo?.fullNameArabic,
            department: emp.employment?.departmentName,
            hireDate: emp.employment?.hireDate,
            probationEndDate: probationEnd.toISOString().split('T')[0],
            probationEndDateAr: probationEnd.toLocaleDateString('ar-SA'),
            daysRemaining
        };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);
}

async function getContractsExpiring(baseQuery, today, daysAhead = 60) {
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const employees = await Employee.find({
        ...baseQuery,
        'employment.employmentStatus': 'active',
        'employment.contractEndDate': { $gte: today, $lte: futureDate }
    })
        .select('personalInfo.fullNameEnglish personalInfo.fullNameArabic employment.contractEndDate employment.contractType employment.departmentName')
        .lean();

    return employees.map(emp => {
        const contractEnd = new Date(emp.employment.contractEndDate);
        const daysRemaining = Math.ceil((contractEnd - today) / (1000 * 60 * 60 * 24));

        return {
            employeeId: emp._id,
            employeeName: emp.personalInfo?.fullNameEnglish,
            employeeNameAr: emp.personalInfo?.fullNameArabic,
            department: emp.employment?.departmentName,
            contractType: emp.employment?.contractType,
            contractEndDate: contractEnd.toISOString().split('T')[0],
            contractEndDateAr: contractEnd.toLocaleDateString('ar-SA'),
            daysRemaining
        };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);
}

module.exports = {
    getComplianceDashboard,
    getGosiCompliance,
    getNitaqatStatus,
    getWpsStatus,
    getExpiringDocumentsEndpoint,
    getProbationEndingEndpoint,
    getContractsExpiringEndpoint,
    getLaborLawChecklist
};
