const Lead = require('../models/lead.model');
const LeadScore = require('../models/leadScore.model');
const CrmActivity = require('../models/crmActivity.model');
const LeadScoringConfig = require('../models/leadScoringConfig.model');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * ML Training Data Extraction Service
 * Extracts and prepares historical lead data for model training
 *
 * Data Requirements:
 * - 6+ months of historical leads with outcomes
 * - Feature engineering applied
 * - Label: converted (true/false)
 * - Class balancing support
 */

class MLTrainingDataService {
    /**
     * Extract training data from MongoDB
     * @param {ObjectId} firmId - Firm to extract data for
     * @param {Object} options - { startDate, endDate, minAge, includeOngoing }
     * @returns {Array} Training data with features and labels
     */
    async extractTrainingData(firmId, options = {}) {
        try {
            const {
                startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // Default 6 months
                endDate = new Date(),
                minAge = 30, // Minimum lead age in days
                includeOngoing = false
            } = options;

            logger.info(`Extracting training data for firm ${firmId}`);

            // Build query for leads with known outcomes
            const query = {
                firmId: new mongoose.Types.ObjectId(firmId),
                createdAt: {
                    $gte: startDate,
                    $lte: new Date(endDate.getTime() - minAge * 24 * 60 * 60 * 1000) // Ensure minimum age
                }
            };

            // Filter for leads with known outcomes (converted or lost)
            if (!includeOngoing) {
                query.$or = [
                    { convertedToClient: true },
                    { status: 'lost' }
                ];
            }

            // Get leads with their scores
            const leads = await Lead.find(query)
                .populate('firmId')
                .lean();

            logger.info(`Found ${leads.length} leads for training`);

            if (leads.length === 0) {
                return {
                    success: false,
                    message: 'No leads found matching criteria',
                    data: [],
                    stats: { total: 0, positive: 0, negative: 0 }
                };
            }

            // Extract features and labels for each lead
            const trainingData = [];
            for (const lead of leads) {
                try {
                    // Get activities for this lead
                    const activities = await CrmActivity.find({
                        entityType: 'lead',
                        entityId: lead._id
                    }).lean();

                    // Get lead score data if available
                    const leadScore = await LeadScore.findOne({ leadId: lead._id }).lean();

                    // Prepare features
                    const features = await this.prepareFeatures(lead, activities, leadScore);

                    // Determine label (1 = converted, 0 = not converted/lost)
                    const label = lead.convertedToClient ? 1 : 0;

                    // Additional metadata for analysis
                    const metadata = {
                        leadId: lead._id,
                        leadNumber: lead.leadId,
                        createdAt: lead.createdAt,
                        status: lead.status,
                        convertedAt: lead.convertedAt,
                        timeToConversion: lead.convertedAt
                            ? Math.floor((lead.convertedAt - lead.createdAt) / (1000 * 60 * 60 * 24))
                            : null,
                        estimatedValue: lead.estimatedValue || 0
                    };

                    trainingData.push({
                        features,
                        label,
                        metadata
                    });
                } catch (error) {
                    logger.error(`Error processing lead ${lead._id}:`, error);
                    // Continue with next lead
                }
            }

            // Calculate statistics
            const stats = this.getDataStatistics(trainingData);

            logger.info(`Extracted ${trainingData.length} training samples`, stats);

            return {
                success: true,
                data: trainingData,
                stats,
                extractedAt: new Date(),
                firmId
            };
        } catch (error) {
            logger.error('Error extracting training data:', error);
            throw error;
        }
    }

