/**
 * Keyboard Shortcut Service
 *
 * Manages keyboard shortcuts for users, providing:
 * - Default shortcuts retrieval
 * - User-specific shortcut customization
 * - Conflict detection
 * - Shortcut reset functionality
 * - Custom shortcut creation and deletion
 */

const mongoose = require('mongoose');
const KeyboardShortcut = require('../models/keyboardShortcut.model');
const logger = require('../utils/logger');

class KeyboardShortcutService {
    /**
     * Get shortcuts for user (merged with defaults)
     * @param {String} userId - User ID
     * @param {String} firmId - Firm ID (optional)
     * @returns {Promise<Object>} Shortcuts configuration
     */
    async getShortcuts(userId, firmId = null) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            // Get or create user shortcuts
            const userShortcuts = await KeyboardShortcut.getOrCreate(
                new mongoose.Types.ObjectId(userId),
                firmId ? new mongoose.Types.ObjectId(firmId) : null
            );

            return {
                shortcuts: userShortcuts.getAllShortcuts(),
                userId: userShortcuts.userId,
                firmId: userShortcuts.firmId,
                updatedAt: userShortcuts.updatedAt
            };
        } catch (error) {
            logger.error('KeyboardShortcutService.getShortcuts failed:', error.message);
            throw error;
        }
    }

    /**
     * Get default shortcuts
     * @returns {Promise<Object>} Default shortcuts
     */
    async getDefaultShortcuts() {
        try {
            const defaults = KeyboardShortcut.getDefaults();
            const shortcuts = {};

            for (const [id, config] of defaults.entries()) {
                shortcuts[id] = config;
            }

            return { shortcuts };
        } catch (error) {
            logger.error('KeyboardShortcutService.getDefaultShortcuts failed:', error.message);
            throw error;
        }
    }

    /**
     * Update a shortcut
     * @param {String} userId - User ID
     * @param {String} shortcutId - Shortcut ID
     * @param {Object} shortcutData - Shortcut configuration
     * @param {String} firmId - Firm ID (optional)
     * @returns {Promise<Object>} Updated shortcuts
     */
    async updateShortcut(userId, shortcutId, shortcutData, firmId = null) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            if (!shortcutId) {
                throw new Error('Shortcut ID is required');
            }

            // Validate shortcut data
            this._validateShortcutData(shortcutData);

            // Get user shortcuts
            const userShortcuts = await KeyboardShortcut.getOrCreate(
                new mongoose.Types.ObjectId(userId),
                firmId ? new mongoose.Types.ObjectId(firmId) : null
            );

            // Check for conflicts if key or modifiers are being changed
            if (shortcutData.key || shortcutData.modifiers) {
                const existing = userShortcuts.getShortcut(shortcutId);
                if (!existing) {
                    throw new Error('Shortcut not found');
                }

                const keyToCheck = shortcutData.key || existing.key;
                const modifiersToCheck = shortcutData.modifiers !== undefined
                    ? shortcutData.modifiers
                    : existing.modifiers;

                const conflict = userShortcuts.checkConflict(keyToCheck, modifiersToCheck, shortcutId);
                if (conflict) {
                    throw new Error(`Shortcut conflicts with existing shortcut: ${conflict.shortcutId} (${conflict.action})`);
                }
            }

            // Update shortcut
            await userShortcuts.updateShortcut(shortcutId, shortcutData);

            return {
                shortcuts: userShortcuts.getAllShortcuts(),
                updatedShortcut: shortcutId,
                updatedAt: userShortcuts.updatedAt
            };
        } catch (error) {
            logger.error('KeyboardShortcutService.updateShortcut failed:', error.message);
            throw error;
        }
    }

    /**
     * Reset a shortcut to default
     * @param {String} userId - User ID
     * @param {String} shortcutId - Shortcut ID
     * @param {String} firmId - Firm ID (optional)
     * @returns {Promise<Object>} Updated shortcuts
     */
    async resetShortcut(userId, shortcutId, firmId = null) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            if (!shortcutId) {
                throw new Error('Shortcut ID is required');
            }

            // Get user shortcuts
            const userShortcuts = await KeyboardShortcut.getOrCreate(
                new mongoose.Types.ObjectId(userId),
                firmId ? new mongoose.Types.ObjectId(firmId) : null
            );

            // Reset shortcut
            await userShortcuts.resetShortcut(shortcutId);

            return {
                shortcuts: userShortcuts.getAllShortcuts(),
                resetShortcut: shortcutId,
                updatedAt: userShortcuts.updatedAt
            };
        } catch (error) {
            logger.error('KeyboardShortcutService.resetShortcut failed:', error.message);
            throw error;
        }
    }

    /**
     * Reset all shortcuts to defaults
     * @param {String} userId - User ID
     * @param {String} firmId - Firm ID (optional)
     * @returns {Promise<Object>} Updated shortcuts
     */
    async resetAllShortcuts(userId, firmId = null) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            // Get user shortcuts
            const userShortcuts = await KeyboardShortcut.getOrCreate(
                new mongoose.Types.ObjectId(userId),
                firmId ? new mongoose.Types.ObjectId(firmId) : null
            );

            // Reset all shortcuts
            await userShortcuts.resetAllShortcuts();

            return {
                shortcuts: userShortcuts.getAllShortcuts(),
                updatedAt: userShortcuts.updatedAt
            };
        } catch (error) {
            logger.error('KeyboardShortcutService.resetAllShortcuts failed:', error.message);
            throw error;
        }
    }

    /**
     * Check for shortcut conflicts
     * @param {String} userId - User ID
     * @param {String} key - Key
     * @param {Array} modifiers - Modifiers array
     * @param {String} firmId - Firm ID (optional)
     * @param {String} excludeId - Shortcut ID to exclude from check (optional)
     * @returns {Promise<Object>} Conflict information or null
     */
    async checkConflict(userId, key, modifiers = [], firmId = null, excludeId = null) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            if (!key) {
                throw new Error('Key is required');
            }

            // Get user shortcuts
            const userShortcuts = await KeyboardShortcut.getOrCreate(
                new mongoose.Types.ObjectId(userId),
                firmId ? new mongoose.Types.ObjectId(firmId) : null
            );

            // Check for conflict
            const conflict = userShortcuts.checkConflict(key, modifiers, excludeId);

            return {
                hasConflict: conflict !== null,
                conflict: conflict || null
            };
        } catch (error) {
            logger.error('KeyboardShortcutService.checkConflict failed:', error.message);
            throw error;
        }
    }

    /**
     * Create a custom shortcut
     * @param {String} userId - User ID
     * @param {Object} shortcutData - Shortcut configuration
     * @param {String} firmId - Firm ID (optional)
     * @returns {Promise<Object>} Created shortcut
     */
    async createShortcut(userId, shortcutData, firmId = null) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            // Validate shortcut data
            this._validateShortcutData(shortcutData, true);

            if (!shortcutData.shortcutId) {
                throw new Error('Shortcut ID is required');
            }

            if (!shortcutData.action) {
                throw new Error('Action is required');
            }

            // Get user shortcuts
            const userShortcuts = await KeyboardShortcut.getOrCreate(
                new mongoose.Types.ObjectId(userId),
                firmId ? new mongoose.Types.ObjectId(firmId) : null
            );

            // Check for conflicts
            const conflict = userShortcuts.checkConflict(shortcutData.key, shortcutData.modifiers || []);
            if (conflict) {
                throw new Error(`Shortcut conflicts with existing shortcut: ${conflict.shortcutId} (${conflict.action})`);
            }

            // Create shortcut
            await userShortcuts.createShortcut(shortcutData.shortcutId, {
                key: shortcutData.key,
                modifiers: shortcutData.modifiers || [],
                action: shortcutData.action,
                isEnabled: shortcutData.isEnabled !== undefined ? shortcutData.isEnabled : true
            });

            return {
                shortcuts: userShortcuts.getAllShortcuts(),
                createdShortcut: shortcutData.shortcutId,
                updatedAt: userShortcuts.updatedAt
            };
        } catch (error) {
            logger.error('KeyboardShortcutService.createShortcut failed:', error.message);
            throw error;
        }
    }

    /**
     * Delete a custom shortcut
     * @param {String} userId - User ID
     * @param {String} shortcutId - Shortcut ID
     * @param {String} firmId - Firm ID (optional)
     * @returns {Promise<Object>} Updated shortcuts
     */
    async deleteShortcut(userId, shortcutId, firmId = null) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            if (!shortcutId) {
                throw new Error('Shortcut ID is required');
            }

            // Get user shortcuts
            const userShortcuts = await KeyboardShortcut.getOrCreate(
                new mongoose.Types.ObjectId(userId),
                firmId ? new mongoose.Types.ObjectId(firmId) : null
            );

            // Delete shortcut
            await userShortcuts.deleteShortcut(shortcutId);

            return {
                shortcuts: userShortcuts.getAllShortcuts(),
                deletedShortcut: shortcutId,
                updatedAt: userShortcuts.updatedAt
            };
        } catch (error) {
            logger.error('KeyboardShortcutService.deleteShortcut failed:', error.message);
            throw error;
        }
    }

    /**
     * Get shortcut by ID
     * @param {String} userId - User ID
     * @param {String} shortcutId - Shortcut ID
     * @param {String} firmId - Firm ID (optional)
     * @returns {Promise<Object>} Shortcut configuration
     */
    async getShortcutById(userId, shortcutId, firmId = null) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            if (!shortcutId) {
                throw new Error('Shortcut ID is required');
            }

            // Get user shortcuts
            const userShortcuts = await KeyboardShortcut.getOrCreate(
                new mongoose.Types.ObjectId(userId),
                firmId ? new mongoose.Types.ObjectId(firmId) : null
            );

            const shortcut = userShortcuts.getShortcut(shortcutId);

            if (!shortcut) {
                throw new Error('Shortcut not found');
            }

            return {
                shortcutId,
                ...shortcut
            };
        } catch (error) {
            logger.error('KeyboardShortcutService.getShortcutById failed:', error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Validate shortcut data
     * @private
     * @param {Object} shortcutData - Shortcut configuration
     * @param {Boolean} requireKey - Whether key is required
     * @throws {Error} If validation fails
     */
    _validateShortcutData(shortcutData, requireKey = false) {
        if (!shortcutData || typeof shortcutData !== 'object') {
            throw new Error('Shortcut data must be an object');
        }

        if (requireKey && !shortcutData.key) {
            throw new Error('Key is required');
        }

        if (shortcutData.key && typeof shortcutData.key !== 'string') {
            throw new Error('Key must be a string');
        }

        if (shortcutData.modifiers !== undefined) {
            if (!Array.isArray(shortcutData.modifiers)) {
                throw new Error('Modifiers must be an array');
            }

            const validModifiers = ['ctrl', 'alt', 'shift', 'meta'];
            for (const modifier of shortcutData.modifiers) {
                if (!validModifiers.includes(modifier)) {
                    throw new Error(`Invalid modifier: ${modifier}. Must be one of: ${validModifiers.join(', ')}`);
                }
            }
        }

        if (shortcutData.action && typeof shortcutData.action !== 'string') {
            throw new Error('Action must be a string');
        }

        if (shortcutData.isEnabled !== undefined && typeof shortcutData.isEnabled !== 'boolean') {
            throw new Error('isEnabled must be a boolean');
        }
    }
}

// Export singleton instance
module.exports = new KeyboardShortcutService();
