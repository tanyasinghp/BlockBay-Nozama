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
async function CreateEscrow(call, callback) {
  try {
    const { orderId, buyer, seller, amount } = call.request;
    const amountWei = ethers.parseEther(String(amount));
    const buyerWallet = getFreshWallet();

    const tx = await escrowContract
      .connect(buyerWallet)
      .createEscrow(orderId, seller, { value: amountWei });

    const receipt = await tx.wait();
    const escrowId = receipt.logs?.[0]?.topics?.[1] || null;

    callback(null, {
      status: "success",
      message: "Escrow created",
      escrowId
    });
  } catch (err) {
    callback({ code: grpc.status.INTERNAL, message: err.message });
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
