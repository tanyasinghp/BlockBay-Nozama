import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';

import config from './config';
import database from './config/database';
import logger, { httpLogStream } from './utils/logger';

// Import routes
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import searchRoutes from './routes/search';
import categoryRoutes from './routes/categories';
import healthRoutes from './routes/health';
import Product from './models/Product';

// GraphQL imports
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { createDataLoaders } from './graphql/dataloaders';

class Server {
  public app: express.Application;
  private apolloServer: ApolloServer | null = null;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    // Routes will be initialized after GraphQL in start()
  }

  private async initializeGraphQL(): Promise<void> {
    // Create Apollo Server
    this.apolloServer = new ApolloServer({
      typeDefs,
      resolvers,
      introspection: config.IS_DEVELOPMENT,
      formatError: (formattedError, error) => {
        logger.error('GraphQL Error:', formattedError);
        return formattedError;
      },
    });

    await this.apolloServer.start();
    logger.info('🚀 GraphQL Apollo Server initialized');
  }

  private initializeMiddleware(): void {
    // Security middleware - adjusted for GraphQL
    this.app.use(helmet(
      config.IS_DEVELOPMENT 
        ? { 
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false 
          }
        : {
            crossOriginEmbedderPolicy: false
          }
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
    this.app.use(morgan(
      config.IS_DEVELOPMENT ? 'dev' : 'combined',
      { stream: httpLogStream }
    ));

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

    // Request timeout
    this.app.use((req, res, next) => {
      req.setTimeout(config.SEARCH_TIMEOUT_MS);
      next();
    });
  }

  private initializeSwagger(): void {
    const swaggerOptions = {
      swaggerDefinition: {
        openapi: '3.0.0',
        info: {
          title: 'Nozama Search & Discovery API',
          version: '1.0.0',
          description: 'API for searching and discovering products and categories in the Nozama decentralized e-commerce platform.',
        },
        servers: [
          {
            url: `http://localhost:${config.PORT}/api/${config.API_VERSION}`,
          },
        ],
      },
      apis: ['./src/routes/*.ts'],
    };

    const swaggerSpec = swaggerJsdoc(swaggerOptions);
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  private async initializeGraphQLMiddleware(): Promise<void> {
    if (!this.apolloServer) {
      throw new Error('Apollo Server not initialized');
    }

    // GraphQL endpoint with DataLoaders
    this.app.use(
      '/graphql',
      cors<cors.CorsRequest>({
        origin: config.CORS_ORIGIN,
        credentials: true,
      }),
      express.json(),
      expressMiddleware(this.apolloServer, {
        context: async ({ req }) => ({
          dataloaders: createDataLoaders(),
          req,
        }),
      })
    );

    logger.info('📊 GraphQL endpoint configured at /graphql');
  }

  private initializeRoutesAndErrorHandling(): void {
    this.initializeSwagger();
    // API version prefix
    const apiPrefix = `/api/${config.API_VERSION}`;

    // Health check endpoint (no API version prefix)
    this.app.use('/health', healthRoutes);

    // API routes (REST - legacy support)
    this.app.use(`${apiPrefix}/search`, searchRoutes);
    this.app.use(`${apiPrefix}/categories`, categoryRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Nozama Search & Discovery API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          graphql: '/graphql',
          search: `${apiPrefix}/search`,
          categories: `${apiPrefix}/categories`,
          documentation: `${apiPrefix}/docs`
        },
        features: {
          graphql: {
            endpoint: '/graphql',
            playground: config.IS_DEVELOPMENT ? 'Available in development mode' : 'Disabled',
            introspection: config.IS_DEVELOPMENT
          },
          rest: {
            enabled: true,
            version: config.API_VERSION
          }
        }
      });
    });

    // API documentation endpoint
    this.app.get(`${apiPrefix}/docs`, (req, res) => {
      res.redirect('/api-docs');
    });

    // 404 handler for unknown routes - MUST be last
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.method} ${req.originalUrl} not found`,
          timestamp: new Date().toISOString()
        }
      });
    });

    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', error);

      // Handle specific error types
      if (error.name === 'ValidationError') {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.message,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (error.name === 'CastError') {
        res.status(400).json({
          error: {
            code: 'INVALID_ID',
            message: 'Invalid ID format',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      if (error.code === 11000) {
        res.status(409).json({
          error: {
            code: 'DUPLICATE_ENTRY',
            message: 'Resource already exists',
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Default error response
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
      // Initialize GraphQL first
      await this.initializeGraphQL();

      // Try to connect to database
      try {
        await database.connect();
        logger.info(`📊 Database: Connected to ${config.MONGODB_DB_NAME}`);
      } catch (dbError) {
        logger.warn('⚠️ Database connection failed - running in demo mode');
        logger.warn('Note: MongoDB Atlas requires IP whitelisting. Add your IP to Atlas Network Access.');
      }

      // Initialize GraphQL middleware BEFORE other routes
      await this.initializeGraphQLMiddleware();
      
      // Now initialize routes and error handling (this includes 404 handler)
      this.initializeRoutesAndErrorHandling();

      // Start server regardless of database connection
      this.app.listen(config.PORT, async () => {
        try {
          // Ensure indexes are created on startup
          await Product.createIndexes();
          logger.info('🔍 MongoDB text indexes synchronized successfully');
        } catch (indexError) {
          logger.error('⚠️ Error synchronizing MongoDB indexes:', indexError);
        }
        logger.info(`🚀 Search & Discovery API started successfully`);
        logger.info(`📡 Server running on port ${config.PORT}`);
        logger.info(`🌍 Environment: ${config.NODE_ENV}`);
        logger.info(`🔗 Health check: http://localhost:${config.PORT}/health`);
        logger.info(`🎯 GraphQL endpoint: http://localhost:${config.PORT}/graphql`);
        logger.info(`📚 REST API docs: http://localhost:${config.PORT}/api/${config.API_VERSION}/docs`);
        logger.info(`💡 GraphQL + REST APIs: Both available for flexible integration`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      if (this.apolloServer) {
        await this.apolloServer.stop();
        logger.info('🛑 Apollo Server stopped');
      }
      await database.disconnect();
      logger.info('👋 Server stopped gracefully');
    } catch (error) {
      logger.error('Error stopping server:', error);
    }
  }
}

// Handle process termination
const server = new Server();

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server if this file is run directly
if (require.main === module) {
  server.start();
}

export default server;
