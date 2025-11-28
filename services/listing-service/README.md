# Nozama Listing Service

A production-grade microservice responsible for creating, managing, publishing, and maintaining product listings within the Nozama decentralized e-commerce ecosystem. The service integrates deeply with **IPFS**, **Ethereum smart contracts**, and **MongoDB**, enabling a seamless pipeline from draft listings to fully published, on-chain verified marketplace items.

---

## 🚀 Features

* **Full CRUD Listing Management**
* **IPFS Publishing** for decentralized metadata storage
* **Blockchain Registration** through ListingRegistry smart contract
* **Draft → Published Lifecycle**
* **Seller Identity & Reputation Support**
* **Search-Optimized Listing Schema**
* **Scalable Node.js + Express Architecture**
* **Fully Dockerized Deployment Pipeline**

---

## 📡 API Base URL

```
http://localhost:3004/api/v1
```

---

## 📘 API Endpoints



### **Listings**

| Method   | Endpoint                              | Description                             |
| -------- | ------------------------------------- | --------------------------------------- |
| `GET`    | `/api/v1/listings`                    | Retrieve listings (filter + pagination) |
| `POST`   | `/api/v1/listings`                    | Create a new listing                    |
| `GET`    | `/api/v1/listings/:listingId`         | Fetch a specific listing                |
| `PUT`    | `/api/v1/listings/:listingId`         | Update a listing                        |
| `DELETE` | `/api/v1/listings/:listingId`         | Delete listing                          |
| `POST`   | `/api/v1/listings/:listingId/publish` | Publish listing to IPFS + blockchain    |

### **Health**

```
GET /health
GET /api/v1/health
```

---

## 🧰 Quick Start

### 1. Install Dependencies

```bash
cd services/listing-service
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Key variables:

```bash
PORT=3004
MONGODB_URI=mongodb+srv://...
BLOCKCHAIN_RPC_URL=http://localhost:8545
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/
LISTING_REGISTRY_ADDRESS=0x...
```

### 3. Start Local Blockchain Node

```bash
npx hardhat node
# OR
docker run -d -p 8545:8545 trufflesuite/ganache
```

### 4. Start the Service

```bash
npm start
# or
npm run dev
```

---

## 🧪 Testing the API

### Create Listing

```bash
curl -X POST http://localhost:3004/api/v1/listings \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Hoodie",
    "description": "Premium test hoodie",
    "category": "fashion",
    "price": 0.5,
    "currency": "ETH",
    "stock": 5,
    "images": [],
    "seller": { "address": "0xabc", "name": "Tester" }
  }'
```

### Publish Listing

```bash
curl -X POST http://localhost:3004/api/v1/listings/<listingId>/publish
```

### List All

```bash
curl http://localhost:3004/api/v1/listings?limit=10&page=1
```

### Get Single Listing

```bash
curl http://localhost:3004/api/v1/listings/<listingId>
```

---

## 🧱 Data Model

### Listing Document (MongoDB)

```javascript
{
  listingId: String,
  name: String,
  description: String,
  category: String,
  price: Number,
  currency: String,
  stock: Number,
  images: [String],
  status: String, // draft, published, archived
  seller: {
    address: String,
    name: String,
    reputation: Number
  },
  ipfsMetadata: {
    cid: String,
    url: String
  },
  blockchain: {
    network: String,
    contractAddress: String,
    tokenId: String,
    transactionHash: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔗 Blockchain Integration

The service loads:

* `deployment.json` (contract addresses)
* `artifacts/` (Hardhat ABIs)

Publish flow:

1. Serialize listing metadata
2. Upload to IPFS
3. Register listing on-chain via ListingRegistry
4. Store CID + transaction hash in DB

---

## 📦 Docker Usage

### Build

```bash
docker build -t <username>/listing-service:latest .
```

### Run (with mandatory mounts)

```bash
docker run --rm -p 3005:3004 \
  --env-file .env \
  -v "$(pwd)/deployment.json:/deployment.json:ro" \
  -v "$(pwd)/artifacts:/artifacts:ro" \
  --name listing-service \
  <username>/listing-service:latest
```

### Push to Docker Hub

```bash
docker push <username>/listing-service:latest
```

---

## 📂 Project Structure

```
services/listing-service/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── services/
│   ├── utils/
│   ├── index.js
│   └── Server.js
├── README.md
├── .env
├── Dockerfile
└── package.json
```

---

## 🔒 Security-listing

* Helmet.js for secure headers
* Input validation + sanitization
* Rate limiting
* Environment-based configuration
* MongoDB query hardening

---

## 📈 Scalability

* Index-based listing queries
* Asynchronous publishing pipeline
* Stateless containers—easy scaling
* Compatible with Kubernetes, ECS, or Swarm

---

## 📜 License

Part of the **Nozama** decentralized e-commerce platform.
