/**
 * Sample Data Service
 *
 * Generates realistic sample data for sandbox/demo environments.
 * All data uses Arabic names, Saudi addresses, and SAR currency.
 */

const mongoose = require('mongoose');
const { Client, Case, Invoice, Expense, Firm } = require('../models');
const TimeEntry = require('../models/timeEntry.model');
const logger = require('../utils/logger');

// Sample data pools (Arabic/Saudi)
const SAMPLE_DATA = {
    firstNames: {
        male: [
            'محمد', 'أحمد', 'عبدالله', 'سعد', 'فيصل', 'خالد', 'عبدالعزيز', 'سلطان',
            'عمر', 'علي', 'يوسف', 'ماجد', 'طلال', 'بندر', 'تركي', 'مشعل'
        ],
        female: [
            'فاطمة', 'عائشة', 'مريم', 'نورة', 'سارة', 'هند', 'لطيفة', 'منى',
            'ريم', 'جواهر', 'أمل', 'فهدة', 'نوال', 'شيخة'
        ]
    },
    lastNames: [
        'العتيبي', 'الدوسري', 'القحطاني', 'الغامدي', 'الزهراني', 'الشهري',
        'العمري', 'الحربي', 'المطيري', 'الشمري', 'السبيعي', 'الجهني',
        'العنزي', 'الرشيدي', 'الأحمدي', 'البلوي'
    ],
    companies: [
        'شركة الأنوار للتجارة', 'مؤسسة الخليج للمقاولات', 'شركة النجاح للاستثمار',
        'مجموعة الفجر التجارية', 'شركة الرواد للتطوير العقاري', 'مؤسسة الأمل للخدمات',
        'شركة البناء المتحد', 'مجموعة الصفوة للاستيراد', 'شركة التقدم للصناعة',
        'مؤسسة الازدهار للتسويق', 'شركة الريادة للتكنولوجيا', 'مجموعة الإبداع للاستشارات'
    ],
    cities: [
        'الرياض', 'جدة', 'الدمام', 'مكة المكرمة', 'المدينة المنورة',
        'الخبر', 'الطائف', 'تبوك', 'أبها', 'الجبيل'
    ],
    districts: [
        'النخيل', 'الملز', 'العليا', 'الروضة', 'الربوة', 'السليمانية',
        'الفيصلية', 'المرسلات', 'الورود', 'النزهة', 'الياسمين', 'الخزامى'
    ],
    streets: [
        'شارع الملك فهد', 'طريق الملك عبدالله', 'شارع العروبة', 'طريق الأمير سلطان',
        'شارع التحلية', 'طريق الأمير محمد بن عبدالعزيز', 'شارع الملك خالد'
    ],
    caseTypes: [
        'قضية تجارية', 'قضية عمالية', 'قضية عقارية', 'قضية أسرية',
        'قضية جنائية', 'قضية إدارية', 'قضية مدنية', 'تحكيم تجاري'
    ],
    caseDescriptions: [
        'نزاع حول عقد توريد', 'قضية مطالبة مالية', 'خلاف عقد عمل',
        'نزاع ملكية عقار', 'مطالبة بتعويضات', 'فسخ عقد تجاري',
        'استشارة قانونية', 'إعداد لائحة دعوى'
    ],
    expenseCategories: [
        'رسوم محكمة', 'مواصلات', 'طباعة ومستندات', 'استشارات خارجية',
        'ترجمة', 'خدمات بريدية', 'اتصالات', 'ضيافة عملاء'
    ]
};

