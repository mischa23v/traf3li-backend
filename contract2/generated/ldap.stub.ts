/**
 * Ldap API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/ldap/config
export interface LdapListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type LdapListResponse = PaginatedResponse<Ldap>;

// POST /api/ldap/config
export interface CreateLdapRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLdapResponse = ApiResponse<Ldap>;

// POST /api/ldap/test
export interface CreateLdapRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLdapResponse = ApiResponse<Ldap>;

// POST /api/ldap/test-auth
export interface CreateLdapRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLdapResponse = ApiResponse<Ldap>;

// POST /api/ldap/sync
export interface CreateLdapRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLdapResponse = ApiResponse<Ldap>;

// POST /api/ldap/login
export interface CreateLdapRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateLdapResponse = ApiResponse<Ldap>;
