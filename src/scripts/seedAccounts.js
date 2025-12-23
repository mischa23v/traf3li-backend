/**
 * Seed Default Chart of Accounts
 *
 * Creates the standard chart of accounts for a law firm.
 * Script is idempotent - running multiple times will not create duplicates.
 *
 * Usage: npm run seed:accounts
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Account = require("../models/account.model");
const logger = require("../utils/logger");

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 2
    });
    logger.info("MongoDB connected for seeding...");
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

/**
 * Default Chart of Accounts
 * Structure: [code, name, nameAr, type, subType, isSystem, parentCode]
 */
const defaultAccounts = [
  // ASSETS (1000)
  ["1000", "Assets", "الأصول", "Asset", null, true, null],
  ["1100", "Current Assets", "الأصول المتداولة", "Asset", "Current Asset", true, "1000"],
  ["1101", "Cash on Hand", "النقد في الصندوق", "Asset", "Current Asset", false, "1100"],
  ["1102", "Bank Account - Main", "الحساب البنكي - الرئيسي", "Asset", "Current Asset", false, "1100"],
  ["1103", "Bank Account - Trust", "الحساب البنكي - الأمانات", "Asset", "Current Asset", false, "1100"],
  ["1110", "Accounts Receivable", "المدينون", "Asset", "Current Asset", true, "1100"],
  ["1120", "Retainers Held", "التوكيلات المحتجزة", "Asset", "Current Asset", false, "1100"],
  ["1130", "Prepaid Expenses", "المصروفات المدفوعة مقدماً", "Asset", "Current Asset", false, "1100"],
  ["1200", "Fixed Assets", "الأصول الثابتة", "Asset", "Fixed Asset", true, "1000"],
  ["1201", "Office Equipment", "معدات المكتب", "Asset", "Fixed Asset", false, "1200"],
  ["1202", "Furniture", "الأثاث", "Asset", "Fixed Asset", false, "1200"],
  ["1203", "Software", "البرمجيات", "Asset", "Fixed Asset", false, "1200"],
  ["1204", "Accumulated Depreciation", "مجمع الإهلاك", "Asset", "Fixed Asset", false, "1200"],

  // LIABILITIES (2000)
  ["2000", "Liabilities", "الالتزامات", "Liability", null, true, null],
  ["2100", "Current Liabilities", "الالتزامات المتداولة", "Liability", "Current Liability", true, "2000"],
  ["2101", "Accounts Payable", "الدائنون", "Liability", "Current Liability", true, "2100"],
  ["2110", "Trust Account Liabilities", "التزامات حساب الأمانات", "Liability", "Current Liability", false, "2100"],
  ["2120", "VAT Payable", "ضريبة القيمة المضافة المستحقة", "Liability", "Current Liability", false, "2100"],
  ["2130", "Unearned Revenue", "الإيرادات غير المكتسبة", "Liability", "Current Liability", false, "2100"],
  ["2140", "Accrued Expenses", "المصروفات المستحقة", "Liability", "Current Liability", false, "2100"],
  ["2150", "Salaries Payable", "الرواتب المستحقة", "Liability", "Current Liability", false, "2100"],
  ["2200", "Long-term Liabilities", "الالتزامات طويلة الأجل", "Liability", "Long-term Liability", true, "2000"],
  ["2201", "Loans Payable", "القروض المستحقة", "Liability", "Long-term Liability", false, "2200"],

  // EQUITY (3000)
  ["3000", "Equity", "حقوق الملكية", "Equity", null, true, null],
  ["3100", "Owner's Capital", "رأس مال المالك", "Equity", "Owner's Equity", false, "3000"],
  ["3200", "Retained Earnings", "الأرباح المحتجزة", "Equity", "Retained Earnings", false, "3000"],
  ["3300", "Current Year Earnings", "أرباح السنة الحالية", "Equity", "Retained Earnings", false, "3000"],
  ["3400", "Owner's Drawings", "مسحوبات المالك", "Equity", "Owner's Equity", false, "3000"],

  // INCOME (4000)
  ["4000", "Income", "الإيرادات", "Income", null, true, null],
  ["4100", "Legal Service Fees", "رسوم الخدمات القانونية", "Income", "Operating Income", true, "4000"],
  ["4101", "Consultation Fees", "رسوم الاستشارات", "Income", "Operating Income", false, "4100"],
  ["4102", "Court Representation Fees", "رسوم التمثيل القضائي", "Income", "Operating Income", false, "4100"],
  ["4103", "Document Preparation Fees", "رسوم إعداد المستندات", "Income", "Operating Income", false, "4100"],
  ["4104", "Legal Research Fees", "رسوم البحث القانوني", "Income", "Operating Income", false, "4100"],
  ["4105", "Contract Review Fees", "رسوم مراجعة العقود", "Income", "Operating Income", false, "4100"],
  ["4106", "Retainer Fees", "رسوم التوكيل", "Income", "Operating Income", false, "4100"],
  ["4200", "Reimbursable Expenses", "المصروفات القابلة للاسترداد", "Income", "Other Income", false, "4000"],
  ["4300", "Other Income", "إيرادات أخرى", "Income", "Other Income", false, "4000"],
  ["4301", "Interest Income", "إيرادات الفوائد", "Income", "Other Income", false, "4300"],
  ["4302", "Late Payment Fees", "رسوم التأخر في السداد", "Income", "Other Income", false, "4300"],

  // EXPENSES (5000)
  ["5000", "Expenses", "المصروفات", "Expense", null, true, null],
  ["5100", "Cost of Services", "تكلفة الخدمات", "Expense", "Cost of Goods Sold", false, "5000"],
  ["5101", "Direct Labor", "العمالة المباشرة", "Expense", "Cost of Goods Sold", false, "5100"],
  ["5102", "Subcontractor Fees", "رسوم المقاولين من الباطن", "Expense", "Cost of Goods Sold", false, "5100"],
  ["5200", "Operating Expenses", "المصروفات التشغيلية", "Expense", "Operating Expense", true, "5000"],
  ["5201", "Office Rent", "إيجار المكتب", "Expense", "Operating Expense", false, "5200"],
  ["5202", "Utilities", "المرافق", "Expense", "Operating Expense", false, "5200"],
  ["5203", "Office Supplies", "لوازم المكتب", "Expense", "Operating Expense", false, "5200"],
  ["5204", "Software Subscriptions", "اشتراكات البرمجيات", "Expense", "Operating Expense", false, "5200"],
  ["5205", "Professional Development", "التطوير المهني", "Expense", "Operating Expense", false, "5200"],
  ["5206", "Marketing", "التسويق", "Expense", "Operating Expense", false, "5200"],
  ["5207", "Insurance", "التأمين", "Expense", "Operating Expense", false, "5200"],
  ["5208", "Bank Charges", "الرسوم البنكية", "Expense", "Operating Expense", false, "5200"],
  ["5209", "Depreciation Expense", "مصروف الإهلاك", "Expense", "Operating Expense", false, "5200"],
  ["5210", "Telephone & Internet", "الهاتف والإنترنت", "Expense", "Operating Expense", false, "5200"],
  ["5211", "Postage & Delivery", "البريد والتوصيل", "Expense", "Operating Expense", false, "5200"],
  ["5300", "Travel Expenses", "مصروفات السفر", "Expense", "Operating Expense", false, "5000"],
  ["5301", "Transportation", "النقل", "Expense", "Operating Expense", false, "5300"],
  ["5302", "Accommodation", "الإقامة", "Expense", "Operating Expense", false, "5300"],
  ["5303", "Meals & Entertainment", "الوجبات والترفيه", "Expense", "Operating Expense", false, "5300"],
  ["5400", "Professional Fees", "الرسوم المهنية", "Expense", "Operating Expense", true, "5000"],
  ["5401", "Court Fees", "رسوم المحكمة", "Expense", "Operating Expense", false, "5400"],
  ["5402", "Filing Fees", "رسوم التسجيل", "Expense", "Operating Expense", false, "5400"],
  ["5403", "Expert Witness Fees", "رسوم الشهود الخبراء", "Expense", "Operating Expense", false, "5400"],
  ["5404", "Notary Fees", "رسوم التوثيق", "Expense", "Operating Expense", false, "5400"],
  ["5405", "Translation Fees", "رسوم الترجمة", "Expense", "Operating Expense", false, "5400"],
  ["5500", "Salary & Wages", "الرواتب والأجور", "Expense", "Operating Expense", false, "5000"],
  ["5501", "Staff Salaries", "رواتب الموظفين", "Expense", "Operating Expense", false, "5500"],
  ["5502", "Benefits", "المزايا", "Expense", "Operating Expense", false, "5500"],
  ["5503", "GOSI Contributions", "اشتراكات التأمينات الاجتماعية", "Expense", "Operating Expense", false, "5500"],
  ["5600", "Other Expenses", "مصروفات أخرى", "Expense", "Other Expense", false, "5000"],
  ["5601", "Bad Debt Expense", "مصروف الديون المعدومة", "Expense", "Other Expense", false, "5600"],
  ["5602", "Miscellaneous Expense", "مصروفات متنوعة", "Expense", "Other Expense", false, "5600"]
];

