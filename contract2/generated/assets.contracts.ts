/**
 * Assets API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { Assets } from './models';

// Standard Response Types
export type AssetsResponse = ApiResponse<Assets>;
export type AssetsListResponse = PaginatedResponse<Assets>;

// From: createAssetSchema
export interface CreateAssetRequest {
  assetName: string;
  assetNameAr: string;
  description: string;
  serialNo: string;
  image: string;
  tags: any[];
  itemCode: string;
  isExistingAsset: boolean;
  location: string;
  custodianName: string;
  department: string;
  company: string;
  purchaseDate: string;
  supplierName: string;
  grossPurchaseAmount: number;
  purchaseReceiptAmount: number;
  currency?: string;
  assetQuantity?: number;
  availableForUseDate: string;
  depreciationMethod: string;
  totalNumberOfDepreciations: number;
  frequencyOfDepreciation: string;
  depreciationStartDate: string;
  expectedValueAfterUsefulLife: number;
  openingAccumulatedDepreciation: number;
  warrantyExpiryDate: string;
  insurer: string;
  policyNo: string;
  startDate: string;
  endDate: string;
  insuredValue: number;
  status: string;
}

// From: updateAssetSchema
export interface UpdateAssetRequest {
  assetName: string;
  assetNameAr: string;
  description: string;
  serialNo: string;
  image: string;
  tags: any[];
  itemCode: string;
  isExistingAsset: boolean;
  location: string;
  custodianName: string;
  department: string;
  company: string;
  purchaseDate: string;
  supplierName: string;
  grossPurchaseAmount: number;
  purchaseReceiptAmount: number;
  currency: string;
  assetQuantity: number;
  availableForUseDate: string;
  depreciationMethod: string;
  totalNumberOfDepreciations: number;
  frequencyOfDepreciation: string;
  depreciationStartDate: string;
  expectedValueAfterUsefulLife: number;
  openingAccumulatedDepreciation: number;
  warrantyExpiryDate: string;
  insurer: string;
  policyNo: string;
  startDate: string;
  endDate: string;
  insuredValue: number;
  status: string;
}

// From: createCategorySchema
export interface CreateCategoryRequest {
  name: string;
  nameAr: string;
  isGroup: boolean;
  depreciationMethod: string;
  totalNumberOfDepreciations: number;
  frequencyOfDepreciation: string;
  enableCwip: boolean;
  isActive: boolean;
}

// From: updateCategorySchema
export interface UpdateCategoryRequest {
  name: string;
  nameAr: string;
  isGroup: boolean;
  depreciationMethod: string;
  totalNumberOfDepreciations: number;
  frequencyOfDepreciation: string;
  enableCwip: boolean;
  isActive: boolean;
}

// From: createMaintenanceScheduleSchema
export interface CreateMaintenanceScheduleRequest {
  assetName: string;
  maintenanceType: string;
  frequency: string;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  assignToName: string;
  description: string;
  certificateRequired: boolean;
}

// From: updateMaintenanceScheduleSchema
export interface UpdateMaintenanceScheduleRequest {
  assetName: string;
  maintenanceType: string;
  frequency: string;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  assignToName: string;
  description: string;
  certificateRequired: boolean;
}

// From: createMovementSchema
export interface CreateMovementRequest {
  assetName: string;
  movementType: string;
  fromLocation: string;
  toLocation: string;
  quantity?: number;
  movementDate?: string;
  purpose: string;
  notes: string;
  attachments: any[];
}

// From: updateSettingsSchema
export interface UpdateSettingsRequest {
  enableDepreciation: boolean;
  defaultDepreciationMethod: string;
  defaultDepreciationFrequency: string;
  enableMaintenanceScheduling: boolean;
  maintenanceReminderDays: number;
  warrantyReminderDays: number;
  requireApprovalForDisposal: boolean;
  requireApprovalForTransfer: boolean;
  autoGenerateAssetNumber: boolean;
  assetNumberPrefix: string;
  assetNumberSeries: string;
  trackAssetLocation: boolean;
  trackAssetCustodian: boolean;
  enableQRCodeGeneration: boolean;
  enableBarcodeGeneration: boolean;
}
