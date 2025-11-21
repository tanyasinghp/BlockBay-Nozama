// src/config/database.js
const mongoose = require('mongoose');

module.exports = async function connectMongo(uri) {
  if (!uri) throw new Error('MongoDB URI not provided');
  mongoose.set('strictQuery', false);
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('MongoDB connected');
  return mongoose;
};
