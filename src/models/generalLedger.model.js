const mongoose = require("mongoose");

/**
 * General Ledger Model
 *
 * The single source of truth for all financial transactions.
 * Every financial event in the system creates entries here.
 * Uses double-entry bookkeeping (every entry has a debit and credit account).
 */
const generalLedgerSchema = new mongoose.Schema(
  {
    // Auto-generated entry number (GLE-YYYYMM-00001)
    entryNumber: {
      type: String,
      unique: true,
      required: true
    },

    // Transaction date
    transactionDate: {
      type: Date,
      required: [true, "Transaction date is required"],
      index: true
    },

    // Description (English)
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"]
    },

    // Description (Arabic)
    descriptionAr: {
      type: String,
      trim: true,
      maxlength: [500, "Arabic description cannot exceed 500 characters"]
    },

    // Debit account
    debitAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "Debit account is required"]
    },

    // Credit account
    creditAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "Credit account is required"]
    },

    // Amount in halalas (smallest unit)
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"]
    },

    // Reference to source document (polymorphic)
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "referenceModel"
    },

    // Reference model type
    referenceModel: {
      type: String,
      enum: [
        "Invoice",
        "Payment",
        "Bill",
        "BillPayment",
        "Expense",
        "Retainer",
        "TrustTransaction",
        "JournalEntry",
        "BankTransaction",
        "Payroll"
      ]
    },

    // Human-readable reference number
    referenceNumber: {
      type: String,
      trim: true
    },

    // Job costing: Case ID
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
      index: true
    },

    // Client ID for filtering
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      index: true
    },

    // Lawyer/User ID for filtering
    lawyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true
    },

    // Entry status
    status: {
      type: String,
      enum: ["draft", "posted", "void"],
      default: "draft",
      index: true
    },

    // Void information
    voidedAt: {
      type: Date
    },

    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    voidReason: {
      type: String,
      trim: true
    },

    // ID of reversing entry (when voided)
    reversingEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GeneralLedger"
    },

    // Metadata snapshot (stores original document data)
    meta: {
      type: mongoose.Schema.Types.Mixed
    },

    // Additional notes
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"]
    },

    // Audit trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    postedAt: {
      type: Date
    },

    // Fiscal period (for year-end closing)
    fiscalYear: {
      type: Number
    },

    fiscalMonth: {
      type: Number,
      min: 1,
      max: 12
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for common queries
generalLedgerSchema.index({ entryNumber: 1 }, { unique: true });
generalLedgerSchema.index({ transactionDate: 1, status: 1 });
generalLedgerSchema.index({ caseId: 1, status: 1 });
generalLedgerSchema.index({ referenceModel: 1, referenceId: 1 });
generalLedgerSchema.index({ debitAccountId: 1 });
generalLedgerSchema.index({ creditAccountId: 1 });
generalLedgerSchema.index({ clientId: 1 });
generalLedgerSchema.index({ fiscalYear: 1, fiscalMonth: 1, status: 1 });

// Compound indexes for reporting
generalLedgerSchema.index({
  transactionDate: 1,
  debitAccountId: 1,
  status: 1
});
generalLedgerSchema.index({
  transactionDate: 1,
  creditAccountId: 1,
  status: 1
});

/**
 * Pre-save middleware: Auto-generate entry number and set fiscal period
 */
generalLedgerSchema.pre("save", async function (next) {
  try {
    // Generate entry number for new documents
    if (this.isNew && !this.entryNumber) {
      this.entryNumber = await generateEntryNumber();
    }

    // Set posted timestamp when status changes to posted
    if (this.isModified("status") && this.status === "posted" && !this.postedAt) {
      this.postedAt = new Date();
    }

    // Set fiscal year and month
    if (this.transactionDate) {
      const date = new Date(this.transactionDate);
      this.fiscalYear = date.getFullYear();
      this.fiscalMonth = date.getMonth() + 1;
    }

    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Pre-save middleware: Block editing of posted entries
 */
generalLedgerSchema.pre("save", function (next) {
  if (!this.isNew && this.isModified()) {
    // Check if this was already posted
    if (
      this._original &&
      this._original.status === "posted" &&
      this.status !== "void"
    ) {
      // Only allow status change to void
      const modifiedPaths = this.modifiedPaths();
      const allowedPaths = ["status", "voidedAt", "voidedBy", "voidReason", "reversingEntryId"];
      const invalidModifications = modifiedPaths.filter(
        (path) => !allowedPaths.includes(path)
      );

      if (invalidModifications.length > 0) {
        const error = new Error("Cannot modify posted general ledger entry");
        error.statusCode = 400;
        return next(error);
      }
    }
  }
  next();
});

/**
 * Post-init: Store original values for comparison
 */
generalLedgerSchema.post("init", function () {
  this._original = this.toObject();
});

/**
 * Helper: Generate entry number
 */
async function generateEntryNumber() {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `GLE-${yearMonth}-`;

  const lastEntry = await mongoose
    .model("GeneralLedger")
    .findOne({ entryNumber: { $regex: `^${prefix}` } })
    .sort({ entryNumber: -1 });

  let sequence = 1;
  if (lastEntry) {
    const lastSequence = parseInt(lastEntry.entryNumber.split("-")[2], 10);
    sequence = lastSequence + 1;
  }

  return `${prefix}${String(sequence).padStart(5, "0")}`;
}

/**
 * Static: Post a transaction to the general ledger
 * @param {Object} data - Transaction data
 * @param {Session} session - MongoDB session for transactions
 */
generalLedgerSchema.statics.postTransaction = async function (data, session = null) {
  const {
    transactionDate,
    description,
    descriptionAr,
    debitAccountId,
    creditAccountId,
    amount,
    referenceId,
    referenceModel,
    referenceNumber,
    caseId,
    clientId,
    lawyerId,
    meta,
    notes,
    createdBy
  } = data;

  // Validate accounts exist
  const Account = mongoose.model("Account");
  const [debitAccount, creditAccount] = await Promise.all([
    Account.findById(debitAccountId),
    Account.findById(creditAccountId)
  ]);

  if (!debitAccount) {
    throw new Error(`Debit account not found: ${debitAccountId}`);
  }
  if (!creditAccount) {
    throw new Error(`Credit account not found: ${creditAccountId}`);
  }

  if (!debitAccount.isActive) {
    throw new Error(`Debit account is inactive: ${debitAccount.code}`);
  }
  if (!creditAccount.isActive) {
    throw new Error(`Credit account is inactive: ${creditAccount.code}`);
  }

  // Validate amount
  if (!amount || amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  const entryNumber = await generateEntryNumber();

  const entry = new this({
    entryNumber,
    transactionDate: transactionDate || new Date(),
    description,
    descriptionAr,
    debitAccountId,
    creditAccountId,
    amount: Math.round(amount), // Ensure integer
    referenceId,
    referenceModel,
    referenceNumber,
    caseId,
    clientId,
    lawyerId,
    meta,
    notes,
    createdBy,
    status: "posted",
    postedBy: createdBy,
    postedAt: new Date()
  });

  const options = session ? { session } : {};
  await entry.save(options);

  return entry;
};

/**
 * Static: Void a transaction (creates reversing entry)
 * @param {ObjectId} entryId - Entry to void
 * @param {String} reason - Reason for voiding
 * @param {ObjectId} userId - User performing the void
 * @param {Session} session - MongoDB session for transactions
 */
generalLedgerSchema.statics.voidTransaction = async function (
  entryId,
  reason,
  userId,
  session = null
) {
  const options = session ? { session } : {};

  const entry = await this.findById(entryId);
  if (!entry) {
    throw new Error("General ledger entry not found");
  }

  if (entry.status !== "posted") {
    throw new Error("Can only void posted entries");
  }

  if (entry.status === "void") {
    throw new Error("Entry is already voided");
  }

  // Create reversing entry (swap debit and credit)
  const reversingEntryNumber = await generateEntryNumber();
  const reversingEntry = new this({
    entryNumber: reversingEntryNumber,
    transactionDate: new Date(),
    description: `VOID: ${entry.description}`,
    descriptionAr: entry.descriptionAr ? `إلغاء: ${entry.descriptionAr}` : null,
    debitAccountId: entry.creditAccountId, // Swapped
    creditAccountId: entry.debitAccountId, // Swapped
    amount: entry.amount,
    referenceId: entry.referenceId,
    referenceModel: entry.referenceModel,
    referenceNumber: entry.referenceNumber,
    caseId: entry.caseId,
    clientId: entry.clientId,
    lawyerId: entry.lawyerId,
    meta: { voidedEntry: entry._id, originalMeta: entry.meta },
    notes: `Reversing entry for ${entry.entryNumber}: ${reason}`,
    createdBy: userId,
    status: "posted",
    postedBy: userId,
    postedAt: new Date()
  });

  await reversingEntry.save(options);

  // Update original entry
  entry.status = "void";
  entry.voidedAt = new Date();
  entry.voidedBy = userId;
  entry.voidReason = reason;
  entry.reversingEntryId = reversingEntry._id;
  await entry.save(options);

  return { voidedEntry: entry, reversingEntry };
};

/**
 * Static: Get account balance from GL entries
 */
generalLedgerSchema.statics.getAccountBalance = async function (
  accountId,
  upToDate = null,
  caseId = null
) {
  const Account = mongoose.model("Account");
  const account = await Account.findById(accountId);
  if (!account) {
    throw new Error("Account not found");
  }

  const matchStage = {
    status: "posted"
  };

  if (upToDate) {
    matchStage.transactionDate = { $lte: new Date(upToDate) };
  }

  if (caseId) {
    matchStage.caseId = mongoose.Types.ObjectId.createFromHexString(caseId.toString());
  }

  // Aggregate debits
  const debitMatch = { ...matchStage, debitAccountId: account._id };
  const debitResult = await this.aggregate([
    { $match: debitMatch },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const totalDebits = debitResult[0]?.total || 0;

  // Aggregate credits
  const creditMatch = { ...matchStage, creditAccountId: account._id };
  const creditResult = await this.aggregate([
    { $match: creditMatch },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const totalCredits = creditResult[0]?.total || 0;

  // Calculate balance based on normal balance
  let balance;
  if (account.normalBalance === "debit") {
    balance = totalDebits - totalCredits;
  } else {
    balance = totalCredits - totalDebits;
  }

  return {
    accountId: account._id,
    accountCode: account.code,
    accountName: account.name,
    normalBalance: account.normalBalance,
    totalDebits,
    totalCredits,
    balance,
    asOfDate: upToDate || new Date()
  };
};

/**
 * Static: Get trial balance
 */
generalLedgerSchema.statics.getTrialBalance = async function (asOfDate = null) {
  const Account = mongoose.model("Account");
  const accounts = await Account.find({ isActive: true }).sort({ code: 1 });

  const balances = [];
  let totalDebits = 0;
  let totalCredits = 0;

  for (const account of accounts) {
    const result = await this.getAccountBalance(account._id, asOfDate);

    // Convert balance to debit/credit columns
    let debit = 0;
    let credit = 0;

    if (account.normalBalance === "debit") {
      if (result.balance >= 0) {
        debit = result.balance;
      } else {
        credit = Math.abs(result.balance);
      }
    } else {
      if (result.balance >= 0) {
        credit = result.balance;
      } else {
        debit = Math.abs(result.balance);
      }
    }

    // Only include accounts with non-zero balance
    if (debit !== 0 || credit !== 0) {
      balances.push({
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        debit,
        credit
      });

      totalDebits += debit;
      totalCredits += credit;
    }
  }

  return {
    balances,
    totalDebits,
    totalCredits,
    isBalanced: totalDebits === totalCredits,
    asOfDate: asOfDate || new Date()
  };
};

/**
 * Static: Check if entry exists for reference
 */
generalLedgerSchema.statics.hasEntryForReference = async function (
  referenceId,
  referenceModel
) {
  const count = await this.countDocuments({
    referenceId,
    referenceModel,
    status: { $ne: "void" }
  });
  return count > 0;
};

const GeneralLedger = mongoose.model("GeneralLedger", generalLedgerSchema);

module.exports = GeneralLedger;
