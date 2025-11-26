// shared/blockchain.js
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const deploymentPath = path.join(__dirname, '../../../../contracts/deployments.json');
// adjust if needed
let deployment = null;
if (fs.existsSync(deploymentPath)) {
    deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
}

const RPC = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
const provider = new ethers.JsonRpcProvider(RPC);

// Wallet from env (for server-side flows). In prod buyer-signed txs are preferred.
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const wallet = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

const getFreshWallet = () => new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

/**
 * Load ABI from Hardhat artifacts
 * @param {string} contractName
 * @returns {Array|null}
 */
const loadABI = (contractName) => {
    const abiPath = path.join(
        __dirname,
        '../../../../contracts/artifacts/contracts',
        `${contractName}.sol`,
        `${contractName}.json`
    );

    if (!fs.existsSync(abiPath)) {
        console.warn(`[WARN] ABI not found for ${contractName} at ${abiPath}`);
        return null;
    }

    const contractJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    return contractJson.abi;
};


let escrowContract = null;
let listingRegistryContract = null;
let orderManagerContract = null;

if (deployment) {
    const escrowABI = loadABI('Escrow');
    const listingABI = loadABI('ListingRegistry');
    const orderManagerABI = loadABI('OrderManager');

    if (escrowABI && deployment.contracts?.Escrow?.address) {
        console.log("Loaded Escrow address:", deployment.contracts.Escrow.address);
        escrowContract = new ethers.Contract(
            deployment.contracts.Escrow.address,
            escrowABI,
            wallet
        );
    } else {
        console.log("Escrow not loaded: missing ABI or address");
    }

    if (listingABI && deployment.contracts?.ListingRegistry?.address) {
        listingRegistryContract = new ethers.Contract(
            deployment.contracts.ListingRegistry.address,
            listingABI,
            wallet
        );
    }

    if (orderManagerABI && deployment.contracts?.OrderManager?.address) {
        orderManagerContract = new ethers.Contract(
            deployment.contracts.OrderManager.address,
            orderManagerABI,
            wallet
        );
    }
}


module.exports = {
    provider,
    wallet,
    getFreshWallet,
    escrowContract,
    listingRegistryContract,
    orderManagerContract,
    deployment
};
