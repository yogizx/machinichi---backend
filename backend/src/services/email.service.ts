import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let _transporter: nodemailer.Transporter | null = null;
let _isMock = false;

const logTransport = {
  name: 'log-transport',
  version: '1.0.0',
  send: (mail: any, callback: any) => {
    const envelope = mail.data.envelope || mail.message.getEnvelope();
    const messageId = mail.message.getHeader('message-id') || 'mock-message-id';
    console.log(`\n=================== [MOCK EMAIL LOG] ===================`);
    console.log(`From:    ${mail.data.from}`);
    console.log(`To:      ${mail.data.to}`);
    console.log(`Subject: ${mail.data.subject}`);
    console.log(`--------------------------------------------------------`);
    const htmlContent = mail.data.html || '';
    const textContent = mail.data.text || '';
    if (textContent) {
      console.log(textContent);
    } else {
      const cleanText = htmlContent
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // remove styles
        .replace(/<[^>]*>/g, ' ')                      // remove tags
        .replace(/\s+/g, ' ')                          // normalize spaces
        .trim();
      console.log(cleanText);
    }
    console.log(`========================================================\n`);

    const info = {
      envelope,
      messageId,
      accepted: [mail.data.to].flat(),
      rejected: [],
      pending: [],
      response: '250 OK'
    };
    callback(null, info);
  },
  verify: (callback: any) => {
    callback(null, true);
  }
};

const hasSmtpConfig = (): boolean => {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_EMAIL &&
    process.env.SMTP_PASSWORD &&
    process.env.EMAIL_FROM
  );
};

const getTransporter = (): nodemailer.Transporter => {
  if (!_transporter) {
    if (!hasSmtpConfig()) {
      _isMock = true;
      _transporter = nodemailer.createTransport(logTransport as any);
    } else {
      _isMock = false;
      const host = process.env.SMTP_HOST || 'smtp.gmail.com';
      const port = Number(process.env.SMTP_PORT) || 587;
      if (host.includes('gmail.com')) {
        _transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
          },
          connectionTimeout: 15000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        });
      } else {
        _transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          requireTLS: port === 587,
          auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
          },
          connectionTimeout: 15000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        });
      }
    }
  }
  return _transporter;
};

export const verifySmtpConfig = async (): Promise<boolean> => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_EMAIL;
  const smtpPass = process.env.SMTP_PASSWORD;
  const emailFrom = process.env.EMAIL_FROM;

  console.log(`[SMTP STARTUP] SMTP_HOST configured: ${smtpHost ? 'YES' : 'NO'}`);
  console.log(`[SMTP STARTUP] SMTP_PORT configured: ${smtpPort ? 'YES' : 'NO'}`);
  console.log(`[SMTP STARTUP] SMTP_EMAIL configured: ${smtpUser ? 'YES' : 'NO'}`);
  console.log(`[SMTP STARTUP] SMTP_PASSWORD configured: ${smtpPass ? 'YES' : 'NO'}`);
  console.log(`[SMTP STARTUP] EMAIL_FROM configured: ${emailFrom ? 'YES' : 'NO'}`);

  if (!hasSmtpConfig()) {
    console.warn(`[SMTP STARTUP] Missing SMTP settings. Emails will not be sent until the SMTP configuration is corrected.`);
    _isMock = true;
    _transporter = null;
    return false;
  }

  try {
    _isMock = false;
    _transporter = null;
    const transporter = getTransporter();
    await transporter.verify();
    console.log(`[SMTP STARTUP] CONNECTION SUCCESSFUL - SMTP is ready`);
    return true;
  } catch (err: any) {
    console.error(`[SMTP STARTUP] CONNECTION FAILED - Reason: ${err.message}`);
    if (process.env.SMTP_HOST?.includes('gmail.com') && /Username and Password not accepted/i.test(err.message)) {
      console.error('[SMTP STARTUP] Gmail authentication failed. Verify SMTP_EMAIL and SMTP_PASSWORD are correct and use a valid Gmail App Password if 2-Step Verification is enabled.');
    }
    _transporter = null;
    return false;
  }
};

const BRAND = {
  name: 'Machinichi',
  tagline: 'The Modern General Store',
  primaryColor: '#ad4d00',
  secondaryColor: '#3a1100',
  bgLight: '#fbf5ef',
  bgCard: '#ffffff',
  textDark: '#17120f',
  textMuted: '#6f7b91',
  accent: '#a68135',
};

const emailHead = `
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${BRAND.name}</title>`;

