// src/index.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectMongo = require('./config/database');
require('dotenv').config();

const escrowRoutes = require('./routes/escrow.routes');
const { startIndexer } = require('./services/indexer');
const startGrpcServer = require('../grpc/server');  // <-- ADD THIS

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Basic logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/v1', escrowRoutes);

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// Start
(async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    await connectMongo(MONGODB_URI);

    app.listen(PORT, () => {
      console.log(`Escrow Service listening on ${PORT}`);
    });

    // Start indexer (listen to on-chain events)
    startIndexer();

    // 🚀 Start gRPC server
    startGrpcServer();     // <-- CALL HERE

  } catch (err) {
    console.error('Failed to start Escrow Service:', err);
    process.exit(1);
  }
})();
