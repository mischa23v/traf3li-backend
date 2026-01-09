/**
 * Client API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { Client } from './models';

// Standard Response Types
export type ClientResponse = ApiResponse<Client>;
export type ClientListResponse = PaginatedResponse<Client>;

// From: addressSchema
export interface AddressRequest {
  city: string;
  district: string;
  street: string;
  buildingNumber: string;
  postalCode: string;
  additionalNumber: string;
  unitNumber: string;
  fullAddress: string;
  country?: string;
}

// From: createClientSchema
export interface CreateClientRequest {
  clientType: string;
  then: string;
  middleName: string;
  then: string;
  then: string;
  fullNameEnglish: string;
  gender: string;
  nationality: string;
  dateOfBirth: string;
  then: string;
  companyNameEnglish: string;
  unifiedNumber: string;
  mainActivity: string;
  website: string;
  preferredContact: string;
  preferredTime: string;
  preferredLanguage: string;
  name: string;
  position: string;
  name: string;
  relation: string;
  address: string;
  type: string;
  hourlyRate: number;
  paymentTerms: string;
  creditLimit: number;
  isRegistered: boolean;
  vatNumber: string;
  clientSource: string;
  referredBy: string;
  generalNotes: string;
  internalNotes: string;
  tags: any[];
  isVip: boolean;
  isHighRisk: boolean;
  needsApproval: boolean;
  clientTier: string;
}

// From: updateClientSchema
export interface UpdateClientRequest {
  clientType: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fullNameArabic: string;
  fullNameEnglish: string;
  gender: string;
  nationality: string;
  dateOfBirth: string;
  companyName: string;
  companyNameEnglish: string;
  unifiedNumber: string;
  mainActivity: string;
  website: string;
  preferredContact: string;
  preferredTime: string;
  preferredLanguage: string;
  name: string;
  position: string;
  name: string;
  relation: string;
  address: string;
  type: string;
  hourlyRate: number;
  paymentTerms: string;
  creditLimit: number;
  isRegistered: boolean;
  vatNumber: string;
  clientSource: string;
  referredBy: string;
  generalNotes: string;
  internalNotes: string;
  tags: any[];
  clientTier: string;
  nextFollowUpDate: string;
  nextFollowUpNote: string;
}

// From: addContactSchema
export interface AddContactRequest {
  name: string;
  role: string;
  relation: string;
  position: string;
  address: string;
}

// From: updateBalanceSchema
export interface UpdateBalanceRequest {
  amount: number;
  operation: string;
  note: string;
}

// From: updateStatusSchema
export interface UpdateStatusRequest {
  status: string;
  reason: string;
}

// From: updateFlagsSchema
export interface UpdateFlagsRequest {
  isVip: boolean;
  isHighRisk: boolean;
  needsApproval: boolean;
  isBlacklisted: boolean;
  blacklistReason: string;
}

// From: searchClientsSchema
export interface SearchClientsRequest {
  q: string;
  clientType: string;
  status: string;
  clientTier: string;
  clientSource: string;
  limit?: number;
  page?: number;
}

// From: bulkDeleteSchema
export interface BulkDeleteRequest {
  ids: any[];
}

// From: idParamSchema
export interface IdParamRequest {
  id: string;
}
