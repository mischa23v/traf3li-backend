const synaptic = require('synaptic');
const { Layer, Network, Trainer, Architect } = synaptic;
const Lead = require('../models/lead.model');
const LeadScore = require('../models/leadScore.model');
const CrmActivity = require('../models/crmActivity.model');
const LeadScoringService = require('./leadScoring.service');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

/**
 * ML Lead Scoring Service
 * Uses neural network for propensity prediction
 *
 * Model Architecture:
 * - Input: 15 features from MLFeatureEngineering
 * - Hidden layers: [32, 16, 8]
 * - Output: Conversion probability (0-1)
 *
 * Uses synaptic for neural network (pure JavaScript, no GPU required)
 */

class MLLeadScoringService {
    constructor() {
        this.model = null;
        this.modelVersion = '1.0.0';
        this.featureConfig = {
            // Feature names and their importance weights (learned during training)
            features: [
                'engagementVelocity',
                'responseSpeedPercentile',
                'meetingReliability',
                'crossChannelEngagement',
                'urgencySignal',
                'decisionMakerAccess',
                'budgetTimelineFit',
                'activitiesLast7d',
                'activityTrend',
                'daysInCurrentStatus',
                'sourceConversionRate',
                'demographicScore',
                'bantScore',
                'behavioralScore',
                'engagementScore'
            ],
            // Feature importance weights (updated after training)
            importance: {}
        };
        this.calibrationCurve = null;
        this.modelMetrics = {
            accuracy: 0,
            precision: 0,
            recall: 0,
            f1Score: 0,
            auc: 0,
            trainingSize: 0,
            lastTrained: null,
            iterations: 0
        };
    }

    /**
     * Initialize or load the neural network model
     */
    async initializeModel() {
        try {
            // Try to load existing model
            const loaded = await this.loadModel();
            if (loaded) {
                logger.info('ML Lead Scoring model loaded successfully');
                return true;
            }

            // Create new neural network if no saved model
            // Using synaptic Perceptron with architecture: 15 inputs -> 32 -> 16 -> 8 -> 1 output
            const inputSize = this.featureConfig.features.length; // 15 features
            this.model = new Architect.Perceptron(inputSize, 32, 16, 8, 1);

            // Create trainer with default options
            this.trainer = new Trainer(this.model);

            logger.info('New ML Lead Scoring model initialized with synaptic');
            return true;
        } catch (error) {
            logger.error('Error initializing ML model:', error);
            throw error;
        }
    }