    /**
     * Prepare features for a single lead
     * Returns normalized feature vector
     * @param {Object} lead - Lead document
     * @param {Array} activities - Lead activities
     * @param {Object} leadScore - Lead score document
     * @returns {Object} Feature vector
     */
    async prepareFeatures(lead, activities = [], leadScore = null) {
        const features = {};

        // ═══════════════════════════════════════════════════════════════
        // 1. DEMOGRAPHIC FEATURES
        // ═══════════════════════════════════════════════════════════════

        // Lead type
        features.isCompany = lead.type === 'company' ? 1 : 0;

        // Case type (one-hot encoding)
        const caseTypes = ['civil', 'criminal', 'family', 'commercial', 'labor', 'real_estate', 'administrative', 'execution', 'other'];
        caseTypes.forEach(type => {
            features[`caseType_${type}`] = lead.intake?.caseType === type ? 1 : 0;
        });

        // Case value (normalized - log scale for better distribution)
        const caseValue = lead.intake?.estimatedValue || lead.estimatedValue || 0;
        features.caseValue = caseValue > 0 ? Math.log10(caseValue + 1) : 0;
        features.hasCaseValue = caseValue > 0 ? 1 : 0;

        // Urgency level
        const urgencyMap = { 'urgent': 4, 'high': 3, 'normal': 2, 'low': 1 };
        features.urgency = urgencyMap[lead.intake?.urgency] || 2;

        // Location (has address info)
        features.hasAddress = lead.address?.city ? 1 : 0;

        // Identity verification
        features.isVerified = lead.isVerified ? 1 : 0;
        features.hasNationalId = lead.nationalId ? 1 : 0;

        // Risk level
        const riskMap = { 'low': 1, 'medium': 2, 'high': 3, 'very_high': 4 };
        features.riskLevel = riskMap[lead.riskLevel] || 1;

        // ═══════════════════════════════════════════════════════════════
        // 2. QUALIFICATION (BANT) FEATURES
        // ═══════════════════════════════════════════════════════════════

        if (lead.qualification) {
            // Budget
            const budgetMap = { 'premium': 5, 'high': 4, 'medium': 3, 'low': 2, 'unknown': 1 };
            features.budget = budgetMap[lead.qualification.budget] || 1;
            features.hasBudgetAmount = lead.qualification.budgetAmount ? 1 : 0;
            features.budgetAmount = lead.qualification.budgetAmount
                ? Math.log10(lead.qualification.budgetAmount + 1)
                : 0;

            // Authority
            const authorityMap = { 'decision_maker': 3, 'influencer': 2, 'researcher': 1, 'unknown': 0 };
            features.authority = authorityMap[lead.qualification.authority] || 0;

            // Need
            const needMap = { 'urgent': 3, 'planning': 2, 'exploring': 1, 'unknown': 0 };
            features.need = needMap[lead.qualification.need] || 0;

            // Timeline
            const timelineMap = {
                'immediate': 5,
                'this_month': 4,
                'this_quarter': 3,
                'this_year': 2,
                'no_timeline': 1,
                'unknown': 0
            };
            features.timeline = timelineMap[lead.qualification.timeline] || 0;

            // Qualification scores
            features.qualificationScore = lead.qualification.score || 0;
            features.isQualified = lead.qualification.qualifiedAt ? 1 : 0;
        } else {
            features.budget = 1;
            features.hasBudgetAmount = 0;
            features.budgetAmount = 0;
            features.authority = 0;
            features.need = 0;
            features.timeline = 0;
            features.qualificationScore = 0;
            features.isQualified = 0;
        }

        // ═══════════════════════════════════════════════════════════════
        // 3. SOURCE & ACQUISITION FEATURES
        // ═══════════════════════════════════════════════════════════════

        // Source type (one-hot encoding)
        const sourceTypes = ['website', 'referral', 'social_media', 'advertising', 'cold_call', 'walk_in', 'event', 'other'];
        sourceTypes.forEach(type => {
            features[`source_${type}`] = lead.source?.type === type ? 1 : 0;
        });

        features.hasReferral = lead.source?.referralId ? 1 : 0;
        features.hasCampaign = lead.source?.campaign ? 1 : 0;

        // ═══════════════════════════════════════════════════════════════
        // 4. BEHAVIORAL FEATURES (from activities)
        // ═══════════════════════════════════════════════════════════════

        // Email activities
        const emailActivities = activities.filter(a => a.type === 'email');
        features.emailCount = emailActivities.length;
        features.emailOpens = emailActivities.filter(a => a.emailData?.opened).length;
        features.emailClicks = emailActivities.filter(a => a.emailData?.clicked).length;
        features.emailReplies = emailActivities.filter(a => a.emailData?.replied).length;
        features.emailEngagementRate = emailActivities.length > 0
            ? (features.emailOpens + features.emailClicks + features.emailReplies) / emailActivities.length
            : 0;

        // Call activities
        const callActivities = activities.filter(a => a.type === 'call');
        features.callCount = callActivities.length;
        features.totalCallDuration = callActivities.reduce((sum, a) => sum + (a.callData?.duration || 0), 0);
        features.avgCallDuration = callActivities.length > 0
            ? features.totalCallDuration / callActivities.length
            : 0;
        features.inboundCalls = callActivities.filter(a => a.callData?.direction === 'inbound').length;
        features.outboundCalls = callActivities.filter(a => a.callData?.direction === 'outbound').length;

        // Meeting activities
        const meetingActivities = activities.filter(a => a.type === 'meeting');
        features.meetingCount = meetingActivities.length;
        features.meetingsAttended = meetingActivities.filter(
            a => a.meetingData?.outcome === 'completed'
        ).length;
        features.meetingNoShows = meetingActivities.filter(
            a => a.meetingData?.outcome === 'no_show'
        ).length;
        features.meetingAttendanceRate = meetingActivities.length > 0
            ? features.meetingsAttended / meetingActivities.length
            : 0;

        // Document activities
        const documentActivities = activities.filter(a => a.type === 'document');
        features.documentViews = documentActivities.length;

        // WhatsApp activities
        const whatsappActivities = activities.filter(a => a.type === 'whatsapp');
        features.whatsappMessages = whatsappActivities.length;

        // Total activity metrics
        features.totalActivities = activities.length;
        features.activityDiversity = new Set(activities.map(a => a.type)).size; // Unique activity types

        // ═══════════════════════════════════════════════════════════════
        // 5. ENGAGEMENT FEATURES
        // ═══════════════════════════════════════════════════════════════

        // Recency
        if (lead.lastContactedAt) {
            features.daysSinceLastContact = Math.floor(
                (new Date() - lead.lastContactedAt) / (1000 * 60 * 60 * 24)
            );
        } else {
            features.daysSinceLastContact = 999; // High value for never contacted
        }

        // Lead age
        features.leadAgeInDays = Math.floor(
            (new Date() - lead.createdAt) / (1000 * 60 * 60 * 24)
        );

        // Frequency - activities per week
        features.activitiesPerWeek = features.leadAgeInDays > 0
            ? (features.totalActivities / (features.leadAgeInDays / 7))
            : 0;

        // Time-based activity distribution
        const last7Days = activities.filter(
            a => (new Date() - a.createdAt) <= 7 * 24 * 60 * 60 * 1000
        ).length;
        const last30Days = activities.filter(
            a => (new Date() - a.createdAt) <= 30 * 24 * 60 * 60 * 1000
        ).length;

        features.activitiesLast7Days = last7Days;
        features.activitiesLast30Days = last30Days;

        // Active days (days with at least one activity)
        const uniqueDays = new Set(
            activities.map(a => a.createdAt.toISOString().split('T')[0])
        );
        features.activeDays = uniqueDays.size;
        features.activeDaysRatio = features.leadAgeInDays > 0
            ? features.activeDays / features.leadAgeInDays
            : 0;

        // Response time (average hours between activities)
        if (activities.length > 1) {
            const sortedActivities = activities.sort((a, b) => a.createdAt - b.createdAt);
            let totalGap = 0;
            for (let i = 1; i < sortedActivities.length; i++) {
                totalGap += (sortedActivities[i].createdAt - sortedActivities[i-1].createdAt);
            }
            features.avgResponseTimeHours = totalGap / (sortedActivities.length - 1) / (1000 * 60 * 60);
        } else {
            features.avgResponseTimeHours = 0;
        }

        // ═══════════════════════════════════════════════════════════════
        // 6. LEAD SCORING FEATURES (if available)
        // ═══════════════════════════════════════════════════════════════

        if (leadScore) {
            features.leadScore = leadScore.totalScore || 0;
            features.leadGrade = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1 }[leadScore.grade] || 1;
            features.conversionProbability = leadScore.conversionProbability || 0;

            // Breakdown scores
            features.demographicScore = leadScore.breakdown?.demographic?.score || 0;
            features.bantScore = leadScore.breakdown?.bant?.score || 0;
            features.behavioralScore = leadScore.breakdown?.behavioral?.score || 0;
            features.engagementScore = leadScore.breakdown?.engagement?.score || 0;

            // Score trend
            if (leadScore.scoreHistory && leadScore.scoreHistory.length > 1) {
                const firstScore = leadScore.scoreHistory[0].score;
                const lastScore = leadScore.totalScore;
                features.scoreTrend = lastScore - firstScore;
                features.scoreImprovement = firstScore > 0 ? (lastScore / firstScore) : 1;
            } else {
                features.scoreTrend = 0;
                features.scoreImprovement = 1;
            }
        } else {
            features.leadScore = 0;
            features.leadGrade = 1;
            features.conversionProbability = 0;
            features.demographicScore = 0;
            features.bantScore = 0;
            features.behavioralScore = 0;
            features.engagementScore = 0;
            features.scoreTrend = 0;
            features.scoreImprovement = 1;
        }

