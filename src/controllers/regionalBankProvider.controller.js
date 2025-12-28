/**
 * Regional Bank Providers Controller
 *
 * Provides endpoints for:
 * - Listing supported banks by country
 * - Initiating bank connections
 * - Handling OAuth callbacks
 * - Syncing transactions
 */

const asyncHandler = require('../utils/asyncHandler');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const regionalBankService = require('../services/regionalBankProviders.service');
const BankAccount = require('../models/bankAccount.model');
const BankFeed = require('../models/bankFeed.model');
const BankTransaction = require('../models/bankTransaction.model');
const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// BANK DISCOVERY
// ═══════════════════════════════════════════════════════════════

/**
 * Get all supported countries
 * GET /api/regional-banks/countries
 */
exports.getSupportedCountries = asyncHandler(async (req, res) => {
    const countries = regionalBankService.getSupportedCountries();

    const countryDetails = countries.map(code => {
        const banks = regionalBankService.getSupportedBanks(code);
        return {
            code,
            name: getCountryName(code),
            nameAr: getCountryNameAr(code),
            bankCount: banks.length
        };
    });

    res.status(200).json({
        success: true,
        data: {
            countries: countryDetails,
            totalBanks: regionalBankService.getTotalBankCount()
        }
    });
});

/**
 * Get supported banks for a country
 * GET /api/regional-banks/countries/:countryCode/banks
 */
exports.getBanksByCountry = asyncHandler(async (req, res) => {
    const { countryCode } = req.params;

    if (!countryCode || countryCode.length !== 2) {
        throw CustomException('Valid 2-letter country code is required', 400);
    }

    const banks = regionalBankService.getSupportedBanks(countryCode.toUpperCase());

    if (banks.length === 0) {
        throw CustomException(`No banks supported for country: ${countryCode}`, 404);
    }

    res.status(200).json({
        success: true,
        data: {
            country: countryCode.toUpperCase(),
            countryName: getCountryName(countryCode),
            banks: banks.map(bank => ({
                bankId: bank.bankId,
                name: bank.name,
                nameAr: bank.nameAr,
                bic: bank.bic,
                providers: bank.providers,
                primaryProvider: regionalBankService.getBestProviderForBank(bank.bankId, countryCode)
            }))
        }
    });
});

/**
 * Find bank by IBAN
 * GET /api/regional-banks/find-by-iban
 */
exports.findBankByIBAN = asyncHandler(async (req, res) => {
    const { iban } = req.query;

    if (!iban || iban.length < 15) {
        throw CustomException('Valid IBAN is required', 400);
    }

    const bank = regionalBankService.findBankByIBAN(iban.toUpperCase());

    if (!bank) {
        throw CustomException('Bank not found for this IBAN', 404);
    }

    res.status(200).json({
        success: true,
        data: bank
    });
});

/**
 * Get provider statistics
 * GET /api/regional-banks/stats
 */
exports.getProviderStats = asyncHandler(async (req, res) => {
    const stats = regionalBankService.getProviderStats();

    res.status(200).json({
        success: true,
        data: stats
    });
});

// ═══════════════════════════════════════════════════════════════
// CONNECTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize bank connection
 * POST /api/regional-banks/connect
 */
exports.initializeConnection = asyncHandler(async (req, res) => {
    const allowedFields = ['bankId', 'countryCode', 'redirectUrl', 'accountName'];
    const data = pickAllowedFields(req.body, allowedFields);

    if (!data.bankId || !data.countryCode) {
        throw CustomException('Bank ID and country code are required', 400);
    }

    // Validate bank exists
    const banks = regionalBankService.getSupportedBanks(data.countryCode);
    const bank = banks.find(b => b.bankId === data.bankId);

    if (!bank) {
        throw CustomException(`Bank ${data.bankId} not supported in ${data.countryCode}`, 400);
    }

    // Default redirect URL
    const redirectUrl = data.redirectUrl || `${process.env.APP_URL}/api/regional-banks/callback`;

    try {
        const connection = await regionalBankService.initializeBankConnection({
            bankId: data.bankId,
            countryCode: data.countryCode,
            firmId: req.firmQuery.firmId,
            userId: req.userID,
            redirectUrl
        });

        // Store pending connection in database
        await BankFeed.create(req.addFirmId({
            bankAccountId: null, // Will be set after connection completes
            provider: connection.provider,
            name: data.accountName || bank.name,
            bankIdentifier: data.bankId,
            countryCode: data.countryCode,
            institutionId: data.bankId,
            institutionName: bank.name,
            institutionNameAr: bank.nameAr,
            credentials: {
                itemId: connection.linkId,
                expiresAt: connection.expiresAt
            },
            status: 'pending',
            lawyerId: req.userID,
            createdBy: req.userID
        }));

        res.status(200).json({
            success: true,
            data: {
                linkUrl: connection.linkUrl,
                linkId: connection.linkId,
                expiresAt: connection.expiresAt,
                provider: connection.provider,
                bank: {
                    id: bank.bankId,
                    name: bank.name,
                    nameAr: bank.nameAr
                }
            }
        });

    } catch (error) {
        throw CustomException(`Failed to initialize connection: ${error.message}`, 500);
    }
});

