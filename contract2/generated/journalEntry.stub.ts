/**
 * JournalEntry API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/journalEntry/simple
export interface CreateJournalEntryRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateJournalEntryResponse = ApiResponse<JournalEntry>;

// GET /api/journalEntry
export interface JournalEntryListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type JournalEntryListResponse = PaginatedResponse<JournalEntry>;

// GET /api/journalEntry/:id
export type GetJournalEntryResponse = ApiResponse<JournalEntry>;

// POST /api/journalEntry
export interface CreateJournalEntryRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateJournalEntryResponse = ApiResponse<JournalEntry>;

// PATCH /api/journalEntry/:id
export interface UpdateJournalEntryRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateJournalEntryResponse = ApiResponse<JournalEntry>;

// POST /api/journalEntry/:id/post
export interface CreateJournalEntryRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateJournalEntryResponse = ApiResponse<JournalEntry>;

// POST /api/journalEntry/:id/void
export interface CreateJournalEntryRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateJournalEntryResponse = ApiResponse<JournalEntry>;

// DELETE /api/journalEntry/:id
export type DeleteJournalEntryResponse = ApiResponse<{ deleted: boolean }>;
