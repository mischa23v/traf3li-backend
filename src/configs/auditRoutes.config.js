/**
 * Audit Routes Configuration
 *
 * Comprehensive mapping of routes to audit actions with severity levels,
 * before/after state capture requirements, and compliance tags.
 *
 * This configuration ensures consistent audit logging across the entire application
 * for compliance (PDPL, SOX, ISO27001) and security monitoring.
 */

/**
 * Audit Action Configuration
 * Defines how each route should be audited
 */
const auditConfig = {
  // ═══════════════════════════════════════════════════════════════
  // CASE MANAGEMENT - All CRUD operations
  // ═══════════════════════════════════════════════════════════════
  case: {
    entityType: 'case',
    routes: {
      create: {
        action: 'create_case',
        severity: 'medium',
        captureChanges: false,
        complianceTags: ['PDPL', 'ISO27001'],
      },
      update: {
        action: 'update_case',
        severity: 'medium',
        captureChanges: true,
        complianceTags: ['PDPL', 'ISO27001'],
      },
      delete: {
        action: 'delete_case',
        severity: 'high',
        captureChanges: true,
        complianceTags: ['PDPL', 'ISO27001', 'data-deletion'],
      },
      read: {
        action: 'view_case',
        severity: 'low',
        captureChanges: false,
        skipGET: false, // We want to track case views
        complianceTags: ['PDPL'],
      },
      addNote: {
        action: 'add_case_note',
        severity: 'low',
        captureChanges: false,
      },
      updateNote: {
        action: 'update_case_note',
        severity: 'low',
        captureChanges: true,
      },
      deleteNote: {
        action: 'delete_case_note',
        severity: 'medium',
        captureChanges: true,
      },
      addDocument: {
        action: 'add_case_document',
        severity: 'medium',
        captureChanges: false,
      },
      deleteDocument: {
        action: 'delete_case_document',
        severity: 'high',
        captureChanges: true,
      },
      moveStage: {
        action: 'move_case_stage',
        severity: 'medium',
        captureChanges: true,
      },
      endCase: {
        action: 'end_case',
        severity: 'high',
        captureChanges: true,
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // CLIENT MANAGEMENT - All CRUD operations
  // ═══════════════════════════════════════════════════════════════
  client: {
    entityType: 'client',
    routes: {
      create: {
        action: 'create_client',
        severity: 'medium',
        captureChanges: false,
        complianceTags: ['PDPL', 'ISO27001'],
      },
      update: {
        action: 'update_client',
        severity: 'medium',
        captureChanges: true,
        complianceTags: ['PDPL', 'ISO27001'],
      },
      delete: {
        action: 'delete_client',
        severity: 'high',
        captureChanges: true,
        complianceTags: ['PDPL', 'ISO27001', 'data-deletion'],
      },
      bulkDelete: {
        action: 'bulk_delete_clients',
        severity: 'critical',
        captureChanges: true,
        complianceTags: ['PDPL', 'ISO27001', 'data-deletion'],
      },
      read: {
        action: 'view_client',
        severity: 'low',
        captureChanges: false,
        skipGET: true,
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // INVOICE MANAGEMENT - All CRUD operations
  // ═══════════════════════════════════════════════════════════════
  invoice: {
    entityType: 'invoice',
    routes: {
      create: {
        action: 'create_invoice',
        severity: 'medium',
        captureChanges: false,
        complianceTags: ['SOX', 'ISO27001'],
      },
      update: {
        action: 'update_invoice',
        severity: 'medium',
        captureChanges: true,
        complianceTags: ['SOX', 'ISO27001'],
      },
      delete: {
        action: 'delete_invoice',
        severity: 'high',
        captureChanges: true,
        complianceTags: ['SOX', 'ISO27001'],
      },
      bulkDelete: {
        action: 'bulk_delete_invoices',
        severity: 'critical',
        captureChanges: true,
        complianceTags: ['SOX', 'ISO27001'],
      },
      send: {
        action: 'send_invoice',
        severity: 'medium',
        captureChanges: false,
      },
      void: {
        action: 'void_invoice',
        severity: 'high',
        captureChanges: true,
        complianceTags: ['SOX'],
      },
      approve: {
        action: 'approve_invoice',
        severity: 'high',
        captureChanges: true,
        complianceTags: ['SOX'],
      },
      reject: {
        action: 'reject_invoice',
        severity: 'high',
        captureChanges: true,
        complianceTags: ['SOX'],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // PAYMENT MANAGEMENT - All CRUD operations
  // ═══════════════════════════════════════════════════════════════
  payment: {
    entityType: 'payment',
    routes: {
      create: {
        action: 'create_payment',
        severity: 'high',
        captureChanges: false,
        complianceTags: ['SOX', 'PCI-DSS', 'ISO27001'],
      },
      update: {
        action: 'update_payment',
        severity: 'high',
        captureChanges: true,
        complianceTags: ['SOX', 'PCI-DSS', 'ISO27001'],
      },
      delete: {
        action: 'delete_payment',
        severity: 'critical',
        captureChanges: true,
        complianceTags: ['SOX', 'PCI-DSS', 'ISO27001'],
      },
      bulkDelete: {
        action: 'bulk_delete_payments',
        severity: 'critical',
        captureChanges: true,
        complianceTags: ['SOX', 'PCI-DSS', 'ISO27001'],
      },
      refund: {
        action: 'refund_payment',
        severity: 'critical',
        captureChanges: true,
        complianceTags: ['SOX', 'PCI-DSS'],
      },
      reconcile: {
        action: 'reconcile_payment',
        severity: 'high',
        captureChanges: true,
        complianceTags: ['SOX'],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // DOCUMENT MANAGEMENT - Upload, download, delete
  // ═══════════════════════════════════════════════════════════════
  document: {
    entityType: 'document',
    routes: {
      upload: {
        action: 'upload_document',
        severity: 'medium',
        captureChanges: false,
        complianceTags: ['PDPL', 'ISO27001'],
      },
      download: {
        action: 'download_document',
        severity: 'low',
        captureChanges: false,
        skipGET: false, // Track document downloads
        complianceTags: ['PDPL', 'ISO27001'],
      },
      view: {
        action: 'view_document',
        severity: 'low',
        captureChanges: false,
        skipGET: false, // Track document views
        complianceTags: ['PDPL'],
      },
      update: {
        action: 'update_document',
        severity: 'medium',
        captureChanges: true,
        complianceTags: ['PDPL', 'ISO27001'],
      },
      delete: {
        action: 'delete_document',
        severity: 'high',
        captureChanges: true,
        complianceTags: ['PDPL', 'ISO27001', 'data-deletion'],
      },
      bulkDelete: {
        action: 'bulk_delete_documents',
        severity: 'critical',
        captureChanges: true,
        complianceTags: ['PDPL', 'ISO27001', 'data-deletion'],
      },
      share: {
        action: 'share_document',
        severity: 'high',
        captureChanges: false,
        complianceTags: ['PDPL', 'ISO27001'],
      },
      revokeShare: {
        action: 'revoke_document_share',
        severity: 'medium',
        captureChanges: false,
        complianceTags: ['PDPL', 'ISO27001'],
      },
      uploadVersion: {
        action: 'upload_document_version',
        severity: 'medium',
        captureChanges: false,
      },
      restoreVersion: {
        action: 'restore_document_version',
        severity: 'high',
        captureChanges: true,
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // USER MANAGEMENT - Profile updates, role changes
  // ═══════════════════════════════════════════════════════════════
  user: {
    entityType: 'user',
    routes: {
      updateProfile: {
        action: 'update_profile',
        severity: 'medium',
        captureChanges: true,
        complianceTags: ['PDPL', 'ISO27001'],
      },
      deleteAccount: {
        action: 'delete_user',
        severity: 'critical',
        captureChanges: true,
        complianceTags: ['PDPL', 'ISO27001', 'data-deletion'],
      },
      updateRole: {
        action: 'update_role',
        severity: 'critical',
        captureChanges: true,
        complianceTags: ['ISO27001', 'SOX'],
      },
      updateNotificationPreferences: {
        action: 'update_notification_preferences',
        severity: 'low',
        captureChanges: true,
      },
      convertToFirm: {
        action: 'convert_to_firm',
        severity: 'high',
        captureChanges: true,
        complianceTags: ['ISO27001'],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // FIRM MANAGEMENT - Settings changes, member management
  // ═══════════════════════════════════════════════════════════════
  firm: {
    entityType: 'firm',
    routes: {
      create: {
        action: 'create_firm',
        severity: 'high',
        captureChanges: false,
        complianceTags: ['ISO27001'],
      },
      updateSettings: {
        action: 'update_firm_settings',
        severity: 'high',
        captureChanges: true,
        complianceTags: ['ISO27001', 'SOX'],
      },
      updateBilling: {
        action: 'update_billing_settings',
        severity: 'high',
        captureChanges: true,
        complianceTags: ['SOX', 'PCI-DSS'],
      },
      inviteMember: {
        action: 'invite_firm_member',
        severity: 'high',
        captureChanges: false,
        complianceTags: ['ISO27001'],
      },
      updateMember: {
        action: 'update_member_role',
        severity: 'critical',
        captureChanges: true,
        complianceTags: ['ISO27001', 'SOX'],
      },
      removeMember: {
        action: 'remove_firm_member',
        severity: 'critical',
        captureChanges: true,
        complianceTags: ['ISO27001', 'PDPL'],
      },
      departMember: {
        action: 'depart_firm_member',
        severity: 'high',
        captureChanges: true,
        complianceTags: ['ISO27001', 'PDPL'],
      },
      reinstateMember: {
        action: 'reinstate_firm_member',
        severity: 'high',
        captureChanges: true,
        complianceTags: ['ISO27001'],
      },
      transferOwnership: {
        action: 'transfer_firm_ownership',
        severity: 'critical',
        captureChanges: true,
        complianceTags: ['ISO27001', 'SOX'],
      },
      leaveFirm: {
        action: 'leave_firm',
        severity: 'high',
        captureChanges: true,
        complianceTags: ['ISO27001'],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // PERMISSION MANAGEMENT - Permission changes
  // ═══════════════════════════════════════════════════════════════
  permission: {
    entityType: 'permission',
    routes: {
      updatePermissions: {
        action: 'update_permissions',
        severity: 'critical',
        captureChanges: true,
        complianceTags: ['ISO27001', 'SOX'],
      },
      grantAccess: {
        action: 'grant_access',
        severity: 'critical',
        captureChanges: true,
        complianceTags: ['ISO27001', 'SOX'],
      },
      revokeAccess: {
        action: 'revoke_access',
        severity: 'critical',
        captureChanges: true,
        complianceTags: ['ISO27001', 'SOX'],
      },
      addPolicy: {
        action: 'add_permission_policy',
        severity: 'critical',
        captureChanges: false,
        complianceTags: ['ISO27001', 'SOX'],
      },
      updatePolicy: {
        action: 'update_permission_policy',
        severity: 'critical',
        captureChanges: true,
        complianceTags: ['ISO27001', 'SOX'],
      },
      deletePolicy: {
        action: 'delete_permission_policy',
        severity: 'critical',
        captureChanges: true,
        complianceTags: ['ISO27001', 'SOX'],
      },
      updateConfig: {
        action: 'update_permission_config',
        severity: 'critical',
        captureChanges: true,
        complianceTags: ['ISO27001', 'SOX'],
      },
      grantRelation: {
        action: 'grant_relation',
        severity: 'high',
        captureChanges: false,
        complianceTags: ['ISO27001'],
      },
      revokeRelation: {
        action: 'revoke_relation',
        severity: 'high',
        captureChanges: false,
        complianceTags: ['ISO27001'],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // DATA EXPORT - High severity, track all exports
  // ═══════════════════════════════════════════════════════════════
  dataExport: {
    entityType: 'export_job',
    routes: {
      create: {
        action: 'export_data',
        severity: 'critical',
        captureChanges: false,
        complianceTags: ['PDPL', 'ISO27001', 'data-portability'],
      },
      download: {
        action: 'download_export',
        severity: 'high',
        captureChanges: false,
        skipGET: false, // Track downloads
        complianceTags: ['PDPL', 'ISO27001'],
      },
      bulkExport: {
        action: 'bulk_export',
        severity: 'critical',
        captureChanges: false,
        complianceTags: ['PDPL', 'ISO27001', 'data-portability'],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // SEARCH QUERIES - Low severity, configurable
  // ═══════════════════════════════════════════════════════════════
  search: {
    entityType: 'search',
    routes: {
      query: {
        action: 'search_query',
        severity: 'low',
        captureChanges: false,
        skipGET: false, // Track searches for analytics
      },
    },
  },
};

/**
 * Helper function to get audit configuration for a specific entity and route
 * @param {String} entity - Entity type (e.g., 'case', 'client')
 * @param {String} route - Route name (e.g., 'create', 'update')
 * @returns {Object|null} - Audit configuration or null
 */
function getAuditConfig(entity, route) {
  const entityConfig = auditConfig[entity];
  if (!entityConfig) return null;

  const routeConfig = entityConfig.routes[route];
  if (!routeConfig) return null;

  return {
    entityType: entityConfig.entityType,
    ...routeConfig,
  };
}

/**
 * Helper function to determine if a route should be audited
 * @param {String} entity - Entity type
 * @param {String} route - Route name
 * @returns {Boolean} - Whether route should be audited
 */
function shouldAuditRoute(entity, route) {
  const config = getAuditConfig(entity, route);
  return config !== null;
}

/**
 * Get all high severity routes for security monitoring
 * @returns {Array} - Array of high severity route configurations
 */
function getHighSeverityRoutes() {
  const highSeverityRoutes = [];

  Object.entries(auditConfig).forEach(([entity, config]) => {
    Object.entries(config.routes).forEach(([route, routeConfig]) => {
      if (['high', 'critical'].includes(routeConfig.severity)) {
        highSeverityRoutes.push({
          entity,
          route,
          entityType: config.entityType,
          ...routeConfig,
        });
      }
    });
  });

  return highSeverityRoutes;
}

/**
 * Get all routes requiring before/after state capture
 * @returns {Array} - Array of routes requiring state capture
 */
function getStateCaptureRoutes() {
  const stateCaptureRoutes = [];

  Object.entries(auditConfig).forEach(([entity, config]) => {
    Object.entries(config.routes).forEach(([route, routeConfig]) => {
      if (routeConfig.captureChanges) {
        stateCaptureRoutes.push({
          entity,
          route,
          entityType: config.entityType,
          ...routeConfig,
        });
      }
    });
  });

  return stateCaptureRoutes;
}

module.exports = {
  auditConfig,
  getAuditConfig,
  shouldAuditRoute,
  getHighSeverityRoutes,
  getStateCaptureRoutes,
};
