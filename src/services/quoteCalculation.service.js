/**
 * Quote Calculation Service
 *
 * Server-side calculations for quotes with:
 * - Line item calculations
 * - Discount handling (line-level and order-level)
 * - VAT/Tax calculations
 * - Total calculations
 * - Margin analysis
 *
 * Backend does 90% of work - frontend just displays
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Default tax rate (Saudi VAT)
const DEFAULT_TAX_RATE = 15;

class QuoteCalculationService {
    // ═══════════════════════════════════════════════════════════
    // LINE ITEM CALCULATIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * Calculate line item totals
     * @param {object} item - Line item data
     * @param {object} options - Calculation options
     * @returns {object} - Calculated item
     */
    static calculateLineItem(item, options = {}) {
        const {
            taxRate = DEFAULT_TAX_RATE,
            pricesIncludeTax = false,
            roundingPrecision = 2
        } = options;

        const round = (num) => Math.round(num * Math.pow(10, roundingPrecision)) / Math.pow(10, roundingPrecision);

        const quantity = item.quantity || 1;
        const unitPrice = item.unitPrice || 0;

        // Calculate base subtotal
        let subtotal = quantity * unitPrice;

        // Apply line discount
        let discountAmount = 0;
        if (item.discountPercent > 0) {
            discountAmount = subtotal * (item.discountPercent / 100);
        } else if (item.discountAmount > 0) {
            discountAmount = item.discountAmount;
        }
        discountAmount = round(discountAmount);

        // Subtotal after discount
        subtotal = round(subtotal - discountAmount);

        // Calculate tax
        const itemTaxRate = item.taxRate !== undefined ? item.taxRate : taxRate;
        let taxAmount = 0;

        if (pricesIncludeTax) {
            // Tax-inclusive: extract tax from subtotal
            taxAmount = round(subtotal - (subtotal / (1 + itemTaxRate / 100)));
            subtotal = round(subtotal - taxAmount);
        } else {
            // Tax-exclusive: add tax to subtotal
            taxAmount = round(subtotal * (itemTaxRate / 100));
        }

        // Calculate total
        const total = round(subtotal + taxAmount);

        // Calculate margin if cost is provided
        let marginAmount = null;
        let marginPercent = null;
        if (item.costPrice && item.costPrice > 0) {
            const totalCost = item.costPrice * quantity;
            marginAmount = round(subtotal - totalCost);
            marginPercent = subtotal > 0 ? round((marginAmount / subtotal) * 100) : 0;
        }

        return {
            ...item,
            quantity,
            unitPrice,
            discountPercent: item.discountPercent || 0,
            discountAmount,
            taxRate: itemTaxRate,
            taxAmount,
            subtotal,
            total,
            marginAmount,
            marginPercent
        };
    }

    /**
     * Calculate all line items
     * @param {Array} items - Array of line items
     * @param {object} options - Calculation options
     * @returns {Array} - Calculated items
     */
    static calculateLineItems(items, options = {}) {
        return items.map((item, index) => ({
            ...this.calculateLineItem(item, options),
            lineNumber: index + 1
        }));
    }

    // ═══════════════════════════════════════════════════════════
    // ORDER-LEVEL CALCULATIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * Calculate quote/order totals
     * @param {Array} items - Calculated line items
     * @param {object} orderDiscount - Order-level discount
     * @param {object} options - Calculation options
     * @returns {object} - Totals breakdown
     */
    static calculateTotals(items, orderDiscount = {}, options = {}) {
        const {
            shippingCost = 0,
            handlingCost = 0,
            otherCharges = 0,
            roundingAdjustment = 0,
            roundingPrecision = 2
        } = options;

        const round = (num) => Math.round(num * Math.pow(10, roundingPrecision)) / Math.pow(10, roundingPrecision);

        // Sum line item values
        const itemsSubtotal = round(items.reduce((sum, item) => sum + (item.subtotal || 0), 0));
        const itemsDiscountTotal = round(items.reduce((sum, item) => sum + (item.discountAmount || 0), 0));
        const itemsTaxTotal = round(items.reduce((sum, item) => sum + (item.taxAmount || 0), 0));

        // Calculate order-level discount
        let orderDiscountAmount = 0;
        if (orderDiscount.type === 'percentage' && orderDiscount.value > 0) {
            orderDiscountAmount = round(itemsSubtotal * (orderDiscount.value / 100));
        } else if (orderDiscount.type === 'amount' && orderDiscount.value > 0) {
            orderDiscountAmount = round(orderDiscount.value);
        }

        // Subtotal after order discount
        const subtotal = round(itemsSubtotal - orderDiscountAmount);

        // Tax (already calculated per line, but may need adjustment for order discount)
        // For simplicity, we use the pre-calculated tax
        const taxTotal = itemsTaxTotal;

        // Additional charges
        const additionalCharges = round(shippingCost + handlingCost + otherCharges);

        // Grand total
        const grandTotal = round(subtotal + taxTotal + additionalCharges + roundingAdjustment);

        // Tax breakdown by rate
        const taxBreakdown = this.calculateTaxBreakdown(items);

        // Margin analysis
        const itemsWithCost = items.filter(i => i.costPrice && i.costPrice > 0);
        const totalCost = round(itemsWithCost.reduce((sum, i) => sum + (i.costPrice * i.quantity), 0));
        const totalMargin = round(subtotal - totalCost);
        const marginPercent = subtotal > 0 ? round((totalMargin / subtotal) * 100) : 0;

        return {
            itemsSubtotal,
            itemsDiscountTotal,
            orderDiscountAmount,
            totalDiscountAmount: round(itemsDiscountTotal + orderDiscountAmount),
            subtotal,
            taxableAmount: subtotal,
            taxTotal,
            taxBreakdown,
            additionalCharges,
            shippingCost,
            handlingCost,
            otherCharges,
            roundingAdjustment,
            grandTotal,
            totalCost,
            totalMargin,
            marginPercent,
            itemCount: items.length,
            totalQuantity: items.reduce((sum, i) => sum + (i.quantity || 0), 0)
        };
    }

    /**
     * Calculate tax breakdown by rate
     * @param {Array} items - Calculated line items
     * @returns {Array} - Tax breakdown
     */
    static calculateTaxBreakdown(items) {
        const taxMap = {};

        items.forEach(item => {
            const rate = item.taxRate || 0;
            const key = `${rate}`;

            if (!taxMap[key]) {
                taxMap[key] = {
                    taxRate: rate,
                    taxName: rate === 15 ? 'VAT' : `Tax ${rate}%`,
                    taxNameAr: rate === 15 ? 'ضريبة القيمة المضافة' : `ضريبة ${rate}%`,
                    taxableAmount: 0,
                    taxAmount: 0
                };
            }

            taxMap[key].taxableAmount += item.subtotal || 0;
            taxMap[key].taxAmount += item.taxAmount || 0;
        });

        return Object.values(taxMap).map(tax => ({
            ...tax,
            taxableAmount: Math.round(tax.taxableAmount * 100) / 100,
            taxAmount: Math.round(tax.taxAmount * 100) / 100
        }));
    }

    // ═══════════════════════════════════════════════════════════
    // FULL QUOTE CALCULATION
    // ═══════════════════════════════════════════════════════════

    /**
     * Calculate complete quote
     * @param {object} quoteData - Quote data
     * @param {object} options - Calculation options
     * @returns {object} - Fully calculated quote
     */
    static calculateQuote(quoteData, options = {}) {
        const {
            taxRate = DEFAULT_TAX_RATE,
            pricesIncludeTax = false,
            roundingPrecision = 2
        } = options;

        // Calculate line items
        const calculatedItems = this.calculateLineItems(
            quoteData.items || [],
            { taxRate, pricesIncludeTax, roundingPrecision }
        );

        // Calculate totals
        const totals = this.calculateTotals(
            calculatedItems,
            {
                type: quoteData.additionalDiscountType || 'percentage',
                value: quoteData.additionalDiscountValue || 0
            },
            {
                shippingCost: quoteData.shippingCost || 0,
                handlingCost: quoteData.handlingCost || 0,
                otherCharges: quoteData.otherCharges || 0,
                roundingAdjustment: quoteData.roundingAdjustment || 0,
                roundingPrecision
            }
        );

        return {
            items: calculatedItems,
            totals: {
                subtotal: totals.subtotal,
                discountTotal: totals.totalDiscountAmount,
                taxableAmount: totals.taxableAmount,
                taxTotal: totals.taxTotal,
                grandTotal: totals.grandTotal
            },
            ...totals
        };
    }

    // ═══════════════════════════════════════════════════════════
    // DISCOUNT VALIDATION
    // ═══════════════════════════════════════════════════════════

    /**
     * Validate discount against limits
     * @param {number} discountPercent - Discount percentage
     * @param {number} maxAllowed - Maximum allowed percentage
     * @param {number} amount - Quote amount
     * @returns {object} - Validation result
     */
    static validateDiscount(discountPercent, maxAllowed, amount = 0) {
        const result = {
            valid: true,
            requiresApproval: false,
            message: null
        };

        if (discountPercent > 100) {
            result.valid = false;
            result.message = 'Discount cannot exceed 100%';
            return result;
        }

        if (discountPercent > maxAllowed) {
            result.valid = true;
            result.requiresApproval = true;
            result.message = `Discount of ${discountPercent}% exceeds limit of ${maxAllowed}%. Approval required.`;
        }

        return result;
    }

    /**
     * Validate pricing against minimum margin
     * @param {number} unitPrice - Unit price
     * @param {number} costPrice - Cost price
     * @param {number} minimumMarginPercent - Minimum margin percentage
     * @returns {object} - Validation result
     */
    static validateMargin(unitPrice, costPrice, minimumMarginPercent = 0) {
        const result = {
            valid: true,
            requiresApproval: false,
            belowCost: false,
            marginPercent: 0,
            message: null
        };

        if (!costPrice || costPrice <= 0) {
            return result;
        }

        if (unitPrice < costPrice) {
            result.valid = false;
            result.belowCost = true;
            result.requiresApproval = true;
            result.message = 'Price is below cost';
        }

        const marginPercent = ((unitPrice - costPrice) / unitPrice) * 100;
        result.marginPercent = Math.round(marginPercent * 100) / 100;

        if (marginPercent < minimumMarginPercent) {
            result.valid = true;
            result.requiresApproval = true;
            result.message = `Margin of ${result.marginPercent}% is below minimum of ${minimumMarginPercent}%`;
        }

        return result;
    }

    // ═══════════════════════════════════════════════════════════
    // PAYMENT CALCULATIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * Calculate payment terms
     * @param {number} grandTotal - Total amount
     * @param {object} terms - Payment terms configuration
     * @returns {object} - Payment breakdown
     */
    static calculatePaymentTerms(grandTotal, terms = {}) {
        const {
            type = 'net_30',
            customDays = 30,
            depositRequired = false,
            depositPercent = 0,
            depositAmount = 0
        } = terms;

        // Calculate due date
        let dueDays = 30;
        switch (type) {
            case 'immediate': dueDays = 0; break;
            case 'net_15': dueDays = 15; break;
            case 'net_30': dueDays = 30; break;
            case 'net_60': dueDays = 60; break;
            case 'custom': dueDays = customDays; break;
        }

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + dueDays);

        // Calculate deposit
        let deposit = 0;
        if (depositRequired) {
            if (depositPercent > 0) {
                deposit = Math.round((grandTotal * depositPercent / 100) * 100) / 100;
            } else if (depositAmount > 0) {
                deposit = depositAmount;
            }
        }

        const balance = Math.round((grandTotal - deposit) * 100) / 100;

        return {
            type,
            dueDays,
            dueDate,
            depositRequired,
            depositPercent,
            depositAmount: deposit,
            balanceAmount: balance,
            grandTotal
        };
    }

    // ═══════════════════════════════════════════════════════════
    // RECALCULATION
    // ═══════════════════════════════════════════════════════════

    /**
     * Recalculate existing quote/order
     * @param {ObjectId} quoteId - Quote ID
     * @param {object} firmQuery - Firm query for isolation
     * @returns {object} - Recalculated quote
     */
    static async recalculateQuote(quoteId, firmQuery) {
        const Quote = mongoose.model('Quote');
        const quote = await Quote.findOne({ _id: quoteId, ...firmQuery });

        if (!quote) {
            throw new Error('Quote not found');
        }

        // Recalculate using instance method
        quote.calculateTotals();
        await quote.save();

        return quote;
    }

    /**
     * Apply price list to quote
     * @param {object} quoteData - Quote data
     * @param {ObjectId} priceListId - Price list ID
     * @param {object} firmQuery - Firm query
     * @returns {object} - Quote with updated prices
     */
    static async applyPriceList(quoteData, priceListId, firmQuery) {
        // This would look up prices from a PriceList collection
        // For now, return as-is
        return quoteData;
    }

    // ═══════════════════════════════════════════════════════════
    // SIMULATION
    // ═══════════════════════════════════════════════════════════

    /**
     * Simulate discount impact
     * @param {Array} items - Line items
     * @param {number} discountPercent - Proposed discount
     * @returns {object} - Simulation results
     */
    static simulateDiscount(items, discountPercent) {
        const originalTotals = this.calculateTotals(items, {});
        const discountedTotals = this.calculateTotals(items, {
            type: 'percentage',
            value: discountPercent
        });

        return {
            original: originalTotals,
            discounted: discountedTotals,
            savings: {
                amount: originalTotals.grandTotal - discountedTotals.grandTotal,
                percent: discountPercent
            },
            marginImpact: {
                originalMargin: originalTotals.marginPercent,
                newMargin: discountedTotals.marginPercent,
                reduction: originalTotals.marginPercent - discountedTotals.marginPercent
            }
        };
    }

    /**
     * Suggest optimal discount
     * @param {number} currentTotal - Current total
     * @param {number} targetPrice - Target price
     * @param {number} costTotal - Total cost
     * @param {number} minimumMargin - Minimum margin percent
     * @returns {object} - Discount suggestion
     */
    static suggestDiscount(currentTotal, targetPrice, costTotal, minimumMargin = 10) {
        const maxDiscountAmount = currentTotal - (costTotal * (1 + minimumMargin / 100));
        const maxDiscountPercent = Math.round((maxDiscountAmount / currentTotal) * 100);

        const requestedDiscountAmount = currentTotal - targetPrice;
        const requestedDiscountPercent = Math.round((requestedDiscountAmount / currentTotal) * 100);

        const canMeetTarget = targetPrice >= (costTotal * (1 + minimumMargin / 100));

        return {
            requestedPrice: targetPrice,
            requestedDiscount: {
                amount: requestedDiscountAmount,
                percent: requestedDiscountPercent
            },
            maximumDiscount: {
                amount: maxDiscountAmount,
                percent: maxDiscountPercent
            },
            canMeetTarget,
            suggestedPrice: canMeetTarget ? targetPrice : Math.round(costTotal * (1 + minimumMargin / 100)),
            message: canMeetTarget
                ? `Discount of ${requestedDiscountPercent}% is within margin limits`
                : `Maximum discount is ${maxDiscountPercent}% to maintain ${minimumMargin}% margin`
        };
    }
}

module.exports = QuoteCalculationService;
