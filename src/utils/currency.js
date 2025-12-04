/**
 * Currency Utility Module
 *
 * All monetary values in the system are stored as integers (halalas)
 * 1 SAR = 100 halalas
 *
 * This module provides safe arithmetic operations for currency using Dinero.js
 */

const { dinero, add, subtract, multiply, allocate, toDecimal, toSnapshot } = require('dinero.js');
const { SAR } = require('@dinero.js/currencies');
const Decimal = require('decimal.js');

// Configure Decimal.js for precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Create a Dinero object from halalas
 * @param {number} halalas - Amount in halalas (smallest unit)
 * @returns {Dinero} Dinero object
 */
const createDinero = (halalas) => {
  return dinero({ amount: Math.round(halalas), currency: SAR });
};

/**
 * Convert SAR amount to halalas (integer)
 * @param {number|string} sarAmount - Amount in SAR
 * @returns {number} Amount in halalas
 */
const toHalalas = (sarAmount) => {
  if (sarAmount === null || sarAmount === undefined) return 0;
  const decimal = new Decimal(sarAmount);
  return decimal.times(100).round().toNumber();
};

/**
 * Convert halalas to SAR decimal
 * @param {number} halalas - Amount in halalas
 * @returns {number} Amount in SAR
 */
const toSAR = (halalas) => {
  if (halalas === null || halalas === undefined) return 0;
  const decimal = new Decimal(halalas);
  return decimal.dividedBy(100).toNumber();
};

/**
 * Format halalas as currency string
 * @param {number} halalas - Amount in halalas
 * @param {Object} options - Formatting options
 * @param {string} options.locale - Locale for formatting (default: 'ar-SA')
 * @param {boolean} options.showSymbol - Whether to show currency symbol (default: true)
 * @returns {string} Formatted currency string
 */
