router.get('/shift-types', asyncHandler(async (req, res) => {
  const { isActive, isDefault, isRamadanShift, page = 1, limit = 50 } = req.query;

  const query = { firmId: req.firmId };

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }
  if (isDefault !== undefined) {
    query.isDefault = isDefault === 'true';
  }
  if (isRamadanShift !== undefined) {
    query.isRamadanShift = isRamadanShift === 'true';
  }

  const total = await ShiftType.countDocuments(query);
  const shiftTypes = await ShiftType.find(query)
    .sort({ isDefault: -1, name: 1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean();

  res.json({
    success: true,
    data: shiftTypes,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

router.get('/shift-types/:id', asyncHandler(async (req, res) => {
  const shiftType = await ShiftType.findOne({
    _id: req.params.id,
    firmId: req.firmId
  });

  if (!shiftType) {
    return res.status(404).json({
      success: false,
      message: 'Shift type not found',
      messageAr: 'نوع الوردية غير موجود'
    });
  }

  res.json({
    success: true,
    data: shiftType
  });
}));

router.post('/shift-types', asyncHandler(async (req, res) => {
  const shiftType = new ShiftType({
    ...req.body,
    firmId: req.firmId,
    createdBy: req.userID
  });

  await shiftType.save();

  res.status(201).json({
    success: true,
    message: 'Shift type created successfully',
    messageAr: 'تم إنشاء نوع الوردية بنجاح',
    data: shiftType
  });
}));

router.patch('/shift-types/:id', asyncHandler(async (req, res) => {
  const shiftType = await ShiftType.findOneAndUpdate(
    { _id: req.params.id, firmId: req.firmId },
    { ...req.body, updatedBy: req.userID },
    { new: true, runValidators: true }
  );

  if (!shiftType) {
    return res.status(404).json({
      success: false,
      message: 'Shift type not found',
      messageAr: 'نوع الوردية غير موجود'
    });
  }

  res.json({
    success: true,
    message: 'Shift type updated successfully',
    messageAr: 'تم تحديث نوع الوردية بنجاح',
    data: shiftType
  });
}));

router.delete('/shift-types/:id', asyncHandler(async (req, res) => {
  // Check if shift is assigned to any employees
  const assignmentCount = await ShiftAssignment.countDocuments({
    firmId: req.firmId,
    shiftTypeId: req.params.id,
    status: 'active'
  });

  if (assignmentCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete shift type. It is assigned to ${assignmentCount} employee(s)`,
      messageAr: `لا يمكن حذف نوع الوردية. مخصصة لـ ${assignmentCount} موظف(ين)`
    });
  }

  const shiftType = await ShiftType.findOneAndDelete({
    _id: req.params.id,
    firmId: req.firmId
  });

  if (!shiftType) {
    return res.status(404).json({
      success: false,
      message: 'Shift type not found',
      messageAr: 'نوع الوردية غير موجود'
    });
  }

  res.json({
    success: true,
    message: 'Shift type deleted successfully',
    messageAr: 'تم حذف نوع الوردية بنجاح'
  });
}));

router.post('/shift-types/:id/set-default', asyncHandler(async (req, res) => {
  // Unset current default
  await ShiftType.updateMany(
    { firmId: req.firmId, isDefault: true },
    { isDefault: false }
  );

  // Set new default
  const shiftType = await ShiftType.findOneAndUpdate(
    { _id: req.params.id, firmId: req.firmId },
    { isDefault: true, updatedBy: req.userID },
    { new: true }
  );

  if (!shiftType) {
    return res.status(404).json({
      success: false,
      message: 'Shift type not found',
      messageAr: 'نوع الوردية غير موجود'
    });
  }

  res.json({
    success: true,
    message: 'Default shift type updated',
    messageAr: 'تم تحديث الوردية الافتراضية',
    data: shiftType
  });
}));

router.post('/shift-types/:id/clone', asyncHandler(async (req, res) => {
  const original = await ShiftType.findOne({
    _id: req.params.id,
    firmId: req.firmId
  });

  if (!original) {
    return res.status(404).json({
      success: false,
      message: 'Shift type not found',
      messageAr: 'نوع الوردية غير موجود'
    });
  }

  const cloneData = original.toObject();
  delete cloneData._id;
  delete cloneData.shiftTypeId;
  delete cloneData.createdAt;
  delete cloneData.updatedAt;

  cloneData.name = `${cloneData.name} (نسخة)`;
  cloneData.nameAr = `${cloneData.nameAr} (نسخة)`;
  cloneData.isDefault = false;
  cloneData.createdBy = req.userID;

  const cloned = new ShiftType(cloneData);
  await cloned.save();

  res.status(201).json({
    success: true,
    message: 'Shift type cloned successfully',
    messageAr: 'تم نسخ نوع الوردية بنجاح',
    data: cloned
  });
}));

router.get('/shift-types-stats', asyncHandler(async (req, res) => {
  const [stats, assignmentStats] = await Promise.all([
    ShiftType.aggregate([
      { $match: { firmId: req.firmId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          ramadan: { $sum: { $cond: ['$isRamadanShift', 1, 0] } },
          nightShift: { $sum: { $cond: ['$isNightShift', 1, 0] } }
        }
      }
    ]),
    ShiftAssignment.aggregate([
      { $match: { firmId: req.firmId, status: 'active' } },
      {
        $group: {
          _id: '$shiftTypeId',
          employeeCount: { $sum: 1 }
        }
      }
    ])
  ]);

  res.json({
    success: true,
    data: {
      shiftTypes: stats[0] || { total: 0, active: 0, ramadan: 0, nightShift: 0 },
      employeesPerShift: assignmentStats
    }
  });
}));

router.get('/shift-types-ramadan', asyncHandler(async (req, res) => {
  const ramadanShifts = await ShiftType.find({
    firmId: req.firmId,
    isActive: true,
    isRamadanShift: true
  }).lean();

  res.json({
    success: true,
    data: ramadanShifts
  });
}));

// ═══════════════════════════════════════════════════════════════
// SHIFT ASSIGNMENT ROUTES
// ═══════════════════════════════════════════════════════════════

router.get('/shift-assignments', asyncHandler(async (req, res) => {
  const { employeeId, shiftTypeId, status, startDate, endDate, page = 1, limit = 50 } = req.query;

  const query = { firmId: req.firmId };

  if (employeeId) query.employeeId = employeeId;
  if (shiftTypeId) query.shiftTypeId = shiftTypeId;
  if (status) query.status = status;

  if (startDate && endDate) {
    query.$or = [
      {
        startDate: { $lte: new Date(endDate) },
        $or: [
          { endDate: { $gte: new Date(startDate) } },
          { endDate: null }
        ]
      }
    ];
  }

  const total = await ShiftAssignment.countDocuments(query);
  const assignments = await ShiftAssignment.find(query)
    .populate('employeeId', 'employeeNumber firstName lastName')
    .populate('shiftTypeId', 'name nameAr startTime endTime')
    .sort({ startDate: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean();

  res.json({
    success: true,
    data: assignments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

router.get('/shift-assignments/:id', asyncHandler(async (req, res) => {
  const assignment = await ShiftAssignment.findOne({
    _id: req.params.id,
    firmId: req.firmId
  })
  .populate('employeeId', 'employeeNumber firstName lastName email')
  .populate('shiftTypeId')
  .populate('substituteFor', 'employeeNumber firstName lastName');

  if (!assignment) {
    return res.status(404).json({
      success: false,
      message: 'Shift assignment not found',
      messageAr: 'تخصيص الوردية غير موجود'
    });
  }

  res.json({
    success: true,
    data: assignment
  });
}));

router.post('/shift-assignments', asyncHandler(async (req, res) => {
  const { employeeId, shiftTypeId, startDate, endDate } = req.body;

  // Verify employee exists
  const employee = await Employee.findOne({ _id: employeeId, firmId: req.firmId });
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found',
      messageAr: 'الموظف غير موجود'
    });
  }

  // Verify shift type exists
  const shiftType = await ShiftType.findOne({ _id: shiftTypeId, firmId: req.firmId });
  if (!shiftType) {
    return res.status(404).json({
      success: false,
      message: 'Shift type not found',
      messageAr: 'نوع الوردية غير موجود'
    });
  }

  const assignment = new ShiftAssignment({
    ...req.body,
    firmId: req.firmId,
    createdBy: req.userID
  });

  await assignment.save();
  await assignment.populate('employeeId', 'employeeNumber firstName lastName');
  await assignment.populate('shiftTypeId', 'name nameAr startTime endTime');

  res.status(201).json({
    success: true,
    message: 'Shift assignment created successfully',
    messageAr: 'تم إنشاء تخصيص الوردية بنجاح',
    data: assignment
  });
}));

router.post('/shift-assignments/bulk', asyncHandler(async (req, res) => {
  const { employeeIds, shiftTypeId, startDate, endDate } = req.body;

  if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Employee IDs array is required',
      messageAr: 'قائمة أرقام الموظفين مطلوبة'
    });
  }

  // Verify shift type exists
  const shiftType = await ShiftType.findOne({ _id: shiftTypeId, firmId: req.firmId });
  if (!shiftType) {
    return res.status(404).json({
      success: false,
      message: 'Shift type not found',
      messageAr: 'نوع الوردية غير موجود'
    });
  }

  // Verify all employees exist
  const employees = await Employee.find({
    _id: { $in: employeeIds },
    firmId: req.firmId
  });

  if (employees.length !== employeeIds.length) {
    return res.status(400).json({
      success: false,
      message: 'Some employees not found',
      messageAr: 'بعض الموظفين غير موجودين'
    });
  }

  const assignments = await ShiftAssignment.bulkAssign(
    req.firmId,
    shiftTypeId,
    employeeIds,
    new Date(startDate),
    endDate ? new Date(endDate) : null,
    req.userID
  );

  res.status(201).json({
    success: true,
    message: `Created ${assignments.length} shift assignments`,
    messageAr: `تم إنشاء ${assignments.length} تخصيص وردية`,
    data: { count: assignments.length, assignments }
  });
}));

router.patch('/shift-assignments/:id', asyncHandler(async (req, res) => {
  const assignment = await ShiftAssignment.findOneAndUpdate(
    { _id: req.params.id, firmId: req.firmId },
    { ...req.body, updatedBy: req.userID },
    { new: true, runValidators: true }
  )
  .populate('employeeId', 'employeeNumber firstName lastName')
  .populate('shiftTypeId', 'name nameAr startTime endTime');

  if (!assignment) {
    return res.status(404).json({
      success: false,
      message: 'Shift assignment not found',
      messageAr: 'تخصيص الوردية غير موجود'
    });
  }

  res.json({
    success: true,
    message: 'Shift assignment updated successfully',
    messageAr: 'تم تحديث تخصيص الوردية بنجاح',
    data: assignment
  });
}));

router.delete('/shift-assignments/:id', asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const assignment = await ShiftAssignment.findOne({
    _id: req.params.id,
    firmId: req.firmId
  });

  if (!assignment) {
    return res.status(404).json({
      success: false,
      message: 'Shift assignment not found',
      messageAr: 'تخصيص الوردية غير موجود'
    });
  }

  await assignment.cancel(req.userID, reason);

  res.json({
    success: true,
    message: 'Shift assignment cancelled',
    messageAr: 'تم إلغاء تخصيص الوردية'
  });
}));

router.get('/shift-assignments/employee/:employeeId', asyncHandler(async (req, res) => {
  const { status, startDate, endDate } = req.query;

  const options = {};
  if (status) options.status = status;
  if (startDate) options.startDate = new Date(startDate);
  if (endDate) options.endDate = new Date(endDate);

  const assignments = await ShiftAssignment.getEmployeeAssignments(
    req.firmId,
    req.params.employeeId,
    options
  );

  res.json({
    success: true,
    data: assignments
  });
}));

router.get('/shift-assignments/employee/:employeeId/current', asyncHandler(async (req, res) => {
  const { date } = req.query;
  const targetDate = date ? new Date(date) : new Date();

  const assignment = await ShiftAssignment.getActiveAssignment(
    req.firmId,
    req.params.employeeId,
    targetDate
  );

  if (!assignment) {
    // Try to get default shift
    const defaultShift = await ShiftType.getDefaultShift(req.firmId);

    return res.json({
      success: true,
      data: null,
      defaultShift: defaultShift,
      message: 'No active assignment found. Using default shift if available.',
      messageAr: 'لا يوجد تخصيص نشط. يتم استخدام الوردية الافتراضية إن وجدت.'
    });
  }

  res.json({
    success: true,
    data: assignment
  });
}));

module.exports = router;