class SampleDataService {
    /**
     * Generate sample clients
     * @param {string} firmId - Firm ID
     * @param {number} count - Number of clients to generate
     * @returns {Promise<Array>} Generated clients
     */
    static async generateSampleClients(firmId, count = 10) {
        try {
            logger.info(`[SampleData] Generating ${count} sample clients for firm ${firmId}`);

            const firm = await Firm.findById(firmId);
            if (!firm) {
                throw new Error('Firm not found');
            }

            const clients = [];

            for (let i = 0; i < count; i++) {
                const clientType = Math.random() > 0.7 ? 'company' : 'individual';
                const isMale = Math.random() > 0.3;

                const clientData = {
                    firmId,
                    clientType,
                    status: 'active',
                    clientSource: this._randomChoice(['website', 'referral', 'returning', 'ads', 'walkin']),
                    clientTier: this._randomChoice(['standard', 'premium', 'vip'], [0.6, 0.3, 0.1]),
                    createdAt: this._randomPastDate(180) // Within last 6 months
                };

                if (clientType === 'individual') {
                    const firstName = this._randomChoice(
                        isMale ? SAMPLE_DATA.firstNames.male : SAMPLE_DATA.firstNames.female
                    );
                    const lastName = this._randomChoice(SAMPLE_DATA.lastNames);

                    clientData.firstName = firstName;
                    clientData.lastName = lastName;
                    clientData.fullNameArabic = `${firstName} ${lastName}`;
                    clientData.nationalId = this._generateNationalId();
                    clientData.gender = isMale ? 'male' : 'female';
                    clientData.dateOfBirth = this._randomDate(new Date(1960, 0, 1), new Date(1995, 11, 31));
                } else {
                    const companyName = this._randomChoice(SAMPLE_DATA.companies);
                    clientData.companyName = companyName;
                    clientData.companyNameEnglish = companyName;
                    clientData.crNumber = this._generateCRNumber();
                }

                // Contact info
                clientData.phone = this._generateSaudiPhone();
                clientData.email = this._generateEmail(
                    clientType === 'individual' ? clientData.firstName : clientData.companyName
                );

                // Address (Saudi National Address format)
                const city = this._randomChoice(SAMPLE_DATA.cities);
                clientData.address = {
                    city,
                    district: this._randomChoice(SAMPLE_DATA.districts),
                    street: this._randomChoice(SAMPLE_DATA.streets),
                    buildingNumber: String(Math.floor(Math.random() * 9000) + 1000),
                    postalCode: String(Math.floor(Math.random() * 90000) + 10000),
                    additionalNumber: String(Math.floor(Math.random() * 9000) + 1000),
                    country: 'Saudi Arabia'
                };

                // Billing settings
                clientData.billing = {
                    type: this._randomChoice(['hourly', 'flat_fee', 'retainer'], [0.6, 0.3, 0.1]),
                    hourlyRate: this._randomChoice([300, 400, 500, 600, 800, 1000]),
                    currency: 'SAR',
                    paymentTerms: this._randomChoice(['net_15', 'net_30', 'net_45']),
                    invoiceDelivery: 'email',
                    invoiceLanguage: 'ar'
                };

                // VAT registration (30% chance for companies)
                if (clientType === 'company' && Math.random() > 0.7) {
                    clientData.vatRegistration = {
                        isRegistered: true,
                        vatNumber: this._generateVATNumber()
                    };
                }

                const client = await Client.create(clientData);
                clients.push(client);
            }

            logger.info(`[SampleData] Generated ${clients.length} sample clients`);
            return clients;
        } catch (error) {
            logger.error('[SampleData] Error generating sample clients:', error);
            throw error;
        }
    }

    /**
     * Generate sample cases
     * @param {string} firmId - Firm ID
     * @param {number} count - Number of cases to generate
     * @returns {Promise<Array>} Generated cases
     */
    static async generateSampleCases(firmId, count = 7) {
        try {
            logger.info(`[SampleData] Generating ${count} sample cases for firm ${firmId}`);

            // Get clients from this firm
            const clients = await Client.find({ firmId, status: 'active' }).limit(50);
            if (clients.length === 0) {
                logger.warn('[SampleData] No clients found, cannot generate cases');
                return [];
            }

            const cases = [];

            for (let i = 0; i < count; i++) {
                const client = this._randomChoice(clients);
                const caseType = this._randomChoice(SAMPLE_DATA.caseTypes);
                const status = this._randomChoice(
                    ['active', 'pending', 'closed', 'on_hold'],
                    [0.5, 0.2, 0.2, 0.1]
                );

                const caseData = {
                    firmId,
                    clientId: client._id,
                    title: caseType,
                    description: this._randomChoice(SAMPLE_DATA.caseDescriptions),
                    caseType: this._randomChoice(['civil', 'criminal', 'commercial', 'administrative', 'family']),
                    status,
                    priority: this._randomChoice(['low', 'medium', 'high', 'urgent'], [0.3, 0.4, 0.2, 0.1]),
                    openedAt: this._randomPastDate(365),
                    currency: 'SAR',
                    estimatedValue: this._randomChoice([10000, 25000, 50000, 100000, 250000, 500000])
                };

                // Close date for closed cases
                if (status === 'closed') {
                    caseData.closedAt = this._randomPastDate(90);
                }

                const caseRecord = await Case.create(caseData);
                cases.push(caseRecord);
            }

            logger.info(`[SampleData] Generated ${cases.length} sample cases`);
            return cases;
        } catch (error) {
            logger.error('[SampleData] Error generating sample cases:', error);
            throw error;
        }
    }