/**
 * Handle OAuth callback
 * GET /api/regional-banks/callback
 */
exports.handleCallback = asyncHandler(async (req, res) => {
    const { code, state, error, error_description } = req.query;

    if (error) {
        // Redirect to frontend with error
        const errorUrl = `${process.env.FRONTEND_URL}/banking/connect/error?message=${encodeURIComponent(error_description || error)}`;
        return res.redirect(errorUrl);
    }

    if (!code) {
        const errorUrl = `${process.env.FRONTEND_URL}/banking/connect/error?message=No authorization code received`;
        return res.redirect(errorUrl);
    }

    // Find pending feed by state/linkId
    const pendingFeed = await BankFeed.findOne({
        'credentials.itemId': state,
        status: 'pending'
    });

    if (!pendingFeed) {
        const errorUrl = `${process.env.FRONTEND_URL}/banking/connect/error?message=Connection session not found or expired`;
        return res.redirect(errorUrl);
    }

    try {
        // Exchange code for tokens
        const tokens = await regionalBankService.exchangeAuthCode({
            provider: pendingFeed.provider,
            code,
            linkId: state,
            firmId: pendingFeed.firmId,
            userId: pendingFeed.lawyerId
        });

        // Fetch accounts from bank
        const accounts = await regionalBankService.fetchAccounts({
            provider: pendingFeed.provider,
            accessToken: tokens.accessToken,
            entityId: tokens.entityId
        });

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Create bank accounts
            const createdAccounts = [];

            for (const acc of accounts) {
                const bankAccount = await BankAccount.create([{
                    firmId: pendingFeed.firmId,
                    lawyerId: pendingFeed.lawyerId,
                    name: acc.name || `${pendingFeed.institutionName} - ${acc.type}`,
                    accountNumber: acc.accountNumber,
                    iban: acc.iban,
                    type: acc.type,
                    bankName: acc.bankName || pendingFeed.institutionName,
                    currency: acc.currency || 'SAR',
                    balance: acc.balance || 0,
                    availableBalance: acc.balance || 0,
                    connection: {
                        provider: pendingFeed.provider,
                        institutionId: pendingFeed.institutionId,
                        institutionName: pendingFeed.institutionName,
                        institutionNameAr: pendingFeed.institutionNameAr,
                        countryCode: pendingFeed.countryCode,
                        status: 'connected',
                        lastSyncedAt: new Date(),
                        accessToken: tokens.accessToken,
                        refreshToken: tokens.refreshToken,
                        entityId: tokens.entityId || acc.externalId,
                        expiresAt: tokens.expiresAt,
                        permissions: tokens.permissions
                    }
                }], { session });

                createdAccounts.push(bankAccount[0]);
            }

            // Update feed with first account
            if (createdAccounts.length > 0) {
                pendingFeed.bankAccountId = createdAccounts[0]._id;
                pendingFeed.credentials = {
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    expiresAt: tokens.expiresAt,
                    itemId: tokens.entityId
                };
                pendingFeed.status = 'active';
                await pendingFeed.save({ session });
            }

            await session.commitTransaction();

            // Redirect to success page
            const successUrl = `${process.env.FRONTEND_URL}/banking/connect/success?accounts=${createdAccounts.length}&bank=${pendingFeed.institutionName}`;
            res.redirect(successUrl);

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

    } catch (error) {
        // Update feed status to error
        pendingFeed.status = 'error';
        pendingFeed.errorMessage = error.message;
        await pendingFeed.save();

        const errorUrl = `${process.env.FRONTEND_URL}/banking/connect/error?message=${encodeURIComponent(error.message)}`;
        res.redirect(errorUrl);
    }
});

/**
 * Sync transactions for a connected account
 * POST /api/regional-banks/sync/:accountId
 */
