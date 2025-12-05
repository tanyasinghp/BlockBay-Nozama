// shared/blockchain.js
const path = require('path');
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { ethers } = require('ethers');
const fs = require('fs');

console.log("🔧 Loading blockchain configuration...");

// Correct deployments.json path
const deploymentPath = path.join(__dirname, '../../../../contracts/deployments.json');
console.log("📍 Deployment JSON path:", deploymentPath);

let deployment = null;
if (fs.existsSync(deploymentPath)) {
    deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    console.log("📦 Deployment loaded:", deployment.contracts);
} else {
    console.error("❌ deployments.json NOT FOUND!");
}

const RPC = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
console.log("🔌 Connecting RPC provider:", RPC);

// Provider
const provider = new ethers.JsonRpcProvider(RPC);

provider.getNetwork()
    .then(n => console.log("🌐 Connected to network:", n))
    .catch(e => console.error("❌ Provider connection error:", e));

// Wallet for contract transactions
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
console.log("🔑 Loaded deployer key:", DEPLOYER_PRIVATE_KEY.slice(0, 10) + "...");

const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
const getFreshWallet = () => new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

/**
 * Load ABI from Hardhat artifacts
 */
const loadABI = (contractName) => {
    const abiPath = path.join(
        __dirname,
        '../../../../contracts/artifacts/contracts',
        `${contractName}.sol`,
        `${contractName}.json`
    );

    if (!fs.existsSync(abiPath)) {
        console.warn(`[WARN] ABI not found for ${contractName} at:`, abiPath);
        return null;
    }

    const contractJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    return contractJson.abi;
};

// Contract references
let escrowContract = null;
let listingRegistryContract = null;
let orderManagerContract = null;

// Instantiate based on deployments.json
if (deployment) {
    const escrowABI = loadABI('Escrow');
    const listingABI = loadABI('ListingRegistry');
    const orderManagerABI = loadABI('OrderManager');

    if (escrowABI && deployment.contracts?.Escrow?.address) {
        console.log("💠 Escrow Contract Address:", deployment.contracts.Escrow.address);

        // IMPORTANT: attach to provider and then connect wallet for tx
        escrowContract = new ethers.Contract(
            deployment.contracts.Escrow.address,
            escrowABI,
            provider
        ).connect(wallet);

        console.log("✔️ Escrow contract initialized");
    } else {
        console.log("⚠️ Escrow not loaded: missing ABI or address");
    }

    if (listingABI && deployment.contracts?.ListingRegistry?.address) {
        listingRegistryContract = new ethers.Contract(
            deployment.contracts.ListingRegistry.address,
            listingABI,
            provider
        ).connect(wallet);
    }

    if (orderManagerABI && deployment.contracts?.OrderManager?.address) {
        orderManagerContract = new ethers.Contract(
            deployment.contracts.OrderManager.address,
            orderManagerABI,
            provider
        ).connect(wallet);
    }
}

// Final export
module.exports = {
    provider,
    wallet,
    getFreshWallet,
    escrowContract,
    listingRegistryContract,
    orderManagerContract,
    deployment
};

console.log("🚀 Blockchain config ready");
