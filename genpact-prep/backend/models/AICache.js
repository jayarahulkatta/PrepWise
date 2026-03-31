const mongoose = require('mongoose');

const aiCacheSchema = new mongoose.Schema({
  questionHash: { type: String, required: true, unique: true, index: true },
  questionText: { type: String, required: true },
  type: { type: String, default: 'Technical' },
  company: { type: String, default: 'Genpact' },
  role: { type: String, default: '' },
  answer: { type: String, required: true },
  provider: { type: String, default: 'gemini' }, // gemini, groq, or local
  createdAt: { type: Date, default: Date.now, expires: 604800 }, // Auto-delete after 7 days
});

module.exports = mongoose.model('AICache', aiCacheSchema);
