/**
 * Integration API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { Integration } from './models';

// Standard Response Types
export type IntegrationResponse = ApiResponse<Integration>;
export type IntegrationListResponse = PaginatedResponse<Integration>;

// From: syncParamsSchema
export interface SyncParamsRequest {
  direction: string;
  startDate?: string;
  endDate?: string;
  fullSync?: boolean;
  overwriteExisting?: boolean;
  status?: any[];
  batchSize?: number;
}

// From: fieldMappingSchema
export interface FieldMappingRequest {
  entityType: string;
  mappings: Record<string, any>;
  sourceField: string;
  targetField: string;
  transform: string;
  defaultValue?: any;
}

// From: accountMappingSchema
export interface AccountMappingRequest {
  localAccountId: string;
  externalAccountId: string;
  accountType: string;
  notes?: string;
}

// From: conflictResolutionSchema
export interface ConflictResolutionRequest {
  strategy: string;
  mergedData: Record<string, any>;
  is: string;
  then: any;
  otherwise: any;
  applyToAll?: boolean;
  notes?: string;
}
