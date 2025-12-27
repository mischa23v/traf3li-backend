const csv = require('csv-parse/sync');
const { compareTwoStrings } = require('string-similarity');
const BankTransaction = require('../models/bankTransaction.model');
const BankTransactionMatch = require('../models/bankTransactionMatch.model');
const BankMatchRule = require('../models/bankMatchRule.model');
const BankFeed = require('../models/bankFeed.model');
const BankReconciliation = require('../models/bankReconciliation.model');
const BankAccount = require('../models/bankAccount.model');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
const escapeRegex = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

class BankReconciliationService {
    /**
     * Import transactions from CSV file
     */
    async importFromCSV(firmId, bankAccountId, fileBuffer, settings, userId, lawyerId) {
        try {
            const account = await BankAccount.findOne({ _id: bankAccountId, firmId });
            if (!account) {
                throw new Error('Bank account not found');
            }

            // Parse CSV
            const transactions = await this.parseCSV(fileBuffer, settings);

            if (transactions.length === 0) {
                throw new Error('No transactions found in CSV file');
            }

            // Generate batch ID
            const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Check for duplicates
            const { unique, duplicates } = await this.detectDuplicates(bankAccountId, transactions);

            // Import transactions
            const result = await BankTransaction.importTransactions(
                bankAccountId,
                lawyerId,
                unique,
                'csv',
                batchId
            );

            // Update bank feed statistics
            const feed = await BankFeed.findOne({ bankAccountId, provider: 'csv_import', firmId });
            if (feed) {
                feed.recordImport(result.imported, batchId);
                await feed.save();
            }

            return {
                success: true,
                imported: result.imported,
                duplicates: duplicates.length + result.duplicates,
                errors: result.errors,
                batchId,
                total: transactions.length
            };
        } catch (error) {
            throw new Error(`CSV import failed: ${error.message}`);
        }
    }

    /**
     * Import transactions from OFX file
     */
    async importFromOFX(firmId, bankAccountId, fileBuffer, userId, lawyerId) {
        try {
            const account = await BankAccount.findOne({ _id: bankAccountId, firmId });
            if (!account) {
                throw new Error('Bank account not found');
            }

            // Parse OFX
            const transactions = await this.parseOFX(fileBuffer);

            if (transactions.length === 0) {
                throw new Error('No transactions found in OFX file');
            }

            // Generate batch ID
            const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Check for duplicates
            const { unique, duplicates } = await this.detectDuplicates(bankAccountId, transactions);

            // Import transactions
            const result = await BankTransaction.importTransactions(
                bankAccountId,
                lawyerId,
                unique,
                'ofx',
                batchId
            );

            // Update bank feed statistics
            const feed = await BankFeed.findOne({ bankAccountId, provider: 'ofx_import', firmId });
            if (feed) {
                feed.recordImport(result.imported, batchId);
                await feed.save();
            }

            return {
                success: true,
                imported: result.imported,
                duplicates: duplicates.length + result.duplicates,
                errors: result.errors,
                batchId,
                total: transactions.length
            };
        } catch (error) {
            throw new Error(`OFX import failed: ${error.message}`);
        }
    }

    /**
     * Parse CSV file
     */
    async parseCSV(buffer, settings) {
        try {
            const content = buffer.toString(settings.encoding || 'utf-8');

            const records = csv.parse(content, {
                columns: settings.hasHeader !== false,
                skip_empty_lines: true,
                delimiter: settings.delimiter || ',',
                from_line: (settings.skipRows || 0) + 1,
                relax_column_count: true,
                trim: true
            });

            const transactions = [];
            const mapping = settings.columnMapping || {};

            for (const record of records) {
                try {
                    const transaction = this.parseCSVRow(record, mapping, settings);
                    if (transaction) {
                        transactions.push(transaction);
                    }
                } catch (error) {
                    logger.error('Error parsing row:', error.message);
                }
            }

            return transactions;
        } catch (error) {
            throw new Error(`CSV parsing failed: ${error.message}`);
        }
    }

