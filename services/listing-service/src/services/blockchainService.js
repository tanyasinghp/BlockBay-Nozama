const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.listingRegistryContract = null;
    this.signer = null;
    this.init();
  }

  async init() {
    try {
      const providerUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545/';
      this.provider = new ethers.JsonRpcProvider(providerUrl);

      const deploymentPath = path.join(__dirname, '../../../../deployment.json');
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      const listingRegistryAddress = deployment.contracts.ListingRegistry;

      const listingRegistryABI = this.loadABI('ListingRegistry');

      this.listingRegistryContract = new ethers.Contract(
        listingRegistryAddress,
        listingRegistryABI,
        this.provider
      );

      // For simplicity in this example, we'll use the first signer from the node
      this.signer = await this.provider.getSigner(0);

      console.log('Blockchain service initialized.');
      console.log('ListingRegistry contract address:', listingRegistryAddress);
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
    }
  }

  loadABI(contractName) {
    const abiPath = path.join(
      __dirname,
      `../../../../artifacts/contracts/contracts/${contractName}.sol/${contractName}.json`
    );
    const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    return artifact.abi;
  }

  getContractAddress() {
    return this.listingRegistryContract.address;
  }

  async publishListing(listing, ipfsCID) {
    if (!this.listingRegistryContract || !this.signer) {
      throw new Error('Blockchain service not initialized');
    }

    const contractWithSigner = this.listingRegistryContract.connect(this.signer);
    const priceWei = ethers.parseEther(listing.price.toString());

    const tx = await contractWithSigner.createListing(
      listing.listingId,
      listing.name,
      priceWei,
      listing.currency,
      listing.stock,
      ipfsCID
    );

    await tx.wait();
    return tx;
  }
}

module.exports = new BlockchainService();
