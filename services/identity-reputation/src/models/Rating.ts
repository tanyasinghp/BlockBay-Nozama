import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IRating extends Document {
  ratingId: string;
  orderId: string;
  from: {
    did: string;
    address: string;
    name?: string;
  };
  to: {
    did: string;
    address: string;
    name?: string;
  };
  score: number; // 1-5
  comment?: string;
  type: 'buyer_to_seller' | 'seller_to_buyer' | 'admin_adjustment';
  evidence?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRatingModel extends Model<IRating> {
  findByOrderId(orderId: string): Promise<IRating[]>;
  findByDID(did: string): Promise<IRating[]>;
}

const RatingSchema = new Schema<IRating>({
  ratingId: {
    type: String,
    unique: true,
    index: true
  },
  orderId: {
    type: String,
    required: true,
    index: true
  },
  from: {
    did: {
      type: String,
      required: true,
      validate: {
        validator: function(v: string) {
          return /^did:ethr:0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: 'DID must be in format did:ethr:0x...'
      }
    },
    address: {
      type: String,
      required: true,
      validate: {
        validator: function(v: string) {
          return /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: 'Address must be a valid Ethereum address'
      }
    },
    name: String
  },
  to: {
    did: {
      type: String,
      required: true,
      validate: {
        validator: function(v: string) {
          return /^did:ethr:0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: 'DID must be in format did:ethr:0x...'
      }
    },
    address: {
      type: String,
      required: true,
      validate: {
        validator: function(v: string) {
          return /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: 'Address must be a valid Ethereum address'
      }
    },
    name: String
  },
  score: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Score must be an integer between 1 and 5'
    }
  },
  comment: {
    type: String,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['buyer_to_seller', 'seller_to_buyer', 'admin_adjustment'],
    required: true,
    index: true
  },
  evidence: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'ratings'
});

// Auto-generate ratingId
RatingSchema.pre('save', function(next) {
  if (!this.ratingId) {
    this.ratingId = `r_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
  }
  next();
});

// Indexes
RatingSchema.index({ orderId: 1 });
RatingSchema.index({ 'from.did': 1 });
RatingSchema.index({ 'to.did': 1 });
RatingSchema.index({ type: 1 });
RatingSchema.index({ createdAt: -1 });

// Static methods
RatingSchema.statics.findByOrderId = function(orderId: string) {
  return this.find({ orderId });
};

RatingSchema.statics.findByDID = function(did: string) {
  return this.find({
    $or: [
      { 'from.did': did },
      { 'to.did': did }
    ]
  }).sort({ createdAt: -1 });
};

export default mongoose.model<IRating, IRatingModel>('Rating', RatingSchema) as IRatingModel;