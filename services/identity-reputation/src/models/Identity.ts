import mongoose, { Document, Model, Schema } from 'mongoose';

// Interface for TypeScript
export interface IIdentity extends Document {
  did: string;
  address: string;
  name?: string;
  bio?: string;
  avatar?: string;
  metadata?: Record<string, any>;
  verified: boolean;
  verification?: {
    status: 'unverified' | 'pending' | 'verified' | 'revoked';
    method?: string;
    verifier?: string;
    txHash?: string;
    blockNumber?: number;
    verifiedAt?: Date;
  };
  reputationScore?: {
    value: number;
    algo: string;
    confidence: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IIdentityModel extends Model<IIdentity> {
  findByDID(did: string): Promise<IIdentity | null>;
  findByAddress(address: string): Promise<IIdentity | null>;
}

// Schema definition
const IdentitySchema = new Schema<IIdentity>({
  did: {
    type: String,
    required: true,
    unique: true,
    index: true,
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
    unique: true,
    index: true,
    validate: {
      validator: function(v: string) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Address must be a valid Ethereum address'
    }
  },
  name: {
    type: String,
    trim: true,
    maxlength: 100
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500
  },
  avatar: {
    type: String,
    trim: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  verified: {
    type: Boolean,
    default: false,
    index: true
  },
  verification: {
    status: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'revoked'],
      default: 'unverified'
    },
    method: String,
    verifier: String,
    txHash: String,
    blockNumber: Number,
    verifiedAt: Date
  },
  reputationScore: {
    value: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    algo: {
      type: String,
      default: 'weighted-v1'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    }
  }
}, {
  timestamps: true,
  collection: 'identities'
});

// Additional indexes (did, address, verified already defined in schema)
IdentitySchema.index({ 'verification.status': 1 });
IdentitySchema.index({ name: 'text', bio: 'text' });
IdentitySchema.index({ createdAt: -1 });

// Static methods
IdentitySchema.statics.findByDID = function(did: string) {
  return this.findOne({ did });
};

IdentitySchema.statics.findByAddress = function(address: string) {
  return this.findOne({ address });
};

export default mongoose.model<IIdentity, IIdentityModel>('Identity', IdentitySchema) as IIdentityModel;