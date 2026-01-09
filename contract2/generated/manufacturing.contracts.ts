/**
 * Manufacturing API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { Manufacturing } from './models';

// Standard Response Types
export type ManufacturingResponse = ApiResponse<Manufacturing>;
export type ManufacturingListResponse = PaginatedResponse<Manufacturing>;

// From: bomItemSchema
export interface BomItemRequest {
  quantity: number;
  uom: string;
  scrapRate?: number;
  notes?: string;
}

// From: operationSchema
export interface OperationRequest {
  name: string;
  sequence: number;
  estimatedTime: number;
  description?: string;
  instructions?: string;
}

// From: createBOMSchema
export interface CreateBOMRequest {
  quantity: number;
  uom: string;
  items: BomItemItem[];
  operations: OperationItem[];
  isActive?: boolean;
  isDefault?: boolean;
  description?: string;
  notes?: string;
}

// From: updateBOMSchema
export interface UpdateBOMRequest {
  quantity: number;
  uom: string;
  items: BomItemItem[];
  operations: OperationItem[];
  isActive: boolean;
  isDefault: boolean;
  description?: string;
  notes?: string;
}

// From: createWorkstationSchema
export interface CreateWorkstationRequest {
  name: string;
  code: string;
  type: string;
  capacity: number;
  location: string;
  isActive?: boolean;
  hourlyRate: number;
  description?: string;
  notes?: string;
}

// From: updateWorkstationSchema
export interface UpdateWorkstationRequest {
  name: string;
  code: string;
  type: string;
  capacity: number;
  location: string;
  isActive: boolean;
  hourlyRate: number;
  description?: string;
  notes?: string;
}

// From: createWorkOrderSchema
export interface CreateWorkOrderRequest {
  qty: number;
  plannedStartDate: string;
  priority: string;
  notes?: string;
  expectedCompletionDate: string;
}

// From: updateWorkOrderSchema
export interface UpdateWorkOrderRequest {
  qty: number;
  plannedStartDate: string;
  priority: string;
  status: string;
  notes?: string;
  expectedCompletionDate: string;
}

// From: createJobCardSchema
export interface CreateJobCardRequest {
  plannedStartDate: string;
  plannedEndDate: string;
  notes?: string;
}

// From: updateJobCardSchema
export interface UpdateJobCardRequest {
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  status: string;
  notes?: string;
  completionNotes?: string;
}

// From: updateSettingsSchema
export interface UpdateSettingsRequest {
  autoCreateJobCards: boolean;
  allowOverProduction: boolean;
  trackOperationTime: boolean;
  requireMaterialTransfer: boolean;
  enableQualityChecks: boolean;
  materialRequestApproval: boolean;
  workOrderPrefix: string;
  jobCardPrefix: string;
  bomPrefix: string;
}
