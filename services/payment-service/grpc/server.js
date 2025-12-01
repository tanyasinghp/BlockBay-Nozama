// services/payment-service/grpc/server.js

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const { ethers } = require("ethers");

// Blockchain + wallet
const {
    escrowContract,
    getFreshWallet
} = require("../src/config/blockchain");

// Load proto
const PROTO_PATH = path.join(__dirname, "escrow.proto");
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const proto = grpc.loadPackageDefinition(packageDefinition).escrow;

// =============== RPC METHODS ==================

// Create Escrow
// async function CreateEscrow(call, callback) {
//   try {

//     // Logging request at the top
//     console.log("➡️ gRPC Request: CreateEscrow", call.request);
//     const { orderId, seller, amount } = call.request;
//     const amountWei = ethers.parseEther(String(amount));

//     const buyerWallet = new ethers.Wallet(process.env.BUYER_PRIVATE_KEY, escrowContract.runner.provider);
//     console.log("🧾 Buyer wallet used:", buyerWallet.address);

//     const tx = await escrowContract
//       .connect(buyerWallet)
//       .createEscrow(orderId, seller, { value: amountWei });

//     const receipt = await tx.wait();
//     const escrowId = receipt.logs?.[0]?.topics?.[1] || null;
//     // Logging response just before callback
//     console.log("⬅️ gRPC Response: Escrow Created", escrowId);
//     console.log("Buyer wallet:", buyerWallet.address);

//     callback(null, { status: "success", message: "Escrow created", escrowId });
//   } catch (err) {
//     console.error("❌ gRPC Error in CreateEscrow:", err.message); 
//     callback({ code: grpc.status.INTERNAL, message: err.message });
//   }
// }

// Create Escrow (Mock for integration testing)
async function CreateEscrow(call, callback) {
  try {
    console.log("🔥 REAL CreateEscrow CALLED!");   // <-- TOP LOG

    console.log("➡️ gRPC Request: CreateEscrow", call.request);

    const { orderId, buyer, seller, amount } = call.request;
    const amountWei = ethers.parseEther(String(amount));

    const buyerWallet = new ethers.Wallet(
      process.env.BUYER_PRIVATE_KEY,
      escrowContract.runner.provider
    );

    const tx = await escrowContract
      .connect(buyerWallet)
      .createEscrow(orderId, seller, { value: amountWei });

    const receipt = await tx.wait();

    // 🔍 Add debugging logs for the event
    console.log("📌 EscrowCreated EVENT RAW LOGS:", receipt.logs);

    const event = receipt.logs
      .map(log => {
        try { return escrowContract.interface.parseLog(log); }
        catch { return null; }
      })
      .find(e => e && e.name === "EscrowCreated");

    console.log("📌 Parsed EVENT:", event);

    const escrowId = event?.args?.escrowId;
    console.log("📌 Escrow ID extracted:", escrowId);  // <-- BEFORE callback

    return callback(null, {
      escrowId,
      status: "success",
      message: "Escrow created successfully"
    });

  } catch (err) {
    console.error("❌ gRPC CreateEscrow ERROR:", err);
    return callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

// Release Escrow
async function ReleaseEscrow(call, callback) {
    try {
        const { escrowId } = call.request;
        await escrowContract.releaseEscrow(escrowId);

        callback(null, {
            status: "success",
            message: "Escrow released",
            escrowId
        });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

// Refund Escrow
async function RefundEscrow(call, callback) {
    try {
        const { escrowId } = call.request;
        await escrowContract.refundEscrow(escrowId);

        callback(null, {
            status: "success",
            message: "Escrow refunded",
            escrowId
        });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

// Stream Escrow Events (Server PUSH)
function StreamEscrowEvents(call) {
    escrowContract.on("EscrowReleased", (escrowId) => {
        call.write({ type: "released", escrowId, updatedAt: new Date().toISOString() });
    });

    escrowContract.on("EscrowRefunded", (escrowId) => {
        call.write({ type: "refunded", escrowId, updatedAt: new Date().toISOString() });
    });
}

// ============= SERVER START ==================
function startGrpcServer() {
    const server = new grpc.Server();

    server.addService(proto.EscrowService.service, {
        CreateEscrow,
        ReleaseEscrow,
        RefundEscrow,
        StreamEscrowEvents
    });

    const PORT = process.env.GRPC_PORT || 50051;

    server.bindAsync(
        `0.0.0.0:${PORT}`,
        grpc.ServerCredentials.createInsecure(),
        () => {
            console.log(`🚀 gRPC Server running on port ${PORT}`);
            server.start();
        }
    );
}

module.exports = startGrpcServer;
