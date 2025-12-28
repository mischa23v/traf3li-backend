/**
 * State Machine Service
 *
 * Handles all state transitions for Lead and Quote entities with:
 * - Valid transition enforcement
 * - Side effects (notifications, calculations, updates)
 * - Audit trail
 * - Transactional integrity
 *
 * Backend does 90% of work - frontend just triggers transitions
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// LEAD STATE MACHINE
// ═══════════════════════════════════════════════════════════════

const LEAD_STATES = {
    NEW: 'new',
    CONTACTED: 'contacted',
    QUALIFIED: 'qualified',
    PROPOSAL: 'proposal',
    NEGOTIATION: 'negotiation',
    WON: 'won',
    LOST: 'lost',
    DORMANT: 'dormant'
};

const LEAD_TRANSITIONS = {
    [LEAD_STATES.NEW]: [LEAD_STATES.CONTACTED, LEAD_STATES.LOST, LEAD_STATES.DORMANT],
    [LEAD_STATES.CONTACTED]: [LEAD_STATES.QUALIFIED, LEAD_STATES.LOST, LEAD_STATES.DORMANT],
    [LEAD_STATES.QUALIFIED]: [LEAD_STATES.PROPOSAL, LEAD_STATES.LOST, LEAD_STATES.DORMANT],
    [LEAD_STATES.PROPOSAL]: [LEAD_STATES.NEGOTIATION, LEAD_STATES.LOST, LEAD_STATES.QUALIFIED],
    [LEAD_STATES.NEGOTIATION]: [LEAD_STATES.WON, LEAD_STATES.LOST, LEAD_STATES.PROPOSAL],
    [LEAD_STATES.WON]: [], // Final state
    [LEAD_STATES.LOST]: [LEAD_STATES.NEW], // Can reopen
    [LEAD_STATES.DORMANT]: [LEAD_STATES.CONTACTED, LEAD_STATES.LOST]
};

const LEAD_STATE_PROBABILITIES = {
    [LEAD_STATES.NEW]: 10,
    [LEAD_STATES.CONTACTED]: 20,
    [LEAD_STATES.QUALIFIED]: 40,
    [LEAD_STATES.PROPOSAL]: 60,
    [LEAD_STATES.NEGOTIATION]: 80,
    [LEAD_STATES.WON]: 100,
    [LEAD_STATES.LOST]: 0,
    [LEAD_STATES.DORMANT]: 5
};

// ═══════════════════════════════════════════════════════════════
// QUOTE STATE MACHINE
// ═══════════════════════════════════════════════════════════════

const QUOTE_STATES = {
    DRAFT: 'draft',
    SENT: 'sent',
    VIEWED: 'viewed',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    EXPIRED: 'expired',
    REVISED: 'revised'
};

const QUOTE_TRANSITIONS = {
    [QUOTE_STATES.DRAFT]: [QUOTE_STATES.SENT],
    [QUOTE_STATES.SENT]: [QUOTE_STATES.VIEWED, QUOTE_STATES.ACCEPTED, QUOTE_STATES.REJECTED, QUOTE_STATES.EXPIRED, QUOTE_STATES.REVISED],
    [QUOTE_STATES.VIEWED]: [QUOTE_STATES.ACCEPTED, QUOTE_STATES.REJECTED, QUOTE_STATES.EXPIRED, QUOTE_STATES.REVISED],
    [QUOTE_STATES.ACCEPTED]: [], // Final state - creates order
    [QUOTE_STATES.REJECTED]: [QUOTE_STATES.REVISED],
    [QUOTE_STATES.EXPIRED]: [QUOTE_STATES.REVISED],
    [QUOTE_STATES.REVISED]: [QUOTE_STATES.SENT] // Creates new version
};

// ═══════════════════════════════════════════════════════════════
// ORDER STATE MACHINE
// ═══════════════════════════════════════════════════════════════

const ORDER_STATES = {
    DRAFT: 'draft',
    PENDING_APPROVAL: 'pending_approval',
    APPROVED: 'approved',
    CONFIRMED: 'confirmed',
    IN_PROGRESS: 'in_progress',
    ON_HOLD: 'on_hold',
    PARTIALLY_SHIPPED: 'partially_shipped',
    SHIPPED: 'shipped',
    PARTIALLY_INVOICED: 'partially_invoiced',
    INVOICED: 'invoiced',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    CLOSED: 'closed'
};

const ORDER_TRANSITIONS = {
    [ORDER_STATES.DRAFT]: [ORDER_STATES.PENDING_APPROVAL, ORDER_STATES.CONFIRMED, ORDER_STATES.CANCELLED],
    [ORDER_STATES.PENDING_APPROVAL]: [ORDER_STATES.APPROVED, ORDER_STATES.DRAFT, ORDER_STATES.CANCELLED],
    [ORDER_STATES.APPROVED]: [ORDER_STATES.CONFIRMED, ORDER_STATES.CANCELLED],
    [ORDER_STATES.CONFIRMED]: [ORDER_STATES.IN_PROGRESS, ORDER_STATES.ON_HOLD, ORDER_STATES.CANCELLED],
    [ORDER_STATES.IN_PROGRESS]: [ORDER_STATES.PARTIALLY_SHIPPED, ORDER_STATES.SHIPPED, ORDER_STATES.ON_HOLD, ORDER_STATES.CANCELLED],
    [ORDER_STATES.ON_HOLD]: [ORDER_STATES.IN_PROGRESS, ORDER_STATES.CANCELLED],
    [ORDER_STATES.PARTIALLY_SHIPPED]: [ORDER_STATES.SHIPPED, ORDER_STATES.PARTIALLY_INVOICED, ORDER_STATES.ON_HOLD],
    [ORDER_STATES.SHIPPED]: [ORDER_STATES.INVOICED, ORDER_STATES.PARTIALLY_INVOICED],
    [ORDER_STATES.PARTIALLY_INVOICED]: [ORDER_STATES.INVOICED],
    [ORDER_STATES.INVOICED]: [ORDER_STATES.COMPLETED],
    [ORDER_STATES.COMPLETED]: [ORDER_STATES.CLOSED],
    [ORDER_STATES.CANCELLED]: [], // Final state
    [ORDER_STATES.CLOSED]: [] // Final state
};

class StateMachineService {
    // ═══════════════════════════════════════════════════════════
    // LEAD TRANSITIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * Validate and execute lead status transition
     * @param {ObjectId} leadId - Lead ID
     * @param {string} newStatus - Target status
     * @param {object} firmQuery - Firm query for isolation
     * @param {object} context - Additional context (userId, reason, etc.)
     * @returns {object} - Updated lead with transition result
     */
    static async transitionLead(leadId, newStatus, firmQuery, context = {}) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const Lead = mongoose.model('Lead');
            const lead = await Lead.findOne({ _id: leadId, ...firmQuery }).session(session);

            if (!lead) {
                throw new Error('Lead not found');
            }

            const currentStatus = lead.status;

            // Validate transition
            if (!this.isValidLeadTransition(currentStatus, newStatus)) {
                throw new Error(`Invalid transition from '${currentStatus}' to '${newStatus}'`);
            }

            // Check requirements for specific transitions
            await this.validateLeadTransitionRequirements(lead, newStatus, context);

            // Store previous status for history
            const previousStatus = currentStatus;

            // Execute pre-transition side effects
            await this.executeLeadPreTransitionSideEffects(lead, newStatus, context, session);

            // Update status
            lead.status = newStatus;
            lead.probability = LEAD_STATE_PROBABILITIES[newStatus];

            // Add status history entry
            if (!lead.statusHistory) lead.statusHistory = [];
            lead.statusHistory.push({
                from: previousStatus,
                to: newStatus,
                changedAt: new Date(),
                changedBy: context.userId,
                reason: context.reason
            });

            // Execute post-transition side effects
            await this.executeLeadPostTransitionSideEffects(lead, previousStatus, newStatus, context, session);

            await lead.save({ session });
            await session.commitTransaction();

            logger.info(`Lead ${leadId} transitioned from ${previousStatus} to ${newStatus}`);

            return {
                success: true,
                lead,
                transition: {
                    from: previousStatus,
                    to: newStatus,
                    timestamp: new Date()
                }
            };
        } catch (error) {
            await session.abortTransaction();
            logger.error(`Lead transition error: ${error.message}`);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Check if lead transition is valid
     */
    static isValidLeadTransition(fromStatus, toStatus) {
        const validTransitions = LEAD_TRANSITIONS[fromStatus] || [];
        return validTransitions.includes(toStatus);
    }

    /**
     * Validate requirements for specific transitions
     */
    static async validateLeadTransitionRequirements(lead, newStatus, context) {
        switch (newStatus) {
            case LEAD_STATES.QUALIFIED:
                // Check minimum qualification requirements
                if (!lead.qualification?.budget || lead.qualification.budget === 'unknown') {
                    if (!context.skipValidation) {
                        throw new Error('Budget qualification required before marking as Qualified');
                    }
                }
                break;

            case LEAD_STATES.PROPOSAL:
                // Must have been contacted
                if (!lead.lastContactedAt) {
                    throw new Error('Lead must have contact history before sending proposal');
                }
                break;

            case LEAD_STATES.WON:
                // Check if lead has required fields for conversion
                if (!lead.email && !lead.phone) {
                    throw new Error('Lead must have email or phone for conversion');
                }
                break;

            case LEAD_STATES.LOST:
                // Require lost reason
                if (!context.lostReasonId && !context.skipValidation) {
                    throw new Error('Lost reason is required');
                }
                break;
        }
    }

    /**
     * Execute side effects before transition
     */
    static async executeLeadPreTransitionSideEffects(lead, newStatus, context, session) {
        // Pre-transition side effects
        switch (newStatus) {
            case LEAD_STATES.WON:
                // Recalculate final score before conversion
                lead.leadScore = Math.min(150, (lead.leadScore || 0) + 20);
                break;
        }
    }

    /**
     * Execute side effects after transition
     */
    static async executeLeadPostTransitionSideEffects(lead, fromStatus, toStatus, context, session) {
        const now = new Date();

        switch (toStatus) {
            case LEAD_STATES.CONTACTED:
                lead.lastContactedAt = now;
                lead.metrics = lead.metrics || {};
                lead.metrics.contactCount = (lead.metrics.contactCount || 0) + 1;
                break;

            case LEAD_STATES.QUALIFIED:
                lead.qualifiedAt = now;
                lead.qualifiedBy = context.userId;
                break;

            case LEAD_STATES.PROPOSAL:
                lead.proposalSentAt = now;
                break;

            case LEAD_STATES.WON:
                lead.convertedAt = now;
                lead.convertedBy = context.userId;
                lead.convertedToClient = true;
                // Create client record would happen here via event
                break;

            case LEAD_STATES.LOST:
                lead.lostAt = now;
                lead.lostReasonId = context.lostReasonId;
                lead.lostNotes = context.lostNotes;
                break;
        }

        // Emit event for other services to handle
        // EventEmitter would be used here in production
    }

    /**
     * Get available transitions for a lead
     */
    static getAvailableLeadTransitions(currentStatus) {
        return LEAD_TRANSITIONS[currentStatus] || [];
    }

    // ═══════════════════════════════════════════════════════════
    // QUOTE TRANSITIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * Validate and execute quote status transition
     */
    static async transitionQuote(quoteId, newStatus, firmQuery, context = {}) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const Quote = mongoose.model('Quote');
            const quote = await Quote.findOne({ _id: quoteId, ...firmQuery }).session(session);

            if (!quote) {
                throw new Error('Quote not found');
            }

            const currentStatus = quote.status;

            // Validate transition
            if (!this.isValidQuoteTransition(currentStatus, newStatus)) {
                throw new Error(`Invalid transition from '${currentStatus}' to '${newStatus}'`);
            }

            // Validate requirements
            await this.validateQuoteTransitionRequirements(quote, newStatus, context);

            const previousStatus = currentStatus;

            // Execute pre-transition side effects
            await this.executeQuotePreTransitionSideEffects(quote, newStatus, context, session);

            // Update status
            quote.status = newStatus;

            // Execute post-transition side effects
            await this.executeQuotePostTransitionSideEffects(quote, previousStatus, newStatus, context, session);

            await quote.save({ session });
            await session.commitTransaction();

            logger.info(`Quote ${quoteId} transitioned from ${previousStatus} to ${newStatus}`);

            return {
                success: true,
                quote,
                transition: {
                    from: previousStatus,
                    to: newStatus,
                    timestamp: new Date()
                }
            };
        } catch (error) {
            await session.abortTransaction();
            logger.error(`Quote transition error: ${error.message}`);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Check if quote transition is valid
     */
    static isValidQuoteTransition(fromStatus, toStatus) {
        const validTransitions = QUOTE_TRANSITIONS[fromStatus] || [];
        return validTransitions.includes(toStatus);
    }

    /**
     * Validate requirements for quote transitions
     */
    static async validateQuoteTransitionRequirements(quote, newStatus, context) {
        switch (newStatus) {
            case QUOTE_STATES.SENT:
                // Must have at least one line item
                if (!quote.items || quote.items.length === 0) {
                    throw new Error('Quote must have at least one line item');
                }
                // Must have valid customer info
                if (!quote.customerInfo?.email && !quote.contactId && !quote.clientId) {
                    throw new Error('Quote must have customer contact information');
                }
                break;

            case QUOTE_STATES.REJECTED:
                // May require rejection reason
                if (!context.lostReasonId && !context.skipValidation) {
                    // Optional: throw new Error('Rejection reason required');
                }
                break;
        }
    }

    /**
     * Execute side effects before quote transition
     */
    static async executeQuotePreTransitionSideEffects(quote, newStatus, context, session) {
        switch (newStatus) {
            case QUOTE_STATES.SENT:
                // Recalculate totals before sending
                quote.calculateTotals();
                break;

            case QUOTE_STATES.REVISED:
                // Increment revision number
                quote.revisionNumber = (quote.revisionNumber || 1) + 1;
                break;
        }
    }

    /**
     * Execute side effects after quote transition
     */
    static async executeQuotePostTransitionSideEffects(quote, fromStatus, toStatus, context, session) {
        const now = new Date();

        switch (toStatus) {
            case QUOTE_STATES.SENT:
                quote.sentAt = now;
                // Send email notification would happen here via event
                break;

            case QUOTE_STATES.VIEWED:
                if (!quote.viewedAt) {
                    quote.viewedAt = now;
                }
                break;

            case QUOTE_STATES.ACCEPTED:
                quote.respondedAt = now;
                // Create sales order would happen here via event
                // Update lead status if linked
                if (quote.leadId) {
                    const Lead = mongoose.model('Lead');
                    await Lead.findByIdAndUpdate(
                        quote.leadId,
                        { $set: { status: LEAD_STATES.WON } },
                        { session }
                    );
                }
                break;

            case QUOTE_STATES.REJECTED:
                quote.respondedAt = now;
                quote.lostReasonId = context.lostReasonId;
                quote.lostNotes = context.lostNotes;
                break;

            case QUOTE_STATES.EXPIRED:
                // Mark as expired
                break;
        }
    }

    /**
     * Get available transitions for a quote
     */
    static getAvailableQuoteTransitions(currentStatus) {
        return QUOTE_TRANSITIONS[currentStatus] || [];
    }

    // ═══════════════════════════════════════════════════════════
    // ORDER TRANSITIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * Validate and execute order status transition
     */
    static async transitionOrder(orderId, newStatus, firmQuery, context = {}) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const SalesOrder = mongoose.model('SalesOrder');
            const order = await SalesOrder.findOne({ _id: orderId, ...firmQuery }).session(session);

            if (!order) {
                throw new Error('Order not found');
            }

            const currentStatus = order.status;

            // Validate transition
            if (!this.isValidOrderTransition(currentStatus, newStatus)) {
                throw new Error(`Invalid transition from '${currentStatus}' to '${newStatus}'`);
            }

            // Validate requirements
            await this.validateOrderTransitionRequirements(order, newStatus, context);

            const previousStatus = currentStatus;

            // Execute pre-transition side effects
            await this.executeOrderPreTransitionSideEffects(order, newStatus, context, session);

            // Update status
            order.status = newStatus;

            // Add history entry
            order.addHistory(
                `status_change_${newStatus}`,
                context.userId,
                context.userName,
                `Status changed from ${previousStatus} to ${newStatus}`,
                'status',
                previousStatus,
                newStatus
            );

            // Execute post-transition side effects
            await this.executeOrderPostTransitionSideEffects(order, previousStatus, newStatus, context, session);

            await order.save({ session });
            await session.commitTransaction();

            logger.info(`Order ${orderId} transitioned from ${previousStatus} to ${newStatus}`);

            return {
                success: true,
                order,
                transition: {
                    from: previousStatus,
                    to: newStatus,
                    timestamp: new Date()
                }
            };
        } catch (error) {
            await session.abortTransaction();
            logger.error(`Order transition error: ${error.message}`);
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Check if order transition is valid
     */
    static isValidOrderTransition(fromStatus, toStatus) {
        const validTransitions = ORDER_TRANSITIONS[fromStatus] || [];
        return validTransitions.includes(toStatus);
    }

    /**
     * Validate requirements for order transitions
     */
    static async validateOrderTransitionRequirements(order, newStatus, context) {
        switch (newStatus) {
            case ORDER_STATES.CONFIRMED:
                // Must have at least one item
                if (!order.items || order.items.length === 0) {
                    throw new Error('Order must have at least one item');
                }
                // Check down payment if required
                if (order.downPaymentRequired && order.downPaymentPaid < order.downPaymentAmount) {
                    if (!context.skipDownPayment) {
                        throw new Error('Down payment required before confirmation');
                    }
                }
                break;

            case ORDER_STATES.CANCELLED:
                // Check if order has deliveries
                if (order.deliveryProgress > 0) {
                    throw new Error('Cannot cancel order with deliveries. Create return order instead.');
                }
                // Require cancellation reason
                if (!context.reason && !context.skipValidation) {
                    throw new Error('Cancellation reason is required');
                }
                break;

            case ORDER_STATES.SHIPPED:
                // All items must be delivered
                if (order.deliveryStatus !== 'fully_delivered') {
                    throw new Error('All items must be delivered before marking as shipped');
                }
                break;

            case ORDER_STATES.COMPLETED:
                // Must be fully invoiced
                if (order.billingStatus !== 'fully_billed') {
                    throw new Error('Order must be fully invoiced before completion');
                }
                break;
        }
    }

    /**
     * Execute side effects before order transition
     */
    static async executeOrderPreTransitionSideEffects(order, newStatus, context, session) {
        switch (newStatus) {
            case ORDER_STATES.CONFIRMED:
                // Recalculate totals
                order.calculateItemTotals();
                order.calculateOrderTotals();
                break;
        }
    }

    /**
     * Execute side effects after order transition
     */
    static async executeOrderPostTransitionSideEffects(order, fromStatus, toStatus, context, session) {
        const now = new Date();

        switch (toStatus) {
            case ORDER_STATES.CONFIRMED:
                order.confirmedAt = now;
                order.confirmedBy = context.userId;
                // Send confirmation email would happen via event
                break;

            case ORDER_STATES.CANCELLED:
                order.cancelledAt = now;
                order.cancelledBy = context.userId;
                order.cancellationReason = context.reason;
                // Release reserved inventory would happen via event
                break;

            case ORDER_STATES.COMPLETED:
                order.completedAt = now;
                // Calculate commission would happen via event
                break;

            case ORDER_STATES.CLOSED:
                order.closedAt = now;
                order.closedBy = context.userId;
                break;

            case ORDER_STATES.ON_HOLD:
                order.heldAt = now;
                order.heldBy = context.userId;
                order.holdReason = context.reason;
                order.holdUntil = context.holdUntil;
                break;
        }
    }

    /**
     * Get available transitions for an order
     */
    static getAvailableOrderTransitions(currentStatus) {
        return ORDER_TRANSITIONS[currentStatus] || [];
    }

    // ═══════════════════════════════════════════════════════════
    // BULK OPERATIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * Bulk transition leads
     */
    static async bulkTransitionLeads(leadIds, newStatus, firmQuery, context = {}) {
        const results = [];

        for (const leadId of leadIds) {
            try {
                const result = await this.transitionLead(leadId, newStatus, firmQuery, context);
                results.push({ leadId, success: true, ...result.transition });
            } catch (error) {
                results.push({ leadId, success: false, error: error.message });
            }
        }

        return {
            total: leadIds.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        };
    }

    /**
     * Get state machine configuration
     */
    static getConfiguration() {
        return {
            lead: {
                states: LEAD_STATES,
                transitions: LEAD_TRANSITIONS,
                probabilities: LEAD_STATE_PROBABILITIES
            },
            quote: {
                states: QUOTE_STATES,
                transitions: QUOTE_TRANSITIONS
            },
            order: {
                states: ORDER_STATES,
                transitions: ORDER_TRANSITIONS
            }
        };
    }
}

module.exports = StateMachineService;
module.exports.LEAD_STATES = LEAD_STATES;
module.exports.QUOTE_STATES = QUOTE_STATES;
module.exports.ORDER_STATES = ORDER_STATES;
