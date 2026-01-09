/**
 * Lead API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { Lead } from './models';

// Standard Response Types
export type LeadResponse = ApiResponse<Lead>;
export type LeadListResponse = PaginatedResponse<Lead>;

// From: leadSourceSchema
export interface LeadSourceRequest {
  type: string;
  referralName: string;
  campaign: string;
  medium: string;
  notes: string;
}

// From: addressSchema
export interface AddressRequest {
  street: string;
  city: string;
  postalCode: string;
  country?: string;
}

// From: intakeInfoSchema
export interface IntakeInfoRequest {
  caseType: string;
  caseDescription: string;
  urgency: string;
  estimatedValue: number;
  opposingParty: string;
  courtName: string;
  currentStatus: string;
  desiredOutcome: string;
  deadline: string;
  hasDocuments: boolean;
  conflictCheckCompleted: boolean;
  conflictCheckResult: string;
  conflictCheckNotes: string;
}

// From: createLeadSchema
export interface CreateLeadRequest {
  type: string;
  firstName: string;
  lastName: string;
  companyName: string;
  companyNameAr: string;
  contactPerson: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  whatsapp?: string;
  nationalId: string;
  commercialRegistration: string;
  teamMembers: any[];
  status: string;
  probability?: number;
  expectedCloseDate: string;
  estimatedValue: number;
  proposedFeeType: string;
  proposedAmount: number;
  notes?: string;
  internalNotes?: string;
  nextFollowUpDate: string;
  nextFollowUpNote: string;
  tags: any[];
  priority: string;
}

// From: updateLeadSchema
export interface UpdateLeadRequest {
  type: string;
  firstName: string;
  lastName: string;
  companyName: string;
  companyNameAr: string;
  contactPerson: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  whatsapp?: string;
  nationalId: string;
  commercialRegistration: string;
  teamMembers: any[];
  status: string;
  probability: number;
  expectedCloseDate?: string;
  statusChangeNote: string;
  estimatedValue: number;
  proposedFeeType: string;
  proposedAmount: number;
  notes?: string;
  internalNotes?: string;
  nextFollowUpDate?: string;
  nextFollowUpNote?: string;
  tags: any[];
  priority: string;
}

// From: updateStatusSchema
export interface UpdateStatusRequest {
  status: string;
  notes?: string;
  lostReason: string;
}

// From: moveToStageSchema
export interface MoveToStageRequest {
  notes?: string;
}

// From: convertToClientSchema
export interface ConvertToClientRequest {
  createCase?: boolean;
  caseTitle: string;
}

// From: logActivitySchema
export interface LogActivityRequest {
  type: string;
  title: string;
  description?: string;
  outcome: string;
  duration: number;
  scheduledAt: string;
  completedAt: string;
  priority: string;
  tags: any[];
  attachments: any[];
  dueDate: string;
  priority: string;
  status: string;
}

// From: scheduleFollowUpSchema
export interface ScheduleFollowUpRequest {
  date?: string;
  note?: string;
  type: string;
  priority: string;
}

// From: getLeadsQuerySchema
export interface GetLeadsQueryRequest {
  status: string;
  source: string;
  search: string;
  convertedToClient: boolean;
  sortBy: string;
  sortOrder: string;
  page?: number;
  limit?: number;
}

// From: getActivitiesQuerySchema
export interface GetActivitiesQueryRequest {
  type: string;
  page?: number;
  limit?: number;
}

// From: leadIdParamSchema
export interface LeadIdParamRequest {
  id: any;
}
