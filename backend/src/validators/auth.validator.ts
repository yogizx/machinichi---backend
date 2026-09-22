import { z } from 'zod';

const phoneRegex = /^\d{10}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,}$/;

export const fullNameSchema = z
  .string()
  .trim()
  .min(3, 'Full name must be at least 3 characters')
  .max(50, 'Full name must not exceed 50 characters')
  .regex(/^[A-Za-z\s]+$/, 'Full name can only contain letters and spaces')
  .transform((v) => v.replace(/\s+/g, ' ').trim());

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Please enter a valid email address.')
  .max(254, 'Email address is too long');

export const phoneSchema = z
  .string()
  .trim()
  .regex(phoneRegex, 'Phone number must be exactly 10 digits');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(passwordRegex, 'Password must contain uppercase, lowercase, number, and special character');

export const identifierSchema = z.string().trim().min(1, 'Email or phone is required');

export const registerSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  countryCode: z.string().default('+91'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const sendOtpSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  email: z.union([emailSchema, z.literal('')]).optional().transform((v) => v || undefined),
});

export const checkUserSchema = z.object({
  email: z.union([emailSchema, z.literal('')]).optional().transform((v) => v || undefined),
  phone: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
