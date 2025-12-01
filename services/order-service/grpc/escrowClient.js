const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "../../payment-service/grpc/escrow.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const escrowProto = grpc.loadPackageDefinition(packageDefinition).escrow;

const ESCROW_GRPC_URL = process.env.ESCROW_GRPC_URL || "localhost:50051";

const client = new escrowProto.EscrowService(
  ESCROW_GRPC_URL,
  grpc.credentials.createInsecure()
);

console.log("🔗 gRPC Client connected to Payment Service at:", ESCROW_GRPC_URL);

module.exports = client;
