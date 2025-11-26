import { Router, Request, Response } from 'express';
import Product from '../models/Product';
import logger from '../utils/logger';
import config from '../config';

const router = Router();

/**
 * GET /search
 * Advanced product search with filtering, sorting, and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      q: query,
      category,
      tags,
      minPrice,
      maxPrice,
      minReputation,
      verified,
      sortBy = 'popularity',
      page = 1,
      limit = config.DEFAULT_PAGE_SIZE
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(
      config.MAX_PAGE_SIZE,
      Math.max(1, parseInt(limit as string) || config.DEFAULT_PAGE_SIZE)
    );

    // Build search parameters
    const searchParams = {
      query: query as string,
      category: category as string,
      tags: tags ? (tags as string).split(',').map(tag => tag.trim()) : undefined,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      minReputation: minReputation ? parseInt(minReputation as string) : undefined,
      verified: verified === 'true',
      sortBy: sortBy as string,
      page: pageNum,
      limit: limitNum
    };

    // Execute search using Product model static method
    const products = await (Product as any).searchProducts(searchParams);
    const totalCount = await Product.countDocuments({
      ...(query && { $text: { $search: query as string } }),
      ...(category && { category }),
      ...(searchParams.tags && { tags: { $in: searchParams.tags } }),
      ...(minPrice !== undefined && { price: { $gte: parseFloat(minPrice as string) } }),
      ...(maxPrice !== undefined && { price: { ...((minPrice !== undefined) ? { $gte: parseFloat(minPrice as string) } : {}), $lte: parseFloat(maxPrice as string) } }),
      ...(minReputation !== undefined && { 'seller.reputation': { $gte: parseInt(minReputation as string) } }),
      ...(verified === 'true' && { 'seller.verified': true })
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    const response = {
      results: products,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalResults: totalCount,
        resultsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1
      },
      filters: {
        ...(query && { query }),
        ...(category && { category }),
        ...(searchParams.tags && { tags: searchParams.tags }),
        ...(searchParams.minPrice !== undefined && { minPrice: searchParams.minPrice }),
        ...(searchParams.maxPrice !== undefined && { maxPrice: searchParams.maxPrice }),
        ...(searchParams.minReputation !== undefined && { minReputation: searchParams.minReputation }),
        ...(verified === 'true' && { verified: true }),
        sortBy: sortBy as string
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error performing search:', error);
    res.status(500).json({
      error: {
        code: 'SEARCH_ERROR',
        message: 'Failed to perform search',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /search/trending
 * Get trending products based on views, sales, and recency
 */
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const {
      timeframe = '24h',
      category,
      limit = 10
    } = req.query;

    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));

    // Build filter for trending products
    const filter: any = { isActive: true };
    
    if (category) {
      filter.category = category;
    }

    // Calculate date threshold based on timeframe
    let dateThreshold = new Date();
    switch (timeframe) {
      case '7d':
        dateThreshold.setDate(dateThreshold.getDate() - 7);
        break;
      case '30d':
        dateThreshold.setDate(dateThreshold.getDate() - 30);
        break;
      case '24h':
      default:
        dateThreshold.setDate(dateThreshold.getDate() - 1);
        break;
    }

    // Get trending products using aggregation pipeline for better performance
    const trendingProducts = await Product.aggregate([
      { $match: filter },
      {
        $addFields: {
          // Calculate trending score
          trendingScore: {
            $add: [
              // View score (logarithmic)
              { $multiply: [{ $ln: { $add: ['$views', 1] } }, 10] },
              // Sales score
              { $multiply: ['$sales', 5] },
              // Featured boost
              { $cond: { if: '$featured', then: 20, else: 0 } },
              // Recency boost (newer products get higher score)
              {
                $multiply: [
                  {
                    $max: [
                      0,
                      {
                        $subtract: [
                          30,
                          {
                            $divide: [
                              { $subtract: [new Date(), '$createdAt'] },
                              86400000 // milliseconds in a day
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  1
                ]
              }
            ]
          }
        }
      },
      { $sort: { trendingScore: -1, views: -1, sales: -1 } },
      { $limit: limitNum }
    ]);

    const response = {
      products: trendingProducts,
      count: trendingProducts.length,
      timeframe,
      ...(category && { category }),
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching trending products:', error);
    res.status(500).json({
      error: {
        code: 'TRENDING_ERROR',
        message: 'Failed to fetch trending products',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /search/products/:productId
 * Get detailed product information by ID
 */
router.get('/products/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    
    if (!productId) {
      res.status(400).json({
        error: {
          code: 'MISSING_PRODUCT_ID',
          message: 'Product ID is required',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const product = await Product.findOne({
      $or: [
        { listingId: productId },
        { 'blockchain.contractAddress': productId },
        { 'blockchain.tokenId': productId }
      ]
    });

    if (!product) {
      res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: `Product with ID '${productId}' not found`,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Increment view count
    await product.incrementViews();

    res.json(product);
  } catch (error) {
    logger.error('Error fetching product:', error);
    res.status(500).json({
      error: {
        code: 'PRODUCT_FETCH_ERROR',
        message: 'Failed to fetch product',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /search/suggestions
 * Get search suggestions based on query
 */
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const { q: query } = req.query;
    
    if (!query || (query as string).length < 2) {
      res.json({
        suggestions: [],
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Get product name suggestions using text search
    const suggestions = await Product.find(
      {
        $text: { $search: query as string }
      },
      { name: 1, category: 1, _id: 0 }
    )
    .sort({ score: { $meta: 'textScore' } })
    .limit(10);

    // Extract unique suggestions
    const uniqueSuggestions = Array.from(
      new Set(suggestions.map(product => product.name))
    ).slice(0, 8);

    res.json({
      suggestions: uniqueSuggestions,
      query,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching suggestions:', error);
    res.status(500).json({
      error: {
        code: 'SUGGESTIONS_ERROR',
        message: 'Failed to fetch suggestions',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;
