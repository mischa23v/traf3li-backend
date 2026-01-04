/**
 * MongoDB Index Optimization Script
 *
 * Creates optimized indexes for frequently queried collections in the law firm management system.
 * This script is idempotent - running multiple times will not create duplicate indexes.
 *
 * Usage: npm run db:indexes
 */

require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Database connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            maxPoolSize: 10,
            minPoolSize: 2
        });
        logger.info('MongoDB connected for index creation...');
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

/**
 * Index definitions for each collection
 * Format: { collection: 'name', indexes: [{ keys, options }] }
 */
const indexDefinitions = [
    // ═══════════════════════════════════════════════════════════════
    // USER COLLECTION - Critical for auth performance
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'users',
        indexes: [
            // Primary lookups (auth/me endpoint)
            { keys: { email: 1 }, options: { name: 'idx_email', unique: true } },
            { keys: { username: 1 }, options: { name: 'idx_username', unique: true } },

            // Firm membership queries
            { keys: { firmId: 1, firmStatus: 1 }, options: { name: 'idx_firm_status' } },
            { keys: { firmId: 1, firmRole: 1 }, options: { name: 'idx_firm_role' } },

            // Role-based queries
            { keys: { role: 1, 'lawyerProfile.verified': 1 }, options: { name: 'idx_role_verified' } },
            { keys: { role: 1, lawyerMode: 1 }, options: { name: 'idx_role_mode' } },

            // Marketplace searches
            { keys: { lawyerMode: 1, 'lawyerProfile.rating': -1 }, options: { name: 'idx_marketplace_rating' } },
            { keys: { lawyerMode: 1, region: 1, 'lawyerProfile.specialization': 1 }, options: { name: 'idx_marketplace_region_spec' } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // REMINDER COLLECTION - Critical for cron job performance
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'reminders',
        indexes: [
            // Core reminder queries
            { keys: { userId: 1, status: 1, reminderDateTime: 1 }, options: { name: 'idx_user_status_datetime' } },
            { keys: { status: 1, reminderDateTime: 1 }, options: { name: 'idx_status_datetime' } },

            // Notification trigger query (cron job)
            { keys: { status: 1, reminderDateTime: 1, 'notification.sent': 1 }, options: { name: 'idx_pending_notifications' } },

            // Advance notifications query
            { keys: { status: 1, 'notification.advanceNotifications.sent': 1 }, options: { name: 'idx_advance_notifications' } },

            // Escalation query
            { keys: { status: 1, 'notification.sent': 1, 'notification.escalation.enabled': 1, 'notification.escalation.escalated': 1 }, options: { name: 'idx_escalation' } },

            // Snoozed reminders query
            { keys: { status: 1, 'snooze.snoozeUntil': 1 }, options: { name: 'idx_snoozed' } },

            // Related entity queries
            { keys: { relatedCase: 1, status: 1 }, options: { name: 'idx_case_status', sparse: true } },
            { keys: { relatedTask: 1, status: 1 }, options: { name: 'idx_task_status', sparse: true } },
            { keys: { relatedEvent: 1, status: 1 }, options: { name: 'idx_event_status', sparse: true } },

            // Recurring reminders
            { keys: { 'recurring.enabled': 1, 'recurring.nextOccurrence': 1 }, options: { name: 'idx_recurring' } },

            // Delegated reminders
            { keys: { delegatedTo: 1, status: 1 }, options: { name: 'idx_delegated', sparse: true } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // COUNTER COLLECTION - Atomic sequences
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'counters',
        indexes: [
            // _id is already indexed by default, but ensure seq lookup is fast
            { keys: { _id: 1, seq: 1 }, options: { name: 'idx_id_seq' } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // FIRM COLLECTION - Multi-tenancy
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'firms',
        indexes: [
            { keys: { 'members.userId': 1 }, options: { name: 'idx_member_userid' } },
            { keys: { status: 1, 'subscription.status': 1 }, options: { name: 'idx_status_subscription' } },
            { keys: { licenseNumber: 1 }, options: { name: 'idx_license', sparse: true } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // LEAD COLLECTION
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'leads',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, status: 1, createdAt: -1 }, options: { name: 'idx_firm_status_created' } },
            { keys: { firmId: 1, assignedTo: 1, status: 1 }, options: { name: 'idx_firm_assigned_status' } },
            { keys: { firmId: 1, convertedToClient: 1 }, options: { name: 'idx_firm_converted' } },
            { keys: { firmId: 1, nextFollowUpDate: 1 }, options: { name: 'idx_firm_followup' } },

            // Email and phone lookups
            { keys: { email: 1 }, options: { name: 'idx_email', sparse: true } },
            { keys: { phone: 1 }, options: { name: 'idx_phone' } },

            // Lead scoring and qualification
            { keys: { firmId: 1, leadScore: -1 }, options: { name: 'idx_firm_leadscore' } },
            { keys: { firmId: 1, 'source.type': 1 }, options: { name: 'idx_firm_source' } },

            // Relationships
            { keys: { clientId: 1 }, options: { name: 'idx_clientid', sparse: true } },
            { keys: { organizationId: 1 }, options: { name: 'idx_organizationid', sparse: true } },
            { keys: { contactId: 1 }, options: { name: 'idx_contactid', sparse: true } },

            // Full-text search
            {
                keys: { firstName: 'text', lastName: 'text', companyName: 'text', email: 'text', phone: 'text' },
                options: { name: 'idx_lead_textsearch' }
            }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // CLIENT COLLECTION
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'clients',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, status: 1, createdAt: -1 }, options: { name: 'idx_firm_status_created' } },
            { keys: { firmId: 1, clientTier: 1 }, options: { name: 'idx_firm_tier' } },
            { keys: { firmId: 1, clientSource: 1 }, options: { name: 'idx_firm_source' } },
            { keys: { firmId: 1, nextFollowUpDate: 1 }, options: { name: 'idx_firm_followup' } },

            // Identity lookups
            { keys: { email: 1 }, options: { name: 'idx_email', sparse: true } },
            { keys: { phone: 1 }, options: { name: 'idx_phone' } },
            { keys: { nationalId: 1 }, options: { name: 'idx_nationalid', sparse: true } },
            { keys: { crNumber: 1 }, options: { name: 'idx_crnumber', sparse: true } },

            // Assignments (for firms)
            { keys: { 'assignments.responsibleLawyerId': 1 }, options: { name: 'idx_responsible_lawyer', sparse: true } },
            { keys: { firmId: 1, 'assignments.responsibleLawyerId': 1 }, options: { name: 'idx_firm_responsible' } },

            // Relationships
            { keys: { leadId: 1 }, options: { name: 'idx_leadid', sparse: true } },
            { keys: { organizationId: 1 }, options: { name: 'idx_organizationid', sparse: true } },
            { keys: { contactId: 1 }, options: { name: 'idx_contactid', sparse: true } },

            // Full-text search
            {
                keys: { fullNameArabic: 'text', companyName: 'text', email: 'text', phone: 'text' },
                options: { name: 'idx_client_textsearch' }
            }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // CASE COLLECTION
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'cases',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, status: 1, createdAt: -1 }, options: { name: 'idx_firm_status_created' } },
            { keys: { firmId: 1, clientId: 1, status: 1 }, options: { name: 'idx_firm_client_status' } },
            { keys: { firmId: 1, category: 1 }, options: { name: 'idx_firm_category' } },
            { keys: { firmId: 1, priority: 1 }, options: { name: 'idx_firm_priority' } },

            // Lawyer assignments
            { keys: { lawyerId: 1, status: 1 }, options: { name: 'idx_lawyer_status' } },
            { keys: { firmId: 1, lawyerId: 1, status: 1 }, options: { name: 'idx_firm_lawyer_status' } },

            // Client lookups
            { keys: { clientId: 1, status: 1 }, options: { name: 'idx_client_status' } },

            // Dates
            { keys: { nextHearing: 1 }, options: { name: 'idx_nexthearing', sparse: true } },
            { keys: { firmId: 1, nextHearing: 1 }, options: { name: 'idx_firm_nexthearing' } },

            // Rich documents (for calendar integration)
            { keys: { 'richDocuments.showOnCalendar': 1, 'richDocuments.calendarDate': 1 }, options: { name: 'idx_docs_calendar', sparse: true } },

            // Full-text search
            {
                keys: { title: 'text', description: 'text', caseNumber: 'text' },
                options: { name: 'idx_case_textsearch' }
            }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // PAYMENT COLLECTION
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'payments',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, paymentDate: -1 }, options: { name: 'idx_firm_paymentdate' } },
            { keys: { firmId: 1, status: 1, paymentDate: -1 }, options: { name: 'idx_firm_status_date' } },
            { keys: { firmId: 1, paymentMethod: 1 }, options: { name: 'idx_firm_method' } },

            // Client/customer lookups
            { keys: { clientId: 1, paymentDate: -1 }, options: { name: 'idx_client_date' } },
            { keys: { customerId: 1, paymentDate: -1 }, options: { name: 'idx_customer_date' } },
            { keys: { firmId: 1, clientId: 1, status: 1 }, options: { name: 'idx_firm_client_status' } },

            // Invoice relationships
            { keys: { invoiceId: 1 }, options: { name: 'idx_invoiceid', sparse: true } },

            // Payment method specific
            { keys: { paymentMethod: 1, status: 1 }, options: { name: 'idx_method_status' } },
            { keys: { 'checkDetails.status': 1 }, options: { name: 'idx_check_status', sparse: true } },

            // Reconciliation
            { keys: { 'reconciliation.isReconciled': 1, paymentDate: -1 }, options: { name: 'idx_reconciled_date' } },
            { keys: { firmId: 1, 'reconciliation.isReconciled': 1 }, options: { name: 'idx_firm_reconciled' } },

            // Reference number lookup
            { keys: { referenceNumber: 1 }, options: { name: 'idx_refnumber', sparse: true } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // INVOICE COLLECTION
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'invoices',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, status: 1, issueDate: -1 }, options: { name: 'idx_firm_status_issue' } },
            { keys: { firmId: 1, dueDate: 1, status: 1 }, options: { name: 'idx_firm_due_status' } },
            { keys: { firmId: 1, clientId: 1, status: 1 }, options: { name: 'idx_firm_client_status' } },

            // Client lookups
            { keys: { clientId: 1, status: 1 }, options: { name: 'idx_client_status' } },
            { keys: { clientId: 1, dueDate: 1 }, options: { name: 'idx_client_due' } },

            // Lawyer/attorney
            { keys: { lawyerId: 1, status: 1 }, options: { name: 'idx_lawyer_status' } },
            { keys: { responsibleAttorneyId: 1 }, options: { name: 'idx_attorney', sparse: true } },

            // Case linkage
            { keys: { caseId: 1 }, options: { name: 'idx_caseid', sparse: true } },

            // Invoice number lookup
            { keys: { invoiceNumber: 1 }, options: { name: 'idx_invoicenumber', unique: true } },

            // ZATCA e-invoice
            { keys: { 'zatca.status': 1 }, options: { name: 'idx_zatca_status', sparse: true } },
            { keys: { 'zatca.invoiceUUID': 1 }, options: { name: 'idx_zatca_uuid', sparse: true } },

            // Overdue invoices
            { keys: { status: 1, dueDate: 1 }, options: { name: 'idx_status_due' } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // TASK COLLECTION
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'tasks',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, status: 1, dueDate: 1 }, options: { name: 'idx_firm_status_due' } },
            { keys: { firmId: 1, assignedTo: 1, status: 1 }, options: { name: 'idx_firm_assigned_status' } },
            { keys: { firmId: 1, priority: 1, dueDate: 1 }, options: { name: 'idx_firm_priority_due' } },

            // Assignment queries
            { keys: { assignedTo: 1, status: 1, dueDate: 1 }, options: { name: 'idx_assigned_status_due' } },
            { keys: { createdBy: 1, status: 1 }, options: { name: 'idx_created_status' } },

            // Case and client relationships
            { keys: { caseId: 1, status: 1 }, options: { name: 'idx_case_status' } },
            { keys: { firmId: 1, caseId: 1 }, options: { name: 'idx_firm_case' } },
            { keys: { clientId: 1 }, options: { name: 'idx_clientid', sparse: true } },

            // Due date queries
            { keys: { dueDate: 1, status: 1 }, options: { name: 'idx_due_status' } },
            { keys: { firmId: 1, dueDate: 1 }, options: { name: 'idx_firm_due' } },

            // Task type for legal workflows
            { keys: { taskType: 1, status: 1 }, options: { name: 'idx_type_status' } },
            { keys: { firmId: 1, taskType: 1 }, options: { name: 'idx_firm_type' } },

            // Templates
            { keys: { isTemplate: 1, createdBy: 1 }, options: { name: 'idx_template_created' } },
            { keys: { isTemplate: 1, isPublic: 1 }, options: { name: 'idx_template_public' } },

            // Recurring tasks
            { keys: { 'recurring.enabled': 1, 'recurring.nextDue': 1 }, options: { name: 'idx_recurring_nextdue', sparse: true } },

            // Dependencies
            { keys: { blockedBy: 1 }, options: { name: 'idx_blockedby', sparse: true } },
            { keys: { blocks: 1 }, options: { name: 'idx_blocks', sparse: true } },

            // Full-text search
            {
                keys: { title: 'text', description: 'text', notes: 'text' },
                options: { name: 'idx_task_textsearch' }
            }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // CRM ACTIVITY COLLECTION
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'crmactivities',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, type: 1, createdAt: -1 }, options: { name: 'idx_firm_type_created' } },
            { keys: { firmId: 1, entityType: 1, entityId: 1, createdAt: -1 }, options: { name: 'idx_firm_entity_created' } },
            { keys: { firmId: 1, performedBy: 1, createdAt: -1 }, options: { name: 'idx_firm_performer_created' } },

            // Entity relationships
            { keys: { entityType: 1, entityId: 1 }, options: { name: 'idx_entity' } },
            { keys: { leadId: 1 }, options: { name: 'idx_leadid', sparse: true } },
            { keys: { clientId: 1 }, options: { name: 'idx_clientid', sparse: true } },

            // Type-specific queries
            { keys: { type: 1, createdAt: -1 }, options: { name: 'idx_type_created' } },
            { keys: { type: 1, status: 1 }, options: { name: 'idx_type_status' } },

            // Task activities
            { keys: { firmId: 1, 'taskData.dueDate': 1, 'taskData.status': 1 }, options: { name: 'idx_firm_taskdue_status', sparse: true } },
            { keys: { type: 1, 'taskData.status': 1, 'taskData.dueDate': 1 }, options: { name: 'idx_type_taskstatus_due', sparse: true } },

            // Scheduled activities
            { keys: { scheduledAt: 1 }, options: { name: 'idx_scheduled', sparse: true } },
            { keys: { firmId: 1, scheduledAt: 1 }, options: { name: 'idx_firm_scheduled' } },

            // Assignment
            { keys: { assignedTo: 1, status: 1 }, options: { name: 'idx_assigned_status', sparse: true } },

            // Full-text search
            {
                keys: { title: 'text', description: 'text', titleAr: 'text', descriptionAr: 'text' },
                options: { name: 'idx_activity_textsearch' }
            }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // WHATSAPP CONVERSATION COLLECTION
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'whatsappconversations',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, status: 1, lastMessageAt: -1 }, options: { name: 'idx_firm_status_lastmsg' } },
            { keys: { firmId: 1, assignedTo: 1, status: 1 }, options: { name: 'idx_firm_assigned_status' } },
            { keys: { firmId: 1, unreadCount: -1 }, options: { name: 'idx_firm_unread' } },

            // Phone number lookup
            { keys: { phoneNumber: 1 }, options: { name: 'idx_phonenumber' } },
            { keys: { firmId: 1, phoneNumber: 1 }, options: { name: 'idx_firm_phone' } },

            // Entity relationships
            { keys: { leadId: 1 }, options: { name: 'idx_leadid', sparse: true } },
            { keys: { clientId: 1 }, options: { name: 'idx_clientid', sparse: true } },
            { keys: { contactId: 1 }, options: { name: 'idx_contactid', sparse: true } },
            { keys: { caseId: 1 }, options: { name: 'idx_caseid', sparse: true } },

            // Conversation ID
            { keys: { conversationId: 1 }, options: { name: 'idx_conversationid', unique: true } },

            // 24-hour window tracking
            { keys: { 'window.isOpen': 1, 'window.expiresAt': 1 }, options: { name: 'idx_window', sparse: true } },
            { keys: { firmId: 1, 'window.isOpen': 1 }, options: { name: 'idx_firm_window' } },

            // Status and assignment
            { keys: { assignedTo: 1, status: 1 }, options: { name: 'idx_assigned_status', sparse: true } },

            // Last message tracking
            { keys: { lastMessageAt: -1 }, options: { name: 'idx_lastmessage' } }
        ]
    }
];

