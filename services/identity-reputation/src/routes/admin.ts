import { Router, Request, Response } from 'express';
import Identity from '../models/Identity';
import Rating from '../models/Rating';
import logger from '../utils/logger';
import config from '../config';

const router = Router();

/**
 * Middleware to check admin API key
 */
const requireAdminAuth = (req: Request, res: Response, next: any) => {
  const apiKey = req.headers['x-admin-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey || apiKey !== config.ADMIN_API_KEY) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing admin API key',
        timestamp: new Date().toISOString()
      }
    });
  }
  
  next();
};

/**
 * GET /admin/stats
 * Get system statistics
 */
router.get('/stats', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const [
      totalIdentities,
      verifiedIdentities,
      totalRatings,
      recentIdentities,
      recentRatings
    ] = await Promise.all([
      Identity.countDocuments({}),
      Identity.countDocuments({ verified: true }),
      Rating.countDocuments({}),
      Identity.countDocuments({ 
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
      }),
      Rating.countDocuments({ 
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
      })
    ]);

    const verificationRate = totalIdentities > 0 ? (verifiedIdentities / totalIdentities) * 100 : 0;

    res.json({
      identities: {
        total: totalIdentities,
        verified: verifiedIdentities,
        unverified: totalIdentities - verifiedIdentities,
        verificationRate: Math.round(verificationRate * 100) / 100,
        recentlyCreated: recentIdentities
      },
      ratings: {
        total: totalRatings,
        recentlyCreated: recentRatings,
        averagePerIdentity: totalIdentities > 0 ? Math.round((totalRatings / totalIdentities) * 100) / 100 : 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching admin stats:', error);
    res.status(500).json({
      error: {
        code: 'STATS_ERROR',
        message: 'Failed to fetch statistics',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /admin/identities/:did/verify
 * Admin verify identity
 */
router.post('/identities/:did/verify', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    const { method = 'admin', notes } = req.body;

    const identity = await Identity.findByDID(did);
    if (!identity) {
      return res.status(404).json({
        error: {
          code: 'IDENTITY_NOT_FOUND',
          message: 'Identity not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    identity.verified = true;
    identity.verification = {
      status: 'verified',
      method,
      verifier: 'admin',
      verifiedAt: new Date()
    };

    if (notes) {
      identity.metadata = { ...identity.metadata, adminNotes: notes };
    }

    await identity.save();

    logger.info(`Admin verified identity: ${did}`);

    res.json({
      did: identity.did,
      verified: true,
      verification: identity.verification,
      message: 'Identity verified by admin'
    });

  } catch (error) {
    logger.error('Error in admin verification:', error);
    res.status(500).json({
      error: {
        code: 'ADMIN_VERIFICATION_ERROR',
        message: 'Failed to verify identity',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * DELETE /admin/ratings/:ratingId
 * Admin delete rating
 */
router.delete('/ratings/:ratingId', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { ratingId } = req.params;
    const { reason } = req.body;

    const rating = await Rating.findOne({ ratingId });
    if (!rating) {
      return res.status(404).json({
        error: {
          code: 'RATING_NOT_FOUND',
          message: 'Rating not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    await Rating.deleteOne({ ratingId });

    logger.info(`Admin deleted rating: ${ratingId}, reason: ${reason}`);

    res.json({
      ratingId,
      deleted: true,
      reason: reason || 'No reason provided',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error deleting rating:', error);
    res.status(500).json({
      error: {
        code: 'RATING_DELETE_ERROR',
        message: 'Failed to delete rating',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;