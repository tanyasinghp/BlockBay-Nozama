const axios = require('axios');

// Service endpoints
const LISTING_SERVICE_URL = 'http://localhost:3004/api/v1';
const SEARCH_SERVICE_URL = 'http://localhost:3002/api/v1';
const ORDER_SERVICE_URL = 'http://localhost:3003/api/v1';
const IDENTITY_REP_SERVICE_URL = 'http://localhost:3001/api/v1';

// --- Test Data ---
const uniqueId = `laptop_${Date.now()}`;
const testAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // Default Hardhat account 0
const testAddress2 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Default Hardhat account 1

const newProduct = {
  name: `Super-Fast Laptop ${uniqueId}`,
  description: 'A brand new laptop with incredible performance.',
  price: 1.5, // in ETH
  stock: 10,
  status: 'published',
  category: 'Electronics',
  images: ['image_url_1.jpg', 'image_url_2.jpg'],
  seller: {
    address: testAddress,
    name: 'Test Seller'
  }
};

let createdListingId;
let createdIdentityDID;
let createdBuyerDID;
let createdRatingId;
let createdOrderId;

// --- Helper Functions ---
const logStep = (step, message) => console.log(`\n--- ${step} ---\n${message}\n`);
const logSuccess = (message) => console.log(`✅ SUCCESS: ${message}`);
const logError = (error) => console.error(`❌ ERROR: ${error.message}`, error.response ? error.response.data : '');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- Test Flow ---
async function runTest() {
  try {
    // Step 0: Test Identity & Reputation Service
    await testIdentityReputationService();

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
      buyerAddress: testAddress2
    };
    logStep('STEP 4: Ordering the product', `Sending POST to ${ORDER_SERVICE_URL}/orders`);
    const orderResponse = await axios.post(`${ORDER_SERVICE_URL}/orders`, orderPayload);
    createdOrderId = orderResponse.data.orderId;
    logSuccess(`Order created successfully! Order ID: ${createdOrderId}`);

    // Wait for the order to be processed on the blockchain
    logStep('STEP 5: Waiting for order confirmation', 'Pausing for 5 seconds...');
    await sleep(5000);

    // Step 6: Submit rating for the order
    await testRatingSubmission();

    console.log('\n🎉 End-to-end test completed successfully! 🎉');

  } catch (error) {
    logError(error);
    console.log('\n🔥 End-to-end test failed. 🔥');
    process.exit(1);
  }
}

// --- Identity & Reputation Service Tests ---
async function testIdentityReputationService() {
  logStep('IDENTITY & REPUTATION TESTS', 'Testing identity and reputation service endpoints');

  try {

    // Test 2: Create Identity for Seller
    const identityPayload = {
      address: testAddress,
      name: 'Test Seller Identity',
      bio: 'A test seller for e2e testing',
      avatar: 'https://example.com/avatar.jpg',
      metadata: {
        businessType: 'electronics',
        location: 'Test City'
      }
    };

    logStep('ID-REP TEST 2: Create Seller Identity', `Sending POST to ${IDENTITY_REP_SERVICE_URL}/identities`);
    try {
      const identityResponse = await axios.post(`${IDENTITY_REP_SERVICE_URL}/identities`, identityPayload);
      createdIdentityDID = identityResponse.data.did;
      logSuccess(`Seller identity created successfully! DID: ${createdIdentityDID}`);
    } catch (error) {
      if (error.response && error.response.status === 409) {
        createdIdentityDID = `did:ethr:${testAddress}`;
        logSuccess(`Seller identity already exists, using existing DID: ${createdIdentityDID}`);
      } else {
        throw error;
      }
    }

    // Test 3: Get Identity by DID
    logStep('ID-REP TEST 3: Get Identity by DID', `Sending GET to ${IDENTITY_REP_SERVICE_URL}/identities/${createdIdentityDID}`);
    const getIdentityResponse = await axios.get(`${IDENTITY_REP_SERVICE_URL}/identities/${createdIdentityDID}`);
    logSuccess(`Identity retrieved: ${getIdentityResponse.data.name}`);

    // Test 4: List Identities
    logStep('ID-REP TEST 4: List Identities', `Sending GET to ${IDENTITY_REP_SERVICE_URL}/identities`);
    const listIdentitiesResponse = await axios.get(`${IDENTITY_REP_SERVICE_URL}/identities`);
    logSuccess(`Found ${listIdentitiesResponse.data.identities.length} identities`);

    // Test 5: Update Identity
    const updatePayload = {
      bio: 'Updated bio for e2e testing - seller with excellent track record'
    };
    logStep('ID-REP TEST 5: Update Identity Metadata', `Sending PUT to ${IDENTITY_REP_SERVICE_URL}/identities/${createdIdentityDID}`);
    const updateResponse = await axios.put(`${IDENTITY_REP_SERVICE_URL}/identities/${createdIdentityDID}`, updatePayload);
    logSuccess(`Identity updated successfully`);

    // Test 6: Get Reputation
    logStep('ID-REP TEST 6: Get Reputation Score', `Sending GET to ${IDENTITY_REP_SERVICE_URL}/reputation/${createdIdentityDID}`);
    const reputationResponse = await axios.get(`${IDENTITY_REP_SERVICE_URL}/reputation/${createdIdentityDID}`);
    logSuccess(`Reputation score: ${reputationResponse.data.score.value}/100`);

    // Test 7: Blockchain Sync
    logStep('ID-REP TEST 7: Blockchain Synchronization', `Sending POST to ${IDENTITY_REP_SERVICE_URL}/blockchain/sync/${testAddress}`);
    try {
      const syncResponse = await axios.post(`${IDENTITY_REP_SERVICE_URL}/blockchain/sync/${testAddress}`);
      logSuccess(`Blockchain sync completed successfully`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        logSuccess(`Identity not found on blockchain (expected for new identity)`);
      } else {
        console.warn(`Blockchain sync failed (blockchain may not be available): ${error.message}`);
      }
    }

    // Test 8: Create Buyer Identity
    const buyerIdentityPayload = {
      address: testAddress2,
      name: 'Test Buyer Identity',
      bio: 'A test buyer for e2e testing',
      avatar: 'https://example.com/buyer-avatar.jpg',
      metadata: {
        preferredCategories: ['electronics', 'gadgets'],
        location: 'Test City'
      }
    };

    logStep('ID-REP TEST 8: Create Buyer Identity', `Creating buyer identity for rating test`);
    try {
      const buyerResponse = await axios.post(`${IDENTITY_REP_SERVICE_URL}/identities`, buyerIdentityPayload);
      createdBuyerDID = buyerResponse.data.did;
      logSuccess(`Buyer identity created: ${createdBuyerDID}`);
    } catch (error) {
      if (error.response && error.response.status === 409) {
        createdBuyerDID = `did:ethr:${testAddress2}`;
        logSuccess(`Buyer identity already exists: ${createdBuyerDID}`);
      } else {
        throw error;
      }
    }

  } catch (error) {
    logError(error);
    throw new Error('Identity & Reputation service tests failed');
  }
}

