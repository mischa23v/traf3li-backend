/**
 * Temporal Offboarding Routes
 * Integration routes for Employee Offboarding Workflow
 */

const express = require('express');
const router = express.Router();
const temporal = require('../temporal');
const Offboarding = require('../models/offboarding.model');
const Employee = require('../models/employee.model');
const { authenticate } = require('../middlewares');
const { body, param, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Validation middleware to check express-validator results
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// Alias for compatibility
const protect = authenticate;

/**
 * @route   POST /api/employees/:id/start-offboarding
 * @desc    Start offboarding workflow for an employee
 * @access  Private (HR, Admin)
 */
router.post(
  '/:id/start-offboarding',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid employee ID'),
    body('exitType')
      .isIn(['resignation', 'termination', 'contract_end', 'retirement', 'death', 'mutual_agreement'])
      .withMessage('Invalid exit type'),
    body('lastWorkingDay')
      .isISO8601()
      .withMessage('Invalid last working day date'),
    body('noticeDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid notice date'),
    body('exitReason')
      .optional()
      .isString()
      .withMessage('Exit reason must be a string'),
    body('managerId')
      .optional()
      .isMongoId()
      .withMessage('Invalid manager ID')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id: employeeId } = req.params;
      const {
        exitType,
        lastWorkingDay,
        noticeDate,
        exitReason,
        managerId,
        noticePeriodDays,
        knowledgeTransferRecipients
      } = req.body;

      // Check if employee exists
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Check if offboarding already exists
      let offboarding = await Offboarding.findOne({ employeeId });

      if (offboarding && offboarding.status !== 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Offboarding process already initiated for this employee',
          offboardingId: offboarding.offboardingId,
          status: offboarding.status
        });
      }

      // Create or update offboarding record
      if (!offboarding) {
        offboarding = new Offboarding({
          employeeId: employee._id,
          employeeNumber: employee.employeeId,
          employeeName: employee.personalInfo?.fullNameEnglish,
          employeeNameAr: employee.personalInfo?.fullNameArabic,
          nationalId: employee.personalInfo?.nationalId,
          email: employee.personalInfo?.email,
          phone: employee.personalInfo?.mobile,
          department: employee.employment?.departmentName,
          jobTitle: employee.employment?.jobTitle,
          jobTitleAr: employee.employment?.jobTitleArabic,
          employmentType: employee.employment?.employmentType,
          contractType: employee.employment?.contractType,
          hireDate: employee.employment?.hireDate,
          managerId: managerId || employee.employment?.reportsTo,
          exitType: exitType,
          dates: {
            noticeDate: noticeDate || new Date(),
            lastWorkingDay: lastWorkingDay
          },
          noticePeriod: {
            requiredDays: noticePeriodDays || 30
          },
          status: 'initiated',
          firmId: req.user.firmId || null,
          lawyerId: req.user.firmId ? null : req.user._id,
          createdBy: req.user._id
        });

        // Calculate service duration
        if (employee.employment?.hireDate) {
          offboarding.calculateServiceDuration(
            employee.employment.hireDate,
            lastWorkingDay
          );
        }

        // Set exit type specific fields
        if (exitType === 'resignation') {
          offboarding.resignation = {
            resignationDate: noticeDate || new Date(),
            resignationReason: exitReason,
            resignationLetter: { submitted: true, submittedDate: new Date() }
          };
        } else if (exitType === 'termination') {
          offboarding.termination = {
            terminationDate: new Date(),
            terminationReason: exitReason,
            notice: {
              required: true,
              noticePeriod: noticePeriodDays || 30,
              noticeGiven: true,
              noticeDate: noticeDate || new Date()
            }
          };
        } else if (exitType === 'retirement') {
          offboarding.retirement = {
            retirementDate: lastWorkingDay,
            retirementType: 'voluntary'
          };
        }

        // Set knowledge transfer recipients if provided
        if (knowledgeTransferRecipients && knowledgeTransferRecipients.length > 0) {
          offboarding.knowledgeTransfer = {
            required: true,
            handoverPlan: {
              created: false,
              handoverTo: knowledgeTransferRecipients
            }
          };
        }

        await offboarding.save();
      } else {
        // Update cancelled offboarding
        offboarding.status = 'initiated';
        offboarding.dates.lastWorkingDay = lastWorkingDay;
        offboarding.dates.noticeDate = noticeDate || new Date();
        await offboarding.save();
      }

      // Start Temporal workflow
      const workflowId = `offboarding-${employee._id}-${Date.now()}`;

      const handle = await temporal.client.startOffboardingWorkflow({
        employeeId: employee._id.toString(),
        offboardingData: {
            offboardingId: offboarding._id.toString(),
            employeeNumber: employee.employeeId,
            employeeName: employee.personalInfo?.fullNameEnglish,
            employeeNameAr: employee.personalInfo?.fullNameArabic,
            email: employee.personalInfo?.email,
            nationalId: employee.personalInfo?.nationalId,
            department: employee.employment?.departmentName,
            jobTitle: employee.employment?.jobTitle,
            managerId: offboarding.managerId,
            exitType: exitType,
            dates: {
              noticeDate: offboarding.dates.noticeDate,
              lastWorkingDay: offboarding.dates.lastWorkingDay
            },
            noticePeriod: offboarding.noticePeriod,
            serviceDuration: offboarding.serviceDuration,
            basicSalary: employee.compensation?.basicSalary,
            knowledgeTransfer: offboarding.knowledgeTransfer,
            clearance: offboarding.clearance,
            exitInterview: offboarding.exitInterview
          }
        }
      , { workflowId });

      // Update offboarding with workflow ID
      offboarding.relatedRecords = offboarding.relatedRecords || {};
      offboarding.relatedRecords.temporalWorkflowId = workflowId;
      await offboarding.save();

      logger.info(`[Offboarding Workflow] Started for employee ${employee.employeeId} - Workflow ID: ${workflowId}`);

      res.status(201).json({
        success: true,
        message: 'Offboarding workflow started successfully',
        data: {
          offboardingId: offboarding.offboardingId,
          workflowId: workflowId,
          employeeId: employee.employeeId,
          employeeName: employee.personalInfo?.fullNameEnglish,
          exitType: exitType,
          lastWorkingDay: offboarding.dates.lastWorkingDay,
          status: offboarding.status
        }
      });

    } catch (error) {
      logger.error('[Offboarding Route] Failed to start workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start offboarding workflow',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/employees/:id/offboarding/complete-task
 * @desc    Mark an offboarding task/phase as complete
 * @access  Private (HR, Admin, Department Managers)
 */
router.post(
  '/:id/offboarding/complete-task',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid employee ID'),
    body('phase')
      .isIn(['notification', 'knowledge_transfer', 'access_revocation', 'equipment_return', 'exit_interview', 'clearance'])
      .withMessage('Invalid phase'),
    body('notes')
      .optional()
      .isString()
      .withMessage('Notes must be a string'),
    body('completedBy')
      .optional()
      .isMongoId()
      .withMessage('Invalid completedBy user ID')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id: employeeId } = req.params;
      const { phase, notes, completedBy } = req.body;

      // Find offboarding record
      const offboarding = await Offboarding.findOne({ employeeId });

      if (!offboarding) {
        return res.status(404).json({
          success: false,
          message: 'Offboarding record not found'
        });
      }

      const workflowId = offboarding.relatedRecords?.temporalWorkflowId;

      if (!workflowId) {
        return res.status(400).json({
          success: false,
          message: 'No active workflow found for this offboarding'
        });
      }

      // Send signal to Temporal workflow
      const handle = await temporal.client.getWorkflowHandle(workflowId);

      // Determine which signal to send based on phase
      const signalMap = {
        notification: 'notificationPhaseComplete',
        knowledge_transfer: 'knowledgeTransferComplete',
        access_revocation: 'accessRevocationComplete',
        equipment_return: 'equipmentReturnComplete',
        exit_interview: 'exitInterviewComplete',
        clearance: 'clearanceComplete'
      };

      const signalName = signalMap[phase];

      if (!signalName) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phase name'
        });
      }

      // Send signal to workflow
      await handle.signal(signalName);

      // Update offboarding record
      const updatePath = `${phase.replace(/_/g, '')}.completed`;
      const completedDatePath = `${phase.replace(/_/g, '')}.completedDate`;
      const completedByPath = `${phase.replace(/_/g, '')}.completedBy`;

      // Special handling for clearance section paths
      let updateObj = {};
      if (phase === 'knowledge_transfer') {
        updateObj = {
          'knowledgeTransfer.handoverComplete': true,
          'knowledgeTransfer.handoverCompletionDate': new Date(),
          'completion.knowledgeTransferCompleted': true
        };
      } else if (phase === 'access_revocation') {
        updateObj = {
          'clearance.itClearance.cleared': true,
          'clearance.itClearance.clearanceDate': new Date(),
          'clearance.itClearance.clearedBy': completedBy || req.user._id
        };
      } else if (phase === 'equipment_return') {
        updateObj = {
          'clearance.allItemsReturned': true
        };
      } else if (phase === 'exit_interview') {
        updateObj = {
          'exitInterview.conducted': true,
          'exitInterview.conductedDate': new Date(),
          'exitInterview.completed': true,
          'completion.exitInterviewCompleted': true
        };
      } else if (phase === 'clearance') {
        updateObj = {
          'clearance.allClearancesObtained': true,
          'clearance.finalClearanceDate': new Date(),
          'completion.clearanceCompleted': true
        };
      }

      // Add timeline event
      updateObj.$push = {
        timeline: {
          eventType: `${phase}_completed`,
          eventDate: new Date(),
          description: `${phase.replace(/_/g, ' ')} phase completed`,
          performedBy: completedBy || req.user._id,
          status: 'completed',
          notes: notes
        }
      };

      await Offboarding.findByIdAndUpdate(offboarding._id, updateObj);

      logger.info(`[Offboarding] Phase ${phase} completed for employee ${employeeId}`);

      res.json({
        success: true,
        message: `${phase.replace(/_/g, ' ')} phase marked as complete`,
        data: {
          phase,
          completedAt: new Date(),
          workflowId
        }
      });

    } catch (error) {
      logger.error('[Offboarding Route] Failed to complete task:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete task',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/employees/:id/offboarding/status
 * @desc    Get offboarding workflow status
 * @access  Private
 */
router.get(
  '/:id/offboarding/status',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid employee ID')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id: employeeId } = req.params;

      // Find offboarding record
      const offboarding = await Offboarding.findOne({ employeeId })
        .populate('employeeId', 'employeeId personalInfo.fullNameEnglish personalInfo.fullNameArabic')
        .populate('managerId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName');

      if (!offboarding) {
        return res.status(404).json({
          success: false,
          message: 'Offboarding record not found'
        });
      }

      const workflowId = offboarding.relatedRecords?.temporalWorkflowId;
      let workflowStatus = null;

      // Get workflow status from Temporal if workflow ID exists
      if (workflowId) {
        try {
          const handle = await temporal.client.getWorkflowHandle(workflowId);
          const description = await handle.describe();

          workflowStatus = {
            workflowId: workflowId,
            status: description.status.name,
            startTime: description.startTime,
            executionTime: description.executionTime,
            historyLength: description.historyLength
          };

          // Try to get workflow result if completed
          if (description.status.name === 'COMPLETED') {
            try {
              const result = await handle.result();
              workflowStatus.result = result;
            } catch (err) {
              // Workflow might still be running
            }
          }
        } catch (error) {
          logger.warn(`[Offboarding] Could not fetch workflow status: ${error.message}`);
          workflowStatus = {
            workflowId: workflowId,
            status: 'UNKNOWN',
            error: error.message
          };
        }
      }

      // Calculate progress
      const phases = [
        { name: 'notification', completed: false },
        { name: 'knowledge_transfer', completed: offboarding.knowledgeTransfer?.handoverComplete || false },
        { name: 'access_revocation', completed: offboarding.clearance?.itClearance?.cleared || false },
        { name: 'equipment_return', completed: offboarding.clearance?.allItemsReturned || false },
        { name: 'exit_interview', completed: offboarding.exitInterview?.completed || false },
        { name: 'clearance', completed: offboarding.clearance?.allClearancesObtained || false }
      ];

      const completedPhases = phases.filter(p => p.completed).length;
      const totalPhases = phases.length;
      const progressPercentage = Math.round((completedPhases / totalPhases) * 100);

      res.json({
        success: true,
        data: {
          offboardingId: offboarding.offboardingId,
          employee: {
            id: offboarding.employeeId?.employeeId,
            name: offboarding.employeeName,
            nameAr: offboarding.employeeNameAr,
            department: offboarding.department,
            jobTitle: offboarding.jobTitle
          },
          exitType: offboarding.exitType,
          status: offboarding.status,
          dates: {
            noticeDate: offboarding.dates?.noticeDate,
            lastWorkingDay: offboarding.dates?.lastWorkingDay,
            exitEffectiveDate: offboarding.dates?.exitEffectiveDate
          },
          progress: {
            percentage: progressPercentage,
            completedPhases: completedPhases,
            totalPhases: totalPhases,
            phases: phases
          },
          phaseDetails: {
            knowledgeTransfer: {
              required: offboarding.knowledgeTransfer?.required,
              completed: offboarding.knowledgeTransfer?.handoverComplete,
              completionDate: offboarding.knowledgeTransfer?.handoverCompletionDate
            },
            accessRevocation: {
              required: offboarding.clearance?.itClearance?.required,
              completed: offboarding.clearance?.itClearance?.cleared,
              clearanceDate: offboarding.clearance?.itClearance?.clearanceDate
            },
            equipmentReturn: {
              required: true,
              completed: offboarding.clearance?.allItemsReturned,
              itemsCount: offboarding.clearance?.itemsToReturn?.length || 0
            },
            exitInterview: {
              required: offboarding.exitInterview?.required,
              completed: offboarding.exitInterview?.completed,
              conductedDate: offboarding.exitInterview?.conductedDate
            },
            clearance: {
              required: offboarding.clearance?.required,
              completed: offboarding.clearance?.allClearancesObtained,
              clearanceDate: offboarding.clearance?.finalClearanceDate
            }
          },
          timeline: offboarding.timeline?.slice(-10) || [], // Last 10 events
          completion: offboarding.completion,
          workflow: workflowStatus,
          createdAt: offboarding.createdAt,
          updatedAt: offboarding.updatedAt
        }
      });

    } catch (error) {
      logger.error('[Offboarding Route] Failed to get status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve offboarding status',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/employees/:id/offboarding/escalate
 * @desc    Escalate offboarding issue or override phase
 * @access  Private (HR, Admin)
 */
router.post(
  '/:id/offboarding/escalate',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid employee ID'),
    body('action')
      .isIn(['escalate', 'override'])
      .withMessage('Action must be either escalate or override'),
    body('phase')
      .isIn(['notification', 'knowledge_transfer', 'access_revocation', 'equipment_return', 'exit_interview', 'clearance'])
      .withMessage('Invalid phase'),
    body('reason')
      .isString()
      .notEmpty()
      .withMessage('Reason is required'),
    body('escalatedTo')
      .optional()
      .isString()
      .withMessage('EscalatedTo must be a string'),
    body('approvedBy')
      .optional()
      .isMongoId()
      .withMessage('Invalid approvedBy user ID')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id: employeeId } = req.params;
      const { action, phase, reason, escalatedTo, approvedBy } = req.body;

      // Find offboarding record
      const offboarding = await Offboarding.findOne({ employeeId });

      if (!offboarding) {
        return res.status(404).json({
          success: false,
          message: 'Offboarding record not found'
        });
      }

      const workflowId = offboarding.relatedRecords?.temporalWorkflowId;

      if (!workflowId) {
        return res.status(400).json({
          success: false,
          message: 'No active workflow found for this offboarding'
        });
      }

      // Send signal to Temporal workflow
      const handle = await temporal.client.getWorkflowHandle(workflowId);

      if (action === 'escalate') {
        // Send escalation signal
        await handle.signal('escalation', {
          phase: phase,
          reason: reason,
          escalatedTo: escalatedTo || 'HR Manager',
          escalatedBy: req.user._id.toString(),
          timestamp: new Date().toISOString()
        });

        // Update offboarding record
        await Offboarding.findByIdAndUpdate(offboarding._id, {
          $push: {
            timeline: {
              eventType: 'status_changed',
              eventDate: new Date(),
              description: `Escalation: ${reason}`,
              performedBy: req.user._id,
              status: 'pending',
              notes: `Phase: ${phase}, Escalated to: ${escalatedTo}`
            }
          }
        });

        logger.info(`[Offboarding] Issue escalated for employee ${employeeId} - Phase: ${phase}`);

        res.json({
          success: true,
          message: 'Issue escalated successfully',
          data: {
            action: 'escalate',
            phase,
            escalatedTo,
            timestamp: new Date()
          }
        });

      } else if (action === 'override') {
        // Send manual override signal
        await handle.signal('manualOverride', {
          phase: phase,
          reason: reason,
          approvedBy: approvedBy || req.user._id.toString(),
          timestamp: new Date().toISOString()
        });

        // Update offboarding record
        await Offboarding.findByIdAndUpdate(offboarding._id, {
          $push: {
            timeline: {
              eventType: 'status_changed',
              eventDate: new Date(),
              description: `Manual override: ${reason}`,
              performedBy: req.user._id,
              status: 'completed',
              notes: `Phase: ${phase}, Approved by: ${approvedBy || req.user._id}`
            }
          }
        });

        logger.info(`[Offboarding] Manual override applied for employee ${employeeId} - Phase: ${phase}`);

        res.json({
          success: true,
          message: 'Manual override applied successfully',
          data: {
            action: 'override',
            phase,
            approvedBy: approvedBy || req.user._id,
            timestamp: new Date()
          }
        });
      }

    } catch (error) {
      logger.error('[Offboarding Route] Failed to process escalation/override:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process request',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/employees/:id/offboarding/cancel
 * @desc    Cancel offboarding workflow
 * @access  Private (HR, Admin)
 */
router.post(
  '/:id/offboarding/cancel',
  protect,
  [
    param('id').isMongoId().withMessage('Invalid employee ID'),
    body('reason')
      .isString()
      .notEmpty()
      .withMessage('Cancellation reason is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id: employeeId } = req.params;
      const { reason } = req.body;

      // Find offboarding record
      const offboarding = await Offboarding.findOne({ employeeId });

      if (!offboarding) {
        return res.status(404).json({
          success: false,
          message: 'Offboarding record not found'
        });
      }

      const workflowId = offboarding.relatedRecords?.temporalWorkflowId;

      // Cancel Temporal workflow if exists
      if (workflowId) {
        try {
          await temporal.client.cancelWorkflow(workflowId);
          logger.info(`[Offboarding] Workflow cancelled: ${workflowId}`);
        } catch (error) {
          logger.warn(`[Offboarding] Could not cancel workflow: ${error.message}`);
        }
      }

      // Update offboarding status
      await Offboarding.findByIdAndUpdate(offboarding._id, {
        status: 'cancelled',
        $push: {
          timeline: {
            eventType: 'status_changed',
            eventDate: new Date(),
            description: `Offboarding cancelled: ${reason}`,
            performedBy: req.user._id,
            status: 'completed'
          }
        }
      });

      logger.info(`[Offboarding] Offboarding cancelled for employee ${employeeId}`);

      res.json({
        success: true,
        message: 'Offboarding workflow cancelled successfully',
        data: {
          offboardingId: offboarding.offboardingId,
          status: 'cancelled',
          reason,
          cancelledAt: new Date()
        }
      });

    } catch (error) {
      logger.error('[Offboarding Route] Failed to cancel workflow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel offboarding workflow',
        error: error.message
      });
    }
  }
);

module.exports = router;
