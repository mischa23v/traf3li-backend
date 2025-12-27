/**
 * Deal Room Service - Collaboration on Deals
 *
 * This service provides a high-level API for managing deal rooms,
 * which are collaborative workspaces for deal management with:
 * - Notion-like pages with block-based content
 * - Document storage with view tracking
 * - External access for clients/partners
 * - Complete audit trail
 *
 * Features:
 * - Create and manage deal rooms
 * - Add/update/delete pages
 * - Upload and track documents
 * - Grant secure external access
 * - Activity feed tracking
 */

const mongoose = require('mongoose');
const DealRoom = require('../models/dealRoom.model');
const Lead = require('../models/lead.model');
const logger = require('../utils/logger');

class DealRoomService {
  /**
   * Create deal room for a deal
   * @param {String} dealId - Deal/Lead ID
   * @param {String} name - Deal room name
   * @param {String} userId - User creating the deal room
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Created deal room or null
   */
  async createDealRoom(dealId, name, userId, firmId) {
    try {
      // Verify deal exists and belongs to firm
      const deal = await Lead.findOne({ _id: dealId, firmId }).lean();
      if (!deal) {
        logger.error('DealRoomService.createDealRoom: Deal not found', { dealId });
        return null;
      }

      // Check if deal room already exists
      const existingRoom = await DealRoom.findOne({
        dealId: new mongoose.Types.ObjectId(dealId),
        firmId: new mongoose.Types.ObjectId(firmId)
      });

      if (existingRoom) {
        logger.warn('DealRoomService.createDealRoom: Deal room already exists', { dealId });
        return existingRoom;
      }

      // Create deal room
      const dealRoom = await DealRoom.create({
        dealId: new mongoose.Types.ObjectId(dealId),
        name,
        firmId: new mongoose.Types.ObjectId(firmId),
        createdBy: new mongoose.Types.ObjectId(userId),
        lastModifiedBy: new mongoose.Types.ObjectId(userId),
        pages: [],
        documents: [],
        externalAccess: [],
        activity: [{
          type: 'created',
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: new Date(),
          details: { name }
        }]
      });

      logger.info('DealRoomService.createDealRoom: Deal room created', {
        dealRoomId: dealRoom._id,
        dealId
      });

      return dealRoom;
    } catch (error) {
      logger.error('DealRoomService.createDealRoom failed:', error.message);
      return null;
    }
  }

  /**
   * Get deal room by deal ID
   * @param {String} dealId - Deal/Lead ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Deal room or null
   */
  async getDealRoomByDeal(dealId, firmId) {
    try {
      // Try to find existing deal room
      let dealRoom = await DealRoom.getByDealId(dealId, firmId);

      // If not found, create one
      if (!dealRoom) {
        const deal = await Lead.findOne({ _id: dealId, firmId }).lean();
        if (!deal) {
          logger.error('DealRoomService.getDealRoomByDeal: Deal not found', { dealId });
          return null;
        }

        // Create default deal room name
        const name = deal.companyName
          ? `${deal.companyName} - Deal Room`
          : `${deal.firstName || ''} ${deal.lastName || ''} - Deal Room`.trim();

        // Create the deal room (use system user or first available user)
        dealRoom = await this.createDealRoom(
          dealId,
          name,
          deal.assignedTo || deal.createdBy,
          firmId
        );
      }

      return dealRoom;
    } catch (error) {
      logger.error('DealRoomService.getDealRoomByDeal failed:', error.message);
      return null;
    }
  }

  /**
   * Add page to deal room
   * @param {String} dealRoomId - Deal room ID
   * @param {String} title - Page title
   * @param {Object} content - Page content (block-based)
   * @param {String} userId - User creating the page
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Created page or null
   */
  async addPage(dealRoomId, title, content, userId, firmId) {
    try {
      const dealRoom = await DealRoom.findOne({ _id: dealRoomId, firmId });
      if (!dealRoom) {
        logger.error('DealRoomService.addPage: Deal room not found', { dealRoomId });
        return null;
      }

      // Use model's instance method to add page
      const page = await dealRoom.addPage(title, content, new mongoose.Types.ObjectId(userId));

      logger.info('DealRoomService.addPage: Page added', {
        dealRoomId,
        pageId: page.id,
        title
      });

      return dealRoom;
    } catch (error) {
      logger.error('DealRoomService.addPage failed:', error.message);
      return null;
    }
  }

