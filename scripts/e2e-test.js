const axios = require('axios');

// Service endpoints
const LISTING_SERVICE_URL = 'http://localhost:3004/api/v1';
const SEARCH_SERVICE_URL = 'http://localhost:3002/api/v1';
const ORDER_SERVICE_URL = 'http://localhost:3003/api/v1';

// --- Test Data ---
const uniqueId = `laptop_${Date.now()}`;
const newProduct = {
  name: `Super-Fast Laptop ${uniqueId}`,
  description: 'A brand new laptop with incredible performance.',
  price: 1.5, // in ETH
  stock: 10,
  status: 'published',
  category: 'Electronics',
  images: ['image_url_1.jpg', 'image_url_2.jpg'],
  seller: {
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Default Hardhat account 0
    name: 'Test Seller'
  }
};

let createdListingId;

// --- Helper Functions ---
const logStep = (step, message) => console.log(`\n--- ${step} ---\n${message}\n`);
const logSuccess = (message) => console.log(`✅ SUCCESS: ${message}`);
const logError = (error) => console.error(`❌ ERROR: ${error.message}`, error.response ? error.response.data : '');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- Test Flow ---
async function runTest() {
  try {
    // Step 1: List a new product
    logStep('STEP 1: Listing a new product', `Sending POST to ${LISTING_SERVICE_URL}/listings`);
    const listResponse = await axios.post(`${LISTING_SERVICE_URL}/listings`, newProduct);
    createdListingId = listResponse.data.listingId;
    logSuccess(`Product listed successfully! Listing ID: ${createdListingId}`);

    // Wait for the search service to index the new product
    logStep('STEP 2: Waiting for search index', 'Pausing for  seconds...');
    await sleep(5000);

    // Step 3: Search for the newly listed product
    const searchQuery = newProduct.name;
    logStep('STEP 3: Searching for the product', `Sending GET to ${SEARCH_SERVICE_URL}/search?query=${searchQuery}`);
    const searchResponse = await axios.get(`${SEARCH_SERVICE_URL}/search`, { params: { query: searchQuery } });
    
    const foundProduct = searchResponse.data.results.find(p => p.listingId === createdListingId);
    if (foundProduct) {
      logSuccess(`Found the new product in search results: ${foundProduct.name}`);
    } else {
      throw new Error('Product not found in search results.');
    }

    // Step 4: Order the product
    const orderPayload = {
      listingId: createdListingId,
      quantity: 1,
      buyerAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' // Default Hardhat account 1
    };
    logStep('STEP 4: Ordering the product', `Sending POST to ${ORDER_SERVICE_URL}/orders`);
    const orderResponse = await axios.post(`${ORDER_SERVICE_URL}/orders`, orderPayload);
    logSuccess(`Order created successfully! Order ID: ${orderResponse.data.orderId}`);

    // Wait for the order to be processed on the blockchain
    logStep('STEP 5: Waiting for order confirmation', 'Pausing for 5 seconds...');
    await sleep(5000);

    console.log('\n🎉 End-to-end test completed successfully! 🎉');

  } catch (error) {
    logError(error);
    console.log('\n🔥 End-to-end test failed. 🔥');
    process.exit(1);
  }
}

// --- Installation Check ---
async function checkDependencies() {
  try {
    require.resolve('axios');
  } catch (e) {
    console.error('Axios is not installed. Please run: npm install axios');
    process.exit(1);
  }
}

(async () => {
  await checkDependencies();
  await runTest();
})();
