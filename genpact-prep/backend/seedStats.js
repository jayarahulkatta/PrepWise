const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const Question = require('./models/Question');
const connectDB = require('./db');

async function seedStats() {
  await connectDB();
  const questions = await Question.find({});
  console.log(`Found ${questions.length} questions`);
  
  for (const q of questions) {
    if (!q.attempts || q.attempts === 0) {
      q.attempts = Math.floor(q.upvotes * 12) + Math.floor(Math.random() * 50) + 10;
      q.avgScore = Math.floor(Math.random() * 30) + 45; // 45% - 75%
      await q.save();
    }
  }
  console.log("Stats seeded successfully!");
  process.exit();
}
seedStats();