exports.syncTransactions = asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const { fromDate, toDate } = req.body;

    const sanitizedId = sanitizeObjectId(accountId);
    if (!sanitizedId) {
        throw CustomException('Invalid account ID', 400);
    }

    // Get account with tenant isolation
    const account = await BankAccount.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!account) {
        throw CustomException('Account not found', 404);
    }

    if (!account.connection || account.connection.status !== 'connected') {
        throw CustomException('Account is not connected to a bank provider', 400);
    }

    // Check if token needs refresh
    let accessToken = account.connection.accessToken;
    if (account.connection.expiresAt && new Date(account.connection.expiresAt) <= new Date()) {
        try {
            const newTokens = await regionalBankService.refreshToken({
                provider: account.connection.provider,
                refreshToken: account.connection.refreshToken
            });

            accessToken = newTokens.accessToken;

            // Update account with new tokens
            account.connection.accessToken = newTokens.accessToken;
            account.connection.refreshToken = newTokens.refreshToken;
            account.connection.expiresAt = newTokens.expiresAt;
            await account.save();

        } catch (error) {
            account.connection.status = 'requires_reauth';
            account.connection.error = 'Token refresh failed';
            await account.save();
            throw CustomException('Bank connection requires re-authentication', 401);
        }
    }

    // Fetch transactions
    const from = fromDate ? new Date(fromDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = toDate ? new Date(toDate) : new Date();

    try {
        const transactions = await regionalBankService.fetchTransactions({
            provider: account.connection.provider,
            accessToken,
            accountId: account.connection.entityId,
            entityId: account.connection.entityId,
            fromDate: from,
            toDate: to
        });

        // Import transactions
        const batchId = `SYNC-${Date.now()}`;
        let imported = 0;
        let duplicates = 0;

        for (const txn of transactions) {
            // Check for duplicates
            const existing = await BankTransaction.findOne({
                accountId: account._id,
                date: txn.date,
                amount: txn.amount,
                reference: txn.reference
            });

            if (existing) {
                duplicates++;
                continue;
            }

            await BankTransaction.create({
                accountId: account._id,
                date: txn.date,
                description: txn.description,
                amount: txn.amount,
                type: txn.type,
                balance: txn.balance,
                reference: txn.reference,
                category: txn.category,
                payee: txn.merchant,
                importSource: 'sync',
                importBatchId: batchId,
                rawData: txn.rawData,
                lawyerId: account.lawyerId,
                firmId: account.firmId
            });

            imported++;
        }

        // Update account sync time
        account.connection.lastSyncedAt = new Date();
        account.lastSyncedAt = new Date();
        await account.save();

        // Update bank feed if exists
        await BankFeed.findOneAndUpdate(
            { bankAccountId: account._id },
            {
                lastImportAt: new Date(),
                lastImportCount: imported,
                $inc: { totalImported: imported },
                lastImportBatchId: batchId
            }
        );

        res.status(200).json({
            success: true,
            data: {
                imported,
                duplicates,
                total: transactions.length,
                dateRange: { from, to },
                batchId
            }
        });

    } catch (error) {
        throw CustomException(`Failed to sync transactions: ${error.message}`, 500);
    }
});

/**
 * Disconnect bank account
 * POST /api/regional-banks/disconnect/:accountId
 */
exports.disconnectAccount = asyncHandler(async (req, res) => {
    const { accountId } = req.params;

    const sanitizedId = sanitizeObjectId(accountId);
    if (!sanitizedId) {
        throw CustomException('Invalid account ID', 400);
    }

    const account = await BankAccount.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!account) {
        throw CustomException('Account not found', 404);
    }

    // Clear connection data
    account.connection = {
        status: 'disconnected'
    };
    await account.save();

    // Update associated feed
    await BankFeed.findOneAndUpdate(
        { bankAccountId: account._id },
        { status: 'disconnected' }
    );

    res.status(200).json({
        success: true,
        message: 'Account disconnected successfully'
    });
});

/**
 * Get connection status
 * GET /api/regional-banks/status/:accountId
 */
exports.getConnectionStatus = asyncHandler(async (req, res) => {
    const { accountId } = req.params;

    const sanitizedId = sanitizeObjectId(accountId);
    if (!sanitizedId) {
        throw CustomException('Invalid account ID', 400);
    }

    const account = await BankAccount.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    }).select('connection lastSyncedAt bankName');

    if (!account) {
        throw CustomException('Account not found', 404);
    }

    res.status(200).json({
        success: true,
        data: {
            status: account.connection?.status || 'disconnected',
            provider: account.connection?.provider,
            lastSyncedAt: account.connection?.lastSyncedAt || account.lastSyncedAt,
            expiresAt: account.connection?.expiresAt,
            requiresReauth: account.connection?.status === 'requires_reauth',
            error: account.connection?.error
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getCountryName(code) {
    const names = {
        SA: 'Saudi Arabia',
        AE: 'United Arab Emirates',
        KW: 'Kuwait',
        BH: 'Bahrain',
        QA: 'Qatar',
        OM: 'Oman',
        EG: 'Egypt',
        JO: 'Jordan'
    };
    return names[code] || code;
}

function getCountryNameAr(code) {
    const names = {
        SA: 'المملكة العربية السعودية',
        AE: 'الإمارات العربية المتحدة',
        KW: 'الكويت',
        BH: 'البحرين',
        QA: 'قطر',
        OM: 'عُمان',
        EG: 'مصر',
        JO: 'الأردن'
    };
    return names[code] || code;
}
