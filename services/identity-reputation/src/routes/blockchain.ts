import { Router, Request, Response } from 'express';
import Identity from '../models/Identity';
import Rating from '../models/Rating';
import blockchainService from '../services/blockchainService';
import logger from '../utils/logger';
import { validateAddress, validateTxHash } from '../utils/validation';

const router = Router();

/**
 * POST /blockchain/sync/:address
 * Sync identity data with blockchain
 */
router.post('/sync/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    if (!validateAddress(address)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ADDRESS',
          message: 'Invalid Ethereum address format',
          timestamp: new Date().toISOString()
        }
      });
    }

    const did = `did:ethr:${address}`;
    const identity = await Identity.findByDID(did);

    if (!identity) {
      return res.status(404).json({
        error: {
          code: 'IDENTITY_NOT_FOUND',
          message: 'Identity not found for this address',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Sync with blockchain
    const blockchainData = await blockchainService.syncWithBlockchain(address);

    if (blockchainData && blockchainData.profile) {
      // Update identity with blockchain data
      if (blockchainData.profile.isVerified && !identity.verified) {
        identity.verified = true;
        identity.verification = {
          status: 'verified',
          method: 'blockchain',
          verifier: 'smart-contract',
          verifiedAt: new Date()
        };
      }

      // Update reputation score from blockchain if available
      if (blockchainData.reputationScore !== null && blockchainData.reputationScore > 0) {
        identity.reputationScore = {
          value: blockchainData.reputationScore,
          algo: 'blockchain-v1',
          confidence: 1.0
        };
      }

      await identity.save();
      logger.info(`Synced identity ${did} with blockchain data`);
    }

    res.json({
      did: identity.did,
      address: identity.address,
      blockchainData,
      synced: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error syncing with blockchain:', error);
    res.status(500).json({
      error: {
        code: 'BLOCKCHAIN_SYNC_ERROR',
        message: 'Failed to sync with blockchain',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /blockchain/status
 * Get blockchain service status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const isAvailable = await blockchainService.isContractAvailable();
    const blockNumber = await blockchainService.getBlockNumber();

    res.json({
      available: isAvailable,
      blockNumber,
      contractAddress: process.env.REPUTATION_CONTRACT_ADDRESS || null,
      rpcUrl: process.env.BLOCKCHAIN_RPC_URL || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting blockchain status:', error);
    res.status(500).json({
      error: {
        code: 'BLOCKCHAIN_STATUS_ERROR',
        message: 'Failed to get blockchain status',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /blockchain/verify-transaction
 * Verify a blockchain transaction
 */
router.post('/verify-transaction', async (req: Request, res: Response) => {
  try {
    const { txHash } = req.body;

    if (!validateTxHash(txHash)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TX_HASH',
          message: 'Invalid transaction hash format',
          timestamp: new Date().toISOString()
        }
      });
    }

    const isValid = await blockchainService.validateTransaction(txHash);

    res.json({
      txHash,
      valid: isValid,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error verifying transaction:', error);
    res.status(500).json({
      error: {
        code: 'TX_VERIFICATION_ERROR',
        message: 'Failed to verify transaction',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;