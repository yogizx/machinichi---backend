import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

export const generateCsrfToken = (secret: string, sessionId: string): string => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(sessionId);
  return hmac.digest('hex');
};

export const setCsrfCookie = (req: Request, res: Response, next: NextFunction) => {
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string || 'default';
  const secret = process.env.CSRF_SECRET || 'machinichi-csrf-secret';
  const token = generateCsrfToken(secret, sessionId);

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  next();
};

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  const tokenFromHeader = req.headers[CSRF_HEADER_NAME] as string;
  const tokenFromCookie = req.cookies?.[CSRF_COOKIE_NAME];

  if (!tokenFromHeader || !tokenFromCookie) {
    return res.status(403).json({ success: false, message: 'CSRF token missing.' });
  }

  const secret = process.env.CSRF_SECRET || 'machinichi-csrf-secret';
  const sessionId = req.cookies?.sessionId || 'default';
  const expectedToken = generateCsrfToken(secret, sessionId);

  if (tokenFromHeader !== expectedToken) {
    return res.status(403).json({ success: false, message: 'Invalid CSRF token.' });
  }

  next();
};
