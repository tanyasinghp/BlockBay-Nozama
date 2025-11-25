const { ethers } = require("ethers");
const fs = require('fs');
const path = require('path');

const sampleProducts = JSON.parse(fs.readFileSync(path.join(__dirname, '../../scripts/sample-data/products.json'), 'utf8'));

function loadABI(contractName) {
  const abiPath = path.join(
    __dirname,
    `../artifacts/contracts/${contractName}.sol/${contractName}.json`
  );
  const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  return artifact.abi;
}

async function main() {
  console.log("🌱 Populating blockchain with sample data...\n");

  // Provider
  const providerUrl = 'http://127.0.0.1:8545/';
  const provider = new ethers.JsonRpcProvider(providerUrl);

  // Load deployment info
  const deploymentPath = path.join(__dirname, '../deployments.json');
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("❌ Deployment file not found. Please run deploy script first.");
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const listingRegistryAddress = deployment.contracts.ListingRegistry.address;

  // Get contract instance
  const listingRegistryABI = loadABI('ListingRegistry');
  const listingRegistry = new ethers.Contract(
    listingRegistryAddress,
    listingRegistryABI,
    provider
  );

  console.log("📦 ListingRegistry at:", await listingRegistry.getAddress());

  // Get signers
  const signers = [];
  for (let i = 0; i < 8; i++) {
    signers.push(await provider.getSigner(i));
  }
  console.log("👥 Available accounts:", signers.length);

  // Create products with different sellers
  console.log("\n🛍️  Creating product listings...");
  for (let i = 0; i < sampleProducts.length; i++) {
    const product = sampleProducts[i];
    const sellerIndex = i % 8;
    const seller = signers[sellerIndex];
    const contractWithSigner = listingRegistry.connect(seller);

    const ipfsHash = product.images[0]?.cid || `QmPlaceholder${i}`;
    const priceWei = ethers.parseEther(product.price.toString());
    const listingId = `lst_${product.productId}`;

    try {
      const tx = await contractWithSigner.createListing(
        listingId,
        product.name,
        priceWei,
        "ETH",
        100,
        ipfsHash
      );
      await tx.wait();
      console.log(`✅ Listed: ${product.name} as ${listingId} by seller ${sellerIndex + 1}`);
    } catch (error) {
      console.error(`❌ Failed to list ${product.name}:`, error.message);
    }
  }

  // Get final stats
  console.log("\n📊 Final Statistics:");
  const totalProducts = await listingRegistry.getListingsCount();
  console.log(`   📦 Total Products: ${totalProducts}`);
  console.log(`   👥 Active Sellers: 8`);

  console.log("\n🎉 Blockchain populated successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Population failed:", error);
    process.exit(1);
  });
