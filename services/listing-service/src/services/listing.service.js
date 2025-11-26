const { v4: uuidv4 } = require('uuid');
const Listing = require('../models/Listing');
const ipfsService = require('./ipfsService');
const blockchainService = require('./blockchainService');

class ListingService {
  async createListing(data) {
    const listingData = {
      ...data,
      listingId: `lst_${uuidv4()}`,
      priceUSD: data.price * 2000, // Assuming a fixed conversion rate for now
      seller: {
        ...data.seller,
        did: `did:ethr:${data.seller.address}`,
      },
      blockchain: {
        network: 'localhost',
        contractAddress: '',
        tokenId: '',
        transactionHash: '',
        blockNumber: 0,
      },
    };
    const listing = new Listing(listingData);
    await listing.save();
    return listing;
  }

  async getListingById(listingId) {
    return Listing.findOne({ listingId });
  }

  async getAllListings(filter = {}) {
    return Listing.find(filter);
  }

  async updateListing(listingId, updates) {
    return Listing.findOneAndUpdate({ listingId }, updates, { new: true });
  }
}

module.exports = new ListingService();
