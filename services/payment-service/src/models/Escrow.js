// src/models/Escrow.js
const mongoose = require('mongoose');

const EscrowSchema = new mongoose.Schema({
  escrowId: { type: String, required: true, index: true, unique: true },
  orderId: { type: String, required: true, index: true },
  listingId: { type: String, index: true },
  buyer: {
    address: { type: String, required: true, index: true },
    did: String,
    name: String
  },
  seller: {
    address: { type: String, required: true, index: true },
    did: String,
    name: String
  },
  amountWei: { type: String, required: true },
  amountEth: { type: Number, required: true },
  currency: { type: String, default: 'ETH' },
  state: { type: String, enum: ['locked','released','refunded','disputed','failed'], default: 'locked', index: true },
  escrowAddress: { type: String }, // contract address (if multiple)
  transactionHash: { type: String },
  network: { type: String, default: 'localhost' },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
  releaseTime: { type: Date },
  disputed: { type: Boolean, default: false },
  notes: { type: String }
}, {
  collection: 'escrows'
});

// Simple pagination static
EscrowSchema.statics.list = function (filter = {}, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  return Promise.all([
    this.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    this.countDocuments(filter)
  ]).then(([items, total]) => ({ items, total }));
};

module.exports = mongoose.model('Escrow', EscrowSchema);
