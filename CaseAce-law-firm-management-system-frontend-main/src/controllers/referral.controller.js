const Referral = require('../models/referral.model');
const Lead = require('../models/lead.model');
const CrmActivity = require('../models/crmActivity.model');

// ============================================
// REFERRAL CRUD
// ============================================

// Create referral source
exports.createReferral = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const referralData = {
            ...req.body,
            lawyerId,
            createdBy: lawyerId
        };

        const referral = await Referral.create(referralData);

        res.status(201).json({
            success: true,
            message: 'Referral source created successfully',
            data: referral
        });
    } catch (error) {
        console.error('Error creating referral:', error);
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

        const referrals = await Referral.getReferrals(lawyerId, {
            status,
            type,
            hasFeeAgreement: hasFeeAgreement === 'true' ? true : hasFeeAgreement === 'false' ? false : undefined,
            search,
            limit: parseInt(limit),
            skip: (parseInt(page) - 1) * parseInt(limit)
        });

        const total = await Referral.countDocuments({ lawyerId, ...(status ? { status } : {}) });

        res.json({
            success: true,
            data: referrals,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error getting referrals:', error);
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

        const referral = await Referral.findOne({
            $or: [{ _id: id }, { referralId: id }],
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

        res.json({
            success: true,
            data: referral
        });
    } catch (error) {
        console.error('Error getting referral:', error);
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
        const updates = req.body;

        const referral = await Referral.findOne({
            $or: [{ _id: id }, { referralId: id }],
            lawyerId
        });

        if (!referral) {
            return res.status(404).json({
                success: false,
                message: 'Referral not found'
            });
        }

        // Apply updates
        const allowedUpdates = [
            'name', 'nameAr', 'description', 'type', 'status',
            'externalSource', 'hasFeeAgreement', 'feeType',
            'feePercentage', 'feeFixedAmount', 'feeTiers', 'feeNotes',
            'tags', 'rating', 'priority', 'notes', 'nextFollowUpDate'
        ];

        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                referral[field] = updates[field];
            }
        });

        referral.lastModifiedBy = lawyerId;
        await referral.save();

        res.json({
            success: true,
            message: 'Referral updated successfully',
            data: referral
        });
    } catch (error) {
        console.error('Error updating referral:', error);
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

        const referral = await Referral.findOne({
            $or: [{ _id: id }, { referralId: id }],
            lawyerId
        });

        if (!referral) {
            return res.status(404).json({
                success: false,
                message: 'Referral not found'
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
        console.error('Error deleting referral:', error);
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
        const { leadId, caseValue } = req.body;
        const lawyerId = req.userID;

        const referral = await Referral.findOne({
            $or: [{ _id: id }, { referralId: id }],
            lawyerId
        });

        if (!referral) {
            return res.status(404).json({
                success: false,
                message: 'Referral not found'
            });
        }

        // Verify lead exists
        const lead = await Lead.findOne({ _id: leadId, lawyerId });
        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        await referral.addReferral(leadId, caseValue || lead.estimatedValue);

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
        console.error('Error adding lead referral:', error);
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
        const { clientId } = req.body;
        const lawyerId = req.userID;

        const referral = await Referral.findOne({
            $or: [{ _id: id }, { referralId: id }],
            lawyerId
        });

        if (!referral) {
            return res.status(404).json({
                success: false,
                message: 'Referral not found'
            });
        }

        await referral.convertReferral(leadId, clientId);

        res.json({
            success: true,
            message: 'Referral marked as converted',
            data: referral
        });
    } catch (error) {
        console.error('Error marking referral as converted:', error);
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
        const paymentData = req.body;
        const lawyerId = req.userID;

        const referral = await Referral.findOne({
            $or: [{ _id: id }, { referralId: id }],
            lawyerId
        });

        if (!referral) {
            return res.status(404).json({
                success: false,
                message: 'Referral not found'
            });
        }

        await referral.recordFeePayment(paymentData, lawyerId);

        res.json({
            success: true,
            message: 'Payment recorded successfully',
            data: referral
        });
    } catch (error) {
        console.error('Error recording payment:', error);
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
        console.error('Error getting referral stats:', error);
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

        const topReferrers = await Referral.getTopReferrers(lawyerId, parseInt(limit));

        res.json({
            success: true,
            data: topReferrers
        });
    } catch (error) {
        console.error('Error getting top referrers:', error);
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

        const referral = await Referral.findOne({
            $or: [{ _id: id }, { referralId: id }],
            lawyerId
        });

        if (!referral) {
            return res.status(404).json({
                success: false,
                message: 'Referral not found'
            });
        }

        const fee = referral.calculateFee(parseFloat(caseValue) || 0);

        res.json({
            success: true,
            data: {
                caseValue: parseFloat(caseValue) || 0,
                feeAmount: fee,
                feeType: referral.feeType,
                currency: referral.feeCurrency
            }
        });
    } catch (error) {
        console.error('Error calculating fee:', error);
        res.status(500).json({
            success: false,
            message: 'Error calculating fee',
            error: error.message
        });
    }
};
