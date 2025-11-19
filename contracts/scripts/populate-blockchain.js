const { ethers } = require("hardhat");
const fs = require('fs');

// Sample IPFS hashes (these would be real in production)
const sampleIPFSHashes = [
  "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG", // Samsung Galaxy S23
  "QmXnnyufdzAWL5CqZ2RnSNgPbvCc1ALT73s6epPrRnZ1Xy", // iPhone 14 Pro
  "QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB", // MacBook Pro
  "QmNLei78zWmzUdbeRB3CiUfAizWUrbeeZh5K1rhAQKCh51", // AirPods Pro
  "QmRAQB6YaCyidP37UdDnjFY5vQuiBrcqdyoW1CuDgwxkD4", // Nike Jordan 1
  "QmSrCRJmzE4zPiQwvZQ2R4PLfAAp5Uu1k3F3wWANa9Y8zA", // Adidas Hoodie
  "QmTxGC1vjVgH9KJ7NTgB2yX3RzFZGL4yF82L9BqW4xJ1cB", // PlayStation 5
  "QmVHxRyVSNjV9j6hg7YLc4tBCj6yPKzQZp7n4qK8VXCP4M", // Fitness Tracker
  "QmWZyXrYqtNz4QGP8FQLzR7BdG4wH5j2K9qL3mN6rT8vP1", // Coffee Maker
  "QmXKzW7YtPvL6qM3nR8cTf5jG9hB2zX4vN6wQ1sA7uE9oR"  // Bookshelf
];

const categories = ["electronics", "fashion", "home", "sports", "books"];

const sampleProducts = [
  { name: "Samsung Galaxy S23 Ultra", price: "1.2", category: "electronics" },
  { name: "iPhone 14 Pro Max", price: "1.5", category: "electronics" },
  { name: "MacBook Pro M2", price: "3.2", category: "electronics" },
  { name: "AirPods Pro 2nd Gen", price: "0.35", category: "electronics" },
  { name: "Sony WH-1000XM4", price: "0.28", category: "electronics" },
  { name: "Nike Air Jordan 1", price: "0.18", category: "fashion" },
  { name: "Adidas Oversized Hoodie", price: "0.08", category: "fashion" },
  { name: "Levi's 501 Jeans", price: "0.06", category: "fashion" },
  { name: "Ray-Ban Aviators", price: "0.12", category: "fashion" },
  { name: "Gucci Leather Wallet", price: "0.32", category: "fashion" },
  { name: "Smart Coffee Maker", price: "0.15", category: "home" },
  { name: "Ergonomic Office Chair", price: "0.25", category: "home" },
  { name: "4K Smart TV 65\"", price: "0.8", category: "home" },
  { name: "Robot Vacuum Cleaner", price: "0.22", category: "home" },
  { name: "Air Purifier HEPA", price: "0.18", category: "home" },
  { name: "Fitness Tracker Pro", price: "0.12", category: "sports" },
  { name: "Yoga Mat Premium", price: "0.05", category: "sports" },
  { name: "Dumbbells Set 20kg", price: "0.08", category: "sports" },
  { name: "Running Shoes Nike", price: "0.14", category: "sports" },
  { name: "Cycling Helmet", price: "0.07", category: "sports" },
  { name: "Programming Book Set", price: "0.04", category: "books" },
  { name: "Kindle E-reader", price: "0.09", category: "books" },
  { name: "Desk Organizer Wood", price: "0.03", category: "books" },
  { name: "LED Desk Lamp", price: "0.06", category: "books" },
  { name: "Mechanical Keyboard", price: "0.11", category: "electronics" }
];

