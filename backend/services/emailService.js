const nodemailer = require('nodemailer');
const db = require('../db');

/**
 * Helper to get configured Transporter or null if not enabled/configured
 * Checks Admin DB configuration first, then falls back to environment variables (.env).
 */
function getTransporter() {
  const conf = db.getEmailConfig();

  // 1. Check DB configuration first (configured via Admin UI)
  if (conf && conf.is_enabled && conf.smtp_host && conf.smtp_user && conf.smtp_pass) {
    return {
      transporter: nodemailer.createTransport({
        host: conf.smtp_host,
        port: Number(conf.smtp_port) || 587,
        secure: Number(conf.smtp_port) === 465,
        auth: {
          user: conf.smtp_user,
          pass: conf.smtp_pass
        }
      }),
      from: conf.from_email || conf.smtp_user
    };
  }

  // 2. Fallback to process.env (.env file in backend directory)
  const envHost = process.env.SMTP_HOST;
  const envUser = process.env.SMTP_USER;
  const envPass = process.env.SMTP_PASS;
  const envPort = Number(process.env.SMTP_PORT || '587');
  const envFrom = process.env.FROM_EMAIL || envUser;

  if (envHost && envUser && envPass) {
    return {
      transporter: nodemailer.createTransport({
        host: envHost,
        port: envPort,
        secure: envPort === 465,
        auth: {
          user: envUser,
          pass: envPass
        }
      }),
      from: envFrom
    };
  }

  return null;
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
