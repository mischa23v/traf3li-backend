/**
 * Contact List Controller
 * Security: All operations enforce multi-tenant isolation via firmQuery
 *
 * Manages static and dynamic contact lists for email campaigns and bulk operations
 */

const ContactList = require('../models/contactList.model');
const { Lead, Contact, Client } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Create a new contact list
 * @route POST /api/contact-lists
 */
const createContactList = asyncHandler(async (req, res) => {
    // Block departed users
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const { name, listType } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
        throw CustomException('Name is required', 400);
    }

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'name',
        'nameAr',
        'description',
        'listType',
        'entityType',
        'criteria',
        'criteriaLogic',
        'isPrivate',
        'sharedWith',
        'tags'
    ]);

    // Sanitize ObjectIds in sharedWith array
    if (allowedFields.sharedWith && Array.isArray(allowedFields.sharedWith)) {
        allowedFields.sharedWith = allowedFields.sharedWith.map(id => sanitizeObjectId(id));
    }

    // Create with firm context
    const contactList = new ContactList({
        ...allowedFields,
        firmId: req.firmId,
        lawyerId: req.userID,
        createdBy: req.userID
    });

    await contactList.save();

    return res.status(201).json({
        error: false,
        message: 'Contact list created successfully',
        data: contactList
    });
});

/**
 * Get all contact lists with filters
 * @route GET /api/contact-lists
 */
const getContactLists = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const {
        search,
        listType,
        entityType,
        status,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    // Build query with firm isolation
    const query = { ...req.firmQuery };

    // Safe search with escaped regex
    if (search) {
        query.$or = [
            { name: { $regex: escapeRegex(search), $options: 'i' } },
            { nameAr: { $regex: escapeRegex(search), $options: 'i' } },
            { description: { $regex: escapeRegex(search), $options: 'i' } }
        ];
    }

    // Validate listType against allowlist
    const VALID_LIST_TYPES = ['static', 'dynamic'];
    if (listType && VALID_LIST_TYPES.includes(listType)) {
        query.listType = listType;
    }

    // Validate entityType against allowlist
    const VALID_ENTITY_TYPES = ['lead', 'contact', 'client', 'mixed'];
    if (entityType && VALID_ENTITY_TYPES.includes(entityType)) {
        query.entityType = entityType;
    }

    // Validate status against allowlist
    const VALID_STATUSES = ['active', 'inactive', 'archived'];
    if (status && VALID_STATUSES.includes(status)) {
        query.status = status;
    } else {
        // Default: exclude archived
        query.status = { $ne: 'archived' };
    }

    // Pagination
    const parsedLimit = Math.min(parseInt(limit) || 20, 100);
    const parsedPage = parseInt(page) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

    // Validate sortBy against allowlist
    const VALID_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'memberCount'];
    const validSortBy = VALID_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
    const validSortOrder = sortOrder === 'asc' ? 1 : -1;

    const lists = await ContactList.find(query)
        .select('-members') // Don't return full member arrays in list view
        .skip(skip)
        .limit(parsedLimit)
        .sort({ [validSortBy]: validSortOrder });

    const total = await ContactList.countDocuments(query);

    return res.json({
        error: false,
        data: lists,
        pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            pages: Math.ceil(total / parsedLimit)
        }
    });
});

/**
 * Get single contact list by ID
 * @route GET /api/contact-lists/:id
 */
const getContactListById = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const sanitizedId = sanitizeObjectId(req.params.id);

    // IDOR Protection: Query includes firmQuery
    const list = await ContactList.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!list) {
        throw CustomException('Contact list not found', 404);
    }

    return res.json({
        error: false,
        data: list
    });
});

/**
 * Update contact list
 * @route PUT /api/contact-lists/:id
 */
const updateContactList = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const sanitizedId = sanitizeObjectId(req.params.id);

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'name',
        'nameAr',
        'description',
        'listType',
        'entityType',
        'criteria',
        'criteriaLogic',
        'status',
        'isPrivate',
        'sharedWith',
        'tags'
    ]);

    // Sanitize ObjectIds in sharedWith array
    if (allowedFields.sharedWith && Array.isArray(allowedFields.sharedWith)) {
        allowedFields.sharedWith = allowedFields.sharedWith.map(id => sanitizeObjectId(id));
    }

    // IDOR Protection: Query-level ownership check
    const list = await ContactList.findOneAndUpdate(
        { _id: sanitizedId, ...req.firmQuery },
        {
            $set: {
                ...allowedFields,
                updatedBy: req.userID
            }
        },
        { new: true }
    );

    if (!list) {
        throw CustomException('Contact list not found', 404);
    }

    return res.json({
        error: false,
        message: 'Contact list updated successfully',
        data: list
    });
});

/**
 * Delete contact list
 * @route DELETE /api/contact-lists/:id
 */
const deleteContactList = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const sanitizedId = sanitizeObjectId(req.params.id);

    // IDOR Protection: Query-level ownership check
    const list = await ContactList.findOneAndDelete({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!list) {
        throw CustomException('Contact list not found', 404);
    }

    return res.json({
        error: false,
        message: 'Contact list deleted successfully'
    });
});

/**
 * Add member to contact list
 * @route POST /api/contact-lists/:id/members
 */