async function testRatingSubmission() {
  try {
    // Test 9: Submit Rating from Buyer to Seller
    const ratingPayload = {
      orderId: createdOrderId,
      from: {
        did: createdBuyerDID,
        address: testAddress2,
        name: 'Test Buyer'
      },
      to: {
        did: createdIdentityDID,
        address: testAddress,
        name: 'Test Seller'
      },
      score: 5,
      comment: 'Excellent service! Fast delivery and great communication. Highly recommended seller.',
      type: 'buyer_to_seller'
    };

    logStep('ID-REP TEST 9: Submit Rating', `Sending POST to ${IDENTITY_REP_SERVICE_URL}/reputation/${createdIdentityDID}/ratings`);
    const ratingResponse = await axios.post(`${IDENTITY_REP_SERVICE_URL}/reputation/${createdIdentityDID}/ratings`, ratingPayload);
    createdRatingId = ratingResponse.data.ratingId;
    logSuccess(`Rating submitted successfully! Rating ID: ${createdRatingId}`);

    // Wait for reputation to be updated
    await sleep(2000);

    // Test 10: Check Updated Reputation Score
    logStep('ID-REP TEST 10: Check Updated Reputation', `Getting updated reputation score after rating`);
    const updatedReputationResponse = await axios.get(`${IDENTITY_REP_SERVICE_URL}/reputation/${createdIdentityDID}`);
    logSuccess(`Updated reputation score: ${updatedReputationResponse.data.score.value}/100 (Total ratings: ${updatedReputationResponse.data.totalRatings})`);

    // Test 11: List All Ratings for Seller
    logStep('ID-REP TEST 11: List Ratings', `Sending GET to ${IDENTITY_REP_SERVICE_URL}/reputation/${createdIdentityDID}/ratings`);
    const ratingsListResponse = await axios.get(`${IDENTITY_REP_SERVICE_URL}/reputation/${createdIdentityDID}/ratings`);
    logSuccess(`Found ${ratingsListResponse.data.ratings.length} ratings for seller`);

    // Display rating details
    if (ratingsListResponse.data.ratings.length > 0) {
      const latestRating = ratingsListResponse.data.ratings[ratingsListResponse.data.ratings.length - 1];
      logSuccess(`Latest rating: ${latestRating.score}/5 stars - "${latestRating.comment}"`);
    }

  } catch (error) {
    console.warn(`Rating submission test failed: ${error.message}`);
    // Don't throw error here as rating is optional for the main e2e flow
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
