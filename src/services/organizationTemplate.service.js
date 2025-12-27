/**
 * Organization Template Service
 *
 * Handles business logic for organization templates including:
 * - Template creation and management
 * - Applying templates to firms
 * - Creating firms from templates
 * - Template comparison and analysis
 */

const mongoose = require('mongoose');
const OrganizationTemplate = require('../models/organizationTemplate.model');
const Firm = require('../models/firm.model');
const { getDefaultPermissions } = require('../config/permissions.config');
const logger = require('../utils/logger');

class OrganizationTemplateService {
    /**
     * Create a new organization template
     * @param {Object} data - Template data
     * @param {String} userId - ID of user creating the template
     * @returns {Promise<Object>} Created template
     */
    static async createTemplate(data, userId) {
        try {
            // Validate data
            if (!data.name || !data.description) {
                throw new Error('Template name and description are required');
            }

            // Ensure at least one role is provided
            if (!data.roles || data.roles.length === 0) {
                throw new Error('Template must have at least one role');
            }

            // Ensure owner role exists
            const hasOwner = data.roles.some(r => r.name === 'owner');
            if (!hasOwner) {
                throw new Error('Template must include an owner role');
            }

            // Create template
            const template = new OrganizationTemplate({
                ...data,
                createdBy: userId,
                updatedBy: userId,
                isGlobal: false, // User-created templates are not global
                version: 1
            });

            await template.save();

            logger.info(`Template created: ${template.name} (${template._id})`);
            return template;
        } catch (error) {
            logger.error('Error creating template:', error);
            throw error;
        }
    }

    /**
     * Update an existing template
     * @param {String} templateId - Template ID
     * @param {Object} updates - Updates to apply
     * @param {String} userId - ID of user updating the template
     * @param {String} firmId - ID of firm owning the template
     * @returns {Promise<Object>} Updated template
     */
    static async updateTemplate(templateId, updates, userId, firmId) {
        try {
            const template = await OrganizationTemplate.findOne({ _id: templateId, firmId });

            if (!template) {
                throw new Error('Template not found');
            }

            // Prevent updating global templates unless explicitly allowed
            if (template.isGlobal && !updates.allowGlobalUpdate) {
                throw new Error('Cannot modify system templates');
            }

            // Apply updates
            Object.assign(template, updates);
            template.updatedBy = userId;

            await template.save();

            logger.info(`Template updated: ${template.name} (${template._id})`);
            return template;
        } catch (error) {
            logger.error('Error updating template:', error);
            throw error;
        }
    }

    /**
     * Apply template to an existing firm
     * @param {String} templateId - Template ID
     * @param {String} firmId - Firm ID
     * @param {Object} options - Application options
     * @returns {Promise<Object>} Updated firm
     */
    static async applyTemplate(templateId, firmId, options = {}) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Get template
            const template = await OrganizationTemplate.findOne({ _id: templateId, firmId });
            if (!template) {
                throw new Error('Template not found');
            }

            if (!template.isActive) {
                throw new Error('Template is not active');
            }

            // Get firm (verify exists and user has access via controller)
            const firm = await Firm.findOne({ _id: firmId }).session(session);
            if (!firm) {
                throw new Error('Firm not found');
            }

            const config = template.toApplicationConfig();

            // Apply settings (merge with existing)
            if (options.applySettings !== false && config.settings) {
                firm.settings = {
                    ...firm.settings,
                    ...config.settings
                };
            }

            // Apply enterprise settings if provided
            if (options.applyEnterpriseSettings && config.settings) {
                firm.enterpriseSettings = {
                    ...firm.enterpriseSettings,
                    sessionTimeoutMinutes: config.settings.sessionTimeout * 24 * 60,
                    maxSessionsPerUser: config.settings.maxConcurrentSessions,
                    passwordPolicy: config.settings.passwordPolicy
                };
            }

            // Apply features (merge with existing)
            if (options.applyFeatures !== false && config.features) {
                firm.subscription.features = {
                    ...firm.subscription.features,
                    ...config.features
                };

                firm.aiSettings.features = {
                    ...firm.aiSettings.features,
                    ...config.features
                };
            }

