/**
 * Pdfme API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/pdfme/templates
export interface PdfmeListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PdfmeListResponse = PaginatedResponse<Pdfme>;

// GET /api/pdfme/templates/default/:category
export interface PdfmeListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PdfmeListResponse = PaginatedResponse<Pdfme>;

// GET /api/pdfme/templates/:id
export type GetPdfmeResponse = ApiResponse<Pdfme>;

// POST /api/pdfme/templates
export interface CreatePdfmeRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePdfmeResponse = ApiResponse<Pdfme>;

// PUT /api/pdfme/templates/:id
export interface UpdatePdfmeRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdatePdfmeResponse = ApiResponse<Pdfme>;

// DELETE /api/pdfme/templates/:id
export type DeletePdfmeResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/pdfme/templates/:id/clone
export interface CreatePdfmeRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePdfmeResponse = ApiResponse<Pdfme>;

// POST /api/pdfme/templates/:id/set-default
export interface CreatePdfmeRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePdfmeResponse = ApiResponse<Pdfme>;

// POST /api/pdfme/templates/:id/preview
export interface CreatePdfmeRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePdfmeResponse = ApiResponse<Pdfme>;

// POST /api/pdfme/generate
export interface CreatePdfmeRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePdfmeResponse = ApiResponse<Pdfme>;

// POST /api/pdfme/generate/async
export interface CreatePdfmeRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePdfmeResponse = ApiResponse<Pdfme>;

// POST /api/pdfme/generate/invoice
export interface CreatePdfmeRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePdfmeResponse = ApiResponse<Pdfme>;

// POST /api/pdfme/generate/contract
export interface CreatePdfmeRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePdfmeResponse = ApiResponse<Pdfme>;

// POST /api/pdfme/generate/receipt
export interface CreatePdfmeRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePdfmeResponse = ApiResponse<Pdfme>;

// GET /api/pdfme/download/:fileName
export interface PdfmeListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PdfmeListResponse = PaginatedResponse<Pdfme>;
