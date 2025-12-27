/**
 * Buying Service - Comprehensive Buying Module Management
 *
 * This service provides high-level API for managing buying operations including:
 * - Suppliers and Supplier Groups
 * - Purchase Orders (PO)
 * - Purchase Receipts (PR)
 * - Purchase Invoices (PI)
 * - Material Requests (MR)
 * - Request for Quotations (RFQ)
 * - Buying Settings and Statistics
 */

const mongoose = require('mongoose');
const Supplier = require('../models/supplier.model');
const SupplierGroup = require('../models/supplierGroup.model');
const PurchaseOrder = require('../models/purchaseOrder.model');
const PurchaseReceipt = require('../models/purchaseReceipt.model');
const PurchaseInvoice = require('../models/purchaseInvoice.model');
const MaterialRequest = require('../models/materialRequest.model');
const RFQ = require('../models/rfq.model');
const BuyingSettings = require('../models/buyingSettings.model');
const { CustomException } = require('../utils');
const logger = require('../utils/logger');

class BuyingService {
  // ═══════════════════════════════════════════════════════════════
  // SUPPLIERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get suppliers with filters
   * @param {Object} query - Filter query
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Suppliers list with pagination
   */
  async getSuppliers(query, firmId) {
    try {
      const {
        supplierType,
        supplierGroup,
        status,
        search,
        city,
        country,
        page = 1,
        limit = 50
      } = query;

      const filters = { firmId: new mongoose.Types.ObjectId(firmId) };

      if (supplierType) filters.supplierType = supplierType;
      if (supplierGroup) filters.supplierGroup = supplierGroup;
      if (status) filters.status = status;
      if (city) filters.city = city;
      if (country) filters.country = country;

      if (search) {
        filters.$or = [
          { name: { $regex: search, $options: 'i' } },
          { nameAr: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { supplierId: { $regex: search, $options: 'i' } }
        ];
      }

      const suppliers = await Supplier.find(filters)
        .sort({ name: 1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

      const total = await Supplier.countDocuments(filters);

      return {
        suppliers,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      };
    } catch (error) {
      logger.error('BuyingService.getSuppliers failed:', error.message);
      throw error;
    }
  }

  /**
   * Get supplier by ID
   * @param {String} id - Supplier ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Supplier or null
   */
  async getSupplierById(id, firmId) {
    try {
      const supplier = await Supplier.findOne({
        _id: id,
        firmId: new mongoose.Types.ObjectId(firmId)
      }).lean();

      return supplier;
    } catch (error) {
      logger.error('BuyingService.getSupplierById failed:', error.message);
      throw error;
    }
  }

  /**
   * Create supplier
   * @param {Object} data - Supplier data
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} - Created supplier
   */
  async createSupplier(data, firmId, userId) {
    try {
      const supplierData = {
        ...data,
        firmId: new mongoose.Types.ObjectId(firmId),
        lawyerId: new mongoose.Types.ObjectId(userId),
        createdBy: new mongoose.Types.ObjectId(userId)
      };

      const supplier = await Supplier.create(supplierData);
      return supplier;
    } catch (error) {
      logger.error('BuyingService.createSupplier failed:', error.message);
      throw error;
    }
  }

  /**
   * Update supplier
   * @param {String} id - Supplier ID
   * @param {Object} data - Update data
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Updated supplier or null
   */
  async updateSupplier(id, data, firmId, userId) {
    try {
      // Remove protected fields
      delete data.firmId;
      delete data.lawyerId;
      delete data.supplierId;

      const supplier = await Supplier.findOneAndUpdate(
        {
          _id: id,
          firmId: new mongoose.Types.ObjectId(firmId)
        },
        { $set: data },
        { new: true, runValidators: true }
      ).lean();

      return supplier;
    } catch (error) {
      logger.error('BuyingService.updateSupplier failed:', error.message);
      throw error;
    }
  }

  /**
   * Delete supplier
   * @param {String} id - Supplier ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Boolean>} - Success status
   */
  async deleteSupplier(id, firmId) {
    try {
      // Check for existing purchase orders
      const poCount = await PurchaseOrder.countDocuments({
        supplierId: id,
        firmId: new mongoose.Types.ObjectId(firmId)
      });

      if (poCount > 0) {
        throw CustomException('Cannot delete supplier with existing purchase orders. Deactivate instead.', 400);
      }

      await Supplier.findOneAndDelete({
        _id: id,
        firmId: new mongoose.Types.ObjectId(firmId)
      });

      return true;
    } catch (error) {
      logger.error('BuyingService.deleteSupplier failed:', error.message);
      throw error;
    }
  }

  /**
   * Get supplier groups
   * @param {String} firmId - Firm ID
   * @returns {Promise<Array>} - Supplier groups
   */
  async getSupplierGroups(firmId) {
    try {
      const groups = await SupplierGroup.find({
        firmId: new mongoose.Types.ObjectId(firmId)
      })
        .sort({ name: 1 })
        .lean();

      return groups;
    } catch (error) {
      logger.error('BuyingService.getSupplierGroups failed:', error.message);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PURCHASE ORDERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get purchase orders with filters
   * @param {Object} query - Filter query
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Purchase orders list with pagination
   */
  async getPurchaseOrders(query, firmId) {
    try {
      const {
        supplierId,
        status,
        dateFrom,
        dateTo,
        search,
        page = 1,
        limit = 50
      } = query;

      const filters = { firmId: new mongoose.Types.ObjectId(firmId) };

      if (supplierId) filters.supplierId = new mongoose.Types.ObjectId(supplierId);
      if (status) filters.status = status;

      if (dateFrom || dateTo) {
        filters.orderDate = {};
        if (dateFrom) filters.orderDate.$gte = new Date(dateFrom);
        if (dateTo) filters.orderDate.$lte = new Date(dateTo);
      }

      if (search) {
        filters.$or = [
          { purchaseOrderId: { $regex: search, $options: 'i' } },
          { poNumber: { $regex: search, $options: 'i' } },
          { supplierName: { $regex: search, $options: 'i' } }
        ];
      }

      const purchaseOrders = await PurchaseOrder.find(filters)
        .populate('supplierId', 'name email')
        .sort({ orderDate: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

      const total = await PurchaseOrder.countDocuments(filters);

      return {
        purchaseOrders,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      };
    } catch (error) {
      logger.error('BuyingService.getPurchaseOrders failed:', error.message);
      throw error;
    }
  }

  /**
   * Get purchase order by ID
   * @param {String} id - Purchase Order ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Purchase order or null
   */
  async getPurchaseOrderById(id, firmId) {
    try {
      const purchaseOrder = await PurchaseOrder.findOne({
        _id: id,
        firmId: new mongoose.Types.ObjectId(firmId)
      })
        .populate('supplierId', 'name email phone')
        .populate('materialRequestId')
        .populate('rfqId')
        .lean();

      return purchaseOrder;
    } catch (error) {
      logger.error('BuyingService.getPurchaseOrderById failed:', error.message);
      throw error;
    }
  }

  /**
   * Create purchase order
   * @param {Object} data - Purchase order data
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} - Created purchase order
   */
  async createPurchaseOrder(data, firmId, userId) {
    try {
      // Get supplier name
      const supplier = await Supplier.findOne({
        _id: data.supplierId,
        firmId: new mongoose.Types.ObjectId(firmId)
      });
      if (!supplier) {
        throw CustomException('Supplier not found', 404);
      }

      const purchaseOrderData = {
        ...data,
        supplierName: supplier.name,
        firmId: new mongoose.Types.ObjectId(firmId),
        lawyerId: new mongoose.Types.ObjectId(userId),
        createdBy: new mongoose.Types.ObjectId(userId),
        status: 'draft',
        docStatus: 0
      };

      const purchaseOrder = await PurchaseOrder.create(purchaseOrderData);
      return purchaseOrder;
    } catch (error) {
      logger.error('BuyingService.createPurchaseOrder failed:', error.message);
      throw error;
    }
  }

  /**
   * Submit purchase order
   * @param {String} id - Purchase Order ID
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Updated purchase order or null
   */
  async submitPurchaseOrder(id, firmId, userId) {
    try {
      const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
        {
          _id: id,
          firmId: new mongoose.Types.ObjectId(firmId),
          status: 'draft'
        },
        {
          $set: {
            status: 'submitted',
            docStatus: 1
          }
        },
        { new: true, runValidators: true }
      ).lean();

      if (!purchaseOrder) {
        throw CustomException('Purchase order not found or cannot be submitted', 404);
      }

      return purchaseOrder;
    } catch (error) {
      logger.error('BuyingService.submitPurchaseOrder failed:', error.message);
      throw error;
    }
  }

  /**
   * Approve purchase order
   * @param {String} id - Purchase Order ID
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Updated purchase order or null
   */
  async approvePurchaseOrder(id, firmId, userId) {
    try {
      const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
        {
          _id: id,
          firmId: new mongoose.Types.ObjectId(firmId),
          status: 'submitted'
        },
        {
          $set: {
            status: 'approved'
          }
        },
        { new: true, runValidators: true }
      ).lean();

      if (!purchaseOrder) {
        throw CustomException('Purchase order not found or cannot be approved', 404);
      }

      return purchaseOrder;
    } catch (error) {
      logger.error('BuyingService.approvePurchaseOrder failed:', error.message);
      throw error;
    }
  }

  /**
   * Cancel purchase order
   * @param {String} id - Purchase Order ID
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Updated purchase order or null
   */
  async cancelPurchaseOrder(id, firmId, userId) {
    try {
      const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
        {
          _id: id,
          firmId: new mongoose.Types.ObjectId(firmId),
          status: { $in: ['draft', 'submitted', 'approved'] }
        },
        {
          $set: {
            status: 'cancelled',
            docStatus: 2
          }
        },
        { new: true, runValidators: true }
      ).lean();

      if (!purchaseOrder) {
        throw CustomException('Purchase order not found or cannot be cancelled', 404);
      }

      return purchaseOrder;
    } catch (error) {
      logger.error('BuyingService.cancelPurchaseOrder failed:', error.message);
      throw error;
    }
  }

  /**
   * Delete purchase order
   * @param {String} id - Purchase Order ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Boolean>} - Success status
   */
  async deletePurchaseOrder(id, firmId) {
    try {
      const purchaseOrder = await PurchaseOrder.findOne({
        _id: id,
        firmId: new mongoose.Types.ObjectId(firmId)
      });

      if (!purchaseOrder) {
        throw CustomException('Purchase order not found', 404);
      }

      if (purchaseOrder.status !== 'draft') {
        throw CustomException('Only draft purchase orders can be deleted', 400);
      }

      await PurchaseOrder.findOneAndDelete({
        _id: id,
        firmId: new mongoose.Types.ObjectId(firmId)
      });

      return true;
    } catch (error) {
      logger.error('BuyingService.deletePurchaseOrder failed:', error.message);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PURCHASE RECEIPTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get purchase receipts with filters
   * @param {Object} query - Filter query
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Purchase receipts list with pagination
   */
  async getPurchaseReceipts(query, firmId) {
    try {
      const {
        supplierId,
        purchaseOrderId,
        status,
        dateFrom,
        dateTo,
        page = 1,
        limit = 50
      } = query;

      const filters = { firmId: new mongoose.Types.ObjectId(firmId) };

      if (supplierId) filters.supplierId = new mongoose.Types.ObjectId(supplierId);
      if (purchaseOrderId) filters.purchaseOrderId = new mongoose.Types.ObjectId(purchaseOrderId);
      if (status) filters.status = status;

      if (dateFrom || dateTo) {
        filters.postingDate = {};
        if (dateFrom) filters.postingDate.$gte = new Date(dateFrom);
        if (dateTo) filters.postingDate.$lte = new Date(dateTo);
      }

      const purchaseReceipts = await PurchaseReceipt.find(filters)
        .populate('supplierId', 'name email')
        .populate('purchaseOrderId', 'poNumber')
        .sort({ postingDate: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

      const total = await PurchaseReceipt.countDocuments(filters);

      return {
        purchaseReceipts,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      };
    } catch (error) {
      logger.error('BuyingService.getPurchaseReceipts failed:', error.message);
      throw error;
    }
  }

  /**
   * Get purchase receipt by ID
   * @param {String} id - Purchase Receipt ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Purchase receipt or null
   */
  async getPurchaseReceiptById(id, firmId) {
    try {
      const purchaseReceipt = await PurchaseReceipt.findOne({
        _id: id,
        firmId: new mongoose.Types.ObjectId(firmId)
      })
        .populate('supplierId', 'name email phone')
        .populate('purchaseOrderId')
        .lean();

      return purchaseReceipt;
    } catch (error) {
      logger.error('BuyingService.getPurchaseReceiptById failed:', error.message);
      throw error;
    }
  }

  /**
   * Create purchase receipt
   * @param {Object} data - Purchase receipt data
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} - Created purchase receipt
   */
  async createPurchaseReceipt(data, firmId, userId) {
    try {
      // Get supplier name
      const supplier = await Supplier.findOne({
        _id: data.supplierId,
        firmId: new mongoose.Types.ObjectId(firmId)
      });
      if (!supplier) {
        throw CustomException('Supplier not found', 404);
      }

      const purchaseReceiptData = {
        ...data,
        supplierName: supplier.name,
        firmId: new mongoose.Types.ObjectId(firmId),
        lawyerId: new mongoose.Types.ObjectId(userId),
        createdBy: new mongoose.Types.ObjectId(userId),
        status: 'draft',
        docStatus: 0
      };

      const purchaseReceipt = await PurchaseReceipt.create(purchaseReceiptData);
      return purchaseReceipt;
    } catch (error) {
      logger.error('BuyingService.createPurchaseReceipt failed:', error.message);
      throw error;
    }
  }

  /**
   * Submit purchase receipt
   * @param {String} id - Purchase Receipt ID
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Updated purchase receipt or null
   */
  async submitPurchaseReceipt(id, firmId, userId) {
    try {
      const purchaseReceipt = await PurchaseReceipt.findOneAndUpdate(
        {
          _id: id,
          firmId: new mongoose.Types.ObjectId(firmId),
          status: 'draft'
        },
        {
          $set: {
            status: 'submitted',
            docStatus: 1
          }
        },
        { new: true, runValidators: true }
      ).lean();

      if (!purchaseReceipt) {
        throw CustomException('Purchase receipt not found or cannot be submitted', 404);
      }

      return purchaseReceipt;
    } catch (error) {
      logger.error('BuyingService.submitPurchaseReceipt failed:', error.message);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PURCHASE INVOICES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get purchase invoices with filters
   * @param {Object} query - Filter query
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Purchase invoices list with pagination
   */
  async getPurchaseInvoices(query, firmId) {
    try {
      const {
        supplierId,
        purchaseOrderId,
        status,
        dateFrom,
        dateTo,
        page = 1,
        limit = 50
      } = query;

      const filters = { firmId: new mongoose.Types.ObjectId(firmId) };

      if (supplierId) filters.supplierId = new mongoose.Types.ObjectId(supplierId);
      if (purchaseOrderId) filters.purchaseOrderId = new mongoose.Types.ObjectId(purchaseOrderId);
      if (status) filters.status = status;

      if (dateFrom || dateTo) {
        filters.postingDate = {};
        if (dateFrom) filters.postingDate.$gte = new Date(dateFrom);
        if (dateTo) filters.postingDate.$lte = new Date(dateTo);
      }

      const purchaseInvoices = await PurchaseInvoice.find(filters)
        .populate('supplierId', 'name email')
        .populate('purchaseOrderId', 'poNumber')
        .sort({ postingDate: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

      const total = await PurchaseInvoice.countDocuments(filters);

      return {
        purchaseInvoices,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      };
    } catch (error) {
      logger.error('BuyingService.getPurchaseInvoices failed:', error.message);
      throw error;
    }
  }

  /**
   * Get purchase invoice by ID
   * @param {String} id - Purchase Invoice ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Purchase invoice or null
   */
  async getPurchaseInvoiceById(id, firmId) {
    try {
      const purchaseInvoice = await PurchaseInvoice.findOne({
        _id: id,
        firmId: new mongoose.Types.ObjectId(firmId)
      })
        .populate('supplierId', 'name email phone')
        .populate('purchaseOrderId')
        .populate('purchaseReceiptId')
        .lean();

      return purchaseInvoice;
    } catch (error) {
      logger.error('BuyingService.getPurchaseInvoiceById failed:', error.message);
      throw error;
    }
  }

  /**
   * Create purchase invoice
   * @param {Object} data - Purchase invoice data
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} - Created purchase invoice
   */
  async createPurchaseInvoice(data, firmId, userId) {
    try {
      // Get supplier name
      const supplier = await Supplier.findOne({
        _id: data.supplierId,
        firmId: new mongoose.Types.ObjectId(firmId)
      });
      if (!supplier) {
        throw CustomException('Supplier not found', 404);
      }

      const purchaseInvoiceData = {
        ...data,
        supplierName: supplier.name,
        firmId: new mongoose.Types.ObjectId(firmId),
        lawyerId: new mongoose.Types.ObjectId(userId),
        createdBy: new mongoose.Types.ObjectId(userId),
        status: 'draft',
        docStatus: 0
      };

      const purchaseInvoice = await PurchaseInvoice.create(purchaseInvoiceData);
      return purchaseInvoice;
    } catch (error) {
      logger.error('BuyingService.createPurchaseInvoice failed:', error.message);
      throw error;
    }
  }

  /**
   * Submit purchase invoice
   * @param {String} id - Purchase Invoice ID
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Updated purchase invoice or null
   */
  async submitPurchaseInvoice(id, firmId, userId) {
    try {
      const purchaseInvoice = await PurchaseInvoice.findOneAndUpdate(
        {
          _id: id,
          firmId: new mongoose.Types.ObjectId(firmId),
          status: 'draft'
        },
        {
          $set: {
            status: 'submitted',
            docStatus: 1
          }
        },
        { new: true, runValidators: true }
      ).lean();

      if (!purchaseInvoice) {
        throw CustomException('Purchase invoice not found or cannot be submitted', 404);
      }

      return purchaseInvoice;
    } catch (error) {
      logger.error('BuyingService.submitPurchaseInvoice failed:', error.message);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MATERIAL REQUESTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get material requests with filters
   * @param {Object} query - Filter query
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Material requests list with pagination
   */
  async getMaterialRequests(query, firmId) {
    try {
      const {
        requestType,
        status,
        dateFrom,
        dateTo,
        page = 1,
        limit = 50
      } = query;

      const filters = { firmId: new mongoose.Types.ObjectId(firmId) };

      if (requestType) filters.requestType = requestType;
      if (status) filters.status = status;

      if (dateFrom || dateTo) {
        filters.transactionDate = {};
        if (dateFrom) filters.transactionDate.$gte = new Date(dateFrom);
        if (dateTo) filters.transactionDate.$lte = new Date(dateTo);
      }

      const materialRequests = await MaterialRequest.find(filters)
        .populate('requestedBy', 'firstName lastName email')
        .sort({ transactionDate: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

      const total = await MaterialRequest.countDocuments(filters);

      return {
        materialRequests,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      };
    } catch (error) {
      logger.error('BuyingService.getMaterialRequests failed:', error.message);
      throw error;
    }
  }

  /**
   * Get material request by ID
   * @param {String} id - Material Request ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Material request or null
   */
  async getMaterialRequestById(id, firmId) {
    try {
      const materialRequest = await MaterialRequest.findOne({
        _id: id,
        firmId: new mongoose.Types.ObjectId(firmId)
      })
        .populate('requestedBy', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .lean();

      return materialRequest;
    } catch (error) {
      logger.error('BuyingService.getMaterialRequestById failed:', error.message);
      throw error;
    }
  }

  /**
   * Create material request
   * @param {Object} data - Material request data
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} - Created material request
   */
  async createMaterialRequest(data, firmId, userId) {
    try {
      const materialRequestData = {
        ...data,
        firmId: new mongoose.Types.ObjectId(firmId),
        lawyerId: new mongoose.Types.ObjectId(userId),
        requestedBy: new mongoose.Types.ObjectId(userId),
        createdBy: new mongoose.Types.ObjectId(userId),
        status: 'draft',
        docStatus: 0
      };

      const materialRequest = await MaterialRequest.create(materialRequestData);
      return materialRequest;
    } catch (error) {
      logger.error('BuyingService.createMaterialRequest failed:', error.message);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RFQs (Request for Quotations)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get RFQs with filters
   * @param {Object} query - Filter query
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - RFQs list with pagination
   */
  async getRFQs(query, firmId) {
    try {
      const {
        status,
        search,
        dateFrom,
        dateTo,
        page = 1,
        limit = 50
      } = query;

      const filters = { firmId: new mongoose.Types.ObjectId(firmId) };

      if (status) filters.status = status;

      if (dateFrom || dateTo) {
        filters.transactionDate = {};
        if (dateFrom) filters.transactionDate.$gte = new Date(dateFrom);
        if (dateTo) filters.transactionDate.$lte = new Date(dateTo);
      }

      if (search) {
        filters.$or = [
          { rfqId: { $regex: search, $options: 'i' } },
          { rfqNumber: { $regex: search, $options: 'i' } }
        ];
      }

      const rfqs = await RFQ.find(filters)
        .populate('materialRequestId', 'materialRequestId purpose')
        .sort({ transactionDate: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

      const total = await RFQ.countDocuments(filters);

      return {
        rfqs,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      };
    } catch (error) {
      logger.error('BuyingService.getRFQs failed:', error.message);
      throw error;
    }
  }

  /**
   * Get RFQ by ID
   * @param {String} id - RFQ ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - RFQ or null
   */
  async getRFQById(id, firmId) {
    try {
      const rfq = await RFQ.findOne({
        _id: id,
        firmId: new mongoose.Types.ObjectId(firmId)
      })
        .populate('materialRequestId')
        .populate('suppliers.supplierId', 'name email')
        .lean();

      return rfq;
    } catch (error) {
      logger.error('BuyingService.getRFQById failed:', error.message);
      throw error;
    }
  }

  /**
   * Create RFQ
   * @param {Object} data - RFQ data
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} - Created RFQ
   */
  async createRFQ(data, firmId, userId) {
    try {
      const rfqData = {
        ...data,
        firmId: new mongoose.Types.ObjectId(firmId),
        lawyerId: new mongoose.Types.ObjectId(userId),
        createdBy: new mongoose.Types.ObjectId(userId),
        status: 'draft',
        docStatus: 0
      };

      const rfq = await RFQ.create(rfqData);
      return rfq;
    } catch (error) {
      logger.error('BuyingService.createRFQ failed:', error.message);
      throw error;
    }
  }

  /**
   * Update RFQ
   * @param {String} id - RFQ ID
   * @param {Object} data - Update data
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Updated RFQ or null
   */
  async updateRFQ(id, data, firmId, userId) {
    try {
      // Remove protected fields
      delete data.firmId;
      delete data.lawyerId;
      delete data.rfqId;

      const rfq = await RFQ.findOneAndUpdate(
        {
          _id: id,
          firmId: new mongoose.Types.ObjectId(firmId),
          status: 'draft'
        },
        { $set: data },
        { new: true, runValidators: true }
      ).lean();

      if (!rfq) {
        throw CustomException('RFQ not found or cannot be updated', 404);
      }

      return rfq;
    } catch (error) {
      logger.error('BuyingService.updateRFQ failed:', error.message);
      throw error;
    }
  }

  /**
   * Submit RFQ
   * @param {String} id - RFQ ID
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object|null>} - Updated RFQ or null
   */
  async submitRFQ(id, firmId, userId) {
    try {
      const rfq = await RFQ.findOneAndUpdate(
        {
          _id: id,
          firmId: new mongoose.Types.ObjectId(firmId),
          status: 'draft'
        },
        {
          $set: {
            status: 'submitted',
            docStatus: 1
          }
        },
        { new: true, runValidators: true }
      ).lean();

      if (!rfq) {
        throw CustomException('RFQ not found or cannot be submitted', 404);
      }

      return rfq;
    } catch (error) {
      logger.error('BuyingService.submitRFQ failed:', error.message);
      throw error;
    }
  }

  /**
   * Delete RFQ
   * @param {String} id - RFQ ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Boolean>} - Success status
   */
  async deleteRFQ(id, firmId) {
    try {
      const rfq = await RFQ.findOne({
        _id: id,
        firmId: new mongoose.Types.ObjectId(firmId)
      });

      if (!rfq) {
        throw CustomException('RFQ not found', 404);
      }

      if (rfq.status !== 'draft') {
        throw CustomException('Only draft RFQs can be deleted', 400);
      }

      await RFQ.findOneAndDelete({
        _id: id,
        firmId: new mongoose.Types.ObjectId(firmId)
      });

      return true;
    } catch (error) {
      logger.error('BuyingService.deleteRFQ failed:', error.message);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STATS & SETTINGS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get buying statistics
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Buying statistics
   */
  async getStats(firmId) {
    try {
      const firmIdObj = new mongoose.Types.ObjectId(firmId);

      // Get supplier counts
      const supplierStats = await Supplier.aggregate([
        { $match: { firmId: firmIdObj } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Get purchase order stats
      const poStats = await PurchaseOrder.aggregate([
        { $match: { firmId: firmIdObj } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$grandTotal' }
          }
        }
      ]);

      // Get invoice stats
      const invoiceStats = await PurchaseInvoice.aggregate([
        { $match: { firmId: firmIdObj } },
        {
          $group: {
            _id: null,
            totalInvoices: { $sum: 1 },
            totalAmount: { $sum: '$grandTotal' },
            totalPaid: { $sum: '$amountPaid' },
            totalOutstanding: { $sum: '$outstandingAmount' }
          }
        }
      ]);

      return {
        suppliers: supplierStats,
        purchaseOrders: poStats,
        invoices: invoiceStats[0] || {
          totalInvoices: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalOutstanding: 0
        }
      };
    } catch (error) {
      logger.error('BuyingService.getStats failed:', error.message);
      throw error;
    }
  }

  /**
   * Get buying settings
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Buying settings
   */
  async getSettings(firmId) {
    try {
      const settings = await BuyingSettings.getSettings(firmId, firmId);
      return settings;
    } catch (error) {
      logger.error('BuyingService.getSettings failed:', error.message);
      throw error;
    }
  }

  /**
   * Update buying settings
   * @param {Object} data - Settings data
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} - Updated settings
   */
  async updateSettings(data, firmId, userId) {
    try {
      const settings = await BuyingSettings.findOneAndUpdate(
        { firmId: new mongoose.Types.ObjectId(firmId) },
        {
          $set: {
            ...data,
            updatedBy: new mongoose.Types.ObjectId(userId)
          }
        },
        { new: true, runValidators: true, upsert: true }
      ).lean();

      return settings;
    } catch (error) {
      logger.error('BuyingService.updateSettings failed:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new BuyingService();
