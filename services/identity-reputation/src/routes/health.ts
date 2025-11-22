import { Router, Request, Response } from 'express';
import database from '../config/database';
import config from '../config';

const router = Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const dbHealth = await database.healthCheck();
    
    const health = {
      service: config.SERVICE_NAME,
      status: 'healthy',
      version: config.API_VERSION,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      database: dbHealth
    };

    const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
    
  } catch (error) {
    res.status(503).json({
      service: config.SERVICE_NAME,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

/**
 * GET /health/ready
 * Readiness probe
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const dbHealth = await database.healthCheck();
    
    if (dbHealth.status === 'healthy') {
      res.status(200).json({ ready: true });
    } else {
      res.status(503).json({ ready: false, reason: 'Database not ready' });
    }
  } catch (error) {
    res.status(503).json({ ready: false, reason: 'Service not ready' });
  }
});

/**
 * GET /health/live
 * Liveness probe
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ alive: true });
});

export default router;
