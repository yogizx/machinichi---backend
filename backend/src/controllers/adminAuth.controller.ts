import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User } from '../models/User';
import { AuthRequest } from '../middlewares/auth.middleware';
import { generateAuthTokens, verifyRefreshToken, revokeRefreshToken } from '../services/token.service';
import { sendPasswordResetEmail, sendResetSuccessEmail } from '../services/email.service';

const setAdminRefreshCookie = (res: Response, token: string) => {
  res.cookie('adminRefreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const adminLogin = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;
    console.log(`[ADMIN LOGIN] Request body keys: ${Object.keys(req.body).join(', ')}`);
    console.log(`[ADMIN LOGIN] Email received: "${email}", password length: ${password?.length || 0}`);
    const cleanEmail = email ? email.toLowerCase().trim() : '';

    const user = await User.findOne({ email: cleanEmail, role: { $in: ['admin', 'super_admin'] } }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isLocked) {
      return res.status(403).json({ message: 'Account locked. Try again later.' });
    }

    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    user.lastLoginIp = req.ip || '';
    user.lastLoginDevice = req.headers['user-agent'] || '';
    await user.save();

    const { accessToken, refreshToken } = await generateAuthTokens(user._id as any, req.ip, req.headers['user-agent']);
    setAdminRefreshCookie(res, refreshToken);
    return res.status(200).json({ message: 'Admin login successful', accessToken, refreshToken });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed', error });
  }
};

export const adminRefreshTokens = async (req: Request, res: Response): Promise<any> => {
  try {
    let refreshTokenValue = req.cookies?.adminRefreshToken;
    if (!refreshTokenValue) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        refreshTokenValue = authHeader.split(' ')[1];
      }
    }
    if (!refreshTokenValue) return res.status(401).json({ message: 'Refresh token not found' });

    const validTokenDoc = await verifyRefreshToken(refreshTokenValue);
    await revokeRefreshToken(refreshTokenValue);

    const { accessToken, refreshToken: newRefreshToken } = await generateAuthTokens(
      validTokenDoc.user as any, req.ip, req.headers['user-agent'], refreshTokenValue
    );

    setAdminRefreshCookie(res, newRefreshToken);
    return res.status(200).json({ accessToken, refreshToken: newRefreshToken });
  } catch {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const adminLogout = async (req: Request, res: Response): Promise<any> => {
  try {
    const { adminRefreshToken } = req.cookies;
    if (adminRefreshToken) await revokeRefreshToken(adminRefreshToken);
    res.clearCookie('adminRefreshToken');
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch {
    return res.status(500).json({ message: 'Logout failed' });
  }
};

export const getAdminMe = async (req: AuthRequest, res: Response): Promise<any> => {
  return res.status(200).json({ admin: req.user });
};

export const forgotPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail, role: { $in: ['admin', 'super_admin'] } });
    if (!user) return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });

    if (user.passwordResetLockUntil && user.passwordResetLockUntil > new Date()) {
      const remaining = Math.ceil((user.passwordResetLockUntil.getTime() - Date.now()) / 60000);
      return res.status(429).json({ message: `Too many requests. Try again in ${remaining} minutes.` });
    }

    const recentRequests = user.passwordResetAttempts || 0;
    if (recentRequests >= 3) {
      user.passwordResetLockUntil = new Date(Date.now() + 15 * 60 * 1000);
      user.passwordResetAttempts = 0;
      await user.save();
      return res.status(429).json({ message: 'Too many requests. Try again in 15 minutes.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
    user.passwordResetAttempts = (recentRequests || 0) + 1;
    await user.save();

    const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetLink = `${CLIENT_URL}/forgot-password?token=${token}&admin=1`;

    try {
      await sendPasswordResetEmail(cleanEmail, resetLink, user.fullName);
    } catch (emailErr: any) {
      console.error('Failed to send admin reset email:', emailErr.message);
    }

    return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err: any) {
    console.error('Admin forgot password error:', err);
    return res.status(500).json({ message: 'Failed to process request' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password) return res.status(400).json({ message: 'Token and password are required' });
    if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
      role: { $in: ['admin', 'super_admin'] },
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

    return res.status(200).json({ message: 'Password reset successfully.' });
  } catch (err: any) {
    return res.status(500).json({ message: 'Password reset failed', error: err.message });
  }
};
