const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ListingSchema = new mongoose.Schema(
  {
    listingId: {
      type: String,
      required: true,
      unique: true,
      default: () => `lst_${uuidv4()}`,
    },
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    currency: { type: String, required: true, default: 'ETH' },
    stock: { type: Number, required: true },
    images: [{ type: String }],
    seller: {
      address: { type: String, required: true },
      name: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'sold_out', 'inactive'],
      default: 'draft',
    },
    blockchain: {
      network: String,
      transactionHash: String,
    },
    ipfsCID: String,
  },
  { timestamps: true, collection: 'products' }
);

module.exports = mongoose.model('Product', ListingSchema);
