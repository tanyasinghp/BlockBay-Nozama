import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Interface for TypeScript
export interface IProduct extends Document {
  listingId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  images: string[];
  seller: {
    address: string;
    name: string;
  };
  status: 'draft' | 'published' | 'sold_out' | 'inactive';
  blockchain?: {
    network?: string;
    transactionHash?: string;
  };
  ipfsCID?: string;
  views: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  incrementViews(): Promise<IProduct>;
}

export interface IProductModel extends Model<IProduct> {
  searchProducts(searchParams: any): Promise<IProduct[]>;
}

// MongoDB Schema
const ProductSchema: Schema = new Schema({
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
  views: { type: Number, default: 0 },
  tags: [{ type: String }],
}, {
  timestamps: true,
  collection: 'products'
});

// Text index for search functionality
ProductSchema.index({
  name: 'text',
  description: 'text',
  category: 'text',
  tags: 'text'
}, {
  weights: {
    name: 10,
    description: 5,
    category: 2,
    tags: 8
  },
  name: 'text_search_index'
});

// Methods
ProductSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Static methods for search queries
ProductSchema.statics.searchProducts = function(searchParams: any) {
  const {
    query,
    category,
    minPrice,
    maxPrice,
    sortBy = 'popularity',
    page = 1,
    limit = 20
  } = searchParams;

  const filter: any = { status: 'published' };

  // Text search
  if (query) {
    filter.$text = { $search: query };
  }

  // Category filter
  if (category) {
    filter.category = category;
  }

  // Price range
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  // Sorting
  let sort: any = {};
  switch (sortBy) {
    case 'price_asc':
      sort = { price: 1 };
      break;
    case 'price_desc':
      sort = { price: -1 };
      break;
    case 'newest':
      sort = { createdAt: -1 };
      break;
    case 'popularity':
    default:
      // Popularity can be a combination of factors, e.g., views, sales
      // For now, let's sort by creation date as a proxy
      sort = { createdAt: -1 };
      break;
  }

  // Add text search score if searching
  if (query) {
    sort = { score: { $meta: 'textScore' }, ...sort };
  }

  const skip = (page - 1) * limit;

  return this.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .exec();
};

export default mongoose.model<IProduct, IProductModel>('Product', ProductSchema) as IProductModel;
