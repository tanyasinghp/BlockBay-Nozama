const express = require('express');
const router = express.Router();
const { provider, deployment } = require('../config/blockchain');

/**
 * Health check endpoint
 */
router.get('/', async (req, res) => {
  try {
    // Check blockchain connection
    let blockchainStatus = 'disconnected';
    let blockNumber = null;
    
    try {
      blockNumber = await provider.getBlockNumber();
      blockchainStatus = 'connected';
    } catch (error) {
      console.error('Blockchain connection error:', error.message);
    }

    res.json({
      status: 'healthy',
      service: 'Order Service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      blockchain: {
        status: blockchainStatus,
        rpc: process.env.BLOCKCHAIN_RPC_URL,
        blockNumber: blockNumber,
        contracts: deployment ? {
          listingRegistry: deployment.contracts.ListingRegistry,
          escrow: deployment.contracts.Escrow,
          orderManager: deployment.contracts.OrderManager
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;

