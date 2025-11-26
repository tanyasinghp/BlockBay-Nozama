// contracts/scripts/deploy.js
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("\n🚀 Starting full Nozama smart contract deployment...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  console.log(
    "💰 Balance:",
    hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)),
    "ETH\n"
  );

  // ---------------------------
  // 1. Reputation
  // ---------------------------
  console.log("\n⭐ Deploying Reputation...");
  const Reputation = await hre.ethers.deployContract("Reputation");
  await Reputation.waitForDeployment();
  const reputationAddress = await Reputation.getAddress();
  console.log("✅ Reputation:", reputationAddress);

  // ---------------------------
  // 2. ListingRegistry
  // ---------------------------
  console.log("\n🛒 Deploying ListingRegistry...");
  const ListingRegistry = await hre.ethers.deployContract("ListingRegistry");
  await ListingRegistry.waitForDeployment();
  const listingAddress = await ListingRegistry.getAddress();
  console.log("✅ ListingRegistry:", listingAddress);

  // ---------------------------
  // 3. Escrow
  // ---------------------------
  console.log("\n💸 Deploying Escrow...");
  const Escrow = await hre.ethers.deployContract("Escrow");
  await Escrow.waitForDeployment();
  const escrowAddress = await Escrow.getAddress();
  console.log("✅ Escrow:", escrowAddress);

  // ---------------------------
  // 4. OrderManager
  // ---------------------------
  console.log("\n📦 Deploying OrderManager...");
  const OrderManager = await hre.ethers.deployContract(
    "OrderManager",
    [listingAddress, escrowAddress] // constructor params
  );
  await OrderManager.waitForDeployment();
  const orderManagerAddress = await OrderManager.getAddress();
  console.log("✅ OrderManager:", orderManagerAddress);

  // ---------------------------
  // Save deployments.json
  // ---------------------------
  const output = {
    network: "localhost",
    chainId: 31337,
    deployedAt: new Date().toISOString(),
    contracts: {
      Reputation: { address: reputationAddress },
      ListingRegistry: { address: listingAddress },
      Escrow: { address: escrowAddress },
      OrderManager: { address: orderManagerAddress }
    },
    deployer: deployer.address
  };

  fs.writeFileSync("./deployments.json", JSON.stringify(output, null, 2));

  console.log("\n📄 deployments.json updated successfully!");
  console.log("🎉 Deployment complete!\n");
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});
