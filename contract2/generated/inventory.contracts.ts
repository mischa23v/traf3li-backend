/**
 * Inventory API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { Inventory } from './models';

// Standard Response Types
export type InventoryResponse = ApiResponse<Inventory>;
export type InventoryListResponse = PaginatedResponse<Inventory>;

// From: stockEntryItemSchema
export interface StockEntryItemRequest {
  itemId: string;
  qty: number;
  rate: number;
  batchNo?: string;
  serialNo?: string;
  expiryDate?: string;
}

// From: reconciliationItemSchema
export interface ReconciliationItemRequest {
  itemId: string;
  systemQty: number;
  actualQty: number;
  batchNo?: string;
  serialNo?: string;
}

// From: uomConversionSchema
export interface UomConversionRequest {
  uom: string;
  conversionFactor: number;
}

// From: createItemSchema
export interface CreateItemRequest {
  itemCode: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  itemType: string;
  itemGroup?: string;
  brand?: string;
  manufacturer?: string;
  sku?: string;
  barcode?: string;
  hsnCode?: string;
  stockUom: string;
  purchaseUom?: string;
  salesUom?: string;
  uomConversions: UomConversionItem[];
  standardRate: number;
  valuationRate: number;
  lastPurchaseRate: number;
  currency?: string;
  taxRate?: number;
  taxTemplateId?: string;
  isZeroRated?: boolean;
  isExempt?: boolean;
  isStockItem?: boolean;
  hasVariants?: boolean;
  hasBatchNo?: boolean;
  hasSerialNo?: boolean;
  hasExpiryDate?: boolean;
  shelfLifeInDays: number;
  warrantyPeriod: number;
  safetyStock?: number;
  reorderLevel?: number;
  reorderQty?: number;
  leadTimeDays?: number;
  valuationMethod: string;
  status: string;
  image?: string;
  images: any[];
  weightPerUnit: number;
  weightUom: string;
  defaultSupplier?: string;
  supplierItems: any[];
  supplierId: string;
  supplierItemCode: string;
  leadTimeDays: number;
  tags: any[];
  customFields: Record<string, any>;
}

// From: updateItemSchema
export interface UpdateItemRequest {
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  itemGroup?: string;
  brand?: string;
  manufacturer?: string;
  sku?: string;
  barcode?: string;
  hsnCode?: string;
  purchaseUom?: string;
  salesUom?: string;
  uomConversions: UomConversionItem[];
  standardRate: number;
  valuationRate: number;
  currency: string;
  taxRate: number;
  taxTemplateId?: string;
  isZeroRated: boolean;
  isExempt: boolean;
  hasVariants: boolean;
  hasBatchNo: boolean;
  hasSerialNo: boolean;
  hasExpiryDate: boolean;
  shelfLifeInDays: number;
  warrantyPeriod: number;
  safetyStock: number;
  reorderLevel: number;
  reorderQty: number;
  leadTimeDays: number;
  valuationMethod: string;
  status: string;
  disabled: boolean;
  image?: string;
  images: any[];
  weightPerUnit: number;
  weightUom: string;
  defaultSupplier?: string;
  supplierItems: any[];
  supplierId: string;
  supplierItemCode: string;
  leadTimeDays: number;
  tags: any[];
  customFields: Record<string, any>;
}

// From: createWarehouseSchema
export interface CreateWarehouseRequest {
  name: string;
  nameAr?: string;
  warehouseType: string;
  parentWarehouse?: string;
  isGroup?: boolean;
  company?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  contactPerson?: string;
  phone?: string;
  email?: string;
  isDefault?: boolean;
  accountId?: string;
}

// From: updateWarehouseSchema
export interface UpdateWarehouseRequest {
  name: string;
  nameAr?: string;
  warehouseType: string;
  parentWarehouse?: string;
  isGroup: boolean;
  company?: string;
  address?: string;
  city?: string;
  region?: string;
  country: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  contactPerson?: string;
  phone?: string;
  email?: string;
  isDefault: boolean;
  disabled: boolean;
  accountId?: string;
}

// From: createStockEntrySchema
export interface CreateStockEntryRequest {
  entryType: string;
  postingDate: string;
  postingTime: string;
  fromWarehouse: string;
  then: any;
  toWarehouse: string;
  then: any;
  items: StockEntryItemItem[];
  referenceType: string;
  referenceId?: string;
  purchaseOrderId?: string;
  salesOrderId?: string;
  remarks?: string;
  company?: string;
}

// From: createBatchSchema
export interface CreateBatchRequest {
  batchNo: string;
  itemId: string;
  warehouseId: string;
  qty: number;
  manufacturingDate?: string;
  expiryDate?: string;
  supplierBatchNo?: string;
  notes?: string;
}

// From: createSerialNumberSchema
export interface CreateSerialNumberRequest {
  serialNo: string;
  itemId: string;
  warehouseId: string;
  status: string;
  purchaseDate?: string;
  warrantyExpiryDate?: string;
  notes?: string;
}

// From: createReconciliationSchema
export interface CreateReconciliationRequest {
  warehouseId: string;
  reconciliationDate: string;
  items: ReconciliationItemItem[];
  remarks?: string;
}

// From: createItemGroupSchema
export interface CreateItemGroupRequest {
  name: string;
  nameAr?: string;
  parentGroup?: string;
  description?: string;
}

// From: createUomSchema
export interface CreateUomRequest {
  name: string;
  symbol?: string;
  description?: string;
}

// From: updateSettingsSchema
export interface UpdateSettingsRequest {
  defaultValuationMethod: string;
  autoGenerateItemCode: boolean;
  itemCodePrefix?: string;
  allowNegativeStock: boolean;
  enableBatchTracking: boolean;
  enableSerialTracking: boolean;
  enableExpiryTracking: boolean;
  defaultWarehouse?: string;
  lowStockThreshold: number;
  autoReorderEnabled: boolean;
}
