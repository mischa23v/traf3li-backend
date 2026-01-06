/**
 * HR MODULES - API TYPE DEFINITIONS
 *
 * Complete TypeScript definitions for:
 * 1. HR (Employee Management)
 * 2. Payroll
 * 3. Attendance
 * 4. Leave Request
 * 5. Performance Review
 *
 * Generated from:
 * - /src/routes/hr.route.js
 * - /src/routes/payroll.route.js
 * - /src/routes/attendance.route.js
 * - /src/routes/leaveRequest.route.js
 * - /src/routes/performanceReview.route.js
 */

// ═══════════════════════════════════════════════════════════════
// SHARED TYPES
// ═══════════════════════════════════════════════════════════════

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface ApiListResponse<T = any> extends ApiResponse<T[]> {
  pagination?: PaginationResponse;
  total?: number;
}

export type ObjectId = string;

// ═══════════════════════════════════════════════════════════════
// HR (EMPLOYEE MANAGEMENT)
// ═══════════════════════════════════════════════════════════════

// Enums
export enum EmploymentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_LEAVE = 'on_leave',
  PROBATION = 'probation',
  TERMINATED = 'terminated',
  RESIGNED = 'resigned',
  RETIRED = 'retired'
}

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERN = 'intern',
  TEMPORARY = 'temporary'
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female'
}

export enum MaritalStatus {
  SINGLE = 'single',
  MARRIED = 'married',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed'
}

export enum Nationality {
  SAUDI = 'saudi',
  NON_SAUDI = 'non_saudi'
}

export enum JobCategory {
  LEGAL = 'legal',
  ADMINISTRATIVE = 'administrative',
  FINANCIAL = 'financial',
  HR = 'hr',
  IT = 'it',
  SUPPORT = 'support',
  MANAGEMENT = 'management',
  OTHER = 'other'
}

// Sub-interfaces
export interface PersonalInfo {
  fullNameEnglish: string;
  fullNameArabic: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  firstNameAr?: string;
  middleNameAr?: string;
  lastNameAr?: string;
  dateOfBirth?: string;
  gender?: Gender;
  nationality?: Nationality;
  nationalId?: string;
  iqamaNumber?: string;
  passportNumber?: string;
  passportExpiry?: string;
  maritalStatus?: MaritalStatus;
  numberOfDependents?: number;
  email?: string;
  phone?: string;
  mobileNumber?: string;
  alternatePhone?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  photo?: string;
}

export interface Address {
  street?: string;
  streetAr?: string;
  city?: string;
  cityAr?: string;
  district?: string;
  districtAr?: string;
  postalCode?: string;
  country?: string;
  buildingNumber?: string;
  additionalNumber?: string;
}

export interface EmploymentDetails {
  employeeId?: string;
  dateOfJoining?: string;
  employmentStatus?: EmploymentStatus;
  employmentType?: EmploymentType;
  probationEndDate?: string;
  confirmationDate?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  department?: string;
  departmentAr?: string;
  departmentId?: ObjectId;
  jobTitle?: string;
  jobTitleAr?: string;
  jobCategory?: JobCategory;
  jobLevel?: string;
  reportingTo?: ObjectId;
  reportingToName?: string;
  workLocation?: string;
  workLocationAr?: string;
  officeId?: ObjectId;
  workSchedule?: {
    type: 'fixed' | 'flexible' | 'shift';
    regularHours: number;
    workingDays: string[];
  };
}

export interface SalaryInfo {
  basicSalary: number;
  currency?: string;
  allowances?: Array<{
    name: string;
    nameAr?: string;
    amount: number;
  }>;
  totalSalary?: number;
  paymentMethod?: 'bank_transfer' | 'cash' | 'check';
  bankName?: string;
  iban?: string;
  accountNumber?: string;
  salaryReviewDate?: string;
  lastIncrementDate?: string;
  lastIncrementPercentage?: number;
}

export interface LeaveEntitlement {
  annualLeave: number;
  sickLeave: number;
  maternityLeave?: number;
  paternityLeave?: number;
  hajjLeave?: number;
}

export interface Document {
  documentType: string;
  documentName: string;
  fileName: string;
  fileUrl: string;
  uploadedOn: string;
  expiryDate?: string;
}

export interface Employee {
  _id: ObjectId;
  employeeId: string;
  personalInfo: PersonalInfo;
  contactInfo: {
    currentAddress?: Address;
    permanentAddress?: Address;
  };
  employmentDetails: EmploymentDetails;
  salaryInfo?: SalaryInfo;
  leaveEntitlement?: LeaveEntitlement;
  gosiRegistration?: {
    registered: boolean;
    gosiNumber?: string;
    registrationDate?: string;
  };
  documents?: Document[];
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  firmId?: ObjectId;
  lawyerId?: ObjectId;
}

// GET /api/hr - Get all employees
export interface GetEmployeesQuery extends PaginationParams {
  search?: string;
  employmentStatus?: EmploymentStatus;
  departmentId?: ObjectId;
  jobCategory?: JobCategory;
  employmentType?: EmploymentType;
  nationality?: Nationality;
}

export interface GetEmployeesResponse extends ApiListResponse<Employee> {}

// GET /api/hr/stats - Get employee statistics
export interface GetEmployeeStatsResponse extends ApiResponse {
  data: {
    totalEmployees: number;
    byStatus: Array<{ status: string; count: number }>;
    byDepartment: Array<{ department: string; departmentAr?: string; count: number }>;
    byNationality: Array<{ nationality: string; count: number }>;
    byGender: Array<{ gender: string; count: number }>;
    avgTenure: number;
    newHiresThisMonth: number;
    newHiresThisYear: number;
    terminationsThisYear: number;
  };
}

// GET /api/hr/:id - Get single employee
export interface GetEmployeeByIdResponse extends ApiResponse<Employee> {}

// POST /api/hr - Create employee
export interface CreateEmployeeRequest {
  personalInfo: PersonalInfo;
  contactInfo?: {
    currentAddress?: Address;
    permanentAddress?: Address;
  };
  employmentDetails: EmploymentDetails;
  salaryInfo?: SalaryInfo;
  leaveEntitlement?: LeaveEntitlement;
  gosiRegistration?: {
    registered: boolean;
    gosiNumber?: string;
    registrationDate?: string;
  };
}

export interface CreateEmployeeResponse extends ApiResponse<Employee> {}

// PATCH /api/hr/:id - Update employee
export interface UpdateEmployeeRequest {
  personalInfo?: Partial<PersonalInfo>;
  contactInfo?: {
    currentAddress?: Partial<Address>;
    permanentAddress?: Partial<Address>;
  };
  employmentDetails?: Partial<EmploymentDetails>;
  salaryInfo?: Partial<SalaryInfo>;
  leaveEntitlement?: Partial<LeaveEntitlement>;
  gosiRegistration?: {
    registered?: boolean;
    gosiNumber?: string;
    registrationDate?: string;
  };
}

export interface UpdateEmployeeResponse extends ApiResponse<Employee> {}

// DELETE /api/hr/:id - Delete employee (soft delete)
export interface DeleteEmployeeResponse extends ApiResponse {}

// POST /api/hr/bulk-delete - Bulk delete employees
export interface BulkDeleteEmployeesRequest {
  ids: ObjectId[];
}

export interface BulkDeleteEmployeesResponse extends ApiResponse {
  deletedCount: number;
}

