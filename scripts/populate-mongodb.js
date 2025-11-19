const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
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
  const sellers = JSON.parse(fs.readFileSync(path.join(dataPath, 'sellers.json'), 'utf8'));
  const categories = JSON.parse(fs.readFileSync(path.join(dataPath, 'categories.json'), 'utf8'));
  
  return { products, sellers, categories };
}

// Generate additional sample products to reach 50+ total
function generateAdditionalProducts(existingProducts, sellers) {
  const additionalProducts = [
    {
      productId: "11",
      name: "Google Pixel 7 Pro",
      description: "Advanced Android smartphone with Google AI, exceptional camera system, and pure Android experience.",
      price: 0.95,
      priceUSD: 1900.00,
      category: "electronics",
      subcategory: "smartphones",
      tags: ["smartphone", "google", "pixel", "android", "5g", "camera", "ai"],
      stock: 12,
      views: 1580,
      sales: 42,
      featured: true,
      isActive: true
    },
    {
      productId: "12", 
      name: "PlayStation 5 Console",
      description: "Next-gen gaming console with lightning-fast SSD and immersive 3D audio.",
      price: 0.65,
      priceUSD: 1300.00,
      category: "gaming",
      subcategory: "consoles",
      tags: ["playstation", "ps5", "gaming", "console", "sony", "next-gen"],
      stock: 3,
      views: 3200,
      sales: 89,
      featured: true,
      isActive: true
    },
    {
      productId: "13",
      name: "Nintendo Switch OLED",
      description: "Portable gaming console with vibrant OLED display and versatile gameplay modes.",
      price: 0.42,
      priceUSD: 840.00,
      category: "gaming",
      subcategory: "consoles",
      tags: ["nintendo", "switch", "oled", "portable", "gaming", "console"],
      stock: 15,
      views: 2100,
      sales: 67,
      featured: false,
      isActive: true
    },
    {
      productId: "14",
      name: "Dell XPS 15 Laptop",
      description: "High-performance laptop with Intel i7, RTX graphics, and 4K display for creators.",
      price: 0.85,
      priceUSD: 1700.00,
      category: "electronics",
      subcategory: "laptops",
      tags: ["laptop", "dell", "xps", "i7", "rtx", "4k", "creator"],
      stock: 6,
      views: 745,
      sales: 28,
      featured: false,
      isActive: true
    },
    {
      productId: "15",
      name: "iPad Air M1",
      description: "Versatile tablet with M1 chip, perfect for creativity, productivity, and entertainment.",
      price: 0.55,
      priceUSD: 1100.00,
      category: "electronics",
      subcategory: "tablets",
      tags: ["ipad", "tablet", "apple", "m1", "creative", "productivity"],
      stock: 20,
      views: 1350,
      sales: 55,
      featured: true,
      isActive: true
    },
    {
      productId: "16",
      name: "Mechanical Gaming Keyboard",
      description: "RGB mechanical keyboard with Cherry MX switches, perfect for gaming and typing.",
      price: 0.18,
      priceUSD: 360.00,
      category: "electronics",
      subcategory: "accessories",
      tags: ["keyboard", "mechanical", "gaming", "rgb", "cherry-mx", "switches"],
      stock: 25,
      views: 890,
      sales: 73,
      featured: false,
      isActive: true
    },
    {
      productId: "17",
      name: "Wireless Gaming Mouse",
      description: "High-precision wireless gaming mouse with customizable DPI and RGB lighting.",
      price: 0.12,
      priceUSD: 240.00,
      category: "electronics",
      subcategory: "accessories",
      tags: ["mouse", "wireless", "gaming", "precision", "dpi", "rgb"],
      stock: 35,
      views: 567,
      sales: 89,
      featured: false,
      isActive: true
    },
    {
      productId: "18",
      name: "Premium Sneaker Collection",
      description: "Limited edition sneaker collection featuring exclusive colorways and premium materials.",
      price: 0.32,
      priceUSD: 640.00,
      category: "fashion",
      subcategory: "footwear",
      tags: ["sneakers", "limited", "premium", "collection", "exclusive", "fashion"],
      stock: 8,
      views: 2890,
      sales: 124,
      featured: true,
      isActive: true
    },
    {
      productId: "19",
      name: "Smart Home Security Camera",
      description: "4K security camera with night vision, motion detection, and cloud storage.",
      price: 0.22,
      priceUSD: 440.00,
      category: "home",
      subcategory: "security",
      tags: ["security", "camera", "smart", "4k", "night-vision", "motion"],
      stock: 18,
      views: 678,
      sales: 34,
      featured: false,
      isActive: true
    },
    {
      productId: "20",
      name: "Professional Workout Equipment Set",
      description: "Complete home gym set with dumbbells, resistance bands, and yoga accessories.",
      price: 0.38,
      priceUSD: 760.00,
      category: "sports",
      subcategory: "equipment",
      tags: ["workout", "gym", "dumbbells", "resistance", "fitness", "home"],
      stock: 12,
      views: 1240,
      sales: 67,
      featured: true,
      isActive: true
    }
  ];

  // Add seller information and blockchain data to additional products
  return additionalProducts.map((product, index) => {
    const sellerIndex = (index + 3) % sellers.length;
    const seller = sellers[sellerIndex];
    
    return {
      ...product,
      seller: {
        address: seller.address,
        did: seller.did,
        name: seller.name,
        reputation: seller.reputation,
        verified: seller.verified,
        totalSales: seller.totalSales
      },
      blockchain: {
        network: "Ethereum",
        contractAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        tokenId: product.productId,
        transactionHash: `0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedc${product.productId.padStart(2, '0')}`,
        blockNumber: 18234576 + parseInt(product.productId)
      },
      images: [
        {
          cid: `QmSample${product.productId}Hash${index}`,
          url: `https://ipfs.io/ipfs/QmSample${product.productId}Hash${index}`,
          thumbnail: `QmThumbnail${product.productId}Hash${index}`
        }
      ],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
    };
  });
}

