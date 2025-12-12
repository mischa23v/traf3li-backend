# Finance Model Calculation Review

## Invoice model
- **Strengths**: The `calculateTotals` method recomputes subtotal, discounts, taxable amount, VAT, total, and line-level totals on every save, so derived fields stay synchronized with the latest items before persistence (`invoiceSchema.pre('save')`). Payment posting also updates `amountPaid`, `balanceDue`, history, and GL entries in one method for traceability.
- **Weaknesses / risks**:
  - Totals and VAT are calculated with plain JavaScript numbers in SAR (`totalAmount`, `balanceDue`), but the payment flow converts incoming payments to halalas and uses `addAmounts` from the currency helper. Subtracting halala-based `amountPaid` from SAR totals mixes units and can leave tiny residual balances even when invoices are fully paid.
  - Discounts and taxes are not rounded to the smallest currency unit after percentage math, so totals can retain floating-point fractions that never clear to zero when combined with halala-based payments.
- **Recommendations**:
  - Standardize invoice arithmetic on halalas: convert line-item prices, discounts, VAT, `depositAmount`, `applyFromRetainer`, and the derived totals to integers with the currency utility, and convert back to SAR only when presenting to the client.
  - After percentage discounts and VAT calculations, round to halalas before computing `balanceDue` so partial pennies do not accumulate.

## Expense model
- **Strengths**: The pre-save hook automatically assigns `expenseId`/`expenseNumber`, recomputes `totalAmount`, and derives billable amounts with markup so downstream services receive consistent values without duplicate logic. Travel metadata (mileage, per diem amounts, and travel days) is also recalculated to stay in sync with the entered details.
- **Weaknesses / risks**:
  - Amount fields are described as “halalas”, but the calculations treat them as raw numbers. Percentage markups and mileage/per-diem multiplications can introduce decimals that are never rounded, so stored totals may not be whole halalas.
  - Markup and total calculations bypass the shared currency utility, so billable amounts and tax-inclusive totals could diverge from ledger/payment rounding rules used elsewhere.
- **Recommendations**:
  - Enforce integer halalas at the schema boundary (e.g., convert inputs with the currency helper) and round results of markup/per-diem/mileage math before persisting `totalAmount` and `billableAmount`.
  - Consider reusing the currency helper for these calculations so expenses align with the same rounding used for invoices and payments.

## Expense claim model
- **Strengths**: The pre-save hook tallies line-item subtotals, VAT, grand total, billable vs. non-billable splits, category aggregations, missing receipts, travel totals, mileage totals, corporate card reconciliation summaries, and advance settlements. This keeps summary fields aligned with the underlying line items and supporting data.
- **Weaknesses / risks**:
  - Exchange-rate conversion multiplies each line’s `totalAmount` by `exchangeRate` without rounding, so converted SAR amounts can include floating-point pennies that feed into `totals.grandTotal` and reporting.
  - `totals.pendingAmount` only subtracts `paidAmount` from the grand total; it ignores advances, approvals, reimbursements, or adjustments stored elsewhere in the document, so it can overstate what is actually owed.
- **Recommendations**:
  - Round converted SAR amounts to halalas before rolling up totals, and store both source-currency and SAR values explicitly to avoid drift.
  - Expand `pendingAmount` to account for advances, approved amounts, reimbursements, and adjustments so the outstanding figure matches workflow states.
