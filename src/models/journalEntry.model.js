const mongoose = require("mongoose");

/**
 * Journal Entry Line Schema
 *
 * Each line in a journal entry represents either a debit or credit to an account
 */
const journalEntryLineSchema = new mongoose.Schema(
  {
    // Account being debited/credited
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "Account is required"]
    },

    // Debit amount (in halalas)
    debit: {
      type: Number,
      default: 0,
      min: [0, "Debit cannot be negative"]
    },

    // Credit amount (in halalas)
    credit: {
      type: Number,
      default: 0,
      min: [0, "Credit cannot be negative"]
    },

    // Line description
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Line description cannot exceed 200 characters"]
    },

    // Job costing: Case ID for this line
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case"
    },

    // Additional notes
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"]
    }
  },
  { _id: true }
);

/**
 * Journal Entry Model
 *
 * Manual accounting entries for adjustments, corrections, and complex transactions.
 * Each entry must balance (total debits = total credits) before posting.
 */
const journalEntrySchema = new mongoose.Schema(
  {
    // Auto-generated entry number (JE-YYYYMM-00001)
    entryNumber: {
      type: String,
      unique: true,
      required: true
    },

    // Entry date
    date: {
      type: Date,
      required: [true, "Entry date is required"],
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

    // Entry lines (minimum 2 required)
    lines: {
      type: [journalEntryLineSchema],
      validate: {
        validator: function (lines) {
          return lines && lines.length >= 2;
        },
        message: "Journal entry must have at least 2 lines"
      }
    },

    // Entry status
    status: {
      type: String,
      enum: ["draft", "posted", "void"],
      default: "draft",
      index: true
    },

    // Entry type for categorization
    entryType: {
      type: String,
      enum: [
        "adjustment",
        "correction",
        "accrual",
        "reversal",
        "closing",
        "opening",
        "transfer",
        "other"
      ],
      default: "other"
    },

    // Posted information
    postedAt: {
      type: Date
    },

    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    // GL entries created when posted
    glEntries: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GeneralLedger"
      }
    ],

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

    // Additional notes
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"]
    },

    // Attachments (documents, receipts, etc.)
    attachments: [
      {
        name: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now }
      }
    ],

    // Recurring entry reference
    recurringTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecurringTransaction"
    },

    // Audit trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
journalEntrySchema.index({ entryNumber: 1 }, { unique: true });
journalEntrySchema.index({ date: 1, status: 1 });
journalEntrySchema.index({ status: 1 });
journalEntrySchema.index({ entryType: 1 });
journalEntrySchema.index({ createdBy: 1 });

// Virtual: Total debits
journalEntrySchema.virtual("totalDebit").get(function () {
  if (!this.lines || this.lines.length === 0) return 0;
  return this.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
});

// Virtual: Total credits
journalEntrySchema.virtual("totalCredit").get(function () {
  if (!this.lines || this.lines.length === 0) return 0;
  return this.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
});

// Virtual: Is balanced
journalEntrySchema.virtual("isBalanced").get(function () {
  return this.totalDebit === this.totalCredit;
});

// Virtual: Difference
journalEntrySchema.virtual("difference").get(function () {
  return Math.abs(this.totalDebit - this.totalCredit);
});

/**
 * Helper: Generate entry number
 */
async function generateEntryNumber() {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `JE-${yearMonth}-`;

  const lastEntry = await mongoose
    .model("JournalEntry")
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
 * Pre-save middleware: Auto-generate entry number
 */
journalEntrySchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.entryNumber) {
      this.entryNumber = await generateEntryNumber();
    }
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Pre-save middleware: Validate lines have debit XOR credit
 */
journalEntrySchema.pre("save", function (next) {
  if (this.lines && this.lines.length > 0) {
    for (const line of this.lines) {
      const hasDebit = line.debit && line.debit > 0;
      const hasCredit = line.credit && line.credit > 0;

      if (hasDebit && hasCredit) {
        const error = new Error(
          "Each line must have either debit OR credit, not both"
        );
        error.statusCode = 400;
        return next(error);
      }

      if (!hasDebit && !hasCredit) {
        const error = new Error("Each line must have either a debit or credit amount");
        error.statusCode = 400;
        return next(error);
      }
    }
  }
  next();
});

/**
 * Pre-save middleware: Block editing posted entries
 */
journalEntrySchema.pre("save", function (next) {
  if (!this.isNew && this._original) {
    if (this._original.status === "posted" && this.status !== "void") {
      // Only allow status change to void
      const modifiedPaths = this.modifiedPaths();
      const allowedPaths = ["status", "voidedAt", "voidedBy", "voidReason", "updatedBy"];
      const invalidModifications = modifiedPaths.filter(
        (path) => !allowedPaths.includes(path)
      );

      if (invalidModifications.length > 0) {
        const error = new Error("Cannot modify posted journal entry");
        error.statusCode = 400;
        return next(error);
      }
    }
  }
  next();
});

/**
 * Post-init: Store original values
 */