// Generate analytics data for trending calculations
function generateAnalytics(products) {
  return products.map(product => ({
    productId: product.productId,
    dailyViews: Math.floor(Math.random() * 100) + 10,
    weeklyViews: Math.floor(Math.random() * 500) + 50,
    monthlyViews: product.views,
    dailySales: Math.floor(Math.random() * 5),
    weeklyViews: Math.floor(Math.random() * 20),
    monthlySales: product.sales,
    trendingScore: calculateTrendingScore(product),
    lastUpdated: new Date()
  }));
}

// Calculate trending score based on views, sales, and recency
function calculateTrendingScore(product) {
  const viewScore = Math.log(product.views + 1) * 10;
  const salesScore = product.sales * 5;
  const recentBoost = product.featured ? 20 : 0;
  return Math.round(viewScore + salesScore + recentBoost);
}

// Create database indexes for optimal search performance
async function createIndexes(db) {
  console.log("📊 Creating database indexes for optimal search performance...");
  
  const productCollection = db.collection(CONFIG.COLLECTIONS.PRODUCTS);
  const sellerCollection = db.collection(CONFIG.COLLECTIONS.SELLERS);
  const categoryCollection = db.collection(CONFIG.COLLECTIONS.CATEGORIES);
  
  // Product indexes
  await productCollection.createIndex({ "name": "text", "description": "text", "tags": "text" });
  await productCollection.createIndex({ "category": 1 });
  await productCollection.createIndex({ "subcategory": 1 });
  await productCollection.createIndex({ "price": 1 });
  await productCollection.createIndex({ "seller.reputation": 1 });
  await productCollection.createIndex({ "seller.verified": 1 });
  await productCollection.createIndex({ "featured": 1 });
  await productCollection.createIndex({ "isActive": 1 });
  await productCollection.createIndex({ "views": -1 });
  await productCollection.createIndex({ "sales": -1 });
  await productCollection.createIndex({ "createdAt": -1 });
  await productCollection.createIndex({ "productId": 1 }, { unique: true });
  
  // Compound indexes for common query patterns
  await productCollection.createIndex({ "category": 1, "price": 1 });
  await productCollection.createIndex({ "category": 1, "seller.reputation": -1 });
  await productCollection.createIndex({ "featured": 1, "views": -1 });
  await productCollection.createIndex({ "isActive": 1, "createdAt": -1 });
  
  // Seller indexes
  await sellerCollection.createIndex({ "address": 1 }, { unique: true });
  await sellerCollection.createIndex({ "reputation": -1 });
  await sellerCollection.createIndex({ "verified": 1 });
  await sellerCollection.createIndex({ "totalSales": -1 });
  
  // Category indexes
  await categoryCollection.createIndex({ "id": 1 }, { unique: true });
  await categoryCollection.createIndex({ "productCount": -1 });
  
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
    const { products, sellers, categories } = loadSampleData();
    console.log(`   📦 Products: ${products.length}`);
    console.log(`   👥 Sellers: ${sellers.length}`);
    console.log(`   📂 Categories: ${categories.length}`);
    
    // Generate additional products
    console.log("\n🔄 Generating additional sample products...");
    const additionalProducts = generateAdditionalProducts(products, sellers);
    const allProducts = [...products, ...additionalProducts];
    
    // Add seller info to original products
    const enrichedProducts = allProducts.map(product => {
      if (!product.seller) {
        // Find matching seller for products without seller info
        const matchingSeller = sellers.find(s => 
          product.category === 'electronics' ? s.name.includes('Tech') :
          product.category === 'fashion' ? s.name.includes('Fashion') :
          product.category === 'home' ? s.name.includes('Home') :
          product.category === 'sports' ? s.name.includes('Sports') :
          s.name.includes('Book')
        ) || sellers[0];
        
        return {
          ...product,
          seller: {
            address: matchingSeller.address,
            did: matchingSeller.did,
            name: matchingSeller.name,
            reputation: matchingSeller.reputation,
            verified: matchingSeller.verified,
            totalSales: matchingSeller.totalSales
          },
          createdAt: product.createdAt || new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        };
      }
      return {
        ...product,
        createdAt: product.createdAt || new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      };
    });
    
    // Generate analytics data
    const analytics = generateAnalytics(enrichedProducts);
    
    console.log(`   📈 Total Products: ${enrichedProducts.length}`);
    console.log(`   📊 Analytics Records: ${analytics.length}`);
    
    // Clear existing collections
    console.log("\n🧹 Clearing existing collections...");
    await db.collection(CONFIG.COLLECTIONS.PRODUCTS).deleteMany({});
    await db.collection(CONFIG.COLLECTIONS.SELLERS).deleteMany({});
    await db.collection(CONFIG.COLLECTIONS.CATEGORIES).deleteMany({});
    await db.collection(CONFIG.COLLECTIONS.ANALYTICS).deleteMany({});
    
    // Insert data
    console.log("\n📝 Inserting data into MongoDB...");
    
    await db.collection(CONFIG.COLLECTIONS.PRODUCTS).insertMany(enrichedProducts);
    console.log(`✅ Inserted ${enrichedProducts.length} products`);
    
    await db.collection(CONFIG.COLLECTIONS.SELLERS).insertMany(sellers);
    console.log(`✅ Inserted ${sellers.length} sellers`);
    
    await db.collection(CONFIG.COLLECTIONS.CATEGORIES).insertMany(categories);
    console.log(`✅ Inserted ${categories.length} categories`);
    
    await db.collection(CONFIG.COLLECTIONS.ANALYTICS).insertMany(analytics);
    console.log(`✅ Inserted ${analytics.length} analytics records`);
    
    // Create indexes
    await createIndexes(db);
    
    // Verify data
    console.log("\n🔍 Verifying data integrity...");
    const productCount = await db.collection(CONFIG.COLLECTIONS.PRODUCTS).countDocuments();
    const sellerCount = await db.collection(CONFIG.COLLECTIONS.SELLERS).countDocuments();
    const categoryCount = await db.collection(CONFIG.COLLECTIONS.CATEGORIES).countDocuments();
    const analyticsCount = await db.collection(CONFIG.COLLECTIONS.ANALYTICS).countDocuments();
    
    console.log(`   📦 Products in DB: ${productCount}`);
    console.log(`   👥 Sellers in DB: ${sellerCount}`);
    console.log(`   📂 Categories in DB: ${categoryCount}`);
    console.log(`   📊 Analytics in DB: ${analyticsCount}`);
    
    // Test queries
    console.log("\n🧪 Testing search functionality...");
    
    const testSearches = [
      { query: 'smartphone', expectedCount: 2 },
      { query: 'samsung', expectedCount: 1 },
      { category: 'electronics', minCount: 5 },
      { priceRange: { $gte: 0.1, $lte: 1.0 }, minCount: 8 }
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
        sellers: sellerCount,
        categories: categoryCount,
        analytics: analyticsCount
      },
      totalRecords: productCount + sellerCount + categoryCount + analyticsCount,
      sampleQueries: [
        "db.products.find({$text: {$search: 'smartphone'}})",
        "db.products.find({category: 'electronics', price: {$lte: 1.0}})",
        "db.products.find({'seller.verified': true}).sort({views: -1})",
        "db.products.find({featured: true}).sort({sales: -1})"
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

module.exports = { CONFIG, loadSampleData, generateAdditionalProducts };
