import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'queueless-secret-jwt-key-2026',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'queueless-refresh-secret-jwt-key-2026',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