        // ═══════════════════════════════════════════════════════════════
        // 7. PIPELINE FEATURES
        // ═══════════════════════════════════════════════════════════════

        // Status (ordinal encoding)
        const statusMap = {
            'new': 1,
            'contacted': 2,
            'qualified': 3,
            'proposal': 4,
            'negotiation': 5,
            'won': 6,
            'lost': 0,
            'dormant': 0
        };
        features.statusLevel = statusMap[lead.status] || 1;
        features.probability = lead.probability || 0;

        // Has assignment
        features.hasAssignment = lead.assignedTo ? 1 : 0;
        features.teamSize = lead.teamMembers ? lead.teamMembers.length : 0;

        // Has follow-up
        features.hasFollowUp = lead.nextFollowUpDate ? 1 : 0;
        if (lead.nextFollowUpDate) {
            features.daysToFollowUp = Math.floor(
                (lead.nextFollowUpDate - new Date()) / (1000 * 60 * 60 * 24)
            );
        } else {
            features.daysToFollowUp = 999;
        }

        // ═══════════════════════════════════════════════════════════════
        // 8. TEMPORAL FEATURES
        // ═══════════════════════════════════════════════════════════════

        const createdDate = new Date(lead.createdAt);
        features.createdDayOfWeek = createdDate.getDay(); // 0-6
        features.createdHour = createdDate.getHours(); // 0-23
        features.createdMonth = createdDate.getMonth(); // 0-11
        features.createdQuarter = Math.floor(createdDate.getMonth() / 3); // 0-3

