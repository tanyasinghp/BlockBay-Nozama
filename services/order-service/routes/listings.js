const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const { listingRegistryContract } = require('../config/blockchain');

/**
 * GET /api/v1/listings
 * Get all listings (with pagination simulation)
 */
router.get('/', async (req, res, next) => {
  try {
    if (!listingRegistryContract) {
      return res.status(503).json({
        error: 'ServiceUnavailable',
        message: 'ListingRegistry contract not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    // Get total count
    const totalCount = await listingRegistryContract.getListingsCount();
    const totalCountNum = Number(totalCount);
    
    // Get all listing IDs (in production, implement proper pagination)
    const listings = [];
    const startIdx = (page - 1) * limit;
    const endIdx = Math.min(startIdx + limit, totalCountNum);
    
    for (let i = startIdx; i < endIdx; i++) {
      try {
        const listingId = await listingRegistryContract.listingIds(i);
        const listing = await listingRegistryContract.getListing(listingId);
        
        listings.push({
          listingId: listing.listingId,
          name: listing.name,
          price: ethers.formatEther(listing.price),
          currency: listing.currency,
          stock: Number(listing.stock),
          seller: {
            address: listing.seller,
            did: `did:ethr:${listing.seller}`
          },
          ipfsMetadata: {
            cid: listing.ipfsCID,
            url: `https://ipfs.io/ipfs/${listing.ipfsCID}`
          },
          active: listing.active,
          createdAt: new Date(Number(listing.createdAt) * 1000).toISOString()
        });
      } catch (error) {
        console.error(`Error fetching listing at index ${i}:`, error.message);
      }
    }

    res.json({
      listings,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCountNum / limit),
        totalResults: totalCountNum,
        resultsPerPage: limit
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/listings/:listingId
 * Get specific listing details
 */
router.get('/:listingId', async (req, res, next) => {
  try {
    if (!listingRegistryContract) {
      return res.status(503).json({
        error: 'ServiceUnavailable',
        message: 'ListingRegistry contract not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const { listingId } = req.params;
    
    try {
      const listing = await listingRegistryContract.getListing(listingId);
      
      res.json({
        listingId: listing.listingId,
        name: listing.name,
        price: ethers.formatEther(listing.price),
        priceWei: listing.price.toString(),
        currency: listing.currency,
        stock: Number(listing.stock),
        seller: {
          address: listing.seller,
          did: `did:ethr:${listing.seller}`
        },
        ipfsMetadata: {
          cid: listing.ipfsCID,
          url: `https://ipfs.io/ipfs/${listing.ipfsCID}`
        },
        active: listing.active,
        createdAt: new Date(Number(listing.createdAt) * 1000).toISOString()
      });
    } catch (error) {
      if (error.message.includes('Listing does not exist')) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'Listing not found',
          timestamp: new Date().toISOString()
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;