async function main() {
  console.log("🌱 Populating blockchain with sample data...\n");

  // Load deployment info
  if (!fs.existsSync('./deployments.json')) {
    throw new Error("❌ Deployment file not found. Please run deploy script first.");
  }

  const deployments = JSON.parse(fs.readFileSync('./deployments.json', 'utf8'));
  console.log("📋 Using deployed contracts from:", deployments.deployedAt);

  // Get signers (multiple sellers)
  const signers = await ethers.getSigners();
  console.log("👥 Available accounts:", signers.length);

  // Get contract instances
  const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
  const productRegistry = ProductRegistry.attach(deployments.contracts.ProductRegistry.address);

  const Reputation = await ethers.getContractFactory("Reputation");
  const reputation = Reputation.attach(deployments.contracts.Reputation.address);

  console.log("📦 ProductRegistry at:", await productRegistry.getAddress());
  console.log("⭐ Reputation at:", await reputation.getAddress());

  // Register sellers first
  console.log("\n👤 Registering sellers...");
  const sellerDIDs = [
    "did:ethr:techstore",
    "did:ethr:fashionhub", 
    "did:ethr:homecenter",
    "did:ethr:sportsgear",
    "did:ethr:bookworld",
    "did:ethr:gadgetplace",
    "did:ethr:styleshop",
    "did:ethr:fitnesstore"
  ];

  // Register 8 different sellers
  for (let i = 0; i < 8; i++) {
    try {
      const tx = await reputation.connect(signers[i]).registerSeller(sellerDIDs[i]);
      await tx.wait();
      console.log(`✅ Registered seller ${i + 1}: ${signers[i].address}`);
    } catch (error) {
      console.log(`⚠️  Seller ${i + 1} may already be registered`);
    }
  }

  // Verify some sellers (as contract owner)
  console.log("\n🔍 Verifying some sellers...");
  for (let i = 0; i < 4; i++) {
    try {
      const tx = await reputation.connect(signers[0]).verifySeller(signers[i].address);
      await tx.wait();
      console.log(`✅ Verified seller: ${signers[i].address}`);
    } catch (error) {
      console.log(`⚠️  Could not verify seller ${i}: ${error.message}`);
    }
  }

  // Create products with different sellers
  console.log("\n🛍️  Creating product listings...");
  let productCount = 0;

  for (let i = 0; i < sampleProducts.length; i++) {
    const product = sampleProducts[i];
    const sellerIndex = i % 8; // Rotate through sellers
    const seller = signers[sellerIndex];
    const ipfsHash = sampleIPFSHashes[i % sampleIPFSHashes.length];
    const priceWei = ethers.parseEther(product.price);

    try {
      // Add random delay to simulate realistic timing
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const tx = await productRegistry.connect(seller).listProduct(
        ipfsHash,
        priceWei,
        product.category
      );
      await tx.wait();
      productCount++;
      
      console.log(`📦 Listed: ${product.name} by seller ${sellerIndex + 1} - ${product.price} ETH`);
    } catch (error) {
      console.error(`❌ Failed to list ${product.name}:`, error.message);
    }
  }

  // Record some sales for reputation
  console.log("\n💰 Recording sample sales...");
  for (let i = 0; i < 15; i++) {
    const sellerIndex = i % 8;
    const orderId = 1000 + i;
    
    try {
      const tx = await reputation.recordSale(signers[sellerIndex].address, orderId);
      await tx.wait();
      console.log(`✅ Recorded sale for seller ${sellerIndex + 1}`);
    } catch (error) {
      console.error(`❌ Failed to record sale:`, error.message);
    }
  }

  // Add some reviews
  console.log("\n⭐ Adding sample reviews...");
  const reviewComments = [
    "Excellent product, fast shipping!",
    "Good quality, as described",
    "Amazing seller, highly recommended",
    "Product arrived quickly, perfect condition",
    "Great communication, will buy again"
  ];

  for (let i = 0; i < 12; i++) {
    const reviewerIndex = (i + 3) % 8;
    const sellerIndex = i % 6; // Only review first 6 sellers
    const rating = Math.floor(Math.random() * 3) + 3; // 3-5 stars
    const orderId = 1000 + i;
    const comment = reviewComments[i % reviewComments.length];

    try {
      const tx = await reputation.connect(signers[reviewerIndex]).submitReview(
        signers[sellerIndex].address,
        orderId,
        rating,
        comment
      );
      await tx.wait();
      console.log(`⭐ Added ${rating}-star review for seller ${sellerIndex + 1}`);
    } catch (error) {
      console.error(`❌ Failed to add review:`, error.message);
    }
  }

  // Get final stats
  console.log("\n📊 Final Statistics:");
  const totalProducts = await productRegistry.getTotalProducts();
  const totalReviews = await reputation.getTotalReviews();
  
  console.log(`   📦 Total Products: ${totalProducts}`);
  console.log(`   ⭐ Total Reviews: ${totalReviews}`);
  console.log(`   👥 Active Sellers: 8`);

  // Save blockchain state info
  const blockchainState = {
    populatedAt: new Date().toISOString(),
    totalProducts: totalProducts.toString(),
    totalReviews: totalReviews.toString(),
    sellerAddresses: signers.slice(0, 8).map(s => s.address),
    contracts: deployments.contracts
  };

  fs.writeFileSync(
    './blockchain-state.json', 
    JSON.stringify(blockchainState, null, 2)
  );

  console.log("\n🎉 Blockchain populated successfully!");
  console.log("📄 State saved to blockchain-state.json");
  console.log("\n💡 Next step: Populate MongoDB with indexed data");
  console.log("   Run: node ../scripts/populate-mongodb.js");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Population failed:", error);
    process.exit(1);
  });
