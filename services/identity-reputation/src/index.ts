#!/usr/bin/env node

/**
 * Nozama Identity & Reputation API
 * 
 * Main entry point for the decentralized identity and reputation service.
 * This service provides:
 * - DID (Decentralized Identity) management
 * - Reputation scoring and aggregation
 * - Rating submission and retrieval
 * - Identity verification workflows
 * - Integration with blockchain reputation contract
 */

import 'dotenv/config';
import server from './server';
import logger from './utils/logger';
import config from './config';

async function main() {
  try {
    // Validate required environment variables
    const requiredEnvVars = [
      'MONGODB_URI',
      'NODE_ENV'
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      logger.error('Missing required environment variables:', missingEnvVars);
      process.exit(1);
    }

    // Log startup information
    logger.info('Starting Nozama Identity & Reputation API');
    logger.info(`Service: ${config.SERVICE_NAME}`);
    logger.info(`Version: ${config.API_VERSION}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
    logger.info(`Port: ${config.PORT}`);
    logger.info(`Database: ${config.MONGODB_DB_NAME}`);
    
    // Start the server
    await server.start();
    
    logger.info('Identity & Reputation API is ready to serve requests');
    
  } catch (error) {
    logger.error('Failed to start Identity & Reputation API:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (config.NODE_ENV === 'development') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

if (require.main === module) {
  main();
}

export default main;