/**
 * Sync Queue Processor
 *
 * Handles synchronization with external APIs and services:
 * - WhatsApp Business API
 * - Banking integrations (Open Banking, LeanTech)
 * - Payment gateways (Stripe, STC Pay, etc.)
 * - Government systems (ZATCA, Mudad, Wathq)
 * - Third-party services
 */

const { createQueue } = require('../configs/queue');

// Create sync queue
const syncQueue = createQueue('sync', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      age: 259200, // 3 days
      count: 200
    },
    timeout: 60000 // 1 minute timeout
  }
});

/**
 * Process sync jobs
 */
syncQueue.process(async (job) => {
  const { type, data } = job.data;

  console.log(`🔄 Processing sync job ${job.id} of type: ${type}`);

  try {
    switch (type) {
      case 'whatsapp-messages':
        return await syncWhatsAppMessages(data, job);

      case 'bank-transactions':
        return await syncBankTransactions(data, job);

      case 'payment-status':
        return await syncPaymentStatus(data, job);

      case 'zatca-invoice':
        return await syncZATCAInvoice(data, job);

      case 'mudad-payment':
        return await syncMudadPayment(data, job);

      case 'wathq-contract':
        return await syncWathqContract(data, job);

      case 'currency-rates':
        return await syncCurrencyRates(data, job);

      default:
        throw new Error(`Unknown sync type: ${type}`);
    }
  } catch (error) {
    console.error(`❌ Sync job ${job.id} failed:`, error.message);
    throw error;
  }
});

/**
 * Sync WhatsApp messages
 */
async function syncWhatsAppMessages(data, job) {
  const { firmId, phoneNumberId } = data;

  await job.progress(10);

  const whatsappService = require('../services/whatsapp.service');

  await job.progress(30);

  // Fetch new messages from WhatsApp Business API
  const messages = await whatsappService.getMessages(phoneNumberId);

  await job.progress(60);

  // Save messages to database
  const WhatsAppMessage = require('../models/whatsappMessage.model');
  let savedCount = 0;

  for (const message of messages) {
    try {
      await WhatsAppMessage.create({
        firmId,
        phoneNumberId,
        messageId: message.id,
        from: message.from,
        to: message.to,
        type: message.type,
        content: message.content,
        timestamp: new Date(message.timestamp * 1000),
        status: message.status
      });
      savedCount++;
    } catch (error) {
      if (error.code !== 11000) { // Ignore duplicate key errors
        console.error('Error saving message:', error.message);
      }
    }
  }

  await job.progress(100);

  console.log(`✅ Synced ${savedCount} WhatsApp messages`);
  return {
    success: true,
    syncedCount: savedCount,
    totalMessages: messages.length
  };
}

/**
 * Sync bank transactions
 */
async function syncBankTransactions(data, job) {
  const { firmId, bankAccountId, startDate, endDate } = data;

  await job.progress(10);

  const leantechService = require('../services/leantech.service');
  const BankTransaction = require('../models/bankTransaction.model');

  await job.progress(20);

  // Fetch bank account details
  const BankAccount = require('../models/bankAccount.model');
  const bankAccount = await BankAccount.findById(bankAccountId);

  if (!bankAccount) {
    throw new Error('Bank account not found');
  }

  await job.progress(30);

  // Fetch transactions from LeanTech API
  const transactions = await leantechService.getTransactions({
    accountId: bankAccount.leantechAccountId,
    from: startDate,
    to: endDate
  });

  await job.progress(60);

  // Save transactions to database
  let savedCount = 0;

  for (const transaction of transactions) {
    try {
      await BankTransaction.create({
        firmId,
        bankAccountId,
        transactionId: transaction.id,
        date: new Date(transaction.date),
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        balance: transaction.balance,
        category: transaction.category,
        merchant: transaction.merchant,
        rawData: transaction
      });
      savedCount++;
    } catch (error) {
      if (error.code !== 11000) {
        console.error('Error saving transaction:', error.message);
      }
    }
  }

  await job.progress(100);

  console.log(`✅ Synced ${savedCount} bank transactions`);
  return {
    success: true,
    syncedCount: savedCount,
    totalTransactions: transactions.length
  };
}

/**
 * Sync payment status
 */
