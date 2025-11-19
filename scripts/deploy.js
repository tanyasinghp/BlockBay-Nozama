const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment to local Hardhat network...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy ListingRegistry
  console.log("Deploying ListingRegistry...");
  const ListingRegistry = await hre.ethers.getContractFactory("ListingRegistry");
  const listingRegistry = await ListingRegistry.deploy();
  await listingRegistry.waitForDeployment();
  const listingRegistryAddress = await listingRegistry.getAddress();
  console.log("[OK] ListingRegistry deployed to:", listingRegistryAddress, "\n");

  // Deploy Escrow
  console.log("Deploying Escrow...");
  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy();
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("[OK] Escrow deployed to:", escrowAddress, "\n");

  // Deploy OrderManager
  console.log("Deploying OrderManager...");
  const OrderManager = await hre.ethers.getContractFactory("OrderManager");
  const orderManager = await OrderManager.deploy(listingRegistryAddress, escrowAddress);
  await orderManager.waitForDeployment();
  const orderManagerAddress = await orderManager.getAddress();
  console.log("[OK] OrderManager deployed to:", orderManagerAddress, "\n");

  // Save deployment addresses
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    contracts: {
      ListingRegistry: listingRegistryAddress,
      Escrow: escrowAddress,
      OrderManager: orderManagerAddress
    },
    timestamp: new Date().toISOString()
  };

  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to deployment.json\n");

  // Update .env file (create if doesn't exist)
  const envPath = path.join(__dirname, "..", ".env");
  let envContent = "";
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  } else {
    // Read from env.example
    const envExamplePath = path.join(__dirname, "..", "env.example");
    if (fs.existsSync(envExamplePath)) {
      envContent = fs.readFileSync(envExamplePath, "utf8");
    }
  }

  // Update contract addresses
  envContent = envContent.replace(/LISTING_REGISTRY_ADDRESS=.*/g, `LISTING_REGISTRY_ADDRESS=${listingRegistryAddress}`);
  envContent = envContent.replace(/ESCROW_CONTRACT_ADDRESS=.*/g, `ESCROW_CONTRACT_ADDRESS=${escrowAddress}`);
  envContent = envContent.replace(/ORDER_MANAGER_ADDRESS=.*/g, `ORDER_MANAGER_ADDRESS=${orderManagerAddress}`);

  fs.writeFileSync(envPath, envContent);
  console.log("[OK] .env file updated with contract addresses\n");

  console.log("=" .repeat(60));
  console.log("Deployment Complete!");
  console.log("=" .repeat(60));
  console.log("\nContract Addresses:");
  console.log("   ListingRegistry:", listingRegistryAddress);
  console.log("   Escrow:         ", escrowAddress);
  console.log("   OrderManager:   ", orderManagerAddress);
  console.log("\nNext steps:");
  console.log("   1. Keep Hardhat node running in one terminal");
  console.log("   2. Run: npm run service:start");
  console.log("   3. Test the API at http://localhost:3003");
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

