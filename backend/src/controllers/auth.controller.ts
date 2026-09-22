import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { OTP } from '../models/OTP';
import { AuthRequest } from '../middlewares/auth.middleware';
import { generateAuthTokens, verifyRefreshToken, revokeRefreshToken } from '../services/token.service';
import { sendPasswordResetEmail, sendResetSuccessEmail, sendWelcomeEmail } from '../services/email.service';

const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const setAdminRefreshCookie = (res: Response, token: string) => {
  res.cookie('adminRefreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const sanitize = (str: string): string => {
  return str.replace(/[<>"']/g, '');
};

const maskPhone = (num: string): string => {
  if (!num) return '';
  if (num.length <= 4) return num;
  return num.slice(0, 3) + '*'.repeat(num.length - 5) + num.slice(-2);
};

export const checkUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, phone } = req.body;
    const result: any = { emailExists: false, phoneExists: false };

    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
      result.emailExists = !!existingEmail;
    }
    if (phone) {
      const existingPhone = await User.findOne({ phone });
      result.phoneExists = !!existingPhone;
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ message: 'Check failed', error: err });
  }
};

export const sendPhoneOTP = async (req: Request, res: Response): Promise<any> => {
  try {
    const { phone, devMode, email } = req.body;
    console.log(`[OTP] Send request received for: ${maskPhone(phone)}`);

    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingEmail) {
        console.log(`[OTP] Fail: Email ${email} already registered`);
        return res.status(409).json({ message: 'Email already registered' });
      }
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      console.log(`[OTP] Fail: Phone number already registered`);
      return res.status(409).json({ message: 'Phone number already registered' });
    }

    console.log(`[OTP] Phone validation: OK`);

    const existingOtp = await OTP.findOne({ identifier: phone, type: 'phone_verify' });
    if (existingOtp?.lockedUntil && existingOtp.lockedUntil > new Date()) {
      const remaining = Math.ceil((existingOtp.lockedUntil.getTime() - Date.now()) / 60000);
      console.log(`[OTP] Fail: OTP verification locked`);
      return res.status(429).json({ message: `OTP verification locked. Try again in ${remaining} minutes.` });
    }

    if (existingOtp) {
      const cooldown = (Date.now() - (existingOtp as any).createdAt.getTime()) / 1000;
      if (cooldown < 60) {
        console.log(`[OTP] Fail: Cooldown active`);
        return res.status(429).json({ message: `Please wait ${Math.ceil(60 - cooldown)} seconds before requesting a new OTP.` });
      }
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.deleteMany({ identifier: phone, type: 'phone_verify' });
    await OTP.create({
      identifier: phone,
      otp,
      type: 'phone_verify',
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (devMode === true && process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] OTP for ${phone}: ${otp}`);
      console.log(`[OTP] Final result: SENT (dev mode)`);
      return res.status(200).json({ message: 'OTP sent (dev mode)', otp });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const smsFrom = process.env.TWILIO_SMS_FROM;
    const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

    if (!accountSid || !authToken) {
      console.error(`[OTP] Configuration error: Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN`);
      return res.status(500).json({ message: 'Unable to send OTP. SMS provider credentials not configured.' });
    }

    console.log(`[OTP] Required configuration: OK`);
    console.log(`[OTP] SMS provider: Twilio`);

    const from = smsFrom || whatsappFrom;
    if (!from) {
      console.error(`[OTP] Configuration error: Neither TWILIO_SMS_FROM nor TWILIO_WHATSAPP_FROM is configured.`);
      return res.status(500).json({ message: 'Unable to send OTP. Twilio sender number is not configured.' });
    }

    const isWhatsapp = from.startsWith('whatsapp:');
    const to = isWhatsapp ? `whatsapp:${phone}` : phone;
    const body = isWhatsapp
      ? `Your Machinichi verification code is: *${otp}*\n\nThis OTP expires in 5 minutes. Do not share it with anyone.`
      : `Your Machinichi verification code is: ${otp}. This OTP expires in 5 minutes.`;

    console.log(`[OTP] Provider request initiated from=${isWhatsapp ? 'whatsapp' : 'sms'}`);

    try {
      const twilio = require('twilio');
      const client = twilio(accountSid, authToken);
      const message = await client.messages.create({ from, to, body });

      console.log(`[OTP] Provider HTTP status: 201`);
      console.log(`[OTP] Provider accepted message: YES`);
      console.log(`[OTP] Provider message/request ID: ${message.sid}`);
      console.log(`[OTP] Final result: SENT`);

      return res.status(200).json({
        message: isWhatsapp
          ? 'OTP sent to your WhatsApp. Please ensure you have joined the Twilio WhatsApp sandbox if using a trial account.'
          : 'OTP sent successfully to your phone.'
      });
    } catch (twilioErr: any) {
      console.error(`[OTP] Twilio delivery failed:`, twilioErr);
      console.log(`[OTP] Final result: FAILED`);
      return res.status(400).json({
        message: `Unable to send OTP. ${twilioErr.message || 'Twilio delivery failure.'}`
      });
    }
  } catch (err: any) {
    console.error(`[OTP] System error:`, err);
    return res.status(500).json({ message: 'Failed to send OTP', error: err.message });
  }
};

export const verifyPhoneOTP = async (req: Request, res: Response): Promise<any> => {
  try {
    const { phone, otp } = req.body;
    const record = await OTP.findOne({ identifier: phone, type: 'phone_verify' });

    if (!record) return res.status(400).json({ message: 'OTP not found. Request a new one.' });

    if (record.lockedUntil && record.lockedUntil > new Date()) {
      const remaining = Math.ceil((record.lockedUntil.getTime() - Date.now()) / 60000);
      return res.status(429).json({ message: `Too many failed attempts. Locked for ${remaining} minutes.` });
    }

    if (record.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired. Request a new one.' });

    if (record.otp !== otp) {
      record.attempts += 1;
      if (record.attempts >= 5) {
        record.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await record.save();
      const remaining = 5 - record.attempts;
      if (remaining <= 0) {
        return res.status(429).json({ message: 'Too many failed attempts. OTP locked for 15 minutes.' });
      }
      return res.status(400).json({ message: `Invalid OTP. ${remaining} attempt(s) remaining.` });
    }

    record.isVerified = true;
    record.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // verified status valid for 10 minutes
    await record.save();

    return res.status(200).json({ message: 'Phone verified successfully', verified: true });
  } catch (err) {
    return res.status(500).json({ message: 'OTP verification failed', error: err });
  }
};

export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    console.log(`[REGISTER] Registration started`);
    const { fullName, email, phone, password, countryCode } = req.body;

    const cleanName = sanitize(fullName.trim());
    const cleanEmail = email.toLowerCase().trim();
    const fullPhone = `${countryCode || '+91'}${phone}`;

    // Verify phone verification OTP record exists and is verified
    const verifiedRecord = await OTP.findOne({
      identifier: fullPhone,
      type: 'phone_verify',
      isVerified: true,
    });

    if (!verifiedRecord) {
      console.log(`[REGISTER] Fail: Phone number ${maskPhone(fullPhone)} was not verified via OTP`);
      return res.status(400).json({ message: 'Phone number has not been verified. Please verify using OTP.' });
    }

    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) return res.status(409).json({ message: 'Email already registered' });

    const existingPhone = await User.findOne({ phone: fullPhone });
    if (existingPhone) return res.status(409).json({ message: 'Phone already registered' });

    const user = await User.create({
      fullName: cleanName,
      email: cleanEmail,
      phone: fullPhone,
      password,
      provider: 'local',
      isPhoneVerified: true,
      role: 'customer',
    });

    // Delete verified record so it cannot be reused
    await OTP.deleteOne({ _id: verifiedRecord._id });

    console.log(`[REGISTER] User created successfully`);
    console.log(`[EMAIL] Welcome email triggered`);

    let emailSent = true;
    try {
      await sendWelcomeEmail(cleanEmail, cleanName);
    } catch (emailErr: any) {
      console.error(`[EMAIL] WELCOME EMAIL FAILED`);
      console.error(`[EMAIL] Error Code: ${emailErr.code || 'UNKNOWN'}`);
      console.error(`[EMAIL] Reason: ${emailErr.message}`);
      emailSent = false;
    }

    return res.status(201).json({
      message: emailSent
        ? 'Welcome to our Machinichi Shop, Your Account Has Been Created Successfully.'
        : 'Welcome to our Machinichi Shop, Your Account Has Been Created Successfully (Welcome email delivery failed).',
      user: { id: user._id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role },
    });
  } catch (err: any) {
    console.error("Registration Error:", err);
    return res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { identifier, password } = req.body;

    const isEmail = identifier.includes('@');
    const query = isEmail
      ? { email: identifier.toLowerCase().trim() }
      : { phone: { $regex: identifier.trim() + '$' } };

    const user = await User.findOne({ ...query, provider: 'local' }).select('+password');

    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    if (user.isLocked)
      return res.status(403).json({ message: 'Account locked due to too many attempts. Try again in 15 minutes.' });

    if (user.isBlocked)
      return res.status(403).json({ message: 'Account is blocked. Contact support.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();
      const remaining = 5 - user.failedLoginAttempts;
      return res.status(401).json({
        message: remaining > 0
          ? `Invalid credentials. ${remaining} attempt(s) remaining.`
          : 'Account locked for 15 minutes.',
      });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    user.lastLoginIp = req.ip || '';
    user.lastLoginDevice = req.headers['user-agent'] || '';
    await user.save();

    const { accessToken, refreshToken } = await generateAuthTokens(
      user._id as any, req.ip, req.headers['user-agent']
    );
    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: { id: user._id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role },
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail, provider: 'local' });
    if (!user) return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });

    if (user.passwordResetLockUntil && user.passwordResetLockUntil > new Date()) {
      const remaining = Math.ceil((user.passwordResetLockUntil.getTime() - Date.now()) / 60000);
      return res.status(429).json({
        message: `Too many reset requests. Try again in ${remaining} minutes.`,
      });
    }

    const recentRequests = user.passwordResetAttempts || 0;
    if (recentRequests >= 3) {
      user.passwordResetLockUntil = new Date(Date.now() + 15 * 60 * 1000);
      user.passwordResetAttempts = 0;
      await user.save();
      return res.status(429).json({ message: 'Too many reset requests. Try again in 15 minutes.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetToken: hashedToken,
          passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000),
          passwordResetAttempts: (recentRequests || 0) + 1,
        },
      }
    );

    const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetLink = `${CLIENT_URL}/reset-password?token=${token}`;

    try {
      await sendPasswordResetEmail(cleanEmail, resetLink, user.fullName);
    } catch (emailErr: any) {
      console.error('Failed to send reset email:', emailErr.message);
    }

    return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Failed to process request' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const { token, password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+password');

    if (!user) return res.status(400).json({ message: 'Token is invalid or has expired' });

    user.password = password;
    user.passwordResetToken = undefined as any;
    user.passwordResetExpires = undefined as any;
    user.passwordResetAttempts = 0;
    user.passwordResetLockUntil = undefined as any;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined as any;
    await user.save();

    try {
      await sendResetSuccessEmail(user.email!, user.fullName);
    } catch (emailErr) {
      console.error('Failed to send reset success email:', emailErr);
    }

    return res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err: any) {
    return res.status(500).json({ message: 'Password reset failed', error: err.message });
  }
};

export const refreshTokens = async (req: Request, res: Response): Promise<any> => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token not found' });

    const tokenDoc = await verifyRefreshToken(refreshToken);
    await revokeRefreshToken(refreshToken);

    const { accessToken, refreshToken: newRefreshToken } = await generateAuthTokens(
      tokenDoc.user as any, req.ip, req.headers['user-agent'], refreshToken
    );
    setRefreshCookie(res, newRefreshToken);
    return res.status(200).json({ accessToken });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

export const logout = async (req: Request, res: Response): Promise<any> => {
  try {
    const { refreshToken } = req.cookies;
    if (refreshToken) await revokeRefreshToken(refreshToken);
    res.clearCookie('refreshToken');
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch {
    return res.status(500).json({ message: 'Logout failed' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<any> => {
  return res.status(200).json({ user: req.user });
};
