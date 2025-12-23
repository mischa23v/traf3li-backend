/**
 * Customer Health Queue Processor
 *
 * Handles asynchronous processing of:
 * - Individual firm health score calculations
 * - At-risk intervention emails
 * - Weekly churn reports
 * - Health score analytics
 */

const { createQueue } = require('../configs/queue');
const logger = require('../utils/logger');
const { Firm, User, Notification } = require('../models');

// Create customer health queue
const customerHealthQueue = createQueue('customer-health', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: {
      age: 172800, // Keep for 2 days
      count: 1000
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
      count: 500
    }
  }
});

/**
 * Process customer health jobs
 */
customerHealthQueue.process(async (job) => {
  const { type, data } = job.data;

  logger.info(`[CustomerHealth] Processing job ${job.id} of type: ${type}`);

  try {
    switch (type) {
      case 'calculate-health-score':
        return await calculateFirmHealthScore(data, job);

      case 'send-intervention-email':
        return await sendInterventionEmail(data, job);

      case 'generate-churn-report':
        return await generateChurnReport(data, job);

      case 'batch-calculate-health-scores':
        return await batchCalculateHealthScores(data, job);

      case 'send-health-notification':
        return await sendHealthNotification(data, job);

      default:
        throw new Error(`Unknown customer health job type: ${type}`);
    }
  } catch (error) {
    logger.error(`[CustomerHealth] Job ${job.id} failed:`, error.message);
    throw error;
  }
});

/**
 * Calculate health score for a single firm
 */
async function calculateFirmHealthScore(data, job) {
  const { firmId } = data;

  await job.progress(10);

  const firm = await Firm.findById(firmId)
    .select('_id name subscription usage lastActivityAt createdAt');

  if (!firm) {
    throw new Error(`Firm ${firmId} not found`);
  }

  await job.progress(30);

  // Calculate health score based on multiple factors
  const healthScore = await calculateHealthMetrics(firm);

  await job.progress(70);

  // Store health score in firm document
  await Firm.findByIdAndUpdate(firmId, {
    $set: {
      'health.score': healthScore.score,
      'health.category': healthScore.category,
      'health.metrics': healthScore.metrics,
      'health.lastCalculated': new Date(),
      'health.previousScore': firm.health?.score
    },
    $push: {
      'health.history': {
        $each: [{
          score: healthScore.score,
          category: healthScore.category,
          calculatedAt: new Date()
        }],
        $slice: -90 // Keep last 90 days
      }
    }
  });

  await job.progress(100);

  logger.info(`[CustomerHealth] Calculated health score for firm ${firmId}: ${healthScore.score}`);

  return {
    success: true,
    firmId,
    score: healthScore.score,
    category: healthScore.category,
    previousScore: firm.health?.score
  };
}

/**
 * Calculate health metrics for a firm
 */
