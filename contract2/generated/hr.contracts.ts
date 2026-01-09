/**
 * Hr API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { Hr } from './models';

// Standard Response Types
export type HrResponse = ApiResponse<Hr>;
export type HrListResponse = PaginatedResponse<Hr>;

// From: createEmployeeSchema
export interface CreateEmployeeRequest {
  officeType: string;
  fullNameArabic?: string;
  fullNameEnglish?: string;
  nationalId?: string;
  nationalIdType: string;
  nationalIdExpiry?: string;
  nationality?: string;
  isSaudi?: boolean;
  gender: string;
  dateOfBirth?: string;
  mobile?: string;
  email?: string;
  personalEmail?: string;
  city?: string;
  region?: string;
  country?: string;
  name?: string;
  relationship?: string;
  phone?: string;
  maritalStatus: string;
  numberOfDependents?: number;
  employmentStatus: string;
  jobTitle?: string;
  jobTitleArabic?: string;
  employmentType: string;
  contractType: string;
  contractStartDate?: string;
  contractEndDate?: string;
  hireDate?: string;
  probationPeriod?: number;
  onProbation?: boolean;
  weeklyHours?: number;
  dailyHours?: number;
  workDays?: any[];
  restDay?: string;
  reportsTo?: string;
  departmentName?: string;
  basicSalary?: number;
  currency: string;
  allowances: any[];
  allowanceName?: string;
  allowanceNameAr?: string;
  name?: string;
  nameAr?: string;
  amount?: number;
  taxable?: boolean;
  includedInEOSB?: boolean;
  includedInGOSI?: boolean;
  totalAllowances?: number;
  grossSalary?: number;
  paymentFrequency: string;
  paymentMethod: string;
  bankName?: string;
  iban?: string;
  registered?: boolean;
  registered?: boolean;
  gosiNumber?: string;
  employeeContribution?: number;
  employerContribution?: number;
  branchId?: string;
  departmentName?: string;
  teamId?: string;
  supervisorId?: string;
  costCenter?: string;
  annualLeaveEntitlement?: number;
}

// From: updateEmployeeSchema
export interface UpdateEmployeeRequest {
  officeType: string;
  fullNameArabic?: string;
  fullNameEnglish?: string;
  nationalId?: string;
  nationalIdType: string;
  nationalIdExpiry?: string;
  nationality?: string;
  isSaudi?: boolean;
  gender: string;
  dateOfBirth?: string;
  mobile?: string;
  email?: string;
  personalEmail?: string;
  city?: string;
  region?: string;
  country?: string;
  name?: string;
  relationship?: string;
  phone?: string;
  maritalStatus: string;
  numberOfDependents?: number;
  employmentStatus: string;
  jobTitle?: string;
  jobTitleArabic?: string;
  employmentType: string;
  contractType: string;
  contractStartDate?: string;
  contractEndDate?: string;
  hireDate?: string;
  probationPeriod?: number;
  onProbation?: boolean;
  weeklyHours?: number;
  dailyHours?: number;
  workDays?: any[];
  restDay?: string;
  reportsTo?: string;
  departmentName?: string;
  terminationDate?: string;
  terminationReason?: string;
  basicSalary?: number;
  currency: string;
  allowances: any[];
  allowanceName?: string;
  allowanceNameAr?: string;
  name?: string;
  nameAr?: string;
  amount?: number;
  taxable?: boolean;
  includedInEOSB?: boolean;
  includedInGOSI?: boolean;
  totalAllowances?: number;
  grossSalary?: number;
  paymentFrequency: string;
  paymentMethod: string;
  bankName?: string;
  iban?: string;
  registered?: boolean;
  registered?: boolean;
  gosiNumber?: string;
  employeeContribution?: number;
  employerContribution?: number;
  branchId?: string;
  departmentName?: string;
  teamId?: string;
  supervisorId?: string;
  costCenter?: string;
  annualLeaveEntitlement?: number;
}

// From: addAllowanceSchema
export interface AddAllowanceRequest {
  type: string;
  amount: number;
  description: string;
  startDate: string;
  endDate: string;
}

// From: createPayrollRunSchema
export interface CreatePayrollRunRequest {
  month: number;
  year: number;
  employeeIds: any[];
  paymentDate: string;
  description: string;
  type: string;
}

// From: updatePayrollRunSchema
export interface UpdatePayrollRunRequest {
  paymentDate: string;
  description: string;
  status: string;
}

// From: approvePayrollSchema
export interface ApprovePayrollRequest {
  payrollRunId: string;
  approvalNotes: string;
}

// From: generateBulkPayrollSchema
export interface GenerateBulkPayrollRequest {
  month: number;
  year: number;
  employeeIds: any[];
}

// From: createSalarySlipSchema
export interface CreateSalarySlipRequest {
  employeeId: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: any[];
  type: string;
  amount: number;
  deductions: any[];
  type: string;
  amount: number;
  paymentDate: string;
  notes: string;
}

// From: updateSalarySlipSchema
export interface UpdateSalarySlipRequest {
  basicSalary: number;
  allowances: any[];
  type: string;
  amount: number;
  deductions: any[];
  type: string;
  amount: number;
  paymentDate: string;
  notes: string;
  status: string;
}

// From: createLeaveRequestSchema
export interface CreateLeaveRequestRequest {
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  halfDay?: boolean;
  handoverTo: string;
  handoverNotes: string;
  name: string;
  phone: string;
  attachments: any[];
}

// From: updateLeaveRequestSchema
export interface UpdateLeaveRequestRequest {
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  halfDay: boolean;
  handoverTo: string;
  handoverNotes: string;
  name: string;
  phone: string;
}

// From: reviewLeaveRequestSchema
export interface ReviewLeaveRequestRequest {
  reviewNotes: string;
  startDate: string;
  endDate: string;
}

// From: requestExtensionSchema
export interface RequestExtensionRequest {
  newEndDate: string;
  extensionReason: string;
  attachments: any[];
}

// From: checkInSchema
export interface CheckInRequest {
  employeeId: string;
  date: string;
  checkIn: string;
  latitude: number;
  longitude: number;
  deviceId: string;
  notes: string;
}

// From: checkOutSchema
export interface CheckOutRequest {
  employeeId: string;
  date: string;
  checkOut: string;
  latitude: number;
  longitude: number;
  deviceId: string;
  notes: string;
}

// From: createAttendanceSchema
export interface CreateAttendanceRequest {
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  workHours: number;
  overtimeHours: number;
  notes: string;
  latitude: number;
  longitude: number;
}

// From: updateAttendanceSchema
export interface UpdateAttendanceRequest {
  checkIn: string;
  checkOut: string;
  status: string;
  workHours: number;
  overtimeHours: number;
  notes: string;
}

// From: submitCorrectionSchema
export interface SubmitCorrectionRequest {
  field: string;
  oldValue: any;
  newValue: any;
  reason: string;
  attachments: any[];
}

// From: reviewCorrectionSchema
export interface ReviewCorrectionRequest {
  status: string;
  reviewNotes: string;
}

// From: createAdvanceSchema
export interface CreateAdvanceRequest {
  employeeId: string;
  amount: number;
  reason: string;
  requestDate?: string;
  expectedRecoveryDate: string;
  recoveryMethod: string;
  installments: number;
  then: any;
  isEmergency?: boolean;
  attachments: any[];
}

// From: updateAdvanceSchema
export interface UpdateAdvanceRequest {
  amount: number;
  reason: string;
  expectedRecoveryDate: string;
  recoveryMethod: string;
  installments: number;
  isEmergency: boolean;
}

// From: reviewAdvanceSchema
export interface ReviewAdvanceRequest {
  approverNotes: string;
  approvedAmount: number;
}

// From: disburseAdvanceSchema
export interface DisburseAdvanceRequest {
  disbursementDate?: string;
  disbursementMethod: string;
  referenceNumber: string;
  notes: string;
}

// From: recordRecoverySchema
export interface RecordRecoveryRequest {
  amount: number;
  recoveryDate?: string;
  method: string;
  notes: string;
}

// From: createLoanSchema
export interface CreateLoanRequest {
  employeeId: string;
  loanType: string;
  amount: number;
  interestRate?: number;
  installments: number;
  purpose: string;
  startDate: string;
  guarantors: any[];
  name: string;
  nationalId: string;
  relationship: string;
  phone: string;
  type: string;
  description: string;
  estimatedValue: number;
  attachments: any[];
}

// From: updateLoanSchema
export interface UpdateLoanRequest {
  loanType: string;
  amount: number;
  interestRate: number;
  installments: number;
  purpose: string;
  startDate: string;
  guarantors: any[];
  name: string;
  nationalId: string;
  relationship: string;
  phone: string;
  type: string;
  description: string;
  estimatedValue: number;
}

// From: reviewLoanSchema
export interface ReviewLoanRequest {
  approverNotes: string;
  approvedAmount: number;
  approvedInstallments: number;
  approvedInterestRate: number;
}

// From: disburseLoanSchema
export interface DisburseLoanRequest {
  disbursementDate?: string;
  disbursementMethod: string;
  bankAccount: string;
  referenceNumber: string;
  notes: string;
}

// From: recordPaymentSchema
export interface RecordPaymentRequest {
  amount: number;
  paymentDate?: string;
  method: string;
  referenceNumber: string;
  notes: string;
}

// From: restructureLoanSchema
export interface RestructureLoanRequest {
  newInstallments: number;
  newInterestRate: number;
  reason: string;
  effectiveDate: string;
}

// From: createBenefitSchema
export interface CreateBenefitRequest {
  employeeId: string;
  benefitType: string;
  provider: string;
  policyNumber: string;
  startDate: string;
  endDate: string;
  employeeCost?: number;
  employerCost?: number;
  coverageAmount: number;
  dependents: any[];
  name: string;
  relationship: string;
  dateOfBirth: string;
  nationalId: string;
  attachments: any[];
}

// From: updateBenefitSchema
export interface UpdateBenefitRequest {
  benefitType: string;
  provider: string;
  policyNumber: string;
  startDate: string;
  endDate: string;
  employeeCost: number;
  employerCost: number;
  coverageAmount: number;
  status: string;
}

// From: addDependentSchema
export interface AddDependentRequest {
  name: string;
  relationship: string;
  dateOfBirth: string;
  nationalId: string;
  gender: string;
}

// From: addBeneficiarySchema
export interface AddBeneficiaryRequest {
  name: string;
  relationship: string;
  percentage: number;
  nationalId: string;
  phone: string;
  address: string;
}

// From: submitClaimSchema
export interface SubmitClaimRequest {
  claimType: string;
  claimDate: string;
  amount: number;
  provider: string;
  diagnosis: string;
  treatmentDate: string;
  receipts: any[];
  notes: string;
}

// From: idParamSchema
export interface IdParamRequest {
  id: string;
}

// From: employeeIdParamSchema
export interface EmployeeIdParamRequest {
  employeeId: string;
}
