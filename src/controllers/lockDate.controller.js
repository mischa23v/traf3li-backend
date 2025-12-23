const { LockDate, LockHistory, FiscalPeriod } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Get all lock dates
 * GET /api/lock-dates
 */
const getLockDates = asyncHandler(async (req, res) => {
    const firmId = req.firmId || req.userID;

    const lockDateConfig = await LockDate.findOne({ firmId });

    if (!lockDateConfig) {
        // Return default configuration if none exists
        return res.status(200).json({
            success: true,
            data: {
                firmId,
                fiscal_lock: null,
                tax_lock: null,
                purchase_lock: null,
                sale_lock: null,
                hard_lock: null,
                fiscal_year_end: { month: 12, day: 31 }
            }
        });
    }

    res.status(200).json({
        success: true,
        data: lockDateConfig
    });
});

/**
 * Update lock date
 * PATCH /api/lock-dates/:lockType
 */
const updateLockDate = asyncHandler(async (req, res) => {
    const { lockType } = req.params;

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['lock_date', 'reason']);
    const { lock_date, reason } = allowedFields;

    const firmId = req.firmId || req.userID;
    const userId = req.userID;

    const validLockTypes = ['fiscal', 'tax', 'purchase', 'sale', 'hard'];
    if (!validLockTypes.includes(lockType)) {
        throw CustomException('نوع القفل غير صالح', 400);
    }

    if (!lock_date) {
        throw CustomException('تاريخ القفل مطلوب', 400);
    }

    // Validate date format and value
    const lockDateObj = new Date(lock_date);
    if (isNaN(lockDateObj.getTime())) {
        throw CustomException('تنسيق تاريخ القفل غير صالح', 400);
    }

    // Validate admin permission for hard lock type
    if (lockType === 'hard' && req.role !== 'admin') {
        throw CustomException('غير مصرح لك بتحديث القفل الصارم', 403);
    }

    const lockFieldName = `${lockType}_lock`;

    let lockDateConfig = await LockDate.findOne({ firmId });

    // IDOR protection: verify firmId ownership
    if (lockDateConfig && lockDateConfig.firmId.toString() !== firmId.toString()) {
        throw CustomException('غير مصرح لك بتحديث هذا التكوين', 403);
    }

    const previousLockDate = lockDateConfig ? lockDateConfig[lockFieldName] : null;

    if (!lockDateConfig) {
        lockDateConfig = await LockDate.create({
            firmId,
            [lockFieldName]: lock_date,
            updated_by: userId,
            updated_at: new Date()
        });
    } else {
        lockDateConfig[lockFieldName] = lock_date;
        lockDateConfig.updated_by = userId;
        lockDateConfig.updated_at = new Date();
        await lockDateConfig.save();
    }

    // Log the lock date change in history
    await LockHistory.create({
        firmId,
        lock_type: lockType,
        previous_lock_date: previousLockDate,
        new_lock_date: lock_date,
        reason: reason || 'Lock date updated',
        changed_by: userId,
        changed_at: new Date()
    });

    res.status(200).json({
        success: true,
        message: 'تم تحديث تاريخ القفل بنجاح',
        data: lockDateConfig
    });
});

/**
 * Lock fiscal period
 * POST /api/lock-dates/periods/lock
 */
const lockPeriod = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['start_date', 'end_date', 'period_name']);
    const { start_date, end_date, period_name } = allowedFields;

    const firmId = req.firmId || req.userID;
    const userId = req.userID;

    if (!start_date || !end_date || !period_name) {
        throw CustomException('تاريخ البداية والنهاية واسم الفترة مطلوبة', 400);
    }

    // Validate date formats
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        throw CustomException('تنسيق التاريخ غير صالح', 400);
    }

    if (startDateObj >= endDateObj) {
        throw CustomException('تاريخ البداية يجب أن يكون قبل تاريخ النهاية', 400);
    }

    // Check if period already exists
    let period = await FiscalPeriod.findOne({ firmId, period_name });

    if (period) {
        // IDOR protection: verify firmId ownership
        if (period.firmId.toString() !== firmId.toString()) {
            throw CustomException('غير مصرح لك بتحديث هذه الفترة', 403);
        }

        if (period.is_locked) {
            throw CustomException('الفترة مقفلة بالفعل', 400);
        }
        period.is_locked = true;
        period.locked_by = userId;
        period.locked_at = new Date();
        await period.save();
    } else {
        period = await FiscalPeriod.create({
            firmId,
            period_name,
            start_date,
            end_date,
            is_locked: true,
            locked_by: userId,
            locked_at: new Date()
        });
    }

    // Log the period lock in history
    await LockHistory.create({
        firmId,
        lock_type: 'period',
        period_name,
        action: 'lock',
        reason: `Locked fiscal period: ${period_name}`,
        changed_by: userId,
        changed_at: new Date()
    });

    res.status(200).json({
        success: true,
        message: 'تم قفل الفترة المالية بنجاح',
        data: period
    });
});

/**
 * Reopen fiscal period
 * POST /api/lock-dates/periods/reopen
 */
