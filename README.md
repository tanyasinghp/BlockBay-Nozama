# Nozama - Blockchain E-commerce Platform

A decentralized e-commerce platform built with blockchain technology, featuring smart contracts, IPFS integration, and a comprehensive microservices architecture.

## 🏗️ Architecture Overview

This project implements a blockchain-based e-commerce system with the following components:

- **Smart Contracts**: Product Registry, Escrow, and Reputation systems
- **Search & Discovery API**: Advanced product search and filtering
- **IPFS Integration**: Decentralized metadata storage
- **MongoDB**: Fast product indexing and search
- **Microservices**: Scalable service architecture

## 📁 Project Structure

```
nozama/
├── apispec/                 # OpenAPI specifications
├── contracts/              # Hardhat blockchain project
│   ├── contracts/         # Smart contracts
│   ├── scripts/          # Deployment scripts
│   └── package.json      # Blockchain dependencies
├── scripts/               # Setup and utility scripts
│   ├── sample-data/      # Sample data files
│   ├── populate-mongodb.js # MongoDB population
│   └── .env.example      # Environment variables
├── services/             # Microservices (to be implemented)
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas cluster or local MongoDB
- Git

### 1. Clone and Setup

```bash
git clone <repository-url>
cd nozama
npm install
```

### 2. Setup Blockchain Environment

```bash
# Install blockchain dependencies
cd contracts
npm install

# Compile smart contracts
npx hardhat compile

# Start local blockchain (in separate terminal)
npx hardhat node

# Deploy contracts (in another terminal)
npx hardhat run scripts/deploy.js --network localhost

# Populate blockchain with sample data
npx hardhat run scripts/populate-blockchain.js --network localhost
```

### 3. Setup MongoDB

```bash
# Copy environment template
cp scripts/.env.example scripts/.env

# Edit scripts/.env and add your MongoDB Atlas connection string:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nozama-search

# Populate MongoDB with sample data
cd scripts
MONGODB_URI='your-connection-string' node populate-mongodb.js
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `scripts/` directory with the following:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nozama-search

# Blockchain Configuration  
BLOCKCHAIN_RPC_URL=http://localhost:8545
PRODUCT_REGISTRY_ADDRESS=<contract-address>
REPUTATION_CONTRACT_ADDRESS=<contract-address>

# IPFS Configuration
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# API Configuration
PORT=3002
NODE_ENV=development
```

## 📦 Smart Contracts

### ProductRegistry.sol
- Manages product listings on blockchain
- Emits events for off-chain indexing  
- Stores IPFS hashes for metadata

### Reputation.sol
- Tracks seller ratings and reviews
- Calculates reputation scores
- Manages seller verification status

### Contract Addresses (Local)
After deployment, contracts will be available at:
- ProductRegistry: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Reputation: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`

## 🗄️ Database Schema

### Products Collection
```javascript
{
  productId: String,
  name: String,
  description: String,
  price: Number,          // ETH price
  priceUSD: Number,       // USD equivalent
  category: String,
  subcategory: String,
  tags: [String],
  seller: {
    address: String,
    name: String,
    reputation: Number,
    verified: Boolean
  },
  blockchain: {
    network: String,
    contractAddress: String,
    tokenId: String,
    transactionHash: String
  },
  images: [IPFSImage],
  stock: Number,
  views: Number,
  sales: Number,
  featured: Boolean,
  isActive: Boolean,
  createdAt: Date
}
```

## 🛠️ Available Scripts

### Blockchain Scripts
```bash
# Compile contracts
cd contracts && npx hardhat compile

# Start local blockchain
cd contracts && npx hardhat node

# Deploy contracts
cd contracts && npx hardhat run scripts/deploy.js --network localhost

# Populate with sample data
cd contracts && npx hardhat run scripts/populate-blockchain.js --network localhost

# Run tests
cd contracts && npx hardhat test
```

### Database Scripts
```bash
# Populate MongoDB
MONGODB_URI='connection-string' node scripts/populate-mongodb.js
```

### API Scripts (Coming Soon)
```bash
# Start search API
npm run start:search

# Start all services
npm run start:all

# Run tests
npm test
```

## 📊 Sample Data

The setup includes comprehensive sample data:

- **15 Products** across 5 categories (Electronics, Fashion, Home, Sports, Books)
- **8 Sellers** with varying reputation scores
- **6 Categories** with subcategory hierarchies
- **Analytics Data** for trending calculations
- **Reviews & Ratings** for seller reputation

### Categories
- Electronics (Smartphones, Laptops, Audio)
- Fashion (Footwear, Clothing, Accessories)  
- Home & Living (Appliances, Furniture, Decor)
- Sports & Fitness (Equipment, Wearables)
- Books & Education (Technical, Fiction, Digital)
- Gaming (Consoles, PC Gaming, Accessories)

## 🔍 Search API Features

The Search & Discovery API will support:

- **Text Search**: Product names, descriptions, tags
- **Filtering**: Price range, category, seller reputation
- **Sorting**: Price, popularity, newest, reputation
- **Trending**: Algorithm-based trending products
- **Categories**: Hierarchical category browsing
- **Pagination**: Efficient result pagination

### Example API Endpoints
```
GET /api/v1/search?q=smartphone&category=electronics
GET /api/v1/trending?timeframe=24h&limit=10
GET /api/v1/categories
GET /api/v1/categories/electronics/products
GET /api/v1/products/{productId}
```

## 🧪 Testing the Setup

### Verify Blockchain Deployment
```bash
cd contracts
npx hardhat console --network localhost

# In console:
const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
const registry = await ProductRegistry.attach("CONTRACT_ADDRESS");
const totalProducts = await registry.getTotalProducts();
console.log("Total products:", totalProducts.toString());
```

### Verify MongoDB Population
```bash
# Connect to your MongoDB cluster and run:
use nozama-search
db.products.count()              // Should return 15
db.sellers.count()               // Should return 8  
db.categories.count()            // Should return 6
db.products.find({category: "electronics"}).count()  // Should return 5+
```

## 🚧 Next Steps

1. **Implement Search & Discovery API**
   - Express.js server with OpenAPI routes
   - MongoDB integration for fast queries
   - Blockchain event listener for real-time updates

2. **Add Microservices**
   - Listing Service API
   - Order Management Service
   - Identity & Reputation Service
   - Escrow Payment Service

3. **Frontend Development**
   - React.js dApp interface
   - Web3 wallet integration
   - Product browsing and search

4. **DevOps & Scaling**
   - Docker containerization
   - Kubernetes deployment
   - Load testing and auto-scaling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**MongoDB Connection Failed**
- Verify your MongoDB Atlas connection string
- Check IP whitelist in MongoDB Atlas
- Ensure correct username/password

**Hardhat Network Issues**
- Restart the local Hardhat node: `npx hardhat node`
- Clear cache: `npx hardhat clean`
- Check port 8545 is available

**Contract Deployment Failed**
- Ensure Hardhat node is running
- Check account has sufficient ETH
- Verify contract compilation: `npx hardhat compile`

### Getting Help

1. Check the [Issues](link-to-issues) page
2. Review the [API Documentation](apispec/)
3. Join our [Discord Community](link-to-discord)

---

Built with ❤️ by the Nozama Team
