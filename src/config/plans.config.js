/**
 * Plan Configuration - SMB vs Enterprise Tier System
 *
 * Defines plan limits, features, and pricing for the tier system.
 * Used by middleware and controllers to enforce plan restrictions.
 */

const PLANS = {
    free: {
        name: 'Free',
        nameAr: 'مجاني',
        limits: {
            maxUsers: 2,
            maxCases: 10,
            maxClients: 20,
            maxStorageMB: 100,
            maxDocumentsPerCase: 5,
            apiAccess: false,
            apiCallsPerMonth: 0,
        },
        features: [
            'basic_cases',
            'basic_clients',
            'basic_invoices',
            'email_support'
        ],
        price: { monthly: 0, annual: 0 }
    },

    starter: {
        name: 'Starter',
        nameAr: 'المبتدئ',
        limits: {
            maxUsers: 5,
            maxCases: 50,
            maxClients: 100,
            maxStorageMB: 1000,
            maxDocumentsPerCase: 20,
            apiAccess: false,
            apiCallsPerMonth: 0,
        },
        features: [
            'basic_cases',
            'basic_clients',
            'basic_invoices',
            'reports',
            'calendar_sync',
            'email_templates',
            'document_templates',
            'client_portal_basic',
            'priority_email_support'
        ],
        price: { monthly: 99, annual: 990 }
    },

    professional: {
        name: 'Professional',
        nameAr: 'المحترف',
        limits: {
            maxUsers: 20,
            maxCases: 500,
            maxClients: 1000,
            maxStorageMB: 10000,
            maxDocumentsPerCase: 100,
            apiAccess: true,
            apiCallsPerMonth: 10000,
        },
        features: [
            // All starter features
            'basic_cases',
            'basic_clients',
            'basic_invoices',
            'reports',
            'calendar_sync',
            'email_templates',
            'document_templates',
            'client_portal_basic',
            'priority_email_support',
            // Professional features
            'advanced_reports',
            'custom_fields',
            'bulk_operations',
            'api_access',
            'webhooks',
            'client_portal_advanced',
            'time_tracking_advanced',
            'workflow_automation',
            'priority_support'
        ],
        price: { monthly: 299, annual: 2990 }
    },

    enterprise: {
        name: 'Enterprise',
        nameAr: 'المؤسسات',
        limits: {
            maxUsers: -1, // unlimited
            maxCases: -1,
            maxClients: -1,
            maxStorageMB: -1,
            maxDocumentsPerCase: -1,
            apiAccess: true,
            apiCallsPerMonth: -1,
        },
        features: [
            // All professional features
            'basic_cases',
            'basic_clients',
            'basic_invoices',
            'reports',
            'calendar_sync',
            'email_templates',
            'document_templates',
            'client_portal_basic',
            'priority_email_support',
            'advanced_reports',
            'custom_fields',
            'bulk_operations',
            'api_access',
            'webhooks',
            'client_portal_advanced',
            'time_tracking_advanced',
            'workflow_automation',
            'priority_support',
            // Enterprise features
            'audit_logs',
            'sso_saml',
            'custom_branding',
            'white_label',
            'advanced_permissions',
            'ip_whitelist',
            'data_retention_control',
            'dedicated_support',
            'sla_guarantee',
            'custom_integrations',
            'onboarding_training',
            'enforce_2fa'
        ],
        price: { monthly: 'custom', annual: 'custom' }
    }
};

// Plan hierarchy for comparison
const PLAN_HIERARCHY = ['free', 'starter', 'professional', 'enterprise'];

// Feature to minimum plan mapping
const FEATURE_PLAN_MAP = {
    // Free features
    'basic_cases': 'free',
    'basic_clients': 'free',
    'basic_invoices': 'free',
    'email_support': 'free',

    // Starter features
    'reports': 'starter',
    'calendar_sync': 'starter',
    'email_templates': 'starter',
    'document_templates': 'starter',
    'client_portal_basic': 'starter',
    'priority_email_support': 'starter',

    // Professional features
    'advanced_reports': 'professional',
    'custom_fields': 'professional',
    'bulk_operations': 'professional',
    'api_access': 'professional',
    'webhooks': 'professional',
    'client_portal_advanced': 'professional',
    'time_tracking_advanced': 'professional',
    'workflow_automation': 'professional',
    'priority_support': 'professional',

    // Enterprise features
    'audit_logs': 'enterprise',
    'sso_saml': 'enterprise',
    'custom_branding': 'enterprise',
    'white_label': 'enterprise',
    'advanced_permissions': 'enterprise',
    'ip_whitelist': 'enterprise',
    'data_retention_control': 'enterprise',
    'dedicated_support': 'enterprise',
    'sla_guarantee': 'enterprise',
    'custom_integrations': 'enterprise',
    'onboarding_training': 'enterprise',
    'enforce_2fa': 'enterprise'
};

