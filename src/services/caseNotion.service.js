const CaseNotionBlock = require('../models/caseNotionBlock.model');
const CaseNotionPage = require('../models/caseNotionPage.model');
const SyncedBlock = require('../models/syncedBlock.model');
const CaseNotionDatabaseView = require('../models/caseNotionDatabaseView.model');
const { Case, Task, Event, Reminder, Document } = require('../models');
const AISettingsService = require('./aiSettings.service');
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
const escapeRegex = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * CaseNotion Service
 * Handles all CaseNotion operations including blocks, pages, synced blocks,
 * database views, templates, AI features, and real-time collaboration.
 */
class CaseNotionService {
  // ===================================================================
  // PAGE OPERATIONS
  // ===================================================================

  /**
   * Create a new page
   * @param {string} caseId - Case ID
   * @param {Object} data - Page data
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Created page
   */
  static async createPage(caseId, data, userId, firmId) {
    try {
      const { title, icon, coverImage, parentPageId, isTemplate = false } = data;

      // Verify case exists
      const caseExists = await Case.findOne({ _id: caseId, firmId });
      if (!caseExists) {
        throw new Error('Case not found');
      }

      // Calculate order for new page
      let order = 0;
      const lastPage = await CaseNotionPage.findOne({
        caseId,
        parentPageId: parentPageId || null
      }).sort({ order: -1 });

      if (lastPage) {
        order = lastPage.order + 1000;
      }

      // Create page
      const page = await CaseNotionPage.create({
        caseId,
        parentPageId: parentPageId || null,
        title: title || 'Untitled',
        icon,
        coverImage,
        order,
        isTemplate,
        createdBy: userId,
        lastEditedBy: userId,
        firmId,
        permissions: {
          canEdit: [userId],
          canView: [userId],
          isPublic: false
        }
      });

      return page;
    } catch (error) {
      logger.error('Error in createPage:', error);
      throw error;
    }
  }

  /**
   * Get page with all its blocks
   * @param {string} pageId - Page ID
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Page with blocks
   */
  static async getPage(pageId, userId, firmId) {
    try {
      const page = await CaseNotionPage.findOne({ _id: pageId, firmId })
        .populate('createdBy', 'firstName lastName fullName')
        .populate('lastEditedBy', 'firstName lastName fullName');

      if (!page) {
        throw new Error('Page not found');
      }

      // Check permissions
      if (!this._hasViewPermission(page, userId)) {
        throw new Error('You do not have permission to view this page');
      }

      // Get all blocks for this page
      const blocks = await CaseNotionBlock.find({
        pageId,
        isDeleted: false
      }).sort({ order: 1 });

      // Build block tree
      const blockTree = this._buildBlockTree(blocks);

      // Update last viewed
      page.lastViewedBy = userId;
      page.lastViewedAt = new Date();
      await page.save();

      return {
        ...page.toObject(),
        blocks: blockTree
      };
    } catch (error) {
      logger.error('Error in getPage:', error);
      throw error;
    }
  }

  /**
   * Update page metadata
   * @param {string} pageId - Page ID
   * @param {Object} updates - Updates to apply
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Updated page
   */
  static async updatePage(pageId, updates, userId, firmId) {
    try {
      const page = await CaseNotionPage.findOne({ _id: pageId, firmId });
      if (!page) {
        throw new Error('Page not found');
      }

      // Check permissions
      if (!this._hasEditPermission(page, userId)) {
        throw new Error('You do not have permission to edit this page');
      }

      // Update allowed fields
      const allowedFields = ['title', 'icon', 'coverImage', 'isArchived', 'isFavorite'];
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          page[field] = updates[field];
        }
      }

      page.lastEditedBy = userId;
      page.lastEditedAt = new Date();
      await page.save();

