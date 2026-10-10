const nodemailer = require('nodemailer');
const db = require('../db');

/**
 * Helper to get configured Transporter or null if not enabled/configured
 */
function getTransporter() {
  const conf = db.getEmailConfig();
  if (!conf || !conf.is_enabled || !conf.smtp_host || !conf.smtp_user) {
    return null;
  }
  return {
    transporter: nodemailer.createTransport({
      host: conf.smtp_host,
      port: conf.smtp_port || 587,
      secure: conf.smtp_port === 465,
      auth: {
        user: conf.smtp_user,
        pass: conf.smtp_pass
      }
    }),
    from: conf.from_email || conf.smtp_user
  };
}

/**
 * Send email if configured, otherwise store in-app notification and return status
 */
async function sendNotificationEmail({ to, subject, htmlText, plainText, userId, type }) {
  const emailSetup = getTransporter();

  // Always create an in-app notification
  if (userId) {
    db.notifyUser({
      user_id: userId,
      title: subject,
      message: plainText || htmlText,
      type
    });
  }

  if (!emailSetup) {
    console.log(`[Email Service - In-App Only] Subject: "${subject}" to ${to}. (SMTP not configured)`);
    return {
      sent: false,
      reason: 'SMTP email provider is not enabled/configured. Notification delivered to internal user portal.'
    };
  }

  try {
    const info = await emailSetup.transporter.sendMail({
      from: `"Kenva Health Systems" <${emailSetup.from}>`,
      to,
      subject,
      text: plainText || htmlText,
      html: htmlText
    });
    console.log(`[Email Service - Sent] Message ID: ${info.messageId} to ${to}`);
    return {
      sent: true,
      messageId: info.messageId
    };
  } catch (err) {
    console.error(`[Email Service - Failed] Error sending to ${to}:`, err.message);
    return {
      sent: false,
      reason: `Email delivery failed: ${err.message}`
    };
  }
}

module.exports = {
  sendNotificationEmail,
  getTransporter
};