  /**
   * Update page
   * @param {String} dealRoomId - Deal room ID
   * @param {String} pageId - Page ID
   * @param {Object} updates - Updates to apply (title and/or content)
   * @param {String} userId - User updating the page
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Updated deal room or null
   */
  async updatePage(dealRoomId, pageId, updates, userId, firmId) {
    try {
      const dealRoom = await DealRoom.findOne({ _id: dealRoomId, firmId });
      if (!dealRoom) {
        logger.error('DealRoomService.updatePage: Deal room not found', { dealRoomId });
        return null;
      }

      // Use model's instance method to update page
      await dealRoom.updatePage(pageId, updates, new mongoose.Types.ObjectId(userId));

      logger.info('DealRoomService.updatePage: Page updated', {
        dealRoomId,
        pageId,
        updates: Object.keys(updates)
      });

      return dealRoom;
    } catch (error) {
      logger.error('DealRoomService.updatePage failed:', error.message);
      return null;
    }
  }

  /**
   * Delete page
   * @param {String} dealRoomId - Deal room ID
   * @param {String} pageId - Page ID
   * @param {String} userId - User deleting the page
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Updated deal room or null
   */
  async deletePage(dealRoomId, pageId, userId, firmId) {
    try {
      const dealRoom = await DealRoom.findOne({ _id: dealRoomId, firmId });
      if (!dealRoom) {
        logger.error('DealRoomService.deletePage: Deal room not found', { dealRoomId });
        return null;
      }

      // Find and remove the page
      const pageIndex = dealRoom.pages.findIndex(p => p.id === pageId);
      if (pageIndex === -1) {
        logger.error('DealRoomService.deletePage: Page not found', { dealRoomId, pageId });
        return null;
      }

      const page = dealRoom.pages[pageIndex];
      dealRoom.pages.splice(pageIndex, 1);

      // Log activity
      dealRoom.activity.push({
        type: 'page_deleted',
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: new Date(),
        details: {
          pageId,
          pageTitle: page.title
        }
      });

      dealRoom.lastModifiedBy = new mongoose.Types.ObjectId(userId);
      await dealRoom.save();

      logger.info('DealRoomService.deletePage: Page deleted', {
        dealRoomId,
        pageId
      });

      return dealRoom;
    } catch (error) {
      logger.error('DealRoomService.deletePage failed:', error.message);
      return null;
    }
  }

  /**
   * Upload document
   * @param {String} dealRoomId - Deal room ID
   * @param {Object} documentData - Document data (name, url, type, size)
   * @param {String} userId - User uploading the document
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Updated deal room or null
   */
  async uploadDocument(dealRoomId, documentData, userId, firmId) {
    try {
      const dealRoom = await DealRoom.findOne({ _id: dealRoomId, firmId });
      if (!dealRoom) {
        logger.error('DealRoomService.uploadDocument: Deal room not found', { dealRoomId });
        return null;
      }

      // Use model's instance method to upload document
      await dealRoom.uploadDocument(documentData, new mongoose.Types.ObjectId(userId));

      logger.info('DealRoomService.uploadDocument: Document uploaded', {
        dealRoomId,
        documentName: documentData.name
      });

      return dealRoom;
    } catch (error) {
      logger.error('DealRoomService.uploadDocument failed:', error.message);
      return null;
    }
  }

  /**
   * Track document view
   * @param {String} dealRoomId - Deal room ID
   * @param {Number} documentIndex - Index of document in documents array
   * @param {String} userId - User viewing the document
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Updated deal room or null
   */
  async trackDocumentView(dealRoomId, documentIndex, userId, firmId) {
    try {
      const dealRoom = await DealRoom.findOne({ _id: dealRoomId, firmId });
      if (!dealRoom) {
        logger.error('DealRoomService.trackDocumentView: Deal room not found', { dealRoomId });
        return null;
      }

      // Use model's instance method to track view
      await dealRoom.trackDocumentView(documentIndex, new mongoose.Types.ObjectId(userId));

      logger.info('DealRoomService.trackDocumentView: Document view tracked', {
        dealRoomId,
        documentIndex,
        userId
      });

      return dealRoom;
    } catch (error) {
      logger.error('DealRoomService.trackDocumentView failed:', error.message);
      return null;
    }
  }

  /**
   * Grant external access
   * @param {String} dealRoomId - Deal room ID
   * @param {Object} accessData - Access data (email, name, company, permissions, expiresAt)
   * @param {String} userId - User granting access
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - { dealRoom, accessToken, accessUrl } or null
   */
  async grantExternalAccess(dealRoomId, accessData, userId, firmId) {
    try {
      const dealRoom = await DealRoom.findOne({ _id: dealRoomId, firmId });
      if (!dealRoom) {
        logger.error('DealRoomService.grantExternalAccess: Deal room not found', { dealRoomId });
        return null;
      }

      // Use model's instance method to grant access
      const result = await dealRoom.grantExternalAccess(
        accessData,
        new mongoose.Types.ObjectId(userId)
      );

      logger.info('DealRoomService.grantExternalAccess: Access granted', {
        dealRoomId,
        email: accessData.email,
        permissions: accessData.permissions
      });

      return {
        dealRoom,
        accessToken: result.accessToken,
        accessUrl: result.accessUrl
      };
    } catch (error) {
      logger.error('DealRoomService.grantExternalAccess failed:', error.message);
      return null;
    }
  }