const emailStyles = `
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${BRAND.bgLight}; -webkit-font-smoothing: antialiased; }
  .wrapper { background-color: ${BRAND.bgLight}; padding: 32px 16px; }
  .container { max-width: 520px; margin: 0 auto; background-color: ${BRAND.bgCard}; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.06); }
  .header { padding: 32px 32px 0; text-align: center; }
  .logo { font-size: 28px; font-weight: 900; letter-spacing: -0.03em; color: ${BRAND.textDark}; }
  .logo span { color: ${BRAND.primaryColor}; }
  .tagline { font-size: 13px; color: ${BRAND.textMuted}; margin-top: 4px; }
  .divider { height: 1px; background: linear-gradient(to right, transparent, #e8ddd0, transparent); margin: 20px 32px; }
  .body-content { padding: 0 32px 24px; }
  .greeting { font-size: 16px; font-weight: 700; color: ${BRAND.textDark}; margin-bottom: 12px; }
  .text { font-size: 15px; line-height: 1.6; color: #3d3834; margin-bottom: 16px; }
  .text-muted { font-size: 14px; line-height: 1.5; color: ${BRAND.textMuted}; margin-bottom: 16px; }
  .cta-wrapper { text-align: center; margin: 24px 0; }
  .cta { display: inline-block; padding: 14px 36px; background-color: ${BRAND.primaryColor}; color: #ffffff !important; text-decoration: none; border-radius: 40px; font-size: 16px; font-weight: 800; letter-spacing: 0.02em; box-shadow: 0 8px 20px rgba(173,77,0,0.25); transition: all 0.2s; }
  .cta:hover { background-color: #9d4500; transform: translateY(-1px); }
  .otp-box { text-align: center; padding: 20px; background: #f8f2ec; border-radius: 12px; letter-spacing: 12px; font-size: 36px; font-weight: 900; color: ${BRAND.primaryColor}; margin: 20px 0; }
  .security-badge { display: flex; align-items: center; gap: 8px; background: #fff8f0; border: 1px solid #f0e4d6; border-radius: 8px; padding: 12px 16px; margin: 20px 0; font-size: 13px; color: ${BRAND.textMuted}; }
  .security-badge strong { color: ${BRAND.secondaryColor}; }
  .footer { background: #f8f2ec; padding: 24px 32px; text-align: center; }
  .footer-text { font-size: 12px; color: #a79d96; line-height: 1.6; }
  .footer-text a { color: ${BRAND.primaryColor}; text-decoration: none; }
  .support-section { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e8ddd0; }
  .support-text { font-size: 13px; color: ${BRAND.textMuted}; line-height: 1.5; }
  @media only screen and (max-width: 480px) {
    .wrapper { padding: 16px 8px; }
    .container { border-radius: 12px; }
    .header { padding: 24px 20px 0; }
    .body-content { padding: 0 20px 20px; }
    .divider { margin: 16px 20px; }
    .footer { padding: 20px; }
    .otp-box { font-size: 28px; letter-spacing: 8px; }
  }
</style>`;

const buildHtml = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>${emailHead}${emailStyles}</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">${BRAND.name}<span>.</span></div>
        <p class="tagline">${BRAND.tagline}</p>
      </div>
      <div class="divider"></div>
      <div class="body-content">
        ${content}
      </div>
      <div class="footer">
        <p class="footer-text">
          ${BRAND.name} &mdash; The Modern General Store<br>
          If you did not request this email, please ignore it or <a href="mailto:support@machinichi.com">contact support</a>.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

