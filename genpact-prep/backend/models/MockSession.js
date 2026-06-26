const mongoose = require('mongoose');

const mockScoreDetailSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  questionText: String,
  technicalAccuracy: { type: Number, default: 0 },
  communicationClarity: { type: Number, default: 0 },
  structureOrganization: { type: Number, default: 0 },
  depthOfExamples: { type: Number, default: 0 },
  roleRelevance: { type: Number, default: 0 },
  overallImpression: { type: Number, default: 0 },
  feedback: String,
  strengths: [String],
  improvements: [{
    area: String,
    issue: String,
    suggestion: String,
  }],
  skipped: { type: Boolean, default: false },
}, { _id: false });

const mockSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  date: { type: Date, default: Date.now },
  company: String,
  role: String,
  questionCount: Number,
  questionsAttempted: Number,
  questionsSkipped: Number,
  sessionDurationSec: Number,
  scores: [mockScoreDetailSchema],
  averages: {
    technicalAccuracy: Number,
    communicationClarity: Number,
    structureOrganization: Number,
    depthOfExamples: Number,
    roleRelevance: Number,
    overallImpression: Number,
  },
  readinessScore: Number,  // weighted composite 0-100
}, { timestamps: true });

module.exports = mongoose.model('MockSession', mockSessionSchema);
