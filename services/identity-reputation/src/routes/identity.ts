import { Router, Request, Response } from 'express';
import Identity, { IIdentity } from '../models/Identity';
import logger from '../utils/logger';
import { validateDID, validateAddress } from '../utils/validation';

const router = Router();

/**
 * POST /identities
 * Create a new identity (DID)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { address, name, bio, avatar, metadata } = req.body;

    // Validate required fields
    if (!address) {
      return res.status(400).json({
        error: {
          code: 'MISSING_ADDRESS',
          message: 'Address is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!validateAddress(address)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ADDRESS',
          message: 'Invalid Ethereum address format',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Generate DID from address
    const did = `did:ethr:${address}`;

    // Check if identity already exists
    const existingIdentity = await Identity.findByDID(did);
    if (existingIdentity) {
      return res.status(409).json({
        error: {
          code: 'IDENTITY_EXISTS',
          message: 'Identity already exists for this address',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Create new identity
    const identity = new Identity({
      did,
      address,
      name,
      bio,
      avatar,
      metadata: metadata || {}
    });

    await identity.save();

    logger.info(`Created new identity: ${did}`);

    res.status(201).json({
      did: identity.did,
      address: identity.address,
      name: identity.name,
      bio: identity.bio,
      avatar: identity.avatar,
      metadata: identity.metadata,
      verified: identity.verified,
      verification: identity.verification,
      reputationScore: identity.reputationScore,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt
    });

  } catch (error) {
    logger.error('Error creating identity:', error);
    res.status(500).json({
      error: {
        code: 'IDENTITY_CREATION_ERROR',
        message: 'Failed to create identity',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /identities/:did
 * Get identity by DID
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

    res.json({
      did: identity.did,
      address: identity.address,
      name: identity.name,
      bio: identity.bio,
      avatar: identity.avatar,
      metadata: identity.metadata,
      verified: identity.verified,
      verification: identity.verification,
      reputationScore: identity.reputationScore,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt
    });

  } catch (error) {
    logger.error('Error fetching identity:', error);
    res.status(500).json({
      error: {
        code: 'IDENTITY_FETCH_ERROR',
        message: 'Failed to fetch identity',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /identities (list with filters)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      address, 
      did, 
      name, 
      verified, 
      page = 1, 
      limit = 20 
    } = req.query;

    const filter: any = {};
    if (address) filter.address = address;
    if (did) filter.did = did;
    if (name) filter.name = new RegExp(name as string, 'i');
    if (verified !== undefined) filter.verified = verified === 'true';

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [identities, totalCount] = await Promise.all([
      Identity.find(filter)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Identity.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      identities,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalResults: totalCount,
        resultsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1
      },
      filters: {
        ...(address && { address }),
        ...(did && { did }),
        ...(name && { name }),
        ...(verified !== undefined && { verified: verified === 'true' })
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error listing identities:', error);
    res.status(500).json({
      error: {
        code: 'IDENTITIES_LIST_ERROR',
        message: 'Failed to list identities',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * PUT /identities/:did (update identity)
 */
router.put('/:did', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    const { name, bio, avatar, metadata } = req.body;

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

    // Update fields
    if (name !== undefined) identity.name = name;
    if (bio !== undefined) identity.bio = bio;
    if (avatar !== undefined) identity.avatar = avatar;
    if (metadata !== undefined) identity.metadata = { ...identity.metadata, ...metadata };

    await identity.save();

    res.json({
      did: identity.did,
      address: identity.address,
      name: identity.name,
      bio: identity.bio,
      avatar: identity.avatar,
      metadata: identity.metadata,
      verified: identity.verified,
      verification: identity.verification,
      reputationScore: identity.reputationScore,
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt
    });

  } catch (error) {
    logger.error('Error updating identity:', error);
    res.status(500).json({
      error: {
        code: 'IDENTITY_UPDATE_ERROR',
        message: 'Failed to update identity',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /identities/:did/verify (verification)
 */
router.post('/:did/verify', async (req: Request, res: Response) => {
  try {
    const { did } = req.params;
    const { method, verifier, txHash, blockNumber } = req.body;

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

    if (identity.verified) {
      return res.status(409).json({
        error: {
          code: 'ALREADY_VERIFIED',
          message: 'Identity is already verified',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update verification status
    identity.verification = {
      status: 'verified',
      method: method || 'manual',
      verifier: verifier || 'admin',
      txHash,
      blockNumber,
      verifiedAt: new Date()
    };
    identity.verified = true;

    await identity.save();

    logger.info(`Verified identity: ${did} by ${verifier}`);

    res.json({
      did: identity.did,
      verification: identity.verification,
      message: 'Identity verified successfully'
    });

  } catch (error) {
    logger.error('Error verifying identity:', error);
    res.status(500).json({
      error: {
        code: 'VERIFICATION_ERROR',
        message: 'Failed to verify identity',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;