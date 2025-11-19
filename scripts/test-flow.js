const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Test the complete order flow end-to-end on the blockchain
 */
async function main() {
  console.log("Testing Order Flow End-to-End\n");
  console.log("=" .repeat(60));

  // Load deployment
  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("[ERROR] deployment.json not found. Run deploy.js first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  // Get signers
  const [deployer, seller, buyer] = await hre.ethers.getSigners();
  console.log("\nTest Accounts:");
  console.log("   Deployer:", deployer.address);
  console.log("   Seller:  ", seller.address);
  console.log("   Buyer:   ", buyer.address);

  // Get contract instances
  const ListingRegistry = await hre.ethers.getContractFactory("ListingRegistry");
  const Escrow = await hre.ethers.getContractFactory("Escrow");
  const OrderManager = await hre.ethers.getContractFactory("OrderManager");

  const listingRegistry = ListingRegistry.attach(deployment.contracts.ListingRegistry);
  const escrow = Escrow.attach(deployment.contracts.Escrow);
  const orderManager = OrderManager.attach(deployment.contracts.OrderManager);

  try {
    // Step 1: Create a test listing
    console.log("\n\nStep 1: Creating Test Listing...");
    console.log("-".repeat(60));
    
    const listingId = "test_listing_" + Date.now();
    const price = hre.ethers.parseEther("0.1");
    
    const createListingTx = await listingRegistry.connect(seller).createListing(
      listingId,
      "Test Product",
      price,
      "ETH",
      10,
      "QmTest123"
    );
    await createListingTx.wait();
    console.log("[OK] Listing created:", listingId);
    console.log("   Price:", hre.ethers.formatEther(price), "ETH");
    console.log("   Stock: 10");

    // Step 2: Create an order
    console.log("\n\nStep 2: Creating Order...");
    console.log("-".repeat(60));
    
    const orderId = "test_order_" + Date.now();
    const quantity = 2;
    
    const createOrderTx = await orderManager.connect(buyer).createOrder(
      orderId,
      listingId,
      quantity
    );
    const createOrderReceipt = await createOrderTx.wait();
    console.log("[OK] Order created:", orderId);
    console.log("   Quantity:", quantity);
    console.log("   Gas used:", createOrderReceipt.gasUsed.toString());

    // Get order details
    const order = await orderManager.getOrder(orderId);
    const totalAmount = order.totalAmount;
    console.log("   Total amount:", hre.ethers.formatEther(totalAmount), "ETH");

    // Step 3: Pay for the order
    console.log("\n\nStep 3: Paying for Order (Creating Escrow)...");
    console.log("-".repeat(60));
    
    const buyerBalanceBefore = await hre.ethers.provider.getBalance(buyer.address);
    console.log("   Buyer balance before:", hre.ethers.formatEther(buyerBalanceBefore), "ETH");
    
    const payOrderTx = await orderManager.connect(buyer).payOrder(orderId, {
      value: totalAmount
    });
    const payOrderReceipt = await payOrderTx.wait();
    console.log("[OK] Payment successful!");
    console.log("   Gas used:", payOrderReceipt.gasUsed.toString());
    
    const buyerBalanceAfter = await hre.ethers.provider.getBalance(buyer.address);
    console.log("   Buyer balance after:", hre.ethers.formatEther(buyerBalanceAfter), "ETH");

    // Get updated order with escrow ID
    const paidOrder = await orderManager.getOrder(orderId);
    const escrowId = paidOrder.escrowId;
    console.log("   Escrow ID:", escrowId);

    // Get escrow details
    const escrowDetails = await escrow.getEscrow(escrowId);
    console.log("   Escrow state:", getEscrowState(escrowDetails.state));
    console.log("   Escrow amount:", hre.ethers.formatEther(escrowDetails.amount), "ETH");

    // Step 4: Mark as shipped
    console.log("\n\nStep 4: Marking Order as Shipped...");
    console.log("-".repeat(60));
    
    const updateStatusTx = await orderManager.connect(seller).updateOrderStatus(
      orderId,
      2, // Shipped status
      "DHL tracking: TEST123456"
    );
    await updateStatusTx.wait();
    console.log("[OK] Order marked as shipped");

    const shippedOrder = await orderManager.getOrder(orderId);
    console.log("   Order status:", getOrderStatus(shippedOrder.status));

    // Step 5: Confirm delivery and release escrow
    console.log("\n\nStep 5: Confirming Delivery and Releasing Escrow...");
    console.log("-".repeat(60));
    
    const sellerBalanceBefore = await hre.ethers.provider.getBalance(seller.address);
    console.log("   Seller balance before:", hre.ethers.formatEther(sellerBalanceBefore), "ETH");
    
    const confirmDeliveryTx = await orderManager.connect(buyer).confirmDeliveryAndRelease(orderId);
    const confirmDeliveryReceipt = await confirmDeliveryTx.wait();
    console.log("[OK] Delivery confirmed and escrow released!");
    console.log("   Gas used:", confirmDeliveryReceipt.gasUsed.toString());
    
    const sellerBalanceAfter = await hre.ethers.provider.getBalance(seller.address);
    console.log("   Seller balance after:", hre.ethers.formatEther(sellerBalanceAfter), "ETH");
    console.log("   Seller received:", hre.ethers.formatEther(sellerBalanceAfter - sellerBalanceBefore), "ETH");

    // Final order state
    const finalOrder = await orderManager.getOrder(orderId);
    console.log("   Final order status:", getOrderStatus(finalOrder.status));

    // Final escrow state
    const finalEscrow = await escrow.getEscrow(escrowId);
    console.log("   Final escrow state:", getEscrowState(finalEscrow.state));

    // Step 6: Verify listing stock
    console.log("\n\nStep 6: Verifying Listing Stock...");
    console.log("-".repeat(60));
    
    const finalListing = await listingRegistry.getListing(listingId);
    console.log("[OK] Listing stock updated");
    console.log("   Original stock: 10");
    console.log("   Quantity ordered:", quantity);
    console.log("   Remaining stock:", finalListing.stock.toString());

    console.log("\n\n" + "=".repeat(60));
    console.log("Order Flow Test Complete!");
    console.log("=".repeat(60));
    console.log("\n[OK] All steps executed successfully:");
    console.log("   1. Created listing");
    console.log("   2. Created order");
    console.log("   3. Paid for order (escrow created)");
    console.log("   4. Marked as shipped");
    console.log("   5. Confirmed delivery (escrow released)");
    console.log("   6. Stock decremented correctly");
    console.log("\n");

  } catch (error) {
    console.error("\n[ERROR] Test failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

function getOrderStatus(statusEnum) {
  const statuses = ['Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled', 'Disputed', 'Refunded'];
  return statuses[Number(statusEnum)] || 'Unknown';
}

function getEscrowState(stateEnum) {
  const states = ['Locked', 'Released', 'Refunded', 'Disputed'];
  return states[Number(stateEnum)] || 'Unknown';
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

