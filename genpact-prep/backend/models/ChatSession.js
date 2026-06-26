const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  date: { type: Date, default: Date.now },
  company: String,
  messages: [{
    role: String,
    text: String,
  }],
  debrief: {
    overallScore: Number,
    communicationClarity: Number,
    technicalDepth: Number,
    confidence: Number,
    strongMoments: [String],
    weakMoments: [String],
    hireSignal: String,
    hireExplanation: String,
    recommendedPractice: [String],
  },
}, { timestamps: true });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
