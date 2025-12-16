/**
 * HR Extended Routes
 *
 * Combined routes for extended HR features including:
 * - Leave encashment and compensatory leave
 * - Salary components
 * - Employee promotions and transfers
 * - Staffing plans
 * - Retention bonuses and incentives
 * - Vehicles
 * - Skills and employee skill mapping
 * - HR settings and setup wizard
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');

// Models
const LeaveEncashment = require('../models/leaveEncashment.model');
const CompensatoryLeave = require('../models/compensatoryLeave.model');
const SalaryComponent = require('../models/salaryComponent.model');
const EmployeePromotion = require('../models/employeePromotion.model');
const EmployeeTransfer = require('../models/employeeTransfer.model');
const StaffingPlan = require('../models/staffingPlan.model');
const RetentionBonus = require('../models/retentionBonus.model');
const EmployeeIncentive = require('../models/employeeIncentive.model');
const Vehicle = require('../models/vehicle.model');
const Skill = require('../models/skill.model');
const EmployeeSkillMap = require('../models/employeeSkillMap.model');
const HRSettings = require('../models/hrSettings.model');
const HRSetupWizard = require('../models/hrSetupWizard.model');

// Apply authentication to all routes
router.use(verifyToken);
router.use(attachFirmContext);

// ==================== LEAVE ENCASHMENT ====================

router.get('/leave-encashment', async (req, res) => {
  try {
    const { employeeId, status, year } = req.query;
    const query = { firmId: req.firmId };

    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (year) {
      query.encashmentDate = {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year, 11, 31)
      };
    }

    const encashments = await LeaveEncashment.find(query)
      .populate('employeeId', 'employeeId firstName lastName')
      .populate('leaveTypeId', 'name nameAr')
      .populate('approvedBy', 'name email')
      .sort({ encashmentDate: -1 });

    res.json({ success: true, count: encashments.length, data: encashments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/leave-encashment', async (req, res) => {
  try {
    const encashment = await LeaveEncashment.create({
      ...req.body,
      firmId: req.firmId,
      createdBy: req.userID
    });
    res.status(201).json({ success: true, data: encashment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/leave-encashment/:id/approve', async (req, res) => {
  try {
    const encashment = await LeaveEncashment.findOne({
      _id: req.params.id,
      firmId: req.firmId
    });
    if (!encashment) return res.status(404).json({ success: false, message: 'Not found' });
    await encashment.approve(req.userID, req.body.comments);
    res.json({ success: true, data: encashment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== COMPENSATORY LEAVE ====================

router.get('/compensatory-leave', async (req, res) => {
  try {
    const { employeeId, status } = req.query;
    const query = { firmId: req.firmId };

    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;

    const compLeaves = await CompensatoryLeave.find(query)
      .populate('employeeId', 'employeeId firstName lastName')
      .populate('approvedBy', 'name email')
      .sort({ workDate: -1 });

    res.json({ success: true, count: compLeaves.length, data: compLeaves });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/compensatory-leave', async (req, res) => {
  try {
    // Auto-calculate days earned
    const daysEarned = CompensatoryLeave.calculateDaysEarned(req.body.hoursWorked, req.body.workReason);
    const expiryDate = req.body.expiryDate || CompensatoryLeave.getDefaultExpiryDate(req.body.workDate);

    const compLeave = await CompensatoryLeave.create({
      ...req.body,
      daysEarned,
      expiryDate,
      firmId: req.firmId,
      createdBy: req.userID
    });
    res.status(201).json({ success: true, data: compLeave });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/compensatory-leave/balance/:employeeId', async (req, res) => {
  try {
    const balance = await CompensatoryLeave.getEmployeeBalance(req.firmId, req.params.employeeId);
    res.json({ success: true, data: balance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/compensatory-leave/:id/approve', async (req, res) => {
  try {
    const compLeave = await CompensatoryLeave.findOne({
      _id: req.params.id,
      firmId: req.firmId
    });
    if (!compLeave) return res.status(404).json({ success: false, message: 'Not found' });
    await compLeave.approve(req.userID);
    res.json({ success: true, data: compLeave });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== SALARY COMPONENTS ====================

router.get('/salary-components', async (req, res) => {
  try {
    const { type, category, isActive } = req.query;
    const query = { firmId: req.firmId };

    if (type) query.componentType = type;
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const components = await SalaryComponent.find(query).sort({ sortOrder: 1, name: 1 });
    res.json({ success: true, count: components.length, data: components });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/salary-components', async (req, res) => {
  try {
    const component = await SalaryComponent.create({
      ...req.body,
      firmId: req.firmId,
      createdBy: req.userID
    });
    res.status(201).json({ success: true, data: component });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/salary-components/create-defaults', async (req, res) => {
  try {
    const components = await SalaryComponent.createDefaultComponents(req.firmId, req.userID);
    res.status(201).json({ success: true, count: components.length, data: components });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/salary-components/:id', async (req, res) => {
  try {
    const component = await SalaryComponent.findOneAndUpdate(
      { _id: req.params.id, firmId: req.firmId },
      { ...req.body, updatedBy: req.userID },
      { new: true, runValidators: true }
    );
    if (!component) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: component });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== EMPLOYEE PROMOTIONS ====================

router.get('/promotions', async (req, res) => {
  try {
    const { employeeId, status } = req.query;
    const query = { firmId: req.firmId };

    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;

    const promotions = await EmployeePromotion.find(query)
      .populate('employeeId', 'employeeId firstName lastName')
      .populate('fromDesignation', 'name nameAr')
      .populate('toDesignation', 'name nameAr')
      .populate('approvedBy', 'name email')
      .sort({ promotionDate: -1 });

    res.json({ success: true, count: promotions.length, data: promotions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/promotions', async (req, res) => {
  try {
    const promotion = await EmployeePromotion.create({
      ...req.body,
      firmId: req.firmId,
      createdBy: req.userID
    });
    res.status(201).json({ success: true, data: promotion });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/promotions/:id/approve', async (req, res) => {
  try {
    const promotion = await EmployeePromotion.findOne({
      _id: req.params.id,
      firmId: req.firmId
    });
    if (!promotion) return res.status(404).json({ success: false, message: 'Not found' });
    await promotion.approve(req.userID, req.body.comments);
    res.json({ success: true, data: promotion });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/promotions/:id/apply', async (req, res) => {
  try {
    const promotion = await EmployeePromotion.findOne({
      _id: req.params.id,
      firmId: req.firmId
    });
    if (!promotion) return res.status(404).json({ success: false, message: 'Not found' });
    await promotion.applyPromotion(req.userID);
    res.json({ success: true, data: promotion });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== EMPLOYEE TRANSFERS ====================

router.get('/transfers', async (req, res) => {
  try {
    const { employeeId, status, transferType } = req.query;
    const query = { firmId: req.firmId };

    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (transferType) query.transferType = transferType;

    const transfers = await EmployeeTransfer.find(query)
      .populate('employeeId', 'employeeId firstName lastName')
      .populate('fromDepartment', 'name')
      .populate('toDepartment', 'name')
      .populate('approvedBy', 'name email')
      .sort({ transferDate: -1 });

    res.json({ success: true, count: transfers.length, data: transfers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/transfers', async (req, res) => {
  try {
    const transfer = await EmployeeTransfer.create({
      ...req.body,
      firmId: req.firmId,
      createdBy: req.userID
    });
    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/transfers/:id/approve', async (req, res) => {
  try {
    const transfer = await EmployeeTransfer.findOne({
      _id: req.params.id,
      firmId: req.firmId
    });
    if (!transfer) return res.status(404).json({ success: false, message: 'Not found' });
    await transfer.approve(req.userID, req.body.comments);
    res.json({ success: true, data: transfer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/transfers/:id/apply', async (req, res) => {
  try {
    const transfer = await EmployeeTransfer.findOne({
      _id: req.params.id,
      firmId: req.firmId
    });
    if (!transfer) return res.status(404).json({ success: false, message: 'Not found' });
    await transfer.applyTransfer(req.userID);
    res.json({ success: true, data: transfer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== STAFFING PLANS ====================

router.get('/staffing-plans', async (req, res) => {
  try {
    const { fiscalYear, status, departmentId } = req.query;
    const query = { firmId: req.firmId };

    if (fiscalYear) query.fiscalYear = parseInt(fiscalYear);
    if (status) query.status = status;
    if (departmentId) query.department = departmentId;

    const plans = await StaffingPlan.find(query)
      .populate('department', 'name')
      .populate('staffingDetails.designation', 'name nameAr')
      .sort({ fiscalYear: -1, department: 1 });

    res.json({ success: true, count: plans.length, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/staffing-plans', async (req, res) => {
  try {
    const plan = await StaffingPlan.create({
      ...req.body,
      firmId: req.firmId,
      createdBy: req.userID
    });
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/staffing-plans/vacancy-summary', async (req, res) => {
  try {
    const summary = await StaffingPlan.getVacancySummary(req.firmId, req.query.fiscalYear);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== RETENTION BONUSES ====================

router.get('/retention-bonuses', async (req, res) => {
  try {
    const { employeeId, status } = req.query;
    const query = { firmId: req.firmId };

    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;

    const bonuses = await RetentionBonus.find(query)
      .populate('employeeId', 'employeeId firstName lastName')
      .populate('approvedBy', 'name email')
      .sort({ startDate: -1 });

    res.json({ success: true, count: bonuses.length, data: bonuses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/retention-bonuses', async (req, res) => {
  try {
    const bonus = await RetentionBonus.create({
      ...req.body,
      firmId: req.firmId,
      createdBy: req.userID
    });
    res.status(201).json({ success: true, data: bonus });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/retention-bonuses/:id/vest/:milestone', async (req, res) => {
  try {
    const bonus = await RetentionBonus.findOne({
      _id: req.params.id,
      firmId: req.firmId
    });
    if (!bonus) return res.status(404).json({ success: false, message: 'Not found' });
    await bonus.vestMilestone(parseInt(req.params.milestone), req.userID);
    res.json({ success: true, data: bonus });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== EMPLOYEE INCENTIVES ====================

router.get('/incentives', async (req, res) => {
  try {
    const { employeeId, status, incentiveType } = req.query;
    const query = { firmId: req.firmId };

    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (incentiveType) query.incentiveType = incentiveType;

    const incentives = await EmployeeIncentive.find(query)
      .populate('employeeId', 'employeeId firstName lastName')
      .populate('approvedBy', 'name email')
      .sort({ awardDate: -1 });

    res.json({ success: true, count: incentives.length, data: incentives });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/incentives', async (req, res) => {
  try {
    const incentive = await EmployeeIncentive.create({
      ...req.body,
      firmId: req.firmId,
      createdBy: req.userID
    });
    res.status(201).json({ success: true, data: incentive });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/incentives/stats', async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const stats = await EmployeeIncentive.getIncentiveStats(req.firmId, year);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== VEHICLES ====================

router.get('/vehicles', async (req, res) => {
  try {
    const { status, assignedTo, vehicleType } = req.query;
    const query = { firmId: req.firmId };

    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;
    if (vehicleType) query.vehicleType = vehicleType;

    const vehicles = await Vehicle.find(query)
      .populate('assignedTo', 'employeeId firstName lastName')
      .populate('department', 'name')
      .sort({ make: 1, model: 1 });

    res.json({ success: true, count: vehicles.length, data: vehicles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/vehicles', async (req, res) => {
  try {
    const vehicle = await Vehicle.create({
      ...req.body,
      firmId: req.firmId,
      createdBy: req.userID
    });
    res.status(201).json({ success: true, data: vehicle });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/vehicles/:id/assign', async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      firmId: req.firmId
    });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Not found' });
    await vehicle.assignToEmployee(req.body.employeeId, req.body.assignmentType, req.userID, req.body.endDate);
    res.json({ success: true, data: vehicle });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/vehicles/:id/maintenance', async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      firmId: req.firmId
    });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Not found' });
    await vehicle.addMaintenanceRecord(req.body, req.userID);
    res.json({ success: true, data: vehicle });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/vehicles/fleet-summary', async (req, res) => {
  try {
    const summary = await Vehicle.getFleetSummary(req.firmId);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== SKILLS ====================

router.get('/skills', async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const query = { firmId: req.firmId };

    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skills = await Skill.find(query).sort({ category: 1, name: 1 });
    res.json({ success: true, count: skills.length, data: skills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/skills', async (req, res) => {
  try {
    const skill = await Skill.create({
      ...req.body,
      firmId: req.firmId,
      createdBy: req.userID
    });
    res.status(201).json({ success: true, data: skill });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/skills/by-category', async (req, res) => {
  try {
    const skills = await Skill.getByCategory(req.firmId);
    res.json({ success: true, data: skills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== EMPLOYEE SKILLS ====================

router.get('/employee-skills/:employeeId', async (req, res) => {
  try {
    const skills = await EmployeeSkillMap.getEmployeeSkills(req.firmId, req.params.employeeId);
    res.json({ success: true, count: skills.length, data: skills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/employee-skills', async (req, res) => {
  try {
    const skillMap = await EmployeeSkillMap.create({
      ...req.body,
      firmId: req.firmId,
      createdBy: req.userID
    });
    res.status(201).json({ success: true, data: skillMap });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/employee-skills/matrix', async (req, res) => {
  try {
    const matrix = await EmployeeSkillMap.getSkillMatrix(req.firmId, req.query.departmentId);
    res.json({ success: true, data: matrix });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/employee-skills/expiring-certifications', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const certifications = await EmployeeSkillMap.getExpiringCertifications(req.firmId, days);
    res.json({ success: true, count: certifications.length, data: certifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== HR SETTINGS ====================

router.get('/settings', async (req, res) => {
  try {
    const settings = await HRSettings.getSettings(req.firmId);
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const settings = await HRSettings.updateSettings(req.firmId, req.body, req.userID);
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/settings/leave', async (req, res) => {
  try {
    const settings = await HRSettings.getLeaveSettings(req.firmId);
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/settings/payroll', async (req, res) => {
  try {
    const settings = await HRSettings.getPayrollSettings(req.firmId);
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== HR SETUP WIZARD ====================

router.get('/setup-wizard', async (req, res) => {
  try {
    const wizard = await HRSetupWizard.getWizard(req.firmId);
    res.json({ success: true, data: wizard });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/setup-wizard/progress', async (req, res) => {
  try {
    const progress = await HRSetupWizard.getProgress(req.firmId);
    res.json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/setup-wizard/complete-step/:stepId', async (req, res) => {
  try {
    const wizard = await HRSetupWizard.getWizard(req.firmId);
    await wizard.completeStep(req.params.stepId, req.userID);
    res.json({ success: true, data: wizard });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/setup-wizard/skip-step/:stepId', async (req, res) => {
  try {
    const wizard = await HRSetupWizard.getWizard(req.firmId);
    await wizard.skipStep(req.params.stepId, req.userID);
    res.json({ success: true, data: wizard });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/setup-wizard/skip', async (req, res) => {
  try {
    const wizard = await HRSetupWizard.getWizard(req.firmId);
    await wizard.skipWizard(req.userID, req.body.reason);
    res.json({ success: true, data: wizard });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
