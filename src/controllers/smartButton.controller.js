const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const {
    Case,
    Client,
    Invoice,
    Document,
    Contact,
    Task,
    TimeEntry,
    Expense,
    Payment,
    Lead
} = require('../models');
const Activity = require('../models/activity.model');
const Event = require('../models/event.model');

/**
 * Get counts of related records for any entity (Odoo-style smart buttons)
 * GET /api/smart-buttons/:model/:recordId/counts
 */
const getCounts = asyncHandler(async (req, res) => {
    const { model, recordId } = req.params;
    const firmId = req.firmId; // From firmFilter middleware
    const lawyerId = req.userID;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(recordId)) {
        throw CustomException('Invalid record ID', 400);
    }

    const recordObjectId = new mongoose.Types.ObjectId(recordId);
    let counts = {};

    // Build base query: use firmId if available, otherwise fall back to lawyerId
    const baseQuery = firmId ? { firmId } : { lawyerId };

    switch (model.toLowerCase()) {
        case 'client':
            counts = {
                cases: await Case.countDocuments({
                    ...baseQuery,
                    clientId: recordObjectId
                }),
                invoices: await Invoice.countDocuments({
                    ...baseQuery,
                    clientId: recordObjectId
                }),
                documents: await Document.countDocuments({
                    ...baseQuery,
                    clientId: recordObjectId
                }),
                contacts: await Contact.countDocuments({
                    ...baseQuery,
                    clientId: recordObjectId
                }),
                tasks: await Task.countDocuments({
                    ...baseQuery,
                    clientId: recordObjectId
                }),
                timeEntries: await TimeEntry.countDocuments({
                    ...baseQuery,
                    clientId: recordObjectId
                }),
                expenses: await Expense.countDocuments({
                    ...baseQuery,
                    clientId: recordObjectId
                }),
                payments: await Payment.countDocuments({
                    ...baseQuery,
                    $or: [
                        { clientId: recordObjectId },
                        { customerId: recordObjectId }
                    ]
                }),
                activities: await Activity.countDocuments({
                    ...(firmId ? { firmId } : {}),
                    res_model: 'Client',
                    res_id: recordObjectId
                }),
                events: await Event.countDocuments({
                    ...baseQuery,
                    'participants.clientId': recordObjectId
                })
            };
            break;

        case 'case':
            counts = {
                documents: await Document.countDocuments({
                    ...baseQuery,
                    caseId: recordObjectId
                }),
                tasks: await Task.countDocuments({
                    ...baseQuery,
                    caseId: recordObjectId
                }),
                timeEntries: await TimeEntry.countDocuments({
                    ...baseQuery,
                    caseId: recordObjectId
                }),
                invoices: await Invoice.countDocuments({
                    ...baseQuery,
                    caseId: recordObjectId
                }),
                expenses: await Expense.countDocuments({
                    ...baseQuery,
                    caseId: recordObjectId
                }),
                payments: await Payment.countDocuments({
                    ...baseQuery,
                    caseId: recordObjectId
                }),
                activities: await Activity.countDocuments({
                    ...(firmId ? { firmId } : {}),
                    res_model: 'Case',
                    res_id: recordObjectId
                }),
                events: await Event.countDocuments({
                    ...baseQuery,
                    caseId: recordObjectId
                })
            };
            break;

        case 'contact':
            counts = {
                cases: await Case.countDocuments({
                    ...baseQuery,
                    'contacts.contactId': recordObjectId
                }),
                invoices: await Invoice.countDocuments({
                    ...baseQuery,
                    contactId: recordObjectId
                }),
                activities: await Activity.countDocuments({
                    ...(firmId ? { firmId } : {}),
                    res_model: 'Contact',
                    res_id: recordObjectId
                }),
                events: await Event.countDocuments({
                    ...baseQuery,
                    'participants.contactId': recordObjectId
                }),
                tasks: await Task.countDocuments({
                    ...baseQuery,
                    'assignedContacts': recordObjectId
                })
            };
            break;

        case 'invoice':
            // Count payments that reference this invoice
            const paymentsWithInvoiceId = await Payment.countDocuments({
                ...baseQuery,
                invoiceId: recordObjectId
            });

            const paymentsWithApplications = await Payment.countDocuments({
                ...baseQuery,
                'invoiceApplications.invoiceId': recordObjectId
            });

            const paymentsWithAllocations = await Payment.countDocuments({
                ...baseQuery,
                'allocations.invoiceId': recordObjectId
            });

            counts = {
                payments: paymentsWithInvoiceId + paymentsWithApplications + paymentsWithAllocations,
                documents: await Document.countDocuments({
                    ...baseQuery,
                    'metadata.invoiceId': recordObjectId
                }),
                timeEntries: await TimeEntry.countDocuments({
                    ...baseQuery,
                    invoiceId: recordObjectId
                }),
                expenses: await Expense.countDocuments({
                    ...baseQuery,
                    invoiceId: recordObjectId
                })
            };
            break;

        case 'lead':
            counts = {
                activities: await Activity.countDocuments({
                    ...(firmId ? { firmId } : {}),
                    res_model: 'Lead',
                    res_id: recordObjectId
                }),
                documents: await Document.countDocuments({
                    ...baseQuery,
                    'metadata.leadId': recordObjectId
                }),
                tasks: await Task.countDocuments({
                    ...baseQuery,
                    'metadata.leadId': recordObjectId
                }),
                events: await Event.countDocuments({
                    ...baseQuery,
                    'metadata.leadId': recordObjectId
                })
            };
            break;

        case 'task':
            counts = {
                subtasks: 0, // Will be populated from task.subtasks array
                documents: await Document.countDocuments({
                    ...baseQuery,
                    'metadata.taskId': recordObjectId
                }),
                timeEntries: await TimeEntry.countDocuments({
                    ...baseQuery,
                    taskId: recordObjectId
                }),
                comments: 0, // Will be populated from task.comments array
                attachments: 0 // Will be populated from task.attachments array
            };

            // Get task to count embedded arrays
            const task = await Task.findById(recordObjectId).select('subtasks comments attachments');
            if (task) {
                counts.subtasks = task.subtasks?.length || 0;
                counts.comments = task.comments?.length || 0;
                counts.attachments = task.attachments?.length || 0;
            }
            break;

        case 'expense':
            counts = {
                attachments: 0, // Will be populated from expense.attachments array
                receipts: 0 // Will be populated from expense.receipts array
            };

            // Get expense to count embedded arrays
            const expense = await Expense.findById(recordObjectId).select('attachments receipts receipt');
            if (expense) {
                counts.attachments = expense.attachments?.length || 0;
                counts.receipts = expense.receipts?.length || 0;
                if (expense.receipt) counts.receipts += 1;
            }
            break;

        case 'payment':
            counts = {
                invoices: 0, // Will be populated from payment.invoiceApplications array
                attachments: 0 // Will be populated from payment.attachments array
            };

            // Get payment to count embedded arrays
            const payment = await Payment.findById(recordObjectId).select('invoiceApplications allocations attachments');
            if (payment) {
                counts.invoices = (payment.invoiceApplications?.length || 0) + (payment.allocations?.length || 0);
                counts.attachments = payment.attachments?.length || 0;
            }
            break;

        case 'document':
            counts = {
                versions: 0 // Will be populated from document.versions array
            };

            // Get document to count versions
            const document = await Document.findById(recordObjectId).select('versions version');
            if (document) {
                counts.versions = document.versions?.length || document.version || 1;
            }
            break;

        case 'timeentry':
            counts = {
                attachments: 0, // Will be populated from timeEntry.attachments array
                history: 0 // Will be populated from timeEntry.history array
            };

            // Get timeEntry to count embedded arrays
            const timeEntry = await TimeEntry.findById(recordObjectId).select('attachments history editHistory');
            if (timeEntry) {
                counts.attachments = timeEntry.attachments?.length || 0;
                counts.history = (timeEntry.history?.length || 0) + (timeEntry.editHistory?.length || 0);
            }
            break;

        case 'event':
            counts = {
                participants: 0, // Will be populated from event.participants array
                attachments: 0, // Will be populated from event.attachments array
                reminders: 0 // Will be populated from event.reminders array
            };

            // Get event to count embedded arrays
            const event = await Event.findById(recordObjectId).select('participants attachments reminders');
            if (event) {
                counts.participants = event.participants?.length || 0;
                counts.attachments = event.attachments?.length || 0;
                counts.reminders = event.reminders?.length || 0;
            }
            break;

        default:
            throw CustomException(`Unsupported model: ${model}`, 400);
    }

    res.json({
        success: true,
        data: counts
    });
});

