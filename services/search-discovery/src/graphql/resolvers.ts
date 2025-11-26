import { GraphQLError } from 'graphql';
import { GraphQLScalarType, Kind } from 'graphql';
import Product from '../models/Product';
import Category from '../models/Category';
import config from '../config';
import logger from '../utils/logger';

// Custom scalar for DateTime
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value: any) {
    return value instanceof Date ? value.toISOString() : value;
  },
  parseValue(value: any) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

// Custom scalar for JSON
const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize(value: any) {
    return value;
  },
  parseValue(value: any) {
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.OBJECT) {
      return ast;
    }
    return null;
  },
});

// Helper function to build sort object
const buildSortObject = (sortBy: string) => {
  const sortMap: Record<string, any> = {
    POPULARITY: { featured: -1, views: -1, sales: -1 },
    PRICE_ASC: { price: 1 },
    PRICE_DESC: { price: -1 },
    NEWEST: { createdAt: -1 },
    RATING: { rating: -1, totalRatings: -1 },
    RELEVANCE: { score: { $meta: 'textScore' } },
  };
  return sortMap[sortBy] || sortMap.POPULARITY;
};

// Helper function to map timeframe enum to hours
const getTimeframeHours = (timeframe: string): number => {
  const timeframeMap: Record<string, number> = {
    HOUR_24: 24,
    DAYS_7: 168,
    DAYS_30: 720,
  };
  return timeframeMap[timeframe] || 24;
};