    /**
     * Generate sample invoices
     * @param {string} firmId - Firm ID
     * @param {number} count - Number of invoices to generate
     * @returns {Promise<Array>} Generated invoices
     */
    static async generateSampleInvoices(firmId, count = 15) {
        try {
            logger.info(`[SampleData] Generating ${count} sample invoices for firm ${firmId}`);

            const clients = await Client.find({ firmId, status: 'active' }).limit(50);
            const cases = await Case.find({ firmId }).limit(50);

            if (clients.length === 0) {
                logger.warn('[SampleData] No clients found, cannot generate invoices');
                return [];
            }

            const invoices = [];
            const firm = await Firm.findById(firmId);

            for (let i = 0; i < count; i++) {
                const client = this._randomChoice(clients);
                const caseRecord = cases.length > 0 && Math.random() > 0.3 ? this._randomChoice(cases) : null;

                // Generate invoice number
                const invoiceNumber = await firm.getNextInvoiceNumber();

                const status = this._randomChoice(
                    ['draft', 'sent', 'paid', 'partial', 'overdue'],
                    [0.1, 0.2, 0.4, 0.2, 0.1]
                );

                // Generate line items
                const lineItems = [];
                const itemCount = Math.floor(Math.random() * 4) + 1;

                for (let j = 0; j < itemCount; j++) {
                    const quantity = Math.random() > 0.5 ? Math.floor(Math.random() * 10) + 1 : Math.random() * 10 + 0.5;
                    const unitPrice = this._randomChoice([300, 400, 500, 600, 800, 1000, 1500]);
                    const lineTotal = quantity * unitPrice;

                    lineItems.push({
                        type: 'time',
                        description: this._randomChoice([
                            'استشارة قانونية',
                            'إعداد مذكرة دفاع',
                            'حضور جلسة محكمة',
                            'مراجعة عقد',
                            'بحث قانوني',
                            'صياغة اتفاقية'
                        ]),
                        quantity,
                        unitPrice,
                        lineTotal,
                        taxable: true
                    });
                }

                // Calculate totals
                const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
                const taxRate = 0.15; // 15% VAT
                const taxAmount = subtotal * taxRate;
                const totalAmount = subtotal + taxAmount;

                const invoiceData = {
                    firmId,
                    clientId: client._id,
                    caseId: caseRecord?._id,
                    invoiceNumber,
                    status,
                    issueDate: this._randomPastDate(180),
                    dueDate: this._randomFutureDate(30),
                    currency: 'SAR',
                    lineItems,
                    subtotal,
                    taxRate,
                    taxAmount,
                    totalAmount,
                    amountPaid: status === 'paid' ? totalAmount : (status === 'partial' ? totalAmount * 0.5 : 0),
                    notes: 'فاتورة نظام إدارة المكاتب القانونية',
                    paymentInstructions: 'يرجى الدفع خلال المدة المحددة'
                };

                const invoice = await Invoice.create(invoiceData);
                invoices.push(invoice);
            }

            logger.info(`[SampleData] Generated ${invoices.length} sample invoices`);
            return invoices;
        } catch (error) {
            logger.error('[SampleData] Error generating sample invoices:', error);
            throw error;
        }
    }

