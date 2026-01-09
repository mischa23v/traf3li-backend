/**
 * LegalContract API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/legalContract/search
export interface LegalContractListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LegalContractListResponse = PaginatedResponse<LegalContract>;

// GET /api/legalContract/expiring
export interface LegalContractListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LegalContractListResponse = PaginatedResponse<LegalContract>;

// GET /api/legalContract/statistics
export interface LegalContractListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LegalContractListResponse = PaginatedResponse<LegalContract>;

// GET /api/legalContract/client/:clientId
export interface LegalContractListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LegalContractListResponse = PaginatedResponse<LegalContract>;

// GET /api/legalContract/templates
export interface LegalContractListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LegalContractListResponse = PaginatedResponse<LegalContract>;

// POST /api/legalContract/templates/:templateId/use
export interface CreateLegalContractRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLegalContractResponse = ApiResponse<LegalContract>;

// GET /api/legalContract
export interface LegalContractListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LegalContractListResponse = PaginatedResponse<LegalContract>;

// POST /api/legalContract
export interface CreateLegalContractRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLegalContractResponse = ApiResponse<LegalContract>;

// GET /api/legalContract/:contractId
export interface LegalContractListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LegalContractListResponse = PaginatedResponse<LegalContract>;

// PATCH /api/legalContract/:contractId
export interface UpdateLegalContractRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateLegalContractResponse = ApiResponse<LegalContract>;

// DELETE /api/legalContract/:contractId
export type DeleteLegalContractResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/legalContract/:contractId/parties
export interface CreateLegalContractRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLegalContractResponse = ApiResponse<LegalContract>;

// PATCH /api/legalContract/:contractId/parties/:partyIndex
export interface UpdateLegalContractRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateLegalContractResponse = ApiResponse<LegalContract>;

// DELETE /api/legalContract/:contractId/parties/:partyIndex
export type DeleteLegalContractResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/legalContract/:contractId/signatures/initiate
export interface CreateLegalContractRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLegalContractResponse = ApiResponse<LegalContract>;

// POST /api/legalContract/:contractId/signatures/:partyIndex
export interface CreateLegalContractRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLegalContractResponse = ApiResponse<LegalContract>;

// GET /api/legalContract/:contractId/signatures
export interface LegalContractListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LegalContractListResponse = PaginatedResponse<LegalContract>;

// POST /api/legalContract/:contractId/amendments
export interface CreateLegalContractRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLegalContractResponse = ApiResponse<LegalContract>;

// GET /api/legalContract/:contractId/amendments
export interface LegalContractListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LegalContractListResponse = PaginatedResponse<LegalContract>;

// POST /api/legalContract/:contractId/versions
export interface CreateLegalContractRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLegalContractResponse = ApiResponse<LegalContract>;

// GET /api/legalContract/:contractId/versions
export interface LegalContractListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LegalContractListResponse = PaginatedResponse<LegalContract>;

// POST /api/legalContract/:contractId/versions/:versionNumber/revert
export interface CreateLegalContractRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLegalContractResponse = ApiResponse<LegalContract>;

// POST /api/legalContract/:contractId/notarization
export interface CreateLegalContractRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLegalContractResponse = ApiResponse<LegalContract>;

// GET /api/legalContract/:contractId/notarization/verify
export interface LegalContractListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LegalContractListResponse = PaginatedResponse<LegalContract>;

// POST /api/legalContract/:contractId/breach
export interface CreateLegalContractRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLegalContractResponse = ApiResponse<LegalContract>;

// POST /api/legalContract/:contractId/enforcement
export interface CreateLegalContractRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLegalContractResponse = ApiResponse<LegalContract>;

// PATCH /api/legalContract/:contractId/enforcement
export interface UpdateLegalContractRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateLegalContractResponse = ApiResponse<LegalContract>;

// POST /api/legalContract/:contractId/link-case
export interface CreateLegalContractRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLegalContractResponse = ApiResponse<LegalContract>;

// POST /api/legalContract/:contractId/reminders
export interface CreateLegalContractRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLegalContractResponse = ApiResponse<LegalContract>;

// GET /api/legalContract/:contractId/reminders
export interface LegalContractListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LegalContractListResponse = PaginatedResponse<LegalContract>;

// GET /api/legalContract/:contractId/export/pdf
export interface LegalContractListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LegalContractListResponse = PaginatedResponse<LegalContract>;

// GET /api/legalContract/:contractId/export/word
export interface LegalContractListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LegalContractListResponse = PaginatedResponse<LegalContract>;

// POST /api/legalContract/:contractId/save-as-template
export interface CreateLegalContractRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLegalContractResponse = ApiResponse<LegalContract>;
