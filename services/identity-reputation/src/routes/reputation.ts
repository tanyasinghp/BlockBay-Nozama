import { Router, Request, Response } from 'express';
import Identity from '../models/Identity';
import Rating from '../models/Rating';
import logger from '../utils/logger';
import { validateDID, validateRating } from '../utils/validation';

const router = Router();

/**
 * GET /reputation/:did
 * Get aggregated reputation for a DID
 */
router.get('/:did', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;

    if (!validateDID(did)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_DID',
          message: 'Invalid DID format',
          timestamp: new Date().toISOString()
        }
      });
    }

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

    // Get recent ratings
    const recentRatings = await Rating.find({ 'to.did': did })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Calculate breakdown
    const allRatings = await Rating.find({ 'to.did': did }).lean();
    const breakdown = {
      totalRatings: allRatings.length,
      averageScore: allRatings.length > 0 
        ? allRatings.reduce((sum, r) => sum + r.score, 0) / allRatings.length 
        : 0,
      scoreDistribution: {
        1: allRatings.filter(r => r.score === 1).length,
        2: allRatings.filter(r => r.score === 2).length,
        3: allRatings.filter(r => r.score === 3).length,
        4: allRatings.filter(r => r.score === 4).length,
        5: allRatings.filter(r => r.score === 5).length,
      }
    };

    res.json({
      did,
      score: identity.reputationScore,
      breakdown,
      recentRatings: recentRatings.map(rating => ({
        ratingId: rating.ratingId,
        orderId: rating.orderId,
        from: rating.from,
        score: rating.score,
        comment: rating.comment,
        type: rating.type,
        createdAt: rating.createdAt
      })),
      computedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error fetching reputation:', error);
    res.status(500).json({
      error: {
        code: 'REPUTATION_FETCH_ERROR',
        message: 'Failed to fetch reputation',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /reputation/:did/ratings
 * List ratings for a DID
 */
router.get('/:did/ratings', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      type 
    } = req.query;

    if (!validateDID(did)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_DID',
          message: 'Invalid DID format',
          timestamp: new Date().toISOString()
        }
      });
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { 'to.did': did };
    if (type) filter.type = type;

    const [ratings, totalCount] = await Promise.all([
      Rating.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Rating.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      ratings,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalResults: totalCount,
        resultsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error listing ratings:', error);
    res.status(500).json({
      error: {
        code: 'RATINGS_LIST_ERROR',
        message: 'Failed to list ratings',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /reputation/:did/ratings
 * Submit a rating for a DID
 */
router.post('/:did/ratings', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    const { orderId, from, score, comment, type, evidence } = req.body;

    if (!validateDID(did)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_DID',
          message: 'Invalid DID format',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!validateRating(score)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_RATING',
          message: 'Rating must be between 1 and 5',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if rating already exists for this order
    const existingRating = await Rating.findOne({ 
      orderId, 
      'from.did': from.did,
      'to.did': did 
    });

    if (existingRating) {
      return res.status(409).json({
        error: {
          code: 'RATING_EXISTS',
          message: 'Rating already exists for this order',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Create new rating
    const rating = new Rating({
      orderId,
      from,
      to: {
        did,
        address: req.body.to?.address || did.replace('did:ethr:', ''),
        name: req.body.to?.name
      },
      score,
      comment,
      type: type || 'buyer_to_seller',
      evidence: evidence || {}
    });

    await rating.save();

    // Update identity reputation score
    const identity = await Identity.findByDID(did);
    if (identity) {
      const allRatings = await Rating.find({ 'to.did': did }).lean();
      const averageScore = allRatings.reduce((sum, r) => sum + r.score, 0) / allRatings.length;
      
      // Simple reputation calculation (can be made more sophisticated)
      const reputationValue = Math.round((averageScore / 5) * 100);
      
      identity.reputationScore = {
        value: reputationValue,
        algo: 'weighted-v1',
        confidence: Math.min(1, allRatings.length / 10) // Higher confidence with more ratings
      };
      
      await identity.save();
    }

    logger.info(`Created rating ${rating.ratingId} for ${did}`);

    res.status(201).json({
      ratingId: rating.ratingId,
      orderId: rating.orderId,
      from: rating.from,
      to: rating.to,
      score: rating.score,
      comment: rating.comment,
      type: rating.type,
      evidence: rating.evidence,
      createdAt: rating.createdAt
    });

  } catch (error) {
    logger.error('Error creating rating:', error);
    res.status(500).json({
      error: {
        code: 'RATING_CREATION_ERROR',
        message: 'Failed to create rating',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /reputation/recompute
 * Recompute reputation scores for all identities
 */
router.post('/recompute', async (req: Request, res: Response) => {
  try {
    const identities = await Identity.find({}).lean();
    let updated = 0;

    for (const identity of identities) {
      const ratings = await Rating.find({ 'to.did': identity.did }).lean();
      
      if (ratings.length > 0) {
        const averageScore = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
        const reputationValue = Math.round((averageScore / 5) * 100);
        
        await Identity.updateOne(
          { _id: identity._id },
          {
            $set: {
              reputationScore: {
                value: reputationValue,
                algo: 'weighted-v1',
                confidence: Math.min(1, ratings.length / 10)
              }
            }
          }
        );
        updated++;
      }
    }

    logger.info(`Recomputed reputation scores for ${updated} identities`);

    res.json({
      message: 'Reputation scores recomputed successfully',
      identitiesUpdated: updated,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error recomputing reputation scores:', error);
    res.status(500).json({
      error: {
        code: 'RECOMPUTE_ERROR',
        message: 'Failed to recompute reputation scores',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;