    /**
     * Parse individual CSV row
     */
    parseCSVRow(record, mapping, settings) {
        // Get date
        const dateField = mapping.date || 'Date' || 'date';
        let dateStr = record[dateField];
        if (!dateStr) {
            throw new Error('Date field is required');
        }

        // Parse date based on format
        const date = this.parseDate(dateStr, settings.dateFormat);

        // Get amount
        let amount = 0;
        let type = 'debit';

        if (settings.debitColumn && settings.creditColumn) {
            // Separate debit/credit columns
            const debitValue = record[settings.debitColumn];
            const creditValue = record[settings.creditColumn];

            if (debitValue && this.parseAmount(debitValue) > 0) {
                amount = this.parseAmount(debitValue);
                type = 'debit';
            } else if (creditValue && this.parseAmount(creditValue) > 0) {
                amount = this.parseAmount(creditValue);
                type = 'credit';
            }
        } else {
            // Single amount column
            const amountField = mapping.amount || 'Amount' || 'amount';
            amount = this.parseAmount(record[amountField]);

            // Determine type
            if (amount < 0) {
                amount = Math.abs(amount);
                type = 'debit';
            } else {
                type = 'credit';
            }

            // Check type column if exists
            const typeField = mapping.type || 'Type' || 'type';
            if (record[typeField]) {
                const typeValue = record[typeField].toLowerCase();
                if (typeValue.includes('debit') || typeValue.includes('withdrawal')) {
                    type = 'debit';
                } else if (typeValue.includes('credit') || typeValue.includes('deposit')) {
                    type = 'credit';
                }
            }
        }

        if (amount === 0) {
            return null; // Skip zero-amount transactions
        }

        // Get other fields
        const descField = mapping.description || 'Description' || 'description';
        const refField = mapping.reference || 'Reference' || 'reference';
        const balanceField = mapping.balance || 'Balance' || 'balance';

        return {
            date,
            type,
            amount: Math.abs(amount),
            description: record[descField] || '',
            reference: record[refField] || '',
            balance: balanceField && record[balanceField] ? this.parseAmount(record[balanceField]) : undefined,
            rawData: record
        };
    }

    /**
     * Parse OFX file
     */
    async parseOFX(buffer) {
        try {
            const ofx = require('ofx-js');
            const content = buffer.toString('utf-8');
            const data = ofx.parse(content);

            const transactions = [];

            if (data.OFX && data.OFX.BANKMSGSRSV1 && data.OFX.BANKMSGSRSV1.STMTTRNRS) {
                const statement = data.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS;

                if (statement && statement.BANKTRANLIST && statement.BANKTRANLIST.STMTTRN) {
                    const stmtTransactions = Array.isArray(statement.BANKTRANLIST.STMTTRN)
                        ? statement.BANKTRANLIST.STMTTRN
                        : [statement.BANKTRANLIST.STMTTRN];

                    for (const txn of stmtTransactions) {
                        const amount = parseFloat(txn.TRNAMT);
                        const type = amount >= 0 ? 'credit' : 'debit';

                        transactions.push({
                            date: this.parseOFXDate(txn.DTPOSTED),
                            type,
                            amount: Math.abs(amount),
                            description: txn.NAME || txn.MEMO || '',
                            reference: txn.FITID || txn.REFNUM || '',
                            payee: txn.NAME || '',
                            rawData: txn
                        });
                    }
                }
            }

            return transactions;
        } catch (error) {
            throw new Error(`OFX parsing failed: ${error.message}`);
        }
    }

    /**
     * Parse OFX date format (YYYYMMDD or YYYYMMDDHHMMSS)
     */
    parseOFXDate(dateStr) {
        if (!dateStr) return new Date();

        const str = dateStr.toString();
        const year = parseInt(str.substr(0, 4));
        const month = parseInt(str.substr(4, 2)) - 1;
        const day = parseInt(str.substr(6, 2));

        return new Date(year, month, day);
    }

    /**
     * Parse date string
     */
    parseDate(dateStr, format = 'YYYY-MM-DD') {
        try {
            // Remove extra whitespace
            dateStr = dateStr.trim();

            // Try ISO format first
            const isoDate = new Date(dateStr);
            if (!isNaN(isoDate.getTime())) {
                return isoDate;
            }

            // Parse based on format
            let day, month, year;

            if (format.includes('DD/MM/YYYY') || format.includes('dd/mm/yyyy')) {
                [day, month, year] = dateStr.split(/[\/\-\.]/);
            } else if (format.includes('MM/DD/YYYY') || format.includes('mm/dd/yyyy')) {
                [month, day, year] = dateStr.split(/[\/\-\.]/);
            } else if (format.includes('YYYY-MM-DD') || format.includes('yyyy-mm-dd')) {
                [year, month, day] = dateStr.split(/[\/\-\.]/);
            } else {
                // Try to detect format
                const parts = dateStr.split(/[\/\-\.]/);
                if (parts[0].length === 4) {
                    [year, month, day] = parts;
                } else if (parts[2].length === 4) {
                    [day, month, year] = parts;
                } else {
                    throw new Error('Unable to detect date format');
                }
            }

            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } catch (error) {
            throw new Error(`Invalid date format: ${dateStr}`);
        }
    }