    /**
     * Extract features from a lead for ML prediction
     * @private
     */
    async extractFeatures(leadId, firmId) {
        try {
            // SECURITY: Validate lead belongs to the requesting firm
            // Prevents cross-firm lead data extraction
            const lead = await Lead.findOne({ _id: leadId, firmId });
            if (!lead) {
                throw new Error('Lead not found or access denied');
            }

            const leadScore = await LeadScore.findOne({ leadId, firmId });
            const activities = await CrmActivity.find({
                entityType: 'lead',
                entityId: leadId,
                firmId
            }).sort({ createdAt: -1 });

            const now = Date.now();
            const daysSinceCreated = Math.floor((now - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);
            const last30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);

            // ═══════════════════════════════════════════════════════════════
            // ENGAGEMENT VELOCITY - Rate of activity increase
            // ═══════════════════════════════════════════════════════════════
            const activitiesLast7d = activities.filter(a => a.createdAt >= last7Days).length;
            const activitiesLast30d = activities.filter(a => a.createdAt >= last30Days).length;
            const engagementVelocity = activitiesLast7d > 0
                ? (activitiesLast7d / 7) / Math.max(1, (activitiesLast30d - activitiesLast7d) / 23)
                : 0;

            // ═══════════════════════════════════════════════════════════════
            // RESPONSE SPEED PERCENTILE - How quickly lead responds
            // ═══════════════════════════════════════════════════════════════
            const responseTimes = [];
            for (let i = 0; i < activities.length - 1; i++) {
                const timeDiff = (activities[i].createdAt - activities[i + 1].createdAt) / (1000 * 60 * 60);
                if (timeDiff > 0 && timeDiff < 168) { // Within a week
                    responseTimes.push(timeDiff);
                }
            }
            const avgResponseHours = responseTimes.length > 0
                ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
                : 48;
            const responseSpeedPercentile = Math.max(0, Math.min(1, 1 - (avgResponseHours / 48)));

            // ═══════════════════════════════════════════════════════════════
            // MEETING RELIABILITY - Attendance rate
            // ═══════════════════════════════════════════════════════════════
            const meetings = activities.filter(a => a.type === 'meeting');
            const attended = meetings.filter(a => a.meetingData?.outcome === 'completed').length;
            const meetingReliability = meetings.length > 0 ? attended / meetings.length : 0.5;

            // ═══════════════════════════════════════════════════════════════
            // CROSS-CHANNEL ENGAGEMENT - Using multiple channels
            // ═══════════════════════════════════════════════════════════════
            const channels = new Set(activities.map(a => a.type));
            const crossChannelEngagement = Math.min(1, channels.size / 5); // Normalize to 0-1

            // ═══════════════════════════════════════════════════════════════
            // URGENCY SIGNAL - Timeline and priority indicators
            // ═══════════════════════════════════════════════════════════════
            const urgencyScore = {
                'urgent': 1.0,
                'high': 0.8,
                'normal': 0.5,
                'low': 0.3
            };
            const timelineScore = {
                'immediate': 1.0,
                'this_month': 0.8,
                'this_quarter': 0.6,
                'this_year': 0.4,
                'no_timeline': 0.1,
                'unknown': 0.2
            };
            const urgencySignal = (
                (urgencyScore[lead.intake?.urgency] || 0.5) * 0.5 +
                (timelineScore[lead.qualification?.timeline] || 0.2) * 0.5
            );

            // ═══════════════════════════════════════════════════════════════
            // DECISION MAKER ACCESS - Authority level
            // ═══════════════════════════════════════════════════════════════
            const authorityScore = {
                'decision_maker': 1.0,
                'influencer': 0.7,
                'researcher': 0.4,
                'unknown': 0.3
            };
            const decisionMakerAccess = authorityScore[lead.qualification?.authority] || 0.3;

            // ═══════════════════════════════════════════════════════════════
            // BUDGET-TIMELINE FIT - Budget and timeline alignment
            // ═══════════════════════════════════════════════════════════════
            const budgetScore = {
                'premium': 1.0,
                'high': 0.8,
                'medium': 0.6,
                'low': 0.4,
                'unknown': 0.2
            };
            const budgetTimelineFit = (
                (budgetScore[lead.qualification?.budget] || 0.2) * 0.6 +
                (timelineScore[lead.qualification?.timeline] || 0.2) * 0.4
            );

            // ═══════════════════════════════════════════════════════════════
            // ACTIVITY TREND - Increasing or decreasing engagement
            // ═══════════════════════════════════════════════════════════════
            const prevWeekActivities = activities.filter(a => {
                const date = a.createdAt.getTime();
                return date >= (now - 14 * 24 * 60 * 60 * 1000) && date < (now - 7 * 24 * 60 * 60 * 1000);
            }).length;
            const activityTrend = prevWeekActivities > 0
                ? activitiesLast7d / prevWeekActivities
                : (activitiesLast7d > 0 ? 1.5 : 0.5);

            // ═══════════════════════════════════════════════════════════════
            // DAYS IN CURRENT STATUS - Status stagnation
            // ═══════════════════════════════════════════════════════════════
            const statusChangeActivities = activities.filter(a => a.type === 'status_change');
            const lastStatusChange = statusChangeActivities.length > 0
                ? statusChangeActivities[0].createdAt
                : lead.createdAt;
            const daysInCurrentStatus = Math.floor((now - lastStatusChange.getTime()) / (1000 * 60 * 60 * 24));
            const statusStagnation = Math.min(1, daysInCurrentStatus / 60); // Normalize to 60 days

            // ═══════════════════════════════════════════════════════════════
            // SOURCE CONVERSION RATE - Historical source performance
            // ═══════════════════════════════════════════════════════════════
            const sourceType = lead.source?.type || 'other';
            const sourceStats = await Lead.aggregate([
                {
                    $match: {
                        firmId: lead.firmId,
                        'source.type': sourceType
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        converted: {
                            $sum: { $cond: ['$convertedToClient', 1, 0] }
                        }
                    }
                }
            ]);
            const sourceConversionRate = sourceStats.length > 0 && sourceStats[0].total > 0
                ? sourceStats[0].converted / sourceStats[0].total
                : 0.15; // Default baseline

            // ═══════════════════════════════════════════════════════════════
            // RULE-BASED SCORES (from existing system)
            // ═══════════════════════════════════════════════════════════════
            const demographicScore = leadScore?.breakdown?.demographic?.score || 0;
            const bantScore = leadScore?.breakdown?.bant?.score || 0;
            const behavioralScore = leadScore?.breakdown?.behavioral?.score || 0;
            const engagementScore = leadScore?.breakdown?.engagement?.score || 0;

            // ═══════════════════════════════════════════════════════════════
            // RETURN NORMALIZED FEATURES (all 0-1 scale)
            // ═══════════════════════════════════════════════════════════════
            return {
                engagementVelocity: Math.min(1, engagementVelocity),
                responseSpeedPercentile,
                meetingReliability,
                crossChannelEngagement,
                urgencySignal,
                decisionMakerAccess,
                budgetTimelineFit,
                activitiesLast7d: Math.min(1, activitiesLast7d / 10),
                activityTrend: Math.min(1, activityTrend),
                daysInCurrentStatus: 1 - statusStagnation, // Invert so newer is higher
                sourceConversionRate,
                demographicScore: demographicScore / 100,
                bantScore: bantScore / 100,
                behavioralScore: behavioralScore / 100,
                engagementScore: engagementScore / 100
            };
        } catch (error) {
            logger.error('Error extracting features:', error);
            throw error;
        }
    }

