const Referral = require('../models/referral.model');
const Lead = require('../models/lead.model');
const CrmActivity = require('../models/crmActivity.model');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// ============================================
// REFERRAL CRUD
// ============================================

// Create referral source
exports.createReferral = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const firmId = req.firmId;

        // Mass assignment protection - only allow specific fields
        const allowedFields = [
            'name', 'nameAr', 'description', 'type', 'status',
            'externalSource', 'hasFeeAgreement', 'feeType',
            'feePercentage', 'feeFixedAmount', 'feeTiers', 'feeNotes',
            'tags', 'rating', 'priority', 'notes', 'nextFollowUpDate'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Input validation for fee amounts
        if (sanitizedData.feePercentage !== undefined) {
            const feePercentage = parseFloat(sanitizedData.feePercentage);
            if (isNaN(feePercentage) || feePercentage < 0 || feePercentage > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Fee percentage must be between 0 and 100'
                });
            }
            sanitizedData.feePercentage = feePercentage;
        }

        if (sanitizedData.feeFixedAmount !== undefined) {
            const feeFixedAmount = parseFloat(sanitizedData.feeFixedAmount);
            if (isNaN(feeFixedAmount) || feeFixedAmount < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Fee fixed amount must be a positive number'
                });
            }
            sanitizedData.feeFixedAmount = feeFixedAmount;
        }

        // Validate fee tiers if provided
        if (sanitizedData.feeTiers && Array.isArray(sanitizedData.feeTiers)) {
            for (const tier of sanitizedData.feeTiers) {
                if (tier.minValue !== undefined && (isNaN(parseFloat(tier.minValue)) || parseFloat(tier.minValue) < 0)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Fee tier minValue must be a positive number'
                    });
                }
                if (tier.maxValue !== undefined && (isNaN(parseFloat(tier.maxValue)) || parseFloat(tier.maxValue) < 0)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Fee tier maxValue must be a positive number'
                    });
                }
                if (tier.percentage !== undefined && (isNaN(parseFloat(tier.percentage)) || parseFloat(tier.percentage) < 0 || parseFloat(tier.percentage) > 100)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Fee tier percentage must be between 0 and 100'
                    });
                }
            }
        }

        const referralData = {
            ...sanitizedData,
            lawyerId,
            firmId,
            createdBy: lawyerId
        };

        const referral = await Referral.create(referralData);

        res.status(201).json({
            success: true,
            message: 'Referral source created successfully',
            data: referral
        });
    } catch (error) {
        logger.error('Error creating referral:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating referral source',
            error: error.message
        });
    }
};

// Get all referrals
exports.getReferrals = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const { status, type, hasFeeAgreement, search, page = 1, limit = 50 } = req.query;

        // Input validation for pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid page number'
            });
        }

        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({
                success: false,
                message: 'Invalid limit (must be between 1 and 100)'
            });
        }

        const referrals = await Referral.getReferrals(lawyerId, {
            status,
            type,
            hasFeeAgreement: hasFeeAgreement === 'true' ? true : hasFeeAgreement === 'false' ? false : undefined,
            search,
            limit: limitNum,
            skip: (pageNum - 1) * limitNum
        });

        const total = await Referral.countDocuments({ lawyerId, ...(status ? { status } : {}) });

        res.json({
            success: true,
            data: referrals,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        logger.error('Error getting referrals:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting referrals',
            error: error.message
        });
    }
};

// Get single referral
exports.getReferral = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;
        const firmId = req.firmId;

        // Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid referral ID'
            });
        }

        const referral = await Referral.findOne({
            $or: [{ _id: sanitizedId }, { referralId: id }],
            lawyerId
        })
        .populate('referredLeads.leadId', 'leadId displayName status estimatedValue')
        .populate('referredClients.clientId', 'clientId name');

        if (!referral) {
            return res.status(404).json({
                success: false,
                message: 'Referral not found'
            });
        }

        // IDOR protection - verify firmId ownership
        if (referral.firmId && referral.firmId.toString() !== firmId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            data: referral
        });
    } catch (error) {
        logger.error('Error getting referral:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting referral',
            error: error.message
        });
    }
};