/**
 * Check if index is a text index
 */
const isTextIndex = (keys) => {
    return Object.values(keys).includes('text');
};

/**
 * Create indexes for a collection
 * Gold Standard: Handles text index replacement (MongoDB allows only ONE text index per collection)
 */
const createIndexesForCollection = async (collectionName, indexes) => {
    try {
        const collection = mongoose.connection.collection(collectionName);

        // Get existing indexes
        const existingIndexes = await collection.indexes();
        const existingIndexNames = new Set(existingIndexes.map(idx => idx.name));
        const existingTextIndex = existingIndexes.find(idx => idx.textIndexVersion);

        logger.info(`\n${'='.repeat(70)}`);
        logger.info(`Collection: ${collectionName}`);
        logger.info(`${'='.repeat(70)}`);
        logger.info(`Existing indexes: ${existingIndexNames.size}`);

        let created = 0;
        let skipped = 0;
        let updated = 0;

        for (const { keys, options } of indexes) {
            const indexName = options.name;

            // Gold Standard: Handle text index updates
            // MongoDB only allows ONE text index per collection
            // If we're creating a text index and one already exists with different name, replace it
            if (isTextIndex(keys)) {
                if (existingTextIndex) {
                    if (existingTextIndex.name === indexName) {
                        // Same name - check if keys match
                        const existingKeys = Object.keys(existingTextIndex.weights || {}).sort().join(',');
                        const newKeys = Object.keys(keys).sort().join(',');

                        if (existingKeys === newKeys) {
                            logger.info(`  ✓ ${indexName} - text index already exists with same fields`);
                            skipped++;
                            continue;
                        } else {
                            // Different fields - need to replace
                            logger.info(`  ↻ ${indexName} - updating text index (fields changed: ${existingKeys} → ${newKeys})`);
                            try {
                                await collection.dropIndex(existingTextIndex.name);
                                logger.info(`    Dropped old text index: ${existingTextIndex.name}`);
                            } catch (dropError) {
                                logger.warn(`    Could not drop old text index: ${dropError.message}`);
                            }
                        }
                    } else {
                        // Different text index exists - drop it first
                        logger.info(`  ↻ Replacing text index: ${existingTextIndex.name} → ${indexName}`);
                        try {
                            await collection.dropIndex(existingTextIndex.name);
                            logger.info(`    Dropped old text index: ${existingTextIndex.name}`);
                        } catch (dropError) {
                            logger.warn(`    Could not drop old text index: ${dropError.message}`);
                        }
                    }
                }

                // Create new text index
                try {
                    await collection.createIndex(keys, { ...options, background: true });
                    logger.info(`  + ${indexName} - text index created`);
                    updated++;
                } catch (error) {
                    logger.error(`  ✗ ${indexName} - error: ${error.message}`);
                }
                continue;
            }

            // Regular index handling
            if (existingIndexNames.has(indexName)) {
                logger.info(`  ✓ ${indexName} - already exists`);
                skipped++;
            } else {
                try {
                    await collection.createIndex(keys, { ...options, background: true });
                    logger.info(`  + ${indexName} - created`);
                    created++;
                } catch (error) {
                    logger.error(`  ✗ ${indexName} - error: ${error.message}`);
                }
            }
        }

        logger.info(`\nSummary: ${created} created, ${updated} updated, ${skipped} skipped`);

        return { created, skipped, updated };

    } catch (error) {
        logger.error(`Error processing collection ${collectionName}:`, error.message);
        return { created: 0, skipped: 0, updated: 0 };
    }
};

