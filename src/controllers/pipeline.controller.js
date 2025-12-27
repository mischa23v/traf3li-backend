const Pipeline = require('../models/pipeline.model');
const Lead = require('../models/lead.model');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// ============================================
// PIPELINE CRUD
// ============================================

// Create pipeline
exports.createPipeline = async (req, res) => {
    try {
        const lawyerId = req.userID;

        // Mass assignment protection - only allow specific fields
        const allowedFields = ['name', 'nameAr', 'description', 'descriptionAr', 'type', 'category', 'icon', 'color', 'stages', 'settings', 'isActive'];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const pipelineData = {
            ...safeData,
            lawyerId,
            createdBy: lawyerId
        };

        const pipeline = await Pipeline.create(pipelineData);

        res.status(201).json({
            success: true,
            message: 'Pipeline created successfully',
            data: pipeline
        });
    } catch (error) {
        logger.error('Error creating pipeline:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating pipeline',
            error: error.message
        });
    }
};

// Get all pipelines
exports.getPipelines = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const { type, isActive } = req.query;

        const pipelines = await Pipeline.getPipelines(lawyerId, {
            type,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
        });

        res.json({
            success: true,
            data: pipelines
        });
    } catch (error) {
        logger.error('Error getting pipelines:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting pipelines',
            error: error.message
        });
    }
};

// Get single pipeline
exports.getPipeline = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;

        // IDOR protection - verify ownership by lawyerId and firmId
        const pipeline = await Pipeline.findOne({
            $or: [{ _id: sanitizeObjectId(id) }, { pipelineId: id }],
            lawyerId,
            ...req.firmQuery
        });

        if (!pipeline) {
            return res.status(404).json({
                success: false,
                message: 'Resource not found'
            });
        }

        // Get lead counts per stage
        const stageCounts = {};
        for (const stage of pipeline.stages) {
            stageCounts[stage.stageId] = await Lead.countDocuments({
                lawyerId,
                pipelineId: pipeline._id,
                pipelineStageId: stage.stageId,
                convertedToClient: false,
                ...req.firmQuery
            });
        }

        res.json({
            success: true,
            data: {
                pipeline,
                stageCounts
            }
        });
    } catch (error) {
        logger.error('Error getting pipeline:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting pipeline',
            error: error.message
        });
    }
};

// Update pipeline
exports.updatePipeline = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;

        // Mass assignment protection - only allow specific fields
        const allowedUpdates = ['name', 'nameAr', 'description', 'descriptionAr', 'icon', 'color', 'settings', 'isActive'];
        const updates = pickAllowedFields(req.body, allowedUpdates);

        // IDOR protection - verify ownership by lawyerId and firmId
        const pipeline = await Pipeline.findOne({
            $or: [{ _id: sanitizeObjectId(id) }, { pipelineId: id }],
            lawyerId,
            ...req.firmQuery
        });

        if (!pipeline) {
            return res.status(404).json({
                success: false,
                message: 'Resource not found'
            });
        }

        // Apply updates
        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                pipeline[field] = updates[field];
            }
        });

        pipeline.lastModifiedBy = lawyerId;
        await pipeline.save();

        res.json({
            success: true,
            message: 'Pipeline updated successfully',
            data: pipeline
        });
    } catch (error) {
        logger.error('Error updating pipeline:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating pipeline',
            error: error.message
        });
    }
};