journalEntrySchema.post("init", function () {
  this._original = this.toObject();
});

/**
 * Instance method: Post to General Ledger
 * @param {ObjectId} userId - User posting the entry
 * @param {Session} session - MongoDB session for transactions
 */
journalEntrySchema.methods.post = async function (userId, session = null) {
  if (this.status !== "draft") {
    throw new Error("Only draft entries can be posted");
  }

  if (!this.isBalanced) {
    throw new Error(
      `Entry is not balanced. Debits: ${this.totalDebit}, Credits: ${this.totalCredit}`
    );
  }

  const GeneralLedger = mongoose.model("GeneralLedger");
  const options = session ? { session } : {};
  const glEntries = [];

  // Group lines by debit/credit
  const debitLines = this.lines.filter((l) => l.debit > 0);
  const creditLines = this.lines.filter((l) => l.credit > 0);

  // Create GL entries for each debit-credit pair
  // For complex entries with multiple debits and credits,
  // we create individual GL entries for each pairing
  for (const debitLine of debitLines) {
    for (const creditLine of creditLines) {
      // Calculate proportional amount
      const proportion = creditLine.credit / this.totalCredit;
      const amount = Math.round(debitLine.debit * proportion);

      if (amount > 0) {
        const glEntry = await GeneralLedger.postTransaction(
          {
            transactionDate: this.date,
            description: `${this.description}${debitLine.description ? ` - ${debitLine.description}` : ""}`,
            descriptionAr: this.descriptionAr,
            debitAccountId: debitLine.accountId,
            creditAccountId: creditLine.accountId,
            amount,
            referenceId: this._id,
            referenceModel: "JournalEntry",
            referenceNumber: this.entryNumber,
            caseId: debitLine.caseId || creditLine.caseId,
            meta: {
              journalEntryNumber: this.entryNumber,
              debitLine: debitLine.toObject(),
              creditLine: creditLine.toObject()
            },
            notes: this.notes,
            createdBy: userId
          },
          session
        );

        glEntries.push(glEntry._id);
      }
    }
  }

  // Update journal entry status
  this.status = "posted";
  this.postedAt = new Date();
  this.postedBy = userId;
  this.glEntries = glEntries;

  await this.save(options);

  return this;
};

/**
 * Instance method: Void the journal entry
 * @param {String} reason - Reason for voiding
 * @param {ObjectId} userId - User voiding the entry
 * @param {Session} session - MongoDB session for transactions
 */
journalEntrySchema.methods.void = async function (reason, userId, session = null) {
  if (this.status !== "posted") {
    throw new Error("Only posted entries can be voided");
  }

  const GeneralLedger = mongoose.model("GeneralLedger");
  const options = session ? { session } : {};

  // Void all related GL entries
  for (const glEntryId of this.glEntries) {
    await GeneralLedger.voidTransaction(glEntryId, reason, userId, session);
  }

  // Update journal entry status
  this.status = "void";
  this.voidedAt = new Date();
  this.voidedBy = userId;
  this.voidReason = reason;

  await this.save(options);

  return this;
};

/**
 * Instance method: Validate entry can be posted
 */
journalEntrySchema.methods.validateEntry = function () {
  const errors = [];

  if (this.status !== "draft") {
    errors.push("Only draft entries can be validated");
  }

  if (!this.lines || this.lines.length < 2) {
    errors.push("Entry must have at least 2 lines");
  }

  if (!this.isBalanced) {
    errors.push(
      `Entry is not balanced. Debits: ${this.totalDebit}, Credits: ${this.totalCredit}`
    );
  }

  // Validate each line
  if (this.lines) {
    this.lines.forEach((line, index) => {
      if (!line.accountId) {
        errors.push(`Line ${index + 1}: Account is required`);
      }

      const hasDebit = line.debit && line.debit > 0;
      const hasCredit = line.credit && line.credit > 0;

      if (hasDebit && hasCredit) {
        errors.push(`Line ${index + 1}: Cannot have both debit and credit`);
      }

      if (!hasDebit && !hasCredit) {
        errors.push(`Line ${index + 1}: Must have either debit or credit`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Static: Create a simple two-line entry
 */
journalEntrySchema.statics.createSimpleEntry = async function (data, session = null) {
  const {
    date,
    description,
    descriptionAr,
    debitAccountId,
    creditAccountId,
    amount,
    caseId,
    notes,
    entryType,
    createdBy
  } = data;

  const entry = new this({
    date,
    description,
    descriptionAr,
    entryType: entryType || "other",
    notes,
    createdBy,
    lines: [
      {
        accountId: debitAccountId,
        debit: amount,
        credit: 0,
        caseId
      },
      {
        accountId: creditAccountId,
        debit: 0,
        credit: amount,
        caseId
      }
    ]
  });

  const options = session ? { session } : {};
  await entry.save(options);

  return entry;
};

const JournalEntry = mongoose.model("JournalEntry", journalEntrySchema);

module.exports = JournalEntry;
