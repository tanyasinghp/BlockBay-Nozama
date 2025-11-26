import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // Server Configuration
  SERVICE_NAME: 'nozama-search-discovery-api',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3002', 10),
  API_VERSION: process.env.API_VERSION || 'v1',

  // Database Configuration (MongoDB Atlas)
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://2024sl93104_db_user:password@nozama-data.q14xknz.mongodb.net/?appName=nozama-data',
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'nozama-data',

  // API Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN?.split(',') || '*',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Logging Configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: process.env.LOG_FILE || 'logs/search-api.log',

  // Search Configuration
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
  MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
  SEARCH_TIMEOUT_MS: parseInt(process.env.SEARCH_TIMEOUT_MS || '5000', 10),

  // Monitoring
  HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
  METRICS_PORT: parseInt(process.env.METRICS_PORT || '9090', 10),

  // Development flags
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_TEST: process.env.NODE_ENV === 'test',
};

// Validate required environment variables
function validateConfig(): void {
  const required = [
    'MONGODB_URI'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate MongoDB Atlas connection string format
  if (!config.MONGODB_URI.includes('mongodb+srv://')) {
    throw new Error('MONGODB_URI must be a valid MongoDB Atlas connection string');
  }
}

// Only validate in non-test environments
if (!config.IS_TEST) {
  validateConfig();
}

export default config;