    /**
     * Parse amount string
     */
    parseAmount(amountStr) {
        if (typeof amountStr === 'number') return amountStr;
        if (!amountStr) return 0;

        // Remove currency symbols and whitespace
        let cleaned = amountStr.toString()
            .replace(/[^\d.,-]/g, '')
            .trim();

        // Handle comma as decimal separator
        if (cleaned.includes(',') && !cleaned.includes('.')) {
            cleaned = cleaned.replace(',', '.');
        } else if (cleaned.includes(',')) {
            // Remove thousand separators
            cleaned = cleaned.replace(/,/g, '');
        }

        const amount = parseFloat(cleaned);
        return isNaN(amount) ? 0 : amount;
    }

    /**
     * Detect duplicate transactions
     */
    async detectDuplicates(bankAccountId, transactions) {
        const unique = [];
        const duplicates = [];

        for (const txn of transactions) {
            const existing = await BankTransaction.findOne({
                accountId: bankAccountId,
                date: {
                    $gte: new Date(txn.date.getTime() - 24 * 60 * 60 * 1000),
                    $lte: new Date(txn.date.getTime() + 24 * 60 * 60 * 1000)
                },
                amount: txn.amount,
                type: txn.type
            });

            if (existing) {
                duplicates.push(txn);
            } else {
                unique.push(txn);
            }
        }

        return { unique, duplicates };
    }

    /**
     * Auto-match transactions for a bank account
     */
    async autoMatchTransactions(bankAccountId, options = {}) {
        try {
            const unmatchedTransactions = await BankTransaction.find({
                accountId: bankAccountId,
                matched: false
            }).limit(options.limit || 100);

            const results = {
                processed: 0,
                matched: 0,
                suggested: 0,
                errors: []
            };

            for (const transaction of unmatchedTransactions) {
                try {
                    const matchResult = await this.matchTransaction(transaction._id, options);
                    results.processed++;
                    results.matched += matchResult.confirmed || 0;
                    results.suggested += matchResult.suggested || 0;
                } catch (error) {
                    results.errors.push({
                        transactionId: transaction._id,
                        error: error.message
                    });
                }
            }

            return results;
        } catch (error) {
            throw new Error(`Auto-match failed: ${error.message}`);
        }
    }

    /**
     * Match a single transaction
     */
    async matchTransaction(bankTransactionId, options = {}) {
        if (!options.firmId) {
            throw new Error('firmId is required');
        }
        const transaction = await BankTransaction.findOne({ _id: bankTransactionId, firmId: options.firmId });
        if (!transaction) {
            throw new Error('Transaction not found');
        }

        if (transaction.matched) {
            throw new Error('Transaction is already matched');
        }

        // Get applicable rules
        const rules = await BankMatchRule.getRulesForAccount(transaction.accountId, {
            firmId: options.firmId
        });

        // Find candidates
        const candidates = await this.findCandidates(transaction);

        // Score and rank matches
        const scoredMatches = [];

        for (const candidate of candidates) {
            const score = await this.scoreMatch(transaction, candidate, rules);

            if (score.totalScore >= (options.minScore || 60)) {
                scoredMatches.push({
                    candidate,
                    score: score.totalScore,
                    reasons: score.reasons,
                    ruleId: score.ruleId
                });
            }
        }

        // Sort by score
        scoredMatches.sort((a, b) => b.score - a.score);

        const results = {
            confirmed: 0,
            suggested: 0
        };

        // Create match records
        for (const match of scoredMatches.slice(0, options.maxSuggestions || 5)) {
            const matchRecord = new BankTransactionMatch({
                firmId: options.firmId,
                lawyerId: transaction.lawyerId,
                bankTransactionId: transaction._id,
                matchType: match.candidate.type,
                matchedRecordId: match.candidate.recordId,
                matchScore: match.score,
                matchMethod: match.ruleId ? 'rule_based' : 'auto',
                ruleId: match.ruleId,
                status: match.score >= 95 ? 'auto_confirmed' : 'suggested',
                matchReasons: match.reasons,
                metadata: {
                    transactionAmount: transaction.amount,
                    candidateAmount: match.candidate.amount
                }
            });

            await matchRecord.save();

            if (matchRecord.status === 'auto_confirmed') {
                await matchRecord.confirm(options.userId);
                results.confirmed++;
            } else {
                results.suggested++;
            }

            // Only auto-confirm the best match
            if (results.confirmed > 0) break;
        }

        return results;
    }

