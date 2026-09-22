export const JWT_CONFIG = {
  ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'fallback_dev_access_secret_do_not_use_in_prod',
  REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fallback_dev_refresh_secret_do_not_use_in_prod',
  ACCESS_EXPIRES_IN: '15m',
  REFRESH_EXPIRES_IN: '7d',
  REFRESH_EXPIRES_IN_DAYS: 7,
};
