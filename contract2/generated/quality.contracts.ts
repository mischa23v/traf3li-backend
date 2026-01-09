/**
 * Quality API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { Quality } from './models';

// Standard Response Types
export type QualityResponse = ApiResponse<Quality>;
export type QualityListResponse = PaginatedResponse<Quality>;

// From: inspectionReadingSchema
export interface InspectionReadingRequest {
  parameter: string;
  value: any;
  unit?: string;
  result: string;
}

// From: templateParameterSchema
export interface TemplateParameterRequest {
  parameterName: string;
  parameterNameAr?: string;
  dataType: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  acceptableCriteria?: string;
  mandatory?: boolean;
}

// From: createInspectionSchema
export interface CreateInspectionRequest {
  referenceType: string;
  referenceId: string;
  referenceNumber?: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  batchNo?: string;
  inspectionType: string;
  sampleSize: number;
  inspectionDate: string;
  templateId?: string;
  readings?: InspectionReadingItem[];
  acceptedQty?: number;
  rejectedQty?: number;
  remarks?: string;
}

// From: updateInspectionSchema
export interface UpdateInspectionRequest {
  sampleSize: number;
  inspectionDate: string;
  readings: InspectionReadingItem[];
  acceptedQty: number;
  rejectedQty: number;
  remarks?: string;
  status: string;
}

// From: createTemplateSchema
export interface CreateTemplateRequest {
  name: string;
  nameAr?: string;
  description?: string;
  itemId?: string;
  itemGroup?: string;
  parameters: TemplateParameterItem[];
  isActive?: boolean;
}

// From: updateTemplateSchema
export interface UpdateTemplateRequest {
  name: string;
  nameAr?: string;
  description?: string;
  itemId?: string;
  itemGroup?: string;
  parameters: TemplateParameterItem[];
  isActive: boolean;
}

// From: createActionSchema
export interface CreateActionRequest {
  actionType: string;
  inspectionId?: string;
  itemId?: string;
  problem: string;
  rootCause?: string;
  action: string;
  responsiblePerson: string;
  targetDate: string;
  remarks?: string;
}

// From: updateActionSchema
export interface UpdateActionRequest {
  problem: string;
  rootCause?: string;
  action: string;
  responsiblePerson: string;
  targetDate: string;
  completionDate?: string;
  status: string;
  verification?: string;
  verifiedBy?: string;
  verifiedDate?: string;
  remarks?: string;
}

// From: updateSettingsSchema
export interface UpdateSettingsRequest {
  autoInspectionOnReceipt: boolean;
  defaultTemplateId?: string;
  failedInspectionAction: string;
  enableBatchTracking: boolean;
  inspectionThresholds: Record<string, any>;
  enableNotifications: boolean;
  notifyOnFailure: boolean;
  notifyOnActionDue: boolean;
  notifyOnActionOverdue: boolean;
  enableScoring: boolean;
  scoringMethod: string;
  requirePhotos: boolean;
  requireSignatures: boolean;
  attachmentTypes: any[];
  syncWithInventory: boolean;
  syncWithPurchase: boolean;
  syncWithProduction: boolean;
}
