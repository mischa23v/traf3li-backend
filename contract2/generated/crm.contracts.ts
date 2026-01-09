/**
 * Crm API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { Crm } from './models';

// Standard Response Types
export type CrmResponse = ApiResponse<Crm>;
export type CrmListResponse = PaginatedResponse<Crm>;

// From: leadSettingsSchema
export interface LeadSettingsRequest {
  allowDuplicateEmails: boolean;
  allowDuplicatePhones: boolean;
  autoCreateContact: boolean;
  leadScoringEnabled: boolean;
  autoAssignmentEnabled: boolean;
  autoAssignmentRule: string;
  trackFirstResponseTime: boolean;
}

// From: caseSettingsSchema
export interface CaseSettingsRequest {
  autoCloseAfterDays: number;
  autoCloseEnabled: boolean;
  requireConflictCheck: boolean;
  defaultPipeline: string;
  autoCreateQuoteOnQualified: boolean;
}

// From: quoteSettingsSchema
export interface QuoteSettingsRequest {
  defaultValidDays: number;
  autoSendReminder: boolean;
  reminderDaysBefore: number;
  requireApproval: boolean;
  approvalThreshold: number;
  approvers: any[];
}

// From: communicationSettingsSchema
export interface CommunicationSettingsRequest {
  carryForwardCommunication: boolean;
  updateTimestampOnCommunication: boolean;
  autoLogEmails: boolean;
  autoLogCalls: boolean;
  autoLogWhatsApp: boolean;
  defaultEmailTemplateId: string;
  defaultSMSTemplateId: string;
}

// From: workingHoursSchema
export interface WorkingHoursRequest {
  enabled: boolean;
}

// From: appointmentSettingsSchema
export interface AppointmentSettingsRequest {
  enabled: boolean;
  defaultDuration: number;
  allowedDurations: any[];
  advanceBookingDays: number;
  minAdvanceBookingHours: number;
  agentList: any[];
  holidayListId: string;
  bufferBetweenAppointments: number;
  sendReminders: boolean;
  reminderHoursBefore: any[];
  publicBookingEnabled: boolean;
  publicBookingUrl: string;
  requirePhoneVerification: boolean;
}

// From: namingSettingsSchema
export interface NamingSettingsRequest {
  campaignNamingBy: string;
  leadPrefix: string;
  casePrefix: string;
  quotePrefix: string;
  contractPrefix: string;
  appointmentPrefix: string;
  numberFormat: string;
  resetNumberingYearly: boolean;
}

// From: territorySettingsSchema
export interface TerritorySettingsRequest {
  enabled: boolean;
  autoAssignByTerritory: boolean;
  requireTerritoryOnLead: boolean;
  requireTerritoryOnCase: boolean;
}

// From: salesPersonSettingsSchema
export interface SalesPersonSettingsRequest {
  hierarchyEnabled: boolean;
  commissionTrackingEnabled: boolean;
  targetTrackingEnabled: boolean;
  requireSalesPersonOnCase: boolean;
  defaultCommissionRate: number;
}

// From: conversionSettingsSchema
export interface ConversionSettingsRequest {
  autoCreateCaseOnConsultation: boolean;
  requireBANTBeforeCase: boolean;
  autoCreateQuoteOnQualified: boolean;
  autoCreateSalesOrderOnAccept: boolean;
  linkSalesOrderToFinance: boolean;
  autoCreateClientOnSalesOrder: boolean;
  clientCreationTrigger: string;
  copyNotesToCase: boolean;
  copyActivityHistory: boolean;
  copyDocuments: boolean;
}

// From: territoryTargetSchema
export interface TerritoryTargetRequest {
  year: number;
  quarter: number;
  targetAmount: number;
  achievedAmount: number;
}

// From: createTerritorySchema
export interface CreateTerritoryRequest {
  name: string;
  nameAr: string;
  isGroup: boolean;
  targets: TerritoryTargetItem[];
  enabled: boolean;
}

// From: updateTerritorySchema
export interface UpdateTerritoryRequest {
  name: string;
  nameAr: string;
  isGroup: boolean;
  targets: TerritoryTargetItem[];
  enabled: boolean;
}

// From: salesPersonTargetSchema
export interface SalesPersonTargetRequest {
  year: number;
  quarter: number;
  month: number;
  targetAmount: number;
  targetLeads: number;
  targetCases: number;
}

// From: createSalesPersonSchema
export interface CreateSalesPersonRequest {
  name: string;
  nameAr: string;
  isGroup: boolean;
  commissionRate: number;
  territoryIds: any[];
  targets: SalesPersonTargetItem[];
  enabled: boolean;
}

// From: updateSalesPersonSchema
export interface UpdateSalesPersonRequest {
  name: string;
  nameAr: string;
  isGroup: boolean;
  commissionRate: number;
  territoryIds: any[];
  targets: SalesPersonTargetItem[];
  enabled: boolean;
}

// From: createLeadSourceSchema
export interface CreateLeadSourceRequest {
  name: string;
  nameAr: string;
  description: string;
  utmSource: string;
  utmMedium: string;
  enabled: boolean;
}

// From: updateLeadSourceSchema
export interface UpdateLeadSourceRequest {
  name: string;
  nameAr: string;
  description: string;
  utmSource: string;
  utmMedium: string;
  enabled: boolean;
}

// From: createSalesStageSchema
export interface CreateSalesStageRequest {
  name: string;
  nameAr: string;
  order: number;
  defaultProbability: number;
  type: string;
  requiresConflictCheck: boolean;
  requiresQualification: boolean;
  autoCreateQuote: boolean;
  enabled: boolean;
}

// From: updateSalesStageSchema
export interface UpdateSalesStageRequest {
  name: string;
  nameAr: string;
  order: number;
  defaultProbability: number;
  type: string;
  requiresConflictCheck: boolean;
  requiresQualification: boolean;
  autoCreateQuote: boolean;
  enabled: boolean;
}

// From: reorderStagesSchema
export interface ReorderStagesRequest {
  stages: any[];
  order: number;
}

// From: createLostReasonSchema
export interface CreateLostReasonRequest {
  reason: string;
  reasonAr: string;
  category: '...lostReasonCategories';
  enabled: boolean;
}

// From: updateLostReasonSchema
export interface UpdateLostReasonRequest {
  reason: string;
  reasonAr: string;
  category: '...lostReasonCategories';
  enabled: boolean;
}

// From: createCompetitorSchema
export interface CreateCompetitorRequest {
  name: string;
  nameAr: string;
  website: string;
  description: string;
  enabled: boolean;
}

// From: updateCompetitorSchema
export interface UpdateCompetitorRequest {
  name: string;
  nameAr: string;
  website?: string;
  description?: string;
  enabled: boolean;
}

// From: createAppointmentSchema
export interface CreateAppointmentRequest {
  scheduledTime: string;
  duration: number;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  customerNotes?: string;
  subject?: string;
  appointmentWith: string;
  locationType: string;
  location: string;
  meetingLink?: string;
  sendReminder: boolean;
  type: string;
  source: string;
  price: number;
  currency: string;
}

// From: updateAppointmentSchema
export interface UpdateAppointmentRequest {
  scheduledTime: string;
  duration: number;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  customerNotes?: string;
  subject?: string;
  appointmentWith: string;
  locationType: string;
  location?: string;
  meetingLink?: string;
  sendReminder: boolean;
  status: string;
  outcome: string;
  followUpRequired: boolean;
  followUpDate: string;
  cancellationReason: string;
  type: string;
  source: string;
  price: number;
  currency: string;
  isPaid: boolean;
  paymentId: string;
  paymentMethod: string;
}

// From: publicBookingSchema
export interface PublicBookingRequest {
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  scheduledTime: string;
  duration: number;
  customerNotes?: string;
  subject?: string;
  type: string;
  locationType: string;
}

// From: getAvailableSlotsSchema
export interface GetAvailableSlotsRequest {
  date: string;
  duration: number;
}

// From: dateRangeSchema
export interface DateRangeRequest {
  startDate: string;
  endDate: string;
}

// From: prospectsEngagedSchema
export interface ProspectsEngagedRequest {
  daysSinceContact?: number;
  minInteractions?: number;
  page?: number;
  limit?: number;
}

// From: createCaseFromLeadSchema
export interface CreateCaseFromLeadRequest {
  title: string;
  caseType: string;
  description: string;
  estimatedValue: number;
  copyNotes?: boolean;
  copyDocuments?: boolean;
}

// From: updateCrmStageSchema
export interface UpdateCrmStageRequest {
  probability: number;
  expectedCloseDate: string;
}

// From: markWonSchema
export interface MarkWonRequest {
  wonValue: number;
  createClient?: boolean;
  notes: string;
}

// From: markLostSchema
export interface MarkLostRequest {
  lostReasonDetails: string;
}
