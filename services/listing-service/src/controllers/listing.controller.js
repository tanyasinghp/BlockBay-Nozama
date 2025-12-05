const listingService = require('../services/listing.service');
const blockchainService = require('../services/blockchainService');
const ipfsService = require('../services/ipfsService');

class ListingController {
  async create(req, res, next) {
    try {
      // 1. Create listing in database
      const listingData = { ...req.body, status: 'published' };
      const listing = await listingService.createListing(listingData);

      // 2. Upload metadata to IPFS
      const ipfsCID = await ipfsService.uploadMetadata({
        name: listing.name,
        description: listing.description,
        images: listing.images,
      });

      // 3. Publish to blockchain
      const tx = await blockchainService.publishListing(listing, ipfsCID);

      // 4. Update local listing with blockchain and IPFS data
      const updatedListing = await listingService.updateListing(listing.listingId, {
        ipfsCID,
        blockchain: {
          network: 'localhost',
          contractAddress: blockchainService.getContractAddress(),
          transactionHash: tx.hash,
        },
      });

      res.status(201).json(updatedListing);
    } catch (error) {
      next(error);
    }
  }

  async get(req, res, next) {
    try {
      const listings = await listingService.getAllListings();
      res.json(listings);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const listing = await listingService.getListingById(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: 'Listing not found' });
      }
      res.json(listing);
    } catch (error) {
      next(error);
    }
  }

  async publish(req, res, next) {
    try {
      const listingId = req.params.id;
      const listing = await listingService.getListingById(listingId);
      
      if (!listing) {
        return res.status(404).json({ message: 'Listing not found' });
      }

      if (listing.status === 'published') {
        return res.status(400).json({ message: 'Listing is already published' });
      }

      // Upload metadata to IPFS
      const ipfsCID = await ipfsService.uploadMetadata({
        name: listing.name,
        description: listing.description,
        images: listing.images,
      });

      // Publish to blockchain
      const tx = await blockchainService.publishListing(listing, ipfsCID);

      // Update listing status and blockchain data
      const updatedListing = await listingService.updateListing(listingId, {
        status: 'published',
        ipfsCID,
        blockchain: {
          network: 'localhost',
          contractAddress: blockchainService.getContractAddress(),
          transactionHash: tx.hash,
        },
      });

      res.json(updatedListing);
    } catch (error) {
      next(error);
    }
  }

}

module.exports = new ListingController();
