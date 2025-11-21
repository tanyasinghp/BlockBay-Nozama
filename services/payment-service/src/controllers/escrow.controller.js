// src/controllers/escrow.controller.js
const EscrowModel = require('../models/Escrow');
const { escrowContract, getFreshWallet, deployment, provider } = require('../config/blockchain');
const { ethers } = require('ethers');

/**
 * List escrows (filter by buyer/seller/orderId/state)
 */
exports.listEscrows = async (req, res, next) => {
  try {
    const { buyer, seller, orderId, state, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (buyer) filter['buyer.address'] = buyer;
    if (seller) filter['seller.address'] = seller;
    if (orderId) filter.orderId = orderId;
    if (state) filter.state = state;

    const { items, total } = await EscrowModel.list(filter, Number(page), Number(limit));
    res.json({
      escrows: items,
      pagination: { currentPage: Number(page), totalResults: total, resultsPerPage: Number(limit) }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get escrow by id
 */
exports.getEscrow = async (req, res, next) => {
  try {
    const { escrowId } = req.params;
    const doc = await EscrowModel.findOne({ escrowId }).lean();
    if (!doc) return res.status(404).json({ error: 'NotFound', message: 'Escrow not found' });
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

/**
 * Create escrow (server-side signing for demo). NOTE: production should have buyer create transaction client-side.
 */
exports.createEscrow = async (req, res, next) => {
  try {
    if (!escrowContract) return res.status(503).json({ error: 'ServiceUnavailable', message: 'Escrow contract not available' });

    const { orderId, buyer, seller, amount, currency = 'ETH', listingId, meta } = req.body;
    if (!orderId || !buyer?.address || !seller?.address || !amount) {
      return res.status(400).json({ error: 'BadRequest', message: 'orderId, buyer.address, seller.address, amount required' });
    }

    const amountWei = ethers.parseEther(String(amount));
    // For demo purposes: server creates a wallet and signs the tx (buyer impersonation).
    // Production: return raw tx data for client to sign with wallet (MetaMask).
    const buyerWallet = getFreshWallet(); // WARNING: buyer wallet uses server key in this demo
    const tx = await escrowContract.connect(buyerWallet).createEscrow(orderId, seller.address, { value: amountWei });
    const receipt = await tx.wait();

    // Build record
    const block = await provider.getBlock(receipt.blockNumber);
    const now = new Date(block.timestamp * 1000);
    const escrowId = receipt.logs && receipt.logs.length ? receipt.logs[0].topics ? receipt.logs[0].topics[1] || null : null : null;
    // Better: parse event logs to find escrowId — but indexer will handle full parsing.

    const doc = {
      escrowId: escrowId || `esc_${Date.now()}`, // placeholder if event not parsed here
      orderId,
      listingId,
      buyer: { address: buyer.address, did: buyer.did || `did:ethr:${buyer.address}`, name: buyer.name },
      seller: { address: seller.address, did: seller.did || `did:ethr:${seller.address}`, name: seller.name },
      amountWei: amountWei.toString(),
      amountEth: Number(amount),
      currency,
      state: 'locked',
      escrowAddress: deployment?.contracts?.Escrow?.address || null,
      transactionHash: receipt.transactionHash,
      network: 'localhost',
      createdAt: now,
      updatedAt: now
    };

    await EscrowModel.create(doc);

    res.status(201).json(doc);
  } catch (err) {
    if (err.message && err.message.includes('Escrow already exists')) {
      return res.status(409).json({ error: 'Conflict', message: 'Escrow already exists for this order' });
    }
    next(err);
  }
};

/**
 * Release escrow (call contract)
 */
exports.releaseEscrow = async (req, res, next) => {
  try {
    const { escrowId } = req.params;
    if (!escrowContract) return res.status(503).json({ error: 'ServiceUnavailable' });

    // Release is performed by owner or buyer; server will call using deployer key (demo)
    const tx = await escrowContract.releaseEscrow(escrowId);
    const receipt = await tx.wait();
    // indexer will update DB; return optimistic response
    res.json({ escrowId, transactionHash: receipt.transactionHash, status: 'released' });
  } catch (err) {
    if (err.message && err.message.includes('Escrow does not exist')) {
      return res.status(404).json({ error: 'NotFound', message: 'Escrow not found' });
    }
    if (err.message && err.message.includes('Not authorized')) {
      return res.status(409).json({ error: 'Conflict', message: 'Escrow cannot be released' });
    }
    next(err);
  }
};

/**
 * Refund escrow
 */
exports.refundEscrow = async (req, res, next) => {
  try {
    const { escrowId } = req.params;
    if (!escrowContract) return res.status(503).json({ error: 'ServiceUnavailable' });

    const tx = await escrowContract.refundEscrow(escrowId);
    const receipt = await tx.wait();
    res.json({ escrowId, transactionHash: receipt.transactionHash, status: 'refunded' });
  } catch (err) {
    if (err.message && err.message.includes('Escrow does not exist')) {
      return res.status(404).json({ error: 'NotFound', message: 'Escrow not found' });
    }
    next(err);
  }
};

/**
 * Register webhook (simple in-memory)
 */
const { registerWebhook } = require('../services/webhookService');
exports.registerWebhook = async (req, res, next) => {
  try {
    const { url, events, secret } = req.body;
    if (!url || !events) return res.status(400).json({ error: 'BadRequest', message: 'url and events required' });
    const id = `wh_${Date.now()}`;
    const result = registerWebhook({ id, url, events, secret });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};
