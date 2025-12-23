/**
 * Leave Management Routes
 *
 * Combined routes for leave periods, policies, and allocations.
 * Saudi Labor Law compliant leave management system.
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');
const LeavePeriod = require('../models/leavePeriod.model');
const LeavePolicy = require('../models/leavePolicy.model');
const LeaveAllocation = require('../models/leaveAllocation.model');
const LeaveType = require('../models/leaveType.model');
const Employee = require('../models/employee.model');

// Apply authentication to all routes
router.use(verifyToken);
router.use(attachFirmContext);

// ==================== LEAVE PERIODS ====================

/**
 * @route   GET /api/hr/leave-periods
 * @desc    Get all leave periods
 * @access  Private
 */
router.get('/leave-periods', async (req, res) => {
  try {
    const { status, isCurrent, year } = req.query;
    const query = { firmId: req.firmId };

    if (status) query.status = status;
    if (isCurrent === 'true') {
      const now = new Date();
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    }
    if (year) {
      query.startDate = { $gte: new Date(`${year}-01-01`) };
      query.endDate = { $lte: new Date(`${year}-12-31`) };
    }

    const periods = await LeavePeriod.find(query)
      .populate('createdBy', 'name email')
      .sort({ startDate: -1 });

    res.json({
      success: true,
      count: periods.length,
      data: periods
    });
  } catch (error) {
    console.error('Error fetching leave periods:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leave periods',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/hr/leave-periods/current
 * @desc    Get current active leave period
 * @access  Private
 */
router.get('/leave-periods/current', async (req, res) => {
  try {
    const period = await LeavePeriod.getCurrentPeriod(req.firmId);

    if (!period) {
      return res.status(404).json({
        success: false,
        message: 'No active leave period found'
      });
    }

    res.json({
      success: true,
      data: period
    });
  } catch (error) {
    console.error('Error fetching current leave period:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching current leave period',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/hr/leave-periods/:id
 * @desc    Get leave period by ID
 * @access  Private
 */
router.get('/leave-periods/:id', async (req, res) => {
  try {
    const period = await LeavePeriod.findOne({
      _id: req.params.id,
      firmId: req.firmId
    }).populate('createdBy', 'name email');

    if (!period) {
      return res.status(404).json({
        success: false,
        message: 'Leave period not found'
      });
    }

    res.json({
      success: true,
      data: period
    });
  } catch (error) {
    console.error('Error fetching leave period:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leave period',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/hr/leave-periods
 * @desc    Create new leave period
 * @access  Private (Admin/HR)
 */
router.post('/leave-periods', async (req, res) => {
  try {
    const periodData = {
      ...req.body,
      firmId: req.firmId,
      createdBy: req.userID
    };

    const period = await LeavePeriod.create(periodData);

    res.status(201).json({
      success: true,
      message: 'Leave period created successfully',
      data: period
    });
  } catch (error) {
    console.error('Error creating leave period:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating leave period',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/hr/leave-periods/:id
 * @desc    Update leave period
 * @access  Private (Admin/HR)
 */
router.put('/leave-periods/:id', async (req, res) => {
  try {
    const period = await LeavePeriod.findOneAndUpdate(
      { _id: req.params.id, firmId: req.firmId },
      { ...req.body, updatedBy: req.userID },
      { new: true, runValidators: true }
    );

    if (!period) {
      return res.status(404).json({
        success: false,
        message: 'Leave period not found'
      });
    }

    res.json({
      success: true,
      message: 'Leave period updated successfully',
      data: period
    });
  } catch (error) {
    console.error('Error updating leave period:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating leave period',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/hr/leave-periods/:id
 * @desc    Delete leave period
 * @access  Private (Admin)
 */
router.delete('/leave-periods/:id', async (req, res) => {
  try {
    // Check if any allocations exist for this period
    const allocationsExist = await LeaveAllocation.exists({
      leavePeriodId: req.params.id,
      firmId: req.firmId
    });

    if (allocationsExist) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete leave period with existing allocations'
      });
    }

    const period = await LeavePeriod.findOneAndDelete({
      _id: req.params.id,
      firmId: req.firmId
    });

    if (!period) {
      return res.status(404).json({
        success: false,
        message: 'Leave period not found'
      });
    }

    res.json({
      success: true,
      message: 'Leave period deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting leave period:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting leave period',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/hr/leave-periods/:id/activate
 * @desc    Activate a leave period
 * @access  Private (Admin/HR)
 */
router.post('/leave-periods/:id/activate', async (req, res) => {
  try {
    const period = await LeavePeriod.findOne({
      _id: req.params.id,
      firmId: req.firmId
    });

    if (!period) {
      return res.status(404).json({
        success: false,
        message: 'Leave period not found'
      });
    }

    period.status = 'active';
    period.updatedBy = req.userID;
    await period.save();

    res.json({
      success: true,
      message: 'Leave period activated successfully',
      data: period
    });
  } catch (error) {
    console.error('Error activating leave period:', error);
    res.status(400).json({
      success: false,
      message: 'Error activating leave period',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/hr/leave-periods/:id/close
 * @desc    Close a leave period
 * @access  Private (Admin/HR)
 */
router.post('/leave-periods/:id/close', async (req, res) => {
  try {
    const period = await LeavePeriod.findOne({
      _id: req.params.id,
      firmId: req.firmId
    });

    if (!period) {
      return res.status(404).json({
        success: false,
        message: 'Leave period not found'
      });
    }

    period.status = 'closed';
    period.updatedBy = req.userID;
    await period.save();

    res.json({
      success: true,
      message: 'Leave period closed successfully',
      data: period
    });
  } catch (error) {
    console.error('Error closing leave period:', error);
    res.status(400).json({
      success: false,
      message: 'Error closing leave period',
      error: error.message
    });
  }
});

// ==================== LEAVE POLICIES ====================

/**
 * @route   GET /api/hr/leave-policies
 * @desc    Get all leave policies
 * @access  Private
 */
router.get('/leave-policies', async (req, res) => {
  try {
    const { isActive, isDefault, applyToAllEmployees } = req.query;
    const query = { firmId: req.firmId };

    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isDefault !== undefined) query.isDefault = isDefault === 'true';
    if (applyToAllEmployees !== undefined) query.applyToAllEmployees = applyToAllEmployees === 'true';

    const policies = await LeavePolicy.find(query)
      .populate('leaveTypeAllocations.leaveTypeId', 'name nameAr code')
      .populate('applicableDepartments', 'name')
      .populate('applicableDesignations', 'name')
      .populate('createdBy', 'name email')
      .sort({ isDefault: -1, name: 1 });

    res.json({
      success: true,
      count: policies.length,
      data: policies
    });
  } catch (error) {
    console.error('Error fetching leave policies:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leave policies',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/hr/leave-policies/default
 * @desc    Get default leave policy
 * @access  Private
 */
router.get('/leave-policies/default', async (req, res) => {
  try {
    const policy = await LeavePolicy.getDefaultPolicy(req.firmId);

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'No default leave policy found'
      });
    }

    res.json({
      success: true,
      data: policy
    });
  } catch (error) {
    console.error('Error fetching default leave policy:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching default leave policy',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/hr/leave-policies/:id
 * @desc    Get leave policy by ID
 * @access  Private
 */
router.get('/leave-policies/:id', async (req, res) => {
  try {
    const policy = await LeavePolicy.findOne({
      _id: req.params.id,
      firmId: req.firmId
    })
      .populate('leaveTypeAllocations.leaveTypeId', 'name nameAr code')
      .populate('applicableDepartments', 'name')
      .populate('applicableDesignations', 'name')
      .populate('createdBy', 'name email');

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Leave policy not found'
      });
    }

    res.json({
      success: true,
      data: policy
    });
  } catch (error) {
    console.error('Error fetching leave policy:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leave policy',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/hr/leave-policies
 * @desc    Create new leave policy
 * @access  Private (Admin/HR)
 */
router.post('/leave-policies', async (req, res) => {
  try {
    const policyData = {
      ...req.body,
      firmId: req.firmId,
      createdBy: req.userID
    };

    const policy = await LeavePolicy.create(policyData);

    // Populate for response
    await policy.populate([
      { path: 'leaveTypeAllocations.leaveTypeId', select: 'name nameAr code' },
      { path: 'applicableDepartments', select: 'name' },
      { path: 'applicableDesignations', select: 'name' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Leave policy created successfully',
      data: policy
    });
  } catch (error) {
    console.error('Error creating leave policy:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating leave policy',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/hr/leave-policies/:id
 * @desc    Update leave policy
 * @access  Private (Admin/HR)
 */
router.put('/leave-policies/:id', async (req, res) => {
  try {
    const policy = await LeavePolicy.findOneAndUpdate(
      { _id: req.params.id, firmId: req.firmId },
      { ...req.body, updatedBy: req.userID },
      { new: true, runValidators: true }
    )
      .populate('leaveTypeAllocations.leaveTypeId', 'name nameAr code')
      .populate('applicableDepartments', 'name')
      .populate('applicableDesignations', 'name');

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Leave policy not found'
      });
    }

    res.json({
      success: true,
      message: 'Leave policy updated successfully',
      data: policy
    });
  } catch (error) {
    console.error('Error updating leave policy:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating leave policy',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/hr/leave-policies/:id
 * @desc    Delete leave policy
 * @access  Private (Admin)
 */
router.delete('/leave-policies/:id', async (req, res) => {
  try {
    // Check if policy is default
    const policy = await LeavePolicy.findOne({
      _id: req.params.id,
      firmId: req.firmId
    });

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Leave policy not found'
      });
    }

    if (policy.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete default leave policy'
      });
    }

    // Check if any allocations use this policy
    const allocationsExist = await LeaveAllocation.exists({
      leavePolicyId: req.params.id,
      firmId: req.firmId
    });

    if (allocationsExist) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete leave policy with existing allocations'
      });
    }

    await policy.deleteOne();

    res.json({
      success: true,
      message: 'Leave policy deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting leave policy:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting leave policy',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/hr/leave-policies/:id/clone
 * @desc    Clone a leave policy
 * @access  Private (Admin/HR)
 */
router.post('/leave-policies/:id/clone', async (req, res) => {
  try {
    const sourcePolicy = await LeavePolicy.findOne({
      _id: req.params.id,
      firmId: req.firmId
    });

    if (!sourcePolicy) {
      return res.status(404).json({
        success: false,
        message: 'Leave policy not found'
      });
    }

    const clonedData = sourcePolicy.toObject();
    delete clonedData._id;
    delete clonedData.policyId;
    delete clonedData.createdAt;
    delete clonedData.updatedAt;

    clonedData.name = req.body.name || `${sourcePolicy.name} (Copy)`;
    clonedData.nameAr = req.body.nameAr || `${sourcePolicy.nameAr} (نسخة)`;
    clonedData.isDefault = false;
    clonedData.createdBy = req.userID;

    const newPolicy = await LeavePolicy.create(clonedData);

    res.status(201).json({
      success: true,
      message: 'Leave policy cloned successfully',
      data: newPolicy
    });
  } catch (error) {
    console.error('Error cloning leave policy:', error);
    res.status(400).json({
      success: false,
      message: 'Error cloning leave policy',
      error: error.message
    });
  }
});

// ==================== LEAVE ALLOCATIONS ====================

/**
 * @route   GET /api/hr/leave-allocations
 * @desc    Get all leave allocations
 * @access  Private
 */
router.get('/leave-allocations', async (req, res) => {
  try {
    const { employeeId, leaveTypeId, leavePeriodId, status } = req.query;
    const query = { firmId: req.firmId };

    if (employeeId) query.employeeId = employeeId;
    if (leaveTypeId) query.leaveTypeId = leaveTypeId;
    if (leavePeriodId) query.leavePeriodId = leavePeriodId;
    if (status) query.status = status;

    const allocations = await LeaveAllocation.find(query)
      .populate('employeeId', 'employeeId firstName lastName')
      .populate('leaveTypeId', 'name nameAr code')
      .populate('leavePeriodId', 'name startDate endDate')
      .populate('leavePolicyId', 'name')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: allocations.length,
      data: allocations
    });
  } catch (error) {
    console.error('Error fetching leave allocations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leave allocations',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/hr/leave-allocations/employee/:employeeId
 * @desc    Get all allocations for an employee
 * @access  Private
 */
router.get('/leave-allocations/employee/:employeeId', async (req, res) => {
  try {
    const { leavePeriodId } = req.query;

    const allocations = await LeaveAllocation.getEmployeeAllocations(
      req.firmId,
      req.params.employeeId,
      leavePeriodId
    );

    res.json({
      success: true,
      count: allocations.length,
      data: allocations
    });
  } catch (error) {
    console.error('Error fetching employee allocations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching employee allocations',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/hr/leave-allocations/balance/:employeeId/:leaveTypeId
 * @desc    Get current balance for an employee and leave type
 * @access  Private
 */
router.get('/leave-allocations/balance/:employeeId/:leaveTypeId', async (req, res) => {
  try {
    const balance = await LeaveAllocation.getEmployeeBalance(
      req.firmId,
      req.params.employeeId,
      req.params.leaveTypeId
    );

    res.json({
      success: true,
      data: { balance }
    });
  } catch (error) {
    console.error('Error fetching leave balance:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leave balance',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/hr/leave-allocations/:id
 * @desc    Get leave allocation by ID
 * @access  Private
 */
router.get('/leave-allocations/:id', async (req, res) => {
  try {
    const allocation = await LeaveAllocation.findOne({
      _id: req.params.id,
      firmId: req.firmId
    })
      .populate('employeeId', 'employeeId firstName lastName')
      .populate('leaveTypeId', 'name nameAr code')
      .populate('leavePeriodId', 'name startDate endDate')
      .populate('leavePolicyId', 'name')
      .populate('approvedBy', 'name email')
      .populate('adjustments.adjustedBy', 'name email');

    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: 'Leave allocation not found'
      });
    }

    res.json({
      success: true,
      data: allocation
    });
  } catch (error) {
    console.error('Error fetching leave allocation:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leave allocation',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/hr/leave-allocations
 * @desc    Create new leave allocation
 * @access  Private (Admin/HR)
 */
router.post('/leave-allocations', async (req, res) => {
  try {
    const allocationData = {
      ...req.body,
      firmId: req.firmId,
      createdBy: req.userID
    };

    const allocation = await LeaveAllocation.create(allocationData);

    await allocation.populate([
      { path: 'employeeId', select: 'employeeId firstName lastName' },
      { path: 'leaveTypeId', select: 'name nameAr code' },
      { path: 'leavePeriodId', select: 'name startDate endDate' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Leave allocation created successfully',
      data: allocation
    });
  } catch (error) {
    console.error('Error creating leave allocation:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating leave allocation',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/hr/leave-allocations/bulk
 * @desc    Bulk create leave allocations
 * @access  Private (Admin/HR)
 */
router.post('/leave-allocations/bulk', async (req, res) => {
  try {
    const { leavePeriodId, allocations } = req.body;

    if (!leavePeriodId || !allocations || !Array.isArray(allocations)) {
      return res.status(400).json({
        success: false,
        message: 'Leave period ID and allocations array are required'
      });
    }

    const createdAllocations = await LeaveAllocation.bulkAllocate(
      req.firmId,
      leavePeriodId,
      allocations,
      req.userID
    );

    res.status(201).json({
      success: true,
      message: `${createdAllocations.length} allocations created successfully`,
      count: createdAllocations.length,
      data: createdAllocations
    });
  } catch (error) {
    console.error('Error bulk creating leave allocations:', error);
    res.status(400).json({
      success: false,
      message: 'Error bulk creating leave allocations',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/hr/leave-allocations/:id
 * @desc    Update leave allocation
 * @access  Private (Admin/HR)
 */
router.put('/leave-allocations/:id', async (req, res) => {
  try {
    const allocation = await LeaveAllocation.findOneAndUpdate(
      { _id: req.params.id, firmId: req.firmId },
      { ...req.body, updatedBy: req.userID },
      { new: true, runValidators: true }
    )
      .populate('employeeId', 'employeeId firstName lastName')
      .populate('leaveTypeId', 'name nameAr code')
      .populate('leavePeriodId', 'name startDate endDate');

    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: 'Leave allocation not found'
      });
    }

    res.json({
      success: true,
      message: 'Leave allocation updated successfully',
      data: allocation
    });
  } catch (error) {
    console.error('Error updating leave allocation:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating leave allocation',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/hr/leave-allocations/:id
 * @desc    Delete leave allocation
 * @access  Private (Admin)
 */
router.delete('/leave-allocations/:id', async (req, res) => {
  try {
    const allocation = await LeaveAllocation.findOne({
      _id: req.params.id,
      firmId: req.firmId
    });

    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: 'Leave allocation not found'
      });
    }

    // Check if leaves have been used
    if (allocation.leavesUsed > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete allocation with used leaves'
      });
    }

    await allocation.deleteOne();

    res.json({
      success: true,
      message: 'Leave allocation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting leave allocation:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting leave allocation',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/hr/leave-allocations/:id/approve
 * @desc    Approve leave allocation
 * @access  Private (Admin/HR/Manager)
 */
router.post('/leave-allocations/:id/approve', async (req, res) => {
  try {
    const allocation = await LeaveAllocation.findOne({
      _id: req.params.id,
      firmId: req.firmId
    });

    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: 'Leave allocation not found'
      });
    }

    allocation.status = 'approved';
    allocation.approvedBy = req.userID;
    allocation.approvedAt = new Date();
    allocation.updatedBy = req.userID;
    await allocation.save();

    await allocation.populate([
      { path: 'employeeId', select: 'employeeId firstName lastName' },
      { path: 'leaveTypeId', select: 'name nameAr code' },
      { path: 'approvedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Leave allocation approved successfully',
      data: allocation
    });
  } catch (error) {
    console.error('Error approving leave allocation:', error);
    res.status(400).json({
      success: false,
      message: 'Error approving leave allocation',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/hr/leave-allocations/:id/adjust
 * @desc    Adjust leave allocation
 * @access  Private (Admin/HR)
 */
router.post('/leave-allocations/:id/adjust', async (req, res) => {
  try {
    const { type, days, reason } = req.body;

    if (!type || !days || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Adjustment type, days, and reason are required'
      });
    }

    const allocation = await LeaveAllocation.findOne({
      _id: req.params.id,
      firmId: req.firmId
    });

    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: 'Leave allocation not found'
      });
    }

    await allocation.adjustAllocation(type, days, reason, req.userID);

    await allocation.populate([
      { path: 'employeeId', select: 'employeeId firstName lastName' },
      { path: 'leaveTypeId', select: 'name nameAr code' },
      { path: 'adjustments.adjustedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Leave allocation adjusted successfully',
      data: allocation
    });
  } catch (error) {
    console.error('Error adjusting leave allocation:', error);
    res.status(400).json({
      success: false,
      message: 'Error adjusting leave allocation',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/hr/leave-allocations/generate
 * @desc    Auto-generate leave allocations for a period based on policies
 * @access  Private (Admin/HR)
 */
router.post('/leave-allocations/generate', async (req, res) => {
  try {
    const { leavePeriodId, employeeIds } = req.body;

    if (!leavePeriodId) {
      return res.status(400).json({
        success: false,
        message: 'Leave period ID is required'
      });
    }

    // Get the leave period
    const leavePeriod = await LeavePeriod.findOne({
      _id: leavePeriodId,
      firmId: req.firmId
    });

    if (!leavePeriod) {
      return res.status(404).json({
        success: false,
        message: 'Leave period not found'
      });
    }

    // Get default policy
    const defaultPolicy = await LeavePolicy.getDefaultPolicy(req.firmId);

    if (!defaultPolicy) {
      return res.status(400).json({
        success: false,
        message: 'No default leave policy configured'
      });
    }

    // Get employees
    const employeeQuery = { firmId: req.firmId, status: 'active' };
    if (employeeIds && employeeIds.length > 0) {
      employeeQuery._id = { $in: employeeIds };
    }
    const employees = await Employee.find(employeeQuery);

    // Get all leave types in the policy
    const leaveTypeIds = defaultPolicy.leaveTypeAllocations.map(lt => lt.leaveTypeId);
    const leaveTypes = await LeaveType.find({ _id: { $in: leaveTypeIds } });

    const createdAllocations = [];
    const errors = [];

    for (const employee of employees) {
      const yearsOfService = employee.yearsOfService || 0;

      for (const leaveTypeAlloc of defaultPolicy.leaveTypeAllocations) {
        const leaveType = leaveTypes.find(lt => lt._id.equals(leaveTypeAlloc.leaveTypeId));
        if (!leaveType) continue;

        // Check if allocation already exists
        const existingAllocation = await LeaveAllocation.findOne({
          firmId: req.firmId,
          employeeId: employee._id,
          leaveTypeId: leaveTypeAlloc.leaveTypeId,
          leavePeriodId
        });

        if (existingAllocation) {
          errors.push({
            employeeId: employee.employeeId,
            leaveType: leaveType.name,
            error: 'Allocation already exists'
          });
          continue;
        }

        // Calculate allocation with tenure
        const allocatedDays = defaultPolicy.calculateAllocationWithTenure(
          leaveTypeAlloc.leaveTypeId,
          yearsOfService
        );

        try {
          const allocation = await LeaveAllocation.create({
            firmId: req.firmId,
            employeeId: employee._id,
            leaveTypeId: leaveTypeAlloc.leaveTypeId,
            leavePeriodId,
            leavePolicyId: defaultPolicy._id,
            newLeavesAllocated: allocatedDays,
            fromDate: leavePeriod.startDate,
            toDate: leavePeriod.endDate,
            status: 'approved',
            approvedBy: req.userID,
            approvedAt: new Date(),
            createdBy: req.userID,
            allocationReason: 'Auto-generated from leave policy'
          });

          createdAllocations.push(allocation);
        } catch (err) {
          errors.push({
            employeeId: employee.employeeId,
            leaveType: leaveType.name,
            error: err.message
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `Generated ${createdAllocations.length} allocations`,
      count: createdAllocations.length,
      data: createdAllocations,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error generating leave allocations:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating leave allocations',
      error: error.message
    });
  }
});

module.exports = router;
