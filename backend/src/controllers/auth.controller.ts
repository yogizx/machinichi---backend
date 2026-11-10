import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { User } from '../models/User';
import { OTP } from '../models/OTP';
import { AuthRequest } from '../middlewares/auth.middleware';
import { JWT_CONFIG } from '../config/jwt';
import {
  generateAuthTokens, verifyRefreshToken, revokeRefreshToken, revokeAllUserRefreshTokens,
} from '../services/token.service';
import {
  sendPasswordResetEmail, sendResetSuccessEmail, sendWelcomeEmail, sendSignupOtpEmail,
} from '../services/email.service';

const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

// ---------------------------------------------------------------------------
// Signup e-mail OTP rules
// ---------------------------------------------------------------------------
const OTP_VALIDITY_MS = 5 * 60 * 1000;       // a code is valid for 5 minutes
const OTP_MAX_SENDS = 3;                      // only 3 codes per round ...
const OTP_BLOCK_MS = 10 * 60 * 1000;          // ... then the next code can only be requested 10 minutes later
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;     // minimum gap between two codes
const OTP_MAX_ATTEMPTS = 5;                   // wrong guesses allowed per code
const VERIFIED_WINDOW_MS = 15 * 60 * 1000;    // after verifying, the user has 15 minutes to submit the form

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;    // password-reset links live for 30 minutes
const RESET_MAX_PER_HOUR = 3;                 // reset e-mails per account per hour

// The OTP is never stored in clear text: only an HMAC of it (keyed with a server secret) is saved.
const hashOtp = (email: string, otp: string): string =>
  crypto.createHmac('sha256', JWT_CONFIG.ACCESS_SECRET).update(`email-otp|${email}|${otp}`).digest('hex');

const safeEqual = (a: string, b: string): boolean => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

// Used when the account does not exist so that "unknown user" and "wrong password" take the same time.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('machinichi-timing-guard', 12);

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const sanitize = (str: string): string => {
  return str.replace(/[<>"']/g, '');
};

// Sign-up page: tells the form whether an e-mail / phone number already belongs to an account.
export const checkUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, phone } = req.body as { email?: string; phone?: string };
    const result = { emailExists: false, phoneExists: false };

    if (email) result.emailExists = !!(await User.exists({ email }));
    if (phone) result.phoneExists = !!(await User.exists({ phone }));

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[CHECK-USER] failed:', err?.message);
    return res.status(500).json({ message: 'Check failed' });
  }
};

