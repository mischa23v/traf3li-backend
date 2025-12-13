/**
 * Firm Filter Middleware - Multi-Tenancy Data Isolation & RBAC
 *
 * This middleware ensures that:
 * 1. Users can only access data belonging to their firm
 * 2. All queries are automatically filtered by firmId
 * 3. Role-based permissions are enforced
 * 4. Departed employees have restricted access
 *
 * Usage:
 *   // After userMiddleware in routes
 *   router.get('/clients', userMiddleware, firmFilter, getClients);
 *   router.post('/clients', userMiddleware, checkFirmPermission('clients', 'edit'), createClient);
 *
 *   // In controllers, use req.firmId, req.firmQuery, req.permissions
 *   const clients = await Client.find({ ...req.firmQuery, ...otherFilters });
 */

const mongoose = require('mongoose');
const { Firm, User } = require('../models');
const CustomException = require('../utils/CustomException');
const {
    ROLE_PERMISSIONS,
    LEVEL_VALUES,
    WORK_MODES,
    getDefaultPermissions,
    getSoloLawyerPermissions,
    isSoloLawyer: checkIsSoloLawyer,
    resolveUserPermissions,
    meetsPermissionLevel,
    roleHasPermission,
    hasSpecialPermission,
    getDepartedRestrictions,
    getRequiredLevelForAction,
    // Casbin-style enforcer
    enforce,
    enforceSpecial,
    buildSubject,
    methodToAction
} = require('../config/permissions.config');

/**
 * Firm Filter Middleware
 * Attaches firmId, firmQuery, and permissions to the request object
 * Also handles solo lawyers who work independently without a firm
 */
