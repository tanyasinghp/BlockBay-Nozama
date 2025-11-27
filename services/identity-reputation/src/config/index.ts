import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Load contract deployments
let deployments: any = {};
try {
  // From services/identity-reputation/src/config -> ../../../../contracts/deployments.json
  const deploymentsPath = path.resolve(__dirname, '../../../../contracts/deployments.json');
  if (fs.existsSync(deploymentsPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    console.log('✅ Loaded contract deployments:', deployments.contracts);
    console.log('🔍 Reputation address type:', typeof deployments?.contracts?.Reputation?.address);
    console.log('🔍 Reputation address value:', deployments?.contracts?.Reputation?.address);
  } else {
    console.warn('❌ Deployments file not found at:', deploymentsPath);
  }
} catch (error) {
  console.warn('Could not load contract deployments:', error);
}

export const config = {
  // Server Configuration
  SERVICE_NAME: 'nozama-identity-reputation-api',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3004', 10),
  API_VERSION: process.env.API_VERSION || 'v1',

  // Database Configuration (MongoDB Atlas)
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://2024sl93104_db_user:<db_password>@nozama-data.q14xknz.mongodb.net/?appName=nozama-data',
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'nozama-identity',

  // Blockchain Configuration
  BLOCKCHAIN_RPC_URL: process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545',
  REPUTATION_CONTRACT_ADDRESS: process.env.REPUTATION_CONTRACT_ADDRESS || String(deployments?.contracts?.Reputation?.address || ''),
  
  // Admin and Security
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'your_webhook_secret_here',
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || 'your_admin_api_key',
  
  // API Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Logging Configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: process.env.LOG_FILE || 'logs/identity-api.log',

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
    console.warn('Warning: MONGODB_URI should be a MongoDB Atlas connection string');
  }
}

// Validate config on module load
try {
  validateConfig();
} catch (error) {
  console.error('Configuration validation failed:', error);
  process.exit(1);
}

export default config;