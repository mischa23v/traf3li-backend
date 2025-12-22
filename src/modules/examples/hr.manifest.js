/**
 * HR Module Manifest
 *
 * Human Resources management module with employee, payroll, and performance features.
 */

const { defineModule } = require('../manifest');

module.exports = defineModule({
  name: 'hr',
  version: '1.2.0',
  description: 'Human Resources management system',
  category: 'business',
  autoInstall: false,
  depends: ['core'],

  services: [
    'hrAnalytics',
    'hrPredictions',
    'biometric'
  ],

  routes: [
    'hr',
    'hrExtended',
    'hrAnalytics',
    'attendance',
    'payroll',
    'performanceReview',
    'training',
    'biometric'
  ],

  models: [
    'Staff',
    'Attendance',
    'PayrollRun',
    'SalarySlip',
    'PerformanceReview',
    'Training',
    'BiometricLog',
    'BiometricEnrollment'
  ],

  queues: [],
  middlewares: []
});