        return features;
    }

    /**
     * Balance classes (handle imbalanced data)
     * Options: undersample, oversample (SMOTE-like), class_weights
     * @param {Array} data - Training data
     * @param {String} method - Balancing method
     * @returns {Array|Object} Balanced data or class weights
     */
    balanceClasses(data, method = 'class_weights') {
        const positiveCount = data.filter(d => d.label === 1).length;
        const negativeCount = data.filter(d => d.label === 0).length;
        const total = data.length;

        logger.info(`Class distribution: Positive=${positiveCount}, Negative=${negativeCount}`);

        if (method === 'class_weights') {
            // Calculate weights inversely proportional to class frequency
            const weights = {
                0: total / (2 * negativeCount),
                1: total / (2 * positiveCount)
            };

            logger.info(`Class weights: 0=${weights[0].toFixed(2)}, 1=${weights[1].toFixed(2)}`);

            return {
                data,
                weights,
                method: 'class_weights'
            };
        }

        if (method === 'undersample') {
            // Undersample the majority class
            const minCount = Math.min(positiveCount, negativeCount);
            const positiveData = data.filter(d => d.label === 1);
            const negativeData = data.filter(d => d.label === 0);

            // Randomly sample
            const sampledPositive = this._randomSample(positiveData, minCount);
            const sampledNegative = this._randomSample(negativeData, minCount);

            const balancedData = [...sampledPositive, ...sampledNegative];
            this._shuffleArray(balancedData);

            logger.info(`Undersampled to ${balancedData.length} samples`);

            return {
                data: balancedData,
                method: 'undersample',
                originalCount: total,
                balancedCount: balancedData.length
            };
        }

        if (method === 'oversample') {
            // Oversample the minority class (simple duplication)
            const maxCount = Math.max(positiveCount, negativeCount);
            const positiveData = data.filter(d => d.label === 1);
            const negativeData = data.filter(d => d.label === 0);

            const oversampledPositive = this._oversample(positiveData, maxCount);
            const oversampledNegative = this._oversample(negativeData, maxCount);

            const balancedData = [...oversampledPositive, ...oversampledNegative];
            this._shuffleArray(balancedData);

            logger.info(`Oversampled to ${balancedData.length} samples`);

            return {
                data: balancedData,
                method: 'oversample',
                originalCount: total,
                balancedCount: balancedData.length
            };
        }

        // No balancing
        return {
            data,
            method: 'none'
        };
    }

    /**
     * Split data into train/validation/test sets
     * Stratified split to maintain class ratios
     * @param {Array} data - Training data
     * @param {Object} ratios - Split ratios
     * @returns {Object} Split datasets
     */
    splitData(data, ratios = { train: 0.7, validation: 0.15, test: 0.15 }) {
        // Validate ratios
        const sum = ratios.train + ratios.validation + ratios.test;
        if (Math.abs(sum - 1.0) > 0.01) {
            throw new Error('Split ratios must sum to 1.0');
        }

        // Separate by class for stratified split
        const positiveData = data.filter(d => d.label === 1);
        const negativeData = data.filter(d => d.label === 0);

        // Shuffle
        this._shuffleArray(positiveData);
        this._shuffleArray(negativeData);

        // Calculate split indices for positive class
        const posTrainEnd = Math.floor(positiveData.length * ratios.train);
        const posValEnd = Math.floor(positiveData.length * (ratios.train + ratios.validation));

        // Calculate split indices for negative class
        const negTrainEnd = Math.floor(negativeData.length * ratios.train);
        const negValEnd = Math.floor(negativeData.length * (ratios.train + ratios.validation));

        // Create splits
        const trainData = [
            ...positiveData.slice(0, posTrainEnd),
            ...negativeData.slice(0, negTrainEnd)
        ];

        const validationData = [
            ...positiveData.slice(posTrainEnd, posValEnd),
            ...negativeData.slice(negTrainEnd, negValEnd)
        ];

        const testData = [
            ...positiveData.slice(posValEnd),
            ...negativeData.slice(negValEnd)
        ];

        // Shuffle each set
        this._shuffleArray(trainData);
        this._shuffleArray(validationData);
        this._shuffleArray(testData);

        logger.info(`Data split - Train: ${trainData.length}, Val: ${validationData.length}, Test: ${testData.length}`);

        return {
            train: trainData,
            validation: validationData,
            test: testData,
            stats: {
                train: this._getSetStats(trainData),
                validation: this._getSetStats(validationData),
                test: this._getSetStats(testData)
            }
        };
    }

    /**
     * Create time-based train/test split (prevents data leakage)
     * Train on older data, test on newer data
     * @param {Array} data - Training data
     * @param {Number} testMonths - Number of months for test set
     * @returns {Object} Split datasets
     */
    temporalSplit(data, testMonths = 2) {
        // Sort by creation date
        const sortedData = [...data].sort((a, b) =>
            new Date(a.metadata.createdAt) - new Date(b.metadata.createdAt)
        );

        // Calculate split point
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - testMonths);

        // Split based on date
        const trainData = sortedData.filter(d =>
            new Date(d.metadata.createdAt) < cutoffDate
        );

        const testData = sortedData.filter(d =>
            new Date(d.metadata.createdAt) >= cutoffDate
        );

        // Further split train into train and validation (80/20)
        const valSplitIndex = Math.floor(trainData.length * 0.8);
        const actualTrainData = trainData.slice(0, valSplitIndex);
        const validationData = trainData.slice(valSplitIndex);

        logger.info(`Temporal split - Train: ${actualTrainData.length}, Val: ${validationData.length}, Test: ${testData.length}`);
        logger.info(`Cutoff date: ${cutoffDate.toISOString()}`);

        return {
            train: actualTrainData,
            validation: validationData,
            test: testData,
            cutoffDate,
            stats: {
                train: this._getSetStats(actualTrainData),
                validation: this._getSetStats(validationData),
                test: this._getSetStats(testData)
            }
        };
    }

    /**
     * Compute normalization parameters from training data
     * For min-max or z-score normalization
     * @param {Array} trainingData - Training dataset
     * @returns {Object} Normalization parameters
     */
    computeNormalizationParams(trainingData) {
        if (!trainingData || trainingData.length === 0) {
            throw new Error('Training data is empty');
        }

        const params = {
            minMax: {},
            zScore: {},
            featureNames: Object.keys(trainingData[0].features)
        };

        // Get all feature names
        const featureNames = params.featureNames;

        // Compute min-max and z-score params for each feature
        featureNames.forEach(featureName => {
            const values = trainingData.map(d => d.features[featureName]);

            // Min-Max normalization params
            const min = Math.min(...values);
            const max = Math.max(...values);
            params.minMax[featureName] = { min, max, range: max - min };

            // Z-score normalization params
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
            const std = Math.sqrt(variance);
            params.zScore[featureName] = { mean, std };
        });

        logger.info(`Computed normalization params for ${featureNames.length} features`);

        return params;
    }

    /**
     * Save normalization parameters for inference
     * @param {ObjectId} firmId - Firm ID
     * @param {Object} params - Normalization parameters
     */
    async saveNormalizationParams(firmId, params) {
        try {
            // Save to LeadScoringConfig as custom field
            const config = await LeadScoringConfig.findOne({ firmId });
            if (!config) {
                throw new Error('Lead scoring config not found');
            }

            // Store in metadata field
            if (!config.metadata) {
                config.metadata = {};
            }

            config.metadata.normalizationParams = {
                ...params,
                createdAt: new Date(),
                version: '1.0'
            };

            await config.save();

            logger.info(`Saved normalization params for firm ${firmId}`);

            return { success: true, firmId };
        } catch (error) {
            logger.error('Error saving normalization params:', error);
            throw error;
        }
    }

    /**
     * Load normalization parameters
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Normalization parameters
     */
    async loadNormalizationParams(firmId) {
        try {
            const config = await LeadScoringConfig.findOne({ firmId });
            if (!config || !config.metadata?.normalizationParams) {
                throw new Error('Normalization parameters not found');
            }

            return config.metadata.normalizationParams;
        } catch (error) {
            logger.error('Error loading normalization params:', error);
            throw error;
        }
    }

    /**
     * Export training data to CSV/JSON for external ML tools
     * @param {ObjectId} firmId - Firm ID
     * @param {String} format - Export format ('json' or 'csv')
     * @returns {String|Object} Exported data
     */
    async exportTrainingData(firmId, format = 'json') {
        try {
            const result = await this.extractTrainingData(firmId);

            if (!result.success || result.data.length === 0) {
                throw new Error('No training data available');
            }

            if (format === 'json') {
                return {
                    format: 'json',
                    metadata: {
                        firmId,
                        exportedAt: new Date(),
                        totalSamples: result.data.length,
                        stats: result.stats
                    },
                    data: result.data
                };
            }

            if (format === 'csv') {
                // Convert to CSV format
                const headers = ['label', ...Object.keys(result.data[0].features)];
                const rows = result.data.map(d => [
                    d.label,
                    ...Object.values(d.features)
                ]);

                const csvContent = [
                    headers.join(','),
                    ...rows.map(row => row.join(','))
                ].join('\n');

                return {
                    format: 'csv',
                    metadata: {
                        firmId,
                        exportedAt: new Date(),
                        totalSamples: result.data.length,
                        stats: result.stats
                    },
                    content: csvContent
                };
            }

            throw new Error(`Unsupported format: ${format}`);
        } catch (error) {
            logger.error('Error exporting training data:', error);
            throw error;
        }
    }

    /**
     * Get training data statistics
     * - totalSamples
     * - positiveRate
     * - featureDistributions
     * - missingValueRates
     * @param {Array} data - Training data
     * @returns {Object} Statistics
     */
    getDataStatistics(data) {
        if (!data || data.length === 0) {
            return {
                totalSamples: 0,
                positiveCount: 0,
                negativeCount: 0,
                positiveRate: 0,
                classBalance: 'N/A'
            };
        }

        const positiveCount = data.filter(d => d.label === 1).length;
        const negativeCount = data.filter(d => d.label === 0).length;
        const positiveRate = positiveCount / data.length;

        // Feature statistics
        const featureNames = Object.keys(data[0].features);
        const featureStats = {};

        featureNames.forEach(featureName => {
            const values = data.map(d => d.features[featureName]);
            const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));

            if (numericValues.length > 0) {
                featureStats[featureName] = {
                    min: Math.min(...numericValues),
                    max: Math.max(...numericValues),
                    mean: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
                    missing: values.length - numericValues.length,
                    missingRate: (values.length - numericValues.length) / values.length
                };
            }
        });

        // Time to conversion statistics (for converted leads)
        const convertedLeads = data.filter(d => d.label === 1 && d.metadata.timeToConversion);
        const avgTimeToConversion = convertedLeads.length > 0
            ? convertedLeads.reduce((sum, d) => sum + d.metadata.timeToConversion, 0) / convertedLeads.length
            : null;

        return {
            totalSamples: data.length,
            positiveCount,
            negativeCount,
            positiveRate: (positiveRate * 100).toFixed(2) + '%',
            classBalance: positiveRate > 0.4 && positiveRate < 0.6 ? 'balanced' : 'imbalanced',
            imbalanceRatio: positiveCount > 0 ? (negativeCount / positiveCount).toFixed(2) : 'N/A',
            featureCount: featureNames.length,
            avgTimeToConversion: avgTimeToConversion ? Math.round(avgTimeToConversion) : null,
            featureStats: Object.keys(featureStats).length > 20
                ? { message: `${Object.keys(featureStats).length} features computed` }
                : featureStats
        };
    }

    /**
     * Validate data quality
     * Check for missing values, outliers, data drift
     * @param {Array} data - Training data
     * @returns {Object} Validation results
     */
    validateDataQuality(data) {
        const issues = [];
        const warnings = [];

        if (!data || data.length === 0) {
            issues.push('No data provided');
            return { isValid: false, issues, warnings };
        }

        // Check minimum samples
        if (data.length < 50) {
            warnings.push(`Small dataset: Only ${data.length} samples (recommended: 50+)`);
        }

        // Check class balance
        const positiveCount = data.filter(d => d.label === 1).length;
        const negativeCount = data.filter(d => d.label === 0).length;
        const positiveRate = positiveCount / data.length;

        if (positiveRate < 0.1 || positiveRate > 0.9) {
            warnings.push(`Severe class imbalance: ${(positiveRate * 100).toFixed(1)}% positive samples`);
        }

        if (positiveCount < 5 || negativeCount < 5) {
            issues.push('Insufficient samples in one or both classes (minimum: 5 per class)');
        }

        // Check for missing values
        const featureNames = Object.keys(data[0].features);
        const missingValueRates = {};

        featureNames.forEach(featureName => {
            const values = data.map(d => d.features[featureName]);
            const missingCount = values.filter(v => v === null || v === undefined || (typeof v === 'number' && isNaN(v))).length;
            const missingRate = missingCount / values.length;

            if (missingRate > 0) {
                missingValueRates[featureName] = (missingRate * 100).toFixed(2) + '%';

                if (missingRate > 0.5) {
                    warnings.push(`High missing value rate in '${featureName}': ${(missingRate * 100).toFixed(1)}%`);
                }
            }
        });

        // Check for constant features
        featureNames.forEach(featureName => {
            const values = data.map(d => d.features[featureName]);
            const uniqueValues = new Set(values);

            if (uniqueValues.size === 1) {
                warnings.push(`Constant feature detected: '${featureName}' (no variance)`);
            }
        });

        // Check for outliers (simple IQR method for numeric features)
        const outlierFeatures = [];
        featureNames.forEach(featureName => {
            const values = data.map(d => d.features[featureName]).filter(v => typeof v === 'number' && !isNaN(v));

            if (values.length > 0) {
                const sorted = values.slice().sort((a, b) => a - b);
                const q1 = sorted[Math.floor(sorted.length * 0.25)];
                const q3 = sorted[Math.floor(sorted.length * 0.75)];
                const iqr = q3 - q1;
                const lowerBound = q1 - 1.5 * iqr;
                const upperBound = q3 + 1.5 * iqr;

                const outlierCount = values.filter(v => v < lowerBound || v > upperBound).length;
                const outlierRate = outlierCount / values.length;

                if (outlierRate > 0.05) {
                    outlierFeatures.push({
                        feature: featureName,
                        outlierRate: (outlierRate * 100).toFixed(2) + '%'
                    });
                }
            }
        });

        if (outlierFeatures.length > 0) {
            warnings.push(`Features with outliers (>5%): ${outlierFeatures.map(f => f.feature).join(', ')}`);
        }

        const isValid = issues.length === 0;

        return {
            isValid,
            issues,
            warnings,
            stats: {
                totalSamples: data.length,
                positiveRate: (positiveRate * 100).toFixed(2) + '%',
                featureCount: featureNames.length,
                missingValueRates,
                outlierFeatures
            }
        };
    }

    /**
     * Generate synthetic training examples for rare cases
     * Simple SMOTE-like approach
     * @param {Array} data - Training data
     * @param {Number} targetClass - Class to generate (0 or 1)
     * @param {Number} count - Number of synthetic examples to generate
     * @returns {Array} Synthetic examples
     */
    generateSyntheticExamples(data, targetClass, count) {
        const classData = data.filter(d => d.label === targetClass);

        if (classData.length < 2) {
            logger.warn('Not enough samples to generate synthetic examples');
            return [];
        }

        const synthetic = [];
        const featureNames = Object.keys(classData[0].features);

        for (let i = 0; i < count; i++) {
            // Randomly select two samples from the class
            const idx1 = Math.floor(Math.random() * classData.length);
            let idx2 = Math.floor(Math.random() * classData.length);
            while (idx2 === idx1) {
                idx2 = Math.floor(Math.random() * classData.length);
            }

            const sample1 = classData[idx1];
            const sample2 = classData[idx2];

            // Create synthetic sample by interpolating
            const syntheticFeatures = {};
            const alpha = Math.random(); // Random weight between 0 and 1

            featureNames.forEach(featureName => {
                const val1 = sample1.features[featureName];
                const val2 = sample2.features[featureName];

                if (typeof val1 === 'number' && typeof val2 === 'number') {
                    // Numeric: interpolate
                    syntheticFeatures[featureName] = val1 + alpha * (val2 - val1);
                } else {
                    // Categorical: randomly choose one
                    syntheticFeatures[featureName] = Math.random() > 0.5 ? val1 : val2;
                }
            });

            synthetic.push({
                features: syntheticFeatures,
                label: targetClass,
                metadata: {
                    synthetic: true,
                    generatedFrom: [sample1.metadata.leadId, sample2.metadata.leadId],
                    generatedAt: new Date()
                }
            });
        }

        logger.info(`Generated ${synthetic.length} synthetic examples for class ${targetClass}`);

        return synthetic;
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    _randomSample(array, count) {
        const shuffled = [...array];
        this._shuffleArray(shuffled);
        return shuffled.slice(0, count);
    }

    _oversample(array, targetCount) {
        if (array.length >= targetCount) {
            return array;
        }

        const result = [...array];
        while (result.length < targetCount) {
            const randomIndex = Math.floor(Math.random() * array.length);
            result.push({ ...array[randomIndex] }); // Clone the sample
        }
        return result;
    }

    _shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    _getSetStats(dataSet) {
        const positiveCount = dataSet.filter(d => d.label === 1).length;
        return {
            total: dataSet.length,
            positive: positiveCount,
            negative: dataSet.length - positiveCount,
            positiveRate: dataSet.length > 0 ? (positiveCount / dataSet.length * 100).toFixed(2) + '%' : '0%'
        };
    }
}

module.exports = new MLTrainingDataService();