    /**
     * Find candidate matches for a transaction
     */
    async findCandidates(transaction) {
        const candidates = [];
        const dateRange = 30; // days

        const startDate = new Date(transaction.date);
        startDate.setDate(startDate.getDate() - dateRange);
        const endDate = new Date(transaction.date);
        endDate.setDate(endDate.getDate() + dateRange);

        // Search for invoices, expenses, payments, etc.
        // Note: You'll need to adjust these based on your actual models

        // For this example, we'll create a placeholder structure
        // In production, query your Invoice, Expense, Payment models

        const amountTolerance = transaction.amount * 0.02; // 2% tolerance

        // Example: Find invoices (adjust based on your Invoice model)
        try {
            const Invoice = mongoose.model('Invoice');
            const invoices = await Invoice.find({
                lawyerId: transaction.lawyerId,
                totalAmount: {
                    $gte: transaction.amount - amountTolerance,
                    $lte: transaction.amount + amountTolerance
                },
                date: { $gte: startDate, $lte: endDate },
                status: { $in: ['pending', 'sent', 'overdue'] }
            }).limit(20);

            for (const invoice of invoices) {
                candidates.push({
                    type: 'invoice',
                    recordId: invoice._id,
                    amount: invoice.totalAmount,
                    date: invoice.date,
                    description: invoice.description || '',
                    reference: invoice.invoiceNumber || '',
                    clientName: invoice.clientName || ''
                });
            }
        } catch (error) {
            // Invoice model might not exist yet
        }

        // Example: Find expenses
        try {
            const Expense = mongoose.model('Expense');
            const expenses = await Expense.find({
                lawyerId: transaction.lawyerId,
                amount: {
                    $gte: transaction.amount - amountTolerance,
                    $lte: transaction.amount + amountTolerance
                },
                date: { $gte: startDate, $lte: endDate }
            }).limit(20);

            for (const expense of expenses) {
                candidates.push({
                    type: 'expense',
                    recordId: expense._id,
                    amount: expense.amount,
                    date: expense.date,
                    description: expense.description || '',
                    vendor: expense.vendor || ''
                });
            }
        } catch (error) {
            // Expense model might not exist yet
        }

        return candidates;
    }

    /**
     * Score a match between transaction and candidate
     */
    async scoreMatch(transaction, candidate, rules) {
        let totalScore = 0;
        const reasons = [];
        let appliedRuleId = null;

        // Apply matching rules
        for (const rule of rules) {
            if (!rule.isActive) continue;

            const ruleTest = rule.testMatch(transaction);
            if (!ruleTest.matches) continue;

            const ruleScore = this.calculateRuleScore(transaction, candidate, rule);
            if (ruleScore > totalScore) {
                totalScore = ruleScore.score;
                reasons.push(...ruleScore.reasons);
                appliedRuleId = rule._id;
            }
        }

        // Calculate base scores if no rule applies
        if (totalScore === 0) {
            const amountScore = this.calculateAmountScore(transaction.amount, candidate.amount, 0.02);
            const dateScore = this.calculateDateScore(transaction.date, candidate.date, 7);
            const descScore = this.calculateDescriptionScore(transaction.description, candidate.description);

            totalScore = (amountScore * 0.5) + (dateScore * 0.3) + (descScore * 0.2);

            if (amountScore > 90) reasons.push('Amount matches closely');
            if (dateScore > 80) reasons.push('Date is within range');
            if (descScore > 70) reasons.push('Description is similar');
        }

        return {
            totalScore: Math.round(totalScore),
            reasons,
            ruleId: appliedRuleId
        };
    }

