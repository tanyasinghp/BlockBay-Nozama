export const typeDefs = `
  # Scalar types
  scalar DateTime
  scalar JSON

  # Input types for filtering and sorting
  input SearchFilters {
    query: String
    category: String
    tags: [String!]
    minPrice: Float
    maxPrice: Float
    minReputation: Int
    verified: Boolean
  }

  input PaginationInput {
    page: Int = 1
    limit: Int = 20
  }

  enum SortBy {
    POPULARITY
    PRICE_ASC
    PRICE_DESC
    NEWEST
    RATING
    RELEVANCE
  }

  enum Timeframe {
    HOUR_24
    DAYS_7
    DAYS_30
  }

  # Product types
  type Seller {
    address: String!
    name: String
    reputation: Int!
    verified: Boolean!
    totalSales: Int
    memberSince: DateTime
  }

  type BlockchainInfo {
    contractAddress: String!
    tokenId: String
    transactionHash: String
    network: String!
  }

  type Product {
    id: ID!
    listingId: String!
    name: String!
    description: String!
    category: String!
    tags: [String!]!
    price: Float!
    currency: String!
    seller: Seller!
    images: [String!]!
    blockchain: BlockchainInfo!
    views: Int!
    sales: Int!
    rating: Float
    totalRatings: Int
    featured: Boolean!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Category types
  type CategoryStats {
    totalProducts: Int!
    activeProducts: Int!
    averagePrice: Float
  }

  type Category {
    id: ID!
    name: String!
    slug: String!
    description: String
    image: String
    parentCategory: String
    subcategories: [String!]
    stats: CategoryStats
    isActive: Boolean!
    createdAt: DateTime!
  }

  # Pagination types
  type PageInfo {
    currentPage: Int!
    totalPages: Int!
    totalResults: Int!
    resultsPerPage: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  # Search results
  type SearchResults {
    products: [Product!]!
    pagination: PageInfo!
    filters: JSON!
    timestamp: DateTime!
  }

  type TrendingResults {
    products: [Product!]!
    count: Int!
    timeframe: String!
    category: String
    timestamp: DateTime!
  }

  type Suggestions {
    suggestions: [String!]!
    query: String!
    timestamp: DateTime!
  }

  # Queries
  type Query {
    """
    Search products with advanced filtering and pagination
    """
    searchProducts(
      filters: SearchFilters
      sortBy: SortBy = POPULARITY
      pagination: PaginationInput
    ): SearchResults!

    """
    Get product by ID (supports listingId, contractAddress, or tokenId)
    """
    product(id: String!): Product

    """
    Get trending products
    """
    trendingProducts(
      timeframe: Timeframe = HOUR_24
      category: String
      limit: Int = 10
    ): TrendingResults!

    """
    Get search suggestions
    """
    suggestions(query: String!): Suggestions!

    """
    Get all categories
    """
    categories(includeInactive: Boolean = false): [Category!]!

    """
    Get category by slug
    """
    category(slug: String!): Category

    """
    Get products by category
    """
    productsByCategory(
      slug: String!
      pagination: PaginationInput
      sortBy: SortBy = POPULARITY
    ): SearchResults!
  }

  # Mutations (for future expansion)
  type Mutation {
    """
    Increment product view count
    """
    incrementProductViews(productId: String!): Product
  }
`;
