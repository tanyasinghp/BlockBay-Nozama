// MongoDB initialization script
db = db.getSiblingDB('nozama-identity');

// Create collections with indexes
db.createCollection('identities');
db.identities.createIndex({ "did": 1 }, { unique: true });
db.identities.createIndex({ "address": 1 }, { unique: true });
db.identities.createIndex({ "email": 1 }, { sparse: true });

db.createCollection('ratings');
db.ratings.createIndex({ "raterDid": 1, "rateeDid": 1 }, { unique: true });
db.ratings.createIndex({ "rateeDid": 1 });
db.ratings.createIndex({ "transactionId": 1 });

db.createCollection('reputations');
db.reputations.createIndex({ "did": 1 }, { unique: true });
db.reputations.createIndex({ "score": -1 });

print('MongoDB initialized for Nozama Identity & Reputation service');