    /**
     * Calculate score based on matching rule
     */
    calculateRuleScore(transaction, candidate, rule) {
        let score = 0;
        const reasons = [];
        const criteria = rule.criteria;

        // Amount match
        const amountScore = this.calculateAmountScore(
            transaction.amount,
            candidate.amount,
            criteria.amountMatch.tolerance / 100
        );
        score += amountScore * 0.4;
        if (amountScore > 95) reasons.push(`Amount matches rule "${rule.name}"`);

        // Date match
        const dateScore = this.calculateDateScore(
            transaction.date,
            candidate.date,
            criteria.dateMatch.daysTolerance
        );
        score += dateScore * 0.3;

        // Description match
        if (criteria.descriptionMatch.patterns.length > 0) {
            let descMatched = false;
            for (const pattern of criteria.descriptionMatch.patterns) {
                if (this.testDescriptionMatch(transaction.description, pattern, criteria.descriptionMatch)) {
                    descMatched = true;
                    reasons.push(`Description matches pattern: ${pattern}`);
                    break;
                }
            }
            if (descMatched) {
                score += 30;
            }
        } else {
            const descScore = this.calculateDescriptionScore(transaction.description, candidate.description);
            score += descScore * 0.3;
        }

        return { score, reasons };
    }

    /**
     * Calculate amount match score
     */
    calculateAmountScore(txAmount, candidateAmount, tolerance = 0.02) {
        const difference = Math.abs(txAmount - candidateAmount);
        const percentDiff = difference / txAmount;

        if (difference === 0) return 100;
        if (percentDiff <= tolerance) return 95;
        if (percentDiff <= tolerance * 2) return 80;
        if (percentDiff <= tolerance * 5) return 60;
        return 0;
    }