/**
 * Get counts for multiple records of the same model (batch operation)
 * POST /api/smart-buttons/:model/batch-counts
 * Body: { recordIds: [...] }
 */
const getBatchCounts = asyncHandler(async (req, res) => {
    const { model } = req.params;
    const { recordIds } = req.body;
    const firmId = req.firmId;
    const lawyerId = req.userID;

    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
        throw CustomException('recordIds array is required', 400);
    }

    // Validate all ObjectIds
    const validIds = recordIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
        throw CustomException('No valid record IDs provided', 400);
    }

    const recordObjectIds = validIds.map(id => new mongoose.Types.ObjectId(id));
    const baseQuery = firmId ? { firmId } : { lawyerId };

    let results = {};

    switch (model.toLowerCase()) {
        case 'client':
            // Get counts for each client
            for (const recordId of recordObjectIds) {
                const counts = {
                    cases: await Case.countDocuments({ ...baseQuery, clientId: recordId }),
                    invoices: await Invoice.countDocuments({ ...baseQuery, clientId: recordId }),
                    documents: await Document.countDocuments({ ...baseQuery, clientId: recordId }),
                    tasks: await Task.countDocuments({ ...baseQuery, clientId: recordId }),
                    payments: await Payment.countDocuments({
                        ...baseQuery,
                        $or: [{ clientId: recordId }, { customerId: recordId }]
                    })
                };
                results[recordId.toString()] = counts;
            }
            break;

        case 'case':
            for (const recordId of recordObjectIds) {
                const counts = {
                    documents: await Document.countDocuments({ ...baseQuery, caseId: recordId }),
                    tasks: await Task.countDocuments({ ...baseQuery, caseId: recordId }),
                    timeEntries: await TimeEntry.countDocuments({ ...baseQuery, caseId: recordId }),
                    invoices: await Invoice.countDocuments({ ...baseQuery, caseId: recordId })
                };
                results[recordId.toString()] = counts;
            }
            break;

        default:
            throw CustomException(`Batch counts not supported for model: ${model}`, 400);
    }

    res.json({
        success: true,
        data: results
    });
});

module.exports = {
    getCounts,
    getBatchCounts
};