/**
 * Seed accounts
 */
const seedAccounts = async () => {
  logger.info("Starting account seeding...");

  // Keep track of created accounts for parent references
  const accountMap = new Map();

  // First pass: Create parent accounts (those without parentCode)
  const rootAccounts = defaultAccounts.filter(([, , , , , , parentCode]) => !parentCode);
  for (const [code, name, nameAr, type, subType, isSystem] of rootAccounts) {
    try {
      const existing = await Account.findOne({ code });
      if (existing) {
        logger.info(`✓ Account ${code} (${name}) already exists`);
        accountMap.set(code, existing._id);
        continue;
      }

      const account = await Account.create({
        code,
        name,
        nameAr,
        type,
        subType,
        isSystem,
        parentAccountId: null
      });

      accountMap.set(code, account._id);
      logger.info(`✓ Created account ${code}: ${name}`);
    } catch (error) {
      logger.error(`✗ Error creating account ${code}:`, error.message);
    }
  }

  // Second pass: Create child accounts (those with parentCode)
  // Sort by code to ensure parents are created before children
  const childAccounts = defaultAccounts
    .filter(([, , , , , , parentCode]) => parentCode)
    .sort((a, b) => a[0].localeCompare(b[0]));

  for (const [code, name, nameAr, type, subType, isSystem, parentCode] of childAccounts) {
    try {
      const existing = await Account.findOne({ code });
      if (existing) {
        logger.info(`✓ Account ${code} (${name}) already exists`);
        accountMap.set(code, existing._id);
        continue;
      }

      const parentAccountId = accountMap.get(parentCode);
      if (!parentAccountId) {
        logger.error(`✗ Parent account ${parentCode} not found for ${code}`);
        continue;
      }

      const account = await Account.create({
        code,
        name,
        nameAr,
        type,
        subType,
        isSystem,
        parentAccountId
      });

      accountMap.set(code, account._id);
      logger.info(`✓ Created account ${code}: ${name}`);
    } catch (error) {
      logger.error(`✗ Error creating account ${code}:`, error.message);
    }
  }

  // Summary
  const totalAccounts = await Account.countDocuments();
  logger.info(`\n=== Seeding Complete ===`);
  logger.info(`Total accounts in database: ${totalAccounts}`);

  // Print account hierarchy
  logger.info(`\n=== Account Hierarchy ===`);
  const hierarchy = await Account.getHierarchy();
  printHierarchy(hierarchy, 0);
};

/**
 * Print account hierarchy
 */
const printHierarchy = (accounts, level) => {
  const indent = "  ".repeat(level);
  for (const account of accounts) {
    const systemMark = account.isSystem ? " [SYSTEM]" : "";
    logger.info(`${indent}${account.code} - ${account.name}${systemMark}`);
    if (account.children && account.children.length > 0) {
      printHierarchy(account.children, level + 1);
    }
  }
};

/**
 * Main execution
 */
const main = async () => {
  try {
    await connectDB();
    await seedAccounts();
    logger.info("\nSeeding completed successfully!");
    process.exit(0);
  } catch (error) {
    logger.error("Seeding failed:", error);
    process.exit(1);
  }
};

main();