    /**
     * Train the model on historical data
     * @param trainingData Array of { features, converted }
     */
    async trainModel(firmId, options = {}) {
        try {
            logger.info(`Starting ML model training for firm ${firmId}`);

            // Initialize model if not already done
            if (!this.model) {
                await this.initializeModel();
            }

            // ═══════════════════════════════════════════════════════════════
            // GATHER TRAINING DATA
            // ═══════════════════════════════════════════════════════════════
            const minLeads = options.minLeads || 50;
            const includeInProgress = options.includeInProgress || false;

            // Get converted leads (positive examples)
            const convertedLeads = await Lead.find({
                firmId,
                convertedToClient: true,
                convertedAt: { $exists: true }
            }).limit(500);

            // Get lost leads (negative examples)
            const lostLeads = await Lead.find({
                firmId,
                status: 'lost',
                convertedToClient: false
            }).limit(500);

            // Optionally include in-progress leads for semi-supervised learning
            let inProgressLeads = [];
            if (includeInProgress) {
                inProgressLeads = await Lead.find({
                    firmId,
                    status: { $nin: ['won', 'lost'] },
                    convertedToClient: false,
                    createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // At least 30 days old
                }).limit(200);
            }

            const allLeads = [...convertedLeads, ...lostLeads, ...inProgressLeads];

            if (allLeads.length < minLeads) {
                throw new Error(`Insufficient training data. Need at least ${minLeads} leads, found ${allLeads.length}`);
            }

            logger.info(`Training with ${allLeads.length} leads (${convertedLeads.length} converted, ${lostLeads.length} lost, ${inProgressLeads.length} in-progress)`);

            // ═══════════════════════════════════════════════════════════════
            // EXTRACT FEATURES FOR ALL LEADS
            // ═══════════════════════════════════════════════════════════════
            const trainingData = [];
            const validationData = [];

            for (let i = 0; i < allLeads.length; i++) {
                const lead = allLeads[i];
                try {
                    const features = await this.extractFeatures(lead._id, firmId);
                    const output = { converted: lead.convertedToClient ? 1 : 0 };

                    const dataPoint = {
                        input: features,
                        output
                    };

                    // 80/20 train/validation split
                    if (Math.random() < 0.8) {
                        trainingData.push(dataPoint);
                    } else {
                        validationData.push(dataPoint);
                    }
                } catch (error) {
                    logger.warn(`Error extracting features for lead ${lead._id}:`, error.message);
                }
            }

            if (trainingData.length === 0) {
                throw new Error('No valid training data extracted');
            }

            logger.info(`Training set: ${trainingData.length}, Validation set: ${validationData.length}`);

            // ═══════════════════════════════════════════════════════════════
            // TRAIN NEURAL NETWORK (using synaptic)
            // ═══════════════════════════════════════════════════════════════
            const startTime = Date.now();

            // Format data for synaptic (input/output as arrays)
            const synapticTrainingData = trainingData.map(d => ({
                input: Object.values(d.input),
                output: [d.output.converted]
            }));

            // Create trainer if not exists
            if (!this.trainer) {
                this.trainer = new Trainer(this.model);
            }

            // Train with synaptic
            const trainingStats = this.trainer.train(synapticTrainingData, {
                rate: options.learningRate || 0.1,
                iterations: options.iterations || 20000,
                error: options.errorThresh || 0.005,
                shuffle: true,
                log: 1000,
                cost: Trainer.cost.CROSS_ENTROPY
            });

            const trainingTime = ((Date.now() - startTime) / 1000).toFixed(2);
            logger.info(`Training completed in ${trainingTime}s, final error: ${trainingStats.error.toFixed(4)}`);

            // ═══════════════════════════════════════════════════════════════
            // VALIDATE MODEL
            // ═══════════════════════════════════════════════════════════════
            if (validationData.length > 0) {
                const metrics = this.calculateMetrics(validationData);
                this.modelMetrics = {
                    ...metrics,
                    trainingSize: trainingData.length,
                    validationSize: validationData.length,
                    lastTrained: new Date(),
                    iterations: trainingStats.iterations,
                    finalError: trainingStats.error,
                    trainingTime: parseFloat(trainingTime)
                };

                logger.info('Model Validation Metrics:', this.modelMetrics);
            }

            // ═══════════════════════════════════════════════════════════════
            // CALIBRATE PROBABILITIES
            // ═══════════════════════════════════════════════════════════════
            await this.calibrateModel(validationData);

            // ═══════════════════════════════════════════════════════════════
            // CALCULATE FEATURE IMPORTANCE
            // ═══════════════════════════════════════════════════════════════
            await this.calculateFeatureImportance(trainingData);

            // ═══════════════════════════════════════════════════════════════
            // SAVE MODEL
            // ═══════════════════════════════════════════════════════════════
            await this.saveModel(firmId);

            logger.info('ML Lead Scoring model training completed successfully');

            return {
                success: true,
                metrics: this.modelMetrics,
                trainingSize: trainingData.length,
                validationSize: validationData.length
            };

        } catch (error) {
            logger.error('Error training ML model:', error);
            throw error;
        }
    }