async function syncPaymentStatus(data, job) {
  const { paymentId, paymentProvider } = data;

  await job.progress(20);

  const Payment = require('../models/payment.model');
  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new Error('Payment not found');
  }

  await job.progress(40);

  let status;

  // Check payment status with provider
  switch (paymentProvider) {
    case 'stripe':
      const stripe = require('stripe')(process.env.STRIPE_SECRET);
      const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
      status = paymentIntent.status;
      break;

    case 'stcpay':
      // Implement STC Pay status check
      status = 'pending';
      break;

    case 'mada':
      // Implement Mada status check
      status = 'pending';
      break;

    default:
      throw new Error(`Unknown payment provider: ${paymentProvider}`);
  }

  await job.progress(70);

  // Update payment status in database
  payment.status = status;
  await payment.save();

  await job.progress(100);

  console.log(`✅ Synced payment status: ${paymentId} -> ${status}`);
  return {
    success: true,
    paymentId,
    status
  };
}

/**
 * Sync ZATCA invoice
 */
async function syncZATCAInvoice(data, job) {
  const { invoiceId } = data;

  await job.progress(10);

  const zatcaService = require('../services/zatcaService');
  const Invoice = require('../models/invoice.model');

  await job.progress(20);

  const invoice = await Invoice.findById(invoiceId);

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  await job.progress(30);

  // Submit invoice to ZATCA
  const result = await zatcaService.submitToZATCA(invoice);

  await job.progress(70);

  // Update invoice with ZATCA response
  invoice.zatcaSubmitted = true;
  invoice.zatcaUUID = result.uuid;
  invoice.zatcaHash = result.hash;
  invoice.zatcaSubmittedAt = new Date();
  await invoice.save();

  await job.progress(100);

  console.log(`✅ Synced invoice to ZATCA: ${invoiceId}`);
  return {
    success: true,
    invoiceId,
    zatcaUUID: result.uuid
  };
}

/**
 * Sync Mudad payment
 */
async function syncMudadPayment(data, job) {
  const { paymentId } = data;

  await job.progress(20);

  const mudadService = require('../services/mudad.service');

  await job.progress(40);

  // Check payment status with Mudad (SADAD)
  const status = await mudadService.checkPaymentStatus(paymentId);

  await job.progress(70);

  // Update payment record
  const Payment = require('../models/payment.model');
  await Payment.findOneAndUpdate(
    { mudadBillNumber: paymentId },
    {
      status: status.isPaid ? 'completed' : 'pending',
      paidAt: status.isPaid ? new Date(status.paidAt) : null,
      mudadStatus: status
    }
  );

  await job.progress(100);

  console.log(`✅ Synced Mudad payment: ${paymentId}`);
  return {
    success: true,
    paymentId,
    isPaid: status.isPaid
  };
}

/**
 * Sync Wathq contract
 */
async function syncWathqContract(data, job) {
  const { contractId } = data;

  await job.progress(20);

  const wathqService = require('../services/wathqService');

  await job.progress(40);

  // Check contract status with Wathq
  const status = await wathqService.getContractStatus(contractId);

  await job.progress(70);

  // Update contract record
  // Assuming you have a Contract model
  const Contract = require('../models/contract.model');
  await Contract.findByIdAndUpdate(contractId, {
    wathqStatus: status.status,
    wathqVerified: status.verified,
    wathqVerifiedAt: status.verified ? new Date() : null
  });

  await job.progress(100);

  console.log(`✅ Synced Wathq contract: ${contractId}`);
  return {
    success: true,
    contractId,
    status: status.status
  };
}

/**
 * Sync currency exchange rates
 */
async function syncCurrencyRates(data, job) {
  const { baseCurrency = 'SAR' } = data;

  await job.progress(10);

  const currencyService = require('../services/currency.service');

  await job.progress(30);

  // Fetch latest rates
  const rates = await currencyService.fetchLatestRates(baseCurrency);

  await job.progress(70);

  // Save to database/cache
  const { setWithExpiry } = require('../configs/redis');
  await setWithExpiry(
    `currency:rates:${baseCurrency}`,
    rates,
    3600 // Cache for 1 hour
  );

  await job.progress(100);

  console.log(`✅ Synced currency rates for ${baseCurrency}`);
  return {
    success: true,
    baseCurrency,
    ratesCount: Object.keys(rates).length
  };
}

module.exports = syncQueue;