// POST /api/hr/bulk-import - Bulk import employees
export interface BulkImportEmployeesRequest {
  employees: CreateEmployeeRequest[];
}

export interface BulkImportEmployeesResponse extends ApiResponse {
  data: {
    imported: number;
    failed: number;
    errors: Array<{
      row: number;
      employeeName?: string;
      error: string;
    }>;
  };
}

// ═══════════════════════════════════════════════════════════════
// PAYROLL
// ═══════════════════════════════════════════════════════════════

// Enums
export enum PaymentStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  CHECK = 'check'
}

export enum CalendarType {
  HIJRI = 'hijri',
  GREGORIAN = 'gregorian'
}

// Sub-interfaces
export interface AllowanceItem {
  name: string;
  nameAr?: string;
  amount: number;
}

export interface Overtime {
  hours: number;
  rate: number;
  amount: number;
}

export interface PayPeriod {
  month: number;
  year: number;
  calendarType?: CalendarType;
  periodStart?: string;
  periodEnd?: string;
  paymentDate?: string;
  workingDays?: number;
  daysWorked?: number;
}

export interface Earnings {
  basicSalary: number;
  allowances?: AllowanceItem[];
  totalAllowances?: number;
  overtime?: Overtime;
  bonus?: number;
  commission?: number;
  arrears?: number;
  totalEarnings?: number;
}

export interface Deductions {
  gosi?: number;
  gosiEmployer?: number;
  loans?: number;
  advances?: number;
  absences?: number;
  lateDeductions?: number;
  violations?: number;
  otherDeductions?: number;
  totalDeductions?: number;
}

export interface Payment {
  paymentMethod?: PaymentMethod;
  bankName?: string;
  iban?: string;
  accountNumber?: string;
  checkNumber?: string;
  checkDate?: string;
  status?: PaymentStatus;
  paidOn?: string;
  paidBy?: ObjectId;
  transactionReference?: string;
  failureReason?: string;
}

export interface WPS {
  required?: boolean;
  submitted?: boolean;
  submissionDate?: string;
  wpsReferenceNumber?: string;
  status?: 'pending' | 'accepted' | 'rejected';
}

export interface SalarySlip {
  _id: ObjectId;
  slipId: string;
  slipNumber: string;
  employeeId: ObjectId;
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  nationalId?: string;
  jobTitle?: string;
  department?: string;
  payPeriod: PayPeriod;
  earnings: Earnings;
  deductions: Deductions;
  netPay: number;
  netPayInWords?: string;
  netPayInWordsAr?: string;
  payment?: Payment;
  wps?: WPS;
  generatedOn?: string;
  generatedBy?: ObjectId;
  approvedBy?: ObjectId;
  approvedOn?: string;
  notes?: string;
  firmId?: ObjectId;
  lawyerId?: ObjectId;
  glEntryId?: ObjectId;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryComponent {
  _id: ObjectId;
  componentType: 'earning' | 'deduction';
  name: string;
  nameAr?: string;
  code?: string;
  isDefault?: boolean;
  isActive?: boolean;
  applicableToAll?: boolean;
  applicableRoles?: string[];
  applicableDepartments?: ObjectId[];
  calculation?: {
    type: 'fixed' | 'percentage' | 'formula';
    value?: number;
    basedOn?: 'basic_salary' | 'total_salary' | 'custom';
    formula?: string;
  };
  taxable?: boolean;
  gosiApplicable?: boolean;
  firmId?: ObjectId;
  lawyerId?: ObjectId;
  createdAt: string;
  updatedAt: string;
}

// GET /api/hr/payroll/salary-slips - Get all salary slips
export interface GetSalarySlipsQuery extends PaginationParams {
  month?: number;
  year?: number;
  employeeId?: ObjectId;
  departmentId?: ObjectId;
  status?: PaymentStatus;
  search?: string;
}

export interface GetSalarySlipsResponse extends ApiListResponse<SalarySlip> {}

// GET /api/hr/payroll/salary-slips/stats - Get salary statistics
export interface GetSalaryStatsQuery {
  month?: number;
  year?: number;
  departmentId?: ObjectId;
}

export interface GetSalaryStatsResponse extends ApiResponse {
  data: {
    totalSlips: number;
    byStatus: Array<{ status: string; count: number }>;
    totalGrossSalary: number;
    totalDeductions: number;
    totalNetPay: number;
    avgNetPay: number;
    totalGOSI: number;
    totalGosiEmployer: number;
    byDepartment: Array<{
      department: string;
      departmentAr?: string;
      count: number;
      totalNet: number;
    }>;
  };
}

// GET /api/hr/payroll/salary-slips/:id - Get single salary slip
export interface GetSalarySlipByIdResponse extends ApiResponse<SalarySlip> {}

// POST /api/hr/payroll/salary-slips/generate - Generate salary slip
export interface GenerateSalarySlipRequest {
  employeeId: ObjectId;
  month: number;
  year: number;
  calendarType?: CalendarType;
  workingDays?: number;
  daysWorked?: number;
  overtimeHours?: number;
  bonus?: number;
  commission?: number;
  arrears?: number;
  loans?: number;
  advances?: number;
  absences?: number;
  lateDeductions?: number;
  violations?: number;
  otherDeductions?: number;
  notes?: string;
}

export interface GenerateSalarySlipResponse extends ApiResponse<SalarySlip> {}

// POST /api/hr/payroll/salary-slips/bulk-generate - Bulk generate slips
export interface BulkGenerateSalarySlipsRequest {
  month: number;
  year: number;
  calendarType?: CalendarType;
  employeeIds?: ObjectId[];
  departmentId?: ObjectId;
  workingDays?: number;
}

export interface BulkGenerateSalarySlipsResponse extends ApiResponse {
  data: {
    generated: number;
    failed: number;
    slips: SalarySlip[];
    errors: Array<{
      employeeId: ObjectId;
      employeeName?: string;
      error: string;
    }>;
  };
}

// POST /api/hr/payroll/salary-slips/approve/:id - Approve slip
export interface ApproveSalarySlipRequest {
  notes?: string;
}

export interface ApproveSalarySlipResponse extends ApiResponse<SalarySlip> {}

// POST /api/hr/payroll/salary-slips/approve-batch - Batch approve
export interface BatchApproveSalarySlipsRequest {
  slipIds: ObjectId[];
  notes?: string;
}

export interface BatchApproveSalarySlipsResponse extends ApiResponse {
  data: {
    approved: number;
    failed: number;
    errors: Array<{
      slipId: ObjectId;
      error: string;
    }>;
  };
}

// POST /api/hr/payroll/salary-slips/:id/send - Send slip via email
export interface SendSalarySlipRequest {
  email?: string;
  includePaymentDetails?: boolean;
}

export interface SendSalarySlipResponse extends ApiResponse {}

// DELETE /api/hr/payroll/salary-slips/:id - Delete slip
export interface DeleteSalarySlipResponse extends ApiResponse {}

// POST /api/hr/payroll/salary-slips/bulk-delete - Bulk delete slips
export interface BulkDeleteSalarySlipsRequest {
  ids: ObjectId[];
}

export interface BulkDeleteSalarySlipsResponse extends ApiResponse {
  deletedCount: number;
}

// GET /api/hr/payroll/salary-components - Get all components
export interface GetSalaryComponentsQuery {
  componentType?: 'earning' | 'deduction';
  isActive?: boolean;
}

export interface GetSalaryComponentsResponse extends ApiListResponse<SalaryComponent> {}

// POST /api/hr/payroll/salary-components - Create component
export interface CreateSalaryComponentRequest {
  componentType: 'earning' | 'deduction';
  name: string;
  nameAr?: string;
  code?: string;
  isDefault?: boolean;
  isActive?: boolean;
  applicableToAll?: boolean;
  applicableRoles?: string[];
  applicableDepartments?: ObjectId[];
  calculation?: {
    type: 'fixed' | 'percentage' | 'formula';
    value?: number;
    basedOn?: 'basic_salary' | 'total_salary' | 'custom';
    formula?: string;
  };
  taxable?: boolean;
  gosiApplicable?: boolean;
}

export interface CreateSalaryComponentResponse extends ApiResponse<SalaryComponent> {}

// PATCH /api/hr/payroll/salary-components/:id - Update component
export interface UpdateSalaryComponentRequest extends Partial<CreateSalaryComponentRequest> {}

export interface UpdateSalaryComponentResponse extends ApiResponse<SalaryComponent> {}

// DELETE /api/hr/payroll/salary-components/:id - Delete component
export interface DeleteSalaryComponentResponse extends ApiResponse {}

// POST /api/hr/payroll/gosi/calculate - Calculate GOSI
export interface CalculateGOSIRequest {
  basicSalary: number;
  allowances?: number;
  employeeContributionRate?: number;
  employerContributionRate?: number;
}

export interface CalculateGOSIResponse extends ApiResponse {
  data: {
    basicSalary: number;
    totalAllowances: number;
    gosiWage: number;
    employeeContribution: number;
    employerContribution: number;
    totalContribution: number;
  };
}

// GET /api/hr/payroll/month-summary - Get month summary
export interface GetMonthSummaryQuery {
  month: number;
  year: number;
}

export interface GetMonthSummaryResponse extends ApiResponse {
  data: {
    month: number;
    year: number;
    totalEmployees: number;
    totalSlipsGenerated: number;
    totalApproved: number;
    totalPaid: number;
    totalPending: number;
    grossPayroll: number;
    totalDeductions: number;
    netPayroll: number;
    totalGOSI: number;
    totalGosiEmployer: number;
    byDepartment: Array<{
      departmentId: ObjectId;
      department: string;
      count: number;
      totalNet: number;
    }>;
    byStatus: Array<{
      status: PaymentStatus;
      count: number;
      totalNet: number;
    }>;
  };
}

// ═══════════════════════════════════════════════════════════════
// ATTENDANCE
// ═══════════════════════════════════════════════════════════════

// Enums
export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  HALF_DAY = 'half_day',
  ON_LEAVE = 'on_leave',
  HOLIDAY = 'holiday',
  WEEKEND = 'weekend',
  WORK_FROM_HOME = 'work_from_home'
}

