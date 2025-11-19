const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment of Nozama smart contracts...\n");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy ProductRegistry
  console.log("📦 Deploying ProductRegistry...");
  const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
  const productRegistry = await ProductRegistry.deploy();
  await productRegistry.waitForDeployment();
  const productRegistryAddress = await productRegistry.getAddress();
  console.log("✅ ProductRegistry deployed to:", productRegistryAddress);

  // Deploy Reputation
  console.log("⭐ Deploying Reputation...");
  const Reputation = await ethers.getContractFactory("Reputation");
  const reputation = await Reputation.deploy();
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log("✅ Reputation deployed to:", reputationAddress);

  // Save deployment addresses
  const fs = require('fs');
  const deploymentInfo = {
    network: "localhost",
    chainId: 31337,
    deployedAt: new Date().toISOString(),
    contracts: {
      ProductRegistry: {
        address: productRegistryAddress,
        deploymentHash: productRegistry.deploymentTransaction()?.hash
      },
      Reputation: {
        address: reputationAddress,
        deploymentHash: reputation.deploymentTransaction()?.hash
      }
    },
    deployer: deployer.address
  };

  fs.writeFileSync(
    './deployments.json', 
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n📄 Deployment information saved to deployments.json");
  console.log("\n🎉 All contracts deployed successfully!");
  console.log("\n📋 Summary:");
  console.log("   ProductRegistry:", productRegistryAddress);
  console.log("   Reputation:     ", reputationAddress);
  console.log("\n💡 Next steps:");
  console.log("   1. Run: npm run populate");
  console.log("   2. Run: node ../scripts/populate-mongodb.js");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
