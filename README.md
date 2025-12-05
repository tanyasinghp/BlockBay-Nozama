# BlockBay

### 🛒 A Decentralized, Trustless E-Commerce Marketplace Powered by Blockchain

BlockBay is an open-source decentralized marketplace that enables **peer-to-peer buying and selling without intermediaries**, powered by **Ethereum smart contracts**, **IPFS metadata storage**, and a **modern distributed microservices backend**.  
Unlike traditional centralized marketplaces (Amazon / Flipkart / eBay), BlockBay eliminates intermediaries using **smart-contract-based escrow**, **blockchain event-driven workflows**, and **on-chain identity & reputation** to establish trust autonomously and transparently.

---

## 🏷️ Badges
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/Node.js-18.x-green)
![Blockchain](https://img.shields.io/badge/Ethereum-Hardhat-blue)
![GraphQL](https://img.shields.io/badge/API-GraphQL-purple)
![gRPC](https://img.shields.io/badge/gRPC-enabled-orange)
![Docker](https://img.shields.io/badge/Docker-ready-blue)
![Kubernetes](https://img.shields.io/badge/Kubernetes-supported-326CE5)

---

## ✨ Key Highlights

- 🔐 **Smart-contract Escrow** — Trustless automated payment flow
- 📦 **Microservices Architecture** (5 core services)
- 🛰 **Hybrid Communication:** REST + GraphQL + gRPC + Webhooks
- 🧠 **Distributed Workflow using Blockchain-Choreographed Saga Pattern**
- 📊 **CQRS + Event Sourcing**
- 🗄 **Database-per-Service with MongoDB**
- 🧊 **IPFS for decentralized metadata storage**
- 🐳 **Docker + Kubernetes for deployment**
- 🧠 **Hardhat + Solidity smart contract suite**

---

## 🏗 Project Structure

```bash
BlockBay/
├── apispec/                     # OpenAPI specifications
├── artifacts/                   # Hardhat build artifacts
├── contracts/                   # Solidity smart contracts + deployment scripts
├── deployment/                  # Kubernetes deployment automation scripts
├── frontend/                    # React/Vite frontend dApp (WIP)
├── k8s/                         # Kubernetes manifests for microservices
├── scripts/                     # Sample data loaders & utilities
├── services/                    # Backend microservices
│   ├── identity-reputation
│   ├── listing-service
│   ├── order-service
│   ├── payment-service
│   └── search-discovery
├── docker-compose.yml
├── start-all-services.js
├── LICENSE
└── README.md
```

## ⚡ Quick Start

### **Prerequisites**
- Node.js ≥ 18
- MongoDB (local or cloud)
- Hardhat
- Docker (optional)
- Kubernetes / Minikube (optional)

Install dependencies
npm install

Start local blockchain
cd contracts
npx hardhat node

Compile & deploy smart contracts
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost

Populate MongoDB sample data
cd scripts
MONGODB_URI="<connection-string>" node populate-mongodb.js

Start backend services
node start-all-services.js

## 🧠 Deep System Design
### 🏗 Architecture Overview

BlockBay implements a blockchain-based decentralized e-commerce system with modern microservices and event-driven patterns using:

- 5 microservices (Search & Discovery, Listing, Order, Payment/Escrow, Identity & Reputation)
- Ethereum smart contracts
- IPFS decentralized metadata storage
- REST / GraphQL / gRPC / Webhooks
- MongoDB for query-layer optimization

## 🔌 Communication & Architecture Details

| **Pattern** | **Purpose** |
|------------|-------------|
| REST | Client-facing CRUD APIs |
| GraphQL | Optimized reads + batching |
| gRPC | High-performance service-to-service calls |
| Blockchain Events | Event sourcing + workflow triggers |
| Webhooks | Asynchronous notifications |

### gRPC Example
```protobuf
rpc CreateEscrow(CreateEscrowRequest) returns (EscrowResponse);
```
---

## 🎯 Distributed Transaction Flow (Saga)
### **Benefits**
- Atomic workflow without central orchestrator
- Protects against partial failures
- Blockchain acts as verifiable audit log

---

## 🧰 CQRS & Event Sourcing

| **Write Layer** | **Read Layer** |
|------------------|----------------|
| Blockchain: Immutable source of truth | MongoDB: Fast indexed search |
| Smart contracts modifying state | Event-indexed projections |
| Transactional accuracy | Query performance & analytics |

---

## 🔐 Smart Contracts

| **Contract** | **Functionality** |
|--------------|-------------------|
| `ListingRegistry.sol` | Product data + IPFS hashes |
| `Escrow.sol` | Lock, release & refund funds |
| `OrderManager.sol` | Order lifecycle orchestration |
| `Reputation.sol` | On-chain seller scoring |

📌 *Contract addresses are available in* `deployments.json`.

---

## 📡 Microservices Overview

| **Service** | **Responsibilities** |
|-------------|----------------------|
| `search-discovery` | GraphQL & REST search API |
| `listing-service` | Product management |
| `order-service` | Order lifecycle |
| `payment-service` | Escrow handling via gRPC |
| `identity-reputation` | Ratings & trust model |

---

## 🛠 Developer Commands
Blockchain
```
cd contracts && npx hardhat node
cd contracts && npx hardhat run scripts/deploy.js --network localhost
```

APIs
```
cd services/search-discovery && npm run dev
```

Docker
```
docker-compose up --build -d
```

Tests
```
cd contracts && npx hardhat test
```

🚧 Roadmap
- Full marketplace frontend UI
- Web3 wallet integration (MetaMask, WalletConnect)
- Real-time updates via GraphQL subscriptions
- Escrow dispute resolution process
- Elasticsearch search engine
- Analytics dashboards for sellers

---

🤝 Contributing
git checkout -b feature/my-feature
git commit -m "Add new feature"
git push origin feature/my-feature

👥 Contributors

Special thanks to the original development team behind the academic prototype.

📄 License

This project is licensed under the MIT License. See LICENSE for full details.
