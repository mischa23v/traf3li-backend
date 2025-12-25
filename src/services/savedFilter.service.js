/**
 * SavedFilter Service
 *
 * Provides business logic for managing saved filters.
 * Handles filter CRUD operations, sharing, usage tracking, and popular filters.
 */

const mongoose = require('mongoose');
const SavedFilter = require('../models/savedFilter.model');
const AuditLogService = require('./auditLog.service');
const logger = require('../utils/logger');

class SavedFilterService {
    // ═══════════════════════════════════════════════════════════════
    // GET FILTERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get all saved filters for a user and entity type
     * @param {String|ObjectId} userId - User ID
     * @param {String|ObjectId} firmId - Firm ID
     * @param {String} entityType - Entity type
     * @returns {Promise<Array>} - Array of saved filters
     */
    async getSavedFilters(userId, firmId, entityType) {
        try {
            const filters = await SavedFilter.getFiltersForUser(userId, firmId, entityType);
            return filters;
        } catch (error) {
            logger.error('SavedFilterService.getSavedFilters failed:', error);
            throw error;
        }
    }

    /**
     * Get saved filter by ID
     * @param {String|ObjectId} filterId - Filter ID
     * @param {String|ObjectId} userId - User ID (for access control)
     * @returns {Promise<Object>} - Saved filter
     */
    async getSavedFilterById(filterId, userId) {
        try {
            const filter = await SavedFilter.findById(filterId)
                .populate('userId', 'firstName lastName email')
                .populate('sharedWith', 'firstName lastName email')
                .lean();

            if (!filter) {
                throw new Error('Filter not found');
            }

            // Check access: owner or shared with user
            const hasAccess =
                filter.userId._id.toString() === userId.toString() ||
                filter.sharedWith.some(user => user._id.toString() === userId.toString());

            if (!hasAccess) {
                throw new Error('Access denied');
            }

            return filter;
        } catch (error) {
            logger.error('SavedFilterService.getSavedFilterById failed:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CREATE & UPDATE FILTERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create saved filter
     * @param {Object} data - Filter data
     * @param {String|ObjectId} userId - User ID
     * @param {String|ObjectId} firmId - Firm ID
     * @returns {Promise<Object>} - Created filter
     */
    async createSavedFilter(data, userId, firmId) {
        try {
            // If setting as default, unset other defaults for same entity type
            if (data.isDefault) {
                await SavedFilter.updateMany(
                    {
                        firmId,
                        userId,
                        entityType: data.entityType,
                        isDefault: true
                    },
                    { $set: { isDefault: false } }
                );
            }

            const filterData = {
                ...data,
                userId,
                firmId
            };

            const filter = await SavedFilter.create(filterData);

            // Populate references
            const populatedFilter = await SavedFilter.findById(filter._id)
                .populate('userId', 'firstName lastName email')
                .populate('sharedWith', 'firstName lastName email');

            // Log to audit
            await AuditLogService.log(
                'create_saved_filter',
                'saved_filter',
                filter._id.toString(),
                null,
                {
                    userId,
                    firmId,
                    details: {
                        name: filter.name,
                        entityType: filter.entityType,
                        isDefault: filter.isDefault
                    }
                }
            );

            return populatedFilter;
        } catch (error) {
            logger.error('SavedFilterService.createSavedFilter failed:', error);
            throw error;
        }
    }

    /**
     * Update saved filter
     * @param {String|ObjectId} filterId - Filter ID
     * @param {Object} data - Update data
     * @param {String|ObjectId} userId - User ID (for access control)
     * @returns {Promise<Object>} - Updated filter
     */
    async updateSavedFilter(filterId, data, userId) {
        try {
            const filter = await SavedFilter.findById(filterId);

            if (!filter) {
                throw new Error('Filter not found');
            }

            // Check ownership
            if (filter.userId.toString() !== userId.toString()) {
                throw new Error('Only the owner can update the filter');
            }

            // If setting as default, unset other defaults
            if (data.isDefault && !filter.isDefault) {
                await SavedFilter.updateMany(
                    {
                        firmId: filter.firmId,
                        userId,
                        entityType: filter.entityType,
                        isDefault: true,
                        _id: { $ne: filterId }
                    },
                    { $set: { isDefault: false } }
                );
            }

            // Update filter
            Object.assign(filter, data);
            await filter.save();

            // Populate references
            const populatedFilter = await SavedFilter.findById(filterId)
                .populate('userId', 'firstName lastName email')
                .populate('sharedWith', 'firstName lastName email');

            // Log to audit
            await AuditLogService.log(
                'update_saved_filter',
                'saved_filter',
                filterId.toString(),
                null,
                {
                    userId,
                    firmId: filter.firmId,
                    details: {
                        name: filter.name,
                        changes: data
                    }
                }
            );

            return populatedFilter;
        } catch (error) {
            logger.error('SavedFilterService.updateSavedFilter failed:', error);
            throw error;
        }
    }

    /**
     * Delete saved filter
     * @param {String|ObjectId} filterId - Filter ID
     * @param {String|ObjectId} userId - User ID (for access control)
     * @returns {Promise<void>}
     */
    async deleteSavedFilter(filterId, userId) {
        try {
            const filter = await SavedFilter.findById(filterId);

            if (!filter) {
                throw new Error('Filter not found');
            }

            // Check ownership
            if (filter.userId.toString() !== userId.toString()) {
                throw new Error('Only the owner can delete the filter');
            }

            await SavedFilter.findByIdAndDelete(filterId);

            // Log to audit
            await AuditLogService.log(
                'delete_saved_filter',
                'saved_filter',
                filterId.toString(),
                null,
                {
                    userId,
                    firmId: filter.firmId,
                    details: {
                        name: filter.name,
                        entityType: filter.entityType
                    }
                }
            );
        } catch (error) {
            logger.error('SavedFilterService.deleteSavedFilter failed:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SET AS DEFAULT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Set filter as default for entity type
     * @param {String|ObjectId} filterId - Filter ID
     * @param {String|ObjectId} userId - User ID
     * @param {String} entityType - Entity type (optional, for validation)
     * @returns {Promise<Object>} - Updated filter
     */
    async setAsDefault(filterId, userId, entityType = null) {
        try {
            const filter = await SavedFilter.findById(filterId);

            if (!filter) {
                throw new Error('Filter not found');
            }

            // Check ownership
            if (filter.userId.toString() !== userId.toString()) {
                throw new Error('Only the owner can set default filter');
            }

            // Validate entity type if provided
            if (entityType && filter.entityType !== entityType) {
                throw new Error('Entity type mismatch');
            }

            // Unset other defaults for same entity type
            await SavedFilter.updateMany(
                {
                    firmId: filter.firmId,
                    userId,
                    entityType: filter.entityType,
                    isDefault: true,
                    _id: { $ne: filterId }
                },
                { $set: { isDefault: false } }
            );

            // Set this as default
            filter.isDefault = true;
            await filter.save();

            // Log to audit
            await AuditLogService.log(
                'set_default_filter',
                'saved_filter',
                filterId.toString(),
                null,
                {
                    userId,
                    firmId: filter.firmId,
                    details: {
                        name: filter.name,
                        entityType: filter.entityType
                    }
                }
            );

            return filter;
        } catch (error) {
            logger.error('SavedFilterService.setAsDefault failed:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SHARING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Share filter with users
     * @param {String|ObjectId} filterId - Filter ID
     * @param {Array<String|ObjectId>} userIds - User IDs to share with
     * @param {String|ObjectId} ownerId - Owner user ID (for access control)
     * @returns {Promise<Object>} - Updated filter
     */
    async shareFilter(filterId, userIds, ownerId) {
        try {
            const filter = await SavedFilter.findById(filterId);

            if (!filter) {
                throw new Error('Filter not found');
            }

            // Check ownership
            if (filter.userId.toString() !== ownerId.toString()) {
                throw new Error('Only the owner can share the filter');
            }

            await filter.shareWith(userIds);

            // Populate references
            const populatedFilter = await SavedFilter.findById(filterId)
                .populate('userId', 'firstName lastName email')
                .populate('sharedWith', 'firstName lastName email');

            // Log to audit
            await AuditLogService.log(
                'share_filter',
                'saved_filter',
                filterId.toString(),
                null,
                {
                    userId: ownerId,
                    firmId: filter.firmId,
                    details: {
                        name: filter.name,
                        sharedWith: userIds
                    }
                }
            );

            return populatedFilter;
        } catch (error) {
            logger.error('SavedFilterService.shareFilter failed:', error);
            throw error;
        }
    }

    /**
     * Remove user from shared filter
     * @param {String|ObjectId} filterId - Filter ID
     * @param {String|ObjectId} userId - User ID to unshare from
     * @param {String|ObjectId} ownerId - Owner user ID (for access control)
     * @returns {Promise<Object>} - Updated filter
     */
    async unshareFilter(filterId, userId, ownerId) {
        try {
            const filter = await SavedFilter.findById(filterId);

            if (!filter) {
                throw new Error('Filter not found');
            }

            // Check ownership
            if (filter.userId.toString() !== ownerId.toString()) {
                throw new Error('Only the owner can unshare the filter');
            }

            await filter.unshareFrom(userId);

            // Populate references
            const populatedFilter = await SavedFilter.findById(filterId)
                .populate('userId', 'firstName lastName email')
                .populate('sharedWith', 'firstName lastName email');

            // Log to audit
            await AuditLogService.log(
                'unshare_filter',
                'saved_filter',
                filterId.toString(),
                null,
                {
                    userId: ownerId,
                    firmId: filter.firmId,
                    details: {
                        name: filter.name,
                        unsharedFrom: userId
                    }
                }
            );

            return populatedFilter;
        } catch (error) {
            logger.error('SavedFilterService.unshareFilter failed:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // USAGE TRACKING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Record filter usage
     * @param {String|ObjectId} filterId - Filter ID
     * @returns {Promise<void>}
     */
    async recordUsage(filterId) {
        try {
            const filter = await SavedFilter.findById(filterId);

            if (!filter) {
                // Silently fail - don't throw error for usage tracking
                logger.warn('Filter not found for usage tracking:', filterId);
                return;
            }

            await filter.recordUsage();
        } catch (error) {
            logger.error('SavedFilterService.recordUsage failed:', error);
            // Don't throw - usage tracking failures shouldn't break the application
        }
    }

    /**
     * Get popular filters for entity type
     * @param {String} entityType - Entity type
     * @param {String|ObjectId} firmId - Firm ID
     * @param {Number} limit - Number of filters to return (default: 10)
     * @returns {Promise<Array>} - Array of popular filters
     */
    async getPopularFilters(entityType, firmId, limit = 10) {
        try {
            const filters = await SavedFilter.getPopularFilters(firmId, entityType, limit);
            return filters;
        } catch (error) {
            logger.error('SavedFilterService.getPopularFilters failed:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DUPLICATE FILTER
    // ═══════════════════════════════════════════════════════════════

    /**
     * Duplicate a filter
     * @param {String|ObjectId} filterId - Filter ID to duplicate
     * @param {String|ObjectId} userId - User ID (will own the duplicate)
     * @returns {Promise<Object>} - Duplicated filter
     */
    async duplicateFilter(filterId, userId) {
        try {
            const originalFilter = await SavedFilter.findById(filterId);

            if (!originalFilter) {
                throw new Error('Filter not found');
            }

            // Check access: owner or shared with user
            const hasAccess =
                originalFilter.userId.toString() === userId.toString() ||
                originalFilter.sharedWith.some(id => id.toString() === userId.toString());

            if (!hasAccess) {
                throw new Error('Access denied');
            }

            // Create duplicate
            const duplicateData = {
                name: `${originalFilter.name} (نسخة / Copy)`,
                userId,
                firmId: originalFilter.firmId,
                entityType: originalFilter.entityType,
                filters: originalFilter.filters,
                sort: originalFilter.sort,
                columns: originalFilter.columns,
                isDefault: false, // Duplicate is never default
                isShared: false, // Duplicate is not shared
                sharedWith: []
            };

            const duplicatedFilter = await SavedFilter.create(duplicateData);

            // Populate references
            const populatedFilter = await SavedFilter.findById(duplicatedFilter._id)
                .populate('userId', 'firstName lastName email')
                .populate('sharedWith', 'firstName lastName email');

            // Log to audit
            await AuditLogService.log(
                'duplicate_filter',
                'saved_filter',
                duplicatedFilter._id.toString(),
                null,
                {
                    userId,
                    firmId: originalFilter.firmId,
                    details: {
                        originalId: filterId,
                        name: duplicatedFilter.name
                    }
                }
            );

            return populatedFilter;
        } catch (error) {
            logger.error('SavedFilterService.duplicateFilter failed:', error);
            throw error;
        }
    }
}

// Export singleton instance
module.exports = new SavedFilterService();
