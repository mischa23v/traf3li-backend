const mongoose = require("mongoose");

/**
 * Chart of Accounts Model
 *
 * Implements a hierarchical chart of accounts for double-entry bookkeeping.
 * All financial transactions flow through these accounts via the GeneralLedger.
 */
const accountSchema = new mongoose.Schema(
  {
    // Account code (e.g., "1101" for Cash on Hand)
    code: {
      type: String,
      required: [true, "Account code is required"],
      unique: true,
      trim: true,
      match: [/^\d+$/, "Account code must be numeric"]
    },

    // Account name (English)
    name: {
      type: String,
      required: [true, "Account name is required"],
      trim: true,
      maxlength: [100, "Account name cannot exceed 100 characters"]
    },

    // Account name (Arabic)
    nameAr: {
      type: String,
      trim: true,
      maxlength: [100, "Arabic account name cannot exceed 100 characters"]
    },

    // Account type (maps to financial statement sections)
    type: {
      type: String,
      required: [true, "Account type is required"],
      enum: {
        values: ["Asset", "Liability", "Equity", "Income", "Expense"],
        message: "Invalid account type"
      }
    },

    // Account subtype for further classification
    subType: {
      type: String,
      enum: {
        values: [
          // Asset subtypes
          "Current Asset",
          "Fixed Asset",
          "Other Asset",
          // Liability subtypes
          "Current Liability",
          "Long-term Liability",
          "Other Liability",
          // Equity subtypes
          "Owner's Equity",
          "Retained Earnings",
          // Income subtypes
          "Operating Income",
          "Other Income",
          // Expense subtypes
          "Cost of Goods Sold",
          "Operating Expense",
          "Other Expense"
        ],
        message: "Invalid account subtype"
      }
    },

    // Parent account for hierarchy
    parentAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null
    },

    // System account (cannot be deleted)
    isSystem: {
      type: Boolean,
      default: false
    },

    // Account active status
    isActive: {
      type: Boolean,
      default: true
    },

    // Normal balance type (automatically set based on type)
    normalBalance: {
      type: String,
      enum: ["debit", "credit"],
      required: true
    },

    // Hierarchy level (0 = root, 1 = first child, etc.)
    level: {
      type: Number,
      default: 0,
      min: 0
    },

    // Path for hierarchy queries (e.g., "/parentId/grandparentId/")
    path: {
      type: String,
      default: ""
    },

    // Description of the account
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"]
    },

    // Description in Arabic
    descriptionAr: {
      type: String,
      trim: true,
      maxlength: [500, "Arabic description cannot exceed 500 characters"]
    },

    // Created by user
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    // Updated by user
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
accountSchema.index({ code: 1 }, { unique: true });
accountSchema.index({ type: 1, isActive: 1 });
accountSchema.index({ parentAccountId: 1, isActive: 1 });
accountSchema.index({ path: 1 });
accountSchema.index({ isSystem: 1 });

// Virtual: Get children accounts
accountSchema.virtual("children", {
  ref: "Account",
  localField: "_id",
  foreignField: "parentAccountId"
});

/**
 * Pre-save middleware: Calculate level, path, and normalBalance
 */
