import { Router, Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import {
  register, login, sendEmailOTP, verifyEmailOTP, checkUser,
  forgotPassword, resetPassword, refreshTokens, logout, getMe,
} from '../controllers/auth.controller';
import { googleAuth } from '../controllers/googleAuth.controller';
import { authenticateUser } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema,
  sendEmailOtpSchema, verifyEmailOtpSchema, googleAuthSchema, checkUserSchema,
} from '../validators/auth.validator';

const router = Router();

// ---------------------------------------------------------------------------
// Rate limiting. Every sensitive endpoint is limited per IP, and the ones that target ONE account
// (login, OTP, forgot password) are also limited per account, so an attacker cannot get around the
// limit by rotating IP addresses. All limiters answer with the same wording for every account.
// ---------------------------------------------------------------------------
const ipKey = (req: Request): string => ipKeyGenerator(req.ip || '');
const bodyField = (req: Request, field: string): string =>
  String(req.body?.[field] ?? '').toLowerCase().trim().slice(0, 254) || 'none';

interface LimiterOptions {
  windowMs: number;
  limit: number;
  message: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
}

const makeLimiter = ({ windowMs, limit, message, keyGenerator, skipSuccessfulRequests }: LimiterOptions) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message },
    keyGenerator: keyGenerator ?? ipKey,
    skipSuccessfulRequests: skipSuccessfulRequests ?? false,
  });

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// Unchanged limiter, still used by google / refresh / logout.
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many requests, please try again later.' },
});

// Sign-up: "is this e-mail / phone already registered?" (called while the user types)
const checkUserLimiter = makeLimiter({
  windowMs: 15 * MINUTE, limit: 60, message: 'Too many requests. Please slow down and try again later.',
});

// Sign-up: e-mail OTP. The 3-codes-then-10-minutes rule itself lives in the controller; these are
// the outer safety nets (per IP and per e-mail address).
const sendOtpIpLimiter = makeLimiter({
  windowMs: HOUR, limit: 30, message: 'Too many OTP requests. Please try again later.',
});
const sendOtpEmailLimiter = makeLimiter({
  windowMs: HOUR, limit: 20, message: 'Too many OTP requests for this email. Please try again later.',
  keyGenerator: (req) => `otp-send|${bodyField(req, 'email')}`,
});
const verifyOtpLimiter = makeLimiter({
  windowMs: 15 * MINUTE, limit: 20, message: 'Too many verification attempts. Please try again later.',
  keyGenerator: (req) => `${ipKey(req)}|${bodyField(req, 'email')}`,
});

const registerLimiter = makeLimiter({
  windowMs: HOUR, limit: 10, message: 'Too many sign-up attempts. Please try again later.',
});

// Login: per IP, and per account across all IPs (failed attempts only).
const loginIpLimiter = makeLimiter({
  windowMs: 15 * MINUTE, limit: 40, message: 'Too many failed attempts. Please try again later.',
});
const loginAccountLimiter = makeLimiter({
  windowMs: 15 * MINUTE, limit: 10, message: 'Too many failed attempts. Please try again later.',
  keyGenerator: (req) => `login|${bodyField(req, 'identifier')}`,
  skipSuccessfulRequests: true,
});

const forgotIpLimiter = makeLimiter({
  windowMs: HOUR, limit: 10, message: 'Too many password reset requests. Please try again later.',
});
const forgotEmailLimiter = makeLimiter({
  windowMs: HOUR, limit: 5, message: 'Too many password reset requests. Please try again later.',
  keyGenerator: (req) => `forgot|${bodyField(req, 'email')}`,
});
const resetLimiter = makeLimiter({
  windowMs: HOUR, limit: 10, message: 'Too many password reset attempts. Please try again later.',
});

router.post('/send-otp', sendOtpIpLimiter, sendOtpEmailLimiter, validate(sendEmailOtpSchema), sendEmailOTP);
router.post('/check-user', checkUserLimiter, validate(checkUserSchema), checkUser);
router.post('/verify-otp', verifyOtpLimiter, validate(verifyEmailOtpSchema), verifyEmailOTP);
router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/login', loginIpLimiter, loginAccountLimiter, validate(loginSchema), login);
router.post('/forgot-password', forgotIpLimiter, forgotEmailLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', resetLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/google', strictLimiter, validate(googleAuthSchema), googleAuth);
router.post('/refresh', strictLimiter, refreshTokens);
router.post('/logout', strictLimiter, logout);
router.get('/me', authenticateUser, getMe);

export default router;
