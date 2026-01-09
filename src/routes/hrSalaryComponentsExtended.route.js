/**
 * HR Salary Components Extended Routes
 *
 * Extended salary component operations - bulk, calculations, seeding.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - POST /bulk-delete              - Bulk delete components
 * - POST /calculate                - Calculate salary breakdown
 * - POST /seed-defaults            - Seed default components
 * - POST /:id/duplicate            - Duplicate component
 * - GET /summary                   - Get components summary
 * - POST /validate                 - Validate component configuration
 * - GET /tax-implications          - Get tax implications
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Default salary components (Saudi Arabia context)
const DEFAULT_COMPONENTS = [
    {
        code: 'BASIC',
        name: 'Basic Salary',
        nameAr: 'الراتب الأساسي',
        type: 'earning',
        category: 'fixed',
        isTaxable: true,
        isStatutory: true,
        calculationType: 'fixed',
        description: 'Basic monthly salary'
    },
    {
        code: 'HRA',
        name: 'Housing Allowance',
        nameAr: 'بدل السكن',
        type: 'earning',
        category: 'allowance',
        isTaxable: false,
        isStatutory: false,
        calculationType: 'percentage',
        calculationBase: 'basic',
        percentage: 25,
        description: 'Housing allowance (typically 25% of basic)'
    },
    {
        code: 'TRANS',
        name: 'Transportation Allowance',
        nameAr: 'بدل المواصلات',
        type: 'earning',
        category: 'allowance',
        isTaxable: false,
        isStatutory: false,
        calculationType: 'fixed',
        defaultAmount: 500,
        description: 'Monthly transportation allowance'
    },
    {
        code: 'GOSI_EMP',
        name: 'GOSI Employee Contribution',
        nameAr: 'اشتراك التأمينات الاجتماعية - الموظف',
        type: 'deduction',
        category: 'statutory',
        isTaxable: false,
        isStatutory: true,
        calculationType: 'percentage',
        calculationBase: 'basic',
        percentage: 9.75,
        description: 'Employee GOSI contribution (9.75% of basic, max SAR 4,500)'
    },
    {
        code: 'GOSI_ER',
        name: 'GOSI Employer Contribution',
        nameAr: 'اشتراك التأمينات الاجتماعية - صاحب العمل',
        type: 'employer_contribution',
        category: 'statutory',
        isTaxable: false,
        isStatutory: true,
        calculationType: 'percentage',
        calculationBase: 'basic',
        percentage: 11.75,
        description: 'Employer GOSI contribution (11.75% of basic)'
    },
    {
        code: 'OVERTIME',
        name: 'Overtime',
        nameAr: 'العمل الإضافي',
        type: 'earning',
        category: 'variable',
        isTaxable: true,
        isStatutory: false,
        calculationType: 'hourly_multiplier',
        multiplier: 1.5,
        description: 'Overtime pay (1.5x hourly rate)'
    },
    {
        code: 'BONUS',
        name: 'Performance Bonus',
        nameAr: 'مكافأة الأداء',
        type: 'earning',
        category: 'variable',
        isTaxable: true,
        isStatutory: false,
        calculationType: 'fixed',
        description: 'Performance-based bonus'
    },
    {
        code: 'LOAN_DED',
        name: 'Loan Deduction',
        nameAr: 'استقطاع القرض',
        type: 'deduction',
        category: 'recovery',
        isTaxable: false,
        isStatutory: false,
        calculationType: 'fixed',
        description: 'Monthly loan recovery deduction'
    }
];

/**
 * POST /bulk-delete - Bulk delete components
 */