export const sendWelcomeEmail = async (to: string, userName: string) => {
  console.log(`[EMAIL] Welcome email function called`);
  console.log(`[EMAIL] User name: ${userName}`);

  const maskedTo = to.includes('@')
    ? to.split('@')[0].slice(0, 1) + '***@' + to.split('@')[1]
    : '***';
  console.log(`[EMAIL] Recipient: ${maskedTo}`);

  console.log(`[EMAIL] SMTP_HOST configured: ${process.env.SMTP_HOST ? 'YES' : 'NO'}`);
  console.log(`[EMAIL] SMTP_PORT configured: ${process.env.SMTP_PORT ? 'YES' : 'NO'}`);
  console.log(`[EMAIL] SMTP_EMAIL configured: ${process.env.SMTP_EMAIL ? 'YES' : 'NO'}`);
  console.log(`[EMAIL] SMTP_PASSWORD configured: ${process.env.SMTP_PASSWORD ? 'YES' : 'NO'}`);
  console.log(`[EMAIL] EMAIL_FROM configured: ${process.env.EMAIL_FROM ? 'YES' : 'NO'}`);

  if (!hasSmtpConfig()) {
    console.error(`[EMAIL] WELCOME EMAIL FAILED`);
    console.error(`[EMAIL] Reason: One or more SMTP environment variables are missing or invalid`);
    throw new Error('SMTP configuration missing in environment variables');
  }

  const content = `
    <p class="greeting">Hello ${userName},</p>
    <p class="text">Welcome to our Machinichi Shop!</p>
    <p class="text">Your account has been created successfully.</p>
    <p class="text">You can now sign in to your Machinichi account using your registered email address and password.</p>
    <p class="text">Thank you for joining Machinichi.</p>
    <p class="text" style="margin-top: 24px;">Regards,<br><strong>Machinichi Team</strong></p>
  `;

  console.log(`[EMAIL] Connecting to SMTP...`);
  const transporter = getTransporter();

  try {
    await transporter.verify();
    console.log(`[EMAIL] SMTP authentication: SUCCESS`);
  } catch (verifyError: any) {
    console.error(`[EMAIL] WELCOME EMAIL FAILED`);
    console.error(`[EMAIL] Error Code: ${verifyError.code || 'UNKNOWN'}`);
    console.error(`[EMAIL] Reason: ${verifyError.message}`);
    throw verifyError;
  }

  console.log(`[EMAIL] Sending welcome email...`);
  const info = await transporter.sendMail({
    from: `"${BRAND.name}" <${process.env.EMAIL_FROM}>`,
    to,
    subject: `Welcome to Machinichi – Your Account Has Been Created Successfully`,
    html: buildHtml(content),
  });

  const accepted = !!(info.accepted && info.accepted.includes(to));
  console.log(`[EMAIL] Recipient accepted: ${accepted ? 'YES' : 'NO'}`);
  console.log(`[EMAIL] Message ID: ${info.messageId || 'none'}`);

  if (!accepted) {
    console.error(`[EMAIL] WELCOME EMAIL FAILED`);
    console.error(`[EMAIL] Reason: Recipient was not accepted by SMTP server`);
    throw new Error('Recipient was not accepted by SMTP server');
  }

  console.log(`[EMAIL] WELCOME EMAIL SENT SUCCESSFULLY`);
};

export const sendPasswordResetEmail = async (to: string, resetLink: string, userName?: string) => {
  const greeting = userName ? `Hello ${userName},` : 'Hello,';
  const content = `
    <p class="greeting">${greeting}</p>
    <p class="text">We received a request to reset the password for your ${BRAND.name} account. Click the button below to create a new password.</p>
    <p class="text-muted">This link expires in <strong>30 minutes</strong>. If you don't use it within that time, you'll need to request a new one.</p>
    <div class="cta-wrapper">
      <a href="${resetLink}" class="cta">Reset Password</a>
    </div>
    <div class="security-badge">
      <span style="font-size:18px;">🔒</span>
      <span>If you didn't request this, please ignore this email. Your account remains secure.</span>
    </div>
    <div class="support-section">
      <p class="support-text">Need help? <a href="mailto:support@machinichi.com">Contact our support team</a> and we'll be happy to assist.</p>
    </div>
  `;

  await getTransporter().sendMail({
    from: `"${BRAND.name}" <${process.env.EMAIL_FROM}>`,
    to,
    subject: `Reset Your ${BRAND.name} Password`,
    html: buildHtml(content),
  });
};

export const sendResetSuccessEmail = async (to: string, userName?: string) => {
  const greeting = userName ? `Hello ${userName},` : 'Hello,';
  const content = `
    <p class="greeting">${greeting}</p>
    <p class="text">Your ${BRAND.name} password has been changed successfully.</p>
    <p class="text">If you made this change, no further action is needed. If you did <strong>not</strong> change your password, please secure your account immediately.</p>
    <div class="cta-wrapper">
      <a href="${process.env.CLIENT_URL}/signin" class="cta">Sign In</a>
    </div>
    <div class="security-badge">
      <span style="font-size:18px;">✅</span>
      <span>This is a security confirmation. Keep this email for your records.</span>
    </div>
    <div class="support-section">
      <p class="support-text">If you suspect unauthorized access, contact <a href="mailto:support@machinichi.com">support@machinichi.com</a> immediately.</p>
    </div>
  `;

  await getTransporter().sendMail({
    from: `"${BRAND.name}" <${process.env.EMAIL_FROM}>`,
    to,
    subject: `Password Changed Successfully — ${BRAND.name}`,
    html: buildHtml(content),
  });
};

