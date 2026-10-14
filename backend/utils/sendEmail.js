const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    return null; // not configured — caller should skip sending
  }

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT) || 587,
    secure: Number(EMAIL_PORT) === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  return transporter;
}

// Sends an email if SMTP is configured; otherwise logs to console and
// resolves quietly. Never throws — a failed email should never break the
// booking/approval flow that triggered it.
async function sendEmail({ to, subject, text }) {
  const t = getTransporter();

  if (!t) {
    console.log(`[email skipped — SMTP not configured] To: ${to} | Subject: ${subject}`);
    return { sent: false, reason: "not_configured" };
  }

  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
    });
    return { sent: true };
  } catch (error) {
    console.error(`Email send failed (to: ${to}):`, error.message);
    return { sent: false, reason: "send_error" };
  }
}

module.exports = sendEmail;
