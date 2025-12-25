const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const { CustomException } = require('../utils');
const BuyingService = require('../services/buying.service');
const logger = require('../utils/logger');

// ============================================
// ALLOWED FIELDS FOR MASS ASSIGNMENT PROTECTION
// ============================================

const SUPPLIER_CREATE_FIELDS = [
  'name', 'nameAr', 'supplierType', 'supplierGroup', 'taxId', 'crNumber',
  'vatNumber', 'email', 'phone', 'mobile', 'fax', 'website', 'address',
  'city', 'region', 'country', 'postalCode', 'bankName', 'bankAccountNo',
  'iban', 'paymentTerms', 'currency', 'defaultPriceList', 'contacts',
  'tags', 'notes'
];

const SUPPLIER_UPDATE_FIELDS = [
  ...SUPPLIER_CREATE_FIELDS, 'status', 'disabled'
];

const PURCHASE_ORDER_CREATE_FIELDS = [
  'supplierId', 'items', 'orderDate', 'requiredDate', 'expectedDeliveryDate',
  'taxTemplateId', 'currency', 'exchangeRate', 'paymentTerms',
  'termsAndConditions', 'materialRequestId', 'rfqId', 'quotationId',
  'remarks', 'company'
];

const PURCHASE_ORDER_UPDATE_FIELDS = [
  ...PURCHASE_ORDER_CREATE_FIELDS
];

const PURCHASE_RECEIPT_CREATE_FIELDS = [
  'supplierId', 'purchaseOrderId', 'postingDate', 'postingTime',
  'items', 'remarks'
];

const PURCHASE_INVOICE_CREATE_FIELDS = [
  'supplierId', 'supplierInvoiceNo', 'purchaseOrderId', 'purchaseReceiptId',
  'postingDate', 'dueDate', 'items', 'remarks'
];

const MATERIAL_REQUEST_CREATE_FIELDS = [
  'requestType', 'purpose', 'items', 'transactionDate', 'requiredDate',
  'remarks', 'company'
];

const RFQ_CREATE_FIELDS = [
  'items', 'suppliers', 'transactionDate', 'validTill',
  'messageForSupplier', 'materialRequestId', 'company'
];

const RFQ_UPDATE_FIELDS = [
  ...RFQ_CREATE_FIELDS
];

const BUYING_SETTINGS_UPDATE_FIELDS = [
  'defaultPurchaseUom', 'purchaseOrderApprovalRequired',
  'autoCreatePurchaseReceipt', 'defaultPaymentTerms', 'maintainStockLedger'
];

// ============================================
// SUPPLIERS
// ============================================

// Get all suppliers
const getSuppliers = asyncHandler(async (req, res) => {
  const firmId = req.user?.firmId || req.firmId;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const result = await BuyingService.getSuppliers(req.query, firmId);

  res.json({
    success: true,
    data: result.suppliers,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: result.pages
    }
  });
});

// Get supplier by ID
const getSupplierById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const firmId = req.user?.firmId || req.firmId;

  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('Invalid supplier ID format', 400);
  }

  const supplier = await BuyingService.getSupplierById(sanitizedId, firmId);

  if (!supplier) {
    throw CustomException('Supplier not found', 404);
  }

  res.json({
    success: true,
    data: supplier
  });
});

// Create supplier
const createSupplier = asyncHandler(async (req, res) => {
  const firmId = req.user?.firmId || req.firmId;
  const userId = req.userID;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const filteredData = pickAllowedFields(req.body, SUPPLIER_CREATE_FIELDS);

  const supplier = await BuyingService.createSupplier(filteredData, firmId, userId);

  res.status(201).json({
    success: true,
    message: 'Supplier created successfully',
    data: supplier
  });
});

// Update supplier
const updateSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const firmId = req.user?.firmId || req.firmId;
  const userId = req.userID;

  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('Invalid supplier ID format', 400);
  }

  const filteredData = pickAllowedFields(req.body, SUPPLIER_UPDATE_FIELDS);

  const supplier = await BuyingService.updateSupplier(sanitizedId, filteredData, firmId, userId);

  if (!supplier) {
    throw CustomException('Supplier not found', 404);
  }

  res.json({
    success: true,
    message: 'Supplier updated successfully',
    data: supplier
  });
});

// Delete supplier
const deleteSupplier = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const firmId = req.user?.firmId || req.firmId;

  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('Invalid supplier ID format', 400);
  }

  await BuyingService.deleteSupplier(sanitizedId, firmId);

  res.json({
    success: true,
    message: 'Supplier deleted successfully'
  });
});