    /**
     * Generate sample expenses
     * @param {string} firmId - Firm ID
     * @param {number} count - Number of expenses to generate
     * @returns {Promise<Array>} Generated expenses
     */
    static async generateSampleExpenses(firmId, count = 10) {
        try {
            logger.info(`[SampleData] Generating ${count} sample expenses for firm ${firmId}`);

            const cases = await Case.find({ firmId }).limit(50);
            const expenses = [];

            for (let i = 0; i < count; i++) {
                const caseRecord = cases.length > 0 && Math.random() > 0.4 ? this._randomChoice(cases) : null;
                const category = this._randomChoice(SAMPLE_DATA.expenseCategories);

                const expenseData = {
                    firmId,
                    caseId: caseRecord?._id,
                    category,
                    description: `${category} - تفاصيل المصروف`,
                    amount: this._randomChoice([50, 100, 150, 200, 300, 500, 750, 1000]),
                    currency: 'SAR',
                    date: this._randomPastDate(180),
                    status: this._randomChoice(['pending', 'approved', 'reimbursed'], [0.2, 0.3, 0.5]),
                    isBillable: Math.random() > 0.5,
                    paymentMethod: this._randomChoice(['cash', 'credit_card', 'bank_transfer'])
                };

                const expense = await Expense.create(expenseData);
                expenses.push(expense);
            }

            logger.info(`[SampleData] Generated ${expenses.length} sample expenses`);
            return expenses;
        } catch (error) {
            logger.error('[SampleData] Error generating sample expenses:', error);
            throw error;
        }
    }

    /**
     * Generate sample time entries
     * @param {string} firmId - Firm ID
     * @param {number} count - Number of time entries to generate
     * @returns {Promise<Array>} Generated time entries
     */
    static async generateSampleTimeEntries(firmId, count = 25) {
        try {
            logger.info(`[SampleData] Generating ${count} sample time entries for firm ${firmId}`);

            const cases = await Case.find({ firmId }).limit(50);
            const clients = await Client.find({ firmId, status: 'active' }).limit(50);

            if (cases.length === 0 && clients.length === 0) {
                logger.warn('[SampleData] No cases or clients found, cannot generate time entries');
                return [];
            }

            const timeEntries = [];

            for (let i = 0; i < count; i++) {
                const caseRecord = cases.length > 0 ? this._randomChoice(cases) : null;
                const client = caseRecord ? await Client.findById(caseRecord.clientId) : this._randomChoice(clients);

                const hours = Math.random() * 8 + 0.25; // 0.25 to 8 hours
                const hourlyRate = this._randomChoice([300, 400, 500, 600, 800, 1000]);

                const timeEntryData = {
                    firmId,
                    clientId: client._id,
                    caseId: caseRecord?._id,
                    date: this._randomPastDate(90),
                    hours: parseFloat(hours.toFixed(2)),
                    hourlyRate,
                    totalAmount: parseFloat((hours * hourlyRate).toFixed(2)),
                    description: this._randomChoice([
                        'مراجعة ملف القضية',
                        'اتصال مع العميل',
                        'إعداد مستندات',
                        'بحث قانوني',
                        'حضور جلسة',
                        'مراسلات قانونية',
                        'استشارة داخلية'
                    ]),
                    status: this._randomChoice(['unbilled', 'billed', 'invoiced'], [0.3, 0.4, 0.3]),
                    isBillable: Math.random() > 0.1
                };

                const timeEntry = await TimeEntry.create(timeEntryData);
                timeEntries.push(timeEntry);
            }

            logger.info(`[SampleData] Generated ${timeEntries.length} sample time entries`);
            return timeEntries;
        } catch (error) {
            logger.error('[SampleData] Error generating sample time entries:', error);
            throw error;
        }
    }

