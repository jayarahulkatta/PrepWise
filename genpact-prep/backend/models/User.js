const mongoose = require('mongoose');

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
    resumeText: { type: String, default: '' },
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
  
  // Note: mockSessions and chatSessions have been moved to separate collections
  // to avoid hitting the 16MB MongoDB document limit.
  
  // Aggregate stats computed from sessions
  readinessScore: { type: Number, default: 0 },
  totalPracticeSessions: { type: Number, default: 0 },
  streakDays: { type: Number, default: 0 },
  lastPracticeDate: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
