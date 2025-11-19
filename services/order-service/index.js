const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const orderRoutes = require('./routes/orders');
const listingRoutes = require('./routes/listings');
const escrowRoutes = require('./routes/escrow');
const healthRoute = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/v1/health', healthRoute);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/listings', listingRoutes);
app.use('/api/v1/escrow', escrowRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'NotFound',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Serve static frontend
app.use(express.static('public'));

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('Order Service Started Successfully!');
  console.log('='.repeat(60));
  console.log(`Server running on: http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Blockchain RPC: ${process.env.BLOCKCHAIN_RPC_URL}`);
  console.log(`Frontend: http://localhost:${PORT}/`);
  console.log('\nAvailable endpoints:');
  console.log(`   GET    /api/v1/health`);
  console.log(`   GET    /api/v1/listings`);
  console.log(`   GET    /api/v1/listings/:listingId`);
  console.log(`   POST   /api/v1/orders`);
  console.log(`   GET    /api/v1/orders`);
  console.log(`   GET    /api/v1/orders/:orderId`);
  console.log(`   POST   /api/v1/orders/:orderId/pay`);
  console.log(`   PUT    /api/v1/orders/:orderId/status`);
  console.log(`   POST   /api/v1/orders/:orderId/confirm-delivery`);
  console.log(`   POST   /api/v1/orders/:orderId/cancel`);
  console.log(`   GET    /api/v1/escrow/:escrowId`);
  console.log('\nReady to accept requests!\n');
});

module.exports = app;