  /**
   * Verify external access token
   * @param {String} accessToken - Access token to verify
   * @returns {Promise<Object|null>} - { valid, dealRoom, permissions } or null
   */
  async verifyExternalAccess(accessToken) {
    try {
      const result = await DealRoom.verifyAccessToken(accessToken);

      if (!result) {
        logger.warn('DealRoomService.verifyExternalAccess: Invalid or expired token', {
          accessToken: accessToken.substring(0, 8) + '...'
        });
        return {
          valid: false,
          dealRoom: null,
          permissions: []
        };
      }

      const { dealRoom, access } = result;

      // Update last accessed time
      await dealRoom.updateExternalAccess(accessToken);

      logger.info('DealRoomService.verifyExternalAccess: Access verified', {
        dealRoomId: dealRoom._id,
        email: access.email
      });

      return {
        valid: true,
        dealRoom,
        permissions: access.permissions || ['view']
      };
    } catch (error) {
      logger.error('DealRoomService.verifyExternalAccess failed:', error.message);
      return {
        valid: false,
        dealRoom: null,
        permissions: []
      };
    }
  }

  /**
   * Revoke external access
   * @param {String} dealRoomId - Deal room ID
   * @param {String} accessToken - Access token to revoke
   * @param {String} userId - User revoking access
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Updated deal room or null
   */
  async revokeExternalAccess(dealRoomId, accessToken, userId, firmId) {
    try {
      const dealRoom = await DealRoom.findOne({ _id: dealRoomId, firmId });
      if (!dealRoom) {
        logger.error('DealRoomService.revokeExternalAccess: Deal room not found', { dealRoomId });
        return null;
      }

      // Use model's instance method to revoke access
      await dealRoom.revokeExternalAccess(accessToken, new mongoose.Types.ObjectId(userId));

      logger.info('DealRoomService.revokeExternalAccess: Access revoked', {
        dealRoomId,
        accessToken: accessToken.substring(0, 8) + '...'
      });

      return dealRoom;
    } catch (error) {
      logger.error('DealRoomService.revokeExternalAccess failed:', error.message);
      return null;
    }
  }

  /**
   * Get activity feed
   * @param {String} dealRoomId - Deal room ID
   * @param {String} firmId - Firm ID
   * @param {Number} limit - Number of activities to return (default 50)
   * @returns {Promise<Array>} - Activity array sorted by timestamp desc
   */
  async getActivityFeed(dealRoomId, firmId, limit = 50) {
    try {
      const dealRoom = await DealRoom.findOne({ _id: dealRoomId, firmId })
        .populate('activity.userId', 'firstName lastName avatar')
        .lean();

      if (!dealRoom) {
        logger.error('DealRoomService.getActivityFeed: Deal room not found', { dealRoomId });
        return [];
      }

      // Sort by timestamp descending and limit
      const activities = (dealRoom.activity || [])
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

      return activities;
    } catch (error) {
      logger.error('DealRoomService.getActivityFeed failed:', error.message);
      return [];
    }
  }

  /**
   * Get external viewers
   * @param {String} dealRoomId - Deal room ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Array>} - External access with last access info
   */
  async getExternalViewers(dealRoomId, firmId) {
    try {
      const dealRoom = await DealRoom.findOne({ _id: dealRoomId, firmId }).lean();

      if (!dealRoom) {
        logger.error('DealRoomService.getExternalViewers: Deal room not found', { dealRoomId });
        return [];
      }

      // Return external access information (without sensitive tokens in full)
      const viewers = (dealRoom.externalAccess || []).map(access => ({
        email: access.email,
        name: access.name,
        company: access.company,
        permissions: access.permissions,
        expiresAt: access.expiresAt,
        lastAccessedAt: access.lastAccessedAt,
        isExpired: access.expiresAt < new Date(),
        accessToken: access.accessToken.substring(0, 8) + '...' // Partial token for identification
      }));

      return viewers;
    } catch (error) {
      logger.error('DealRoomService.getExternalViewers failed:', error.message);
      return [];
    }
  }
}

// Export singleton instance
module.exports = new DealRoomService();