accountSchema.pre("save", async function (next) {
  try {
    // Set normalBalance based on account type
    if (this.isModified("type")) {
      switch (this.type) {
        case "Asset":
        case "Expense":
          this.normalBalance = "debit";
          break;
        case "Liability":
        case "Equity":
        case "Income":
          this.normalBalance = "credit";
          break;
      }
    }

    // Calculate level and path from parent
    if (this.isModified("parentAccountId")) {
      if (this.parentAccountId) {
        const parent = await mongoose.model("Account").findById(this.parentAccountId);
        if (parent) {
          this.level = parent.level + 1;
          this.path = parent.path + parent._id.toString() + "/";
        } else {
          this.level = 0;
          this.path = "";
        }
      } else {
        this.level = 0;
        this.path = "";
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Pre-delete middleware: Validate deletion rules
 */
accountSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      // Block deletion if system account
      if (this.isSystem) {
        const error = new Error("Cannot delete system account");
        error.statusCode = 400;
        return next(error);
      }

      // Block deletion if has children
      const childCount = await mongoose
        .model("Account")
        .countDocuments({ parentAccountId: this._id });
      if (childCount > 0) {
        const error = new Error("Cannot delete account with child accounts");
        error.statusCode = 400;
        return next(error);
      }

      // Block deletion if has GL transactions
      const glCount = await mongoose.model("GeneralLedger").countDocuments({
        $or: [{ debitAccountId: this._id }, { creditAccountId: this._id }],
        status: { $ne: "void" }
      });
      if (glCount > 0) {
        const error = new Error(
          "Cannot delete account with general ledger transactions"
        );
        error.statusCode = 400;
        return next(error);
      }

      next();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Static: Get account hierarchy as nested tree
 */
accountSchema.statics.getHierarchy = async function (options = {}) {
  const { type, isActive = true } = options;

  const query = {};
  if (type) query.type = type;
  if (isActive !== null) query.isActive = isActive;

  const accounts = await this.find(query).sort({ code: 1 }).lean();

  // Build tree structure
  const accountMap = {};
  const rootAccounts = [];

  // First pass: create map
  accounts.forEach((account) => {
    accountMap[account._id.toString()] = { ...account, children: [] };
  });

  // Second pass: build tree
  accounts.forEach((account) => {
    const node = accountMap[account._id.toString()];
    if (account.parentAccountId) {
      const parent = accountMap[account.parentAccountId.toString()];
      if (parent) {
        parent.children.push(node);
      } else {
        rootAccounts.push(node);
      }
    } else {
      rootAccounts.push(node);
    }
  });

  return rootAccounts;
};

/**
 * Static: Get account balance from GeneralLedger
 * @param {ObjectId} accountId - Account ID
 * @param {Date} upToDate - Calculate balance up to this date
 * @param {ObjectId} caseId - Optional case ID for filtering
 */
accountSchema.statics.getAccountBalance = async function (
  accountId,
  upToDate = null,
  caseId = null
) {
  const account = await this.findById(accountId);
  if (!account) {
    throw new Error("Account not found");
  }

  const GeneralLedger = mongoose.model("GeneralLedger");

  const matchStage = {
    status: "posted"
  };

  if (upToDate) {
    matchStage.transactionDate = { $lte: new Date(upToDate) };
  }

  if (caseId) {
    matchStage.caseId = mongoose.Types.ObjectId.createFromHexString(caseId.toString());
  }

  // Get total debits
  const debitMatch = { ...matchStage, debitAccountId: account._id };
  const debitResult = await GeneralLedger.aggregate([
    { $match: debitMatch },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const totalDebits = debitResult[0]?.total || 0;

  // Get total credits
  const creditMatch = { ...matchStage, creditAccountId: account._id };
  const creditResult = await GeneralLedger.aggregate([
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
 * Static: Get multiple account balances
 */
accountSchema.statics.getAccountBalances = async function (
  accountIds,
  upToDate = null,
  caseId = null
) {
  const balances = await Promise.all(
    accountIds.map((id) => this.getAccountBalance(id, upToDate, caseId))
  );
  return balances;
};

/**
 * Static: Find account by code
 */
accountSchema.statics.findByCode = function (code) {
  return this.findOne({ code });
};

/**
 * Instance: Check if account can be deleted
 */
accountSchema.methods.canDelete = async function () {
  if (this.isSystem) {
    return { canDelete: false, reason: "System account cannot be deleted" };
  }

  const childCount = await mongoose
    .model("Account")
    .countDocuments({ parentAccountId: this._id });
  if (childCount > 0) {
    return { canDelete: false, reason: "Account has child accounts" };
  }

  const glCount = await mongoose.model("GeneralLedger").countDocuments({
    $or: [{ debitAccountId: this._id }, { creditAccountId: this._id }],
    status: { $ne: "void" }
  });
  if (glCount > 0) {
    return { canDelete: false, reason: "Account has transactions" };
  }

  return { canDelete: true };
};

const Account = mongoose.model("Account", accountSchema);

module.exports = Account;
