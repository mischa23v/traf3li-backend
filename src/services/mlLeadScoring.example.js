/**
 * ML Lead Scoring Service - Usage Examples
 *
 * This file demonstrates how to use the ML Lead Scoring Service
 * in various scenarios.
 */

const mlLeadScoringService = require('./mlLeadScoring.service');
const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 1: Training the Model
// ═══════════════════════════════════════════════════════════════

async function trainModel(firmId) {
    try {
        console.log('Starting model training...');

        const result = await mlLeadScoringService.trainModel(firmId, {
            minLeads: 50,           // Minimum number of leads required
            includeInProgress: true, // Include active leads for semi-supervised learning
            iterations: 20000,      // Training iterations
            errorThresh: 0.005,     // Target error threshold
            learningRate: 0.01      // Learning rate
        });

        console.log('Training completed:', result);
        console.log('Accuracy:', result.metrics.accuracy + '%');
        console.log('Precision:', result.metrics.precision + '%');
        console.log('Recall:', result.metrics.recall + '%');
        console.log('F1 Score:', result.metrics.f1Score + '%');

        return result;
    } catch (error) {
        console.error('Training failed:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 2: Predicting Single Lead Conversion
// ═══════════════════════════════════════════════════════════════

async function predictLeadConversion(leadId, firmId) {
    try {
        console.log(`Predicting conversion for lead ${leadId}...`);

        const prediction = await mlLeadScoringService.predict(leadId, firmId);

        console.log('Prediction Results:');
        console.log('- Conversion Probability:', prediction.probability + '%');
        console.log('- Confidence:', prediction.confidence);
        console.log('- Raw Probability:', prediction.rawProbability + '%');
        console.log('- Model Version:', prediction.modelVersion);

        console.log('\nTop Features:');
        const sortedFeatures = Object.entries(prediction.features)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        sortedFeatures.forEach(([name, value]) => {
            console.log(`  ${name}: ${(value * 100).toFixed(1)}%`);
        });

        return prediction;
    } catch (error) {
        console.error('Prediction failed:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 3: Batch Prediction for Multiple Leads
// ═══════════════════════════════════════════════════════════════

async function batchPredictLeads(leadIds, firmId) {
    try {
        console.log(`Running batch prediction for ${leadIds.length} leads...`);

        const predictions = await mlLeadScoringService.batchPredict(leadIds, firmId);

        const successful = predictions.filter(p => p.success);
        const failed = predictions.filter(p => !p.success);

        console.log(`\nBatch Prediction Results:`);
        console.log(`- Successful: ${successful.length}`);
        console.log(`- Failed: ${failed.length}`);

        // Show top 5 leads by probability
        const topLeads = successful
            .sort((a, b) => b.probability - a.probability)
            .slice(0, 5);

        console.log('\nTop 5 Leads:');
        topLeads.forEach((lead, index) => {
            console.log(`${index + 1}. Lead ${lead.leadId}: ${lead.probability}% (${lead.confidence} confidence)`);
        });

        return predictions;
    } catch (error) {
        console.error('Batch prediction failed:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 4: Generate Detailed Explanation
// ═══════════════════════════════════════════════════════════════

async function explainPrediction(leadId, firmId) {
    try {
        console.log(`Generating explanation for lead ${leadId}...`);

        // First get the prediction
        const prediction = await mlLeadScoringService.predict(leadId, firmId);

        // Then generate explanation
        const explanation = await mlLeadScoringService.generateExplanation(
            leadId,
            prediction.features,
            prediction
        );

        console.log('\n' + '='.repeat(60));
        console.log('LEAD CONVERSION ANALYSIS');
        console.log('='.repeat(60));
        console.log(`\nConversion Probability: ${explanation.probability}%`);
        console.log(`Confidence Level: ${explanation.confidence}`);
        console.log(`\n${explanation.summary}`);

        console.log('\n📈 POSITIVE FACTORS (Increasing Conversion):');
        explanation.positiveFactors.forEach((factor, i) => {
            console.log(`${i + 1}. ${factor.description}`);
            console.log(`   Impact: +${factor.contribution.toFixed(2)}%`);
        });

        console.log('\n📉 NEGATIVE FACTORS (Decreasing Conversion):');
        explanation.negativeFactors.forEach((factor, i) => {
            console.log(`${i + 1}. ${factor.description}`);
            console.log(`   Impact: ${factor.contribution.toFixed(2)}%`);
        });

        console.log('\n💡 RECOMMENDATIONS:');
        explanation.recommendations.forEach((rec, i) => {
            console.log(`${i + 1}. ${rec}`);
        });

        console.log('\n' + '='.repeat(60));

        return explanation;
    } catch (error) {
        console.error('Explanation generation failed:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 5: Hybrid Scoring (ML + Rules)
// ═══════════════════════════════════════════════════════════════

async function calculateHybridScore(leadId, firmId) {
    try {
        console.log(`Calculating hybrid score for lead ${leadId}...`);

        // Default weights: 60% ML, 40% rules
        const result = await mlLeadScoringService.hybridScore(leadId, firmId, {
            ml: 0.6,
            rules: 0.4
        });

        console.log('\nHybrid Scoring Results:');
        console.log('- Hybrid Score:', result.hybridScore.toFixed(2));
        console.log('- ML Score:', result.mlScore.toFixed(2));
        console.log('- Rule-Based Score:', result.ruleBasedScore.toFixed(2));
        console.log('- Weights:', result.weights);
        console.log('- Confidence:', result.confidence);

        return result;
    } catch (error) {
        console.error('Hybrid scoring failed:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 6: Get Model Metrics
// ═══════════════════════════════════════════════════════════════

function getModelMetrics() {
    try {
        const metrics = mlLeadScoringService.getModelMetrics();

        console.log('\nModel Performance Metrics:');
        console.log('- Accuracy:', metrics.accuracy + '%');
        console.log('- Precision:', metrics.precision + '%');
        console.log('- Recall:', metrics.recall + '%');
        console.log('- F1 Score:', metrics.f1Score + '%');
        console.log('- Training Size:', metrics.trainingSize);
        console.log('- Last Trained:', metrics.lastTrained);
        console.log('- Model Version:', metrics.version);
        console.log('- Is Calibrated:', metrics.isCalibrated);

        if (metrics.featureImportance) {
            console.log('\nTop 5 Most Important Features:');
            const topFeatures = Object.entries(metrics.featureImportance)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5);

            topFeatures.forEach(([name, importance], i) => {
                console.log(`${i + 1}. ${name}: ${importance.toFixed(2)}%`);
            });
        }

        return metrics;
    } catch (error) {
        console.error('Failed to get metrics:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 7: Complete Workflow
// ═══════════════════════════════════════════════════════════════

async function completeWorkflow(firmId, leadId) {
    try {
        console.log('=== ML Lead Scoring Complete Workflow ===\n');

        // Step 1: Train model (only needed once or periodically)
        console.log('Step 1: Training model...');
        await trainModel(firmId);
        console.log('✓ Model trained\n');

        // Step 2: Make prediction
        console.log('Step 2: Making prediction...');
        const prediction = await predictLeadConversion(leadId, firmId);
        console.log('✓ Prediction complete\n');

        // Step 3: Generate explanation
        console.log('Step 3: Generating explanation...');
        const explanation = await explainPrediction(leadId, firmId);
        console.log('✓ Explanation generated\n');

        // Step 4: Calculate hybrid score
        console.log('Step 4: Calculating hybrid score...');
        const hybridScore = await calculateHybridScore(leadId, firmId);
        console.log('✓ Hybrid score calculated\n');

        // Step 5: Get model metrics
        console.log('Step 5: Retrieving model metrics...');
        const metrics = getModelMetrics();
        console.log('✓ Metrics retrieved\n');

        console.log('=== Workflow Complete ===');

        return {
            prediction,
            explanation,
            hybridScore,
            metrics
        };
    } catch (error) {
        console.error('Workflow failed:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 8: Scheduled Model Retraining
// ═══════════════════════════════════════════════════════════════

async function scheduledRetraining(firmId) {
    try {
        console.log('Starting scheduled model retraining...');

        // Get current metrics
        const currentMetrics = mlLeadScoringService.getModelMetrics();

        // Retrain model
        const result = await mlLeadScoringService.trainModel(firmId);

        console.log('\nRetraining Complete:');
        console.log('- Previous Accuracy:', currentMetrics.accuracy + '%');
        console.log('- New Accuracy:', result.metrics.accuracy + '%');
        console.log('- Improvement:',
            (result.metrics.accuracy - currentMetrics.accuracy).toFixed(2) + '%');

        return result;
    } catch (error) {
        console.error('Retraining failed:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    trainModel,
    predictLeadConversion,
    batchPredictLeads,
    explainPrediction,
    calculateHybridScore,
    getModelMetrics,
    completeWorkflow,
    scheduledRetraining
};

// ═══════════════════════════════════════════════════════════════
// USAGE IN PRODUCTION
// ═══════════════════════════════════════════════════════════════

/*
// In your API route or controller:

const mlLeadScoring = require('./services/mlLeadScoring.service');

// Get ML prediction for a lead
app.get('/api/leads/:leadId/ml-score', async (req, res) => {
    try {
        const { leadId } = req.params;
        const firmId = req.user.firmId;

        const prediction = await mlLeadScoring.predict(leadId, firmId);
        const explanation = await mlLeadScoring.generateExplanation(leadId, prediction.features, prediction);

        res.json({
            success: true,
            prediction,
            explanation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Train model (admin only, scheduled job)
app.post('/api/ml/train', async (req, res) => {
    try {
        const firmId = req.user.firmId;

        const result = await mlLeadScoring.trainModel(firmId);

        res.json({
            success: true,
            result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get hybrid score
app.get('/api/leads/:leadId/hybrid-score', async (req, res) => {
    try {
        const { leadId } = req.params;
        const firmId = req.user.firmId;

        const hybridScore = await mlLeadScoring.hybridScore(leadId, firmId);

        res.json({
            success: true,
            hybridScore
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Batch scoring for dashboard
app.post('/api/leads/batch-score', async (req, res) => {
    try {
        const { leadIds } = req.body;
        const firmId = req.user.firmId;

        const predictions = await mlLeadScoring.batchPredict(leadIds, firmId);

        res.json({
            success: true,
            predictions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
*/