    /**
     * Calculate model performance metrics
     * @private
     */
    calculateMetrics(validationData) {
        let tp = 0, fp = 0, tn = 0, fn = 0;

        validationData.forEach(data => {
            const inputArray = Array.isArray(data.input) ? data.input : Object.values(data.input);
            const prediction = this.model.activate(inputArray);
            const predicted = prediction[0] >= 0.5 ? 1 : 0;
            const actual = Array.isArray(data.output) ? data.output[0] : data.output.converted;

            if (predicted === 1 && actual === 1) tp++;
            else if (predicted === 1 && actual === 0) fp++;
            else if (predicted === 0 && actual === 0) tn++;
            else if (predicted === 0 && actual === 1) fn++;
        });

        const accuracy = (tp + tn) / (tp + tn + fp + fn);
        const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
        const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
        const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

        return {
            accuracy: parseFloat((accuracy * 100).toFixed(2)),
            precision: parseFloat((precision * 100).toFixed(2)),
            recall: parseFloat((recall * 100).toFixed(2)),
            f1Score: parseFloat((f1Score * 100).toFixed(2)),
            truePositives: tp,
            falsePositives: fp,
            trueNegatives: tn,
            falseNegatives: fn
        };
    }

    /**
     * Calibrate probabilities using isotonic regression
     * Maps raw probabilities to calibrated probabilities
     */
    async calibrateModel(validationData) {
        try {
            if (!validationData || validationData.length === 0) {
                logger.warn('No validation data for calibration');
                return;
            }

            // Get predictions and actual outcomes
            const predictions = validationData.map(data => {
                const inputArray = Array.isArray(data.input) ? data.input : Object.values(data.input);
                return {
                    predicted: this.model.activate(inputArray)[0],
                    actual: Array.isArray(data.output) ? data.output[0] : data.output.converted
                };
            });

            // Sort by predicted probability
            predictions.sort((a, b) => a.predicted - b.predicted);

            // Create calibration curve (binned)
            const bins = 10;
            const binSize = Math.ceil(predictions.length / bins);
            this.calibrationCurve = [];

            for (let i = 0; i < bins; i++) {
                const start = i * binSize;
                const end = Math.min((i + 1) * binSize, predictions.length);
                const binData = predictions.slice(start, end);

                if (binData.length > 0) {
                    const avgPredicted = binData.reduce((sum, d) => sum + d.predicted, 0) / binData.length;
                    const avgActual = binData.reduce((sum, d) => sum + d.actual, 0) / binData.length;

                    this.calibrationCurve.push({
                        predicted: avgPredicted,
                        calibrated: avgActual
                    });
                }
            }

            logger.info('Probability calibration completed');
        } catch (error) {
            logger.error('Error calibrating model:', error);
        }
    }

