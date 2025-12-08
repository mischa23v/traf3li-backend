/**
 * Email Queue Processor
 *
 * Handles asynchronous email sending using Resend.
 * Supports transactional emails, bulk campaigns, and templates.
 */

const { createQueue } = require('../configs/queue');
const { Resend } = require('resend');

// Initialize Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const RESEND_CONFIG = {
  fromEmail: process.env.FROM_EMAIL || 'onboarding@resend.dev',
  fromName: process.env.FROM_NAME || 'TRAF3LI',
};

// Create email queue
const emailQueue = createQueue('email', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000
    },
    removeOnComplete: {
      age: 86400,
      count: 500
    }
  }
});

/**
 * Process email jobs
 */
emailQueue.process(async (job) => {
  const { type, data } = job.data;

  console.log(`📧 Processing email job ${job.id} of type: ${type}`);

  try {
    switch (type) {
      case 'transactional':
        return await sendTransactionalEmail(data, job);

      case 'bulk':
        return await sendBulkEmails(data, job);

      case 'template':
        return await sendTemplateEmail(data, job);

      case 'campaign':
        return await sendCampaignEmail(data, job);

      default:
        throw new Error(`Unknown email type: ${type}`);
    }
  } catch (error) {
    console.error(`❌ Email job ${job.id} failed:`, error.message);
    throw error;
  }
});

/**
 * Send transactional email
 */
async function sendTransactionalEmail(data, job) {
  const { to, subject, html, text, replyTo, attachments, tags } = data;

  if (!resend) {
    throw new Error('Resend API key not configured');
  }

  await job.progress(25);

  const emailData = {
    from: `${RESEND_CONFIG.fromName} <${RESEND_CONFIG.fromEmail}>`,
    to: Array.isArray(to) ? to : [to],
    subject,
    html: html || text,
    ...(text && { text }),
    ...(replyTo && { reply_to: replyTo }),
    ...(attachments && { attachments }),
    ...(tags && { tags })
  };

  await job.progress(50);

  const result = await resend.emails.send(emailData);

  await job.progress(100);

  console.log(`✅ Transactional email sent: ${result.id}`);
  return {
    success: true,
    messageId: result.id,
    to: emailData.to,
    subject
  };
}

/**
 * Send bulk emails (multiple recipients)
 */
async function sendBulkEmails(data, job) {
  const { recipients, subject, html, text } = data;

  if (!resend) {
    throw new Error('Resend API key not configured');
  }

  const results = [];
  const total = recipients.length;

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];

    try {
      const emailData = {
        from: `${RESEND_CONFIG.fromName} <${RESEND_CONFIG.fromEmail}>`,
        to: recipient.email,
        subject: subject.replace('{{name}}', recipient.name || recipient.email),
        html: html
          .replace('{{name}}', recipient.name || recipient.email)
          .replace('{{email}}', recipient.email),
        ...(text && {
          text: text
            .replace('{{name}}', recipient.name || recipient.email)
            .replace('{{email}}', recipient.email)
        })
      };

      const result = await resend.emails.send(emailData);

      results.push({
        email: recipient.email,
        success: true,
        messageId: result.id
      });

      // Update progress
      await job.progress(Math.floor(((i + 1) / total) * 100));

    } catch (error) {
      console.error(`Failed to send to ${recipient.email}:`, error.message);
      results.push({
        email: recipient.email,
        success: false,
        error: error.message
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Bulk emails sent: ${successCount}/${total}`);

  return {
    success: true,
    total,
    successCount,
    failedCount: total - successCount,
    results
  };
}

/**
 * Send template-based email
 */
async function sendTemplateEmail(data, job) {
  const { to, templateId, templateData, subject } = data;

  if (!resend) {
    throw new Error('Resend API key not configured');
  }

  await job.progress(50);

  // Note: Resend doesn't have built-in templates like SendGrid
  // You would need to fetch the template from your database and render it
  const emailData = {
    from: `${RESEND_CONFIG.fromName} <${RESEND_CONFIG.fromEmail}>`,
    to: Array.isArray(to) ? to : [to],
    subject,
    html: renderTemplate(templateId, templateData)
  };

  const result = await resend.emails.send(emailData);

  await job.progress(100);

  console.log(`✅ Template email sent: ${result.id}`);
  return {
    success: true,
    messageId: result.id,
    templateId,
    to: emailData.to
  };
}

/**
 * Send campaign email
 */
async function sendCampaignEmail(data, job) {
  const { campaignId, recipient, subject, html, trackingId } = data;

  if (!resend) {
    throw new Error('Resend API key not configured');
  }

  await job.progress(30);

  // Add tracking parameters to links
  const trackedHtml = html.replace(
    /<a\s+href="([^"]+)"/g,
    `<a href="$1?campaign=${campaignId}&recipient=${trackingId}"`
  );

  await job.progress(60);

  const emailData = {
    from: `${RESEND_CONFIG.fromName} <${RESEND_CONFIG.fromEmail}>`,
    to: recipient.email,
    subject: subject.replace('{{name}}', recipient.name || recipient.email),
    html: trackedHtml.replace('{{name}}', recipient.name || recipient.email),
    tags: {
      campaign: campaignId,
      recipient: trackingId
    }
  };

  const result = await resend.emails.send(emailData);

  await job.progress(100);

  console.log(`✅ Campaign email sent: ${result.id}`);
  return {
    success: true,
    messageId: result.id,
    campaignId,
    recipientEmail: recipient.email
  };
}

/**
 * Simple template renderer (you can replace with a proper template engine)
 */
function renderTemplate(templateId, data) {
  // This is a placeholder - implement your own template rendering logic
  // You might want to fetch templates from database and use Handlebars, EJS, etc.
  let html = `<p>Template ${templateId} content here</p>`;

  // Simple variable replacement
  if (data) {
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, data[key]);
    });
  }

  return html;
}

module.exports = emailQueue;