            // Apply subscription defaults (only if not overridden)
            if (options.applySubscription && config.subscriptionDefaults) {
                if (!options.preserveSubscription) {
                    firm.subscription = {
                        ...firm.subscription,
                        maxUsers: config.subscriptionDefaults.maxUsers,
                        maxCases: config.subscriptionDefaults.maxCases,
                        maxClients: config.subscriptionDefaults.maxClients,
                        maxStorageGB: config.subscriptionDefaults.maxStorageGB
                    };
                }
            }

            // Update member permissions based on roles (if requested)
            if (options.applyRolePermissions && config.roles) {
                for (const member of firm.members) {
                    const roleConfig = config.roles.find(r => r.name === member.role);
                    if (roleConfig) {
                        member.permissions = {
                            ...member.permissions,
                            ...roleConfig.permissions
                        };
                    }
                }
            }

            await firm.save({ session });

            // Record template usage
            template.usageCount += 1;
            template.lastUsedAt = new Date();
            await template.save();

            await session.commitTransaction();

            logger.info(`Template ${template.name} applied to firm ${firm.name}`);
            return firm;
        } catch (error) {
            await session.abortTransaction();
            logger.error('Error applying template:', error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Create a new firm from a template
     * @param {String} templateId - Template ID
     * @param {Object} firmData - Basic firm data
     * @param {String} userId - Owner user ID
     * @returns {Promise<Object>} Created firm
     */
    static async createFirmFromTemplate(templateId, firmData, userId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Get template
            const template = await OrganizationTemplate.findById(templateId);
            if (!template) {
                throw new Error('Template not found');
            }

            if (!template.isActive) {
                throw new Error('Template is not active');
            }

            const config = template.toApplicationConfig();

            // Get owner role configuration from template
            const ownerRole = config.roles.find(r => r.name === 'owner');
            if (!ownerRole) {
                throw new Error('Template must have an owner role');
            }

            // Create firm with template configuration
            const firm = new Firm({
                // Basic info from user input
                name: firmData.name,
                nameArabic: firmData.nameArabic,
                nameEnglish: firmData.nameEnglish,
                description: firmData.description,
                crNumber: firmData.crNumber,
                licenseNumber: firmData.licenseNumber,
                email: firmData.email,
                phone: firmData.phone,
                address: firmData.address,
                practiceAreas: firmData.practiceAreas,
                vatRegistration: firmData.vatRegistration,

                // From template
                settings: config.settings,
                enterpriseSettings: {
                    sessionTimeoutMinutes: config.settings?.sessionTimeout ? config.settings.sessionTimeout * 24 * 60 : 30,
                    maxSessionsPerUser: config.settings?.maxConcurrentSessions || 5,
                    passwordPolicy: config.settings?.passwordPolicy || {},
                    enforce2FA: config.settings?.mfaRequired || false,
                    ipWhitelistEnabled: config.settings?.ipRestrictionEnabled || false
                },

                // Owner
                ownerId: userId,
                createdBy: userId,

                // Members with owner
                members: [{
                    userId,
                    role: 'owner',
                    permissions: ownerRole.permissions,
                    status: 'active',
                    joinedAt: new Date()
                }],

                // Subscription from template
                subscription: {
                    plan: config.subscriptionDefaults?.plan || 'starter',
                    status: 'trial',
                    trialEndsAt: new Date(Date.now() + (config.subscriptionDefaults?.trialDays || 14) * 24 * 60 * 60 * 1000),
                    maxUsers: config.subscriptionDefaults?.maxUsers || 5,
                    maxCases: config.subscriptionDefaults?.maxCases || 100,
                    maxClients: config.subscriptionDefaults?.maxClients || 200,
                    maxStorageGB: config.subscriptionDefaults?.maxStorageGB || 10,
                    features: config.features || {}
                },

                // AI settings features from template
                aiSettings: {
                    features: {
                        nlpTaskCreation: config.features?.nlpTaskCreation || false,
                        voiceToTask: config.features?.voiceToTask || false,
                        smartScheduling: config.features?.smartScheduling || false,
                        aiAssistant: config.features?.aiAssistant || false
                    }
                },

                status: 'active'
            });

            await firm.save({ session });

            // Update user with firmId
            const User = mongoose.model('User');
            await User.findOneAndUpdate(
                { _id: userId },
                {
                    firmId: firm._id,
                    firmRole: 'owner',
                    'lawyerProfile.firmID': firm._id
                },
                { session }
            );

            // Record template usage
            template.usageCount += 1;
            template.lastUsedAt = new Date();
            await template.save();

            await session.commitTransaction();

            logger.info(`Firm ${firm.name} created from template ${template.name}`);
            return firm;
        } catch (error) {
            await session.abortTransaction();
            logger.error('Error creating firm from template:', error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * List all available templates with optional filters
     * @param {Object} filters - Filter criteria
     * @param {Object} options - Pagination and sorting options
     * @returns {Promise<Array>} List of templates
     */
    static async listTemplates(filters = {}, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                sortBy = 'usageCount',
                sortOrder = -1,
                includeInactive = false
            } = options;

            const query = {
                ...filters
            };

            if (!includeInactive) {
                query.isActive = true;
            }

            const templates = await OrganizationTemplate.find(query)
                .sort({ [sortBy]: sortOrder })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate('createdBy', 'firstName lastName email')
                .populate('updatedBy', 'firstName lastName email')
                .lean();

            const total = await OrganizationTemplate.countDocuments(query);

            return {
                templates,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Error listing templates:', error);
            throw error;
        }
    }

    /**
     * Get a single template by ID
     * @param {String} templateId - Template ID
     * @returns {Promise<Object>} Template
     */
    static async getTemplate(templateId) {
        try {
            const template = await OrganizationTemplate.findById(templateId)
                .populate('createdBy', 'firstName lastName email')
                .populate('updatedBy', 'firstName lastName email')
                .populate('parentTemplateId', 'name nameAr');

            if (!template) {
                throw new Error('Template not found');
            }

            return template;
        } catch (error) {
            logger.error('Error getting template:', error);
            throw error;
        }
    }

    /**
     * Clone an existing template
     * @param {String} templateId - Template to clone
     * @param {String} newName - Name for the cloned template
     * @param {String} userId - User creating the clone
     * @returns {Promise<Object>} Cloned template
     */
    static async cloneTemplate(templateId, newName, userId) {
        try {
            const cloned = await OrganizationTemplate.cloneTemplate(templateId, newName, userId);
            logger.info(`Template cloned: ${cloned.name} from ${templateId}`);
            return cloned;
        } catch (error) {
            logger.error('Error cloning template:', error);
            throw error;
        }
    }

    /**
     * Compare a firm's configuration with a template
     * @param {String} firmId - Firm ID
     * @param {String} templateId - Template ID
     * @returns {Promise<Object>} Comparison results
     */
    static async compareWithTemplate(firmId, templateId) {
        try {
            // Verify firm exists (access should be verified by controller)
            const firm = await Firm.findOne({ _id: firmId });
            if (!firm) {
                throw new Error('Firm not found');
            }

            const template = await OrganizationTemplate.findOne({ _id: templateId, firmId });
            if (!template) {
                throw new Error('Template not found');
            }

            const config = template.toApplicationConfig();
            const differences = {
                settings: {},
                roles: {},
                features: {},
                subscription: {}
            };

            // Compare settings
            if (config.settings) {
                for (const [key, templateValue] of Object.entries(config.settings)) {
                    const firmValue = firm.settings?.[key];
                    if (JSON.stringify(firmValue) !== JSON.stringify(templateValue)) {
                        differences.settings[key] = {
                            firm: firmValue,
                            template: templateValue,
                            different: true
                        };
                    }
                }
            }

            // Compare roles
            if (config.roles) {
                for (const roleConfig of config.roles) {
                    const firmRole = getDefaultPermissions(roleConfig.name);
                    const templateRole = roleConfig.permissions;

                    const roleDiffs = {};
                    for (const [perm, templateVal] of Object.entries(templateRole)) {
                        if (firmRole[perm] !== templateVal) {
                            roleDiffs[perm] = {
                                firm: firmRole[perm],
                                template: templateVal,
                                different: true
                            };
                        }
                    }

                    if (Object.keys(roleDiffs).length > 0) {
                        differences.roles[roleConfig.name] = roleDiffs;
                    }
                }
            }

            // Compare features
            if (config.features) {
                for (const [key, templateValue] of Object.entries(config.features)) {
                    const firmValue = firm.subscription?.features?.[key] || firm.aiSettings?.features?.[key];
                    if (firmValue !== templateValue) {
                        differences.features[key] = {
                            firm: firmValue,
                            template: templateValue,
                            different: true
                        };
                    }
                }
            }

            // Compare subscription limits
            if (config.subscriptionDefaults) {
                for (const [key, templateValue] of Object.entries(config.subscriptionDefaults)) {
                    const firmValue = firm.subscription?.[key];
                    if (firmValue !== templateValue) {
                        differences.subscription[key] = {
                            firm: firmValue,
                            template: templateValue,
                            different: true
                        };
                    }
                }
            }

            // Calculate drift score (percentage of differences)
            const totalComparisons =
                Object.keys(differences.settings).length +
                Object.keys(differences.roles).length +
                Object.keys(differences.features).length +
                Object.keys(differences.subscription).length;

            const totalPossible =
                (config.settings ? Object.keys(config.settings).length : 0) +
                (config.roles ? config.roles.reduce((sum, r) => sum + Object.keys(r.permissions).length, 0) : 0) +
                (config.features ? Object.keys(config.features).length : 0) +
                (config.subscriptionDefaults ? Object.keys(config.subscriptionDefaults).length : 0);

            const driftScore = totalPossible > 0 ? ((totalComparisons / totalPossible) * 100).toFixed(2) : 0;

            return {
                firm: {
                    id: firm._id,
                    name: firm.name
                },
                template: {
                    id: template._id,
                    name: template.name
                },
                differences,
                summary: {
                    totalDifferences: totalComparisons,
                    driftScore: parseFloat(driftScore),
                    driftLevel: driftScore < 10 ? 'low' : driftScore < 30 ? 'medium' : 'high',
                    hasDifferences: totalComparisons > 0
                }
            };
        } catch (error) {
            logger.error('Error comparing firm with template:', error);
            throw error;
        }
    }

    /**
     * Delete a template
     * @param {String} templateId - Template ID
     * @param {String} firmId - ID of firm owning the template
     * @returns {Promise<Object>} Deleted template
     */
    static async deleteTemplate(templateId, firmId) {
        try {
            const template = await OrganizationTemplate.findOne({ _id: templateId, firmId });

            if (!template) {
                throw new Error('Template not found');
            }

            if (template.isGlobal) {
                throw new Error('Cannot delete system templates');
            }

            if (template.isDefault) {
                throw new Error('Cannot delete the default template. Set another template as default first.');
            }

            await template.deleteOne();

            logger.info(`Template deleted: ${template.name} (${template._id})`);
            return template;
        } catch (error) {
            logger.error('Error deleting template:', error);
            throw error;
        }
    }

    /**
     * Set a template as the default
     * @param {String} templateId - Template ID
     * @returns {Promise<Object>} Updated template
     */
    static async setAsDefault(templateId) {
        try {
            const template = await OrganizationTemplate.setDefault(templateId);
            logger.info(`Template set as default: ${template.name}`);
            return template;
        } catch (error) {
            logger.error('Error setting default template:', error);
            throw error;
        }
    }

    /**
     * Get template statistics
     * @returns {Promise<Object>} Statistics
     */
    static async getStatistics() {
        try {
            const [
                total,
                active,
                inactive,
                global,
                userCreated,
                mostUsed,
                defaultTemplate
            ] = await Promise.all([
                OrganizationTemplate.countDocuments(),
                OrganizationTemplate.countDocuments({ isActive: true }),
                OrganizationTemplate.countDocuments({ isActive: false }),
                OrganizationTemplate.countDocuments({ isGlobal: true }),
                OrganizationTemplate.countDocuments({ isGlobal: false }),
                OrganizationTemplate.find({ isActive: true })
                    .sort({ usageCount: -1 })
                    .limit(5)
                    .select('name nameAr usageCount'),
                OrganizationTemplate.findOne({ isDefault: true })
                    .select('name nameAr')
            ]);

            return {
                total,
                active,
                inactive,
                global,
                userCreated,
                mostUsed,
                defaultTemplate
            };
        } catch (error) {
            logger.error('Error getting template statistics:', error);
            throw error;
        }
    }
}

module.exports = OrganizationTemplateService;