    /**
     * Calibrate a single probability value
     */
    calibrateProbability(rawProbability) {
        if (!this.calibrationCurve || this.calibrationCurve.length === 0) {
            return rawProbability; // No calibration available
        }

        // Find the two closest calibration points
        let lower = this.calibrationCurve[0];
        let upper = this.calibrationCurve[this.calibrationCurve.length - 1];

        for (let i = 0; i < this.calibrationCurve.length - 1; i++) {
            if (rawProbability >= this.calibrationCurve[i].predicted &&
                rawProbability <= this.calibrationCurve[i + 1].predicted) {
                lower = this.calibrationCurve[i];
                upper = this.calibrationCurve[i + 1];
                break;
            }
        }

        // Linear interpolation
        if (lower.predicted === upper.predicted) {
            return lower.calibrated;
        }

        const ratio = (rawProbability - lower.predicted) / (upper.predicted - lower.predicted);
        return lower.calibrated + ratio * (upper.calibrated - lower.calibrated);
    }

    /**
     * Calculate feature importance using permutation
     * @private
     */
    async calculateFeatureImportance(trainingData) {
        try {
            const baselineError = this.calculateError(trainingData);
            const importance = {};

            // For each feature, permute it and measure error increase
            for (const featureName of this.featureConfig.features) {
                const permutedData = trainingData.map(data => {
                    const permuted = { ...data };
                    permuted.input = { ...data.input };
                    // Randomize this feature
                    permuted.input[featureName] = Math.random();
                    return permuted;
                });

                const permutedError = this.calculateError(permutedData);
                importance[featureName] = permutedError - baselineError;
            }

            // Normalize to percentages
            const totalImportance = Object.values(importance).reduce((sum, val) => sum + Math.abs(val), 0);
            if (totalImportance > 0) {
                Object.keys(importance).forEach(key => {
                    importance[key] = parseFloat(((Math.abs(importance[key]) / totalImportance) * 100).toFixed(2));
                });
            }

            this.featureConfig.importance = importance;
            logger.info('Feature importance calculated:', importance);
        } catch (error) {
            logger.error('Error calculating feature importance:', error);
        }
    }

