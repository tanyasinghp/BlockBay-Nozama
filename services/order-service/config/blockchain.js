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
  // Try the main contracts artifacts directory first
  let abiPath = path.join(__dirname, '../../../contracts/artifacts/contracts', `${contractName}.sol`, `${contractName}.json`);
  
  if (!fs.existsSync(abiPath)) {
    // Fallback to local artifacts if they exist
    abiPath = path.join(__dirname, '../artifacts/contracts', `${contractName}.sol`, `${contractName}.json`);
  }
  
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

  if (listingRegistryABI && deployment.contracts.ListingRegistry) {
    const listingAddress = deployment.contracts.ListingRegistry.address || deployment.contracts.ListingRegistry;
    listingRegistryContract = new ethers.Contract(
      listingAddress,
      listingRegistryABI,
      wallet
    );
  }

  if (escrowABI && deployment.contracts.Escrow) {
    const escrowAddress = deployment.contracts.Escrow.address || deployment.contracts.Escrow;
    escrowContract = new ethers.Contract(
      escrowAddress,
      escrowABI,
      wallet
    );
  }

  if (orderManagerABI && deployment.contracts.OrderManager) {
    const orderManagerAddress = deployment.contracts.OrderManager.address || deployment.contracts.OrderManager;
    orderManagerContract = new ethers.Contract(
      orderManagerAddress,
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
