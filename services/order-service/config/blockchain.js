const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load deployment info
const deploymentPath = path.join(__dirname, '../../../deployment.json');
let deployment = null;

if (fs.existsSync(deploymentPath)) {
  deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
}

// Initialize provider with polling for better nonce management
const provider = new ethers.JsonRpcProvider(
  process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545',
  undefined,
  { polling: true, pollingInterval: 1000 }
);

// Initialize wallet (for signing transactions)
const wallet = new ethers.Wallet(
  process.env.DEPLOYER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  provider
);

// Helper function to get a fresh wallet instance for each transaction
const getFreshWallet = () => {
  return new ethers.Wallet(
    process.env.DEPLOYER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    provider
  );
};

// Load contract ABIs
const loadABI = (contractName) => {
  const abiPath = path.join(__dirname, '../../../artifacts/contracts', `${contractName}.sol`, `${contractName}.json`);
  if (!fs.existsSync(abiPath)) {
    console.warn(`[WARN] ABI not found for ${contractName} at ${abiPath}`);
    return null;
  }
  const contractJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  return contractJson.abi;
};

// Contract instances
let listingRegistryContract = null;
let escrowContract = null;
let orderManagerContract = null;

if (deployment) {
  const listingRegistryABI = loadABI('ListingRegistry');
  const escrowABI = loadABI('Escrow');
  const orderManagerABI = loadABI('OrderManager');

  if (listingRegistryABI) {
    listingRegistryContract = new ethers.Contract(
      deployment.contracts.ListingRegistry,
      listingRegistryABI,
      wallet
    );
  }

  if (escrowABI) {
    escrowContract = new ethers.Contract(
      deployment.contracts.Escrow,
      escrowABI,
      wallet
    );
  }

  if (orderManagerABI) {
    orderManagerContract = new ethers.Contract(
      deployment.contracts.OrderManager,
      orderManagerABI,
      wallet
    );
  }
}

module.exports = {
  provider,
  wallet,
  getFreshWallet,
  listingRegistryContract,
  escrowContract,
  orderManagerContract,
  deployment
};