// Resource to limit key mapping
const RESOURCE_LIMIT_MAP = {
    'users': 'maxUsers',
    'cases': 'maxCases',
    'clients': 'maxClients',
    'storage': 'maxStorageMB',
    'documentsPerCase': 'maxDocumentsPerCase',
    'apiCalls': 'apiCallsPerMonth'
};

/**
 * Get plan configuration
 * @param {string} plan - Plan name
 * @returns {object} Plan configuration
 */
const getPlanConfig = (plan) => {
    return PLANS[plan] || PLANS.free;
};

/**
 * Check if a plan has a specific feature
 * @param {string} plan - Plan name
 * @param {string} feature - Feature name
 * @returns {boolean}
 */
const hasFeature = (plan, feature) => {
    const config = getPlanConfig(plan);
    return config.features.includes(feature);
};

/**
 * Get the minimum required plan for a feature
 * @param {string} feature - Feature name
 * @returns {string} Plan name
 */
const getRequiredPlanForFeature = (feature) => {
    return FEATURE_PLAN_MAP[feature] || 'enterprise';
};

/**
 * Check resource limits
 * @param {string} plan - Plan name
 * @param {string} resource - Resource name (users, cases, clients, etc.)
 * @param {number} currentUsage - Current usage count
 * @returns {object} Limit check result
 */
const checkLimit = (plan, resource, currentUsage) => {
    const config = getPlanConfig(plan);
    const limitKey = RESOURCE_LIMIT_MAP[resource] || resource;
    const limit = config.limits[limitKey];

    // -1 means unlimited
    if (limit === -1) {
        return {
            allowed: true,
            unlimited: true,
            current: currentUsage,
            limit: null,
            remaining: null,
            percentUsed: 0
        };
    }

    const percentUsed = limit > 0 ? Math.round((currentUsage / limit) * 100) : 0;

    return {
        allowed: currentUsage < limit,
        unlimited: false,
        current: currentUsage,
        limit,
        remaining: Math.max(0, limit - currentUsage),
        percentUsed,
        isNearLimit: percentUsed >= 80,
        isAtLimit: currentUsage >= limit
    };
};

/**
 * Check if user's plan is at least a certain level
 * @param {string} userPlan - User's current plan
 * @param {string} requiredPlan - Required minimum plan
 * @returns {boolean}
 */
const isPlanAtLeast = (userPlan, requiredPlan) => {
    const userIndex = PLAN_HIERARCHY.indexOf(userPlan);
    const requiredIndex = PLAN_HIERARCHY.indexOf(requiredPlan);

    if (userIndex === -1) return false;
    if (requiredIndex === -1) return false;

    return userIndex >= requiredIndex;
};

/**
 * Get plan limits
 * @param {string} plan - Plan name
 * @returns {object} Plan limits
 */
const getPlanLimits = (plan) => {
    const config = getPlanConfig(plan);
    return config.limits;
};

/**
 * Compare two plans and get the higher one
 * @param {string} plan1 - First plan
 * @param {string} plan2 - Second plan
 * @returns {string} Higher plan
 */
const getHigherPlan = (plan1, plan2) => {
    const index1 = PLAN_HIERARCHY.indexOf(plan1);
    const index2 = PLAN_HIERARCHY.indexOf(plan2);

    if (index1 >= index2) return plan1;
    return plan2;
};

/**
 * Get next upgrade plan
 * @param {string} currentPlan - Current plan
 * @returns {string|null} Next plan or null if at max
 */
const getNextPlan = (currentPlan) => {
    const currentIndex = PLAN_HIERARCHY.indexOf(currentPlan);
    if (currentIndex === -1 || currentIndex >= PLAN_HIERARCHY.length - 1) {
        return null;
    }
    return PLAN_HIERARCHY[currentIndex + 1];
};

/**
 * Get all available plans
 * @returns {object} All plans configuration
 */
const getAllPlans = () => {
    return PLANS;
};

/**
 * Check if API access is allowed for a plan
 * @param {string} plan - Plan name
 * @returns {boolean}
 */
const hasApiAccess = (plan) => {
    const config = getPlanConfig(plan);
    return config.limits.apiAccess === true;
};

module.exports = {
    PLANS,
    PLAN_HIERARCHY,
    FEATURE_PLAN_MAP,
    RESOURCE_LIMIT_MAP,
    getPlanConfig,
    hasFeature,
    getRequiredPlanForFeature,
    checkLimit,
    isPlanAtLeast,
    getPlanLimits,
    getHigherPlan,
    getNextPlan,
    getAllPlans,
    hasApiAccess
};