    /**
     * Calculate mean squared error
     * @private
     */
    calculateError(data) {
        let totalError = 0;
        data.forEach(item => {
            const inputArray = Array.isArray(item.input) ? item.input : Object.values(item.input);
            const prediction = this.model.activate(inputArray);
            const actual = Array.isArray(item.output) ? item.output[0] : item.output.converted;
            const error = Math.pow(prediction[0] - actual, 2);
            totalError += error;
        });
        return totalError / data.length;
    }

    /**
     * Predict conversion probability for a lead
     * @returns { probability, confidence, features }
     */
    async predict(leadId, firmId) {
        try {
            // Initialize model if needed
            if (!this.model) {
                const initialized = await this.initializeModel();
                if (!initialized) {
                    throw new Error('Model not initialized and no saved model found');
                }
            }

            // Extract features
            const features = await this.extractFeatures(leadId, firmId);

            // Get raw prediction (synaptic uses activate() and returns array)
            const featureArray = Object.values(features);
            const rawOutput = this.model.activate(featureArray);
            const rawProbability = rawOutput[0];

            // Calibrate probability
            const calibratedProbability = this.calibrateProbability(rawProbability);

            // Calculate confidence based on feature quality
            const featureQuality = Object.values(features).filter(v => v > 0.1).length / Object.keys(features).length;
            const confidence = featureQuality >= 0.7 ? 'high' : featureQuality >= 0.4 ? 'medium' : 'low';

            return {
                probability: parseFloat((calibratedProbability * 100).toFixed(2)),
                rawProbability: parseFloat((rawProbability * 100).toFixed(2)),
                confidence,
                features,
                modelVersion: this.modelVersion,
                predictedAt: new Date()
            };
        } catch (error) {
            logger.error('Error predicting lead conversion:', error);
            throw error;
        }
    }

    /**
     * Batch predict for multiple leads
     */
    async batchPredict(leadIds, firmId) {
        try {
            const predictions = [];

            for (const leadId of leadIds) {
                try {
                    const prediction = await this.predict(leadId, firmId);
                    predictions.push({
                        leadId,
                        ...prediction,
                        success: true
                    });
                } catch (error) {
                    predictions.push({
                        leadId,
                        success: false,
                        error: error.message
                    });
                }
            }

            return predictions;
        } catch (error) {
            logger.error('Error in batch prediction:', error);
            throw error;
        }
    }

    /**
     * Generate SHAP-like explanations
     * Compute feature contributions to final score
     */
    async generateExplanation(leadId, features, prediction) {
        try {
            // If features not provided, extract them
            if (!features) {
                const lead = await Lead.findById(leadId);
                features = await this.extractFeatures(leadId, lead.firmId);
            }

            // Calculate feature contributions
            const contributions = {};
            const baselineProbability = 0.15; // Average conversion rate

            for (const [featureName, featureValue] of Object.entries(features)) {
                // Create modified input with this feature set to baseline (0.5)
                const modifiedInput = { ...features, [featureName]: 0.5 };
                const modifiedInputArray = Object.values(modifiedInput);
                const modifiedOutput = this.model.activate(modifiedInputArray);

                // Contribution is the difference
                const contribution = (prediction.rawProbability / 100) - modifiedOutput[0];
                contributions[featureName] = parseFloat((contribution * 100).toFixed(2));
            }

            // Sort by absolute contribution
            const sortedContributions = Object.entries(contributions)
                .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a));

            // Identify top positive and negative factors
            const positiveFactors = sortedContributions
                .filter(([, value]) => value > 0)
                .slice(0, 5)
                .map(([name, value]) => ({
                    feature: name,
                    contribution: value,
                    importance: this.featureConfig.importance[name] || 0,
                    description: this.getFeatureDescription(name, features[name], 'positive')
                }));

            const negativeFactors = sortedContributions
                .filter(([, value]) => value < 0)
                .slice(0, 5)
                .map(([name, value]) => ({
                    feature: name,
                    contribution: value,
                    importance: this.featureConfig.importance[name] || 0,
                    description: this.getFeatureDescription(name, features[name], 'negative')
                }));

            // Generate sales-friendly summary
            const summary = this.generateSalesSummary(prediction.probability, positiveFactors, negativeFactors);