const firmFilter = async (req, res, next) => {
    // ══════════════════════════════════════════════════════════════════
    // 🔍 DEBUG: Firm Filter Middleware
    // ══════════════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(80));
    console.log('🏢 [FIRM FILTER] Starting firm filter middleware...');
    console.log('📍 Route:', req.method, req.originalUrl);
    console.log('👤 User ID from token:', req.userID);
    console.log('─'.repeat(80));

    try {
        const userId = req.userID;

        if (!userId) {
            console.log('❌ [FIRM FILTER] No user ID - user not authenticated');
            throw CustomException('User not authenticated', 401);
        }

        console.log('🔍 [FIRM FILTER] Looking up user in database...');
        // Get user with firmId and solo lawyer info
        const user = await User.findById(userId).select('firmId firmRole firmStatus isSoloLawyer lawyerWorkMode role').lean();
        console.log('📋 [FIRM FILTER] User data:', JSON.stringify(user, null, 2));

        if (!user) {
            console.log('❌ [FIRM FILTER] User not found in database!');
            throw CustomException('User not found', 404);
        }

        console.log('✅ [FIRM FILTER] User found in database');

        // Set req.user for authorize middleware compatibility
        req.user = user;

        // Handle solo lawyers - they have full permissions without needing a firm
        // Uses Casbin-style domain check: solo lawyers have no tenant/domain
        console.log('🔍 [FIRM FILTER] Checking if user is solo lawyer...');
        console.log('📋 isSoloLawyer flag:', user.isSoloLawyer);
        console.log('📋 lawyerWorkMode:', user.lawyerWorkMode);
        console.log('📋 firmId:', user.firmId);
        console.log('📋 role:', user.role);

        if (checkIsSoloLawyer(user)) {
            console.log('✅ [FIRM FILTER] User is SOLO LAWYER - granting full permissions');
            req.firmId = null;
            req.firmRole = null;
            req.firmStatus = null;
            req.isDeparted = false;
            req.isSoloLawyer = true;
            req.workMode = WORK_MODES.SOLO;
            req.tenantId = null; // No tenant for solo lawyers
            req.firmQuery = { lawyerId: userId }; // Solo lawyers filter by their own ID
            req.permissions = getSoloLawyerPermissions(); // Solo lawyers get full permissions

            // Build subject for Casbin-style enforcement
            req.subject = buildSubject(
                { _id: userId, firmId: null, firmRole: null, isSoloLawyer: true, role: 'lawyer' },
                null
            );

            // Helper functions for solo lawyers
            req.hasPermission = () => true; // Solo lawyers have all permissions
            req.hasSpecialPermission = (permission) => {
                // Check special permissions specific to solo lawyers
                const soloPerms = getSoloLawyerPermissions();
                return soloPerms.special?.[permission] === true;
            };
            req.canAccessCase = () => true;
            req.canCreateFirm = () => true; // Solo lawyers can create a firm
            req.canJoinFirm = () => true; // Solo lawyers can join a firm
            req.addFirmId = (data) => {
                if (typeof data === 'object') {
                    data.lawyerId = userId;
                }
                return data;
            };
            req.getFirm = async () => null;

            // Casbin-style enforce helper for solo lawyers
            req.enforce = (resource, action) => {
                return enforce(req.subject, resource, action, null);
            };

            console.log('✅ [FIRM FILTER] Solo lawyer setup complete - calling next()');
            console.log('─'.repeat(80) + '\n');
            return next();
        }

        console.log('🔍 [FIRM FILTER] User is NOT a solo lawyer - checking firm membership...');

        // If user has firmId, use it for filtering
        if (user.firmId) {
            console.log('✅ [FIRM FILTER] User has firmId:', user.firmId);
            req.firmId = user.firmId;
            req.firmRole = user.firmRole;
            req.firmStatus = user.firmStatus || 'active';

            // Check if user is departed
            req.isDeparted = user.firmRole === 'departed' || user.firmStatus === 'departed';
            console.log('📋 [FIRM FILTER] Firm Role:', req.firmRole);
            console.log('📋 [FIRM FILTER] Firm Status:', req.firmStatus);
            console.log('📋 [FIRM FILTER] Is Departed:', req.isDeparted);

            // Create a query filter that can be spread into find queries
            req.firmQuery = { firmId: user.firmId };

            // Get member details from firm for permissions
            console.log('🔍 [FIRM FILTER] Looking up firm details...');
            const firm = await Firm.findById(user.firmId).select('members ownerId').lean();
            console.log('📋 [FIRM FILTER] Firm found:', firm ? 'YES' : 'NO');
            if (firm) {
                const member = firm.members.find(m => m.userId.toString() === userId);
                if (member) {
                    req.memberData = member;
                    req.permissions = member.permissions || getDefaultPermissions(user.firmRole);
                    req.memberStatus = member.status;

                    // For departed employees, capture their assigned cases
                    if (member.status === 'departed' || user.firmRole === 'departed') {
                        req.isDeparted = true;
                        req.assignedCases = member.assignedCases || [];
                        req.departedRestrictions = getDepartedRestrictions('departed');
                    }
                } else {
                    // User is owner but not in members array (legacy)
                    if (firm.ownerId.toString() === userId) {
                        req.permissions = getDefaultPermissions('owner');
                        req.memberStatus = 'active';
                    } else {
                        req.permissions = getDefaultPermissions(user.firmRole || 'secretary');
                        req.memberStatus = 'active';
                    }
                }
            }

            // Helper to get firm data
            req.getFirm = async () => {
                return Firm.findById(user.firmId).lean();
            };

            // Helper to check permissions
            req.hasPermission = (module, level = 'view') => {
                // Owner and admin always have access (unless departed)
                if (req.isDeparted) {
                    // Departed users only get restricted permissions
                    const departedPerms = ROLE_PERMISSIONS.departed;
                    const moduleLevel = departedPerms?.modules?.[module] || 'none';
                    return meetsPermissionLevel(moduleLevel, level);
                }

                if (['owner', 'admin'].includes(user.firmRole)) return true;

                // Check from permissions object
                const userLevel = req.permissions?.[module] || 'none';
                return meetsPermissionLevel(userLevel, level);
            };

            // Helper to check special permissions
            req.hasSpecialPermission = (permission) => {
                if (req.isDeparted) return false;
                if (['owner', 'admin'].includes(user.firmRole)) return true;
                return req.permissions?.[permission] === true;
            };

            // Helper for departed users to check if they can access a specific case
            req.canAccessCase = (caseId) => {
                if (!req.isDeparted) return true;
                if (!caseId) return false;
                return req.assignedCases?.some(c => c.toString() === caseId.toString());
            };

            // For departed users, create a restricted query
            if (req.isDeparted) {
                req.departedQuery = {
                    firmId: user.firmId,
                    $or: [
                        { assignedTo: userId },
                        { lawyerId: userId },
                        { createdBy: userId },
                        { 'team.userId': userId }
                    ]
                };
            }

            // Build subject for Casbin-style enforcement (firm members)
            req.subject = buildSubject(
                { _id: userId, firmId: user.firmId, firmRole: user.firmRole, isSoloLawyer: false, role: user.role },
                req.memberData
            );

            // Casbin-style enforce helper for firm members
            req.enforce = (resource, action) => {
                return enforce(req.subject, resource, action, user.firmId);
            };

            console.log('✅ [FIRM FILTER] Firm member setup complete');
        } else {
            // For backwards compatibility with users without firmId
            // Fall back to lawyerId-based filtering (treat as solo lawyer)
            console.log('⚠️ [FIRM FILTER] User has NO firmId - falling back to legacy mode');
            req.firmId = null;
            req.firmRole = null;
            req.firmStatus = null;
            req.isDeparted = false;
            req.isSoloLawyer = user.role === 'lawyer' || user.isSoloLawyer;
            req.firmQuery = user.role === 'lawyer' ? { lawyerId: userId } : {}; // Lawyers filter by their own ID
            req.permissions = user.role === 'lawyer' ? getDefaultPermissions('owner') : {};
            req.hasPermission = () => true; // Allow all for non-firm users
            req.hasSpecialPermission = () => true;
            req.canAccessCase = () => true;
            console.log('📋 [FIRM FILTER] Legacy mode - isSoloLawyer:', req.isSoloLawyer);
            console.log('📋 [FIRM FILTER] Legacy mode - firmQuery:', JSON.stringify(req.firmQuery));
        }

        // Helper function to add firmId to new documents
        req.addFirmId = (data) => {
            if (req.firmId && typeof data === 'object') {
                data.firmId = req.firmId;
            }
            return data;
        };

        console.log('✅ [FIRM FILTER] Middleware complete - calling next()');
        console.log('📋 [FIRM FILTER] Final state:');
        console.log('  - firmId:', req.firmId);
        console.log('  - firmRole:', req.firmRole);
        console.log('  - isDeparted:', req.isDeparted);
        console.log('  - isSoloLawyer:', req.isSoloLawyer);
        console.log('─'.repeat(80) + '\n');

        next();
    } catch (error) {
        console.log('❌ [FIRM FILTER] ERROR!');
        console.log('🔴 Error Name:', error.name);
        console.log('🔴 Error Message:', error.message);
        console.log('🔴 Error Status:', error.status);
        console.log('🔴 Error Stack:', error.stack);
        console.log('─'.repeat(80) + '\n');

        if (error.status) {
            return res.status(error.status).json({
                success: false,
                message: error.message
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Failed to validate firm access',
            error: error.message
        });
    }
};

/**
 * Require Firm Middleware
 * Use this for routes that REQUIRE a firmId
 */
const requireFirm = async (req, res, next) => {
    try {
        // First run firmFilter
        await new Promise((resolve, reject) => {
            firmFilter(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Then check if firmId exists
        if (!req.firmId) {
            return res.status(403).json({
                success: false,
                message: 'يجب أن تكون عضواً في مكتب محاماة للوصول إلى هذه الخدمة',
                code: 'FIRM_REQUIRED'
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to validate firm membership',
            error: error.message
        });
    }
};

/**
 * Check Firm Permission Middleware Factory
 * Creates a middleware that checks specific module permissions
 *
 * Usage:
 *   router.post('/invoices', userMiddleware, checkFirmPermission('invoices', 'edit'), createInvoice);
 *   router.delete('/clients/:id', userMiddleware, checkFirmPermission('clients', 'full'), deleteClient);
 */
const checkFirmPermission = (module, requiredLevel = 'view') => {
    return async (req, res, next) => {
        try {
            // First run firmFilter
            await new Promise((resolve, reject) => {
                firmFilter(req, res, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // If no firmId, allow for backwards compatibility
            if (!req.firmId) {
                return next();
            }

            // Check if user is departed
            if (req.isDeparted) {
                // Departed users can only view, never edit/create/delete
                if (requiredLevel !== 'view') {
                    return res.status(403).json({
                        success: false,
                        message: 'لم يعد لديك صلاحية التعديل بعد مغادرة المكتب',
                        code: 'DEPARTED_READ_ONLY'
                    });
                }

                // Check if departed user has access to this module at all
                const departedPerms = ROLE_PERMISSIONS.departed;
                const moduleLevel = departedPerms?.modules?.[module] || 'none';
                if (moduleLevel === 'none') {
                    return res.status(403).json({
                        success: false,
                        message: 'ليس لديك صلاحية للوصول إلى هذا القسم',
                        code: 'PERMISSION_DENIED'
                    });
                }

                return next();
            }

            // Owner and admin always have access
            if (['owner', 'admin'].includes(req.firmRole)) {
                return next();
            }

            // Get firm and check permissions
            const firm = await Firm.findById(req.firmId).lean();
            if (!firm) {
                return res.status(404).json({
                    success: false,
                    message: 'Firm not found'
                });
            }

            const member = firm.members.find(m => m.userId.toString() === req.userID.toString());
            if (!member) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not a member of this firm'
                });
            }

            // Check if member is suspended
            if (member.status === 'suspended') {
                return res.status(403).json({
                    success: false,
                    message: 'حسابك معلق. يرجى التواصل مع مدير المكتب',
                    code: 'ACCOUNT_SUSPENDED'
                });
            }

            // Check permission level
            const userLevel = member.permissions?.[module] || 'none';
            if (!meetsPermissionLevel(userLevel, requiredLevel)) {
                return res.status(403).json({
                    success: false,
                    message: `ليس لديك صلاحية للوصول إلى ${module}`,
                    code: 'PERMISSION_DENIED'
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to check permissions',
                error: error.message
            });
        }
    };
};

/**
 * Check Special Permission Middleware Factory
 * For checking special boolean permissions like canApproveInvoices
 *
 * Usage:
 *   router.post('/invoices/:id/approve', userMiddleware, checkSpecialPermission('canApproveInvoices'), approveInvoice);
 */
const checkSpecialPermission = (permission) => {
    return async (req, res, next) => {
        try {
            await new Promise((resolve, reject) => {
                firmFilter(req, res, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            if (!req.firmId) {
                return next();
            }

            // Departed users never have special permissions
            if (req.isDeparted) {
                return res.status(403).json({
                    success: false,
                    message: 'لم يعد لديك هذه الصلاحية',
                    code: 'DEPARTED_NO_SPECIAL_PERMISSION'
                });
            }

            // Owner and admin always have special permissions
            if (['owner', 'admin'].includes(req.firmRole)) {
                return next();
            }

            if (!req.permissions?.[permission]) {
                return res.status(403).json({
                    success: false,
                    message: 'ليس لديك صلاحية لهذا الإجراء',
                    code: 'SPECIAL_PERMISSION_DENIED'
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to check special permission',
                error: error.message
            });
        }
    };
};

/**
 * Block Departed Middleware
 * Use this for routes that should be completely blocked for departed users
 *
 * Usage:
 *   router.post('/clients', userMiddleware, blockDeparted, createClient);
 */
const blockDeparted = async (req, res, next) => {
    try {
        await new Promise((resolve, reject) => {
            firmFilter(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'لم يعد لديك صلاحية الوصول إلى هذه الخدمة',
                code: 'DEPARTED_BLOCKED'
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to validate access',
            error: error.message
        });
    }
};

/**
 * Firm Owner Only Middleware
 * Only allows firm owners to access the route
 */
const firmOwnerOnly = async (req, res, next) => {
    try {
        await new Promise((resolve, reject) => {
            firmFilter(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (!req.firmId) {
            return res.status(403).json({
                success: false,
                message: 'Firm membership required'
            });
        }

        if (req.firmRole !== 'owner') {
            return res.status(403).json({
                success: false,
                message: 'هذا الإجراء متاح لمالك المكتب فقط',
                code: 'OWNER_ONLY'
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to validate ownership',
            error: error.message
        });
    }
};

/**
 * Firm Admin Only Middleware
 * Only allows firm owners and admins to access the route
 */
const firmAdminOnly = async (req, res, next) => {
    try {
        await new Promise((resolve, reject) => {
            firmFilter(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (!req.firmId) {
            return res.status(403).json({
                success: false,
                message: 'Firm membership required'
            });
        }

        if (!['owner', 'admin'].includes(req.firmRole)) {
            return res.status(403).json({
                success: false,
                message: 'هذا الإجراء متاح للمسؤولين فقط',
                code: 'ADMIN_ONLY'
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to validate admin access',
            error: error.message
        });
    }
};

/**
 * Finance Access Only Middleware
 * Only allows users with finance access (canViewFinance permission)
 */
const financeAccessOnly = async (req, res, next) => {
    try {
        await new Promise((resolve, reject) => {
            firmFilter(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (!req.firmId) {
            return next(); // Allow for non-firm users
        }

        // Departed users never have finance access
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول إلى المعلومات المالية',
                code: 'DEPARTED_NO_FINANCE'
            });
        }

        // Check canViewFinance permission
        if (!req.hasSpecialPermission('canViewFinance')) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول إلى المعلومات المالية',
                code: 'NO_FINANCE_ACCESS'
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to validate finance access',
            error: error.message
        });
    }
};

/**
 * Team Management Access Middleware
 * Only allows users who can manage team (owner, admin, or canManageTeam)
 */
const teamManagementOnly = async (req, res, next) => {
    try {
        await new Promise((resolve, reject) => {
            firmFilter(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (!req.firmId) {
            return res.status(403).json({
                success: false,
                message: 'Firm membership required'
            });
        }

        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لإدارة فريق العمل',
                code: 'DEPARTED_NO_TEAM_MANAGEMENT'
            });
        }

        if (!req.hasSpecialPermission('canManageTeam') && !['owner', 'admin'].includes(req.firmRole)) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لإدارة فريق العمل',
                code: 'NO_TEAM_MANAGEMENT_ACCESS'
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to validate team management access',
            error: error.message
        });
    }
};

module.exports = {
    firmFilter,
    requireFirm,
    checkFirmPermission,
    checkSpecialPermission,
    blockDeparted,
    firmOwnerOnly,
    firmAdminOnly,
    financeAccessOnly,
    teamManagementOnly
};