// Get supplier groups
const getSupplierGroups = asyncHandler(async (req, res) => {
  const firmId = req.user?.firmId || req.firmId;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const groups = await BuyingService.getSupplierGroups(firmId);

  res.json({
    success: true,
    data: groups
  });
});

// ============================================
// PURCHASE ORDERS
// ============================================

// Get all purchase orders
const getPurchaseOrders = asyncHandler(async (req, res) => {
  const firmId = req.user?.firmId || req.firmId;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const result = await BuyingService.getPurchaseOrders(req.query, firmId);

  res.json({
    success: true,
    data: result.purchaseOrders,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: result.pages
    }
  });
});

// Get purchase order by ID
const getPurchaseOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const firmId = req.user?.firmId || req.firmId;

  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('Invalid purchase order ID format', 400);
  }

  const purchaseOrder = await BuyingService.getPurchaseOrderById(sanitizedId, firmId);

  if (!purchaseOrder) {
    throw CustomException('Purchase order not found', 404);
  }

  res.json({
    success: true,
    data: purchaseOrder
  });
});

// Create purchase order
const createPurchaseOrder = asyncHandler(async (req, res) => {
  const firmId = req.user?.firmId || req.firmId;
  const userId = req.userID;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const filteredData = pickAllowedFields(req.body, PURCHASE_ORDER_CREATE_FIELDS);

  // Validate required fields
  if (!filteredData.supplierId) {
    throw CustomException('Supplier ID is required', 400);
  }
  if (!filteredData.items || filteredData.items.length === 0) {
    throw CustomException('At least one item is required', 400);
  }

  const purchaseOrder = await BuyingService.createPurchaseOrder(filteredData, firmId, userId);

  res.status(201).json({
    success: true,
    message: 'Purchase order created successfully',
    data: purchaseOrder
  });
});

// Submit purchase order
const submitPurchaseOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const firmId = req.user?.firmId || req.firmId;
  const userId = req.userID;

  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('Invalid purchase order ID format', 400);
  }

  const purchaseOrder = await BuyingService.submitPurchaseOrder(sanitizedId, firmId, userId);

  res.json({
    success: true,
    message: 'Purchase order submitted successfully',
    data: purchaseOrder
  });
});

// Approve purchase order
const approvePurchaseOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const firmId = req.user?.firmId || req.firmId;
  const userId = req.userID;

  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('Invalid purchase order ID format', 400);
  }

  const purchaseOrder = await BuyingService.approvePurchaseOrder(sanitizedId, firmId, userId);

  res.json({
    success: true,
    message: 'Purchase order approved successfully',
    data: purchaseOrder
  });
});

// Cancel purchase order
const cancelPurchaseOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const firmId = req.user?.firmId || req.firmId;
  const userId = req.userID;

  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('Invalid purchase order ID format', 400);
  }

  const purchaseOrder = await BuyingService.cancelPurchaseOrder(sanitizedId, firmId, userId);

  res.json({
    success: true,
    message: 'Purchase order cancelled successfully',
    data: purchaseOrder
  });
});

// Delete purchase order
const deletePurchaseOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const firmId = req.user?.firmId || req.firmId;

  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('Invalid purchase order ID format', 400);
  }

  await BuyingService.deletePurchaseOrder(sanitizedId, firmId);

  res.json({
    success: true,
    message: 'Purchase order deleted successfully'
  });
});

// ============================================
// PURCHASE RECEIPTS
// ============================================

// Get all purchase receipts
const getPurchaseReceipts = asyncHandler(async (req, res) => {
  const firmId = req.user?.firmId || req.firmId;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const result = await BuyingService.getPurchaseReceipts(req.query, firmId);

  res.json({
    success: true,
    data: result.purchaseReceipts,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: result.pages
    }
  });
});

// Get purchase receipt by ID
const getPurchaseReceiptById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const firmId = req.user?.firmId || req.firmId;

  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('Invalid purchase receipt ID format', 400);
  }

  const purchaseReceipt = await BuyingService.getPurchaseReceiptById(sanitizedId, firmId);

  if (!purchaseReceipt) {
    throw CustomException('Purchase receipt not found', 404);
  }

  res.json({
    success: true,
    data: purchaseReceipt
  });
});

