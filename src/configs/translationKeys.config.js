/**
 * Translation Keys Configuration
 *
 * Maps backend status values and enum fields to frontend translation keys.
 * This ensures consistency between API responses and frontend i18n translations.
 *
 * Frontend translation namespaces:
 * - biometric: Biometric device and enrollment related translations
 * - hrAnalytics: HR analytics dashboard translations
 */

/**
 * Biometric Status Translation Keys
 * Maps enrollment status enum values to translation keys
 */
const BIOMETRIC_STATUS_KEYS = {
    // Enrollment status
    pending: 'biometric.status.pending',           // قيد الانتظار
    enrolled: 'biometric.status.enrolled',         // مسجل
    complete: 'biometric.status.complete',         // مكتمل
    failed: 'biometric.status.failed',             // فشل
    expired: 'biometric.status.expired',           // منتهي الصلاحية
    revoked: 'biometric.status.revoked',           // ملغى

    // Device status
    online: 'biometric.device.online',             // متصل
    offline: 'biometric.device.offline',           // غير متصل
    maintenance: 'biometric.device.maintenance',   // صيانة
    error: 'biometric.device.error'                // خطأ
};

/**
 * Biometric Result Translation Keys
 * Maps verification/identification results to translation keys
 */
const BIOMETRIC_RESULT_KEYS = {
    success: 'biometric.result.success',           // نجاح
    failed: 'biometric.result.failed',             // فشل
    verify_success: 'biometric.result.verifySuccess',
    verify_fail: 'biometric.result.verifyFail',
    identify_success: 'biometric.result.identifySuccess',
    identify_fail: 'biometric.result.identifyFail',
    spoofing_detected: 'biometric.result.spoofingDetected'
};

/**
 * Biometric Event Type Translation Keys
 */
const BIOMETRIC_EVENT_KEYS = {
    check_in: 'biometric.event.checkIn',           // تسجيل الحضور
    check_out: 'biometric.event.checkOut',         // تسجيل الانصراف
    break_start: 'biometric.event.breakStart',     // بداية الاستراحة
    break_end: 'biometric.event.breakEnd',         // نهاية الاستراحة
    enrollment: 'biometric.event.enrollment',      // التسجيل
    device_error: 'biometric.event.deviceError'    // خطأ الجهاز
};

/**
 * Biometric Verification Method Translation Keys
 */
const BIOMETRIC_METHOD_KEYS = {
    fingerprint: 'biometric.method.fingerprint',   // بصمة الإصبع
    facial: 'biometric.method.facial',             // التعرف على الوجه
    card: 'biometric.method.card',                 // البطاقة
    pin: 'biometric.method.pin',                   // رمز PIN
    multi: 'biometric.method.multi',               // متعدد
    manual: 'biometric.method.manual',             // يدوي
    mobile_gps: 'biometric.method.mobileGps'       // GPS المحمول
};

/**
 * HR Analytics Translation Keys
 * Maps analytics metrics to translation keys
 */
const HR_ANALYTICS_KEYS = {
    // Demographics
    totalEmployees: 'hrAnalytics.totalEmployees',           // إجمالي الموظفين
    activeEmployees: 'hrAnalytics.activeEmployees',         // الموظفون النشطون
    newHires: 'hrAnalytics.newHires',                       // التعيينات الجديدة
    terminations: 'hrAnalytics.terminations',               // الإنهاءات

    // Turnover
    turnoverRate: 'hrAnalytics.turnoverRate',               // معدل دوران العمالة
    retentionRate: 'hrAnalytics.retentionRate',             // معدل الاحتفاظ
    voluntaryTurnover: 'hrAnalytics.voluntaryTurnover',     // الاستقالات الطوعية
    involuntaryTurnover: 'hrAnalytics.involuntaryTurnover', // الإنهاءات غير الطوعية

    // Attendance
    attendanceRate: 'hrAnalytics.attendanceRate',           // معدل الحضور
    absenteeismRate: 'hrAnalytics.absenteeismRate',         // معدل الغياب
    punctualityRate: 'hrAnalytics.punctualityRate',         // معدل الالتزام بالوقت
    overtimeHours: 'hrAnalytics.overtimeHours',             // ساعات العمل الإضافي

    // Leave
    leaveRequests: 'hrAnalytics.leaveRequests',             // طلبات الإجازة
    pendingLeaves: 'hrAnalytics.pendingLeaves',             // الإجازات المعلقة
    approvedLeaves: 'hrAnalytics.approvedLeaves',           // الإجازات الموافق عليها

    // Performance
    averagePerformance: 'hrAnalytics.averagePerformance',   // متوسط الأداء
    highPerformers: 'hrAnalytics.highPerformers',           // الموظفون المتميزون
    lowPerformers: 'hrAnalytics.lowPerformers',             // الموظفون ذوو الأداء المنخفض

    // Compensation
    totalPayroll: 'hrAnalytics.totalPayroll',               // إجمالي الرواتب
    averageSalary: 'hrAnalytics.averageSalary',             // متوسط الراتب
    payEquityRatio: 'hrAnalytics.payEquityRatio',           // نسبة المساواة في الأجور

    // Saudization (Saudi Arabia specific)
    saudizationRate: 'hrAnalytics.saudizationRate',         // معدل السعودة
    saudiEmployees: 'hrAnalytics.saudiEmployees',           // الموظفون السعوديون
    nonSaudiEmployees: 'hrAnalytics.nonSaudiEmployees'      // الموظفون غير السعوديين
};