    /**
     * Calculate date match score
     */
    calculateDateScore(txDate, candidateDate, daysTolerance = 7) {
        const diffDays = Math.abs((txDate - candidateDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 100;
        if (diffDays <= 1) return 95;
        if (diffDays <= 3) return 85;
        if (diffDays <= daysTolerance) return 70;
        if (diffDays <= daysTolerance * 2) return 50;
        return 0;
    }

    /**
     * Calculate description similarity score
     */
    calculateDescriptionScore(desc1, desc2) {
        if (!desc1 || !desc2) return 0;

        const similarity = this.fuzzyMatchDescription(desc1, desc2);
        return similarity * 100;
    }

    /**
     * Fuzzy match descriptions
     */
    fuzzyMatchDescription(desc1, desc2) {
        if (!desc1 || !desc2) return 0;

        const str1 = desc1.toLowerCase().trim();
        const str2 = desc2.toLowerCase().trim();

        // Exact match
        if (str1 === str2) return 1;

        // Use string-similarity library
        return compareTwoStrings(str1, str2);
    }

    /**
     * Test description match against pattern
     */
    testDescriptionMatch(description, pattern, matchConfig) {
        if (!description) return false;

        const desc = matchConfig.caseSensitive ? description : description.toLowerCase();
        const pat = matchConfig.caseSensitive ? pattern : pattern.toLowerCase();

        switch (matchConfig.type) {
            case 'exact':
                return desc === pat;
            case 'contains':
                return desc.includes(pat);
            case 'starts_with':
                return desc.startsWith(pat);
            case 'ends_with':
                return desc.endsWith(pat);
            case 'regex':
                try {
                    const regex = new RegExp(escapeRegex(pattern), matchConfig.caseSensitive ? '' : 'i');
                    return regex.test(description);
                } catch (error) {
                    return false;
                }
            case 'fuzzy':
                const similarity = this.fuzzyMatchDescription(description, pattern);
                return similarity >= (matchConfig.minSimilarity || 0.8);
            default:
                return desc.includes(pat);
        }
    }

    /**
     * Confirm a match
     */
    async confirmMatch(matchId, userId, firmId) {
        if (!firmId) {
            throw new Error('firmId is required');
        }
        const match = await BankTransactionMatch.findOne({ _id: matchId, firmId });
        if (!match) {
            throw new Error('Match not found');
        }

        return await match.confirm(userId);
    }

    /**
     * Reject a match
     */
    async rejectMatch(matchId, userId, reason, firmId) {
        if (!firmId) {
            throw new Error('firmId is required');
        }
        const match = await BankTransactionMatch.findOne({ _id: matchId, firmId });
        if (!match) {
            throw new Error('Match not found');
        }

        return await match.reject(userId, reason);
    }

    /**
     * Create split match
     */
    async createSplitMatch(bankTransactionId, splits, userId, firmId, lawyerId) {
        return await BankTransactionMatch.createSplitMatch({
            bankTransactionId,
            splits,
            userId,
            firmId,
            lawyerId
        });
    }

    /**
     * Unmatch a transaction
     */
    async unmatch(matchId, userId, firmId) {
        if (!firmId) {
            throw new Error('firmId is required');
        }
        const match = await BankTransactionMatch.findOne({ _id: matchId, firmId });
        if (!match) {
            throw new Error('Match not found');
        }

        return await match.unmatch(userId);
    }

    /**
     * Get reconciliation status
     */
    async getReconciliationStatus(bankAccountId) {
        const [
            totalTransactions,
            matchedTransactions,
            reconciledTransactions,
            unmatchedTransactions,
            lastReconciliation
        ] = await Promise.all([
            BankTransaction.countDocuments({ accountId: bankAccountId }),
            BankTransaction.countDocuments({ accountId: bankAccountId, matched: true }),
            BankTransaction.countDocuments({ accountId: bankAccountId, isReconciled: true }),
            BankTransaction.find({ accountId: bankAccountId, matched: false })
                .sort({ date: -1 })
                .limit(10),
            BankReconciliation.findOne({ accountId: bankAccountId, status: 'completed' })
                .sort({ endDate: -1 })
        ]);

        const matchRate = totalTransactions > 0 ? (matchedTransactions / totalTransactions) * 100 : 0;
        const reconRate = totalTransactions > 0 ? (reconciledTransactions / totalTransactions) * 100 : 0;

        return {
            totalTransactions,
            matchedTransactions,
            reconciledTransactions,
            unmatchedCount: totalTransactions - matchedTransactions,
            matchRate: Math.round(matchRate),
            reconciliationRate: Math.round(reconRate),
            recentUnmatched: unmatchedTransactions,
            lastReconciliation
        };
    }

    /**
     * Get unmatched transactions
     */
    async getUnmatchedTransactions(bankAccountId, filters = {}) {
        const query = {
            accountId: bankAccountId,
            matched: false
        };

        if (filters.startDate) {
            query.date = { ...query.date, $gte: new Date(filters.startDate) };
        }

        if (filters.endDate) {
            query.date = { ...query.date, $lte: new Date(filters.endDate) };
        }

        if (filters.minAmount) {
            query.amount = { ...query.amount, $gte: filters.minAmount };
        }

        if (filters.maxAmount) {
            query.amount = { ...query.amount, $lte: filters.maxAmount };
        }

        if (filters.type) {
            query.type = filters.type;
        }

        const limit = filters.limit || 50;
        const skip = filters.skip || 0;

        const [transactions, total] = await Promise.all([
            BankTransaction.find(query)
                .sort({ date: -1 })
                .limit(limit)
                .skip(skip),
            BankTransaction.countDocuments(query)
        ]);

        return {
            transactions,
            total,
            page: Math.floor(skip / limit) + 1,
            pages: Math.ceil(total / limit)
        };
    }

    /**
     * Get match suggestions
     */
    async getMatchSuggestions(bankAccountId, firmId, limit = 20) {
        if (!firmId) {
            throw new Error('firmId is required');
        }
        const account = await BankAccount.findOne({ _id: bankAccountId, firmId });
        if (!account) {
            throw new Error('Bank account not found');
        }

        return await BankTransactionMatch.getSuggestionsForReview(account.lawyerId, {
            limit,
            minScore: 70
        });
    }

    /**
     * Get reconciliation report
     */
    async getReconciliationReport(reconciliationId, firmId) {
        if (!firmId) {
            throw new Error('firmId is required');
        }
        const reconciliation = await BankReconciliation.findOne({ _id: reconciliationId, firmId })
            .populate('accountId')
            .populate('startedBy', 'firstName lastName email')
            .populate('completedBy', 'firstName lastName email');

        if (!reconciliation) {
            throw new Error('Reconciliation not found');
        }

        const transactions = await BankTransaction.find({
            _id: { $in: reconciliation.transactions.map(t => t.transactionId) }
        });

        return {
            reconciliation,
            transactions,
            summary: {
                openingBalance: reconciliation.openingBalance,
                closingBalance: reconciliation.closingBalance,
                statementBalance: reconciliation.statementBalance,
                difference: reconciliation.difference,
                totalCredits: reconciliation.totalCredits,
                totalDebits: reconciliation.totalDebits,
                clearedCredits: reconciliation.clearedCredits,
                clearedDebits: reconciliation.clearedDebits,
                clearedCount: reconciliation.transactions.filter(t => t.isCleared).length,
                unclearedCount: reconciliation.transactions.filter(t => !t.isCleared).length
            }
        };
    }
}

module.exports = new BankReconciliationService();