const formatSAR = (halalas, options = {}) => {
  const { locale = 'ar-SA', showSymbol = true } = options;
  const sarAmount = toSAR(halalas);

  const formatter = new Intl.NumberFormat(locale, {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'SAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return formatter.format(sarAmount);
};

/**
 * Safe addition of two amounts in halalas
 * @param {number} amount1 - First amount in halalas
 * @param {number} amount2 - Second amount in halalas
 * @returns {number} Sum in halalas
 */
const addAmounts = (amount1, amount2) => {
  const d1 = createDinero(amount1 || 0);
  const d2 = createDinero(amount2 || 0);
  const result = add(d1, d2);
  return toSnapshot(result).amount;
};

/**
 * Safe subtraction of two amounts in halalas
 * @param {number} amount1 - First amount in halalas
 * @param {number} amount2 - Second amount to subtract in halalas
 * @returns {number} Difference in halalas
 */
const subtractAmounts = (amount1, amount2) => {
  const d1 = createDinero(amount1 || 0);
  const d2 = createDinero(amount2 || 0);
  const result = subtract(d1, d2);
  return toSnapshot(result).amount;
};

/**
 * Safe multiplication of amount by a multiplier
 * @param {number} amount - Amount in halalas
 * @param {number} multiplier - Multiplier (can be decimal)
 * @returns {number} Product in halalas
 */
const multiplyAmount = (amount, multiplier) => {
  if (!amount || !multiplier) return 0;
  const d = createDinero(amount);
  // Dinero.js multiply expects an object with amount and scale
  const result = multiply(d, { amount: Math.round(multiplier * 100), scale: 2 });
  return toSnapshot(result).amount;
};

/**
 * Safe division of amount by a divisor
 * @param {number} amount - Amount in halalas
 * @param {number} divisor - Divisor (must be > 0)
 * @returns {number} Quotient in halalas
 */
const divideAmount = (amount, divisor) => {
  if (!amount || !divisor || divisor === 0) return 0;
  // Use Decimal.js for precise division
  const decimal = new Decimal(amount);
  return decimal.dividedBy(divisor).round().toNumber();
};

/**
 * Calculate percentage of an amount
 * @param {number} amount - Amount in halalas
 * @param {number} percentage - Percentage (e.g., 15 for 15%)
 * @returns {number} Calculated percentage in halalas
 */
const calculatePercentage = (amount, percentage) => {
  if (!amount || !percentage) return 0;
  const decimal = new Decimal(amount);
  return decimal.times(percentage).dividedBy(100).round().toNumber();
};

/**
 * Allocate amount across multiple ratios (useful for splitting payments)
 * @param {number} amount - Amount in halalas to allocate
 * @param {number[]} ratios - Array of ratios to allocate
 * @returns {number[]} Array of allocated amounts in halalas
 */
const allocateAmount = (amount, ratios) => {
  if (!amount || !ratios || ratios.length === 0) return [];
  const d = createDinero(amount);
  const allocated = allocate(d, ratios);
  return allocated.map(item => toSnapshot(item).amount);
};

/**
 * Compare two amounts
 * @param {number} amount1 - First amount in halalas
 * @param {number} amount2 - Second amount in halalas
 * @returns {number} -1 if amount1 < amount2, 0 if equal, 1 if amount1 > amount2
 */
const compareAmounts = (amount1, amount2) => {
  const a1 = amount1 || 0;
  const a2 = amount2 || 0;
  if (a1 < a2) return -1;
  if (a1 > a2) return 1;
  return 0;
};

/**
 * Check if amount is zero
 * @param {number} amount - Amount in halalas
 * @returns {boolean} True if zero or null/undefined
 */
const isZero = (amount) => {
  return !amount || amount === 0;
};

/**
 * Check if amount is positive
 * @param {number} amount - Amount in halalas
 * @returns {boolean} True if positive
 */
const isPositive = (amount) => {
  return amount && amount > 0;
};

/**
 * Check if amount is negative
 * @param {number} amount - Amount in halalas
 * @returns {boolean} True if negative
 */
const isNegative = (amount) => {
  return amount && amount < 0;
};

/**
 * Get absolute value of amount
 * @param {number} amount - Amount in halalas
 * @returns {number} Absolute value in halalas
 */
const absoluteAmount = (amount) => {
  return Math.abs(amount || 0);
};

/**
 * Sum array of amounts
 * @param {number[]} amounts - Array of amounts in halalas
 * @returns {number} Total sum in halalas
 */
const sumAmounts = (amounts) => {
  if (!amounts || amounts.length === 0) return 0;
  return amounts.reduce((sum, amount) => addAmounts(sum, amount), 0);
};

/**
 * Calculate VAT amount (Saudi VAT is 15%)
 * @param {number} amount - Base amount in halalas
 * @param {number} vatRate - VAT rate percentage (default: 15)
 * @returns {Object} { baseAmount, vatAmount, totalAmount }
 */
const calculateVAT = (amount, vatRate = 15) => {
  const vatAmount = calculatePercentage(amount, vatRate);
  return {
    baseAmount: amount,
    vatAmount,
    totalAmount: addAmounts(amount, vatAmount)
  };
};

/**
 * Extract VAT from a VAT-inclusive amount
 * @param {number} totalAmount - VAT-inclusive amount in halalas
 * @param {number} vatRate - VAT rate percentage (default: 15)
 * @returns {Object} { baseAmount, vatAmount, totalAmount }
 */
const extractVAT = (totalAmount, vatRate = 15) => {
  const decimal = new Decimal(totalAmount);
  const divisor = new Decimal(100 + vatRate).dividedBy(100);
  const baseAmount = decimal.dividedBy(divisor).round().toNumber();
  const vatAmount = subtractAmounts(totalAmount, baseAmount);
  return {
    baseAmount,
    vatAmount,
    totalAmount
  };
};

module.exports = {
  toHalalas,
  toSAR,
  formatSAR,
  addAmounts,
  subtractAmounts,
  multiplyAmount,
  divideAmount,
  calculatePercentage,
  allocateAmount,
  compareAmounts,
  isZero,
  isPositive,
  isNegative,
  absoluteAmount,
  sumAmounts,
  calculateVAT,
  extractVAT,
  createDinero
};