export enum BiometricMethod {
  FINGERPRINT = 'fingerprint',
  FACIAL = 'facial',
  CARD = 'card',
  PIN = 'pin',
  MOBILE = 'mobile',
  MANUAL = 'manual',
  QR_CODE = 'qr_code'
}

export enum DeviceType {
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  BIOMETRIC_TERMINAL = 'biometric_terminal',
  OTHER = 'other'
}

export enum CheckSource {
  WEB = 'web',
  MOBILE_APP = 'mobile_app',
  BIOMETRIC = 'biometric',
  MANUAL_ENTRY = 'manual_entry',
  IMPORT = 'import',
  API = 'api'
}

export enum BreakType {
  PRAYER = 'prayer',
  LUNCH = 'lunch',
  PERSONAL = 'personal',
  MEDICAL = 'medical',
  OTHER = 'other'
}

// Sub-interfaces
export interface CheckLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
  address?: string;
  addressAr?: string;
  isWithinGeofence?: boolean;
  geofenceId?: ObjectId;
  distanceFromOffice?: number;
  accuracy?: number;
}

export interface Biometric {
  method?: BiometricMethod;
  deviceId?: string;
  deviceName?: string;
  verified?: boolean;
  verificationScore?: number;
  rawData?: string;
}

export interface CheckDetails {
  time?: string;
  location?: CheckLocation;
  biometric?: Biometric;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: DeviceType;
  source?: CheckSource;
  notes?: string;
  notesAr?: string;
  photo?: string;
  approvedBy?: ObjectId;
  approvedAt?: string;
}

export interface Break {
  type?: BreakType;
  typeAr?: string;
  startTime?: string;
  endTime?: string;
  duration?: number; // minutes
  isPaid?: boolean;
  isScheduled?: boolean;
  location?: CheckLocation;
  notes?: string;
  status?: 'ongoing' | 'completed' | 'exceeded';
  exceededBy?: number;
}

export interface LateArrival {
  isLate?: boolean;
  scheduledTime?: string;
  actualTime?: string;
  lateBy?: number; // minutes
  reason?: string;
  reasonAr?: string;
  reasonCategory?: 'traffic' | 'medical' | 'family_emergency' | 'transportation' | 'weather' | 'other' | 'no_reason';
  isExcused?: boolean;
  excusedBy?: ObjectId;
  excusedAt?: string;
  excuseNotes?: string;
  deductionApplied?: boolean;
  deductionAmount?: number;
  deductionType?: 'hours' | 'percentage' | 'fixed';
}

export interface EarlyDeparture {
  isEarly?: boolean;
  scheduledTime?: string;
  actualTime?: string;
  earlyBy?: number; // minutes
  reason?: string;
  reasonAr?: string;
  reasonCategory?: 'medical' | 'family_emergency' | 'appointment' | 'personal' | 'other' | 'no_reason';
  isApproved?: boolean;
  approvedBy?: ObjectId;
  approvedAt?: string;
  deductionApplied?: boolean;
  deductionAmount?: number;
}

export interface OvertimeDetails {
  hasOvertime?: boolean;
  regularOvertime?: {
    hours?: number;
    minutes?: number;
    rate?: number;
  };
  weekendOvertime?: {
    hours?: number;
    minutes?: number;
    rate?: number;
  };
  holidayOvertime?: {
    hours?: number;
    minutes?: number;
    rate?: number;
  };
  totalOvertimeMinutes?: number;
  preApproved?: boolean;
  approvedBy?: ObjectId;
  approvedAt?: string;
  approvalNotes?: string;
  reason?: string;
  reasonAr?: string;
  taskDescription?: string;
  taskDescriptionAr?: string;
  compensation?: {
    type?: 'payment' | 'time_off' | 'both';
    calculatedAmount?: number;
    timeOffHours?: number;
    paid?: boolean;
    paidInPayrollRun?: ObjectId;
  };
}

export interface AttendanceRecord {
  _id: ObjectId;
  attendanceId: string;
  employeeId: ObjectId;
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  department?: string;
  departmentId?: ObjectId;
  date: string;
  dayOfWeek?: string;
  shift?: {
    shiftId?: ObjectId;
    shiftName?: string;
    startTime?: string;
    endTime?: string;
  };
  checkIn?: CheckDetails;
  checkOut?: CheckDetails;
  breaks?: Break[];
  totalBreakTime?: number;
  workDuration?: number; // minutes
  effectiveWorkHours?: number;
  status: AttendanceStatus;
  lateArrival?: LateArrival;
  earlyDeparture?: EarlyDeparture;
  overtime?: OvertimeDetails;
  isApproved?: boolean;
  approvedBy?: ObjectId;
  approvedAt?: string;
  notes?: string;
  firmId?: ObjectId;
  lawyerId?: ObjectId;
  createdAt: string;
  updatedAt: string;
}

