import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  MONGODB_URI: process.env.MONGODB_URI || '',
  MONGODB_DB: process.env.MONGODB_DB || 'akudha',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  NODE_ENV: process.env.NODE_ENV || 'development',
  USE_DATABASE: process.env.USE_DATABASE === 'true',
  JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'akudha-development-access-secret-change-me'),
  REFRESH_SECRET: process.env.REFRESH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'akudha-development-refresh-secret-change-me'),
  CORS_ORIGINS: (process.env.CORS_ORIGINS || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000,http://127.0.0.1:3000')).split(',').map(value => value.trim()).filter(Boolean),
  BOOTSTRAP_ADMIN_EMAIL: (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase(),
  BOOTSTRAP_ADMIN_STAFF_ID: (process.env.BOOTSTRAP_ADMIN_STAFF_ID || '').trim().toUpperCase(),
  BOOTSTRAP_ADMIN_PIN: process.env.BOOTSTRAP_ADMIN_PIN || '',
};

export function validateEnv(): string[] {
  const missing: string[] = [];
  if (env.USE_DATABASE && !env.MONGODB_URI) missing.push('MONGODB_URI');
  if (env.USE_DATABASE && !env.MONGODB_DB) missing.push('MONGODB_DB');
  if (env.NODE_ENV === 'production' && !env.USE_DATABASE) missing.push('USE_DATABASE=true');
  if (env.NODE_ENV === 'production' && !env.JWT_SECRET) missing.push('JWT_SECRET');
  if (env.NODE_ENV === 'production' && !env.REFRESH_SECRET) missing.push('REFRESH_SECRET');
  if (env.NODE_ENV === 'production' && !/^[A-Z0-9][A-Z0-9-]{2,23}$/.test(env.BOOTSTRAP_ADMIN_STAFF_ID)) missing.push('BOOTSTRAP_ADMIN_STAFF_ID');
  if (env.NODE_ENV === 'production' && !/^\d{6}$/.test(env.BOOTSTRAP_ADMIN_PIN)) missing.push('BOOTSTRAP_ADMIN_PIN (exactly 6 digits)');
  return missing;
}