const reopenPeriod = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['period_name', 'reason']);
    const { period_name, reason } = allowedFields;

    const firmId = req.firmId || req.userID;
    const userId = req.userID;

    if (!period_name) {
        throw CustomException('اسم الفترة مطلوب', 400);
    }

    // Validate special permission (admin or authorized)
    if (req.role !== 'admin' && !req.permissions?.includes('reopen_period')) {
        throw CustomException('غير مصرح لك بإعادة فتح الفترات المالية', 403);
    }

    const period = await FiscalPeriod.findOne({ firmId, period_name });

    if (!period) {
        throw CustomException('الفترة غير موجودة', 404);
    }

    // IDOR protection: verify firmId ownership
    if (period.firmId.toString() !== firmId.toString()) {
        throw CustomException('غير مصرح لك بإعادة فتح هذه الفترة', 403);
    }

    if (!period.is_locked) {
        throw CustomException('الفترة غير مقفلة', 400);
    }

    period.is_locked = false;
    period.reopened_by = userId;
    period.reopened_at = new Date();
    period.reopen_reason = reason;
    await period.save();

    // Log the period reopen in history
    await LockHistory.create({
        firmId,
        lock_type: 'period',
        period_name,
        action: 'reopen',
        reason: reason || `Reopened fiscal period: ${period_name}`,
        changed_by: userId,
        changed_at: new Date()
    });

    res.status(200).json({
        success: true,
        message: 'تم إعادة فتح الفترة المالية بنجاح',
        data: period
    });
});

/**
 * Get fiscal periods
 * GET /api/lock-dates/periods
 */
const getFiscalPeriods = asyncHandler(async (req, res) => {
    const firmId = req.firmId || req.userID;
    const { page = 1, limit = 50, is_locked } = req.query;

    const query = { firmId };
    if (is_locked !== undefined) {
        query.is_locked = is_locked === 'true';
    }

    const periods = await FiscalPeriod.find(query)
        .sort({ start_date: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('locked_by', 'firstName lastName')
        .populate('reopened_by', 'firstName lastName');

    const total = await FiscalPeriod.countDocuments(query);

    res.status(200).json({
        success: true,
        data: periods,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get lock history
 * GET /api/lock-dates/history
 */
const getLockHistory = asyncHandler(async (req, res) => {
    const firmId = req.firmId || req.userID;
    const { page = 1, limit = 50, lock_type } = req.query;

    const query = { firmId };
    if (lock_type) {
        query.lock_type = lock_type;
    }

    const history = await LockHistory.find(query)
        .sort({ changed_at: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('changed_by', 'firstName lastName');

    const total = await LockHistory.countDocuments(query);

    res.status(200).json({
        success: true,
        data: history,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Check if date is locked
 * POST /api/lock-dates/check
 */
const checkDate = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['date', 'lock_type']);
    const { date, lock_type } = allowedFields;

    const firmId = req.firmId || req.userID;

    if (!date || !lock_type) {
        throw CustomException('التاريخ ونوع القفل مطلوبان', 400);
    }

    // Validate date format
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
        throw CustomException('تنسيق التاريخ غير صالح', 400);
    }

    const validLockTypes = ['fiscal', 'tax', 'purchase', 'sale', 'hard'];
    if (!validLockTypes.includes(lock_type)) {
        throw CustomException('نوع القفل غير صالح', 400);
    }

    const lockDateConfig = await LockDate.findOne({ firmId });

    if (!lockDateConfig) {
        return res.status(200).json({
            success: true,
            data: {
                is_locked: false,
                lock_date: null,
                lock_type,
                message: 'No lock date configured'
            }
        });
    }

    const lockFieldName = `${lock_type}_lock`;
    const lockDate = lockDateConfig[lockFieldName];

    if (!lockDate) {
        return res.status(200).json({
            success: true,
            data: {
                is_locked: false,
                lock_date: null,
                lock_type,
                message: `No ${lock_type} lock date configured`
            }
        });
    }

    const checkDate = new Date(date);
    const lockDateObj = new Date(lockDate);

    const isLocked = checkDate <= lockDateObj;

    res.status(200).json({
        success: true,
        data: {
            is_locked: isLocked,
            lock_date: lockDate,
            lock_type,
            message: isLocked
                ? `Date is locked. ${lock_type} lock date is ${lockDate}`
                : `Date is not locked`
        }
    });
});

/**
 * Update fiscal year end
 * PATCH /api/lock-dates/fiscal-year
 */
const updateFiscalYearEnd = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['month', 'day']);
    const { month, day } = allowedFields;

    const firmId = req.firmId || req.userID;
    const userId = req.userID;

    if (!month || !day) {
        throw CustomException('الشهر واليوم مطلوبان', 400);
    }

    // Validate month and day values
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        throw CustomException('الشهر يجب أن يكون بين 1 و 12', 400);
    }

    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
        throw CustomException('اليوم يجب أن يكون بين 1 و 31', 400);
    }

    let lockDateConfig = await LockDate.findOne({ firmId });

    // IDOR protection: verify firmId ownership
    if (lockDateConfig && lockDateConfig.firmId.toString() !== firmId.toString()) {
        throw CustomException('غير مصرح لك بتحديث هذا التكوين', 403);
    }

    if (!lockDateConfig) {
        lockDateConfig = await LockDate.create({
            firmId,
            fiscal_year_end: { month, day },
            updated_by: userId,
            updated_at: new Date()
        });
    } else {
        lockDateConfig.fiscal_year_end = { month, day };
        lockDateConfig.updated_by = userId;
        lockDateConfig.updated_at = new Date();
        await lockDateConfig.save();
    }

    // Log the fiscal year end change in history
    await LockHistory.create({
        firmId,
        lock_type: 'fiscal_year_end',
        action: 'update',
        reason: `Fiscal year end updated to ${month}/${day}`,
        changed_by: userId,
        changed_at: new Date()
    });

    res.status(200).json({
        success: true,
        message: 'تم تحديث نهاية السنة المالية بنجاح',
        data: lockDateConfig
    });
});

module.exports = {
    getLockDates,
    updateLockDate,
    lockPeriod,
    reopenPeriod,
    getFiscalPeriods,
    getLockHistory,
    checkDate,
    updateFiscalYearEnd
};
