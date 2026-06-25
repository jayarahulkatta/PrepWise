const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'prepwise',
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    await seedIfEmpty();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('🔄 Attempting to start local in-memory MongoDB as fallback...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      const conn = await mongoose.connect(uri, { dbName: 'prepwise' });
      console.log(`✅ In-memory MongoDB started and connected: ${conn.connection.host}`);
      await seedIfEmpty();
    } catch (memError) {
      console.error('❌ Failed to start in-memory MongoDB:', memError.message);
      console.warn('⚠️ Server is running without database connection. Features like saving profiles will fail.');
    }
  }
};

const seedIfEmpty = async () => {
  try {
    const Question = require('./models/Question');
    const count = await Question.countDocuments();
    if (count === 0) {
      console.log('🔄 Database is empty. Seeding default questions...');
      const { SEED_DATA } = require('./seed');
      const questions = SEED_DATA.map(q => ({ ...q, status: 'approved' }));
      await Question.insertMany(questions);
      console.log(`✅ Auto-seeded ${questions.length} questions successfully.`);
    } else {
      console.log(`ℹ️ Database already contains ${count} questions. Skipping auto-seed.`);
    }
  } catch (err) {
    console.error('⚠️ Failed to auto-seed database:', err);
  }
};

module.exports = connectDB;

