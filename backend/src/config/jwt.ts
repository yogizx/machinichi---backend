import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// In production the server must NOT start with the built-in development secrets: anyone who
// has read this source could forge valid tokens with them.
const resolveSecret = (name: string, devFallback: string): string => {
  const value = process.env[name];
  if (value) {
    if (isProduction && value.length < 32) {
      console.warn(`[SECURITY] ${name} is shorter than 32 characters. Use a long random secret.`);
    }
    return value;
  }
  if (isProduction) {
    throw new Error(`${name} is not set. Refusing to start in production without it.`);
  }
  console.warn(`[SECURITY] ${name} is not set - using an insecure development fallback.`);
  return devFallback;
};

export const JWT_CONFIG = {
  ACCESS_SECRET: resolveSecret('JWT_ACCESS_SECRET', 'fallback_dev_access_secret_do_not_use_in_prod'),
  REFRESH_SECRET: resolveSecret('JWT_REFRESH_SECRET', 'fallback_dev_refresh_secret_do_not_use_in_prod'),
  ACCESS_EXPIRES_IN: '15m',
  REFRESH_EXPIRES_IN: '7d',
  REFRESH_EXPIRES_IN_DAYS: 7,
};
