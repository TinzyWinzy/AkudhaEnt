import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  MONGODB_URI: process.env.MONGODB_URI || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  USE_DATABASE: process.env.USE_DATABASE === 'true',
};

export function validateEnv(): string[] {
  const missing: string[] = [];
  if (env.USE_DATABASE && !env.MONGODB_URI) missing.push('MONGODB_URI');
  return missing;
}