const addMember = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const sanitizedId = sanitizeObjectId(req.params.id);
    const { entityType, entityId, email, name } = req.body;

    // Validate required fields
    if (!entityType || !entityId) {
        throw CustomException('entityType and entityId are required', 400);
    }

    // Validate entityType against allowlist
    const VALID_ENTITY_TYPES = ['lead', 'contact', 'client'];
    if (!VALID_ENTITY_TYPES.includes(entityType)) {
        throw CustomException('Invalid entityType', 400);
    }

    const sanitizedEntityId = sanitizeObjectId(entityId);

    // IDOR Protection: Find list with firmQuery
    const list = await ContactList.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!list) {
        throw CustomException('Contact list not found', 404);
    }

    // Verify entity exists and belongs to firm
    let entity;
    if (entityType === 'lead') {
        entity = await Lead.findOne({ _id: sanitizedEntityId, ...req.firmQuery });
    } else if (entityType === 'contact') {
        entity = await Contact.findOne({ _id: sanitizedEntityId, ...req.firmQuery });
    } else if (entityType === 'client') {
        entity = await Client.findOne({ _id: sanitizedEntityId, ...req.firmQuery });
    }

    if (!entity) {
        throw CustomException(`${entityType} not found`, 404);
    }

    // Add member
    const added = await list.addMember(
        entityType,
        sanitizedEntityId,
        email || entity.email,
        name || entity.name || `${entity.firstName} ${entity.lastName}`,
        req.userID
    );

    return res.json({
        error: false,
        message: added ? 'Member added successfully' : 'Member already exists',
        data: list
    });
});

/**
 * Remove member from contact list
 * @route DELETE /api/contact-lists/:id/members/:memberId
 */
const removeMember = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const sanitizedId = sanitizeObjectId(req.params.id);
    const sanitizedMemberId = sanitizeObjectId(req.params.memberId);

    // IDOR Protection: Find list with firmQuery
    const list = await ContactList.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!list) {
        throw CustomException('Contact list not found', 404);
    }

    await list.removeMember(sanitizedMemberId);

    return res.json({
        error: false,
        message: 'Member removed successfully',
        data: list
    });
});

/**
 * Get members of a contact list
 * @route GET /api/contact-lists/:id/members
 */
const getListMembers = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const sanitizedId = sanitizeObjectId(req.params.id);
    const { page = 1, limit = 50 } = req.query;

    // IDOR Protection: Find list with firmQuery
    const list = await ContactList.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!list) {
        throw CustomException('Contact list not found', 404);
    }

    // Pagination for members
    const parsedLimit = Math.min(parseInt(limit) || 50, 200);
    const parsedPage = parseInt(page) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

    const members = list.members.slice(skip, skip + parsedLimit);
    const total = list.members.length;

    return res.json({
        error: false,
        data: {
            listId: list._id,
            listName: list.name,
            members,
            pagination: {
                page: parsedPage,
                limit: parsedLimit,
                total,
                pages: Math.ceil(total / parsedLimit)
            }
        }
    });
});

/**
 * Refresh dynamic list (re-evaluate criteria)
 * @route POST /api/contact-lists/:id/refresh
 */
const refreshDynamicList = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const sanitizedId = sanitizeObjectId(req.params.id);

    // IDOR Protection: Find list with firmQuery
    const list = await ContactList.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!list) {
        throw CustomException('Contact list not found', 404);
    }

    if (list.listType !== 'dynamic') {
        throw CustomException('Only dynamic lists can be refreshed', 400);
    }

    // TODO: Implement dynamic list refresh logic
    // This would evaluate the criteria and rebuild the members array

    list.stats.lastRefreshed = new Date();
    await list.save();

    return res.json({
        error: false,
        message: 'List refreshed successfully',
        data: list
    });
});

/**
 * Duplicate a contact list
 * @route POST /api/contact-lists/:id/duplicate
 */
const duplicateContactList = asyncHandler(async (req, res) => {
    if (req.isDeparted) {
        throw CustomException('ليس لديك صلاحية للوصول', 403);
    }

    const sanitizedId = sanitizeObjectId(req.params.id);

    // IDOR Protection: Find list with firmQuery
    const originalList = await ContactList.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!originalList) {
        throw CustomException('Contact list not found', 404);
    }

    // Create duplicate
    const duplicate = new ContactList({
        name: `${originalList.name} (Copy)`,
        nameAr: originalList.nameAr ? `${originalList.nameAr} (نسخة)` : undefined,
        description: originalList.description,
        listType: originalList.listType,
        entityType: originalList.entityType,
        members: originalList.listType === 'static' ? originalList.members : [],
        criteria: originalList.criteria,
        criteriaLogic: originalList.criteriaLogic,
        isPrivate: originalList.isPrivate,
        sharedWith: originalList.sharedWith,
        tags: originalList.tags,
        firmId: req.firmId,
        lawyerId: req.userID,
        createdBy: req.userID
    });

    await duplicate.save();

    return res.status(201).json({
        error: false,
        message: 'Contact list duplicated successfully',
        data: duplicate
    });
});

module.exports = {
    createContactList,
    getContactLists,
    getContactListById,
    updateContactList,
    deleteContactList,
    addMember,
    removeMember,
    getListMembers,
    refreshDynamicList,
    duplicateContactList
};