// Update referral
exports.updateReferral = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;
        const firmId = req.firmId;

        // Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid referral ID'
            });
        }

        const referral = await Referral.findOne({
            $or: [{ _id: sanitizedId }, { referralId: id }],
            lawyerId
        });

        if (!referral) {
            return res.status(404).json({
                success: false,
                message: 'Referral not found'
            });
        }

        // IDOR protection - verify firmId ownership
        if (referral.firmId && referral.firmId.toString() !== firmId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Mass assignment protection using pickAllowedFields
        const allowedUpdates = [
            'name', 'nameAr', 'description', 'type', 'status',
            'externalSource', 'hasFeeAgreement', 'feeType',
            'feePercentage', 'feeFixedAmount', 'feeTiers', 'feeNotes',
            'tags', 'rating', 'priority', 'notes', 'nextFollowUpDate'
        ];
        const updates = pickAllowedFields(req.body, allowedUpdates);

        // Input validation for fee amounts
        if (updates.feePercentage !== undefined) {
            const feePercentage = parseFloat(updates.feePercentage);
            if (isNaN(feePercentage) || feePercentage < 0 || feePercentage > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Fee percentage must be between 0 and 100'
                });
            }
            updates.feePercentage = feePercentage;
        }

        if (updates.feeFixedAmount !== undefined) {
            const feeFixedAmount = parseFloat(updates.feeFixedAmount);
            if (isNaN(feeFixedAmount) || feeFixedAmount < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Fee fixed amount must be a positive number'
                });
            }
            updates.feeFixedAmount = feeFixedAmount;
        }

        // Validate fee tiers if provided
        if (updates.feeTiers && Array.isArray(updates.feeTiers)) {
            for (const tier of updates.feeTiers) {
                if (tier.minValue !== undefined && (isNaN(parseFloat(tier.minValue)) || parseFloat(tier.minValue) < 0)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Fee tier minValue must be a positive number'
                    });
                }
                if (tier.maxValue !== undefined && (isNaN(parseFloat(tier.maxValue)) || parseFloat(tier.maxValue) < 0)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Fee tier maxValue must be a positive number'
                    });
                }
                if (tier.percentage !== undefined && (isNaN(parseFloat(tier.percentage)) || parseFloat(tier.percentage) < 0 || parseFloat(tier.percentage) > 100)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Fee tier percentage must be between 0 and 100'
                    });
                }
            }
        }

        // Apply updates
        Object.keys(updates).forEach(field => {
            referral[field] = updates[field];
        });

        referral.lastModifiedBy = lawyerId;
        await referral.save();

        res.json({
            success: true,
            message: 'Referral updated successfully',
            data: referral
        });
    } catch (error) {
        logger.error('Error updating referral:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating referral',
            error: error.message
        });
    }
};

// Delete referral
exports.deleteReferral = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;
        const firmId = req.firmId;

        // Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid referral ID'
            });
        }

        const referral = await Referral.findOne({
            $or: [{ _id: sanitizedId }, { referralId: id }],
            lawyerId
        });

        if (!referral) {
            return res.status(404).json({
                success: false,
                message: 'Referral not found'
            });
        }

        // IDOR protection - verify firmId ownership
        if (referral.firmId && referral.firmId.toString() !== firmId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (referral.totalReferrals > 0) {
            // Archive instead of delete
            referral.status = 'archived';
            await referral.save();

            return res.json({
                success: true,
                message: 'Referral archived (has referral history)'
            });
        }

        await referral.deleteOne();

        res.json({
            success: true,
            message: 'Referral deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting referral:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting referral',
            error: error.message
        });
    }
};

// ============================================
// REFERRAL OPERATIONS
// ============================================

// Add a lead referral
exports.addLeadReferral = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;
        const firmId = req.firmId;

        // Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid referral ID'
            });
        }

        // Mass assignment protection - only allow specific fields
        const allowedFields = ['leadId', 'caseValue'];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Validate leadId
        const sanitizedLeadId = sanitizeObjectId(sanitizedData.leadId);
        if (!sanitizedLeadId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid lead ID'
            });
        }

        // Validate and sanitize caseValue
        let caseValue = sanitizedData.caseValue;
        if (caseValue !== undefined) {
            caseValue = parseFloat(caseValue);
            if (isNaN(caseValue) || caseValue < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Case value must be a positive number'
                });
            }
        }

        const referral = await Referral.findOne({
            $or: [{ _id: sanitizedId }, { referralId: id }],
            lawyerId
        });

        if (!referral) {
            return res.status(404).json({
                success: false,
                message: 'Referral not found'
            });
        }

        // IDOR protection - verify firmId ownership for referral
        if (referral.firmId && referral.firmId.toString() !== firmId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Verify lead exists and belongs to same lawyer/firm
        const lead = await Lead.findOne({ _id: sanitizedLeadId, lawyerId });
        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        // IDOR protection - verify firmId ownership for lead
        if (lead.firmId && lead.firmId.toString() !== firmId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to lead'
            });
        }

        await referral.addReferral(sanitizedLeadId, caseValue || lead.estimatedValue);

        // Update lead source
        lead.source = {
            type: 'referral',
            referralId: referral._id,
            referralName: referral.name
        };
        await lead.save();

        res.json({
            success: true,
            message: 'Lead referral added',
            data: referral
        });
    } catch (error) {
        logger.error('Error adding lead referral:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding lead referral',
            error: error.message
        });
    }
};