/**
 * HR Analytics Period Translation Keys
 */
const HR_PERIOD_KEYS = {
    daily: 'hrAnalytics.period.daily',
    weekly: 'hrAnalytics.period.weekly',
    monthly: 'hrAnalytics.period.monthly',
    quarterly: 'hrAnalytics.period.quarterly',
    yearly: 'hrAnalytics.period.yearly'
};

/**
 * Helper function to get translation key for a biometric status
 * @param {string} status - The status value from the database
 * @returns {string} - The translation key
 */
const getBiometricStatusKey = (status) => {
    return BIOMETRIC_STATUS_KEYS[status] || `biometric.status.${status}`;
};

/**
 * Helper function to get translation key for a biometric result
 * @param {string} result - The result value
 * @returns {string} - The translation key
 */
const getBiometricResultKey = (result) => {
    return BIOMETRIC_RESULT_KEYS[result] || `biometric.result.${result}`;
};

/**
 * Helper function to get translation key for HR analytics metric
 * @param {string} metric - The metric name
 * @returns {string} - The translation key
 */
const getHrAnalyticsKey = (metric) => {
    return HR_ANALYTICS_KEYS[metric] || `hrAnalytics.${metric}`;
};

/**
 * Format API response with translation keys
 * Adds translationKey field to objects containing status fields
 * @param {Object} data - The data object to enhance
 * @param {string} namespace - The translation namespace ('biometric' or 'hrAnalytics')
 * @returns {Object} - Enhanced data with translation keys
 */
const addTranslationKeys = (data, namespace = 'biometric') => {
    if (!data || typeof data !== 'object') return data;

    const result = Array.isArray(data) ? [...data] : { ...data };

    if (Array.isArray(result)) {
        return result.map(item => addTranslationKeys(item, namespace));
    }

    // Add translation key for status field
    if (result.status && namespace === 'biometric') {
        result.statusKey = getBiometricStatusKey(result.status);
    }

    // Add translation key for result field
    if (result.result && namespace === 'biometric') {
        result.resultKey = getBiometricResultKey(result.result);
    }

    // Add translation key for eventType field
    if (result.eventType && BIOMETRIC_EVENT_KEYS[result.eventType]) {
        result.eventTypeKey = BIOMETRIC_EVENT_KEYS[result.eventType];
    }

    // Add translation key for verificationMethod field
    if (result.verificationMethod && BIOMETRIC_METHOD_KEYS[result.verificationMethod]) {
        result.verificationMethodKey = BIOMETRIC_METHOD_KEYS[result.verificationMethod];
    }

    return result;
};

module.exports = {
    // Constants
    BIOMETRIC_STATUS_KEYS,
    BIOMETRIC_RESULT_KEYS,
    BIOMETRIC_EVENT_KEYS,
    BIOMETRIC_METHOD_KEYS,
    HR_ANALYTICS_KEYS,
    HR_PERIOD_KEYS,

    // Helper functions
    getBiometricStatusKey,
    getBiometricResultKey,
    getHrAnalyticsKey,
    addTranslationKeys
};
