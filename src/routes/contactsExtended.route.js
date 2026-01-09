/**
 * Contacts Extended Routes
 *
 * Extended contact operations - cases, activities, conflict checks.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /:contactId/cases           - Get cases associated with contact
 * - GET /:contactId/activities      - Get contact activities
 * - POST /:contactId/conflict-check - Run conflict check for contact
 * - POST /:contactId/conflict-status- Update conflict status
 * - GET /:contactId/timeline        - Get contact timeline
 * - GET /:contactId/relationships   - Get contact relationships
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Contact = require('../models/contact.model');
const Case = require('../models/case.model');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

/**
 * GET /:contactId/cases - Get cases associated with contact
 */
router.get('/:contactId/cases', async (req, res, next) => {
    try {
        const contactId = sanitizeObjectId(req.params.contactId, 'contactId');
        const { page, limit } = sanitizePagination(req.query);
        const { status, role } = req.query;

        // Verify contact exists
        const contact = await Contact.findOne({
            _id: contactId,
            ...req.firmQuery
        }).select('firstName lastName').lean();

        if (!contact) {
            throw CustomException('Contact not found', 404);
        }

        // Build case query
        const query = {
            ...req.firmQuery,
            $or: [
                { clientId: contactId },
                { 'parties.contactId': contactId },
                { 'relatedContacts': contactId }
            ]
        };

        if (status) {
            query.status = status;
        }

        const total = await Case.countDocuments(query);

        const cases = await Case.find(query)
            .select('caseNumber title status type openDate closeDate assignedTo')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ openDate: -1 })
            .lean();

        // Enrich with contact role
        const enrichedCases = cases.map(c => {
            let contactRole = 'related';
            if (c.clientId?.toString() === contactId.toString()) {
                contactRole = 'client';
            } else {
                const party = (c.parties || []).find(p =>
                    p.contactId?.toString() === contactId.toString()
                );
                if (party) {
                    contactRole = party.role || 'party';
                }
            }

            return {
                ...c,
                contactRole
            };
        });

        // Filter by role if specified
        let filteredCases = enrichedCases;
        if (role) {
            filteredCases = enrichedCases.filter(c => c.contactRole === role);
        }

        res.json({
            success: true,
            data: filteredCases,
            contact: {
                id: contactId,
                name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
            },
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:contactId/activities - Get contact activities
 */
router.get('/:contactId/activities', async (req, res, next) => {
    try {
        const contactId = sanitizeObjectId(req.params.contactId, 'contactId');
        const { page, limit } = sanitizePagination(req.query);
        const { type, startDate, endDate } = req.query;

        // Verify contact exists
        const contact = await Contact.findOne({
            _id: contactId,
            ...req.firmQuery
        }).select('firstName lastName activities').lean();

        if (!contact) {
            throw CustomException('Contact not found', 404);
        }

        let activities = contact.activities || [];

        // Apply filters
        if (type) {
            activities = activities.filter(a => a.type === type);
        }

        if (startDate) {
            const start = new Date(startDate);
            activities = activities.filter(a =>
                a.date && new Date(a.date) >= start
            );
        }

        if (endDate) {
            const end = new Date(endDate);
            activities = activities.filter(a =>
                a.date && new Date(a.date) <= end
            );
        }

        // Sort by date descending
        activities.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

        const total = activities.length;
        activities = activities.slice((page - 1) * limit, page * limit);

        res.json({
            success: true,
            data: activities,
            contact: {
                id: contactId,
                name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
            },
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:contactId/conflict-check - Run conflict check for contact
 */
router.post('/:contactId/conflict-check', async (req, res, next) => {
    try {
        const contactId = sanitizeObjectId(req.params.contactId, 'contactId');
        const { checkAgainst, includeRelated = true } = req.body;

        const contact = await Contact.findOne({
            _id: contactId,
            ...req.firmQuery
        }).lean();

        if (!contact) {
            throw CustomException('Contact not found', 404);
        }

        const conflicts = [];

        // Check against existing cases
        const cases = await Case.find({
            ...req.firmQuery,
            status: { $ne: 'closed' }
        }).select('caseNumber title clientId parties opposingParties').lean();

        for (const c of cases) {
            // Check if contact is opposing party in any case
            const isOpposing = (c.opposingParties || []).some(op =>
                op.name?.toLowerCase() === `${contact.firstName} ${contact.lastName}`.toLowerCase() ||
                op.email?.toLowerCase() === contact.email?.toLowerCase() ||
                op.phone === contact.phone
            );

            if (isOpposing) {
                conflicts.push({
                    type: 'opposing_party',
                    severity: 'high',
                    caseId: c._id,
                    caseNumber: c.caseNumber,
                    caseTitle: c.title,
                    description: 'Contact is an opposing party in this case'
                });
            }

            // Check if contact's organization conflicts
            if (contact.organization && includeRelated) {
                const orgConflict = (c.opposingParties || []).some(op =>
                    op.organization?.toLowerCase() === contact.organization.toLowerCase()
                );

                if (orgConflict) {
                    conflicts.push({
                        type: 'organization_conflict',
                        severity: 'medium',
                        caseId: c._id,
                        caseNumber: c.caseNumber,
                        caseTitle: c.title,
                        description: `Contact's organization appears as opposing party`
                    });
                }
            }
        }

        // Check against specific IDs if provided
        if (checkAgainst && Array.isArray(checkAgainst)) {
            const safeIds = checkAgainst.map(id => sanitizeObjectId(id, 'checkAgainst'));

            const relatedContacts = await Contact.find({
                _id: { $in: safeIds },
                ...req.firmQuery
            }).select('firstName lastName organization').lean();

            relatedContacts.forEach(rc => {
                // Check for same organization
                if (contact.organization && rc.organization &&
                    contact.organization.toLowerCase() === rc.organization.toLowerCase() &&
                    rc._id.toString() !== contactId.toString()) {
                    conflicts.push({
                        type: 'same_organization',
                        severity: 'low',
                        relatedContactId: rc._id,
                        relatedContactName: `${rc.firstName} ${rc.lastName}`,
                        description: 'Contacts belong to the same organization'
                    });
                }
            });
        }

        // Update contact's conflict check record
        await Contact.updateOne(
            { _id: contactId, ...req.firmQuery },
            {
                $set: {
                    lastConflictCheck: {
                        checkedAt: new Date(),
                        checkedBy: req.userID,
                        conflictsFound: conflicts.length,
                        conflicts: conflicts.slice(0, 10) // Store first 10
                    }
                }
            }
        );

        res.json({
            success: true,
            data: {
                contactId,
                contactName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
                checkedAt: new Date(),
                conflictsFound: conflicts.length,
                conflicts,
                status: conflicts.length > 0 ? 'conflicts_found' : 'clear'
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:contactId/conflict-status - Update conflict status
 */
router.post('/:contactId/conflict-status', async (req, res, next) => {
    try {
        const contactId = sanitizeObjectId(req.params.contactId, 'contactId');
        const { status, notes, waiverSigned, reviewedBy } = req.body;

        const validStatuses = ['pending', 'clear', 'conflict', 'waived', 'under_review'];
        if (status && !validStatuses.includes(status)) {
            throw CustomException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
        }

        const contact = await Contact.findOne({
            _id: contactId,
            ...req.firmQuery
        });

        if (!contact) {
            throw CustomException('Contact not found', 404);
        }

        if (!contact.conflictStatus) {
            contact.conflictStatus = {};
        }

        if (status) contact.conflictStatus.status = status;
        if (notes) contact.conflictStatus.notes = notes;
        if (waiverSigned !== undefined) contact.conflictStatus.waiverSigned = waiverSigned;
        if (reviewedBy) contact.conflictStatus.reviewedBy = sanitizeObjectId(reviewedBy, 'reviewedBy');

        contact.conflictStatus.updatedAt = new Date();
        contact.conflictStatus.updatedBy = req.userID;

        await contact.save();

        res.json({
            success: true,
            message: 'Conflict status updated',
            data: {
                contactId,
                conflictStatus: contact.conflictStatus
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:contactId/timeline - Get contact timeline
 */
router.get('/:contactId/timeline', async (req, res, next) => {
    try {
        const contactId = sanitizeObjectId(req.params.contactId, 'contactId');
        const { page, limit } = sanitizePagination(req.query);

        const contact = await Contact.findOne({
            _id: contactId,
            ...req.firmQuery
        }).lean();

        if (!contact) {
            throw CustomException('Contact not found', 404);
        }

        const timeline = [];

        // Add contact creation
        timeline.push({
            type: 'created',
            date: contact.createdAt,
            description: 'Contact created',
            actor: contact.createdBy
        });

        // Add activities
        (contact.activities || []).forEach(a => {
            timeline.push({
                type: 'activity',
                subtype: a.type,
                date: a.date || a.createdAt,
                description: a.description || a.notes,
                actor: a.createdBy
            });
        });

        // Add notes
        (contact.notes || []).forEach(n => {
            timeline.push({
                type: 'note',
                date: n.createdAt,
                description: n.content,
                actor: n.createdBy
            });
        });

        // Add updates
        if (contact.updatedAt && contact.updatedAt !== contact.createdAt) {
            timeline.push({
                type: 'updated',
                date: contact.updatedAt,
                description: 'Contact updated',
                actor: contact.updatedBy
            });
        }

        // Add conflict checks
        if (contact.lastConflictCheck) {
            timeline.push({
                type: 'conflict_check',
                date: contact.lastConflictCheck.checkedAt,
                description: `Conflict check: ${contact.lastConflictCheck.conflictsFound} conflicts found`,
                actor: contact.lastConflictCheck.checkedBy
            });
        }

        // Sort by date descending
        timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

        const total = timeline.length;
        const paginatedTimeline = timeline.slice((page - 1) * limit, page * limit);

        res.json({
            success: true,
            data: paginatedTimeline,
            contact: {
                id: contactId,
                name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
            },
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:contactId/relationships - Get contact relationships
 */
router.get('/:contactId/relationships', async (req, res, next) => {
    try {
        const contactId = sanitizeObjectId(req.params.contactId, 'contactId');

        const contact = await Contact.findOne({
            _id: contactId,
            ...req.firmQuery
        }).lean();

        if (!contact) {
            throw CustomException('Contact not found', 404);
        }

        // Get related contacts
        const relatedIds = (contact.relatedContacts || []).map(r =>
            r.contactId || r
        ).filter(Boolean);

        let relatedContacts = [];
        if (relatedIds.length > 0) {
            relatedContacts = await Contact.find({
                _id: { $in: relatedIds },
                ...req.firmQuery
            }).select('firstName lastName email phone organization type').lean();
        }

        // Build relationship map
        const relationships = relatedContacts.map(rc => {
            const relation = (contact.relatedContacts || []).find(r =>
                (r.contactId || r)?.toString() === rc._id.toString()
            );

            return {
                contactId: rc._id,
                name: `${rc.firstName || ''} ${rc.lastName || ''}`.trim(),
                email: rc.email,
                phone: rc.phone,
                organization: rc.organization,
                type: rc.type,
                relationship: relation?.relationship || relation?.type || 'related',
                notes: relation?.notes
            };
        });

        // Find contacts in same organization
        let colleaguesCount = 0;
        if (contact.organization) {
            colleaguesCount = await Contact.countDocuments({
                ...req.firmQuery,
                organization: contact.organization,
                _id: { $ne: contactId }
            });
        }

        // Find cases with shared parties
        const cases = await Case.find({
            ...req.firmQuery,
            $or: [
                { clientId: contactId },
                { 'parties.contactId': contactId }
            ]
        }).select('parties').lean();

        const sharedPartyIds = new Set();
        cases.forEach(c => {
            (c.parties || []).forEach(p => {
                if (p.contactId && p.contactId.toString() !== contactId.toString()) {
                    sharedPartyIds.add(p.contactId.toString());
                }
            });
        });

        res.json({
            success: true,
            data: {
                contactId,
                contactName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
                organization: contact.organization,
                relationships,
                summary: {
                    directRelationships: relationships.length,
                    colleaguesInOrganization: colleaguesCount,
                    sharedCaseParties: sharedPartyIds.size
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
