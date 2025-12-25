/**
 * Default Playbooks Seed Data
 *
 * Provides default incident response playbooks for common scenarios:
 * - Database connection failure
 * - High API latency
 * - Authentication service down
 * - Payment gateway failure
 * - Disk space critical
 */

const defaultPlaybooks = [
  // ═══════════════════════════════════════════════════════════════
  // DATABASE CONNECTION FAILURE
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Database Connection Failure Response',
    description: 'Automated response procedure for database connection failures',
    category: 'infrastructure',
    severity: 'critical',
    triggerConditions: [
      {
        field: 'title',
        operator: 'contains',
        value: 'database'
      }
    ],
    steps: [
      {
        order: 1,
        title: 'Check Database Service Status',
        description: 'Verify database service is running and accessible',
        actionType: 'automated',
        action: {
          type: 'health_check',
          target: 'database',
          timeout: 30
        },
        requiredRole: null,
        timeout: 5,
        onSuccess: {
          nextStep: 2,
          complete: false
        },
        onFailure: {
          retry: true,
          maxRetries: 3,
          escalate: true,
          abort: false
        }
      },
      {
        order: 2,
        title: 'Restart Database Connection Pool',
        description: 'Attempt to restart the database connection pool',
        actionType: 'automated',
        action: {
          type: 'restart',
          target: 'connection_pool'
        },
        requiredRole: null,
        timeout: 10,
        onSuccess: {
          nextStep: 3,
          complete: false
        },
        onFailure: {
          retry: true,
          maxRetries: 2,
          escalate: true,
          abort: false
        }
      },
      {
        order: 3,
        title: 'Notify Database Administrator',
        description: 'Send notification to database administrator',
        actionType: 'notification',
        action: {
          type: 'email',
          recipients: ['dba@company.com'],
          subject: 'Critical: Database Connection Failure',
          priority: 'critical'
        },
        requiredRole: null,
        timeout: 2,
        onSuccess: {
          nextStep: 4,
          complete: false
        },
        onFailure: {
          retry: false,
          escalate: false,
          abort: false
        }
      },
      {
        order: 4,
        title: 'Enable Read-Only Mode',
        description: 'Enable read-only mode if database is unavailable',
        actionType: 'manual',
        action: {
          type: 'config_change',
          parameter: 'read_only_mode',
          value: true
        },
        requiredRole: 'admin',
        timeout: 15,
        onSuccess: {
          nextStep: null,
          complete: true
        },
        onFailure: {
          retry: false,
          escalate: true,
          abort: false
        }
      }
    ],
    escalationPath: [],
    isActive: true,
    version: 1
  },

  // ═══════════════════════════════════════════════════════════════
  // HIGH API LATENCY
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'High API Latency Response',
    description: 'Response procedure for high API latency issues',
    category: 'performance',
    severity: 'high',
    triggerConditions: [
      {
        field: 'title',
        operator: 'contains',
        value: 'latency'
      }
    ],
    steps: [
      {
        order: 1,
        title: 'Check System Resources',
        description: 'Monitor CPU, memory, and network utilization',
        actionType: 'automated',
        action: {
          type: 'metrics_check',
          metrics: ['cpu', 'memory', 'network']
        },
        requiredRole: null,
        timeout: 5,
        onSuccess: {
          nextStep: 2,
          complete: false
        },
        onFailure: {
          retry: true,
          maxRetries: 2,
          escalate: false,
          abort: false
        }
      },
      {
        order: 2,
        title: 'Clear Application Cache',
        description: 'Clear application cache to improve performance',
        actionType: 'automated',
        action: {
          type: 'cache_clear',
          target: 'application'
        },
        requiredRole: null,
        timeout: 10,
        onSuccess: {
          nextStep: 3,
          complete: false
        },
        onFailure: {
          retry: true,
          maxRetries: 1,
          escalate: false,
          abort: false
        }
      },
      {
        order: 3,
        title: 'Scale Application Instances',
        description: 'Scale up application instances to handle load',
        actionType: 'manual',
        action: {
          type: 'scale',
          direction: 'up',
          instances: 2
        },
        requiredRole: 'admin',
        timeout: 20,
        onSuccess: {
          nextStep: 4,
          complete: false
        },
        onFailure: {
          retry: false,
          escalate: true,
          abort: false
        }
      },
      {
        order: 4,
        title: 'Monitor Performance Metrics',
        description: 'Continue monitoring for 30 minutes',
        actionType: 'manual',
        action: {
          type: 'monitor',
          duration: 30
        },
        requiredRole: null,
        timeout: 35,
        onSuccess: {
          nextStep: null,
          complete: true
        },
        onFailure: {
          retry: false,
          escalate: true,
          abort: false
        }
      }
    ],
    escalationPath: [],
    isActive: true,
    version: 1
  },

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION SERVICE DOWN
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Authentication Service Down Response',
    description: 'Response procedure for authentication service outages',
    category: 'security',
    severity: 'critical',
    triggerConditions: [
      {
        field: 'title',
        operator: 'contains',
        value: 'authentication'
      }
    ],
    steps: [
      {
        order: 1,
        title: 'Verify Service Status',
        description: 'Check authentication service health endpoints',
        actionType: 'automated',
        action: {
          type: 'health_check',
          target: 'auth_service'
        },
        requiredRole: null,
        timeout: 5,
        onSuccess: {
          nextStep: 2,
          complete: false
        },
        onFailure: {
          retry: true,
          maxRetries: 3,
          escalate: true,
          abort: false
        }
      },
      {
        order: 2,
        title: 'Restart Authentication Service',
        description: 'Attempt to restart the authentication service',
        actionType: 'automated',
        action: {
          type: 'service_restart',
          service: 'authentication'
        },
        requiredRole: null,
        timeout: 15,
        onSuccess: {
          nextStep: 3,
          complete: false
        },
        onFailure: {
          retry: true,
          maxRetries: 2,
          escalate: true,
          abort: false
        }
      },
      {
        order: 3,
        title: 'Enable Fallback Authentication',
        description: 'Switch to backup authentication method',
        actionType: 'manual',
        action: {
          type: 'config_change',
          parameter: 'auth_fallback',
          value: true
        },
        requiredRole: 'admin',
        timeout: 10,
        onSuccess: {
          nextStep: 4,
          complete: false
        },
        onFailure: {
          retry: false,
          escalate: true,
          abort: false
        }
      },
      {
        order: 4,
        title: 'Notify Security Team',
        description: 'Alert security team of authentication service failure',
        actionType: 'notification',
        action: {
          type: 'email',
          recipients: ['security@company.com'],
          subject: 'Critical: Authentication Service Down',
          priority: 'critical'
        },
        requiredRole: null,
        timeout: 2,
        onSuccess: {
          nextStep: null,
          complete: true
        },
        onFailure: {
          retry: false,
          escalate: false,
          abort: false
        }
      }
    ],
    escalationPath: [],
    isActive: true,
    version: 1
  },

  // ═══════════════════════════════════════════════════════════════
  // PAYMENT GATEWAY FAILURE
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Payment Gateway Failure Response',
    description: 'Response procedure for payment gateway failures',
    category: 'integration',
    severity: 'critical',
    triggerConditions: [
      {
        field: 'title',
        operator: 'contains',
        value: 'payment'
      }
    ],
    steps: [
      {
        order: 1,
        title: 'Check Payment Gateway Status',
        description: 'Verify payment gateway API availability',
        actionType: 'automated',
        action: {
          type: 'api_check',
          endpoint: 'payment_gateway_health'
        },
        requiredRole: null,
        timeout: 10,
        onSuccess: {
          nextStep: 2,
          complete: false
        },
        onFailure: {
          retry: true,
          maxRetries: 3,
          escalate: true,
          abort: false
        }
      },
      {
        order: 2,
        title: 'Switch to Backup Payment Provider',
        description: 'Failover to backup payment provider',
        actionType: 'manual',
        action: {
          type: 'config_change',
          parameter: 'payment_provider',
          value: 'backup'
        },
        requiredRole: 'admin',
        timeout: 15,
        onSuccess: {
          nextStep: 3,
          complete: false
        },
        onFailure: {
          retry: false,
          escalate: true,
          abort: false
        }
      },
      {
        order: 3,
        title: 'Notify Finance Team',
        description: 'Alert finance team of payment gateway issues',
        actionType: 'notification',
        action: {
          type: 'email',
          recipients: ['finance@company.com'],
          subject: 'Critical: Payment Gateway Failure',
          priority: 'critical'
        },
        requiredRole: null,
        timeout: 2,
        onSuccess: {
          nextStep: 4,
          complete: false
        },
        onFailure: {
          retry: false,
          escalate: false,
          abort: false
        }
      },
      {
        order: 4,
        title: 'Queue Failed Transactions',
        description: 'Queue failed transactions for retry',
        actionType: 'automated',
        action: {
          type: 'queue_transactions',
          target: 'payment_retry_queue'
        },
        requiredRole: null,
        timeout: 10,
        onSuccess: {
          nextStep: null,
          complete: true
        },
        onFailure: {
          retry: true,
          maxRetries: 2,
          escalate: true,
          abort: false
        }
      }
    ],
    escalationPath: [],
    isActive: true,
    version: 1
  },

  // ═══════════════════════════════════════════════════════════════
  // DISK SPACE CRITICAL
  // ═══════════════════════════════════════════════════════════════
  {
    name: 'Disk Space Critical Response',
    description: 'Response procedure for critical disk space issues',
    category: 'infrastructure',
    severity: 'high',
    triggerConditions: [
      {
        field: 'title',
        operator: 'contains',
        value: 'disk'
      }
    ],
    steps: [
      {
        order: 1,
        title: 'Check Disk Usage',
        description: 'Identify directories consuming most space',
        actionType: 'automated',
        action: {
          type: 'disk_analysis',
          threshold: 90
        },
        requiredRole: null,
        timeout: 10,
        onSuccess: {
          nextStep: 2,
          complete: false
        },
        onFailure: {
          retry: true,
          maxRetries: 2,
          escalate: false,
          abort: false
        }
      },
      {
        order: 2,
        title: 'Clear Temporary Files',
        description: 'Remove temporary and cache files',
        actionType: 'automated',
        action: {
          type: 'cleanup',
          target: ['temp', 'cache', 'logs']
        },
        requiredRole: null,
        timeout: 15,
        onSuccess: {
          nextStep: 3,
          complete: false
        },
        onFailure: {
          retry: true,
          maxRetries: 1,
          escalate: false,
          abort: false
        }
      },
      {
        order: 3,
        title: 'Archive Old Logs',
        description: 'Archive logs older than 30 days',
        actionType: 'automated',
        action: {
          type: 'archive',
          target: 'logs',
          age_days: 30
        },
        requiredRole: null,
        timeout: 20,
        onSuccess: {
          nextStep: 4,
          complete: false
        },
        onFailure: {
          retry: false,
          escalate: false,
          abort: false
        }
      },
      {
        order: 4,
        title: 'Expand Storage or Alert Infrastructure Team',
        description: 'If space still critical, expand storage or escalate',
        actionType: 'manual',
        action: {
          type: 'expand_storage',
          or: 'escalate'
        },
        requiredRole: 'admin',
        timeout: 30,
        onSuccess: {
          nextStep: null,
          complete: true
        },
        onFailure: {
          retry: false,
          escalate: true,
          abort: false
        }
      }
    ],
    escalationPath: [],
    isActive: true,
    version: 1
  }
];

module.exports = defaultPlaybooks;