    /**
     * Generate full demo dataset
     * @param {string} firmId - Firm ID
     * @param {Object} config - Configuration for data generation
     * @returns {Promise<Object>} Generation statistics
     */
    static async generateFullDemoData(firmId, config = {}) {
        try {
            const {
                clients = 10,
                cases = 7,
                invoices = 15,
                expenses = 10,
                timeEntries = 25
            } = config;

            logger.info(`[SampleData] Generating full demo dataset for firm ${firmId}`);

            // Generate in order (clients -> cases -> invoices/expenses/time entries)
            const generatedClients = await this.generateSampleClients(firmId, clients);
            const generatedCases = await this.generateSampleCases(firmId, cases);
            const generatedInvoices = await this.generateSampleInvoices(firmId, invoices);
            const generatedExpenses = await this.generateSampleExpenses(firmId, expenses);
            const generatedTimeEntries = await this.generateSampleTimeEntries(firmId, timeEntries);

            const stats = {
                clients: generatedClients.length,
                cases: generatedCases.length,
                invoices: generatedInvoices.length,
                expenses: generatedExpenses.length,
                timeEntries: generatedTimeEntries.length
            };

            logger.info(`[SampleData] Full demo dataset generated:`, stats);

            return stats;
        } catch (error) {
            logger.error('[SampleData] Error generating full demo data:', error);
            throw error;
        }
    }

    /**
     * Clear all data for a firm
     * @param {string} firmId - Firm ID
     * @returns {Promise<Object>} Deletion statistics
     */
    static async clearAllData(firmId) {
        try {
            logger.info(`[SampleData] Clearing all data for firm ${firmId}`);

            const [
                deletedClients,
                deletedCases,
                deletedInvoices,
                deletedExpenses,
                deletedTimeEntries
            ] = await Promise.all([
                Client.deleteMany({ firmId }),
                Case.deleteMany({ firmId }),
                Invoice.deleteMany({ firmId }),
                Expense.deleteMany({ firmId }),
                TimeEntry.deleteMany({ firmId })
            ]);

            const stats = {
                clients: deletedClients.deletedCount,
                cases: deletedCases.deletedCount,
                invoices: deletedInvoices.deletedCount,
                expenses: deletedExpenses.deletedCount,
                timeEntries: deletedTimeEntries.deletedCount
            };

            logger.info(`[SampleData] Cleared all data:`, stats);

            return stats;
        } catch (error) {
            logger.error('[SampleData] Error clearing data:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Random choice from array with optional weights
     * @private
     */
    static _randomChoice(array, weights = null) {
        if (weights) {
            const totalWeight = weights.reduce((sum, w) => sum + w, 0);
            let random = Math.random() * totalWeight;
            for (let i = 0; i < array.length; i++) {
                random -= weights[i];
                if (random <= 0) return array[i];
            }
        }
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Generate random past date
     * @private
     */
    static _randomPastDate(maxDaysAgo) {
        const daysAgo = Math.floor(Math.random() * maxDaysAgo);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date;
    }

    /**
     * Generate random future date
     * @private
     */
    static _randomFutureDate(maxDaysAhead) {
        const daysAhead = Math.floor(Math.random() * maxDaysAhead);
        const date = new Date();
        date.setDate(date.getDate() + daysAhead);
        return date;
    }

    /**
     * Generate random date between two dates
     * @private
     */
    static _randomDate(start, end) {
        return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    }

    /**
     * Generate Saudi national ID
     * @private
     */
    static _generateNationalId() {
        return '1' + String(Math.floor(Math.random() * 900000000) + 100000000);
    }

    /**
     * Generate Saudi CR number
     * @private
     */
    static _generateCRNumber() {
        return String(Math.floor(Math.random() * 9000000000) + 1000000000);
    }

    /**
     * Generate Saudi VAT number
     * @private
     */
    static _generateVATNumber() {
        return '3' + String(Math.floor(Math.random() * 99999999999999) + 10000000000000);
    }

    /**
     * Generate Saudi phone number
     * @private
     */
    static _generateSaudiPhone() {
        const prefix = this._randomChoice(['050', '053', '054', '055', '056', '058', '059']);
        const number = String(Math.floor(Math.random() * 9000000) + 1000000);
        return `+966${prefix}${number}`;
    }

    /**
     * Generate email address
     * @private
     */
    static _generateEmail(name) {
        const sanitized = name
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[^\w\u0600-\u06FF]/g, '');
        const domain = this._randomChoice(['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com']);
        const random = Math.floor(Math.random() * 1000);
        return `${sanitized}${random}@${domain}`;
    }
}

module.exports = SampleDataService;
