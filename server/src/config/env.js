import dotenv from 'dotenv';

dotenv.config();

if (process.env.NODE_ENV === 'test' && process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  DATABASE_URL:
    process.env.NODE_ENV === 'test'
      ? process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
      : process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'default_secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};
