const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const { escrowContract } = require('../config/blockchain');

/**
 * GET /api/v1/escrow/:escrowId
 * Get escrow details by escrow ID
 */
router.get('/:escrowId', async (req, res, next) => {
  try {
    if (!escrowContract) {
      return res.status(503).json({
        error: 'ServiceUnavailable',
        message: 'Escrow contract not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const { escrowId } = req.params;

    try {
      const escrow = await escrowContract.getEscrow(escrowId);

      res.json({
        escrowId: escrow.escrowId,
        orderId: escrow.orderId,
        buyer: {
          address: escrow.buyer,
          did: `did:ethr:${escrow.buyer}`
        },
        seller: {
          address: escrow.seller,
          did: `did:ethr:${escrow.seller}`
        },
        amount: ethers.formatEther(escrow.amount),
        amountWei: escrow.amount.toString(),
        state: getEscrowState(escrow.state),
        disputed: escrow.disputed,
        createdAt: new Date(Number(escrow.createdAt) * 1000).toISOString(),
        releaseTime: new Date(Number(escrow.releaseTime) * 1000).toISOString(),
        canAutoRelease: await escrowContract.canAutoRelease(escrowId)
      });
    } catch (error) {
      if (error.message.includes('Escrow does not exist')) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'Escrow not found',
          timestamp: new Date().toISOString()
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/escrow/order/:orderId
 * Get escrow details by order ID
 */
router.get('/order/:orderId', async (req, res, next) => {
  try {
    if (!escrowContract) {
      return res.status(503).json({
        error: 'ServiceUnavailable',
        message: 'Escrow contract not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const { orderId } = req.params;

    try {
      const escrow = await escrowContract.getEscrowByOrderId(orderId);

      res.json({
        escrowId: escrow.escrowId,
        orderId: escrow.orderId,
        buyer: {
          address: escrow.buyer,
          did: `did:ethr:${escrow.buyer}`
        },
        seller: {
          address: escrow.seller,
          did: `did:ethr:${escrow.seller}`
        },
        amount: ethers.formatEther(escrow.amount),
        amountWei: escrow.amount.toString(),
        state: getEscrowState(escrow.state),
        disputed: escrow.disputed,
        createdAt: new Date(Number(escrow.createdAt) * 1000).toISOString(),
        releaseTime: new Date(Number(escrow.releaseTime) * 1000).toISOString(),
        canAutoRelease: await escrowContract.canAutoRelease(escrow.escrowId)
      });
    } catch (error) {
      if (error.message.includes('No escrow found')) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'No escrow found for this order',
          timestamp: new Date().toISOString()
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// Helper function
function getEscrowState(stateEnum) {
  const states = ['locked', 'released', 'refunded', 'disputed'];
  return states[Number(stateEnum)] || 'unknown';
}

module.exports = router;