// Delete pipeline
exports.deletePipeline = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;

        // IDOR protection - verify ownership by lawyerId and firmId
        const pipeline = await Pipeline.findOne({
            $or: [{ _id: sanitizeObjectId(id) }, { pipelineId: id }],
            lawyerId,
            isDefault: false,
            ...req.firmQuery
        });

        if (!pipeline) {
            return res.status(404).json({
                success: false,
                message: 'Resource not found'
            });
        }

        // Check if there are leads in this pipeline
        const leadCount = await Lead.countDocuments({
            pipelineId: pipeline._id,
            ...req.firmQuery
        });
        if (leadCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete pipeline with ${leadCount} leads. Move leads first.`
            });
        }

        await pipeline.deleteOne();

        res.json({
            success: true,
            message: 'Pipeline deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting pipeline:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting pipeline',
            error: error.message
        });
    }
};

// ============================================
// STAGE MANAGEMENT
// ============================================

// Add stage to pipeline
exports.addStage = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;

        // Input validation and mass assignment protection for stage data
        const allowedStageFields = ['name', 'nameAr', 'color', 'order', 'probability', 'isWonStage', 'isLostStage', 'autoActions', 'requirements'];
        const stageData = pickAllowedFields(req.body, allowedStageFields);

        // Validate required stage fields
        if (!stageData.name) {
            return res.status(400).json({
                success: false,
                message: 'Stage name is required'
            });
        }

        // IDOR protection - verify ownership by lawyerId and firmId
        const pipeline = await Pipeline.findOne({
            $or: [{ _id: sanitizeObjectId(id) }, { pipelineId: id }],
            lawyerId,
            ...req.firmQuery
        });

        if (!pipeline) {
            return res.status(404).json({
                success: false,
                message: 'Resource not found'
            });
        }

        await pipeline.addStage(stageData);

        res.status(201).json({
            success: true,
            message: 'Stage added successfully',
            data: pipeline
        });
    } catch (error) {
        logger.error('Error adding stage:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding stage',
            error: error.message
        });
    }
};

// Update stage
exports.updateStage = async (req, res) => {
    try {
        const { id, stageId } = req.params;
        const lawyerId = req.userID;

        // Mass assignment protection - only allow specific stage fields to be updated
        const allowedStageFields = ['name', 'nameAr', 'color', 'probability', 'isWonStage', 'isLostStage', 'autoActions', 'requirements'];
        const updates = pickAllowedFields(req.body, allowedStageFields);

        // Validate that there are updates to apply
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        // IDOR protection - verify ownership by lawyerId and firmId
        const pipeline = await Pipeline.findOne({
            $or: [{ _id: sanitizeObjectId(id) }, { pipelineId: id }],
            lawyerId,
            ...req.firmQuery
        });

        if (!pipeline) {
            return res.status(404).json({
                success: false,
                message: 'Resource not found'
            });
        }

        const stage = pipeline.getStage(stageId);
        if (!stage) {
            return res.status(404).json({
                success: false,
                message: 'Resource not found'
            });
        }

        // Prevent unauthorized modifications - apply only allowed updates
        Object.keys(updates).forEach(key => {
            stage[key] = updates[key];
        });

        await pipeline.save();

        res.json({
            success: true,
            message: 'Stage updated successfully',
            data: pipeline
        });
    } catch (error) {
        logger.error('Error updating stage:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating stage',
            error: error.message
        });
    }
};

// Remove stage
exports.removeStage = async (req, res) => {
    try {
        const { id, stageId } = req.params;
        const lawyerId = req.userID;

        // IDOR protection - verify ownership by lawyerId and firmId
        const pipeline = await Pipeline.findOne({
            $or: [{ _id: sanitizeObjectId(id) }, { pipelineId: id }],
            lawyerId,
            ...req.firmQuery
        });

        if (!pipeline) {
            return res.status(404).json({
                success: false,
                message: 'Resource not found'
            });
        }

        // Check if leads are in this stage
        const leadCount = await Lead.countDocuments({
            pipelineId: pipeline._id,
            pipelineStageId: stageId,
            ...req.firmQuery
        });

        if (leadCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot remove stage with ${leadCount} leads. Move leads first.`
            });
        }

        await pipeline.removeStage(stageId);

        res.json({
            success: true,
            message: 'Stage removed successfully',
            data: pipeline
        });
    } catch (error) {
        logger.error('Error removing stage:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing stage',
            error: error.message
        });
    }
};

// Reorder stages
exports.reorderStages = async (req, res) => {
    try {
        const { id } = req.params;
        const { stageOrders } = req.body; // Array of { stageId, order }
        const lawyerId = req.userID;

        // Input validation for stage reordering
        if (!Array.isArray(stageOrders)) {
            return res.status(400).json({
                success: false,
                message: 'stageOrders must be an array'
            });
        }

        // Validate each stage order entry
        for (const item of stageOrders) {
            if (!item.stageId || typeof item.order !== 'number') {
                return res.status(400).json({
                    success: false,
                    message: 'Each stage order must have stageId and numeric order'
                });
            }
        }

        // IDOR protection - verify ownership by lawyerId and firmId
        const pipeline = await Pipeline.findOne({
            $or: [{ _id: sanitizeObjectId(id) }, { pipelineId: id }],
            lawyerId,
            ...req.firmQuery
        });

        if (!pipeline) {
            return res.status(404).json({
                success: false,
                message: 'Resource not found'
            });
        }

        // Verify all stageIds belong to this pipeline
        const pipelineStageIds = pipeline.stages.map(s => s.stageId);
        for (const item of stageOrders) {
            if (!pipelineStageIds.includes(item.stageId)) {
                return res.status(400).json({
                    success: false,
                    message: `Stage ${item.stageId} does not belong to this pipeline`
                });
            }
        }

        await pipeline.reorderStages(stageOrders);

        res.json({
            success: true,
            message: 'Stages reordered successfully',
            data: pipeline
        });
    } catch (error) {
        logger.error('Error reordering stages:', error);
        res.status(500).json({
            success: false,
            message: 'Error reordering stages',
            error: error.message
        });
    }
};

