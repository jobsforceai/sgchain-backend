import nodemailer from 'nodemailer';
import { env } from 'core/config/env';
import { generateOtpEmailTemplate } from './templates/email-otp.template';
import logger from 'core/utils/logger';

// Create a transporter object
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

/**
 * Sends an email using the configured transporter.
 */
export const sendEmail = async (to: string, subject: string, html: string) => {
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    logger.warn('SMTP not configured. Email not sent.');
    logger.info(`[MOCK EMAIL] To: ${to}, Subject: ${subject}`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    logger.info(`Email sent: ${info.messageId}`);
  } catch (error) {
    logger.error('Error sending email:', error);
    throw new Error('EMAIL_SEND_FAILED');
  }
};

/**
 * Sends a verification OTP email to the user.
 */
export const sendVerificationOtpEmail = async (user: { email?: string; fullName: string }, otp: string) => {
  if (!user.email) {
    throw new Error('User has no email address');
  }
  const subject = 'Your Login Verification Code';
  const html = generateOtpEmailTemplate(otp);
  await sendEmail(user.email, subject, html);
};