            return {
                probability: prediction.probability,
                confidence: prediction.confidence,
                positiveFactors,
                negativeFactors,
                allContributions: contributions,
                summary,
                recommendations: this.generateRecommendations(positiveFactors, negativeFactors)
            };
        } catch (error) {
            logger.error('Error generating explanation:', error);
            throw error;
        }
    }

    /**
     * Get human-readable description for a feature
     * @private
     */
    getFeatureDescription(featureName, featureValue, impact) {
        const descriptions = {
            engagementVelocity: {
                positive: 'Lead shows increasing engagement over time',
                negative: 'Lead engagement is declining'
            },
            responseSpeedPercentile: {
                positive: 'Lead responds quickly to communications',
                negative: 'Lead is slow to respond'
            },
            meetingReliability: {
                positive: 'Lead consistently attends scheduled meetings',
                negative: 'Lead has missed scheduled meetings'
            },
            crossChannelEngagement: {
                positive: 'Lead engages through multiple channels',
                negative: 'Limited communication channels used'
            },
            urgencySignal: {
                positive: 'Lead has expressed urgent timeline',
                negative: 'No clear urgency or timeline'
            },
            decisionMakerAccess: {
                positive: 'Direct access to decision maker',
                negative: 'Limited decision-making authority'
            },
            budgetTimelineFit: {
                positive: 'Strong budget and timeline alignment',
                negative: 'Unclear budget or timeline'
            },
            activitiesLast7d: {
                positive: 'High recent activity level',
                negative: 'Low recent engagement'
            },
            activityTrend: {
                positive: 'Activity trending upward',
                negative: 'Activity trending downward'
            },
            daysInCurrentStatus: {
                positive: 'Recently progressed in pipeline',
                negative: 'Stalled in current stage'
            },
            sourceConversionRate: {
                positive: 'Lead source has strong conversion history',
                negative: 'Lead source has weak conversion history'
            },
            demographicScore: {
                positive: 'Strong demographic fit',
                negative: 'Weak demographic alignment'
            },
            bantScore: {
                positive: 'High BANT qualification score',
                negative: 'Low BANT qualification'
            },
            behavioralScore: {
                positive: 'Strong behavioral indicators',
                negative: 'Weak behavioral engagement'
            },
            engagementScore: {
                positive: 'High overall engagement',
                negative: 'Low overall engagement'
            }
        };

        return descriptions[featureName]?.[impact] || `${featureName}: ${featureValue.toFixed(2)}`;
    }

    /**
     * Generate sales-friendly summary
     * @private
     */
    generateSalesSummary(probability, positiveFactors, negativeFactors) {
        let summary = '';

        if (probability >= 70) {
            summary = '🔥 HOT LEAD: High conversion probability. ';
        } else if (probability >= 50) {
            summary = '🌡️ WARM LEAD: Good conversion potential. ';
        } else if (probability >= 30) {
            summary = '❄️ COOL LEAD: Moderate conversion potential. ';
        } else {
            summary = '🧊 COLD LEAD: Low conversion probability. ';
        }

        if (positiveFactors.length > 0) {
            summary += `Key strengths: ${positiveFactors[0].description}. `;
        }

        if (negativeFactors.length > 0) {
            summary += `Main concern: ${negativeFactors[0].description}. `;
        }

        return summary;
    }

    /**
     * Generate actionable recommendations
     * @private
     */
    generateRecommendations(positiveFactors, negativeFactors) {
        const recommendations = [];

        // Based on negative factors, suggest actions
        negativeFactors.forEach(factor => {
            switch (factor.feature) {
                case 'responseSpeedPercentile':
                    recommendations.push('Schedule a follow-up call to re-engage');
                    break;
                case 'meetingReliability':
                    recommendations.push('Send meeting confirmations and reminders');
                    break;
                case 'urgencySignal':
                    recommendations.push('Clarify timeline and urgency in next conversation');
                    break;
                case 'decisionMakerAccess':
                    recommendations.push('Request introduction to decision maker');
                    break;
                case 'budgetTimelineFit':
                    recommendations.push('Conduct budget qualification discussion');
                    break;
                case 'activityTrend':
                    recommendations.push('Increase touchpoint frequency');
                    break;
            }
        });

        // Based on positive factors, reinforce
        positiveFactors.forEach(factor => {
            switch (factor.feature) {
                case 'urgencySignal':
                    recommendations.push('Fast-track proposal preparation');
                    break;
                case 'decisionMakerAccess':
                    recommendations.push('Schedule executive-level consultation');
                    break;
                case 'engagementVelocity':
                    recommendations.push('Strike while iron is hot - send proposal ASAP');
                    break;
            }
        });

        return [...new Set(recommendations)].slice(0, 5); // Unique, max 5
    }

    /**
     * Combine ML score with rule-based score
     * Weighted ensemble approach
     */
    async hybridScore(leadId, firmId, weights = { ml: 0.6, rules: 0.4 }) {
        try {
            // Get ML prediction
            const mlPrediction = await this.predict(leadId, firmId);

            // Get rule-based score
            const leadScore = await LeadScore.findOne({ leadId });
            const ruleBasedScore = leadScore?.totalScore || 50;

            // Weighted ensemble
            const hybridScore = (
                mlPrediction.probability * weights.ml +
                ruleBasedScore * weights.rules
            );

            // Generate explanation
            const explanation = await this.generateExplanation(leadId, mlPrediction.features, mlPrediction);

            return {
                hybridScore: parseFloat(hybridScore.toFixed(2)),
                mlScore: mlPrediction.probability,
                ruleBasedScore,
                weights,
                confidence: mlPrediction.confidence,
                explanation,
                method: 'weighted_ensemble',
                calculatedAt: new Date()
            };
        } catch (error) {
            logger.error('Error calculating hybrid score:', error);
            throw error;
        }
    }

    /**
     * Save model to file/database
     */
    async saveModel(firmId) {
        try {
            const modelDir = path.join(__dirname, '../../data/ml-models');

            // Ensure directory exists
            try {
                await fs.access(modelDir);
            } catch {
                await fs.mkdir(modelDir, { recursive: true });
            }

            const modelPath = path.join(modelDir, `lead-scoring-${firmId || 'global'}.json`);

            const modelData = {
                version: this.modelVersion,
                network: this.model.toJSON(),
                featureConfig: this.featureConfig,
                calibrationCurve: this.calibrationCurve,
                metrics: this.modelMetrics,
                firmId,
                savedAt: new Date()
            };

            await fs.writeFile(modelPath, JSON.stringify(modelData, null, 2));
            logger.info(`Model saved to ${modelPath}`);

            return true;
        } catch (error) {
            logger.error('Error saving model:', error);
            return false;
        }
    }

    /**
     * Load model from file/database
     */
    async loadModel(firmId) {
        try {
            const modelPath = path.join(
                __dirname,
                '../../data/ml-models',
                `lead-scoring-${firmId || 'global'}.json`
            );

            const modelDataStr = await fs.readFile(modelPath, 'utf8');
            const modelData = JSON.parse(modelDataStr);

            // Create neural network from JSON (synaptic format)
            this.model = Network.fromJSON(modelData.network);
            this.trainer = new Trainer(this.model);

            // Restore configuration
            this.modelVersion = modelData.version;
            this.featureConfig = modelData.featureConfig;
            this.calibrationCurve = modelData.calibrationCurve;
            this.modelMetrics = modelData.metrics;

            logger.info(`Model loaded from ${modelPath}`);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.info('No saved model found');
            } else {
                logger.error('Error loading model:', error);
            }
            return false;
        }
    }

    /**
     * Get model metrics and performance stats
     */
    getModelMetrics() {
        return {
            ...this.modelMetrics,
            version: this.modelVersion,
            featureImportance: this.featureConfig.importance,
            features: this.featureConfig.features,
            isCalibrated: this.calibrationCurve !== null,
            modelLoaded: this.model !== null
        };
    }
}

module.exports = new MLLeadScoringService();
