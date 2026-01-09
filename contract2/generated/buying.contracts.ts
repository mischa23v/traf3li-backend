/**
 * Buying API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { Buying } from './models';

// Standard Response Types
export type BuyingResponse = ApiResponse<Buying>;
export type BuyingListResponse = PaginatedResponse<Buying>;

// From: itemSchema
export interface ItemRequest {
  itemId: string;
  itemName: string;
  description?: string;
  quantity: number;
  rate: number;
  uom: string;
  amount: number;
  taxable?: boolean;
}

// From: addressSchema
export interface AddressRequest {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

// From: createSupplierSchema
export interface CreateSupplierRequest {
  name: string;
  supplierType: string;
  supplierGroup?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  website?: string;
  paymentTerms: string;
  currency?: string;
  creditLimit?: number;
  isActive?: boolean;
  notes?: string;
  tags: any[];
}

// From: updateSupplierSchema
export interface UpdateSupplierRequest {
  name: string;
  supplierType: string;
  supplierGroup?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  website?: string;
  paymentTerms: string;
  currency: string;
  creditLimit: number;
  isActive: boolean;
  notes?: string;
  tags: any[];
}

// From: createPurchaseOrderSchema
export interface CreatePurchaseOrderRequest {
  supplierId: string;
  orderDate: string;
  expectedDeliveryDate: string;
  items: ItemItem[];
  currency?: string;
  taxRate?: number;
  discountType: string;
  discountValue?: number;
  notes?: string;
  termsAndConditions?: string;
}

// From: createPurchaseReceiptSchema
export interface CreatePurchaseReceiptRequest {
  supplierId: string;
  purchaseOrderId: string;
  receiptDate?: string;
  items: ItemItem[];
  notes?: string;
  rejectedItems: any[];
  itemId: string;
  quantity: number;
  reason: string;
}

// From: createPurchaseInvoiceSchema
export interface CreatePurchaseInvoiceRequest {
  supplierId: string;
  purchaseOrderId?: string;
  invoiceNumber: string;
  invoiceDate?: string;
  dueDate: string;
  items: ItemItem[];
  currency?: string;
  taxRate?: number;
  notes?: string;
}

// From: createMaterialRequestSchema
export interface CreateMaterialRequestRequest {
  requestType: string;
  requestDate?: string;
  requiredBy: string;
  items: ItemItem[];
  requestedBy: string;
  department: string;
  purpose: string;
  notes?: string;
}

// From: createRFQSchema
export interface CreateRFQRequest {
  rfqDate?: string;
  responseDeadline: string;
  items: ItemItem[];
  suppliers: string;
  termsAndConditions?: string;
  notes?: string;
}

// From: updateRFQSchema
export interface UpdateRFQRequest {
  rfqDate: string;
  responseDeadline: string;
  items: ItemItem[];
  suppliers: string;
  termsAndConditions?: string;
  notes?: string;
}

// From: updateSettingsSchema
export interface UpdateSettingsRequest {
  autoGeneratePO: boolean;
  defaultCurrency: string;
  defaultTaxRate: number;
  defaultPaymentTerms: string;
  requireApprovalForPO: boolean;
  approvalThreshold: number;
  allowBackdatedPO: boolean;
  notifyOnLowStock: boolean;
  lowStockThreshold: number;
}
