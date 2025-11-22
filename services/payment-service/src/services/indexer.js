// src/services/indexer.js
const { escrowContract, deployment, provider } = require('../config/blockchain');
const EscrowModel = require('../models/Escrow');
const { deliverWebhook } = require('./webhookService');
const { ethers } = require('ethers');

function normalizeIndexed(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value.hash) return value.hash;      // indexed bytes32
  return value.toString();                // fallback
}

async function startIndexer() {
  if (!escrowContract) {
    console.warn('[Indexer] Escrow contract not found, skipping indexer start.');
    return;
  }

  // -----------------------------
  // EscrowCreated Event
  // -----------------------------
  escrowContract.on('EscrowCreated', async (escrowIdBytes, orderIdBytes, buyer, seller, amount, event) => {
    try {
      const escrowId = normalizeIndexed(escrowIdBytes);
      const orderId = normalizeIndexed(orderIdBytes);
      const amountWei = amount.toString();
      const amountEth = parseFloat(ethers.formatEther(amount));

      const block = await provider.getBlock(event.blockNumber);
      const createdAtTs = new Date(block.timestamp * 1000);

      const doc = {
        escrowId,
        orderId,
        buyer: { address: buyer, did: `did:ethr:${buyer}` },
        seller: { address: seller, did: `did:ethr:${seller}` },
        amountWei,
        amountEth,
        currency: 'ETH',
        state: 'locked',
        escrowAddress: deployment?.contracts?.Escrow?.address || null,
        transactionHash: event.transactionHash,
        network: 'localhost',
        createdAt: createdAtTs,
        updatedAt: createdAtTs,
        releaseTime: null,
        disputed: false
      };

      await EscrowModel.findOneAndUpdate({ escrowId }, doc, { upsert: true });
      await deliverWebhook('escrow.created', doc);

      console.log('[Indexer] EscrowCreated indexed:', escrowId);
    } catch (err) {
      console.error('[Indexer] EscrowCreated handler error:', err);
    }
  });

  // -----------------------------
  // EscrowReleased Event
  // -----------------------------
  escrowContract.on('EscrowReleased', async (escrowIdBytes, orderIdBytes, sellerAddr, amount, event) => {
    try {
      const escrowId = normalizeIndexed(escrowIdBytes);

      const block = await provider.getBlock(event.blockNumber);
      const ts = new Date(block.timestamp * 1000);

      const update = {
        state: 'released',
        transactionHash: event.transactionHash,
        updatedAt: ts
      };

      await EscrowModel.findOneAndUpdate({ escrowId }, update);
      const doc = await EscrowModel.findOne({ escrowId }).lean();

      await deliverWebhook('escrow.released', { ...doc, transactionHash: event.transactionHash });

      console.log('[Indexer] EscrowReleased:', escrowId);
    } catch (err) {
      console.error('[Indexer] EscrowReleased handler error:', err);
    }
  });

  // -----------------------------
  // EscrowRefunded Event
  // -----------------------------
  escrowContract.on('EscrowRefunded', async (escrowIdBytes, orderIdBytes, buyerAddr, amount, event) => {
    try {
      const escrowId = normalizeIndexed(escrowIdBytes);

      const block = await provider.getBlock(event.blockNumber);
      const ts = new Date(block.timestamp * 1000);

      const update = {
        state: 'refunded',
        transactionHash: event.transactionHash,
        updatedAt: ts
      };

      await EscrowModel.findOneAndUpdate({ escrowId }, update);
      const doc = await EscrowModel.findOne({ escrowId }).lean();

      await deliverWebhook('escrow.refunded', { ...doc, transactionHash: event.transactionHash });

      console.log('[Indexer] EscrowRefunded:', escrowId);
    } catch (err) {
      console.error('[Indexer] EscrowRefunded handler error:', err);
    }
  });

  // -----------------------------
  // DisputeInitiated Event
  // -----------------------------
  escrowContract.on('DisputeInitiated', async (escrowIdBytes, orderIdBytes, initiator, event) => {
    try {
      const escrowId = normalizeIndexed(escrowIdBytes);

      const block = await provider.getBlock(event.blockNumber);
      const ts = new Date(block.timestamp * 1000);

      const update = {
        state: 'disputed',
        disputed: true,
        updatedAt: ts
      };

      await EscrowModel.findOneAndUpdate({ escrowId }, update);
      const doc = await EscrowModel.findOne({ escrowId }).lean();

      await deliverWebhook('escrow.disputed', { ...doc, initiator, transactionHash: event.transactionHash });

      console.log('[Indexer] DisputeInitiated:', escrowId);
    } catch (err) {
      console.error('[Indexer] DisputeInitiated handler error:', err);
    }
  });

  console.log('[Indexer] Listening to escrow contract events');
}

module.exports = { startIndexer };