async function calculateHealthMetrics(firm) {
  let score = 0;
  const metrics = {};

  // 1. Subscription Status (30 points)
  if (firm.subscription?.status === 'active') {
    if (firm.subscription.plan === 'enterprise') {
      score += 30;
      metrics.subscription = 30;
    } else if (firm.subscription.plan === 'professional') {
      score += 25;
      metrics.subscription = 25;
    } else if (firm.subscription.plan === 'starter') {
      score += 20;
      metrics.subscription = 20;
    }
  } else if (firm.subscription?.status === 'trial') {
    score += 15;
    metrics.subscription = 15;
  } else {
    score += 5;
    metrics.subscription = 5;
  }

  // 2. Activity Level (25 points)
  const daysSinceLastActivity = firm.lastActivityAt
    ? Math.floor((Date.now() - firm.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (daysSinceLastActivity <= 1) {
    score += 25;
    metrics.activity = 25;
  } else if (daysSinceLastActivity <= 7) {
    score += 20;
    metrics.activity = 20;
  } else if (daysSinceLastActivity <= 14) {
    score += 15;
    metrics.activity = 15;
  } else if (daysSinceLastActivity <= 30) {
    score += 10;
    metrics.activity = 10;
  } else {
    score += 0;
    metrics.activity = 0;
  }

  // 3. Usage Metrics (25 points)
  const usage = firm.usage || {};
  const plan = firm.subscription?.plan || 'free';

  const usageLimits = {
    free: { cases: 10, clients: 20, users: 2 },
    starter: { cases: 50, clients: 100, users: 5 },
    professional: { cases: 500, clients: 1000, users: 20 },
    enterprise: { cases: 9999, clients: 9999, users: 999 }
  };

  const limits = usageLimits[plan] || usageLimits.free;
  const usagePercent = Math.min(100, (
    ((usage.cases || 0) / limits.cases +
     (usage.clients || 0) / limits.clients +
     (usage.users || 0) / limits.users) / 3
  ) * 100);

  if (usagePercent >= 70) {
    score += 25;
    metrics.usage = 25;
  } else if (usagePercent >= 50) {
    score += 20;
    metrics.usage = 20;
  } else if (usagePercent >= 30) {
    score += 15;
    metrics.usage = 15;
  } else if (usagePercent >= 10) {
    score += 10;
    metrics.usage = 10;
  } else {
    score += 5;
    metrics.usage = 5;
  }

  // 4. Account Age & Stability (20 points)
  const daysSinceCreation = Math.floor((Date.now() - firm.createdAt.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceCreation >= 365) {
    score += 20;
    metrics.stability = 20;
  } else if (daysSinceCreation >= 180) {
    score += 15;
    metrics.stability = 15;
  } else if (daysSinceCreation >= 90) {
    score += 10;
    metrics.stability = 10;
  } else if (daysSinceCreation >= 30) {
    score += 5;
    metrics.stability = 5;
  } else {
    score += 3;
    metrics.stability = 3;
  }

  // Determine category based on score
  let category;
  if (score >= 80) {
    category = 'healthy';
  } else if (score >= 60) {
    category = 'at-risk';
  } else {
    category = 'critical';
  }

  return {
    score,
    category,
    metrics
  };
}

/**
 * Send intervention email to at-risk firm
 */
async function sendInterventionEmail(data, job) {
  const { firmId, interventionType } = data;

  await job.progress(20);

  const firm = await Firm.findById(firmId)
    .select('_id name ownerId health subscription');

  if (!firm) {
    throw new Error(`Firm ${firmId} not found`);
  }

  const owner = await User.findById(firm.ownerId)
    .select('_id email firstName lastName');

  if (!owner || !owner.email) {
    logger.warn(`[CustomerHealth] No owner email for firm ${firmId}`);
    return { success: false, reason: 'No owner email' };
  }

  await job.progress(50);

  // Queue email (if email queue is available)
  const emailQueue = require('./email.queue');

  const interventionMessages = {
    'inactive': {
      subject: 'We miss you at TRAF3LI!',
      html: `
        <h2>Hello ${owner.firstName},</h2>
        <p>We noticed you haven't been active on TRAF3LI recently. Is everything okay?</p>
        <p>We're here to help you get the most out of our platform. Here are some resources:</p>
        <ul>
          <li><a href="${process.env.FRONTEND_URL}/help">Help Center</a></li>
          <li><a href="${process.env.FRONTEND_URL}/tutorials">Video Tutorials</a></li>
          <li><a href="${process.env.FRONTEND_URL}/support">Contact Support</a></li>
        </ul>
        <p>Best regards,<br>The TRAF3LI Team</p>
      `
    },
    'low-usage': {
      subject: 'Unlock the full potential of TRAF3LI',
      html: `
        <h2>Hello ${owner.firstName},</h2>
        <p>We noticed you're using only a small portion of TRAF3LI's features.</p>
        <p>Did you know you can:</p>
        <ul>
          <li>Track time and expenses</li>
          <li>Generate invoices automatically</li>
          <li>Manage clients and cases</li>
          <li>Collaborate with your team</li>
        </ul>
        <p>Would you like a free demo? <a href="${process.env.FRONTEND_URL}/demo">Schedule here</a></p>
        <p>Best regards,<br>The TRAF3LI Team</p>
      `
    },
    'downgrade-risk': {
      subject: 'Important: Your TRAF3LI subscription',
      html: `
        <h2>Hello ${owner.firstName},</h2>
        <p>We noticed some changes in your account activity. We want to make sure you're getting value from your ${firm.subscription?.plan} plan.</p>
        <p>Our team is here to help you succeed. Would you like to:</p>
        <ul>
          <li>Schedule a call with our success team</li>
          <li>Get personalized onboarding</li>
          <li>Explore features you might have missed</li>
        </ul>
        <p><a href="${process.env.FRONTEND_URL}/contact">Contact us</a> - we're here to help!</p>
        <p>Best regards,<br>The TRAF3LI Team</p>
      `
    }
  };

  const message = interventionMessages[interventionType] || interventionMessages['inactive'];

  await emailQueue.add({
    type: 'transactional',
    data: {
      to: owner.email,
      subject: message.subject,
      html: message.html
    }
  }, {
    priority: 2
  });

  await job.progress(80);

  // Also create in-app notification
  await Notification.create({
    userId: owner._id,
    firmId: firm._id,
    type: 'system',
    title: 'Account Health Check',
    titleEn: 'Account Health Check',
    message: 'We sent you some tips to help you get more value from TRAF3LI',
    messageEn: 'We sent you some tips to help you get more value from TRAF3LI',
    priority: 'medium',
    link: '/settings/account'
  }).catch(() => {});

  await job.progress(100);

  logger.info(`[CustomerHealth] Sent ${interventionType} intervention to firm ${firmId}`);

  return {
    success: true,
    firmId,
    interventionType,
    email: owner.email
  };
}

/**
 * Generate weekly churn report
 */
async function generateChurnReport(data, job) {
  const { reportDate, recipients } = data;

  await job.progress(10);

  // Get all firms with health scores
  const firms = await Firm.find({
    'health.score': { $exists: true }
  }).select('_id name health subscription createdAt');

  await job.progress(30);

  // Categorize firms by health
  const healthyFirms = firms.filter(f => f.health?.category === 'healthy');
  const atRiskFirms = firms.filter(f => f.health?.category === 'at-risk');
  const criticalFirms = firms.filter(f => f.health?.category === 'critical');

  // Calculate average scores
  const avgScore = firms.length > 0
    ? firms.reduce((sum, f) => sum + (f.health?.score || 0), 0) / firms.length
    : 0;

  await job.progress(60);

  // Generate report HTML
  const reportHtml = `
    <h1>Weekly Customer Health Report</h1>
    <p>Report Date: ${reportDate || new Date().toISOString().split('T')[0]}</p>

    <h2>Summary</h2>
    <table border="1" cellpadding="10">
      <tr>
        <th>Metric</th>
        <th>Value</th>
      </tr>
      <tr>
        <td>Total Firms</td>
        <td>${firms.length}</td>
      </tr>
      <tr>
        <td>Average Health Score</td>
        <td>${avgScore.toFixed(1)}</td>
      </tr>
      <tr>
        <td>Healthy Firms</td>
        <td>${healthyFirms.length} (${((healthyFirms.length / firms.length) * 100).toFixed(1)}%)</td>
      </tr>
      <tr>
        <td>At-Risk Firms</td>
        <td>${atRiskFirms.length} (${((atRiskFirms.length / firms.length) * 100).toFixed(1)}%)</td>
      </tr>
      <tr>
        <td>Critical Firms</td>
        <td>${criticalFirms.length} (${((criticalFirms.length / firms.length) * 100).toFixed(1)}%)</td>
      </tr>
    </table>

    <h2>Critical Firms Requiring Attention</h2>
    <ul>
      ${criticalFirms.slice(0, 10).map(f => `
        <li>
          <strong>${f.name}</strong> -
          Score: ${f.health?.score || 'N/A'} -
          Plan: ${f.subscription?.plan || 'Free'}
        </li>
      `).join('')}
    </ul>

    <p><em>Generated by TRAF3LI Customer Health System</em></p>
  `;

  await job.progress(80);

  // Send report via email
  const emailQueue = require('./email.queue');

  const recipientList = recipients || ['admin@traf3li.com'];

  await emailQueue.add({
    type: 'transactional',
    data: {
      to: recipientList,
      subject: `Weekly Customer Health Report - ${reportDate || new Date().toISOString().split('T')[0]}`,
      html: reportHtml
    }
  });

  await job.progress(100);

  logger.info(`[CustomerHealth] Generated weekly churn report`);

  return {
    success: true,
    reportDate: reportDate || new Date(),
    totalFirms: firms.length,
    avgScore: avgScore.toFixed(1),
    healthy: healthyFirms.length,
    atRisk: atRiskFirms.length,
    critical: criticalFirms.length
  };
}

/**
 * Batch calculate health scores for multiple firms
 */
async function batchCalculateHealthScores(data, job) {
  const { firmIds, batchSize = 10 } = data;

  let processed = 0;
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < firmIds.length; i += batchSize) {
    const batch = firmIds.slice(i, i + batchSize);

    for (const firmId of batch) {
      try {
        await calculateFirmHealthScore({ firmId }, job);
        successful++;
      } catch (error) {
        logger.error(`[CustomerHealth] Failed to calculate health for firm ${firmId}:`, error.message);
        failed++;
      }
      processed++;
    }

    // Update progress
    await job.progress(Math.floor((processed / firmIds.length) * 100));
  }

  logger.info(`[CustomerHealth] Batch calculation complete: ${successful} successful, ${failed} failed`);

  return {
    success: true,
    total: firmIds.length,
    successful,
    failed
  };
}

/**
 * Send health-related notification
 */
async function sendHealthNotification(data, job) {
  const { firmId, userId, message, priority = 'medium' } = data;

  await job.progress(50);

  await Notification.create({
    userId,
    firmId,
    type: 'system',
    title: 'Customer Health Update',
    titleEn: 'Customer Health Update',
    message,
    messageEn: message,
    priority,
    link: '/analytics/health'
  });

  await job.progress(100);

  logger.info(`[CustomerHealth] Sent health notification to user ${userId}`);

  return {
    success: true,
    userId,
    firmId
  };
}

module.exports = customerHealthQueue;
