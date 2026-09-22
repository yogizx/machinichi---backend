import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWT_CONFIG } from '../config/jwt';
import { RefreshToken } from '../models/RefreshToken';
import { Types } from 'mongoose';

export const generateAuthTokens = async (
  userId: Types.ObjectId,
  ip?: string,
  userAgent?: string,
  replacedToken?: string,
) => {
  const accessToken = jwt.sign({ userId }, JWT_CONFIG.ACCESS_SECRET, {
    expiresIn: JWT_CONFIG.ACCESS_EXPIRES_IN as any,
  });

  const refreshTokenValue = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + JWT_CONFIG.REFRESH_EXPIRES_IN_DAYS);

  const tokenDoc: any = {
    token: refreshTokenValue,
    user: userId,
    expiresAt,
    ...(ip && { userIp: ip }),
    ...(userAgent && { userAgent }),
  };

  if (replacedToken) {
    tokenDoc.replacedByToken = refreshTokenValue;
  }

  await RefreshToken.create(tokenDoc);

  return { accessToken, refreshToken: refreshTokenValue };
};

export const verifyRefreshToken = async (token: string) => {
  const refreshTokenDoc = await RefreshToken.findOne({ token }).populate('user');
  if (!refreshTokenDoc || refreshTokenDoc.isRevoked || refreshTokenDoc.expiresAt < new Date()) {
    throw new Error('Invalid or expired refresh token');
  }
  return refreshTokenDoc;
};

export const revokeRefreshToken = async (token: string) => {
  await RefreshToken.findOneAndUpdate({ token }, { isRevoked: true });
};