// Mark referral as converted
exports.markConverted = async (req, res) => {
    try {
        const { id, leadId } = req.params;
        const lawyerId = req.userID;
        const firmId = req.firmId;

        // Sanitize and validate ObjectIds
        const sanitizedId = sanitizeObjectId(id);
        const sanitizedLeadId = sanitizeObjectId(leadId);

        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid referral ID'
            });
        }

        if (!sanitizedLeadId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid lead ID'
            });
        }

        // Mass assignment protection - only allow clientId field
        const allowedFields = ['clientId'];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Validate clientId
        const sanitizedClientId = sanitizeObjectId(sanitizedData.clientId);
        if (!sanitizedClientId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid client ID'
            });
        }

        const referral = await Referral.findOne({
            $or: [{ _id: sanitizedId }, { referralId: id }],
            lawyerId
        });

        if (!referral) {
            return res.status(404).json({
                success: false,
                message: 'Referral not found'
            });
        }

        // IDOR protection - verify firmId ownership
        if (referral.firmId && referral.firmId.toString() !== firmId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await referral.convertReferral(sanitizedLeadId, sanitizedClientId);

        res.json({
            success: true,
            message: 'Referral marked as converted',
            data: referral
        });
    } catch (error) {
        logger.error('Error marking referral as converted:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating referral',
            error: error.message
        });
    }
};

// Record fee payment
exports.recordPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;
        const firmId = req.firmId;

        // Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid referral ID'
            });
        }

        // Mass assignment protection - only allow specific payment fields
        const allowedFields = [
            'amount', 'date', 'method', 'referenceNumber',
            'notes', 'currency', 'linkedLeadId', 'linkedClientId'
        ];
        const paymentData = pickAllowedFields(req.body, allowedFields);

        // Validate payment amount
        if (paymentData.amount === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Payment amount is required'
            });
        }

        const amount = parseFloat(paymentData.amount);
        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Payment amount must be a positive number'
            });
        }
        paymentData.amount = amount;

        // Validate linkedLeadId if provided
        if (paymentData.linkedLeadId) {
            const sanitizedLeadId = sanitizeObjectId(paymentData.linkedLeadId);
            if (!sanitizedLeadId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid linked lead ID'
                });
            }
            paymentData.linkedLeadId = sanitizedLeadId;
        }

        // Validate linkedClientId if provided
        if (paymentData.linkedClientId) {
            const sanitizedClientId = sanitizeObjectId(paymentData.linkedClientId);
            if (!sanitizedClientId) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid linked client ID'
                });
            }
            paymentData.linkedClientId = sanitizedClientId;
        }

        const referral = await Referral.findOne({
            $or: [{ _id: sanitizedId }, { referralId: id }],
            lawyerId
        });

        if (!referral) {
            return res.status(404).json({
                success: false,
                message: 'Referral not found'
            });
        }

        // IDOR protection - verify firmId ownership
        if (referral.firmId && referral.firmId.toString() !== firmId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await referral.recordFeePayment(paymentData, lawyerId);

        res.json({
            success: true,
            message: 'Payment recorded successfully',
            data: referral
        });
    } catch (error) {
        logger.error('Error recording payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error recording payment',
            error: error.message
        });
    }
};

// ============================================
// REFERRAL STATISTICS
// ============================================

// Get referral stats
exports.getStats = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const { startDate, endDate } = req.query;

        const stats = await Referral.getStats(lawyerId, {
            start: startDate,
            end: endDate
        });

        // Get top referrers
        const topReferrers = await Referral.getTopReferrers(lawyerId, 5);

        res.json({
            success: true,
            data: {
                stats,
                topReferrers
            }
        });
    } catch (error) {
        logger.error('Error getting referral stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting statistics',
            error: error.message
        });
    }
};

// Get top referrers
exports.getTopReferrers = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const { limit = 10 } = req.query;

        // Input validation for limit
        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({
                success: false,
                message: 'Invalid limit (must be between 1 and 100)'
            });
        }

        const topReferrers = await Referral.getTopReferrers(lawyerId, limitNum);

        res.json({
            success: true,
            data: topReferrers
        });
    } catch (error) {
        logger.error('Error getting top referrers:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting top referrers',
            error: error.message
        });
    }
};

// Calculate fee for a value
exports.calculateFee = async (req, res) => {
    try {
        const { id } = req.params;
        const { caseValue } = req.query;
        const lawyerId = req.userID;
        const firmId = req.firmId;

        // Sanitize and validate ObjectId
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid referral ID'
            });
        }

        // Validate and sanitize caseValue
        const caseValueNum = parseFloat(caseValue);
        if (isNaN(caseValueNum) || caseValueNum < 0) {
            return res.status(400).json({
                success: false,
                message: 'Case value must be a positive number'
            });
        }

        const referral = await Referral.findOne({
            $or: [{ _id: sanitizedId }, { referralId: id }],
            lawyerId
        });

        if (!referral) {
            return res.status(404).json({
                success: false,
                message: 'Referral not found'
            });
        }

        // IDOR protection - verify firmId ownership
        if (referral.firmId && referral.firmId.toString() !== firmId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const fee = referral.calculateFee(caseValueNum);

        res.json({
            success: true,
            data: {
                caseValue: caseValueNum,
                feeAmount: fee,
                feeType: referral.feeType,
                currency: referral.feeCurrency
            }
        });
    } catch (error) {
        logger.error('Error calculating fee:', error);
        res.status(500).json({
            success: false,
            message: 'Error calculating fee',
            error: error.message
        });
    }
};