      return page;
    } catch (error) {
      logger.error('Error in updatePage:', error);
      throw error;
    }
  }

  /**
   * Soft delete (archive) a page
   * @param {string} pageId - Page ID
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Result
   */
  static async deletePage(pageId, userId, firmId) {
    try {
      const page = await CaseNotionPage.findOne({ _id: pageId, firmId });
      if (!page) {
        throw new Error('Page not found');
      }

      // Check permissions
      if (!this._hasEditPermission(page, userId)) {
        throw new Error('You do not have permission to delete this page');
      }

      // Archive the page and all child pages
      await this._archivePageRecursive(pageId, userId, firmId);

      return { success: true, message: 'Page archived successfully' };
    } catch (error) {
      logger.error('Error in deletePage:', error);
      throw error;
    }
  }

  /**
   * Duplicate a page with all blocks
   * @param {string} pageId - Page ID
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Duplicated page
   */
  static async duplicatePage(pageId, userId, firmId) {
    try {
      const originalPage = await CaseNotionPage.findOne({ _id: pageId, firmId });
      if (!originalPage) {
        throw new Error('Page not found');
      }

      // Check permissions
      if (!this._hasViewPermission(originalPage, userId)) {
        throw new Error('You do not have permission to duplicate this page');
      }

      // Create duplicate page
      const duplicatePage = await CaseNotionPage.create({
        caseId: originalPage.caseId,
        parentPageId: originalPage.parentPageId,
        title: `${originalPage.title} (Copy)`,
        icon: originalPage.icon,
        coverImage: originalPage.coverImage,
        order: originalPage.order + 500,
        createdBy: userId,
        lastEditedBy: userId,
        firmId: originalPage.firmId,
        permissions: {
          canEdit: [userId],
          canView: [userId],
          isPublic: false
        }
      });

      // Duplicate all blocks
      const blocks = await CaseNotionBlock.find({
        pageId: originalPage._id,
        isDeleted: false
      }).sort({ order: 1 });

      const blockIdMap = new Map(); // Map old IDs to new IDs

      for (const block of blocks) {
        const newBlock = await CaseNotionBlock.create({
          pageId: duplicatePage._id,
          type: block.type,
          content: block.content,
          properties: block.properties,
          parentBlockId: blockIdMap.get(block.parentBlockId?.toString()) || null,
          order: block.order,
          createdBy: userId,
          lastEditedBy: userId
        });

        blockIdMap.set(block._id.toString(), newBlock._id);
      }

      return duplicatePage;
    } catch (error) {
      logger.error('Error in duplicatePage:', error);
      throw error;
    }
  }

  /**
   * Move page in hierarchy
   * @param {string} pageId - Page ID
   * @param {string} newParentId - New parent page ID (null for root)
   * @param {number} newOrder - New order position
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Updated page
   */
  static async movePage(pageId, newParentId, newOrder, userId, firmId) {
    try {
      const page = await CaseNotionPage.findOne({ _id: pageId, firmId });
      if (!page) {
        throw new Error('Page not found');
      }

      // Check permissions
      if (!this._hasEditPermission(page, userId)) {
        throw new Error('You do not have permission to move this page');
      }

      // Prevent moving page to be its own child
      if (newParentId) {
        const isDescendant = await this._isDescendant(pageId, newParentId, firmId);
        if (isDescendant || pageId === newParentId) {
          throw new Error('Cannot move page to be its own descendant');
        }
      }

      page.parentPageId = newParentId || null;
      page.order = newOrder;
      page.lastEditedBy = userId;
      page.lastEditedAt = new Date();
      await page.save();

      return page;
    } catch (error) {
      logger.error('Error in movePage:', error);
      throw error;
    }
  }

  /**
   * Get full page tree for a case (for sidebar)
   * @param {string} caseId - Case ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Page tree
   */
  static async getCasePageTree(caseId, userId) {
    try {
      const pages = await CaseNotionPage.find({
        caseId,
        isArchived: false
      }).sort({ order: 1 });

      // Filter by permissions
      const visiblePages = pages.filter(page =>
        this._hasViewPermission(page, userId)
      );

      // Build tree structure
      return this._buildPageTree(visiblePages);
    } catch (error) {
      logger.error('Error in getCasePageTree:', error);
      throw error;
    }
  }

  /**
   * Search pages
   * @param {string} caseId - Case ID
   * @param {string} query - Search query
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Search results
   */
  static async searchPages(caseId, query, userId) {
    try {
      const pages = await CaseNotionPage.find({
        caseId,
        isArchived: false,
        $or: [
          { title: { $regex: escapeRegex(query), $options: 'i' } },
          { 'metadata.tags': { $regex: escapeRegex(query), $options: 'i' } }
        ]
      }).limit(20);

      // Filter by permissions
      const visiblePages = pages.filter(page =>
        this._hasViewPermission(page, userId)
      );

      return visiblePages;
    } catch (error) {
      logger.error('Error in searchPages:', error);
      throw error;
    }
  }

  /**
   * Get recently viewed pages
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @param {number} limit - Limit
   * @returns {Promise<Array>} Recent pages
   */
  static async getRecentPages(userId, firmId, limit = 10) {
    try {
      const pages = await CaseNotionPage.find({
        firmId,
        lastViewedBy: userId,
        isArchived: false
      })
        .sort({ lastViewedAt: -1 })
        .limit(limit)
        .populate('caseId', 'title caseNumber');

      return pages;
    } catch (error) {
      logger.error('Error in getRecentPages:', error);
      throw error;
    }
  }

  /**
   * Toggle favorite status
   * @param {string} pageId - Page ID
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Updated page
   */
  static async toggleFavorite(pageId, userId, firmId) {
    try {
      const page = await CaseNotionPage.findOne({ _id: pageId, firmId });
      if (!page) {
        throw new Error('Page not found');
      }

      page.isFavorite = !page.isFavorite;
      await page.save();

      return page;
    } catch (error) {
      logger.error('Error in toggleFavorite:', error);
      throw error;
    }
  }

  // ===================================================================
  // BLOCK OPERATIONS
  // ===================================================================

  /**
   * Create a new block
   * @param {string} pageId - Page ID
   * @param {Object} blockData - Block data
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Created block
   */
  static async createBlock(pageId, blockData, userId, firmId) {
    try {
      const page = await CaseNotionPage.findOne({ _id: pageId, firmId });
      if (!page) {
        throw new Error('Page not found');
      }

      // Check permissions
      if (!this._hasEditPermission(page, userId)) {
        throw new Error('You do not have permission to edit this page');
      }

      const { type, content, properties, parentBlockId, afterBlockId } = blockData;

      // Calculate order
      let order = 0;
      if (afterBlockId) {
        const afterBlock = await CaseNotionBlock.findOne({ _id: afterBlockId, pageId });
        if (!afterBlock) {
          throw new Error('After block not found');
        }
        const nextBlock = await CaseNotionBlock.findOne({
          pageId,
          parentBlockId: parentBlockId || null,
          order: { $gt: afterBlock.order },
          isDeleted: false
        }).sort({ order: 1 });

        order = this._generateOrder(afterBlock.order, nextBlock?.order);
      } else {
        const lastBlock = await CaseNotionBlock.findOne({
          pageId,
          parentBlockId: parentBlockId || null,
          isDeleted: false
        }).sort({ order: -1 });

        order = lastBlock ? lastBlock.order + 1000 : 0;
      }

      // Create block
      const block = await CaseNotionBlock.create({
        pageId,
        type,
        content,
        properties: properties || {},
        parentBlockId: parentBlockId || null,
        order,
        createdBy: userId,
        lastEditedBy: userId
      });

      // Update page last edited
      page.lastEditedBy = userId;
      page.lastEditedAt = new Date();
      await page.save();

      return block;
    } catch (error) {
      logger.error('Error in createBlock:', error);
      throw error;
    }
  }

  /**
   * Update block content
   * @param {string} blockId - Block ID
   * @param {Object} updates - Updates to apply
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Updated block
   */
  static async updateBlock(blockId, updates, userId, firmId) {
    try {
      // First verify page exists and belongs to firm to prevent IDOR
      // Note: blocks don't have firmId, so we verify via page
      const block = await CaseNotionBlock.findOne({ _id: blockId });
      if (!block) {
        throw new Error('Block not found');
      }

      const page = await CaseNotionPage.findOne({ _id: block.pageId, firmId });
      if (!page) {
        throw new Error('Block not found or access denied');
      }
      if (!this._hasEditPermission(page, userId)) {
        throw new Error('You do not have permission to edit this block');
      }

      // Update allowed fields
      if (updates.content !== undefined) {
        block.content = updates.content;
      }
      if (updates.properties !== undefined) {
        block.properties = { ...block.properties, ...updates.properties };
      }
      if (updates.type !== undefined) {
        block.type = updates.type;
      }

      block.lastEditedBy = userId;
      block.lastEditedAt = new Date();
      await block.save();

      // Update page last edited
      page.lastEditedBy = userId;
      page.lastEditedAt = new Date();
      await page.save();

      return block;
    } catch (error) {
      logger.error('Error in updateBlock:', error);
      throw error;
    }
  }

  /**
   * Delete block and its children
   * @param {string} blockId - Block ID
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Result
   */
  static async deleteBlock(blockId, userId, firmId) {
    try {
      // First verify page exists and belongs to firm to prevent IDOR
      // Note: blocks don't have firmId, so we verify via page
      const block = await CaseNotionBlock.findOne({ _id: blockId });
      if (!block) {
        throw new Error('Block not found');
      }

      const page = await CaseNotionPage.findOne({ _id: block.pageId, firmId });
      if (!page) {
        throw new Error('Block not found or access denied');
      }
      if (!this._hasEditPermission(page, userId)) {
        throw new Error('You do not have permission to delete this block');
      }

      // Soft delete block and all children
      await this._deleteBlockRecursive(blockId);

      return { success: true, message: 'Block deleted successfully' };
    } catch (error) {
      logger.error('Error in deleteBlock:', error);
      throw error;
    }
  }

  /**
   * Move block to another page or parent
   * @param {string} blockId - Block ID
   * @param {string} targetPageId - Target page ID
   * @param {string} targetParentId - Target parent block ID
   * @param {number} newOrder - New order
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Updated block
   */
  static async moveBlock(blockId, targetPageId, targetParentId, newOrder, firmId) {
    try {
      const block = await CaseNotionBlock.findById(blockId);
      if (!block) {
        throw new Error('Block not found');
      }

      // Verify source page belongs to firm
      const sourcePage = await CaseNotionPage.findOne({ _id: block.pageId, firmId });
      if (!sourcePage) {
        throw new Error('Block not found or access denied');
      }

      // Verify target page belongs to firm
      const targetPage = await CaseNotionPage.findOne({ _id: targetPageId, firmId });
      if (!targetPage) {
        throw new Error('Target page not found or access denied');
      }

      block.pageId = targetPageId;
      block.parentBlockId = targetParentId || null;
      block.order = newOrder;
      await block.save();

      return block;
    } catch (error) {
      logger.error('Error in moveBlock:', error);
      throw error;
    }
  }

  /**
   * Duplicate block with children
   * @param {string} blockId - Block ID
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Duplicated block
   */
  static async duplicateBlock(blockId, userId, firmId) {
    try {
      const originalBlock = await CaseNotionBlock.findById(blockId);
      if (!originalBlock) {
        throw new Error('Block not found');
      }

      // Verify page belongs to firm
      const page = await CaseNotionPage.findOne({ _id: originalBlock.pageId, firmId });
      if (!page) {
        throw new Error('Block not found or access denied');
      }

      // Get all descendant blocks
      const descendants = await this._getDescendantBlocks(blockId);

      // Create duplicate block
      const duplicateBlock = await CaseNotionBlock.create({
        pageId: originalBlock.pageId,
        type: originalBlock.type,
        content: originalBlock.content,
        properties: originalBlock.properties,
        parentBlockId: originalBlock.parentBlockId,
        order: originalBlock.order + 500,
        createdBy: userId,
        lastEditedBy: userId
      });

      // Duplicate children
      const blockIdMap = new Map();
      blockIdMap.set(originalBlock._id.toString(), duplicateBlock._id);

      for (const block of descendants) {
        const newBlock = await CaseNotionBlock.create({
          pageId: block.pageId,
          type: block.type,
          content: block.content,
          properties: block.properties,
          parentBlockId: blockIdMap.get(block.parentBlockId?.toString()),
          order: block.order,
          createdBy: userId,
          lastEditedBy: userId
        });

        blockIdMap.set(block._id.toString(), newBlock._id);
      }

      return duplicateBlock;
    } catch (error) {
      logger.error('Error in duplicateBlock:', error);
      throw error;
    }
  }

  /**
   * Get all blocks for a page (nested structure)
   * @param {string} pageId - Page ID
   * @returns {Promise<Array>} Nested block tree
   */
  static async getPageBlocks(pageId) {
    try {
      const blocks = await CaseNotionBlock.find({
        pageId,
        isDeleted: false
      }).sort({ order: 1 });

      return this._buildBlockTree(blocks);
    } catch (error) {
      logger.error('Error in getPageBlocks:', error);
      throw error;
    }
  }

  /**
   * Nest block under another block
   * @param {string} blockId - Block ID
   * @param {string} parentBlockId - Parent block ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Updated block
   */
  static async nestBlock(blockId, parentBlockId, firmId) {
    try {
      const block = await CaseNotionBlock.findById(blockId);
      if (!block) {
        throw new Error('Block not found');
      }

      // Verify block's page belongs to firm
      const page = await CaseNotionPage.findOne({ _id: block.pageId, firmId });
      if (!page) {
        throw new Error('Block not found or access denied');
      }

      // Prevent circular nesting
      const isDescendant = await this._isBlockDescendant(blockId, parentBlockId);
      if (isDescendant || blockId === parentBlockId) {
        throw new Error('Cannot nest block under its own descendant');
      }

      block.parentBlockId = parentBlockId;
      await block.save();

      return block;
    } catch (error) {
      logger.error('Error in nestBlock:', error);
      throw error;
    }
  }

  /**
   * Unnest block (move up one level)
   * @param {string} blockId - Block ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Updated block
   */
  static async unnestBlock(blockId, firmId) {
    try {
      const block = await CaseNotionBlock.findById(blockId);
      if (!block) {
        throw new Error('Block not found');
      }

      // Verify block's page belongs to firm
      const page = await CaseNotionPage.findOne({ _id: block.pageId, firmId });
      if (!page) {
        throw new Error('Block not found or access denied');
      }

      if (block.parentBlockId) {
        const parent = await CaseNotionBlock.findById(block.parentBlockId);
        block.parentBlockId = parent?.parentBlockId || null;
        await block.save();
      }

      return block;
    } catch (error) {
      logger.error('Error in unnestBlock:', error);
      throw error;
    }
  }

  /**
   * Convert block type
   * @param {string} blockId - Block ID
   * @param {string} newType - New block type
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Updated block
   */
  static async convertBlockType(blockId, newType, userId, firmId) {
    try {
      const block = await CaseNotionBlock.findById(blockId);
      if (!block) {
        throw new Error('Block not found');
      }

      // Verify block's page belongs to firm
      const page = await CaseNotionPage.findOne({ _id: block.pageId, firmId });
      if (!page) {
        throw new Error('Block not found or access denied');
      }

      block.type = newType;
      block.lastEditedBy = userId;
      block.lastEditedAt = new Date();
      await block.save();

      return block;
    } catch (error) {
      logger.error('Error in convertBlockType:', error);
      throw error;
    }
  }

  /**
   * Search blocks by content
   * @param {string} caseId - Case ID
   * @param {string} query - Search query
   * @returns {Promise<Array>} Search results
   */
  static async searchBlocks(caseId, query) {
    try {
      const pages = await CaseNotionPage.find({ caseId, isArchived: false });
      const pageIds = pages.map(p => p._id);

      const blocks = await CaseNotionBlock.find({
        pageId: { $in: pageIds },
        isDeleted: false,
        'content.text': { $regex: escapeRegex(query), $options: 'i' }
      })
        .limit(50)
        .populate('pageId', 'title');

      return blocks;
    } catch (error) {
      logger.error('Error in searchBlocks:', error);
      throw error;
    }
  }

  // ===================================================================
  // SYNCED BLOCKS
  // ===================================================================

  /**
   * Create a master synced block
   * @param {Object} content - Block content
   * @param {string} name - Synced block name
   * @param {string} firmId - Firm ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created synced block
   */
  static async createSyncedBlock(content, name, firmId, userId) {
    try {
      const syncedBlock = await SyncedBlock.create({
        firmId,
        name,
        content,
        category: content.category || 'general',
        createdBy: userId,
        lastEditedBy: userId
      });

      return syncedBlock;
    } catch (error) {
      logger.error('Error in createSyncedBlock:', error);
      throw error;
    }
  }

  /**
   * Insert synced block instance into a page
   * @param {string} syncedBlockId - Synced block ID
   * @param {string} pageId - Target page ID
   * @param {number} order - Order position
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Created block instance
   */
  static async insertSyncedBlock(syncedBlockId, pageId, order, userId, firmId) {
    try {
      const syncedBlock = await SyncedBlock.findOne({ _id: syncedBlockId, firmId });
      if (!syncedBlock) {
        throw new Error('Synced block not found');
      }

      const page = await CaseNotionPage.findOne({ _id: pageId, firmId: syncedBlock.firmId });
      if (!page || !this._hasEditPermission(page, userId)) {
        throw new Error('You do not have permission to edit this page');
      }

      // Create block instance referencing the synced block
      const block = await CaseNotionBlock.create({
        pageId,
        type: 'synced',
        content: syncedBlock.content,
        properties: {
          syncedBlockId: syncedBlock._id,
          isSynced: true
        },
        order,
        createdBy: userId,
        lastEditedBy: userId
      });

      // Track instance
      syncedBlock.instances.push({
        blockId: block._id,
        pageId,
        insertedBy: userId
      });
      await syncedBlock.save();

      return block;
    } catch (error) {
      logger.error('Error in insertSyncedBlock:', error);
      throw error;
    }
  }

  /**
   * Update synced block (updates all instances)
   * @param {string} syncedBlockId - Synced block ID
   * @param {Object} newContent - New content
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Result
   */
  static async updateSyncedBlock(syncedBlockId, newContent, userId, firmId) {
    try {
      const syncedBlock = await SyncedBlock.findOne({ _id: syncedBlockId, firmId });
      if (!syncedBlock) {
        throw new Error('Synced block not found');
      }

      // Update master
      syncedBlock.content = newContent;
      syncedBlock.lastEditedBy = userId;
      syncedBlock.lastEditedAt = new Date();
      await syncedBlock.save();

      // Update all instances
      const blockIds = syncedBlock.instances.map(i => i.blockId);
      await CaseNotionBlock.updateMany(
        { _id: { $in: blockIds } },
        {
          $set: {
            content: newContent,
            lastEditedBy: userId,
            lastEditedAt: new Date()
          }
        }
      );

      return {
        success: true,
        updatedCount: blockIds.length,
        message: `Updated ${blockIds.length} synced instances`
      };
    } catch (error) {
      logger.error('Error in updateSyncedBlock:', error);
      throw error;
    }
  }

  /**
   * Get available synced blocks
   * @param {string} firmId - Firm ID
   * @param {string} category - Optional category filter
   * @returns {Promise<Array>} Synced blocks
   */
  static async getSyncedBlocks(firmId, category = null) {
    try {
      const query = { firmId };
      if (category) {
        query.category = category;
      }

      const syncedBlocks = await SyncedBlock.find(query)
        .sort({ name: 1 })
        .populate('createdBy', 'firstName lastName fullName');

      return syncedBlocks;
    } catch (error) {
      logger.error('Error in getSyncedBlocks:', error);
      throw error;
    }
  }

  /**
   * Get all instances of a synced block
   * @param {string} syncedBlockId - Synced block ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Array>} Block instances with page info
   */
  static async getSyncedBlockInstances(syncedBlockId, firmId) {
    try {
      const syncedBlock = await SyncedBlock.findOne({ _id: syncedBlockId, firmId })
        .populate({
          path: 'instances.pageId',
          select: 'title caseId',
          populate: { path: 'caseId', select: 'title caseNumber' }
        });

      if (!syncedBlock) {
        throw new Error('Synced block not found');
      }

      return syncedBlock.instances;
    } catch (error) {
      logger.error('Error in getSyncedBlockInstances:', error);
      throw error;
    }
  }

  // ===================================================================
  // DATABASE VIEWS
  // ===================================================================

  /**
   * Create a database view
   * @param {string} pageId - Page ID
   * @param {Object} viewConfig - View configuration
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Created view
   */
  static async createView(pageId, viewConfig, userId, firmId) {
    try {
      const page = await CaseNotionPage.findOne({ _id: pageId, firmId });
      if (!page || !this._hasEditPermission(page, userId)) {
        throw new Error('You do not have permission to create views on this page');
      }

      const { name, type, dataSource, filters, sorting, groupBy, properties } = viewConfig;

      const view = await CaseNotionDatabaseView.create({
        pageId,
        firmId: page.firmId,
        name,
        type,
        dataSource,
        filters: filters || [],
        sorting: sorting || [],
        groupBy,
        properties: properties || {},
        createdBy: userId,
        lastEditedBy: userId
      });

      return view;
    } catch (error) {
      logger.error('Error in createView:', error);
      throw error;
    }
  }

  /**
   * Get all views for a page
   * @param {string} pageId - Page ID
   * @returns {Promise<Array>} Views
   */
  static async getViews(pageId) {
    try {
      const views = await CaseNotionDatabaseView.find({ pageId })
        .sort({ createdAt: 1 });

      return views;
    } catch (error) {
      logger.error('Error in getViews:', error);
      throw error;
    }
  }

  /**
   * Update view configuration
   * @param {string} viewId - View ID
   * @param {Object} updates - Updates to apply
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Updated view
   */
  static async updateView(viewId, updates, userId, firmId) {
    try {
      const view = await CaseNotionDatabaseView.findOne({ _id: viewId, firmId });
      if (!view) {
        throw new Error('View not found');
      }

      // Update allowed fields
      const allowedFields = ['name', 'filters', 'sorting', 'groupBy', 'properties', 'hiddenProperties'];
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          view[field] = updates[field];
        }
      }

      view.lastEditedBy = userId;
      view.lastEditedAt = new Date();
      await view.save();

      return view;
    } catch (error) {
      logger.error('Error in updateView:', error);
      throw error;
    }
  }

  /**
   * Delete a view
   * @param {string} viewId - View ID
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Result
   */
  static async deleteView(viewId, userId, firmId) {
    try {
      const view = await CaseNotionDatabaseView.findOne({ _id: viewId, firmId });
      if (!view) {
        throw new Error('View not found');
      }

      await view.deleteOne();

      return { success: true, message: 'View deleted successfully' };
    } catch (error) {
      logger.error('Error in deleteView:', error);
      throw error;
    }
  }

  /**
   * Execute view query and return transformed data
   * @param {string} viewId - View ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} View data
   */
  static async executeView(viewId, firmId) {
    try {
      const view = await CaseNotionDatabaseView.findOne({ _id: viewId, firmId });
      if (!view) {
        throw new Error('View not found');
      }

      let data = [];

      // Fetch data based on data source
      switch (view.dataSource.collection) {
        case 'tasks':
          data = await this._fetchTasksForView(view, firmId);
          break;
        case 'cases':
          data = await this._fetchCasesForView(view, firmId);
          break;
        case 'events':
          data = await this._fetchEventsForView(view, firmId);
          break;
        case 'reminders':
          data = await this._fetchRemindersForView(view, firmId);
          break;
        case 'documents':
          data = await this._fetchDocumentsForView(view, firmId);
          break;
        default:
          throw new Error(`Unsupported data source: ${view.dataSource.collection}`);
      }

      // Apply filters
      data = this._applyFilters(data, view.filters);

      // Apply sorting
      data = this._applySorting(data, view.sorting);

      // Apply grouping
      const groupedData = view.groupBy
        ? this._applyGrouping(data, view.groupBy)
        : { ungrouped: data };

      return {
        view,
        data: groupedData,
        totalCount: data.length
      };
    } catch (error) {
      logger.error('Error in executeView:', error);
      throw error;
    }
  }

  /**
   * Calculate rollup values
   * @param {string} viewId - View ID
   * @param {Object} rollupConfig - Rollup configuration
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Rollup results
   */
  static async calculateRollup(viewId, rollupConfig, firmId) {
    try {
      const view = await CaseNotionDatabaseView.findOne({ _id: viewId, firmId });
      if (!view) {
        throw new Error('View not found');
      }

      const { property, aggregation } = rollupConfig;
      const viewData = await this.executeView(viewId, view.firmId);
      const data = Object.values(viewData.data).flat();

      let result;
      switch (aggregation) {
        case 'count':
          result = data.length;
          break;
        case 'sum':
          result = data.reduce((sum, item) => sum + (parseFloat(item[property]) || 0), 0);
          break;
        case 'average':
          result = data.reduce((sum, item) => sum + (parseFloat(item[property]) || 0), 0) / data.length;
          break;
        case 'min':
          result = Math.min(...data.map(item => parseFloat(item[property]) || 0));
          break;
        case 'max':
          result = Math.max(...data.map(item => parseFloat(item[property]) || 0));
          break;
        default:
          throw new Error(`Unsupported aggregation: ${aggregation}`);
      }

      return { property, aggregation, result };
    } catch (error) {
      logger.error('Error in calculateRollup:', error);
      throw error;
    }
  }

  /**
   * Evaluate formula for a row
   * Uses safe math expression parser - NO eval/new Function
   * @param {string} formula - Formula string (e.g., "{{quantity}} * {{price}}")
   * @param {Object} rowData - Row data
   * @returns {*} Evaluated result
   */
  static evaluateFormula(formula, rowData) {
    try {
      // Replace field references with numeric values
      let evaluableFormula = formula;

      // Match {{fieldName}} patterns and replace with values
      const fieldMatches = formula.matchAll(/\{\{(\w+)\}\}/g);
      for (const match of fieldMatches) {
        const fieldName = match[1];
        // Prevent prototype pollution
        if (fieldName === '__proto__' || fieldName === 'constructor' || fieldName === 'prototype') {
          return null;
        }
        const value = Number(rowData[fieldName]) || 0;
        evaluableFormula = evaluableFormula.replace(match[0], String(value));
      }

      // Use safe math expression evaluator
      return this.safeMathEvaluate(evaluableFormula);
    } catch (error) {
      logger.error('Error in evaluateFormula:', error);
      return null;
    }
  }

  /**
   * Safe math expression evaluator using recursive descent parser
   * Supports: +, -, *, /, %, parentheses, numbers (including decimals and negatives)
   * NO dynamic code execution
   * @param {string} expr - Math expression string
   * @returns {number|null} Result or null on error
   */
  static safeMathEvaluate(expr) {
    // Remove all whitespace
    expr = expr.replace(/\s+/g, '');

    // Validate that expression only contains allowed characters
    if (!/^[\d+\-*/%().]+$/.test(expr)) {
      logger.warn('Invalid characters in math expression', { expr });
      return null;
    }

    let pos = 0;

    const parseNumber = () => {
      let numStr = '';
      // Handle negative numbers
      if (expr[pos] === '-') {
        numStr += '-';
        pos++;
      }
      // Parse digits and decimal point
      while (pos < expr.length && /[\d.]/.test(expr[pos])) {
        numStr += expr[pos];
        pos++;
      }
      if (numStr === '' || numStr === '-') {
        throw new Error('Expected number');
      }
      return parseFloat(numStr);
    };

    const parseFactor = () => {
      if (expr[pos] === '(') {
        pos++; // skip '('
        const result = parseExpression();
        if (expr[pos] === ')') {
          pos++; // skip ')'
        }
        return result;
      }
      return parseNumber();
    };

    const parseTerm = () => {
      let result = parseFactor();
      while (pos < expr.length && (expr[pos] === '*' || expr[pos] === '/' || expr[pos] === '%')) {
        const op = expr[pos];
        pos++;
        const right = parseFactor();
        if (op === '*') {
          result *= right;
        } else if (op === '/') {
          if (right === 0) {
            throw new Error('Division by zero');
          }
          result /= right;
        } else if (op === '%') {
          if (right === 0) {
            throw new Error('Modulo by zero');
          }
          result %= right;
        }
      }
      return result;
    };

    const parseExpression = () => {
      let result = parseTerm();
      while (pos < expr.length && (expr[pos] === '+' || expr[pos] === '-')) {
        const op = expr[pos];
        pos++;
        const right = parseTerm();
        if (op === '+') {
          result += right;
        } else {
          result -= right;
        }
      }
      return result;
    };

    try {
      const result = parseExpression();
      // Check for trailing characters (invalid expression)
      if (pos < expr.length) {
        logger.warn('Unexpected characters at end of expression', { expr, pos });
        return null;
      }
      return isNaN(result) ? null : result;
    } catch (error) {
      logger.warn('Error parsing math expression', { expr, error: error.message });
      return null;
    }
  }

  // ===================================================================
  // TEMPLATES
  // ===================================================================

  /**
   * Save page as template
   * @param {string} pageId - Page ID
   * @param {string} category - Template category
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Template page
   */
  static async createTemplate(pageId, category, userId, firmId) {
    try {
      const originalPage = await CaseNotionPage.findOne({ _id: pageId, firmId });
      if (!originalPage) {
        throw new Error('Page not found');
      }

      // Duplicate page as template
      const template = await this.duplicatePage(pageId, userId, firmId);
      template.isTemplate = true;
      template.metadata = {
        ...template.metadata,
        category,
        sourcePageId: pageId
      };
      await template.save();

      return template;
    } catch (error) {
      logger.error('Error in createTemplate:', error);
      throw error;
    }
  }

  /**
   * Get available templates
   * @param {string} firmId - Firm ID
   * @param {string} category - Optional category filter
   * @returns {Promise<Array>} Templates
   */
  static async getTemplates(firmId, category = null) {
    try {
      const query = { firmId, isTemplate: true };
      if (category) {
        query['metadata.category'] = category;
      }

      const templates = await CaseNotionPage.find(query)
        .sort({ title: 1 })
        .populate('createdBy', 'firstName lastName fullName');

      return templates;
    } catch (error) {
      logger.error('Error in getTemplates:', error);
      throw error;
    }
  }

  /**
   * Create page from template
   * @param {string} templateId - Template ID
   * @param {string} caseId - Target case ID
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Created page
   */
  static async createFromTemplate(templateId, caseId, userId, firmId) {
    try {
      const template = await CaseNotionPage.findOne({ _id: templateId, firmId });
      if (!template || !template.isTemplate) {
        throw new Error('Template not found');
      }

      // Duplicate template
      const newPage = await this.duplicatePage(templateId, userId, firmId);
      newPage.caseId = caseId;
      newPage.isTemplate = false;
      newPage.title = template.title.replace('(Copy)', '').trim();
      await newPage.save();

      return newPage;
    } catch (error) {
      logger.error('Error in createFromTemplate:', error);
      throw error;
    }
  }

  // ===================================================================
  // AI FEATURES
  // ===================================================================

  /**
   * AI autofill block content
   * @param {string} blockId - Block ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Result
   */
  static async aiAutofill(blockId, firmId) {
    try {
      const apiKey = await AISettingsService.getApiKey(firmId, 'anthropic');
      if (!apiKey) {
        throw new Error('Anthropic API key not configured for this firm');
      }

      const block = await CaseNotionBlock.findById(blockId).populate('pageId');
      if (!block) {
        throw new Error('Block not found');
      }

      // Verify block's page belongs to firm
      if (!block.pageId || block.pageId.firmId.toString() !== firmId) {
        throw new Error('Block not found or access denied');
      }

      // Get context from page and surrounding blocks
      const context = await this._getBlockContext(blockId);

      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Based on the following context, generate appropriate content for a ${block.type} block.

Context:
Page Title: ${block.pageId.title}
${context}

Generate concise, relevant content for this block type. Return only the content, no explanation.`
        }]
      });

      const generatedContent = response.content[0].text;

      // Update block
      block.content = {
        ...block.content,
        text: generatedContent
      };
      await block.save();

      // Track usage
      await AISettingsService.incrementUsage(firmId, 'anthropic',
        response.usage.input_tokens + response.usage.output_tokens);

      return {
        success: true,
        content: generatedContent,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens
      };
    } catch (error) {
      logger.error('Error in aiAutofill:', error);
      throw error;
    }
  }

  /**
   * AI summarize page
   * @param {string} pageId - Page ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Summary
   */
  static async aiSummarize(pageId, firmId) {
    try {
      const apiKey = await AISettingsService.getApiKey(firmId, 'anthropic');
      if (!apiKey) {
        throw new Error('Anthropic API key not configured for this firm');
      }

      const page = await this.getPage(pageId, null, firmId);
      const pageText = this._extractPageText(page.blocks);

      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `Summarize the following page content in a concise manner:

Title: ${page.title}

Content:
${pageText}

Provide a clear, structured summary with key points.`
        }]
      });

      const summary = response.content[0].text;

      // Track usage
      await AISettingsService.incrementUsage(firmId, 'anthropic',
        response.usage.input_tokens + response.usage.output_tokens);

      return {
        success: true,
        summary,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens
      };
    } catch (error) {
      logger.error('Error in aiSummarize:', error);
      throw error;
    }
  }

  /**
   * AI answer questions about case content
   * @param {string} question - Question
   * @param {string} caseId - Case ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Answer
   */
  static async aiAnswer(question, caseId, firmId) {
    try {
      const apiKey = await AISettingsService.getApiKey(firmId, 'anthropic');
      if (!apiKey) {
        throw new Error('Anthropic API key not configured for this firm');
      }

      // Get all pages for case
      const pages = await CaseNotionPage.find({ caseId, isArchived: false });
      const pageContents = await Promise.all(
        pages.slice(0, 5).map(async (page) => {
          const blocks = await this.getPageBlocks(page._id);
          const text = this._extractPageText(blocks);
          return `Page: ${page.title}\n${text}`;
        })
      );

      const context = pageContents.join('\n\n---\n\n');

      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `Based on the following case documentation, answer this question:

Question: ${question}

Case Documentation:
${context}

Provide a detailed, accurate answer based only on the provided documentation. If you cannot answer from the documentation, say so.`
        }]
      });

      const answer = response.content[0].text;

      // Track usage
      await AISettingsService.incrementUsage(firmId, 'anthropic',
        response.usage.input_tokens + response.usage.output_tokens);

      return {
        success: true,
        answer,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens
      };
    } catch (error) {
      logger.error('Error in aiAnswer:', error);
      throw error;
    }
  }

  /**
   * AI suggest content based on prompt
   * @param {string} pageId - Page ID
   * @param {string} prompt - User prompt
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Suggestions
   */
  static async aiSuggestContent(pageId, prompt, firmId) {
    try {
      const apiKey = await AISettingsService.getApiKey(firmId, 'anthropic');
      if (!apiKey) {
        throw new Error('Anthropic API key not configured for this firm');
      }

      const page = await this.getPage(pageId, null, firmId);
      const pageText = this._extractPageText(page.blocks);

      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3072,
        messages: [{
          role: 'user',
          content: `Current page content:

Title: ${page.title}
Content:
${pageText}

User request: ${prompt}

Generate content suggestions based on the user's request and the existing page content. Provide structured, actionable content.`
        }]
      });

      const suggestions = response.content[0].text;

      // Track usage
      await AISettingsService.incrementUsage(firmId, 'anthropic',
        response.usage.input_tokens + response.usage.output_tokens);

      return {
        success: true,
        suggestions,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens
      };
    } catch (error) {
      logger.error('Error in aiSuggestContent:', error);
      throw error;
    }
  }

  // ===================================================================
  // REAL-TIME COLLABORATION
  // ===================================================================

  /**
   * Lock block for editing
   * @param {string} blockId - Block ID
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Lock status
   */
  static async lockBlock(blockId, userId, firmId) {
    try {
      const block = await CaseNotionBlock.findById(blockId);
      if (!block) {
        throw new Error('Block not found');
      }

      // Verify block's page belongs to firm
      const page = await CaseNotionPage.findOne({ _id: block.pageId, firmId });
      if (!page) {
        throw new Error('Block not found or access denied');
      }

      // Check if already locked
      if (block.lock && block.lock.userId && block.lock.userId.toString() !== userId) {
        const lockAge = Date.now() - block.lock.lockedAt.getTime();
        // Auto-release locks older than 5 minutes
        if (lockAge < 5 * 60 * 1000) {
          return {
            success: false,
            locked: true,
            lockedBy: block.lock.userId,
            message: 'Block is currently being edited by another user'
          };
        }
      }

      // Acquire lock
      block.lock = {
        userId,
        lockedAt: new Date()
      };
      await block.save();

      return {
        success: true,
        locked: true,
        lockedBy: userId
      };
    } catch (error) {
      logger.error('Error in lockBlock:', error);
      throw error;
    }
  }

  /**
   * Unlock block
   * @param {string} blockId - Block ID
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Result
   */
  static async unlockBlock(blockId, userId, firmId) {
    try {
      const block = await CaseNotionBlock.findById(blockId);
      if (!block) {
        throw new Error('Block not found');
      }

      // Verify block's page belongs to firm
      const page = await CaseNotionPage.findOne({ _id: block.pageId, firmId });
      if (!page) {
        throw new Error('Block not found or access denied');
      }

      // Only owner can unlock
      if (block.lock && block.lock.userId && block.lock.userId.toString() !== userId) {
        return {
          success: false,
          message: 'You do not own this lock'
        };
      }

      block.lock = null;
      await block.save();

      return {
        success: true,
        message: 'Block unlocked'
      };
    } catch (error) {
      logger.error('Error in unlockBlock:', error);
      throw error;
    }
  }

  /**
   * Get active locks for a page
   * @param {string} pageId - Page ID
   * @returns {Promise<Array>} Active locks
   */
  static async getActiveLocks(pageId) {
    try {
      const blocks = await CaseNotionBlock.find({
        pageId,
        'lock.userId': { $exists: true }
      })
        .populate('lock.userId', 'firstName lastName fullName')
        .select('_id type lock');

      // Filter out expired locks
      const now = Date.now();
      const activeLocks = blocks
        .filter(block => {
          const lockAge = now - block.lock.lockedAt.getTime();
          return lockAge < 5 * 60 * 1000; // 5 minutes
        })
        .map(block => ({
          blockId: block._id,
          type: block.type,
          lockedBy: block.lock.userId,
          lockedAt: block.lock.lockedAt
        }));

      return activeLocks;
    } catch (error) {
      logger.error('Error in getActiveLocks:', error);
      throw error;
    }
  }

  /**
   * Record cursor position
   * @param {string} pageId - Page ID
   * @param {string} userId - User ID
   * @param {Object} position - Cursor position
   * @returns {Promise<Object>} Result
   */
  static async recordCursor(pageId, userId, position) {
    try {
      // In a production system, this would use Redis or similar
      // For now, we'll just return success
      // The actual cursor tracking would be handled by the collaboration service
      return {
        success: true,
        pageId,
        userId,
        position
      };
    } catch (error) {
      logger.error('Error in recordCursor:', error);
      throw error;
    }
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  /**
   * Export page as markdown/html/pdf
   * @param {string} pageId - Page ID
   * @param {string} format - Export format
   * @param {string} firmId - Firm ID
   * @returns {Promise<string>} Exported content
   */
  static async exportPage(pageId, format, firmId) {
    try {
      const page = await this.getPage(pageId, null, firmId);

      switch (format) {
        case 'markdown':
          return this._exportAsMarkdown(page);
        case 'html':
          return this._exportAsHTML(page);
        case 'pdf':
          throw new Error('PDF export not yet implemented');
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      logger.error('Error in exportPage:', error);
      throw error;
    }
  }

  /**
   * Import markdown to create page
   * @param {string} caseId - Case ID
   * @param {string} markdown - Markdown content
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Created page
   */
  static async importMarkdown(caseId, markdown, userId, firmId) {
    try {
      // Parse markdown and extract title
      const lines = markdown.split('\n');
      const titleMatch = lines[0].match(/^#\s+(.+)$/);
      const title = titleMatch ? titleMatch[1] : 'Imported Page';

      // Verify case exists and belongs to firm
      const caseExists = await Case.findOne({ _id: caseId, firmId });
      if (!caseExists) {
        throw new Error('Case not found');
      }

      // Create page
      const page = await this.createPage(caseId, { title }, userId, firmId);

      // Parse markdown blocks
      let currentContent = [];
      let currentType = 'paragraph';

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('## ')) {
          // Heading 2
          if (currentContent.length > 0) {
            await this.createBlock(page._id, {
              type: currentType,
              content: { text: currentContent.join('\n') }
            }, userId, firmId);
            currentContent = [];
          }
          currentType = 'heading_2';
          currentContent.push(line.substring(3));
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          // List item
          currentType = 'bulleted_list';
          currentContent.push(line.substring(2));
        } else if (line.trim() === '') {
          // Empty line - end current block
          if (currentContent.length > 0) {
            await this.createBlock(page._id, {
              type: currentType,
              content: { text: currentContent.join('\n') }
            }, userId, firmId);
            currentContent = [];
            currentType = 'paragraph';
          }
        } else {
          currentContent.push(line);
        }
      }

      // Add last block
      if (currentContent.length > 0) {
        await this.createBlock(page._id, {
          type: currentType,
          content: { text: currentContent.join('\n') }
        }, userId, firmId);
      }

      return page;
    } catch (error) {
      logger.error('Error in importMarkdown:', error);
      throw error;
    }
  }

  /**
   * Get pages that link to this page (backlinks)
   * @param {string} pageId - Page ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Array>} Pages with backlinks
   */
  static async getBacklinks(pageId, firmId) {
    try {
      const page = await CaseNotionPage.findOne({ _id: pageId, firmId });
      if (!page) {
        throw new Error('Page not found');
      }

      // Find blocks containing links to this page
      const blocks = await CaseNotionBlock.find({
        'content.text': { $regex: `\\[\\[${escapeRegex(page.title)}\\]\\]`, $options: 'i' },
        isDeleted: false
      }).populate('pageId', 'title caseId');

      // Get unique pages
      const uniquePages = [...new Map(
        blocks.map(block => [block.pageId._id.toString(), block.pageId])
      ).values()];

      return uniquePages;
    } catch (error) {
      logger.error('Error in getBacklinks:', error);
      throw error;
    }
  }

  /**
   * Update backlinks for a page
   * @param {string} pageId - Page ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} Result
   */
  static async updateBacklinks(pageId, firmId) {
    try {
      const page = await CaseNotionPage.findOne({ _id: pageId, firmId });
      if (!page) {
        throw new Error('Page not found');
      }

      const backlinks = await this.getBacklinks(pageId, firmId);

      page.backlinks = backlinks.map(p => p._id);
      await page.save();

      return {
        success: true,
        backlinkCount: backlinks.length
      };
    } catch (error) {
      logger.error('Error in updateBacklinks:', error);
      throw error;
    }
  }

  // ===================================================================
  // HELPER METHODS
  // ===================================================================

  /**
   * Build block tree from flat blocks
   * @private
   */
  static _buildBlockTree(blocks) {
    const blockMap = new Map();
    const rootBlocks = [];

    // Create map
    blocks.forEach(block => {
      blockMap.set(block._id.toString(), { ...block.toObject(), children: [] });
    });

    // Build tree
    blocks.forEach(block => {
      const blockObj = blockMap.get(block._id.toString());
      if (block.parentBlockId) {
        const parent = blockMap.get(block.parentBlockId.toString());
        if (parent) {
          parent.children.push(blockObj);
        } else {
          rootBlocks.push(blockObj);
        }
      } else {
        rootBlocks.push(blockObj);
      }
    });

    return rootBlocks;
  }

  /**
   * Flatten block tree to array
   * @private
   */
  static _flattenBlockTree(tree) {
    const result = [];

    const traverse = (blocks) => {
      for (const block of blocks) {
        const { children, ...blockData } = block;
        result.push(blockData);
        if (children && children.length > 0) {
          traverse(children);
        }
      }
    };

    traverse(tree);
    return result;
  }

  /**
   * Generate fractional order between two orders
   * @private
   */
  static _generateOrder(prevOrder, nextOrder) {
    if (nextOrder === undefined || nextOrder === null) {
      return prevOrder + 1000;
    }
    return (prevOrder + nextOrder) / 2;
  }

  /**
   * Parse wiki-style links [[Page Title]]
   * @private
   */
  static _parseWikiLinks(content) {
    const links = [];
    const regex = /\[\[([^\]]+)\]\]/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      links.push(match[1]);
    }

    return links;
  }

  /**
   * Resolve database relations
   * @private
   */
  static async _resolveRelations(data, relations) {
    if (!relations || relations.length === 0) {
      return data;
    }

    for (const relation of relations) {
      const { field, collection } = relation;

      // Get unique IDs to resolve
      const ids = [...new Set(data.map(item => item[field]).filter(Boolean))];

      // Fetch related documents
      let Model;
      switch (collection) {
        case 'tasks':
          Model = Task;
          break;
        case 'cases':
          Model = Case;
          break;
        case 'documents':
          Model = Document;
          break;
        default:
          continue;
      }

      const relatedDocs = await Model.find({ _id: { $in: ids } });
      const relatedMap = new Map(relatedDocs.map(doc => [doc._id.toString(), doc]));

      // Replace IDs with documents
      data.forEach(item => {
        if (item[field]) {
          item[field] = relatedMap.get(item[field].toString());
        }
      });
    }

    return data;
  }

  /**
   * Build page tree
   * @private
   */
  static _buildPageTree(pages) {
    const pageMap = new Map();
    const rootPages = [];

    pages.forEach(page => {
      pageMap.set(page._id.toString(), { ...page.toObject(), children: [] });
    });

    pages.forEach(page => {
      const pageObj = pageMap.get(page._id.toString());
      if (page.parentPageId) {
        const parent = pageMap.get(page.parentPageId.toString());
        if (parent) {
          parent.children.push(pageObj);
        } else {
          rootPages.push(pageObj);
        }
      } else {
        rootPages.push(pageObj);
      }
    });

    return rootPages;
  }

  /**
   * Archive page recursively
   * @private
   */
  static async _archivePageRecursive(pageId, userId, firmId) {
    const page = await CaseNotionPage.findOne({ _id: pageId, firmId });
    if (!page) return;

    page.isArchived = true;
    page.lastEditedBy = userId;
    page.lastEditedAt = new Date();
    await page.save();

    // Archive child pages
    const childPages = await CaseNotionPage.find({ parentPageId: pageId, firmId });
    for (const child of childPages) {
      await this._archivePageRecursive(child._id, userId, firmId);
    }
  }

  /**
   * Delete block recursively
   * @private
   */
  static async _deleteBlockRecursive(blockId) {
    const block = await CaseNotionBlock.findById(blockId);
    block.isDeleted = true;
    await block.save();

    // Delete child blocks
    const childBlocks = await CaseNotionBlock.find({ parentBlockId: blockId });
    for (const child of childBlocks) {
      await this._deleteBlockRecursive(child._id);
    }
  }

  /**
   * Get descendant blocks
   * @private
   */
  static async _getDescendantBlocks(blockId) {
    const descendants = [];
    const children = await CaseNotionBlock.find({ parentBlockId: blockId });

    for (const child of children) {
      descendants.push(child);
      const grandchildren = await this._getDescendantBlocks(child._id);
      descendants.push(...grandchildren);
    }

    return descendants;
  }

  /**
   * Check if page is descendant of another
   * @private
   */
  static async _isDescendant(pageId, potentialAncestorId, firmId) {
    let currentPage = await CaseNotionPage.findOne({ _id: pageId, firmId });

    while (currentPage && currentPage.parentPageId) {
      if (currentPage.parentPageId.toString() === potentialAncestorId) {
        return true;
      }
      currentPage = await CaseNotionPage.findOne({ _id: currentPage.parentPageId, firmId });
    }

    return false;
  }

  /**
   * Check if block is descendant of another
   * @private
   */
  static async _isBlockDescendant(blockId, potentialAncestorId) {
    let currentBlock = await CaseNotionBlock.findById(blockId);

    while (currentBlock && currentBlock.parentBlockId) {
      if (currentBlock.parentBlockId.toString() === potentialAncestorId) {
        return true;
      }
      currentBlock = await CaseNotionBlock.findById(currentBlock.parentBlockId);
    }

    return false;
  }

  /**
   * Check if user has view permission
   * @private
   */
  static _hasViewPermission(page, userId) {
    if (page.permissions.isPublic) return true;
    if (page.permissions.canView.includes(userId)) return true;
    if (page.permissions.canEdit.includes(userId)) return true;
    return false;
  }

  /**
   * Check if user has edit permission
   * @private
   */
  static _hasEditPermission(page, userId) {
    if (page.permissions.canEdit.includes(userId)) return true;
    return false;
  }

  /**
   * Get block context for AI
   * @private
   */
  static async _getBlockContext(blockId) {
    const block = await CaseNotionBlock.findById(blockId);
    const siblingBlocks = await CaseNotionBlock.find({
      pageId: block.pageId,
      parentBlockId: block.parentBlockId,
      isDeleted: false
    }).sort({ order: 1 }).limit(5);

    return siblingBlocks
      .map(b => b.content?.text || '')
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Extract text from page blocks
   * @private
   */
  static _extractPageText(blocks) {
    const traverse = (blocks) => {
      let text = '';
      for (const block of blocks) {
        text += block.content?.text || '';
        text += '\n';
        if (block.children && block.children.length > 0) {
          text += traverse(block.children);
        }
      }
      return text;
    };

    return traverse(blocks);
  }

  /**
   * Export page as markdown
   * @private
   */
  static _exportAsMarkdown(page) {
    let markdown = `# ${page.title}\n\n`;

    const traverse = (blocks, level = 0) => {
      for (const block of blocks) {
        const indent = '  '.repeat(level);

        switch (block.type) {
          case 'heading_1':
            markdown += `# ${block.content.text}\n\n`;
            break;
          case 'heading_2':
            markdown += `## ${block.content.text}\n\n`;
            break;
          case 'heading_3':
            markdown += `### ${block.content.text}\n\n`;
            break;
          case 'bulleted_list':
            markdown += `${indent}- ${block.content.text}\n`;
            break;
          case 'numbered_list':
            markdown += `${indent}1. ${block.content.text}\n`;
            break;
          case 'code':
            markdown += `\`\`\`${block.properties?.language || ''}\n${block.content.text}\n\`\`\`\n\n`;
            break;
          default:
            markdown += `${block.content.text}\n\n`;
        }

        if (block.children && block.children.length > 0) {
          traverse(block.children, level + 1);
        }
      }
    };

    traverse(page.blocks);
    return markdown;
  }

  /**
   * Export page as HTML
   * @private
   */
  static _exportAsHTML(page) {
    let html = `<!DOCTYPE html>\n<html>\n<head>\n<title>${page.title}</title>\n</head>\n<body>\n`;
    html += `<h1>${page.title}</h1>\n`;

    const traverse = (blocks) => {
      for (const block of blocks) {
        switch (block.type) {
          case 'heading_1':
            html += `<h1>${block.content.text}</h1>\n`;
            break;
          case 'heading_2':
            html += `<h2>${block.content.text}</h2>\n`;
            break;
          case 'heading_3':
            html += `<h3>${block.content.text}</h3>\n`;
            break;
          case 'paragraph':
            html += `<p>${block.content.text}</p>\n`;
            break;
          case 'bulleted_list':
            html += `<ul><li>${block.content.text}</li></ul>\n`;
            break;
          case 'numbered_list':
            html += `<ol><li>${block.content.text}</li></ol>\n`;
            break;
          case 'code':
            html += `<pre><code>${block.content.text}</code></pre>\n`;
            break;
          default:
            html += `<div>${block.content.text}</div>\n`;
        }

        if (block.children && block.children.length > 0) {
          html += '<div style="margin-left: 20px;">\n';
          traverse(block.children);
          html += '</div>\n';
        }
      }
    };

    traverse(page.blocks);
    html += `</body>\n</html>`;
    return html;
  }

  /**
   * Fetch tasks for view
   * @private
   */
  static async _fetchTasksForView(view, firmId) {
    const query = { firmId };
    if (view.dataSource.filters) {
      Object.assign(query, view.dataSource.filters);
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'firstName lastName fullName')
      .populate('caseId', 'title caseNumber');

    return tasks;
  }

  /**
   * Fetch cases for view
   * @private
   */
  static async _fetchCasesForView(view, firmId) {
    const query = { firmId };
    if (view.dataSource.filters) {
      Object.assign(query, view.dataSource.filters);
    }

    const cases = await Case.find(query)
      .populate('client', 'firstName lastName fullName')
      .populate('assignedTo', 'firstName lastName fullName');

    return cases;
  }

  /**
   * Fetch events for view
   * @private
   */
  static async _fetchEventsForView(view, firmId) {
    const query = { firmId };
    if (view.dataSource.filters) {
      Object.assign(query, view.dataSource.filters);
    }

    const events = await Event.find(query)
      .populate('attendees', 'firstName lastName fullName')
      .populate('caseId', 'title caseNumber');

    return events;
  }

  /**
   * Fetch reminders for view
   * @private
   */
  static async _fetchRemindersForView(view, firmId) {
    const query = { firmId };
    if (view.dataSource.filters) {
      Object.assign(query, view.dataSource.filters);
    }

    const reminders = await Reminder.find(query)
      .populate('userId', 'firstName lastName fullName')
      .populate('caseId', 'title caseNumber');

    return reminders;
  }

  /**
   * Fetch documents for view
   * @private
   */
  static async _fetchDocumentsForView(view, firmId) {
    const query = { firmId };
    if (view.dataSource.filters) {
      Object.assign(query, view.dataSource.filters);
    }

    const documents = await Document.find(query)
      .populate('uploadedBy', 'firstName lastName fullName')
      .populate('caseId', 'title caseNumber');

    return documents;
  }

  /**
   * Apply filters to data
   * @private
   */
  static _applyFilters(data, filters) {
    if (!filters || filters.length === 0) return data;

    return data.filter(item => {
      return filters.every(filter => {
        const value = item[filter.property];

        switch (filter.operator) {
          case 'equals':
            return value === filter.value;
          case 'notEquals':
            return value !== filter.value;
          case 'contains':
            return String(value).includes(filter.value);
          case 'notContains':
            return !String(value).includes(filter.value);
          case 'greaterThan':
            return value > filter.value;
          case 'lessThan':
            return value < filter.value;
          case 'isEmpty':
            return !value;
          case 'isNotEmpty':
            return !!value;
          default:
            return true;
        }
      });
    });
  }

  /**
   * Apply sorting to data
   * @private
   */
  static _applySorting(data, sorting) {
    if (!sorting || sorting.length === 0) return data;

    return [...data].sort((a, b) => {
      for (const sort of sorting) {
        const aVal = a[sort.property];
        const bVal = b[sort.property];

        if (aVal === bVal) continue;

        const comparison = aVal < bVal ? -1 : 1;
        return sort.direction === 'ascending' ? comparison : -comparison;
      }
      return 0;
    });
  }

  /**
   * Apply grouping to data
   * @private
   */
  static _applyGrouping(data, groupBy) {
    const grouped = {};

    data.forEach(item => {
      const groupValue = item[groupBy] || 'Ungrouped';
      if (!grouped[groupValue]) {
        grouped[groupValue] = [];
      }
      grouped[groupValue].push(item);
    });

    return grouped;
  }
}

module.exports = CaseNotionService;
