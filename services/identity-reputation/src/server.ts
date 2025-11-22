import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

import config from './config';
import logger from './utils/logger';
import database from './config/database';

// Route imports
import healthRoutes from './routes/health';
import identityRoutes from './routes/identity';
import reputationRoutes from './routes/reputation';
import blockchainRoutes from './routes/blockchain';
import adminRoutes from './routes/admin';

// Service imports
import blockchainService from './services/blockchainService';

class Server {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet(
      config.IS_DEVELOPMENT 
        ? { contentSecurityPolicy: false }
        : {}
    ));

    // CORS configuration
    this.app.use(cors({
      origin: config.CORS_ORIGIN,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // HTTP request logging
    this.app.use(morgan(config.IS_DEVELOPMENT ? 'dev' : 'combined'));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX_REQUESTS,
      message: {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP, please try again later.',
          retryAfter: config.RATE_LIMIT_WINDOW_MS / 1000
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    
    this.app.use(limiter);
  }

  private initializeRoutes(): void {
    // API version prefix
    const apiPrefix = `/api/${config.API_VERSION}`;

    // Health check endpoint (no API version prefix)
    this.app.use('/health', healthRoutes);

    // API routes
    this.app.use(`${apiPrefix}/identities`, identityRoutes);
    this.app.use(`${apiPrefix}/reputation`, reputationRoutes);
    this.app.use(`${apiPrefix}/blockchain`, blockchainRoutes);
    this.app.use(`${apiPrefix}/admin`, adminRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Nozama Identity & Reputation API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          identities: `${apiPrefix}/identities`,
          reputation: `${apiPrefix}/reputation`,
          blockchain: `${apiPrefix}/blockchain`,
          admin: `${apiPrefix}/admin`,
          documentation: `${apiPrefix}/docs`
        }
      });
    });
  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', error);

      const statusCode = error.statusCode || error.status || 500;
      res.status(statusCode).json({
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: config.IS_DEVELOPMENT ? error.message : 'Internal server error',
          timestamp: new Date().toISOString(),
          ...(config.IS_DEVELOPMENT && { stack: error.stack })
        }
      });
    });
  }

  public async start(): Promise<void> {
    try {
      // Try to connect to database
      try {
        await database.connect();
        logger.info(`📊 Database: Connected to ${config.MONGODB_DB_NAME}`);
      } catch (dbError) {
        logger.warn('⚠️ Database connection failed - running in demo mode');
      }

      // Initialize blockchain service
      try {
        await blockchainService.initialize();
        const isAvailable = await blockchainService.isContractAvailable();
        if (isAvailable) {
          logger.info('⛓️ Blockchain: Connected and ready');
        } else {
          logger.warn('⚠️ Blockchain: Service initialized but contract not available');
        }
      } catch (blockchainError) {
        logger.warn('⚠️ Blockchain initialization failed - running without blockchain features');
      }

      // Start server
      this.app.listen(config.PORT, () => {
        logger.info(`🚀 Identity & Reputation API started successfully`);
        logger.info(`📡 Server running on port ${config.PORT}`);
        logger.info(`🌍 Environment: ${config.NODE_ENV}`);
        logger.info(`🔗 Health check: http://localhost:${config.PORT}/health`);
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      await database.disconnect();
      logger.info('✅ Server stopped gracefully');
    } catch (error) {
      logger.error('Error stopping server:', error);
      throw error;
    }
  }
}

export default new Server();