// Sends the signup OTP to the e-mail address the user typed.
// Rules: neither the e-mail nor the phone may already have an account, a code is valid for 5 minutes,
// only 3 codes can be requested, the next one only after a 10 minute wait.
export const sendEmailOTP = async (req: Request, res: Response): Promise<any> => {
  try {
    const email: string = req.body.email;
    const phone: string = req.body.phone;
    const now = new Date();

    // 1) Neither the e-mail nor the phone number may belong to an existing account.
    const [emailTaken, phoneTaken] = await Promise.all([
      User.exists({ email }),
      User.exists({ phone }),
    ]);
    if (emailTaken) return res.status(409).json({ message: 'This email is already registered', field: 'email' });
    if (phoneTaken) return res.status(409).json({ message: 'This phone number is already registered', field: 'phone' });

    const existing = await OTP.findOne({ identifier: email, type: 'email_verify' });

    // 2) At most 3 codes, then a 10 minute wait.
    let sendCount = existing?.sendCount || 0;
    if (existing?.sendBlockedUntil) {
      if (existing.sendBlockedUntil > now) {
        const secs = Math.ceil((existing.sendBlockedUntil.getTime() - now.getTime()) / 1000);
        return res.status(429).json({
          message: `You have already requested the OTP ${OTP_MAX_SENDS} times. Please try again after ${Math.ceil(secs / 60)} minute(s).`,
          retryAfterSeconds: secs,
        });
      }
      sendCount = 0; // the wait is over: a new round of 3 codes starts
    }

    // 3) Small gap between two codes (double clicks, mail flooding).
    if (existing?.lastSentAt) {
      const sinceLast = now.getTime() - existing.lastSentAt.getTime();
      if (sinceLast < OTP_RESEND_COOLDOWN_MS) {
        const secs = Math.ceil((OTP_RESEND_COOLDOWN_MS - sinceLast) / 1000);
        return res.status(429).json({
          message: `Please wait ${secs} seconds before requesting a new OTP.`,
          retryAfterSeconds: secs,
        });
      }
    }

    const otp = generateOTP();
    const newCount = sendCount + 1;
    const otpExpiresAt = new Date(now.getTime() + OTP_VALIDITY_MS);
    const sendBlockedUntil = newCount >= OTP_MAX_SENDS ? new Date(now.getTime() + OTP_BLOCK_MS) : undefined;
    // The record must outlive the 10 minute wait, otherwise the send counter would be lost with it.
    const keepUntil = new Date(Math.max(otpExpiresAt.getTime(), sendBlockedUntil?.getTime() || 0) + 60 * 1000);

    const update: any = {
      $set: {
        otp: hashOtp(email, otp),
        otpExpiresAt,
        expiresAt: keepUntil,
        attempts: 0,
        isVerified: false,
        sendCount: newCount,
        lastSentAt: now,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      $unset: { lockedUntil: '' },
    };
    if (sendBlockedUntil) update.$set.sendBlockedUntil = sendBlockedUntil;
    else update.$unset.sendBlockedUntil = '';

    await OTP.findOneAndUpdate({ identifier: email, type: 'email_verify' }, update, { upsert: true });

    try {
      await sendSignupOtpEmail(email, otp);
    } catch (mailErr: any) {
      console.error('[OTP] E-mail delivery failed:', mailErr?.message);
      // Nothing reached the user: invalidate the unsent code and give the attempt back.
      const rollback: any = { $set: { sendCount, otpExpiresAt: now }, $unset: { sendBlockedUntil: '' } };
      if (existing?.lastSentAt) rollback.$set.lastSentAt = existing.lastSentAt;
      else rollback.$unset.lastSentAt = '';
      await OTP.updateOne({ identifier: email, type: 'email_verify' }, rollback);
      return res.status(502).json({ message: 'We could not send the OTP email right now. Please try again in a moment.' });
    }

    return res.status(200).json({
      message: 'OTP sent to your email address.',
      expiresInSeconds: OTP_VALIDITY_MS / 1000,
      resendAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
      remainingSends: Math.max(0, OTP_MAX_SENDS - newCount),
    });
  } catch (err: any) {
    console.error('[OTP] send failed:', err?.message);
    return res.status(500).json({ message: 'Failed to send OTP' });
  }
};

export const verifyEmailOTP = async (req: Request, res: Response): Promise<any> => {
  try {
    const email: string = req.body.email;
    const code: string = req.body.otp;
    const now = new Date();

    const record = await OTP.findOne({ identifier: email, type: 'email_verify' });
    if (!record || !record.otpExpiresAt) {
      return res.status(400).json({ message: 'OTP not found. Please request a new one.' });
    }
    if (record.otpExpiresAt <= now) {
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }

    if (!safeEqual(record.otp, hashOtp(email, code))) {
      record.attempts = (record.attempts || 0) + 1;
      if (record.attempts >= OTP_MAX_ATTEMPTS) {
        record.otpExpiresAt = now; // burn the code: a new one has to be requested
        await record.save();
        return res.status(400).json({ message: 'Too many incorrect attempts. Please request a new OTP.' });
      }
      await record.save();
      return res.status(400).json({ message: `Invalid OTP. ${OTP_MAX_ATTEMPTS - record.attempts} attempt(s) remaining.` });
    }

    // Correct code: it is single use, and the user now has a limited time to submit the form.
    record.isVerified = true;
    record.attempts = 0;
    record.otpExpiresAt = now;
    const verifiedUntil = new Date(now.getTime() + VERIFIED_WINDOW_MS);
    if (!record.expiresAt || record.expiresAt < verifiedUntil) record.expiresAt = verifiedUntil;
    await record.save();

    return res.status(200).json({ message: 'Email verified successfully', verified: true });
  } catch (err: any) {
    console.error('[OTP] verify failed:', err?.message);
    return res.status(500).json({ message: 'OTP verification failed' });
  }
};

export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const { fullName, email, phone, password, countryCode } = req.body;

    const cleanName = sanitize(fullName.trim());
    const cleanEmail = email.toLowerCase().trim();
    const fullPhone = `${countryCode || '+91'}${phone}`;
    const now = new Date();

    // The e-mail must have been verified with the OTP that was sent to it (and recently).
    const verifiedRecord = await OTP.findOne({
      identifier: cleanEmail,
      type: 'email_verify',
      isVerified: true,
      expiresAt: { $gt: now },
    });

    if (!verifiedRecord) {
      return res.status(400).json({ message: 'Email has not been verified. Please verify the OTP sent to your email.' });
    }

    const [emailTaken, phoneTaken] = await Promise.all([
      User.exists({ email: cleanEmail }),
      User.exists({ phone: fullPhone }),
    ]);
    if (emailTaken) return res.status(409).json({ message: 'This email is already registered' });
    if (phoneTaken) return res.status(409).json({ message: 'This phone number is already registered' });

    let user;
    try {
      user = await User.create({
        fullName: cleanName,
        email: cleanEmail,
        phone: fullPhone,
        password,
        provider: 'local',
        isEmailVerified: true,
        isPhoneVerified: false,
        role: 'customer',
      });
    } catch (createErr: any) {
      if (createErr?.code === 11000) {
        return res.status(409).json({ message: 'An account with these details already exists' });
      }
      throw createErr;
    }

    // The verification record is single use.
    await OTP.deleteOne({ _id: verifiedRecord._id });

    let emailSent = true;
    try {
      await sendWelcomeEmail(cleanEmail, cleanName);
    } catch (emailErr: any) {
      console.error(`[EMAIL] Welcome email failed: ${emailErr?.message}`);
      emailSent = false;
    }

    return res.status(201).json({
      message: emailSent
        ? 'Welcome to our Machinichi Shop, Your Account Has Been Created Successfully.'
        : 'Welcome to our Machinichi Shop, Your Account Has Been Created Successfully (Welcome email delivery failed).',
      user: { id: user._id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role },
    });
  } catch (err: any) {
    console.error('Registration Error:', err?.message);
    return res.status(500).json({ message: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const identifier: string = req.body.identifier;
    const password: string = req.body.password;
    const invalidCredentials = { message: 'Invalid credentials' };

    // Build the lookup from validated shapes only. (The old code put the raw input into a regex,
    // which let an attacker match other people's phone numbers.)
    let query: Record<string, any> | null = null;
    if (identifier.includes('@')) {
      query = { email: identifier.toLowerCase() };
    } else {
      const compact = identifier.replace(/[\s-]/g, '');
      if (/^\+\d{8,15}$/.test(compact)) query = { phone: compact };
      else if (/^\d{10}$/.test(compact)) query = { phone: { $regex: `${compact}$` } }; // digits only: safe
    }

    const user = query ? await User.findOne({ ...query, provider: 'local' }).select('+password') : null;

    if (!user) {
      // Same amount of work as a real check, so response time does not reveal which accounts exist.
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      return res.status(401).json(invalidCredentials);
    }

    if (user.isLocked) {
      return res.status(429).json({ message: 'Too many failed attempts. Please try again later.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const updated = await User.findByIdAndUpdate(
        user._id,
        { $inc: { failedLoginAttempts: 1 } },
        { new: true },
      ).select('failedLoginAttempts');
      if (updated && updated.failedLoginAttempts >= 5) {
        await User.updateOne({ _id: user._id }, { $set: { lockUntil: new Date(Date.now() + 15 * 60 * 1000) } });
      }
      return res.status(401).json(invalidCredentials);
    }

    // Only reveal the account state to someone who knows the password.
    if (user.isBlocked || user.isDeleted || user.isActive === false) {
      return res.status(403).json({ message: 'Account is blocked. Contact support.' });
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
    console.error('Login error:', err?.message);
    return res.status(500).json({ message: 'Login failed' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<any> => {
  // The answer is always the same, whether or not the account exists (no account enumeration).
  const genericReply = { message: 'If an account exists for that email, a password reset link has been sent.' };

  try {
    const cleanEmail: string = req.body.email;

    const user = await User.findOne({ email: cleanEmail, provider: 'local' });
    if (!user) return res.status(200).json(genericReply);

    // Max 3 reset e-mails per account per hour (extra requests are silently ignored).
    const now = Date.now();
    const lastIssuedAt = user.passwordResetExpires ? user.passwordResetExpires.getTime() - RESET_TOKEN_TTL_MS : 0;
    const withinWindow = lastIssuedAt > 0 && now - lastIssuedAt < 60 * 60 * 1000;
    const recentRequests = withinWindow ? (user.passwordResetAttempts || 0) : 0;
    if (recentRequests >= RESET_MAX_PER_HOUR) return res.status(200).json(genericReply);

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetToken: hashedToken,
          passwordResetExpires: new Date(now + RESET_TOKEN_TTL_MS),
          passwordResetAttempts: recentRequests + 1,
        },
      }
    );

    const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetLink = `${CLIENT_URL}/reset-password?token=${token}`;

    res.status(200).json(genericReply);

    // Sent AFTER answering so the response time cannot reveal whether the account exists.
    sendPasswordResetEmail(cleanEmail, resetLink, user.fullName).catch((emailErr: any) => {
      console.error('Failed to send reset email:', emailErr?.message);
    });
    return;
  } catch (err: any) {
    console.error('Forgot password error:', err?.message);
    return res.status(200).json(genericReply);
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

    if (!user) {
      return res.status(400).json({ message: 'This reset link is invalid or has expired. Please request a new one.' });
    }

    if (await user.comparePassword(password)) {
      return res.status(400).json({ message: 'Your new password must be different from your current password.' });
    }

    user.password = password;
    user.passwordResetToken = undefined as any;
    user.passwordResetExpires = undefined as any;
    user.passwordResetAttempts = 0;
    user.passwordResetLockUntil = undefined as any;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined as any;
    await user.save();

    // Whoever knew the old password (or stole a session) is signed out everywhere.
    await revokeAllUserRefreshTokens(user._id as any);

    sendResetSuccessEmail(user.email!, user.fullName).catch((emailErr: any) => {
      console.error('Failed to send reset success email:', emailErr?.message);
    });

    return res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err: any) {
    console.error('Reset password error:', err?.message);
    return res.status(500).json({ message: 'Password reset failed' });
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