export const resolvers = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,

  Query: {
    // Search products with advanced filtering
    searchProducts: async (
      _: any,
      args: {
        filters?: any;
        sortBy?: string;
        pagination?: { page?: number; limit?: number };
      }
    ) => {
      try {
        const { filters = {}, sortBy = 'POPULARITY', pagination = {} } = args;
        const { page = 1, limit = config.DEFAULT_PAGE_SIZE } = pagination;

        // Validate and sanitize pagination
        const pageNum = Math.max(1, page);
        const limitNum = Math.min(
          config.MAX_PAGE_SIZE,
          Math.max(1, limit)
        );

        // Build MongoDB query
        const query: any = { isActive: true };

        if (filters.query) {
          query.$text = { $search: filters.query };
        }
        if (filters.category) {
          query.category = filters.category;
        }
        if (filters.tags && filters.tags.length > 0) {
          query.tags = { $in: filters.tags };
        }
        if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
          query.price = {};
          if (filters.minPrice !== undefined) query.price.$gte = filters.minPrice;
          if (filters.maxPrice !== undefined) query.price.$lte = filters.maxPrice;
        }
        if (filters.minReputation !== undefined) {
          query['seller.reputation'] = { $gte: filters.minReputation };
        }
        if (filters.verified) {
          query['seller.verified'] = true;
        }

        // Execute query with pagination
        const sort = buildSortObject(sortBy);
        const skip = (pageNum - 1) * limitNum;

        const [products, totalCount] = await Promise.all([
          Product.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limitNum)
            .lean(),
          Product.countDocuments(query),
        ]);

        const totalPages = Math.ceil(totalCount / limitNum);

        return {
          products: products.map((p: any) => ({ ...p, id: p._id.toString() })),
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalResults: totalCount,
            resultsPerPage: limitNum,
            hasNextPage: pageNum < totalPages,
            hasPreviousPage: pageNum > 1,
          },
          filters: {
            ...filters,
            sortBy,
          },
          timestamp: new Date(),
        };
      } catch (error) {
        logger.error('GraphQL searchProducts error:', error);
        throw new GraphQLError('Failed to search products', {
          extensions: { code: 'SEARCH_ERROR' },
        });
      }
    },

    // Get single product by ID
    product: async (_: any, { id }: { id: string }) => {
      try {
        const product = await Product.findOne({
          $or: [
            { listingId: id },
            { 'blockchain.contractAddress': id },
            { 'blockchain.tokenId': id },
            { _id: id },
          ],
        }).lean();

        if (!product) {
          return null;
        }

        // Increment views asynchronously (fire and forget)
        Product.updateOne(
          { _id: product._id },
          { $inc: { views: 1 } }
        ).catch((err) => logger.error('Failed to increment views:', err));

        return { ...product, id: product._id.toString() };
      } catch (error) {
        logger.error('GraphQL product error:', error);
        throw new GraphQLError('Failed to fetch product', {
          extensions: { code: 'PRODUCT_FETCH_ERROR' },
        });
      }
    },

    // Get trending products
    trendingProducts: async (
      _: any,
      args: { timeframe?: string; category?: string; limit?: number }
    ) => {
      try {
        const {
          timeframe = 'HOUR_24',
          category,
          limit = 10,
        } = args;

        const limitNum = Math.min(50, Math.max(1, limit));
        const filter: any = { isActive: true };

        if (category) {
          filter.category = category;
        }

        // Calculate date threshold
        const hours = getTimeframeHours(timeframe);
        const dateThreshold = new Date();
        dateThreshold.setHours(dateThreshold.getHours() - hours);

        // Aggregation pipeline for trending score
        const products = await Product.aggregate([
          { $match: filter },
          {
            $addFields: {
              trendingScore: {
                $add: [
                  { $multiply: [{ $ln: { $add: ['$views', 1] } }, 10] },
                  { $multiply: ['$sales', 5] },
                  { $cond: { if: '$featured', then: 20, else: 0 } },
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
                                  86400000,
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      1,
                    ],
                  },
                ],
              },
            },
          },
          { $sort: { trendingScore: -1, views: -1, sales: -1 } },
          { $limit: limitNum },
        ]);

        return {
          products: products.map((p) => ({ ...p, id: p._id.toString() })),
          count: products.length,
          timeframe: timeframe.replace('_', ' ').toLowerCase(),
          category: category || null,
          timestamp: new Date(),
        };
      } catch (error) {
        logger.error('GraphQL trendingProducts error:', error);
        throw new GraphQLError('Failed to fetch trending products', {
          extensions: { code: 'TRENDING_ERROR' },
        });
      }
    },

    // Get search suggestions
    suggestions: async (_: any, { query }: { query: string }) => {
      try {
        if (!query || query.length < 2) {
          return {
            suggestions: [],
            query,
            timestamp: new Date(),
          };
        }

        const products = await Product.find(
          { $text: { $search: query } },
          { name: 1, category: 1, _id: 0 }
        )
          .sort({ score: { $meta: 'textScore' } })
          .limit(10)
          .lean();

        const uniqueSuggestions = Array.from(
          new Set(products.map((p: any) => p.name))
        ).slice(0, 8);

        return {
          suggestions: uniqueSuggestions,
          query,
          timestamp: new Date(),
        };
      } catch (error) {
        logger.error('GraphQL suggestions error:', error);
        throw new GraphQLError('Failed to fetch suggestions', {
          extensions: { code: 'SUGGESTIONS_ERROR' },
        });
      }
    },

    // Get all categories
    categories: async (_: any, { includeInactive = false }: { includeInactive?: boolean }) => {
      try {
        const filter = includeInactive ? {} : { isActive: true };
        const categories = await Category.find(filter)
          .sort({ name: 1 })
          .lean();

        return categories.map((c: any) => ({ ...c, id: c._id.toString() }));
      } catch (error) {
        logger.error('GraphQL categories error:', error);
        throw new GraphQLError('Failed to fetch categories', {
          extensions: { code: 'CATEGORIES_ERROR' },
        });
      }
    },

    // Get category by slug
    category: async (_: any, { slug }: { slug: string }) => {
      try {
        const category = await Category.findOne({ slug }).lean();
        if (!category) {
          return null;
        }
        return { ...category, id: category._id.toString() };
      } catch (error) {
        logger.error('GraphQL category error:', error);
        throw new GraphQLError('Failed to fetch category', {
          extensions: { code: 'CATEGORY_ERROR' },
        });
      }
    },

    // Get products by category
    productsByCategory: async (
      _: any,
      args: {
        slug: string;
        pagination?: { page?: number; limit?: number };
        sortBy?: string;
      }
    ) => {
      try {
        const { slug, pagination = {}, sortBy = 'POPULARITY' } = args;
        const { page = 1, limit = config.DEFAULT_PAGE_SIZE } = pagination;

        const pageNum = Math.max(1, page);
        const limitNum = Math.min(config.MAX_PAGE_SIZE, Math.max(1, limit));

        const category = await Category.findOne({ slug });
        if (!category) {
          throw new GraphQLError('Category not found', {
            extensions: { code: 'CATEGORY_NOT_FOUND' },
          });
        }

        const query = { category: category.name, isActive: true };
        const sort = buildSortObject(sortBy);
        const skip = (pageNum - 1) * limitNum;

        const [products, totalCount] = await Promise.all([
          Product.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limitNum)
            .lean(),
          Product.countDocuments(query),
        ]);

        const totalPages = Math.ceil(totalCount / limitNum);

        return {
          products: products.map((p: any) => ({ ...p, id: p._id.toString() })),
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalResults: totalCount,
            resultsPerPage: limitNum,
            hasNextPage: pageNum < totalPages,
            hasPreviousPage: pageNum > 1,
          },
          filters: { category: category.name, sortBy },
          timestamp: new Date(),
        };
      } catch (error) {
        logger.error('GraphQL productsByCategory error:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Failed to fetch products by category', {
          extensions: { code: 'CATEGORY_PRODUCTS_ERROR' },
        });
      }
    },
  },

  Mutation: {
    // Increment product views
    incrementProductViews: async (_: any, { productId }: { productId: string }) => {
      try {
        const product = await Product.findOneAndUpdate(
          {
            $or: [
              { listingId: productId },
              { 'blockchain.contractAddress': productId },
              { _id: productId },
            ],
          },
          { $inc: { views: 1 } },
          { new: true }
        ).lean();

        if (!product) {
          throw new GraphQLError('Product not found', {
            extensions: { code: 'PRODUCT_NOT_FOUND' },
          });
        }

        return { ...product, id: product._id.toString() };
      } catch (error) {
        logger.error('GraphQL incrementProductViews error:', error);
        if (error instanceof GraphQLError) throw error;
        throw new GraphQLError('Failed to increment product views', {
          extensions: { code: 'INCREMENT_VIEWS_ERROR' },
        });
      }
    },
  },
};