export const sendEmailVerificationEmail = async (to: string, otp: string, userName?: string) => {
  const greeting = userName ? `Hello ${userName},` : 'Hello,';
  const content = `
    <p class="greeting">${greeting}</p>
    <p class="text">Thank you for joining ${BRAND.name}! Please verify your email address using the code below.</p>
    <div class="otp-box">${otp}</div>
    <p class="text-muted">This code expires in <strong>10 minutes</strong>. Do not share this code with anyone.</p>
    <div class="security-badge">
      <span style="font-size:18px;">🛡️</span>
      <span>We will never ask for your password or OTP via email or phone.</span>
    </div>
  `;

  await getTransporter().sendMail({
    from: `"${BRAND.name}" <${process.env.EMAIL_FROM}>`,
    to,
    subject: `Verify Your Email — ${BRAND.name}`,
    html: buildHtml(content),
  });
};

export const sendGoogleWelcomeEmail = async (to: string, userName: string) => {
  const content = `
    <p class="greeting">Welcome to ${BRAND.name}, ${userName}!</p>
    <p class="text">You've successfully signed in with Google. Your account is now linked and ready to use.</p>
    <p class="text">Explore our premium collection of dry fruits, traditional snacks, and everyday essentials curated just for you.</p>
    <div class="cta-wrapper">
      <a href="${process.env.CLIENT_URL}" class="cta">Explore Store</a>
    </div>
    <div class="security-badge">
      <span style="font-size:18px;">🛡️</span>
      <span>This account uses Google authentication. Manage your sign-in methods from your account settings.</span>
    </div>
  `;

  await getTransporter().sendMail({
    from: `"${BRAND.name}" <${process.env.EMAIL_FROM}>`,
    to,
    subject: `Welcome to ${BRAND.name} — Google Sign-In Successful!`,
    html: buildHtml(content),
  });
};

export const sendOTPEmail = async (to: string, otp: string, purpose: string) => {
  const subject = purpose === 'password_reset'
    ? `Reset Your ${BRAND.name} Password`
    : `Verify Your Email — ${BRAND.name}`;

  const content = `
    <p class="text">${purpose === 'password_reset' ? 'Use the code below to reset your password.' : 'Use the code below to verify your account.'}</p>
    <div class="otp-box">${otp}</div>
    <p class="text-muted">This code expires in <strong>10 minutes</strong>. Do not share this code with anyone.</p>
    <div class="security-badge">
      <span style="font-size:18px;">🛡️</span>
      <span>We will never ask for your password or OTP via email or phone.</span>
    </div>
  `;

  await getTransporter().sendMail({
    from: `"${BRAND.name}" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html: buildHtml(content),
  });
};

export const sendAnalyticsReportEmail = async (
  to: string,
  reportType: string,
  format: string,
  attachmentBuffer: Buffer,
  fileName: string
) => {
  console.log(`[EMAIL] sendAnalyticsReportEmail called for: ${to}`);

  if (!hasSmtpConfig()) {
    console.error(`[EMAIL] ANALYTICS REPORT EMAIL FAILED - SMTP configuration missing`);
    throw new Error('SMTP configuration missing in environment variables');
  }

  const emailBody = `Hello,

Your requested analytics report has been generated successfully.

Please find the attached report.

Report Type:
${reportType}

Format:
${format}

Generated Date:
${new Date().toLocaleString()}

Thank you,

Machinichi Team`;

  const transporter = getTransporter();
  await transporter.verify();

  const info = await transporter.sendMail({
    from: `"${BRAND.name}" <${process.env.EMAIL_FROM}>`,
    to,
    subject: `Machinichi Analytics Report`,
    text: emailBody,
    html: emailBody.replace(/\n/g, '<br>'),
    attachments: [
      {
        filename: fileName,
        content: attachmentBuffer,
      }
    ]
  });

  const accepted = !!(info.accepted && info.accepted.includes(to));
  if (!accepted) {
    throw new Error('Recipient was not accepted by SMTP server');
  }

  console.log(`[EMAIL] ANALYTICS REPORT EMAIL SENT SUCCESSFULLY to ${to}`);
};

export const testTransporter = async () => {
  try {
    await getTransporter().verify();
    console.log('SMTP transporter is ready');
    return true;
  } catch (error) {
    console.error('SMTP transporter verification failed:', error);
    return false;
  }
};
