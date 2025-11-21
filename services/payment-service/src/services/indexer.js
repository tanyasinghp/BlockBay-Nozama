// src/services/indexer.js
const { escrowContract, deployment, provider } = require('../config/blockchain');
const EscrowModel = require('../models/Escrow');
const { deliverWebhook } = require('./webhookService');
const { ethers } = require('ethers');

async function startIndexer() {
  if (!escrowContract) {
    console.warn('[Indexer] Escrow contract not found, skipping indexer start.');
    return;
  }

  // Handle EscrowCreated
  escrowContract.on('EscrowCreated', async (escrowIdBytes, orderId, buyer, seller, amount, event) => {
    try {
      const escrowId = escrowIdBytes; // bytes32 -> string representation
      const amountWei = amount.toString();
      const amountEth = parseFloat(ethers.formatEther(amount));
      const createdAt = new Date(); // if the event doesn't include timestamp use block timestamp
      // fetch block timestamp
      const block = await provider.getBlock(event.blockNumber);
      const createdAtTs = new Date(block.timestamp * 1000);

      const doc = {
        escrowId: escrowId,
        orderId,
        buyer: { address: buyer, did: `did:ethr:${buyer}` },
        seller: { address: seller, did: `did:ethr:${seller}` },
        amountWei,
        amountEth,
        currency: 'ETH',
        state: 'locked',
        escrowAddress: deployment?.contracts?.Escrow || null,
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

  // EscrowReleased
  escrowContract.on('EscrowReleased', async (escrowIdBytes, orderId, sellerAddr, amount, event) => {
    try {
      const escrowId = escrowIdBytes;
      const amountWei = amount.toString();
      const amountEth = parseFloat(ethers.formatEther(amount));
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

  // EscrowRefunded
  escrowContract.on('EscrowRefunded', async (escrowIdBytes, orderId, buyerAddr, amount, event) => {
    try {
      const escrowId = escrowIdBytes;
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

  // DisputeInitiated
  escrowContract.on('DisputeInitiated', async (escrowIdBytes, orderId, initiator, event) => {
    try {
      const escrowId = escrowIdBytes;
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