// GET /api/hr/attendance - Get all attendance records
export interface GetAttendanceQuery extends PaginationParams {
  employeeId?: ObjectId;
  departmentId?: ObjectId;
  status?: AttendanceStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface GetAttendanceResponse extends ApiListResponse<AttendanceRecord> {}

// GET /api/hr/attendance/stats - Get attendance statistics
export interface GetAttendanceStatsQuery {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: ObjectId;
  employeeId?: ObjectId;
}

export interface GetAttendanceStatsResponse extends ApiResponse {
  data: {
    totalRecords: number;
    byStatus: Array<{ status: string; count: number }>;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    onLeaveCount: number;
    avgWorkHours: number;
    totalOvertimeHours: number;
    attendanceRate: number;
    punctualityRate: number;
  };
}

// GET /api/hr/attendance/:id - Get single attendance record
export interface GetAttendanceByIdResponse extends ApiResponse<AttendanceRecord> {}

// POST /api/hr/attendance/check-in - Check in
export interface CheckInRequest {
  employeeId?: ObjectId;
  location?: CheckLocation;
  biometric?: Biometric;
  deviceType?: DeviceType;
  source?: CheckSource;
  notes?: string;
  notesAr?: string;
  photo?: string;
}

export interface CheckInResponse extends ApiResponse<AttendanceRecord> {}

// POST /api/hr/attendance/check-out - Check out
export interface CheckOutRequest {
  employeeId?: ObjectId;
  location?: CheckLocation;
  biometric?: Biometric;
  deviceType?: DeviceType;
  source?: CheckSource;
  notes?: string;
  notesAr?: string;
  photo?: string;
}

export interface CheckOutResponse extends ApiResponse<AttendanceRecord> {}

// POST /api/hr/attendance/break-start - Start break
export interface BreakStartRequest {
  employeeId?: ObjectId;
  type?: BreakType;
  typeAr?: string;
  isPaid?: boolean;
  notes?: string;
}

export interface BreakStartResponse extends ApiResponse<AttendanceRecord> {}

// POST /api/hr/attendance/break-end - End break
export interface BreakEndRequest {
  employeeId?: ObjectId;
  notes?: string;
}

export interface BreakEndResponse extends ApiResponse<AttendanceRecord> {}

// POST /api/hr/attendance/manual-entry - Manual entry
export interface ManualAttendanceEntryRequest {
  employeeId: ObjectId;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status?: AttendanceStatus;
  workDuration?: number;
  breaks?: Array<{
    type?: BreakType;
    startTime?: string;
    endTime?: string;
    duration?: number;
    isPaid?: boolean;
  }>;
  overtime?: Partial<OvertimeDetails>;
  notes?: string;
  notesAr?: string;
  reason?: string;
}

export interface ManualAttendanceEntryResponse extends ApiResponse<AttendanceRecord> {}

// PATCH /api/hr/attendance/:id - Update attendance
export interface UpdateAttendanceRequest {
  checkInTime?: string;
  checkOutTime?: string;
  status?: AttendanceStatus;
  breaks?: Break[];
  overtime?: Partial<OvertimeDetails>;
  lateArrival?: Partial<LateArrival>;
  earlyDeparture?: Partial<EarlyDeparture>;
  notes?: string;
  notesAr?: string;
}

export interface UpdateAttendanceResponse extends ApiResponse<AttendanceRecord> {}

// DELETE /api/hr/attendance/:id - Delete attendance
export interface DeleteAttendanceResponse extends ApiResponse {}

// POST /api/hr/attendance/bulk-delete - Bulk delete
export interface BulkDeleteAttendanceRequest {
  ids: ObjectId[];
}

export interface BulkDeleteAttendanceResponse extends ApiResponse {
  deletedCount: number;
}

// POST /api/hr/attendance/:id/approve - Approve attendance
export interface ApproveAttendanceRequest {
  notes?: string;
}

export interface ApproveAttendanceResponse extends ApiResponse<AttendanceRecord> {}

// GET /api/hr/attendance/location/verify - Verify location
export interface VerifyLocationQuery {
  latitude: number;
  longitude: number;
  employeeId?: ObjectId;
}

export interface VerifyLocationResponse extends ApiResponse {
  data: {
    isWithinGeofence: boolean;
    geofenceId?: ObjectId;
    geofenceName?: string;
    distanceFromOffice: number;
    nearestOffice?: {
      officeId: ObjectId;
      officeName: string;
      distance: number;
    };
  };
}

// GET /api/hr/attendance/my-today - Get today's attendance
export interface GetMyTodayAttendanceResponse extends ApiResponse<AttendanceRecord | null> {}

// ═══════════════════════════════════════════════════════════════
// LEAVE REQUEST
// ═══════════════════════════════════════════════════════════════

// Enums
export enum LeaveType {
  ANNUAL = 'annual',
  SICK = 'sick',
  HAJJ = 'hajj',
  MARRIAGE = 'marriage',
  BIRTH = 'birth',
  DEATH = 'death',
  EID = 'eid',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  EXAM = 'exam',
  UNPAID = 'unpaid'
}

export enum LeaveStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

export enum LeaveCategory {
  PAID = 'paid',
  UNPAID = 'unpaid',
  PARTIAL_PAY = 'partial_pay'
}

// Sub-interfaces
export interface MedicalCertificate {
  required?: boolean;
  provided?: boolean;
  certificateUrl?: string;
  issuingDoctor?: string;
  doctorLicenseNumber?: string;
  issuingClinic?: string;
  clinicLicenseNumber?: string;
  issueDate?: string;
  certificateNumber?: string;
  diagnosis?: string;
  diagnosisCode?: string;
  recommendedRestPeriod?: number;
  restrictions?: string;
  verified?: boolean;
  verifiedBy?: ObjectId;
  verificationDate?: string;
}

export interface WorkHandoverTask {
  taskId?: string;
  taskName?: string;
  taskDescription?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  handedOver?: boolean;
  handoverDate?: string;
  instructions?: string;
}

export interface WorkHandover {
  required?: boolean;
  delegateTo?: {
    employeeId?: ObjectId;
    employeeName?: string;
    jobTitle?: string;
    department?: string;
    notified?: boolean;
    notificationDate?: string;
    accepted?: boolean;
    acceptanceDate?: string;
    rejectionReason?: string;
  };
  tasks?: WorkHandoverTask[];
  handoverCompleted?: boolean;
  handoverCompletionDate?: string;
  handoverApprovedByManager?: boolean;
}

export interface ApprovalStep {
  stepNumber: number;
  stepName: string;
  stepNameAr?: string;
  approverRole: string;
  approverId?: ObjectId;
  approverName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  actionDate?: string;
  comments?: string;
  notificationSent?: boolean;
  notificationDate?: string;
  remindersSent?: number;
  autoApproved?: boolean;
  autoApprovalReason?: string;
}

export interface ApprovalWorkflow {
  required?: boolean;
  steps?: ApprovalStep[];
  currentStep?: number;
  totalSteps?: number;
  finalStatus?: 'pending' | 'approved' | 'rejected';
  escalated?: boolean;
  escalationDate?: string;
  escalatedTo?: ObjectId;
}

export interface LeaveDocument {
  documentType?: 'medical_certificate' | 'marriage_certificate' | 'birth_certificate' |
    'death_certificate' | 'hajj_permit' | 'exam_proof' | 'handover_document' |
    'approval_letter' | 'extension_request' | 'medical_clearance' | 'other';
  documentName?: string;
  documentNameAr?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
  uploadedOn?: string;
  uploadedBy?: ObjectId;
  required?: boolean;
  verified?: boolean;
  verifiedBy?: ObjectId;
  verificationDate?: string;
  expiryDate?: string;
}

export interface LeaveDates {
  startDate: string;
  endDate: string;
  totalDays: number;
  workingDays?: number;
  halfDay?: boolean;
  halfDayPeriod?: 'first_half' | 'second_half';
  returnDate?: string;
}

export interface LeaveRequest {
  _id: ObjectId;
  leaveRequestId: string;
  employeeId: ObjectId;
  employeeNumber?: string;
  employeeName?: string;
  employeeNameAr?: string;
  department?: string;
  departmentId?: ObjectId;
  jobTitle?: string;
  leaveType: LeaveType;
  leaveTypeName?: string;
  leaveTypeNameAr?: string;
  dates: LeaveDates;
  reason?: string;
  reasonAr?: string;
  status: LeaveStatus;
  leaveCategory?: LeaveCategory;
  payPercentage?: number;
  medicalCertificate?: MedicalCertificate;
  workHandover?: WorkHandover;
  approvalWorkflow?: ApprovalWorkflow;
  documents?: LeaveDocument[];
  contactDuringLeave?: {
    available?: boolean;
    contactNumber?: string;
    alternateNumber?: string;
    email?: string;
    emergencyContact?: {
      name?: string;
      relationship?: string;
      phone?: string;
    };
  };
  isEmergency?: boolean;
  emergencyReason?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  requestedOn?: string;
  lastModifiedBy?: ObjectId;
  lastModifiedAt?: string;
  firmId?: ObjectId;
  lawyerId?: ObjectId;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  leaveType: LeaveType;
  entitlement: number;
  used: number;
  pending: number;
  available: number;
  carriedForward?: number;
  expiryDate?: string;
}

// GET /api/hr/leave-requests - Get all leave requests
export interface GetLeaveRequestsQuery extends PaginationParams {
  employeeId?: ObjectId;
  departmentId?: ObjectId;
  leaveType?: LeaveType;
  status?: LeaveStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface GetLeaveRequestsResponse extends ApiListResponse<LeaveRequest> {}

// GET /api/hr/leave-requests/stats - Get leave statistics
export interface GetLeaveStatsQuery {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: ObjectId;
  employeeId?: ObjectId;
}

export interface GetLeaveStatsResponse extends ApiResponse {
  data: {
    totalRequests: number;
    byStatus: Array<{ status: string; count: number }>;
    byType: Array<{ type: string; count: number; totalDays: number }>;
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
    totalDaysRequested: number;
    totalDaysApproved: number;
    avgApprovalTime: number;
  };
}

// GET /api/hr/leave-requests/:id - Get single leave request
export interface GetLeaveRequestByIdResponse extends ApiResponse<LeaveRequest> {}

// POST /api/hr/leave-requests - Create leave request
export interface CreateLeaveRequestRequest {
  employeeId: ObjectId;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  halfDay?: boolean;
  halfDayPeriod?: 'first_half' | 'second_half';
  reason?: string;
  reasonAr?: string;
  isEmergency?: boolean;
  emergencyReason?: string;
  contactDuringLeave?: {
    available?: boolean;
    contactNumber?: string;
    alternateNumber?: string;
    email?: string;
    emergencyContact?: {
      name?: string;
      relationship?: string;
      phone?: string;
    };
  };
  workHandover?: {
    delegateTo?: {
      employeeId?: ObjectId;
    };
    tasks?: Array<{
      taskName?: string;
      taskDescription?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      dueDate?: string;
      instructions?: string;
    }>;
  };
}

export interface CreateLeaveRequestResponse extends ApiResponse<LeaveRequest> {}

// PATCH /api/hr/leave-requests/:id - Update leave request
export interface UpdateLeaveRequestRequest {
  startDate?: string;
  endDate?: string;
  halfDay?: boolean;
  halfDayPeriod?: 'first_half' | 'second_half';
  reason?: string;
  reasonAr?: string;
  contactDuringLeave?: {
    available?: boolean;
    contactNumber?: string;
    alternateNumber?: string;
    email?: string;
  };
  workHandover?: Partial<WorkHandover>;
}

export interface UpdateLeaveRequestResponse extends ApiResponse<LeaveRequest> {}

// DELETE /api/hr/leave-requests/:id - Delete leave request
export interface DeleteLeaveRequestResponse extends ApiResponse {}

// POST /api/hr/leave-requests/bulk-delete - Bulk delete
export interface BulkDeleteLeaveRequestsRequest {
  ids: ObjectId[];
}

export interface BulkDeleteLeaveRequestsResponse extends ApiResponse {
  deletedCount: number;
}

// POST /api/hr/leave-requests/:id/approve - Approve leave
export interface ApproveLeaveRequest {
  comments?: string;
  approverRole?: string;
}

export interface ApproveLeaveResponse extends ApiResponse<LeaveRequest> {}

// POST /api/hr/leave-requests/:id/reject - Reject leave
export interface RejectLeaveRequest {
  comments: string;
  rejectionReason?: string;
  approverRole?: string;
}

export interface RejectLeaveResponse extends ApiResponse<LeaveRequest> {}

// POST /api/hr/leave-requests/:id/cancel - Cancel leave
export interface CancelLeaveRequest {
  cancellationReason: string;
}

export interface CancelLeaveResponse extends ApiResponse<LeaveRequest> {}

// GET /api/hr/leave-requests/balance/:employeeId - Get leave balance
export interface GetLeaveBalanceResponse extends ApiResponse {
  data: {
    employeeId: ObjectId;
    employeeName: string;
    balances: LeaveBalance[];
    periodStart: string;
    periodEnd: string;
  };
}

// GET /api/hr/leave-requests/calendar - Get leave calendar
export interface GetLeaveCalendarQuery {
  month?: number;
  year?: number;
  departmentId?: ObjectId;
}

export interface GetLeaveCalendarResponse extends ApiResponse {
  data: Array<{
    date: string;
    employees: Array<{
      employeeId: ObjectId;
      employeeName: string;
      employeeNameAr?: string;
      department?: string;
      leaveType: LeaveType;
      leaveTypeName: string;
      halfDay?: boolean;
    }>;
    totalOnLeave: number;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE REVIEW
// ═══════════════════════════════════════════════════════════════

// Enums
export enum ReviewType {
  ANNUAL = 'annual',
  QUARTERLY = 'quarterly',
  SEMI_ANNUAL = 'semi_annual',
  PROBATION = 'probation',
  PROJECT = 'project',
  AD_HOC = 'ad_hoc'
}

export enum ReviewStatus {
  DRAFT = 'draft',
  SELF_ASSESSMENT = 'self_assessment',
  MANAGER_REVIEW = 'manager_review',
  CALIBRATION = 'calibration',
  COMPLETED = 'completed',
  ACKNOWLEDGED = 'acknowledged',
  DISPUTED = 'disputed'
}

export enum FinalRating {
  EXCEPTIONAL = 5,
  EXCEEDS_EXPECTATIONS = 4,
  MEETS_EXPECTATIONS = 3,
  NEEDS_IMPROVEMENT = 2,
  UNSATISFACTORY = 1
}

// Sub-interfaces
export interface ReviewPeriod {
  startDate: string;
  endDate: string;
  reviewDueDate?: string;
  fiscalYear?: number;
  quarter?: number;
}

export interface Competency {
  competencyId: string;
  competencyName: string;
  competencyNameAr?: string;
  competencyCategory?: string;
  competencyDescription?: string;
  competencyDescriptionAr?: string;
  weight?: number;
  ratingScale?: string;
  selfRating?: number;
  selfComments?: string;
  managerRating?: number;
  managerComments?: string;
  managerCommentsAr?: string;
  ratingLabel?: string;
  ratingLabelAr?: string;
  examples?: string[];
}

export interface Goal {
  goalId: string;
  goalName: string;
  goalNameAr?: string;
  description?: string;
  descriptionAr?: string;
  targetValue?: number;
  actualValue?: number;
  achievementPercentage?: number;
  weight?: number;
  status?: 'not_started' | 'in_progress' | 'completed' | 'exceeded' | 'not_achieved';
  selfRating?: number;
  employeeComments?: string;
  managerRating?: number;
  managerComments?: string;
}

export interface KPI {
  kpiId: string;
  kpiName: string;
  kpiNameAr?: string;
  description?: string;
  target?: number;
  actual?: number;
  achievementPercentage?: number;
  weight?: number;
  comments?: string;
}

export interface SelfAssessment {
  required?: boolean;
  submitted?: boolean;
  submittedOn?: string;
  selfRating?: number;
  accomplishments?: string;
  accomplishmentsAr?: string;
  keyAchievements?: string[];
  challenges?: string;
  challengesAr?: string;
  strengths?: string;
  strengthsAr?: string;
  developmentNeeds?: string;
  developmentNeedsAr?: string;
  careerAspirations?: string;
  careerAspirationsAr?: string;
  trainingRequests?: string[];
  additionalComments?: string;
  additionalCommentsAr?: string;
}

export interface ManagerAssessment {
  completedAt?: string;
  overallComments?: string;
  overallCommentsAr?: string;
  keyAchievements?: string[];
  performanceHighlights?: string;
  performanceHighlightsAr?: string;
  areasExceeded?: string[];
  areasMet?: string[];
  areasBelow?: string[];
  improvementProgress?: string;
  behavioralObservations?: string;
  workQualityAssessment?: string;
  collaborationAssessment?: string;
  initiativeAssessment?: string;
  adaptabilityAssessment?: string;
  leadershipAssessment?: string;
  technicalSkillsAssessment?: string;
  communicationAssessment?: string;
  attendanceAssessment?: string;
  professionalismAssessment?: string;
  overallRating?: number;
  ratingJustification?: string;
  potentialAssessment?: string;
}

export interface Feedback360Provider {
  providerId: ObjectId;
  providerName?: string;
  providerNameAr?: string;
  providerRole?: string;
  relationship?: 'peer' | 'subordinate' | 'manager' | 'client' | 'external';
  status?: 'pending' | 'completed' | 'declined';
  requestedAt?: string;
  completedAt?: string;
  anonymous?: boolean;
}

export interface Feedback360Response {
  providerId: ObjectId;
  ratings?: Array<{
    competencyId: string;
    rating: number;
    comments?: string;
  }>;
  overallRating?: number;
  strengths?: string;
  areasForImprovement?: string;
  specificFeedback?: string;
  submittedAt?: string;
  anonymous?: boolean;
}

export interface Feedback360 {
  enabled?: boolean;
  providers?: Feedback360Provider[];
  responses?: Feedback360Response[];
  aggregatedRatings?: Array<{
    competencyId: string;
    avgRating: number;
    responseCount: number;
  }>;
  summary?: {
    commonStrengths?: string[];
    commonDevelopmentAreas?: string[];
    overallSentiment?: 'positive' | 'negative' | 'mixed';
  };
}

export interface DevelopmentPlanItem {
  itemId: string;
  developmentArea: string;
  developmentAreaAr?: string;
  targetCompetency?: string;
  developmentActions?: string[];
  timeline?: string;
  targetDate?: string;
  status?: 'not_started' | 'in_progress' | 'completed';
  progress?: number;
  completionDate?: string;
}

export interface DevelopmentPlan {
  required?: boolean;
  items?: DevelopmentPlanItem[];
  trainingRecommendations?: string[];
  mentorAssigned?: {
    mentorId?: ObjectId;
    mentorName?: string;
    mentorRole?: string;
  };
  careerPath?: string;
  careerAspirations?: string;
  successionPlanning?: string;
}

export interface EmployeeResponse {
  responseProvided?: boolean;
  responseDate?: string;
  agreesWithReview?: boolean;
  agreement?: 'agree' | 'partially_agree' | 'disagree';
  employeeComments?: string;
  employeeCommentsAr?: string;
  disagreementAreas?: string[];
  disagreementExplanation?: string;
  additionalAchievements?: string;
  supportRequested?: string;
  careerGoalsAlignment?: string;
  acknowledged?: boolean;
  acknowledgedDate?: string;
  signature?: string;
}

export interface Dispute {
  disputed?: boolean;
  disputeDate?: string;
  disputeReason?: string;
  disputeAreas?: Array<{
    area: string;
    justification?: string;
  }>;
  disputeStatus?: 'submitted' | 'under_review' | 'resolved' | 'escalated';
}

export interface Calibration {
  calibrationSessionId?: ObjectId;
  calibrationSession?: string;
  preCalibrationRating?: number;
  postCalibrationRating?: number;
  calibrated?: boolean;
  calibrationDate?: string;
  calibratedBy?: ObjectId;
  ratingAdjusted?: boolean;
  adjustmentReason?: string;
  comparativeRanking?: number;
  calibrationNotes?: string;
}

export interface PerformanceReview {
  _id: ObjectId;
  reviewId: string;
  employeeId: ObjectId;
  employeeName?: string;
  employeeNameAr?: string;
  employeeNumber?: string;
  department?: string;
  departmentAr?: string;
  departmentId?: ObjectId;
  position?: string;
  positionAr?: string;
  reviewerId?: ObjectId;
  reviewerName?: string;
  reviewerNameAr?: string;
  reviewerTitle?: string;
  managerId?: ObjectId;
  managerName?: string;
  managerNameAr?: string;
  reviewType: ReviewType;
  reviewPeriod: ReviewPeriod;
  templateId?: ObjectId;
  status: ReviewStatus;
  isAttorney?: boolean;
  goals?: Goal[];
  kpis?: KPI[];
  competencies?: Competency[];
  selfAssessment?: SelfAssessment;
  managerAssessment?: ManagerAssessment;
  feedback360?: Feedback360;
  developmentPlan?: DevelopmentPlan;
  strengths?: string[];
  areasForImprovement?: string[];
  recommendations?: string[];
  overallScore?: number;
  finalRating?: FinalRating;
  employeeResponse?: EmployeeResponse;
  dispute?: Dispute;
  calibration?: Calibration;
  approvalWorkflow?: Array<{
    stepNumber: number;
    approverRole: string;
    stepName: string;
    status: 'pending' | 'approved' | 'rejected' | 'skipped';
    approverId?: ObjectId;
    actionDate?: string;
  }>;
  currentApprovalStep?: number;
  finalApprovalStatus?: 'pending' | 'approved' | 'rejected';
  finalApprover?: ObjectId;
  finalApprovalDate?: string;
  dueDate?: string;
  completedOn?: string;
  acknowledgedOn?: string;
  notes?: string;
  lastModifiedBy?: ObjectId;
  lastModifiedAt?: string;
  createdBy?: ObjectId;
  firmId?: ObjectId;
  lawyerId?: ObjectId;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: ObjectId;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewTemplate {
  _id: ObjectId;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  reviewType?: ReviewType;
  competencies?: Array<{
    competencyId: string;
    name: string;
    nameAr?: string;
    category?: string;
    description?: string;
    descriptionAr?: string;
    weight?: number;
  }>;
  ratingScale?: string;
  isActive?: boolean;
  applicableRoles?: string[];
  applicableDepartments?: ObjectId[];
  firmId?: ObjectId;
  lawyerId?: ObjectId;
  createdBy?: ObjectId;
  createdAt: string;
  updatedAt: string;
}

export interface CalibrationSession {
  _id: ObjectId;
  sessionName: string;
  sessionNameAr?: string;
  description?: string;
  descriptionAr?: string;
  scheduledDate?: string;
  departmentId?: ObjectId;
  periodYear?: number;
  reviewType?: ReviewType;
  participants?: ObjectId[];
  reviewsIncluded?: ObjectId[];
  totalReviewsCount?: number;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  completedAt?: string;
  completedBy?: ObjectId;
  actualEndTime?: string;
  firmId?: ObjectId;
  lawyerId?: ObjectId;
  createdBy?: ObjectId;
  createdAt: string;
  updatedAt: string;
}

// GET /api/hr/performance-reviews - Get all performance reviews
export interface GetPerformanceReviewsQuery extends PaginationParams {
  reviewType?: ReviewType;
  status?: ReviewStatus;
  departmentId?: ObjectId;
  reviewerId?: ObjectId;
  employeeId?: ObjectId;
  periodYear?: number;
  finalRating?: FinalRating;
  search?: string;
}

export interface GetPerformanceReviewsResponse extends ApiListResponse<PerformanceReview> {}

// GET /api/hr/performance-reviews/stats - Get performance statistics
export interface GetPerformanceStatsQuery {
  periodYear?: number;
  departmentId?: ObjectId;
}

export interface GetPerformanceStatsResponse extends ApiResponse {
  data: {
    totalReviews: number;
    byStatus: Array<{ status: string; count: number }>;
    byRating: Array<{ rating: number; count: number; percentage: number }>;
    avgOverallScore: number | null;
    completionRate: number;
    overdueReviews: number;
    upcomingDue: number;
  };
}

// GET /api/hr/performance-reviews/:id - Get single review
export interface GetPerformanceReviewByIdResponse extends ApiResponse<PerformanceReview> {}

// POST /api/hr/performance-reviews - Create performance review
export interface CreatePerformanceReviewRequest {
  employeeId: ObjectId;
  reviewType: ReviewType;
  reviewPeriod: {
    startDate: string;
    endDate: string;
    reviewDueDate?: string;
  };
  templateId?: ObjectId;
  goals?: Array<{
    goalName: string;
    goalNameAr?: string;
    description?: string;
    targetValue?: number;
    weight?: number;
  }>;
  kpis?: Array<{
    kpiName: string;
    kpiNameAr?: string;
    description?: string;
    target?: number;
    weight?: number;
  }>;
  include360Feedback?: boolean;
  feedbackProviders?: Array<{
    providerId: ObjectId;
    providerName?: string;
    providerNameAr?: string;
    relationship: 'peer' | 'subordinate' | 'manager' | 'client' | 'external';
    anonymous?: boolean;
  }>;
}

export interface CreatePerformanceReviewResponse extends ApiResponse<PerformanceReview> {}

// PATCH /api/hr/performance-reviews/:id - Update review
export interface UpdatePerformanceReviewRequest {
  goals?: Goal[];
  kpis?: KPI[];
  competencies?: Competency[];
  developmentPlan?: Partial<DevelopmentPlan>;
  strengths?: string[];
  areasForImprovement?: string[];
  notes?: string;
  nextSteps?: string[];
  dueDate?: string;
  reviewPeriod?: Partial<ReviewPeriod>;
}

export interface UpdatePerformanceReviewResponse extends ApiResponse<PerformanceReview> {}

// DELETE /api/hr/performance-reviews/:id - Delete review
export interface DeletePerformanceReviewResponse extends ApiResponse {}

// POST /api/hr/performance-reviews/bulk-delete - Bulk delete reviews
export interface BulkDeletePerformanceReviewsRequest {
  ids: ObjectId[];
}

export interface BulkDeletePerformanceReviewsResponse extends ApiResponse {
  deletedCount: number;
}

// POST /api/hr/performance-reviews/:id/self-assessment - Submit self-assessment
export interface SubmitSelfAssessmentRequest {
  accomplishments?: string;
  accomplishmentsAr?: string;
  keyAchievements?: string[];
  challenges?: string;
  challengesAr?: string;
  strengths?: string;
  strengthsAr?: string;
  developmentNeeds?: string;
  developmentNeedsAr?: string;
  careerAspirations?: string;
  careerAspirationsAr?: string;
  trainingRequests?: string[];
  additionalComments?: string;
  additionalCommentsAr?: string;
  selfRating?: number;
  competencyRatings?: Array<{
    competencyId: string;
    rating: number;
    comments?: string;
  }>;
  goalRatings?: Array<{
    goalId: string;
    rating: number;
    comments?: string;
    actualValue?: number;
  }>;
}

export interface SubmitSelfAssessmentResponse extends ApiResponse<PerformanceReview> {}

// POST /api/hr/performance-reviews/:id/manager-assessment - Submit manager assessment
export interface SubmitManagerAssessmentRequest {
  overallComments?: string;
  overallCommentsAr?: string;
  keyAchievements?: string[];
  performanceHighlights?: string;
  performanceHighlightsAr?: string;
  areasExceeded?: string[];
  areasMet?: string[];
  areasBelow?: string[];
  improvementProgress?: string;
  behavioralObservations?: string;
  workQualityAssessment?: string;
  collaborationAssessment?: string;
  initiativeAssessment?: string;
  adaptabilityAssessment?: string;
  leadershipAssessment?: string;
  technicalSkillsAssessment?: string;
  communicationAssessment?: string;
  attendanceAssessment?: string;
  professionalismAssessment?: string;
  overallRating: number;
  ratingJustification?: string;
  potentialAssessment?: string;
  recommendations?: string[];
  competencyRatings?: Array<{
    competencyId: string;
    rating: number;
    comments?: string;
    commentsAr?: string;
    examples?: string[];
  }>;
  goalRatings?: Array<{
    goalId: string;
    rating: number;
    comments?: string;
  }>;
  kpiRatings?: Array<{
    kpiId: string;
    actual: number;
    comments?: string;
  }>;
  attorneyMetrics?: any;
  strengths?: string[];
  areasForImprovement?: string[];
}

export interface SubmitManagerAssessmentResponse extends ApiResponse<PerformanceReview> {}

// POST /api/hr/performance-reviews/:id/360-feedback/request - Request 360 feedback
export interface Request360FeedbackRequest {
  providers: Array<{
    providerId: ObjectId;
    providerName?: string;
    providerNameAr?: string;
    relationship: 'peer' | 'subordinate' | 'manager' | 'client' | 'external';
    anonymous?: boolean;
  }>;
}

export interface Request360FeedbackResponse extends ApiResponse {
  data: Feedback360;
}

// POST /api/hr/performance-reviews/:id/360-feedback/:providerId - Submit 360 feedback
export interface Submit360FeedbackRequest {
  ratings?: Array<{
    competencyId: string;
    rating: number;
    comments?: string;
  }>;
  overallRating?: number;
  strengths?: string;
  areasForImprovement?: string;
  specificFeedback?: string;
}

export interface Submit360FeedbackResponse extends ApiResponse {}

// POST /api/hr/performance-reviews/:id/development-plan - Create development plan
export interface CreateDevelopmentPlanRequest {
  items?: Array<{
    developmentArea: string;
    developmentAreaAr?: string;
    targetCompetency?: string;
    developmentActions?: string[];
    timeline?: string;
    targetDate?: string;
    status?: 'not_started' | 'in_progress' | 'completed';
    progress?: number;
  }>;
  trainingRecommendations?: string[];
  mentorAssigned?: {
    mentorId?: ObjectId;
    mentorName?: string;
    mentorRole?: string;
  };
  careerPath?: string;
  careerAspirations?: string;
  successionPlanning?: string;
}

export interface CreateDevelopmentPlanResponse extends ApiResponse {
  data: DevelopmentPlan;
}

// PATCH /api/hr/performance-reviews/:id/development-plan/:itemId - Update dev plan item
export interface UpdateDevelopmentPlanItemRequest {
  status?: 'not_started' | 'in_progress' | 'completed';
  progress?: number;
  actions?: string[];
  completedActions?: string[];
}

export interface UpdateDevelopmentPlanItemResponse extends ApiResponse {
  data: DevelopmentPlanItem;
}

// POST /api/hr/performance-reviews/:id/complete - Complete review
export interface CompleteReviewResponse extends ApiResponse<PerformanceReview> {}

// POST /api/hr/performance-reviews/:id/acknowledge - Acknowledge review
export interface AcknowledgeReviewRequest {
  agreesWithReview?: boolean;
  agreement?: 'agree' | 'partially_agree' | 'disagree';
  employeeComments?: string;
  employeeCommentsAr?: string;
  disagreementAreas?: string[];
  disagreementExplanation?: string;
  additionalAchievements?: string;
  supportRequested?: string;
  careerGoalsAlignment?: string;
  signature?: string;
}

export interface AcknowledgeReviewResponse extends ApiResponse<PerformanceReview> {}

// POST /api/hr/performance-reviews/:id/calibration - Submit for calibration
export interface SubmitForCalibrationRequest {
  calibrationSessionId: ObjectId;
}

export interface SubmitForCalibrationResponse extends ApiResponse<PerformanceReview> {}

// POST /api/hr/performance-reviews/:id/calibration/apply - Apply calibration
export interface ApplyCalibrationRequest {
  finalRating: number;
  adjustmentReason?: string;
  comparativeRanking?: number;
  calibrationNotes?: string;
}

export interface ApplyCalibrationResponse extends ApiResponse<PerformanceReview> {}

// GET /api/hr/performance-reviews/employee/:employeeId/history - Get employee history
export interface GetEmployeeHistoryResponse extends ApiResponse {
  data: {
    reviews: PerformanceReview[];
    ratingTrend: Array<{
      period: string;
      rating: number;
      score: number;
    }>;
    strengthsOverTime: string[];
    developmentAreasOverTime: string[];
  };
}

// GET /api/hr/performance-reviews/team/:managerId/summary - Get team summary
export interface GetTeamSummaryQuery {
  periodYear?: number;
}

export interface GetTeamSummaryResponse extends ApiResponse {
  data: {
    teamMembers: Array<{
      employeeId: ObjectId;
      employeeName: string;
      employeeNameAr?: string;
      reviewStatus: ReviewStatus;
      finalRating?: number;
      overallScore?: number;
    }>;
    ratingDistribution: Array<{
      rating: string;
      count: number;
    }>;
    avgTeamScore: number | null;
    completedCount: number;
    pendingCount: number;
    totalReviews: number;
  };
}

// POST /api/hr/performance-reviews/bulk-create - Bulk create reviews
export interface BulkCreateReviewsRequest {
  departmentId?: ObjectId;
  employeeIds?: ObjectId[];
  reviewType: ReviewType;
  reviewPeriod: {
    startDate: string;
    endDate: string;
    reviewDueDate?: string;
  };
  templateId?: ObjectId;
}

export interface BulkCreateReviewsResponse extends ApiResponse {
  data: {
    created: number;
    failed: number;
    reviews: PerformanceReview[];
    errors: Array<{
      employeeId: ObjectId;
      employeeName?: string;
      error: string;
    }>;
  };
}

// POST /api/hr/performance-reviews/:id/reminder - Send reminder
export interface SendReminderRequest {
  reminderType?: 'self_assessment' | 'manager_review' | '360_feedback' | 'acknowledgement';
}

export interface SendReminderResponse extends ApiResponse {}

// GET /api/hr/performance-reviews/overdue - Get overdue reviews
export interface GetOverdueReviewsResponse extends ApiListResponse<PerformanceReview> {}

// GET /api/hr/performance-reviews/templates - Get templates
export interface GetTemplatesQuery {
  reviewType?: ReviewType;
}

export interface GetTemplatesResponse extends ApiListResponse<ReviewTemplate> {}

// POST /api/hr/performance-reviews/templates - Create template
export interface CreateTemplateRequest {
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  reviewType?: ReviewType;
  competencies?: Array<{
    competencyId: string;
    name: string;
    nameAr?: string;
    category?: string;
    description?: string;
    descriptionAr?: string;
    weight?: number;
  }>;
  ratingScale?: string;
  isActive?: boolean;
  applicableRoles?: string[];
  applicableDepartments?: ObjectId[];
}

export interface CreateTemplateResponse extends ApiResponse<ReviewTemplate> {}

// PATCH /api/hr/performance-reviews/templates/:id - Update template
export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {}

export interface UpdateTemplateResponse extends ApiResponse<ReviewTemplate> {}

// GET /api/hr/performance-reviews/calibration-sessions - Get calibration sessions
export interface GetCalibrationSessionsQuery {
  periodYear?: number;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  departmentId?: ObjectId;
}

export interface GetCalibrationSessionsResponse extends ApiListResponse<CalibrationSession> {}

// POST /api/hr/performance-reviews/calibration-sessions - Create calibration session
export interface CreateCalibrationSessionRequest {
  sessionName: string;
  sessionNameAr?: string;
  description?: string;
  descriptionAr?: string;
  scheduledDate?: string;
  departmentId?: ObjectId;
  periodYear?: number;
  reviewType?: ReviewType;
  participants?: ObjectId[];
  reviewsIncluded?: ObjectId[];
}

export interface CreateCalibrationSessionResponse extends ApiResponse<CalibrationSession> {}

// POST /api/hr/performance-reviews/calibration-sessions/:id/complete - Complete session
export interface CompleteCalibrationSessionResponse extends ApiResponse<CalibrationSession> {}
