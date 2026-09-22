import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register, login, sendPhoneOTP, verifyPhoneOTP, checkUser,
  forgotPassword, resetPassword, refreshTokens, logout, getMe,
} from '../controllers/auth.controller';
import { googleAuth } from '../controllers/googleAuth.controller';
import { authenticateUser } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema,
  sendOtpSchema, verifyOtpSchema, googleAuthSchema, checkUserSchema,
} from '../validators/auth.validator';

const router = Router();

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many requests, please try again later.' },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { message: 'Maximum 3 OTP requests within 15 minutes.' },
});

router.post('/send-otp', otpLimiter, validate(sendOtpSchema), sendPhoneOTP);
router.post('/check-user', validate(checkUserSchema), checkUser);
router.post('/verify-otp', strictLimiter, validate(verifyOtpSchema), verifyPhoneOTP);
router.post('/register', strictLimiter, validate(registerSchema), register);
router.post('/login', strictLimiter, validate(loginSchema), login);
router.post('/forgot-password', strictLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', strictLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/google', strictLimiter, validate(googleAuthSchema), googleAuth);
router.post('/refresh', strictLimiter, refreshTokens);
router.post('/logout', strictLimiter, logout);
router.get('/me', authenticateUser, getMe);

export default router;
