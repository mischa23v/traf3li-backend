/**
 * MongoDB ERP Index Optimization Script
 *
 * Creates optimized indexes for ERPNext-style modules (Inventory, Buying, Manufacturing, etc.).
 * This script is idempotent - running multiple times will not create duplicate indexes.
 *
 * Usage: npm run db:indexes:erp
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
        logger.info('MongoDB connected for ERP index creation...');
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

/**
 * Index definitions for each ERP collection
 * Format: { collection: 'name', indexes: [{ keys, options }] }
 */
const indexDefinitions = [
    // ═══════════════════════════════════════════════════════════════
    // INVENTORY MODULE - Item Management
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'items',
        indexes: [
            // Unique item code
            { keys: { itemCode: 1 }, options: { name: 'idx_itemcode', unique: true } },

            // Multi-tenancy & core queries
            { keys: { firmId: 1, status: 1, itemType: 1 }, options: { name: 'idx_firm_status_type' } },
            { keys: { firmId: 1, itemGroup: 1 }, options: { name: 'idx_firm_itemgroup' } },
            { keys: { firmId: 1, itemType: 1 }, options: { name: 'idx_firm_type' } },

            // Inventory tracking
            { keys: { firmId: 1, status: 1 }, options: { name: 'idx_firm_status' } },
            { keys: { firmId: 1, 'inventory.hasSerial': 1 }, options: { name: 'idx_firm_serial' } },
            { keys: { firmId: 1, 'inventory.hasBatch': 1 }, options: { name: 'idx_firm_batch' } },

            // Default suppliers and warehouses
            { keys: { firmId: 1, defaultSupplier: 1 }, options: { name: 'idx_firm_supplier', sparse: true } },
            { keys: { firmId: 1, defaultWarehouse: 1 }, options: { name: 'idx_firm_warehouse', sparse: true } },

            // Full-text search
            { keys: { name: 'text', description: 'text', itemCode: 'text' }, options: { name: 'idx_item_textsearch' } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // INVENTORY MODULE - Warehouse Management
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'warehouses',
        indexes: [
            // Unique warehouse name per firm
            { keys: { firmId: 1, name: 1 }, options: { name: 'idx_firm_name', unique: true } },

            // Core queries
            { keys: { firmId: 1, status: 1 }, options: { name: 'idx_firm_status' } },
            { keys: { firmId: 1, warehouseType: 1 }, options: { name: 'idx_firm_type' } },
            { keys: { firmId: 1, isDefault: 1 }, options: { name: 'idx_firm_default' } },

            // Parent-child hierarchy
            { keys: { firmId: 1, parentWarehouse: 1 }, options: { name: 'idx_firm_parent', sparse: true } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // INVENTORY MODULE - Stock Entry
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'stockentries',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, postingDate: -1, status: 1 }, options: { name: 'idx_firm_date_status' } },
            { keys: { firmId: 1, stockEntryType: 1, status: 1 }, options: { name: 'idx_firm_type_status' } },
            { keys: { firmId: 1, status: 1 }, options: { name: 'idx_firm_status' } },

            // Date queries
            { keys: { firmId: 1, postingDate: -1 }, options: { name: 'idx_firm_date' } },
            { keys: { postingDate: -1, status: 1 }, options: { name: 'idx_date_status' } },

            // Reference documents
            { keys: { firmId: 1, referenceType: 1, referenceId: 1 }, options: { name: 'idx_firm_ref', sparse: true } },

            // Warehouse tracking
            { keys: { firmId: 1, 'items.sourceWarehouse': 1 }, options: { name: 'idx_firm_sourcewarehouse', sparse: true } },
            { keys: { firmId: 1, 'items.targetWarehouse': 1 }, options: { name: 'idx_firm_targetwarehouse', sparse: true } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // INVENTORY MODULE - Stock Ledger
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'stockledger',
        indexes: [
            // Core inventory tracking
            { keys: { firmId: 1, itemId: 1, warehouseId: 1, postingDate: -1 }, options: { name: 'idx_firm_item_warehouse_date' } },
            { keys: { firmId: 1, itemId: 1, postingDate: -1 }, options: { name: 'idx_firm_item_date' } },
            { keys: { firmId: 1, warehouseId: 1, postingDate: -1 }, options: { name: 'idx_firm_warehouse_date' } },

            // Voucher tracking
            { keys: { firmId: 1, voucherType: 1, voucherId: 1 }, options: { name: 'idx_firm_voucher' } },
            { keys: { voucherId: 1, postingDate: -1 }, options: { name: 'idx_voucher_date' } },

            // Batch and serial tracking
            { keys: { firmId: 1, batchId: 1 }, options: { name: 'idx_firm_batch', sparse: true } },
            { keys: { firmId: 1, serialNumberId: 1 }, options: { name: 'idx_firm_serial', sparse: true } },

            // Stock balance queries
            { keys: { firmId: 1, itemId: 1, warehouseId: 1, postingDate: -1, postingTime: -1 }, options: { name: 'idx_firm_item_warehouse_datetime' } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // INVENTORY MODULE - Bins
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'bins',
        indexes: [
            // Unique bin per item and warehouse
            { keys: { firmId: 1, itemId: 1, warehouseId: 1 }, options: { name: 'idx_firm_item_warehouse', unique: true } },

            // Core queries
            { keys: { firmId: 1, warehouseId: 1 }, options: { name: 'idx_firm_warehouse' } },
            { keys: { firmId: 1, itemId: 1 }, options: { name: 'idx_firm_item' } },

            // Stock availability
            { keys: { firmId: 1, warehouseId: 1, actualQty: -1 }, options: { name: 'idx_firm_warehouse_qty' } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // INVENTORY MODULE - Batches
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'batches',
        indexes: [
            // Batch tracking
            { keys: { firmId: 1, itemId: 1, batchNo: 1 }, options: { name: 'idx_firm_item_batch', unique: true } },
            { keys: { firmId: 1, batchNo: 1 }, options: { name: 'idx_firm_batch' } },

            // Expiry tracking
            { keys: { firmId: 1, itemId: 1, expiryDate: 1 }, options: { name: 'idx_firm_item_expiry', sparse: true } },
            { keys: { firmId: 1, expiryDate: 1 }, options: { name: 'idx_firm_expiry', sparse: true } },

            // Manufacturing tracking
            { keys: { firmId: 1, manufacturingDate: 1 }, options: { name: 'idx_firm_mfgdate', sparse: true } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // INVENTORY MODULE - Serial Numbers
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'serialnumbers',
        indexes: [
            // Unique serial number per firm
            { keys: { firmId: 1, serialNo: 1 }, options: { name: 'idx_firm_serial', unique: true } },

            // Item tracking
            { keys: { firmId: 1, itemId: 1, status: 1 }, options: { name: 'idx_firm_item_status' } },
            { keys: { firmId: 1, itemId: 1 }, options: { name: 'idx_firm_item' } },

            // Warehouse location
            { keys: { firmId: 1, warehouseId: 1, status: 1 }, options: { name: 'idx_firm_warehouse_status', sparse: true } },

            // Purchase tracking
            { keys: { firmId: 1, purchaseDocument: 1, purchaseDocumentId: 1 }, options: { name: 'idx_firm_purchase', sparse: true } },

            // Delivery tracking
            { keys: { firmId: 1, deliveryDocument: 1, deliveryDocumentId: 1 }, options: { name: 'idx_firm_delivery', sparse: true } },

            // Warranty tracking
            { keys: { firmId: 1, warrantyExpiryDate: 1 }, options: { name: 'idx_firm_warranty', sparse: true } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // BUYING MODULE - Suppliers
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'suppliers',
        indexes: [
            // Unique supplier name per firm
            { keys: { firmId: 1, name: 1 }, options: { name: 'idx_firm_name', unique: true } },

            // Core queries
            { keys: { firmId: 1, status: 1, supplierGroup: 1 }, options: { name: 'idx_firm_status_group' } },
            { keys: { firmId: 1, status: 1 }, options: { name: 'idx_firm_status' } },
            { keys: { firmId: 1, supplierGroup: 1 }, options: { name: 'idx_firm_group' } },

            // Contact information
            { keys: { email: 1 }, options: { name: 'idx_email', sparse: true } },
            { keys: { phone: 1 }, options: { name: 'idx_phone', sparse: true } },

            // Tax and regulatory
            { keys: { taxId: 1 }, options: { name: 'idx_taxid', sparse: true } },

            // Full-text search
            { keys: { name: 'text', supplierGroup: 'text' }, options: { name: 'idx_supplier_textsearch' } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // BUYING MODULE - Purchase Orders
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'purchaseorders',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, supplierId: 1, status: 1 }, options: { name: 'idx_firm_supplier_status' } },
            { keys: { firmId: 1, orderDate: -1 }, options: { name: 'idx_firm_orderdate' } },
            { keys: { firmId: 1, status: 1, orderDate: -1 }, options: { name: 'idx_firm_status_date' } },

            // Supplier tracking
            { keys: { supplierId: 1, status: 1 }, options: { name: 'idx_supplier_status' } },
            { keys: { supplierId: 1, orderDate: -1 }, options: { name: 'idx_supplier_date' } },

            // Delivery tracking
            { keys: { firmId: 1, deliveryDate: 1, status: 1 }, options: { name: 'idx_firm_delivery_status', sparse: true } },

            // Material request reference
            { keys: { firmId: 1, materialRequestId: 1 }, options: { name: 'idx_firm_mr', sparse: true } },

            // Order number
            { keys: { orderNumber: 1 }, options: { name: 'idx_ordernumber', unique: true } },

            // Billing status
            { keys: { firmId: 1, billingStatus: 1 }, options: { name: 'idx_firm_billing' } },
            { keys: { firmId: 1, receivingStatus: 1 }, options: { name: 'idx_firm_receiving' } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // BUYING MODULE - Material Requests
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'materialrequests',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, status: 1, transactionDate: -1 }, options: { name: 'idx_firm_status_date' } },
            { keys: { firmId: 1, materialRequestType: 1, status: 1 }, options: { name: 'idx_firm_type_status' } },
            { keys: { firmId: 1, transactionDate: -1 }, options: { name: 'idx_firm_date' } },

            // Requester tracking
            { keys: { firmId: 1, requestedBy: 1, status: 1 }, options: { name: 'idx_firm_requester_status' } },

            // Required by date
            { keys: { firmId: 1, requiredBy: 1, status: 1 }, options: { name: 'idx_firm_required_status', sparse: true } },

            // Reference tracking
            { keys: { firmId: 1, referenceType: 1, referenceId: 1 }, options: { name: 'idx_firm_ref', sparse: true } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // BUYING MODULE - Request for Quotations (RFQ)
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'rfqs',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, status: 1 }, options: { name: 'idx_firm_status' } },
            { keys: { firmId: 1, transactionDate: -1 }, options: { name: 'idx_firm_date' } },
            { keys: { firmId: 1, status: 1, transactionDate: -1 }, options: { name: 'idx_firm_status_date' } },

            // Supplier tracking
            { keys: { firmId: 1, 'suppliers.supplierId': 1 }, options: { name: 'idx_firm_suppliers' } },

            // Material request reference
            { keys: { firmId: 1, materialRequestId: 1 }, options: { name: 'idx_firm_mr', sparse: true } },

            // Response tracking
            { keys: { firmId: 1, 'suppliers.responded': 1 }, options: { name: 'idx_firm_responded' } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // SUPPORT MODULE - Tickets
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'tickets',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, status: 1, priority: 1 }, options: { name: 'idx_firm_status_priority' } },
            { keys: { firmId: 1, assignedTo: 1, status: 1 }, options: { name: 'idx_firm_assigned_status' } },
            { keys: { firmId: 1, raisedBy: 1 }, options: { name: 'idx_firm_raisedby' } },
            { keys: { firmId: 1, status: 1, createdAt: -1 }, options: { name: 'idx_firm_status_created' } },

            // SLA tracking
            { keys: { firmId: 1, slaStatus: 1, firstResponseDue: 1 }, options: { name: 'idx_firm_sla_response', sparse: true } },
            { keys: { firmId: 1, slaStatus: 1, resolutionDue: 1 }, options: { name: 'idx_firm_sla_resolution', sparse: true } },
            { keys: { firmId: 1, slaStatus: 1 }, options: { name: 'idx_firm_sla' } },

            // Assignment tracking
            { keys: { assignedTo: 1, status: 1 }, options: { name: 'idx_assigned_status', sparse: true } },
            { keys: { raisedBy: 1, status: 1 }, options: { name: 'idx_raisedby_status' } },

            // Category and type
            { keys: { firmId: 1, category: 1, status: 1 }, options: { name: 'idx_firm_category_status' } },
            { keys: { firmId: 1, ticketType: 1 }, options: { name: 'idx_firm_type' } },

            // Reference tracking
            { keys: { firmId: 1, referenceType: 1, referenceId: 1 }, options: { name: 'idx_firm_ref', sparse: true } },

            // Full-text search
            { keys: { subject: 'text', description: 'text' }, options: { name: 'idx_ticket_textsearch' } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // QUALITY MODULE - Quality Inspections
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'qualityinspections',
        indexes: [
            // Reference tracking
            { keys: { firmId: 1, referenceType: 1, referenceId: 1 }, options: { name: 'idx_firm_ref' } },
            { keys: { firmId: 1, itemId: 1, inspectionDate: -1 }, options: { name: 'idx_firm_item_date' } },
            { keys: { firmId: 1, status: 1 }, options: { name: 'idx_firm_status' } },

            // Item tracking
            { keys: { itemId: 1, inspectionDate: -1 }, options: { name: 'idx_item_date' } },
            { keys: { firmId: 1, itemId: 1, status: 1 }, options: { name: 'idx_firm_item_status' } },

            // Inspector tracking
            { keys: { firmId: 1, inspectedBy: 1, inspectionDate: -1 }, options: { name: 'idx_firm_inspector_date' } },

            // Quality status
            { keys: { firmId: 1, qualityStatus: 1 }, options: { name: 'idx_firm_quality' } },
            { keys: { firmId: 1, qualityStatus: 1, inspectionDate: -1 }, options: { name: 'idx_firm_quality_date' } },

            // Batch and serial tracking
            { keys: { firmId: 1, batchId: 1 }, options: { name: 'idx_firm_batch', sparse: true } },
            { keys: { firmId: 1, serialNumberId: 1 }, options: { name: 'idx_firm_serial', sparse: true } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // QUALITY MODULE - Quality Actions
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'qualityactions',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, status: 1, targetDate: 1 }, options: { name: 'idx_firm_status_target' } },
            { keys: { firmId: 1, actionType: 1, status: 1 }, options: { name: 'idx_firm_type_status' } },
            { keys: { firmId: 1, status: 1 }, options: { name: 'idx_firm_status' } },

            // Assignment tracking
            { keys: { firmId: 1, assignedTo: 1, status: 1 }, options: { name: 'idx_firm_assigned_status' } },
            { keys: { assignedTo: 1, status: 1, targetDate: 1 }, options: { name: 'idx_assigned_status_date' } },

            // Quality inspection reference
            { keys: { firmId: 1, qualityInspectionId: 1 }, options: { name: 'idx_firm_inspection', sparse: true } },

            // Completion tracking
            { keys: { firmId: 1, completionDate: 1 }, options: { name: 'idx_firm_completion', sparse: true } },

            // Overdue actions
            { keys: { status: 1, targetDate: 1 }, options: { name: 'idx_status_target' } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // MANUFACTURING MODULE - Bill of Materials (BOM)
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'boms',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, itemId: 1, isDefault: 1 }, options: { name: 'idx_firm_item_default' } },
            { keys: { firmId: 1, itemId: 1, status: 1 }, options: { name: 'idx_firm_item_status' } },
            { keys: { firmId: 1, status: 1 }, options: { name: 'idx_firm_status' } },

            // Item tracking
            { keys: { itemId: 1, isDefault: 1 }, options: { name: 'idx_item_default' } },
            { keys: { itemId: 1, status: 1 }, options: { name: 'idx_item_status' } },

            // BOM components
            { keys: { firmId: 1, 'items.itemId': 1 }, options: { name: 'idx_firm_components' } },

            // Manufacturing parameters
            { keys: { firmId: 1, isActive: 1, isDefault: 1 }, options: { name: 'idx_firm_active_default' } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // MANUFACTURING MODULE - Work Orders
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'workorders',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, status: 1, plannedStartDate: 1 }, options: { name: 'idx_firm_status_start' } },
            { keys: { firmId: 1, itemId: 1 }, options: { name: 'idx_firm_item' } },
            { keys: { firmId: 1, status: 1 }, options: { name: 'idx_firm_status' } },

            // Item and BOM tracking
            { keys: { itemId: 1, status: 1 }, options: { name: 'idx_item_status' } },
            { keys: { firmId: 1, bomId: 1 }, options: { name: 'idx_firm_bom' } },

            // Date tracking
            { keys: { firmId: 1, plannedStartDate: 1, plannedEndDate: 1 }, options: { name: 'idx_firm_dates' } },
            { keys: { firmId: 1, actualStartDate: 1 }, options: { name: 'idx_firm_actual_start', sparse: true } },
            { keys: { firmId: 1, actualEndDate: 1 }, options: { name: 'idx_firm_actual_end', sparse: true } },

            // Production planning
            { keys: { firmId: 1, productionItem: 1, status: 1 }, options: { name: 'idx_firm_prod_status' } },

            // Reference tracking
            { keys: { firmId: 1, referenceType: 1, referenceId: 1 }, options: { name: 'idx_firm_ref', sparse: true } },

            // Warehouse
            { keys: { firmId: 1, sourceWarehouse: 1 }, options: { name: 'idx_firm_source', sparse: true } },
            { keys: { firmId: 1, targetWarehouse: 1 }, options: { name: 'idx_firm_target', sparse: true } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // MANUFACTURING MODULE - Job Cards
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'jobcards',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, workOrderId: 1, status: 1 }, options: { name: 'idx_firm_wo_status' } },
            { keys: { firmId: 1, status: 1 }, options: { name: 'idx_firm_status' } },
            { keys: { firmId: 1, operation: 1, status: 1 }, options: { name: 'idx_firm_operation_status' } },

            // Work order tracking
            { keys: { workOrderId: 1, status: 1 }, options: { name: 'idx_wo_status' } },
            { keys: { workOrderId: 1, sequenceNo: 1 }, options: { name: 'idx_wo_sequence' } },

            // Workstation tracking
            { keys: { firmId: 1, workstation: 1, status: 1 }, options: { name: 'idx_firm_workstation_status' } },

            // Employee/operator tracking
            { keys: { firmId: 1, operator: 1, status: 1 }, options: { name: 'idx_firm_operator_status', sparse: true } },

            // Time tracking
            { keys: { firmId: 1, plannedStartDate: 1 }, options: { name: 'idx_firm_start', sparse: true } },
            { keys: { firmId: 1, actualStartDate: 1 }, options: { name: 'idx_firm_actual_start', sparse: true } },
            { keys: { firmId: 1, actualEndDate: 1 }, options: { name: 'idx_firm_actual_end', sparse: true } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // ASSETS MODULE - Assets
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'assets',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, assetCategory: 1, status: 1 }, options: { name: 'idx_firm_category_status' } },
            { keys: { firmId: 1, custodian: 1 }, options: { name: 'idx_firm_custodian' } },
            { keys: { firmId: 1, location: 1 }, options: { name: 'idx_firm_location' } },
            { keys: { firmId: 1, status: 1 }, options: { name: 'idx_firm_status' } },

            // Asset identification
            { keys: { assetCode: 1 }, options: { name: 'idx_assetcode', unique: true } },
            { keys: { firmId: 1, assetName: 1 }, options: { name: 'idx_firm_name' } },

            // Category tracking
            { keys: { assetCategory: 1, status: 1 }, options: { name: 'idx_category_status' } },

            // Custodian tracking
            { keys: { custodian: 1, status: 1 }, options: { name: 'idx_custodian_status', sparse: true } },

            // Purchase tracking
            { keys: { firmId: 1, purchaseDate: -1 }, options: { name: 'idx_firm_purchase', sparse: true } },
            { keys: { firmId: 1, purchaseInvoiceId: 1 }, options: { name: 'idx_firm_invoice', sparse: true } },

            // Depreciation
            { keys: { firmId: 1, 'depreciation.depreciationMethod': 1 }, options: { name: 'idx_firm_depr_method', sparse: true } },

            // Full-text search
            { keys: { assetName: 'text', assetCode: 'text', description: 'text' }, options: { name: 'idx_asset_textsearch' } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // ASSETS MODULE - Maintenance Schedules
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'maintenanceschedules',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, assetId: 1, nextMaintenanceDate: 1 }, options: { name: 'idx_firm_asset_next' } },
            { keys: { firmId: 1, status: 1, nextMaintenanceDate: 1 }, options: { name: 'idx_firm_status_next' } },
            { keys: { firmId: 1, nextMaintenanceDate: 1 }, options: { name: 'idx_firm_next' } },

            // Asset tracking
            { keys: { assetId: 1, status: 1 }, options: { name: 'idx_asset_status' } },
            { keys: { assetId: 1, nextMaintenanceDate: 1 }, options: { name: 'idx_asset_next' } },

            // Maintenance type
            { keys: { firmId: 1, maintenanceType: 1, status: 1 }, options: { name: 'idx_firm_type_status' } },

            // Recurring schedules
            { keys: { firmId: 1, frequency: 1, status: 1 }, options: { name: 'idx_firm_freq_status' } },

            // Assignment
            { keys: { firmId: 1, assignedTo: 1, status: 1 }, options: { name: 'idx_firm_assigned_status', sparse: true } },

            // Last maintenance tracking
            { keys: { firmId: 1, lastMaintenanceDate: 1 }, options: { name: 'idx_firm_last', sparse: true } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // SUBCONTRACTING MODULE - Subcontracting Orders
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'subcontractingorders',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, supplierId: 1, status: 1 }, options: { name: 'idx_firm_supplier_status' } },
            { keys: { firmId: 1, orderDate: -1 }, options: { name: 'idx_firm_date' } },
            { keys: { firmId: 1, status: 1, orderDate: -1 }, options: { name: 'idx_firm_status_date' } },

            // Supplier tracking
            { keys: { supplierId: 1, status: 1 }, options: { name: 'idx_supplier_status' } },
            { keys: { supplierId: 1, orderDate: -1 }, options: { name: 'idx_supplier_date' } },

            // Delivery tracking
            { keys: { firmId: 1, deliveryDate: 1, status: 1 }, options: { name: 'idx_firm_delivery_status', sparse: true } },

            // Reference tracking
            { keys: { firmId: 1, referenceType: 1, referenceId: 1 }, options: { name: 'idx_firm_ref', sparse: true } },

            // Order number
            { keys: { orderNumber: 1 }, options: { name: 'idx_ordernumber', unique: true } },

            // Item tracking
            { keys: { firmId: 1, 'finishedGoods.itemId': 1 }, options: { name: 'idx_firm_items' } }
        ]
    },

    // ═══════════════════════════════════════════════════════════════
    // SUBCONTRACTING MODULE - Subcontracting Receipts
    // ═══════════════════════════════════════════════════════════════
    {
        collection: 'subcontractingreceipts',
        indexes: [
            // Multi-tenancy & core queries
            { keys: { firmId: 1, subcontractingOrderId: 1 }, options: { name: 'idx_firm_order' } },
            { keys: { firmId: 1, postingDate: -1 }, options: { name: 'idx_firm_date' } },
            { keys: { firmId: 1, status: 1, postingDate: -1 }, options: { name: 'idx_firm_status_date' } },

            // Subcontracting order tracking
            { keys: { subcontractingOrderId: 1, postingDate: -1 }, options: { name: 'idx_order_date' } },

            // Supplier tracking
            { keys: { firmId: 1, supplierId: 1, postingDate: -1 }, options: { name: 'idx_firm_supplier_date' } },

            // Quality inspection
            { keys: { firmId: 1, qualityInspectionRequired: 1, status: 1 }, options: { name: 'idx_firm_qi_status' } },

            // Receipt number
            { keys: { receiptNumber: 1 }, options: { name: 'idx_receiptnumber', unique: true } }
        ]
    }
];

/**
 * Create indexes for a collection
 */
const createIndexesForCollection = async (collectionName, indexes) => {
    try {
        const collection = mongoose.connection.collection(collectionName);

        // Get existing indexes
        const existingIndexes = await collection.indexes();
        const existingIndexNames = new Set(existingIndexes.map(idx => idx.name));

        logger.info(`\n${'='.repeat(70)}`);
        logger.info(`Collection: ${collectionName}`);
        logger.info(`${'='.repeat(70)}`);
        logger.info(`Existing indexes: ${existingIndexNames.size}`);

        let created = 0;
        let skipped = 0;

        for (const { keys, options } of indexes) {
            const indexName = options.name;

            if (existingIndexNames.has(indexName)) {
                logger.info(`  ✓ ${indexName} - already exists`);
                skipped++;
            } else {
                try {
                    await collection.createIndex(keys, options);
                    logger.info(`  + ${indexName} - created`);
                    created++;
                } catch (error) {
                    logger.error(`  ✗ ${indexName} - error: ${error.message}`);
                }
            }
        }

        logger.info(`\nSummary: ${created} created, ${skipped} skipped`);

        return { created, skipped };

    } catch (error) {
        logger.error(`Error processing collection ${collectionName}:`, error.message);
        return { created: 0, skipped: 0 };
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
        logger.info('║' + ' MongoDB ERP Index Optimization Script'.padEnd(68) + '║');
        logger.info('╚' + '═'.repeat(68) + '╝');
        logger.info('\n');

        let totalCreated = 0;
        let totalSkipped = 0;

        // Process each collection
        for (const { collection, indexes } of indexDefinitions) {
            const { created, skipped } = await createIndexesForCollection(collection, indexes);
            totalCreated += created;
            totalSkipped += skipped;
        }

        // Final summary
        logger.info('\n');
        logger.info('╔' + '═'.repeat(68) + '╗');
        logger.info('║' + ' Final Summary'.padEnd(68) + '║');
        logger.info('╚' + '═'.repeat(68) + '╝');
        logger.info(`\nTotal indexes created: ${totalCreated}`);
        logger.info(`Total indexes skipped (already exist): ${totalSkipped}`);
        logger.info(`Total indexes processed: ${totalCreated + totalSkipped}`);
        logger.info('\n✅ ERP index optimization completed successfully!\n');

        process.exit(0);
    } catch (error) {
        logger.error('\n❌ ERP index optimization failed:', error);
        process.exit(1);
    }
};

// Run the script
main();