router.post('/bulk-delete', async (req, res, next) => {
    try {
        const { componentIds } = req.body;

        if (!componentIds || !Array.isArray(componentIds) || componentIds.length === 0) {
            throw CustomException('Component IDs array is required', 400);
        }

        if (componentIds.length > 50) {
            throw CustomException('Maximum 50 components can be deleted at once', 400);
        }

        const safeIds = componentIds.map(id => sanitizeObjectId(id, 'componentId'));

        const firm = await Firm.findOne(req.firmQuery).select('hr.salaryComponents');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const components = firm.hr?.salaryComponents || [];
        const deleted = [];
        const notFound = [];
        const protected = [];

        safeIds.forEach(id => {
            const index = components.findIndex(c => c._id?.toString() === id.toString());
            if (index === -1) {
                notFound.push(id.toString());
            } else if (components[index].isStatutory) {
                protected.push({
                    id: id.toString(),
                    name: components[index].name,
                    reason: 'Statutory component cannot be deleted'
                });
            } else {
                deleted.push(components[index].name);
                components.splice(index, 1);
            }
        });

        if (deleted.length > 0) {
            await firm.save();
        }

        res.json({
            success: true,
            message: `Deleted ${deleted.length} component(s)`,
            data: {
                deleted,
                notFound,
                protected
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /calculate - Calculate salary breakdown
 */
router.post('/calculate', async (req, res, next) => {
    try {
        const { basicSalary, employeeId, includeComponents, excludeComponents, month, year } = req.body;

        if (!basicSalary || basicSalary <= 0) {
            throw CustomException('Valid basic salary is required', 400);
        }

        const firm = await Firm.findOne(req.firmQuery).select('hr.salaryComponents').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let components = (firm.hr?.salaryComponents || []).filter(c => c.isActive !== false);

        // Filter components if specified
        if (includeComponents && Array.isArray(includeComponents)) {
            components = components.filter(c => includeComponents.includes(c.code));
        }
        if (excludeComponents && Array.isArray(excludeComponents)) {
            components = components.filter(c => !excludeComponents.includes(c.code));
        }

        const breakdown = {
            earnings: [],
            deductions: [],
            employerContributions: [],
            grossSalary: basicSalary,
            totalDeductions: 0,
            netSalary: 0,
            totalEmployerCost: basicSalary
        };

        // Calculate each component
        for (const component of components) {
            let amount = 0;

            switch (component.calculationType) {
                case 'fixed':
                    amount = component.defaultAmount || 0;
                    break;
                case 'percentage':
                    const base = component.calculationBase === 'basic' ? basicSalary : basicSalary;
                    amount = (base * (component.percentage || 0)) / 100;

                    // Apply caps (e.g., GOSI has max contribution)
                    if (component.maxAmount) {
                        amount = Math.min(amount, component.maxAmount);
                    }
                    break;
                case 'hourly_multiplier':
                    // Would need hours worked
                    amount = 0; // Placeholder
                    break;
            }

            if (amount === 0 && component.category !== 'variable') continue;

            const entry = {
                code: component.code,
                name: component.name,
                nameAr: component.nameAr,
                amount: Math.round(amount * 100) / 100,
                isTaxable: component.isTaxable,
                isStatutory: component.isStatutory
            };

            switch (component.type) {
                case 'earning':
                    if (component.code !== 'BASIC') {
                        breakdown.earnings.push(entry);
                        breakdown.grossSalary += entry.amount;
                    }
                    break;
                case 'deduction':
                    breakdown.deductions.push(entry);
                    breakdown.totalDeductions += entry.amount;
                    break;
                case 'employer_contribution':
                    breakdown.employerContributions.push(entry);
                    breakdown.totalEmployerCost += entry.amount;
                    break;
            }
        }

        // Add basic salary to earnings
        breakdown.earnings.unshift({
            code: 'BASIC',
            name: 'Basic Salary',
            nameAr: 'الراتب الأساسي',
            amount: basicSalary,
            isTaxable: true,
            isStatutory: true
        });

        breakdown.netSalary = breakdown.grossSalary - breakdown.totalDeductions;
        breakdown.totalEmployerCost = breakdown.grossSalary +
            breakdown.employerContributions.reduce((s, c) => s + c.amount, 0);

        res.json({
            success: true,
            data: {
                inputBasicSalary: basicSalary,
                ...breakdown
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /seed-defaults - Seed default components
 */
router.post('/seed-defaults', async (req, res, next) => {
    try {
        const { overwriteExisting } = req.body;

        const firm = await Firm.findOne(req.firmQuery).select('hr.salaryComponents');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.hr) firm.hr = {};
        if (!firm.hr.salaryComponents) firm.hr.salaryComponents = [];

        const existingCodes = new Set(firm.hr.salaryComponents.map(c => c.code));
        const added = [];
        const skipped = [];
        const updated = [];

        for (const defaultComp of DEFAULT_COMPONENTS) {
            if (existingCodes.has(defaultComp.code)) {
                if (overwriteExisting) {
                    // Update existing
                    const index = firm.hr.salaryComponents.findIndex(c => c.code === defaultComp.code);
                    Object.assign(firm.hr.salaryComponents[index], defaultComp, {
                        updatedAt: new Date(),
                        updatedBy: req.userID
                    });
                    updated.push(defaultComp.code);
                } else {
                    skipped.push(defaultComp.code);
                }
            } else {
                // Add new
                firm.hr.salaryComponents.push({
                    _id: new mongoose.Types.ObjectId(),
                    ...defaultComp,
                    isActive: true,
                    createdBy: req.userID,
                    createdAt: new Date()
                });
                added.push(defaultComp.code);
            }
        }

        await firm.save();

        res.json({
            success: true,
            message: `Seeded ${added.length} new components`,
            data: {
                added,
                updated,
                skipped,
                totalComponents: firm.hr.salaryComponents.length
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/duplicate - Duplicate component
 */
router.post('/:id/duplicate', async (req, res, next) => {
    try {
        const componentId = sanitizeObjectId(req.params.id, 'id');
        const { newCode, newName } = req.body;

        const firm = await Firm.findOne(req.firmQuery).select('hr.salaryComponents');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const sourceComponent = (firm.hr?.salaryComponents || []).find(
            c => c._id?.toString() === componentId.toString()
        );

        if (!sourceComponent) {
            throw CustomException('Salary component not found', 404);
        }

        // Validate new code doesn't exist
        const code = newCode || `${sourceComponent.code}_COPY`;
        const existingCodes = new Set(firm.hr.salaryComponents.map(c => c.code));

        if (existingCodes.has(code)) {
            throw CustomException(`Component with code "${code}" already exists`, 400);
        }

        // Create duplicate
        const duplicate = {
            _id: new mongoose.Types.ObjectId(),
            ...sourceComponent.toObject ? sourceComponent.toObject() : sourceComponent,
            code,
            name: newName || `${sourceComponent.name} (Copy)`,
            nameAr: sourceComponent.nameAr ? `${sourceComponent.nameAr} (نسخة)` : undefined,
            isStatutory: false, // Duplicates are never statutory
            createdBy: req.userID,
            createdAt: new Date()
        };

        delete duplicate._id;
        duplicate._id = new mongoose.Types.ObjectId();

        firm.hr.salaryComponents.push(duplicate);
        await firm.save();

        res.status(201).json({
            success: true,
            message: 'Component duplicated',
            data: duplicate
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /summary - Get components summary
 */
router.get('/summary', async (req, res, next) => {
    try {
        const firm = await Firm.findOne(req.firmQuery).select('hr.salaryComponents').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const components = firm.hr?.salaryComponents || [];

        const summary = {
            total: components.length,
            byType: {
                earning: components.filter(c => c.type === 'earning').length,
                deduction: components.filter(c => c.type === 'deduction').length,
                employer_contribution: components.filter(c => c.type === 'employer_contribution').length
            },
            byCategory: {},
            statutory: components.filter(c => c.isStatutory).length,
            taxable: components.filter(c => c.isTaxable).length,
            active: components.filter(c => c.isActive !== false).length,
            inactive: components.filter(c => c.isActive === false).length
        };

        // Count by category
        components.forEach(c => {
            const cat = c.category || 'uncategorized';
            summary.byCategory[cat] = (summary.byCategory[cat] || 0) + 1;
        });

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /validate - Validate component configuration
 */
router.post('/validate', async (req, res, next) => {
    try {
        const { components } = req.body;

        if (!components || !Array.isArray(components)) {
            throw CustomException('Components array is required', 400);
        }

        const errors = [];
        const warnings = [];

        const codes = new Set();

        components.forEach((comp, index) => {
            const prefix = `Component ${index + 1} (${comp.code || 'unnamed'})`;

            // Required fields
            if (!comp.code) {
                errors.push(`${prefix}: Code is required`);
            } else if (codes.has(comp.code)) {
                errors.push(`${prefix}: Duplicate code "${comp.code}"`);
            } else {
                codes.add(comp.code);
            }

            if (!comp.name) {
                errors.push(`${prefix}: Name is required`);
            }

            if (!comp.type) {
                errors.push(`${prefix}: Type is required`);
            } else if (!['earning', 'deduction', 'employer_contribution'].includes(comp.type)) {
                errors.push(`${prefix}: Invalid type "${comp.type}"`);
            }

            // Calculation validation
            if (comp.calculationType === 'percentage') {
                if (!comp.percentage || comp.percentage <= 0) {
                    errors.push(`${prefix}: Percentage must be > 0 for percentage calculation`);
                }
                if (!comp.calculationBase) {
                    warnings.push(`${prefix}: No calculation base specified, will default to basic`);
                }
            }

            // Statutory checks
            if (comp.isStatutory && comp.type !== 'deduction' && comp.type !== 'employer_contribution') {
                warnings.push(`${prefix}: Statutory components are typically deductions or employer contributions`);
            }

            // Tax checks
            if (comp.isTaxable && comp.type === 'deduction') {
                warnings.push(`${prefix}: Deductions are typically not taxable`);
            }
        });

        const isValid = errors.length === 0;

        res.json({
            success: true,
            data: {
                isValid,
                errors,
                warnings,
                componentsChecked: components.length
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /tax-implications - Get tax implications
 */
router.get('/tax-implications', async (req, res, next) => {
    try {
        const { grossSalary } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('hr.salaryComponents').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const components = (firm.hr?.salaryComponents || []).filter(c => c.isActive !== false);

        // Group taxable vs non-taxable
        const taxableComponents = components.filter(c => c.isTaxable && c.type === 'earning');
        const nonTaxableComponents = components.filter(c => !c.isTaxable && c.type === 'earning');

        // In Saudi Arabia, there's no personal income tax, but there are GOSI contributions
        const statutoryDeductions = components.filter(c => c.isStatutory && c.type === 'deduction');
        const employerStatutory = components.filter(c => c.isStatutory && c.type === 'employer_contribution');

        const implications = {
            taxRegime: 'Saudi Arabia - No Personal Income Tax',
            taxableEarnings: taxableComponents.map(c => ({
                code: c.code,
                name: c.name,
                note: 'Included in gross salary but no income tax applied'
            })),
            nonTaxableEarnings: nonTaxableComponents.map(c => ({
                code: c.code,
                name: c.name,
                note: 'Allowance - exempt from tax calculations'
            })),
            statutoryDeductions: statutoryDeductions.map(c => ({
                code: c.code,
                name: c.name,
                percentage: c.percentage,
                note: c.description
            })),
            employerObligations: employerStatutory.map(c => ({
                code: c.code,
                name: c.name,
                percentage: c.percentage,
                note: c.description
            })),
            summary: {
                totalTaxRate: 0, // No income tax in Saudi Arabia
                totalGosiEmployee: statutoryDeductions
                    .filter(c => c.code?.includes('GOSI'))
                    .reduce((s, c) => s + (c.percentage || 0), 0),
                totalGosiEmployer: employerStatutory
                    .filter(c => c.code?.includes('GOSI'))
                    .reduce((s, c) => s + (c.percentage || 0), 0)
            }
        };

        // Calculate actual amounts if grossSalary provided
        if (grossSalary) {
            const salary = parseFloat(grossSalary);
            implications.calculations = {
                grossSalary: salary,
                gosiEmployeeDeduction: Math.min(salary * (implications.summary.totalGosiEmployee / 100), 4387.5), // Max GOSI
                gosiEmployerContribution: salary * (implications.summary.totalGosiEmployer / 100),
                netSalary: salary - Math.min(salary * (implications.summary.totalGosiEmployee / 100), 4387.5)
            };
        }

        res.json({
            success: true,
            data: implications
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