// Create purchase receipt
const createPurchaseReceipt = asyncHandler(async (req, res) => {
  const firmId = req.user?.firmId || req.firmId;
  const userId = req.userID;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const filteredData = pickAllowedFields(req.body, PURCHASE_RECEIPT_CREATE_FIELDS);

  // Validate required fields
  if (!filteredData.supplierId) {
    throw CustomException('Supplier ID is required', 400);
  }
  if (!filteredData.items || filteredData.items.length === 0) {
    throw CustomException('At least one item is required', 400);
  }

  const purchaseReceipt = await BuyingService.createPurchaseReceipt(filteredData, firmId, userId);

  res.status(201).json({
    success: true,
    message: 'Purchase receipt created successfully',
    data: purchaseReceipt
  });
});

// Submit purchase receipt
const submitPurchaseReceipt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const firmId = req.user?.firmId || req.firmId;
  const userId = req.userID;

  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('Invalid purchase receipt ID format', 400);
  }

  const purchaseReceipt = await BuyingService.submitPurchaseReceipt(sanitizedId, firmId, userId);

  res.json({
    success: true,
    message: 'Purchase receipt submitted successfully',
    data: purchaseReceipt
  });
});

// ============================================
// PURCHASE INVOICES
// ============================================

// Get all purchase invoices
const getPurchaseInvoices = asyncHandler(async (req, res) => {
  const firmId = req.user?.firmId || req.firmId;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const result = await BuyingService.getPurchaseInvoices(req.query, firmId);

  res.json({
    success: true,
    data: result.purchaseInvoices,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: result.pages
    }
  });
});

// Get purchase invoice by ID
const getPurchaseInvoiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const firmId = req.user?.firmId || req.firmId;

  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('Invalid purchase invoice ID format', 400);
  }

  const purchaseInvoice = await BuyingService.getPurchaseInvoiceById(sanitizedId, firmId);

  if (!purchaseInvoice) {
    throw CustomException('Purchase invoice not found', 404);
  }

  res.json({
    success: true,
    data: purchaseInvoice
  });
});

// Create purchase invoice
const createPurchaseInvoice = asyncHandler(async (req, res) => {
  const firmId = req.user?.firmId || req.firmId;
  const userId = req.userID;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const filteredData = pickAllowedFields(req.body, PURCHASE_INVOICE_CREATE_FIELDS);

  // Validate required fields
  if (!filteredData.supplierId) {
    throw CustomException('Supplier ID is required', 400);
  }
  if (!filteredData.items || filteredData.items.length === 0) {
    throw CustomException('At least one item is required', 400);
  }

  const purchaseInvoice = await BuyingService.createPurchaseInvoice(filteredData, firmId, userId);

  res.status(201).json({
    success: true,
    message: 'Purchase invoice created successfully',
    data: purchaseInvoice
  });
});

// Submit purchase invoice
const submitPurchaseInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const firmId = req.user?.firmId || req.firmId;
  const userId = req.userID;

  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('Invalid purchase invoice ID format', 400);
  }

  const purchaseInvoice = await BuyingService.submitPurchaseInvoice(sanitizedId, firmId, userId);

  res.json({
    success: true,
    message: 'Purchase invoice submitted successfully',
    data: purchaseInvoice
  });
});

// ============================================
// MATERIAL REQUESTS
// ============================================

// Get all material requests
const getMaterialRequests = asyncHandler(async (req, res) => {
  const firmId = req.user?.firmId || req.firmId;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const result = await BuyingService.getMaterialRequests(req.query, firmId);

  res.json({
    success: true,
    data: result.materialRequests,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: result.pages
    }
  });
});

// Get material request by ID
const getMaterialRequestById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const firmId = req.user?.firmId || req.firmId;

  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('Invalid material request ID format', 400);
  }

  const materialRequest = await BuyingService.getMaterialRequestById(sanitizedId, firmId);

  if (!materialRequest) {
    throw CustomException('Material request not found', 404);
  }

  res.json({
    success: true,
    data: materialRequest
  });
});

// Create material request
const createMaterialRequest = asyncHandler(async (req, res) => {
  const firmId = req.user?.firmId || req.firmId;
  const userId = req.userID;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const filteredData = pickAllowedFields(req.body, MATERIAL_REQUEST_CREATE_FIELDS);

  // Validate required fields
  if (!filteredData.requestType) {
    throw CustomException('Request type is required', 400);
  }
  if (!filteredData.items || filteredData.items.length === 0) {
    throw CustomException('At least one item is required', 400);
  }

  const materialRequest = await BuyingService.createMaterialRequest(filteredData, firmId, userId);

  res.status(201).json({
    success: true,
    message: 'Material request created successfully',
    data: materialRequest
  });
});

