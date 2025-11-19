const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Seed script to populate the blockchain with sample listings
 * Run after deployment: npx hardhat run scripts/seed-data.js --network localhost
 */
async function main() {
  console.log("Seeding sample data...\n");

  // Load deployment info
  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("[ERROR] deployment.json not found. Please run deploy.js first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const listingRegistryAddress = deployment.contracts.ListingRegistry;

  // Get signer accounts
  const [deployer, seller1, seller2] = await hre.ethers.getSigners();
  console.log("Using accounts:");
  console.log("   Deployer:", deployer.address);
  console.log("   Seller 1:", seller1.address);
  console.log("   Seller 2:", seller2.address, "\n");

  // Get contract instance
  const ListingRegistry = await hre.ethers.getContractFactory("ListingRegistry");
  const listingRegistry = ListingRegistry.attach(listingRegistryAddress);

  // Sample listings
  const sampleListings = [
    {
      listingId: "lst_001_hoodie",
      name: "Limited Edition NFT Hoodie",
      price: hre.ethers.parseEther("0.5"),
      currency: "ETH",
      stock: 25,
      ipfsCID: "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
      seller: seller1
    },
    {
      listingId: "lst_002_sneakers",
      name: "Blockchain Sneakers - Limited Run",
      price: hre.ethers.parseEther("0.8"),
      currency: "ETH",
      stock: 15,
      ipfsCID: "QmT1aZypVcoAWc6ffvrudR76QBEazgV6QbcZe8AnzqNfJZ",
      seller: seller1
    },
    {
      listingId: "lst_003_laptop",
      name: "Web3 Developer Laptop - Verified",
      price: hre.ethers.parseEther("2.5"),
      currency: "ETH",
      stock: 5,
      ipfsCID: "QmXnnyufdzAWL5CqZ2RnSNgPbvCc1ALT73s6epPrRnZ1Xy",
      seller: seller2
    },
    {
      listingId: "lst_004_hardware_wallet",
      name: "Hardware Wallet - Secure Edition",
      price: hre.ethers.parseEther("0.15"),
      currency: "ETH",
      stock: 50,
      ipfsCID: "QmPChd2hVbrJ6bfo3WBcTW4iZnpHm8TEzWkLHmLpXhF68A",
      seller: seller2
    },
    {
      listingId: "lst_005_tshirt",
      name: "Crypto T-Shirt - Hodl Edition",
      price: hre.ethers.parseEther("0.05"),
      currency: "ETH",
      stock: 100,
      ipfsCID: "QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE",
      seller: seller1
    }
  ];

  console.log("Creating listings...\n");

  for (const listing of sampleListings) {
    try {
      const tx = await listingRegistry.connect(listing.seller).createListing(
        listing.listingId,
        listing.name,
        listing.price,
        listing.currency,
        listing.stock,
        listing.ipfsCID
      );
      await tx.wait();
      console.log(`[OK] Created: ${listing.name}`);
      console.log(`   ID: ${listing.listingId}`);
      console.log(`   Price: ${hre.ethers.formatEther(listing.price)} ETH`);
      console.log(`   Stock: ${listing.stock}`);
      console.log(`   Seller: ${listing.seller.address}\n`);
    } catch (error) {
      console.error(`[ERROR] Failed to create ${listing.name}:`, error.message, "\n");
    }
  }

  console.log("=" .repeat(60));
  console.log("Seeding Complete!");
  console.log("=" .repeat(60));
  console.log(`\nCreated ${sampleListings.length} sample listings`);
  console.log("\nYou can now test the order service with these listings!");
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

