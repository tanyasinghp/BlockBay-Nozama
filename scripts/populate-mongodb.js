const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Configuration
const CONFIG = {
  // MongoDB connection string - replace with your Atlas connection string
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  DATABASE_NAME: 'nozama-search',
  COLLECTIONS: {
    PRODUCTS: 'products',
    SELLERS: 'sellers', 
    CATEGORIES: 'categories',
    ANALYTICS: 'analytics'
  }
};

// Load sample data
function loadSampleData() {
  const dataPath = path.join(__dirname, 'sample-data');
  
  const products = JSON.parse(fs.readFileSync(path.join(dataPath, 'products.json'), 'utf8'));
  
  return { products };
}

// Create database indexes for optimal search performance
async function createIndexes(db) {
  console.log("📊 Creating database indexes for optimal search performance...");
  
  const productCollection = db.collection(CONFIG.COLLECTIONS.PRODUCTS);
  
  // Drop existing text index to avoid conflict
  try {
    await productCollection.dropIndex("text_search_index");
    console.log("✅ Dropped existing text index.");
  } catch (error) {
    if (error.codeName !== 'IndexNotFound') {
      throw error;
    }
    // Index did not exist, which is fine
  }

  // Product indexes
  await productCollection.createIndex({ "name": "text", "description": "text", "category": "text", "tags": "text" }, {
    weights: { name: 10, description: 5, category: 2, tags: 8 },
    name: 'text_search_index'
  });
  await productCollection.createIndex({ "category": 1 });
  await productCollection.createIndex({ "price": 1 });
  await productCollection.createIndex({ "views": -1 });
  await productCollection.createIndex({ "createdAt": -1 });
  await productCollection.createIndex({ "listingId": 1 }, { unique: true });
  
  console.log("✅ Database indexes created successfully");
}

async function main() {
  console.log("🚀 Starting MongoDB population for Nozama Search & Discovery API\n");
  
  // Check for MongoDB URI
  if (!process.env.MONGODB_URI) {
    console.log("⚠️  MONGODB_URI environment variable not set");
    console.log("📋 Please set your MongoDB Atlas connection string:");
    console.log("   export MONGODB_URI='mongodb+srv://username:password@cluster.mongodb.net/database'");
    console.log("   or run: MONGODB_URI='your-connection-string' node populate-mongodb.js");
    process.exit(1);
  }
  
  let client;
  
  try {
    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    client = new MongoClient(CONFIG.MONGODB_URI);
    await client.connect();
    console.log("✅ Connected to MongoDB successfully");
    
    const db = client.db(CONFIG.DATABASE_NAME);
    
    // Load sample data
    console.log("\n📂 Loading sample data...");
    const { products } = loadSampleData();
    console.log(`   📦 Products: ${products.length}`);

    const productsWithListingId = products.map(p => ({
      ...p,
      listingId: p.productId ? `lst_${p.productId}` : `lst_${uuidv4()}`,
    }));
    
    // Clear existing collections
    console.log("\n🧹 Clearing existing collections...");
    await db.collection(CONFIG.COLLECTIONS.PRODUCTS).deleteMany({});
    
    // Insert data
    console.log("\n📝 Inserting data into MongoDB...");
    
    await db.collection(CONFIG.COLLECTIONS.PRODUCTS).insertMany(productsWithListingId);
    console.log(`✅ Inserted ${productsWithListingId.length} products`);
    
    // Create indexes
    await createIndexes(db);
    
    // Verify data
    console.log("\n🔍 Verifying data integrity...");
    const productCount = await db.collection(CONFIG.COLLECTIONS.PRODUCTS).countDocuments();
    
    console.log(`   📦 Products in DB: ${productCount}`);
    
    // Test queries
    console.log("\n🧪 Testing search functionality...");
    
    const testSearches = [
      { query: 'smartphone', expectedCount: 1 },
      { query: 'samsung', expectedCount: 1 },
      { category: 'electronics', minCount: 5 },
      { priceRange: { $gte: 0.1, $lte: 1.0 }, minCount: 5 }
    ];
    
    for (const test of testSearches) {
      let query = {};
      
      if (test.query) {
        query = { $text: { $search: test.query } };
      } else if (test.category) {
        query = { category: test.category };
      } else if (test.priceRange) {
        query = { price: test.priceRange };
      }
      
      const results = await db.collection(CONFIG.COLLECTIONS.PRODUCTS).find(query).toArray();
      const passed = test.expectedCount ? results.length === test.expectedCount : results.length >= test.minCount;
      
      console.log(`   ${passed ? '✅' : '❌'} ${JSON.stringify(test)}: ${results.length} results`);
    }
    
    // Save population summary
    const populationSummary = {
      populatedAt: new Date().toISOString(),
      database: CONFIG.DATABASE_NAME,
      collections: {
        products: productCount,
      },
      totalRecords: productCount,
      sampleQueries: [
        "db.products.find({$text: {$search: 'smartphone'}})",
        "db.products.find({category: 'electronics', price: {$lte: 1.0}})",
      ]
    };
    
    fs.writeFileSync('./mongodb-population.json', JSON.stringify(populationSummary, null, 2));
    
    console.log("\n🎉 MongoDB population completed successfully!");
    console.log("📄 Summary saved to mongodb-population.json");
    
    console.log("\n🔗 Database Connection Info:");
    console.log(`   Database: ${CONFIG.DATABASE_NAME}`);
    console.log(`   Collections: ${Object.values(CONFIG.COLLECTIONS).join(', ')}`);
    
  } catch (error) {
    console.error("❌ Population failed:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("\n📡 MongoDB connection closed");
    }
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Received SIGINT. Gracefully shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Received SIGTERM. Gracefully shutting down...');
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = { CONFIG, loadSampleData };