// ============================================
// RFQs (Request for Quotations)
// ============================================

// Get all RFQs
const getRFQs = asyncHandler(async (req, res) => {
  const firmId = req.user?.firmId || req.firmId;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const result = await BuyingService.getRFQs(req.query, firmId);

  res.json({
    success: true,
    data: result.rfqs,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: result.pages
    }
  });
});

// Get RFQ by ID
const getRFQById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const firmId = req.user?.firmId || req.firmId;

  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('Invalid RFQ ID format', 400);
  }

  const rfq = await BuyingService.getRFQById(sanitizedId, firmId);

  if (!rfq) {
    throw CustomException('RFQ not found', 404);
  }

  res.json({
    success: true,
    data: rfq
  });
});

// Create RFQ
const createRFQ = asyncHandler(async (req, res) => {
  const firmId = req.user?.firmId || req.firmId;
  const userId = req.userID;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const filteredData = pickAllowedFields(req.body, RFQ_CREATE_FIELDS);

  // Validate required fields
  if (!filteredData.items || filteredData.items.length === 0) {
    throw CustomException('At least one item is required', 400);
  }
  if (!filteredData.suppliers || filteredData.suppliers.length === 0) {
    throw CustomException('At least one supplier is required', 400);
  }

  const rfq = await BuyingService.createRFQ(filteredData, firmId, userId);

  res.status(201).json({
    success: true,
    message: 'RFQ created successfully',
    data: rfq
  });
});

// Update RFQ
const updateRFQ = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const firmId = req.user?.firmId || req.firmId;
  const userId = req.userID;

  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('Invalid RFQ ID format', 400);
  }

  const filteredData = pickAllowedFields(req.body, RFQ_UPDATE_FIELDS);

  const rfq = await BuyingService.updateRFQ(sanitizedId, filteredData, firmId, userId);

  res.json({
    success: true,
    message: 'RFQ updated successfully',
    data: rfq
  });
});

// Submit RFQ
const submitRFQ = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const firmId = req.user?.firmId || req.firmId;
  const userId = req.userID;

  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('Invalid RFQ ID format', 400);
  }

  const rfq = await BuyingService.submitRFQ(sanitizedId, firmId, userId);

  res.json({
    success: true,
    message: 'RFQ submitted successfully',
    data: rfq
  });
});

// Delete RFQ
const deleteRFQ = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const firmId = req.user?.firmId || req.firmId;

  const sanitizedId = sanitizeObjectId(id);
  if (!sanitizedId) {
    throw CustomException('Invalid RFQ ID format', 400);
  }

  await BuyingService.deleteRFQ(sanitizedId, firmId);

  res.json({
    success: true,
    message: 'RFQ deleted successfully'
  });
});

// ============================================
// STATS & SETTINGS
// ============================================

// Get buying statistics
const getStats = asyncHandler(async (req, res) => {
  const firmId = req.user?.firmId || req.firmId;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const stats = await BuyingService.getStats(firmId);

  res.json({
    success: true,
    data: stats
  });
});

// Get buying settings
const getSettings = asyncHandler(async (req, res) => {
  const firmId = req.user?.firmId || req.firmId;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const settings = await BuyingService.getSettings(firmId);

  res.json({
    success: true,
    data: settings
  });
});

// Update buying settings
const updateSettings = asyncHandler(async (req, res) => {
  const firmId = req.user?.firmId || req.firmId;
  const userId = req.userID;

  if (!firmId) {
    throw CustomException('Firm ID is required', 400);
  }

  const filteredData = pickAllowedFields(req.body, BUYING_SETTINGS_UPDATE_FIELDS);

  const settings = await BuyingService.updateSettings(filteredData, firmId, userId);

  res.json({
    success: true,
    message: 'Settings updated successfully',
    data: settings
  });
});

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Suppliers
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierGroups,

  // Purchase Orders
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  deletePurchaseOrder,

  // Purchase Receipts
  getPurchaseReceipts,
  getPurchaseReceiptById,
  createPurchaseReceipt,
  submitPurchaseReceipt,

  // Purchase Invoices
  getPurchaseInvoices,
  getPurchaseInvoiceById,
  createPurchaseInvoice,
  submitPurchaseInvoice,

  // Material Requests
  getMaterialRequests,
  getMaterialRequestById,
  createMaterialRequest,

  // RFQs
  getRFQs,
  getRFQById,
  createRFQ,
  updateRFQ,
  submitRFQ,
  deleteRFQ,

  // Stats & Settings
  getStats,
  getSettings,
  updateSettings
};
