const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectMongo = require('./config/database');
require('dotenv').config();

const listingRoutes = require('./routes/listings.routes');

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3002;
    this.mongoUri = process.env.MONGODB_URI;

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeDatabase();
  }

  initializeMiddleware() {
    this.app.use(cors({ origin: '*' }));
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  initializeRoutes() {
    this.app.use('/api/v1/listings', listingRoutes);
    this.app.get('/health', (req, res) => res.json({ status: 'ok' }));

    this.app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(err.status || 500).json({
        error: err.name || 'InternalServerError',
        message: err.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      });
    });
  }

  async initializeDatabase() {
    try {
      await connectMongo(this.mongoUri);
    } catch (err) {
      console.error('Failed to connect to MongoDB:', err);
      process.exit(1);
    }
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log('='.repeat(60));
      console.log('Listing Service Started Successfully!');
      console.log('='.repeat(60));
      console.log(`Server running on: http://localhost:${this.port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  }
}

module.exports = Server;