/**
 * Main execution
 */
const main = async () => {
    try {
        await connectDB();

        logger.info('\n');
        logger.info('╔' + '═'.repeat(68) + '╗');
        logger.info('║' + ' MongoDB Index Optimization Script'.padEnd(68) + '║');
        logger.info('║' + ' Gold Standard: Handles text index replacement'.padEnd(68) + '║');
        logger.info('╚' + '═'.repeat(68) + '╝');
        logger.info('\n');

        let totalCreated = 0;
        let totalSkipped = 0;
        let totalUpdated = 0;

        // Process each collection
        for (const { collection, indexes } of indexDefinitions) {
            const { created, skipped, updated = 0 } = await createIndexesForCollection(collection, indexes);
            totalCreated += created;
            totalSkipped += skipped;
            totalUpdated += updated;
        }

        // Final summary
        logger.info('\n');
        logger.info('╔' + '═'.repeat(68) + '╗');
        logger.info('║' + ' Final Summary'.padEnd(68) + '║');
        logger.info('╚' + '═'.repeat(68) + '╝');
        logger.info(`\nTotal indexes created: ${totalCreated}`);
        logger.info(`Total indexes updated (text indexes): ${totalUpdated}`);
        logger.info(`Total indexes skipped (already exist): ${totalSkipped}`);
        logger.info(`Total indexes processed: ${totalCreated + totalUpdated + totalSkipped}`);
        logger.info('\n✅ Index optimization completed successfully!\n');

        process.exit(0);
    } catch (error) {
        logger.error('\n❌ Index optimization failed:', error);
        process.exit(1);
    }
};

// Run the script
main();
