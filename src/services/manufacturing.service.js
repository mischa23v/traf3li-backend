const mongoose = require('mongoose');
const BOM = require('../models/bom.model');
const Workstation = require('../models/workstation.model');
const WorkOrder = require('../models/workOrder.model');
const JobCard = require('../models/jobCard.model');
const ManufacturingSettings = require('../models/manufacturingSettings.model');
const logger = require('../utils/logger');

/**
 * Manufacturing Service
 * Handles all manufacturing-related business logic including BOMs, Workstations,
 * Work Orders, and Job Cards.
 */
class ManufacturingService {
  // ═══════════════════════════════════════════════════════════════
  // BOMs (Bill of Materials)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get BOMs with filters and pagination
   * @param {Object} query - Query filters (itemId, isActive, isDefault, search)
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - BOMs with pagination info
   */
  async getBOMs(query = {}, firmId) {
    try {
      const {
        itemId,
        isActive,
        isDefault,
        search,
        page = 1,
        limit = 50
      } = query;

      // Build filter
      const filter = { firmId };

      if (itemId) {
        filter.itemId = itemId;
      }

      if (isActive !== undefined) {
        filter.isActive = isActive === 'true' || isActive === true;
      }

      if (isDefault !== undefined) {
        filter.isDefault = isDefault === 'true' || isDefault === true;
      }

      if (search) {
        filter.$or = [
          { bomId: { $regex: search, $options: 'i' } },
          { bomNumber: { $regex: search, $options: 'i' } },
          { itemName: { $regex: search, $options: 'i' } },
          { itemCode: { $regex: search, $options: 'i' } }
        ];
      }

      // Pagination
      const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
      const sanitizedPage = Math.max(parseInt(page) || 1, 1);
      const skip = (sanitizedPage - 1) * sanitizedLimit;

      // Execute queries in parallel
      const [boms, total] = await Promise.all([
        BOM.find(filter)
          .populate('itemId', 'itemCode itemName uom')
          .populate('items.itemId', 'itemCode itemName')
          .populate('operations.workstation', 'name nameAr workstationId')
          .populate('createdBy', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
          .populate('updatedBy', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(sanitizedLimit)
          .lean(),
        BOM.countDocuments(filter)
      ]);

      return {
        boms,
        pagination: {
          total,
          page: sanitizedPage,
          limit: sanitizedLimit,
          pages: Math.ceil(total / sanitizedLimit)
        }
      };
    } catch (error) {
      logger.error('ManufacturingService.getBOMs failed:', error.message);
      throw error;
    }
  }

  /**
   * Get BOM by ID
   * @param {String} id - BOM ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - BOM or null
   */
  async getBOMById(id, firmId) {
    try {
      const bom = await BOM.findOne({ _id: id, firmId })
        .populate('itemId', 'itemCode itemName uom')
        .populate('items.itemId', 'itemCode itemName uom')
        .populate('operations.workstation', 'name nameAr workstationId')
        .populate('createdBy', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
        .populate('updatedBy', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
        .lean();

      return bom;
    } catch (error) {
      logger.error('ManufacturingService.getBOMById failed:', error.message);
      return null;
    }
  }

  /**
   * Create BOM
   * @param {Object} data - BOM data
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Created BOM or null
   */
  async createBOM(data, firmId, userId) {
    try {
      const bomData = {
        ...data,
        firmId,
        createdBy: userId
      };

      const bom = await BOM.create(bomData);

      // Populate before returning
      return await BOM.findById(bom._id)
        .populate('itemId', 'itemCode itemName uom')
        .populate('items.itemId', 'itemCode itemName')
        .populate('operations.workstation', 'name nameAr')
        .lean();
    } catch (error) {
      logger.error('ManufacturingService.createBOM failed:', error.message);
      return null;
    }
  }

  /**
   * Update BOM
   * @param {String} id - BOM ID
   * @param {Object} data - Update data
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Updated BOM or null
   */
  async updateBOM(id, data, firmId, userId) {
    try {
      const bom = await BOM.findOne({ _id: id, firmId });
      if (!bom) {
        logger.error('ManufacturingService.updateBOM: BOM not found');
        return null;
      }

      Object.assign(bom, data);
      bom.updatedBy = userId;
      await bom.save();

      // Populate before returning
      return await BOM.findById(bom._id)
        .populate('itemId', 'itemCode itemName uom')
        .populate('items.itemId', 'itemCode itemName')
        .populate('operations.workstation', 'name nameAr')
        .lean();
    } catch (error) {
      logger.error('ManufacturingService.updateBOM failed:', error.message);
      return null;
    }
  }

  /**
   * Delete BOM
   * @param {String} id - BOM ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Boolean>} - Success status
   */
  async deleteBOM(id, firmId) {
    try {
      // Check if BOM is used in any work orders
      const workOrderCount = await WorkOrder.countDocuments({ bomId: id, firmId });
      if (workOrderCount > 0) {
        logger.error('ManufacturingService.deleteBOM: BOM is used in work orders');
        return false;
      }

      const result = await BOM.deleteOne({ _id: id, firmId });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('ManufacturingService.deleteBOM failed:', error.message);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // WORKSTATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get workstations
   * @param {String} firmId - Firm ID
   * @returns {Promise<Array>} - Workstations
   */
  async getWorkstations(firmId) {
    try {
      const workstations = await Workstation.find({ firmId })
        .populate('createdBy', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
        .populate('updatedBy', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
        .sort({ name: 1 })
        .lean();

      return workstations;
    } catch (error) {
      logger.error('ManufacturingService.getWorkstations failed:', error.message);
      return [];
    }
  }

  /**
   * Get workstation by ID
   * @param {String} id - Workstation ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Workstation or null
   */
  async getWorkstationById(id, firmId) {
    try {
      const workstation = await Workstation.findOne({ _id: id, firmId })
        .populate('createdBy', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
        .populate('updatedBy', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
        .lean();

      return workstation;
    } catch (error) {
      logger.error('ManufacturingService.getWorkstationById failed:', error.message);
      return null;
    }
  }

  /**
   * Create workstation
   * @param {Object} data - Workstation data
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Created workstation or null
   */
  async createWorkstation(data, firmId, userId) {
    try {
      const workstationData = {
        ...data,
        firmId,
        createdBy: userId
      };

      const workstation = await Workstation.create(workstationData);
      return workstation.toObject();
    } catch (error) {
      logger.error('ManufacturingService.createWorkstation failed:', error.message);
      return null;
    }
  }

  /**
   * Update workstation
   * @param {String} id - Workstation ID
   * @param {Object} data - Update data
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Updated workstation or null
   */
  async updateWorkstation(id, data, firmId, userId) {
    try {
      const workstation = await Workstation.findOne({ _id: id, firmId });
      if (!workstation) {
        logger.error('ManufacturingService.updateWorkstation: Workstation not found');
        return null;
      }

      Object.assign(workstation, data);
      workstation.updatedBy = userId;
      await workstation.save();

      return workstation.toObject();
    } catch (error) {
      logger.error('ManufacturingService.updateWorkstation failed:', error.message);
      return null;
    }
  }

  /**
   * Delete workstation
   * @param {String} id - Workstation ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Boolean>} - Success status
   */
  async deleteWorkstation(id, firmId) {
    try {
      const result = await Workstation.deleteOne({ _id: id, firmId });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('ManufacturingService.deleteWorkstation failed:', error.message);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // WORK ORDERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get work orders with filters
   * @param {Object} query - Query filters
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Work orders with pagination
   */
  async getWorkOrders(query = {}, firmId) {
    try {
      const {
        status,
        itemId,
        bomId,
        dateFrom,
        dateTo,
        search,
        page = 1,
        limit = 50
      } = query;

      // Build filter
      const filter = { firmId };

      if (status) {
        if (Array.isArray(status)) {
          filter.status = { $in: status };
        } else {
          filter.status = status;
        }
      }

      if (itemId) {
        filter.itemId = itemId;
      }

      if (bomId) {
        filter.bomId = bomId;
      }

      // Date range filter
      if (dateFrom || dateTo) {
        filter.plannedStartDate = {};
        if (dateFrom) {
          filter.plannedStartDate.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          filter.plannedStartDate.$lte = new Date(dateTo);
        }
      }

      if (search) {
        filter.$or = [
          { workOrderId: { $regex: search, $options: 'i' } },
          { workOrderNumber: { $regex: search, $options: 'i' } },
          { itemName: { $regex: search, $options: 'i' } },
          { itemCode: { $regex: search, $options: 'i' } }
        ];
      }

      // Pagination
      const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
      const sanitizedPage = Math.max(parseInt(page) || 1, 1);
      const skip = (sanitizedPage - 1) * sanitizedLimit;

      // Execute queries in parallel
      const [workOrders, total] = await Promise.all([
        WorkOrder.find(filter)
          .populate('itemId', 'itemCode itemName uom')
          .populate('bomId', 'bomId bomNumber')
          .populate('targetWarehouse', 'name')
          .populate('requiredItems.itemId', 'itemCode itemName')
          .populate('operations.workstation', 'name nameAr')
          .populate('createdBy', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(sanitizedLimit)
          .lean(),
        WorkOrder.countDocuments(filter)
      ]);

      return {
        workOrders,
        pagination: {
          total,
          page: sanitizedPage,
          limit: sanitizedLimit,
          pages: Math.ceil(total / sanitizedLimit)
        }
      };
    } catch (error) {
      logger.error('ManufacturingService.getWorkOrders failed:', error.message);
      throw error;
    }
  }

  /**
   * Get work order by ID
   * @param {String} id - Work order ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Work order or null
   */
  async getWorkOrderById(id, firmId) {
    try {
      const workOrder = await WorkOrder.findOne({ _id: id, firmId })
        .populate('itemId', 'itemCode itemName uom')
        .populate('bomId', 'bomId bomNumber')
        .populate('targetWarehouse', 'name')
        .populate('workInProgressWarehouse', 'name')
        .populate('sourceWarehouse', 'name')
        .populate('requiredItems.itemId', 'itemCode itemName')
        .populate('requiredItems.sourceWarehouse', 'name')
        .populate('operations.workstation', 'name nameAr workstationId')
        .populate('createdBy', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
        .populate('updatedBy', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
        .lean();

      return workOrder;
    } catch (error) {
      logger.error('ManufacturingService.getWorkOrderById failed:', error.message);
      return null;
    }
  }

  /**
   * Create work order
   * @param {Object} data - Work order data
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Created work order or null
   */
  async createWorkOrder(data, firmId, userId) {
    try {
      const workOrderData = {
        ...data,
        firmId,
        createdBy: userId
      };

      const workOrder = await WorkOrder.create(workOrderData);

      // Populate before returning
      return await WorkOrder.findById(workOrder._id)
        .populate('itemId', 'itemCode itemName uom')
        .populate('bomId', 'bomId bomNumber')
        .populate('targetWarehouse', 'name')
        .lean();
    } catch (error) {
      logger.error('ManufacturingService.createWorkOrder failed:', error.message);
      return null;
    }
  }

  /**
   * Update work order
   * @param {String} id - Work order ID
   * @param {Object} data - Update data
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Updated work order or null
   */
  async updateWorkOrder(id, data, firmId, userId) {
    try {
      const workOrder = await WorkOrder.findOne({ _id: id, firmId });
      if (!workOrder) {
        logger.error('ManufacturingService.updateWorkOrder: Work order not found');
        return null;
      }

      // Prevent updates to submitted/completed orders unless specific fields
      if (['submitted', 'in_progress', 'completed'].includes(workOrder.status)) {
        // Only allow updating certain fields for submitted orders
        const allowedFields = ['remarks', 'plannedEndDate'];
        const updates = {};
        allowedFields.forEach(field => {
          if (data[field] !== undefined) {
            updates[field] = data[field];
          }
        });
        Object.assign(workOrder, updates);
      } else {
        Object.assign(workOrder, data);
      }

      workOrder.updatedBy = userId;
      await workOrder.save();

      return await WorkOrder.findById(workOrder._id)
        .populate('itemId', 'itemCode itemName uom')
        .populate('bomId', 'bomId bomNumber')
        .lean();
    } catch (error) {
      logger.error('ManufacturingService.updateWorkOrder failed:', error.message);
      return null;
    }
  }

  /**
   * Submit work order
   * @param {String} id - Work order ID
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Submitted work order or null
   */
  async submitWorkOrder(id, firmId, userId) {
    try {
      const workOrder = await WorkOrder.findOne({ _id: id, firmId });
      if (!workOrder) {
        logger.error('ManufacturingService.submitWorkOrder: Work order not found');
        return null;
      }

      if (workOrder.status !== 'draft') {
        logger.error('ManufacturingService.submitWorkOrder: Work order must be in draft status');
        return null;
      }

      workOrder.status = 'submitted';
      workOrder.docStatus = 1;
      workOrder.updatedBy = userId;
      await workOrder.save();

      // Auto-create job cards if enabled
      const settings = await ManufacturingSettings.getOrCreateSettings(firmId);
      if (settings.autoCreateJobCards) {
        await this.createJobCardsForWorkOrder(id, firmId, userId);
      }

      return await this.getWorkOrderById(id, firmId);
    } catch (error) {
      logger.error('ManufacturingService.submitWorkOrder failed:', error.message);
      return null;
    }
  }

  /**
   * Start work order
   * @param {String} id - Work order ID
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Started work order or null
   */
  async startWorkOrder(id, firmId, userId) {
    try {
      const workOrder = await WorkOrder.findOne({ _id: id, firmId });
      if (!workOrder) {
        logger.error('ManufacturingService.startWorkOrder: Work order not found');
        return null;
      }

      await workOrder.startProduction();
      workOrder.updatedBy = userId;
      await workOrder.save();

      return await this.getWorkOrderById(id, firmId);
    } catch (error) {
      logger.error('ManufacturingService.startWorkOrder failed:', error.message);
      return null;
    }
  }

  /**
   * Complete work order
   * @param {String} id - Work order ID
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Completed work order or null
   */
  async completeWorkOrder(id, firmId, userId) {
    try {
      const workOrder = await WorkOrder.findOne({ _id: id, firmId });
      if (!workOrder) {
        logger.error('ManufacturingService.completeWorkOrder: Work order not found');
        return null;
      }

      await workOrder.completeProduction();
      workOrder.updatedBy = userId;
      await workOrder.save();

      return await this.getWorkOrderById(id, firmId);
    } catch (error) {
      logger.error('ManufacturingService.completeWorkOrder failed:', error.message);
      return null;
    }
  }

  /**
   * Cancel work order
   * @param {String} id - Work order ID
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Cancelled work order or null
   */
  async cancelWorkOrder(id, firmId, userId) {
    try {
      const workOrder = await WorkOrder.findOne({ _id: id, firmId });
      if (!workOrder) {
        logger.error('ManufacturingService.cancelWorkOrder: Work order not found');
        return null;
      }

      workOrder.status = 'cancelled';
      workOrder.docStatus = 2;
      workOrder.updatedBy = userId;
      await workOrder.save();

      // Cancel all pending job cards
      await JobCard.updateMany(
        { workOrderId: id, firmId, status: { $in: ['pending', 'work_in_progress'] } },
        { status: 'on_hold', updatedBy: userId }
      );

      return await this.getWorkOrderById(id, firmId);
    } catch (error) {
      logger.error('ManufacturingService.cancelWorkOrder failed:', error.message);
      return null;
    }
  }

  /**
   * Delete work order
   * @param {String} id - Work order ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Boolean>} - Success status
   */
  async deleteWorkOrder(id, firmId) {
    try {
      const workOrder = await WorkOrder.findOne({ _id: id, firmId });
      if (!workOrder) {
        return false;
      }

      // Only allow deleting draft orders
      if (workOrder.status !== 'draft') {
        logger.error('ManufacturingService.deleteWorkOrder: Only draft work orders can be deleted');
        return false;
      }

      // Delete associated job cards
      await JobCard.deleteMany({ workOrderId: id, firmId });

      const result = await WorkOrder.deleteOne({ _id: id, firmId });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('ManufacturingService.deleteWorkOrder failed:', error.message);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // JOB CARDS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get job cards with filters
   * @param {Object} query - Query filters
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Job cards with pagination
   */
  async getJobCards(query = {}, firmId) {
    try {
      const {
        workOrderId,
        workstation,
        employee,
        status,
        page = 1,
        limit = 50
      } = query;

      // Build filter
      const filter = { firmId };

      if (workOrderId) {
        filter.workOrderId = workOrderId;
      }

      if (workstation) {
        filter.workstation = workstation;
      }

      if (employee) {
        filter.employee = employee;
      }

      if (status) {
        if (Array.isArray(status)) {
          filter.status = { $in: status };
        } else {
          filter.status = status;
        }
      }

      // Pagination
      const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
      const sanitizedPage = Math.max(parseInt(page) || 1, 1);
      const skip = (sanitizedPage - 1) * sanitizedLimit;

      // Execute queries in parallel
      const [jobCards, total] = await Promise.all([
        JobCard.find(filter)
          .populate('workOrderId', 'workOrderId workOrderNumber itemName')
          .populate('workstation', 'name nameAr workstationId')
          .populate('employee', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
          .populate('itemId', 'itemCode itemName')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(sanitizedLimit)
          .lean(),
        JobCard.countDocuments(filter)
      ]);

      return {
        jobCards,
        pagination: {
          total,
          page: sanitizedPage,
          limit: sanitizedLimit,
          pages: Math.ceil(total / sanitizedLimit)
        }
      };
    } catch (error) {
      logger.error('ManufacturingService.getJobCards failed:', error.message);
      throw error;
    }
  }

  /**
   * Get job card by ID
   * @param {String} id - Job card ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Job card or null
   */
  async getJobCardById(id, firmId) {
    try {
      const jobCard = await JobCard.findOne({ _id: id, firmId })
        .populate('workOrderId', 'workOrderId workOrderNumber itemName qty')
        .populate('workstation', 'name nameAr workstationId operatingCosts')
        .populate('employee', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
        .populate('itemId', 'itemCode itemName uom')
        .populate('createdBy', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
        .populate('updatedBy', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
        .lean();

      return jobCard;
    } catch (error) {
      logger.error('ManufacturingService.getJobCardById failed:', error.message);
      return null;
    }
  }

  /**
   * Create job card
   * @param {Object} data - Job card data
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Created job card or null
   */
  async createJobCard(data, firmId, userId) {
    try {
      const jobCardData = {
        ...data,
        firmId,
        createdBy: userId
      };

      const jobCard = await JobCard.create(jobCardData);

      // Populate before returning
      return await JobCard.findById(jobCard._id)
        .populate('workOrderId', 'workOrderId workOrderNumber itemName')
        .populate('workstation', 'name nameAr')
        .lean();
    } catch (error) {
      logger.error('ManufacturingService.createJobCard failed:', error.message);
      return null;
    }
  }

  /**
   * Update job card
   * @param {String} id - Job card ID
   * @param {Object} data - Update data
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Updated job card or null
   */
  async updateJobCard(id, data, firmId, userId) {
    try {
      const jobCard = await JobCard.findOne({ _id: id, firmId });
      if (!jobCard) {
        logger.error('ManufacturingService.updateJobCard: Job card not found');
        return null;
      }

      Object.assign(jobCard, data);
      jobCard.updatedBy = userId;
      await jobCard.save();

      return await this.getJobCardById(id, firmId);
    } catch (error) {
      logger.error('ManufacturingService.updateJobCard failed:', error.message);
      return null;
    }
  }

  /**
   * Start job card
   * @param {String} id - Job card ID
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Started job card or null
   */
  async startJobCard(id, firmId, userId) {
    try {
      const jobCard = await JobCard.findOne({ _id: id, firmId });
      if (!jobCard) {
        logger.error('ManufacturingService.startJobCard: Job card not found');
        return null;
      }

      await jobCard.start(userId);
      jobCard.updatedBy = userId;
      await jobCard.save();

      return await this.getJobCardById(id, firmId);
    } catch (error) {
      logger.error('ManufacturingService.startJobCard failed:', error.message);
      return null;
    }
  }

  /**
   * Complete job card
   * @param {String} id - Job card ID
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Completed job card or null
   */
  async completeJobCard(id, firmId, userId) {
    try {
      const jobCard = await JobCard.findOne({ _id: id, firmId });
      if (!jobCard) {
        logger.error('ManufacturingService.completeJobCard: Job card not found');
        return null;
      }

      await jobCard.complete();
      jobCard.updatedBy = userId;
      await jobCard.save();

      // Update work order progress
      if (jobCard.workOrderId) {
        await this.updateWorkOrderProgress(jobCard.workOrderId);
      }

      return await this.getJobCardById(id, firmId);
    } catch (error) {
      logger.error('ManufacturingService.completeJobCard failed:', error.message);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STATS & SETTINGS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get manufacturing stats
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Manufacturing statistics
   */
  async getStats(firmId) {
    try {
      const [
        totalBOMs,
        activeBOMs,
        totalWorkstations,
        activeWorkstations,
        workOrdersByStatus,
        jobCardsByStatus,
        overdueWorkOrders
      ] = await Promise.all([
        BOM.countDocuments({ firmId }),
        BOM.countDocuments({ firmId, isActive: true }),
        Workstation.countDocuments({ firmId }),
        Workstation.countDocuments({ firmId, isActive: true }),
        WorkOrder.aggregate([
          { $match: { firmId: new mongoose.Types.ObjectId(firmId) } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        JobCard.aggregate([
          { $match: { firmId: new mongoose.Types.ObjectId(firmId) } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        WorkOrder.countDocuments({
          firmId,
          status: { $in: ['not_started', 'in_progress'] },
          plannedEndDate: { $lt: new Date() }
        })
      ]);

      // Format work order stats
      const workOrderStats = {
        total: 0,
        draft: 0,
        submitted: 0,
        not_started: 0,
        in_progress: 0,
        completed: 0,
        stopped: 0,
        cancelled: 0
      };

      workOrdersByStatus.forEach(stat => {
        workOrderStats[stat._id] = stat.count;
        workOrderStats.total += stat.count;
      });

      // Format job card stats
      const jobCardStats = {
        total: 0,
        pending: 0,
        work_in_progress: 0,
        completed: 0,
        on_hold: 0
      };

      jobCardsByStatus.forEach(stat => {
        jobCardStats[stat._id] = stat.count;
        jobCardStats.total += stat.count;
      });

      return {
        boms: {
          total: totalBOMs,
          active: activeBOMs
        },
        workstations: {
          total: totalWorkstations,
          active: activeWorkstations
        },
        workOrders: workOrderStats,
        jobCards: jobCardStats,
        overdue: {
          workOrders: overdueWorkOrders
        }
      };
    } catch (error) {
      logger.error('ManufacturingService.getStats failed:', error.message);
      return null;
    }
  }

  /**
   * Get manufacturing settings
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Settings or null
   */
  async getSettings(firmId) {
    try {
      const settings = await ManufacturingSettings.getOrCreateSettings(firmId);
      return settings ? settings.toObject() : null;
    } catch (error) {
      logger.error('ManufacturingService.getSettings failed:', error.message);
      return null;
    }
  }

  /**
   * Update manufacturing settings
   * @param {Object} data - Settings data
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Updated settings or null
   */
  async updateSettings(data, firmId, userId) {
    try {
      const settings = await ManufacturingSettings.updateSettings(firmId, data, userId);
      return settings ? settings.toObject() : null;
    } catch (error) {
      logger.error('ManufacturingService.updateSettings failed:', error.message);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create work order from BOM
   * @param {String} bomId - BOM ID
   * @param {Number} qty - Quantity to produce
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Created work order or null
   */
  async createWorkOrderFromBOM(bomId, qty, firmId, userId) {
    try {
      const bom = await BOM.findOne({ _id: bomId, firmId });
      if (!bom) {
        logger.error('ManufacturingService.createWorkOrderFromBOM: BOM not found');
        return null;
      }

      const workOrderData = {
        bomId: bom._id,
        qty,
        firmId,
        createdBy: userId
      };

      const workOrder = await WorkOrder.createFromBOM(workOrderData);
      await workOrder.save();

      return await this.getWorkOrderById(workOrder._id, firmId);
    } catch (error) {
      logger.error('ManufacturingService.createWorkOrderFromBOM failed:', error.message);
      return null;
    }
  }

  /**
   * Create job cards for work order
   * @param {String} workOrderId - Work order ID
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Array>} - Created job cards
   */
  async createJobCardsForWorkOrder(workOrderId, firmId, userId) {
    try {
      const workOrder = await WorkOrder.findOne({ _id: workOrderId, firmId });
      if (!workOrder) {
        logger.error('ManufacturingService.createJobCardsForWorkOrder: Work order not found');
        return [];
      }

      // Create job cards for each operation
      const jobCards = [];
      for (const operation of workOrder.operations) {
        const jobCardData = {
          firmId,
          workOrderId: workOrder._id,
          workOrderNumber: workOrder.workOrderNumber,
          operation: operation.operation,
          workstation: operation.workstation,
          itemId: workOrder.itemId,
          itemCode: workOrder.itemCode,
          itemName: workOrder.itemName,
          forQty: workOrder.qty,
          plannedStartTime: workOrder.plannedStartDate,
          plannedEndTime: workOrder.plannedEndDate,
          status: 'pending',
          createdBy: userId
        };

        const jobCard = await JobCard.create(jobCardData);
        jobCards.push(jobCard);
      }

      return jobCards;
    } catch (error) {
      logger.error('ManufacturingService.createJobCardsForWorkOrder failed:', error.message);
      return [];
    }
  }

  /**
   * Update work order progress based on job cards
   * @param {String} workOrderId - Work order ID
   * @returns {Promise<void>}
   */
  async updateWorkOrderProgress(workOrderId) {
    try {
      const jobCards = await JobCard.find({ workOrderId });
      if (jobCards.length === 0) return;

      const totalCompleted = jobCards.filter(jc => jc.status === 'completed').length;
      const totalJobCards = jobCards.length;

      // If all job cards are completed, update work order
      if (totalCompleted === totalJobCards) {
        const workOrder = await WorkOrder.findById(workOrderId);
        if (workOrder && workOrder.status === 'in_progress') {
          // Calculate average completed quantity from job cards
          const avgCompletedQty = jobCards.reduce((sum, jc) => sum + jc.completedQty, 0) / totalJobCards;
          await workOrder.completeProduction(avgCompletedQty);
        }
      }
    } catch (error) {
      logger.error('ManufacturingService.updateWorkOrderProgress failed:', error.message);
    }
  }
}

// Export singleton instance
module.exports = new ManufacturingService();
