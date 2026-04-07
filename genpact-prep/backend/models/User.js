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
}, { _id: true });

const chatSessionSchema = new mongoose.Schema({
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
}, { _id: true });

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  displayName: { type: String, default: '' },
  photoURL: { type: String, default: '' },
  role: {
    type: String,
    default: 'normal',
    enum: ['normal', 'domain', 'admin'],
  },
  onboardingComplete: { type: Boolean, default: false },

  // Normal User profile
  prepProfile: {
    targetCompany: { type: String, default: 'Genpact' },
    targetRole: { type: String, default: '' },
    interviewDate: { type: Date, default: null },
    experienceLevel: { type: String, default: 'Fresher' },
    focusAreas: [{ type: String }],
    weakAreas: [{ type: String }],
  },

  // Domain User profile
  domainProfile: {
    company: { type: String, default: '' },
    roleArea: { type: String, default: '' },
    yearsExperience: { type: Number, default: 0 },
    specializations: [{ type: String }],
    questionsSubmitted: { type: Number, default: 0 },
    questionsApproved: { type: Number, default: 0 },
    contributorScore: { type: Number, default: 0 },
  },

  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  mockSessions: [mockSessionSchema],
  chatSessions: [chatSessionSchema],
  
  // Aggregate stats computed from sessions
  readinessScore: { type: Number, default: 0 },
  totalPracticeSessions: { type: Number, default: 0 },
  streakDays: { type: Number, default: 0 },
  lastPracticeDate: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
