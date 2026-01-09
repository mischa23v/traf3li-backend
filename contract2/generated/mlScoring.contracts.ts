/**
 * MlScoring API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { MlScoring } from './models';

// Standard Response Types
export type MlScoringResponse = ApiResponse<MlScoring>;
export type MlScoringListResponse = PaginatedResponse<MlScoring>;

// From: getScoresQuerySchema
export interface GetScoresQueryRequest {
  page?: number;
  limit?: number;
  minScore: number;
  maxScore: number;
}

// From: batchCalculateSchema
export interface BatchCalculateRequest {
  leadIds: any[];
}

// From: recordContactSchema
export interface RecordContactRequest {
  contactType: string;
  notes?: string;
  duration: number;
}

// From: assignLeadSchema
export interface AssignLeadRequest {
  notes?: string;
}

// From: priorityQueueQuerySchema
export interface PriorityQueueQueryRequest {
  limit?: number;
  filterBy: string;
}

// From: dashboardQuerySchema
export interface DashboardQueryRequest {
  period?: number;
  groupBy: string;
}

// From: trainModelSchema
export interface TrainModelRequest {
  algorithm: string;
  testSize?: number;
  features: any[];
  hyperparameters: Record<string, any>;
}

// From: exportTrainingDataSchema
export interface ExportTrainingDataRequest {
  format: string;
  includeFeatures?: boolean;
  includeLabels?: boolean;
  dateFrom: string;
  dateTo: string;
}
