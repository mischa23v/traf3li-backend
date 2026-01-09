/**
 * Subcontracting API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { Subcontracting } from './models';

// Standard Response Types
export type SubcontractingResponse = ApiResponse<Subcontracting>;
export type SubcontractingListResponse = PaginatedResponse<Subcontracting>;

// From: serviceItemSchema
export interface ServiceItemRequest {
  itemName: string;
  qty: number;
  rate: number;
  amount: number;
  uom: string;
}

// From: rawMaterialSchema
export interface RawMaterialRequest {
  itemName: string;
  requiredQty: number;
  sourceWarehouseName: string;
  uom: string;
  rate: number;
  amount: number;
}

// From: finishedGoodsSchema
export interface FinishedGoodsRequest {
  itemName: string;
  qty: number;
  targetWarehouseName: string;
  uom: string;
  rate: number;
  amount: number;
  receivedQty: number;
}

// From: materialMovementSchema
export interface MaterialMovementRequest {
  itemName: string;
  qty: number;
  uom: string;
}

// From: createOrderSchema
export interface CreateOrderRequest {
  supplierName: string;
  orderNumber: string;
  orderDate: string;
  requiredDate: string;
  serviceItems: ServiceItemItem[];
  rawMaterials: RawMaterialItem[];
  finishedGoods: FinishedGoodsItem[];
  remarks?: string;
  currency?: string;
}

// From: updateOrderSchema
export interface UpdateOrderRequest {
  supplierName: string;
  orderDate: string;
  requiredDate: string;
  serviceItems: ServiceItemItem[];
  rawMaterials: RawMaterialItem[];
  finishedGoods: FinishedGoodsItem[];
  remarks?: string;
  currency: string;
}

// From: createReceiptSchema
export interface CreateReceiptRequest {
  receiptNumber: string;
  postingDate?: string;
  postingTime?: string;
  finishedGoods: FinishedGoodsItem[];
  returnedMaterials: MaterialMovementItem[];
  consumedMaterials: MaterialMovementItem[];
  remarks?: string;
}

// From: updateSettingsSchema
export interface UpdateSettingsRequest {
  autoCreateReceipt: boolean;
  trackReturnedMaterials: boolean;
  requireQualityInspection: boolean;
}
