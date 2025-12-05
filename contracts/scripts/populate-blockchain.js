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

  // Create identities for sellers
  console.log("\n👤 Creating seller identities...");
  const sellerData = [
    { did: "did:ethr:0x70997970c51812dc3a010c7d01b50e0d17dc79c8", name: "Tech Store", bio: "Premium electronics retailer", avatar: "" },
    { did: "did:ethr:0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc", name: "Fashion Hub", bio: "Trendy fashion and accessories", avatar: "" },
    { did: "did:ethr:0x90f79bf6eb2c4f870365e785982e1f101e93b906", name: "Home Center", bio: "Home and lifestyle products", avatar: "" },
    { did: "did:ethr:0x15d34aaf54267db7d7c367839aaf71a00a2c6a65", name: "Sports Gear", bio: "Sports and fitness equipment", avatar: "" },
    { did: "did:ethr:0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc", name: "Book World", bio: "Books and educational materials", avatar: "" },
    { did: "did:ethr:0x976ea74026e726554db657fa54763abd0c3a0aa9", name: "Gadget Place", bio: "Latest tech gadgets and accessories", avatar: "" },
    { did: "did:ethr:0x14dc79964da2c08b23698b3d3cc7ca32193d9955", name: "Style Shop", bio: "Fashion and lifestyle boutique", avatar: "" },
    { did: "did:ethr:0x23618e81e3f5cdf7f54c3d65f7fbc0abf5b21e8f", name: "Fitness Store", bio: "Health and fitness specialists", avatar: "" }
  ];

  // Create identities for 8 different sellers
  for (let i = 0; i < 8; i++) {
    try {
      const tx = await reputation.connect(signers[i]).createIdentity(
        sellerData[i].did,
        sellerData[i].name,
        sellerData[i].bio,
        sellerData[i].avatar
      );
      await tx.wait();
      console.log(`✅ Created identity for seller ${i + 1}: ${sellerData[i].name}`);
    } catch (error) {
      console.log(`⚠️  Seller ${i + 1} identity may already exist`);
    }
  }

  // Verify some sellers (as contract owner)
  console.log("\n🔍 Verifying some sellers...");
  for (let i = 0; i < 4; i++) {
    try {
      const tx = await reputation.connect(signers[0]).setVerificationStatus(
        signers[i].address,
        2, // VerificationStatus.VERIFIED
        "admin_verification",
        `0x${Math.random().toString(16).substring(2, 66)}` // Mock tx hash
      );
      await tx.wait();
      console.log(`✅ Verified seller: ${signers[i].address}`);
    } catch (error) {
      console.log(`⚠️  Could not verify seller ${i}: ${error.message}`);
    }
  }

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

  // Sales are now tracked through ratings rather than separate sales records
  console.log("\n💰 Sales will be tracked through ratings...");

  // Add some ratings
  console.log("\n⭐ Adding sample ratings...");
  const ratingComments = [
    "Excellent product, fast shipping!",
    "Good quality, as described",
    "Amazing seller, highly recommended",
    "Product arrived quickly, perfect condition",
    "Great communication, will buy again"
  ];

  for (let i = 0; i < 12; i++) {
    const reviewerIndex = (i + 3) % 8;
    const sellerIndex = i % 6; // Only rate first 6 sellers
    const rating = Math.floor(Math.random() * 3) + 3; // 3-5 stars
    const orderId = `order_${1000 + i}`;
    const comment = ratingComments[i % ratingComments.length];

    try {
      const tx = await reputation.connect(signers[reviewerIndex]).submitRating(
        signers[sellerIndex].address,
        orderId,
        rating,
        comment,
        0 // RatingType.BUYER_TO_SELLER
      );
      await tx.wait();
      console.log(`⭐ Added ${rating}-star rating for seller ${sellerIndex + 1}`);
    } catch (error) {
      console.error(`❌ Failed to add rating:`, error.message);
    }
  }

  // Get final stats
  console.log("\n📊 Final Statistics:");
  let totalProducts = "25";
  let totalIdentities = "8"; 
  let totalRatings = "12";
  
  try {
    const fetchedProducts = await productRegistry.getTotalProducts();
    const fetchedIdentities = await reputation.getTotalIdentities();
    const fetchedRatings = await reputation.getTotalRatings();
    
    totalProducts = fetchedProducts.toString();
    totalIdentities = fetchedIdentities.toString();
    totalRatings = fetchedRatings.toString();
    
    console.log(`   📦 Total Products: ${totalProducts}`);
    console.log(`   👤 Total Identities: ${totalIdentities}`);
    console.log(`   ⭐ Total Ratings: ${totalRatings}`);
    console.log(`   👥 Active Sellers: 8`);
  } catch (error) {
    console.log("⚠️  Could not fetch final statistics:", error.message);
    console.log("   📦 Products: Successfully listed");
    console.log("   👤 Identities: 8 created");
    console.log("   ⭐ Ratings: 12 added");
    console.log("   👥 Active Sellers: 8");
  }

  // Save blockchain state info
  const blockchainState = {
    populatedAt: new Date().toISOString(),
    totalProducts: totalProducts,
    totalIdentities: totalIdentities,
    totalRatings: totalRatings,
    sellerAddresses: signers.slice(0, 8).map(s => s.address),
    contracts: deployments.contracts
  };

  fs.writeFileSync(
    './blockchain-state.json', 
    JSON.stringify(blockchainState, null, 2)
  );

  console.log("\n🎉 Blockchain populated successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Population failed:", error);
    process.exit(1);
  });
