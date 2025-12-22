/**
 * Finance Module Manifest
 *
 * Financial management module with invoicing, payments, and accounting features.
 */

const { defineModule } = require('../manifest');

module.exports = defineModule({
  name: 'finance',
  version: '1.1.0',
  description: 'Financial management and accounting system',
  category: 'business',
  autoInstall: false,
  depends: ['core'],

  services: [
    'currency',
    'price',
    'bankReconciliation',
    'sadad',
    'zatca'
  ],

  routes: [
    'invoice',
    'payment',
    'expense',
    'transaction',
    'bankAccount',
    'bankReconciliation',
    'generalLedger',
    'financeSetup',
    'creditNote'
  ],

  models: [
    'Invoice',
    'Payment',
    'Expense',
    'Transaction',
    'BankAccount',
    'BankReconciliation',
    'CreditNote',
    'FinanceSetup'
  ],

  queues: [],
  middlewares: []
});
