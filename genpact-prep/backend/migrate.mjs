import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'prepwise' });
  const Question = mongoose.model('Question', new mongoose.Schema({
    company: String, job: String, type: String, diff: String, exp: String,
    text: String, date: String, status: String, isCoding: Boolean, topic: String, upvotes: Number
  }, { strict: false }));

  // Read raw text
  const file = fs.readFileSync('../src/utils/csSubjectsData.js', 'utf8');
  
  // Nasty eval to pull out JAVA_DSA specifically
  const match = file.match(/JAVA_DSA:\s*\[([\s\S]*?)\]\s*,?\s*};/m);
  if (!match) {
    console.log("NOT FOUND"); 
    process.exit(1);
  }
  
  const arrayString = '[' + match[1] + ']';
  const arr = eval(arrayString);
  
  // Process the objects
  const docs = arr.map(q => ({
    company: "Genpact", // Default for DB
    job: q.topic,       // Storing sub-topic in 'job' mapping
    type: "Java & DSA", 
    diff: q.diff || "Medium",
    exp: "Fresher",
    text: q.text,
    date: q.date || new Date().toISOString(),
    status: "approved",
    isCoding: true,
    upvotes: q.upvotes || 0,
    topic: q.topic
  }));

  await Question.insertMany(docs);
  console.log(`Inserted ${docs.length} Java & DSA questions!`);
  
  process.exit(0);
}

migrate();