// ============================================
// PIPELINE STATISTICS
// ============================================

// Get pipeline stats
exports.getStats = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;

        // IDOR protection - verify ownership by lawyerId and firmId
        const pipeline = await Pipeline.findOne({
            $or: [{ _id: sanitizeObjectId(id) }, { pipelineId: id }],
            lawyerId,
            ...req.firmQuery
        });

        if (!pipeline) {
            return res.status(404).json({
                success: false,
                message: 'Resource not found'
            });
        }

        // Update stats
        await Pipeline.updateStats(pipeline._id);

        // Refresh pipeline with firmId isolation
        const updatedPipeline = await Pipeline.findOne({
            _id: pipeline._id,
            ...req.firmQuery
        });

        // Get stage-level stats
        const stageStats = [];
        for (const stage of updatedPipeline.stages) {
            const leads = await Lead.aggregate([
                {
                    $match: {
                        pipelineId: pipeline._id,
                        pipelineStageId: stage.stageId,
                        convertedToClient: false,
                        ...req.firmQuery
                    }
                },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        totalValue: { $sum: '$estimatedValue' }
                    }
                }
            ]);

            stageStats.push({
                stageId: stage.stageId,
                stageName: stage.name,
                stageNameAr: stage.nameAr,
                color: stage.color,
                count: leads[0]?.count || 0,
                totalValue: leads[0]?.totalValue || 0
            });
        }

        res.json({
            success: true,
            data: {
                pipeline: updatedPipeline,
                stageStats
            }
        });
    } catch (error) {
        logger.error('Error getting pipeline stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting pipeline statistics',
            error: error.message
        });
    }
};

// Set default pipeline
exports.setDefault = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;

        // IDOR protection - verify ownership by lawyerId and firmId
        const pipeline = await Pipeline.findOne({
            $or: [{ _id: sanitizeObjectId(id) }, { pipelineId: id }],
            lawyerId,
            ...req.firmQuery
        });

        if (!pipeline) {
            return res.status(404).json({
                success: false,
                message: 'Resource not found'
            });
        }

        // Unset current default with firmId isolation
        await Pipeline.updateMany(
            { lawyerId, type: pipeline.type, isDefault: true, ...req.firmQuery },
            { isDefault: false }
        );

        // Set new default
        pipeline.isDefault = true;
        await pipeline.save();

        res.json({
            success: true,
            message: 'Default pipeline set successfully',
            data: pipeline
        });
    } catch (error) {
        logger.error('Error setting default pipeline:', error);
        res.status(500).json({
            success: false,
            message: 'Error setting default pipeline',
            error: error.message
        });
    }
};

// Duplicate pipeline
exports.duplicatePipeline = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;

        // Mass assignment protection - only allow name fields
        const allowedFields = ['name', 'nameAr'];
        const { name, nameAr } = pickAllowedFields(req.body, allowedFields);

        // IDOR protection - verify ownership by lawyerId and firmId
        const original = await Pipeline.findOne({
            $or: [{ _id: sanitizeObjectId(id) }, { pipelineId: id }],
            lawyerId,
            ...req.firmQuery
        });

        if (!original) {
            return res.status(404).json({
                success: false,
                message: 'Resource not found'
            });
        }

        const duplicated = await Pipeline.create({
            lawyerId,
            name: name || `${original.name} (Copy)`,
            nameAr: nameAr || (original.nameAr ? `${original.nameAr} (نسخة)` : undefined),
            description: original.description,
            descriptionAr: original.descriptionAr,
            type: original.type,
            category: original.category,
            icon: original.icon,
            color: original.color,
            stages: original.stages.map(s => ({
                name: s.name,
                nameAr: s.nameAr,
                color: s.color,
                order: s.order,
                probability: s.probability,
                isWonStage: s.isWonStage,
                isLostStage: s.isLostStage,
                autoActions: s.autoActions,
                requirements: s.requirements
            })),
            settings: original.settings,
            isDefault: false,
            createdBy: lawyerId
        });

        res.status(201).json({
            success: true,
            message: 'Pipeline duplicated successfully',
            data: duplicated
        });
    } catch (error) {
        logger.error('Error duplicating pipeline:', error);
        res.status(500).json({
            success: false,
            message: 'Error duplicating pipeline',
            error: error.message
        });
    }
};
