const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  displayName: { type: String, default: '' },
  photoURL: { type: String, default: '' },
  role: { type: String, default: 'user', enum: ['user', 'admin'] },
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  mockScores: [{
    date: { type: Date, default: Date.now },
    company: String,
    role: String,
    completeness: Number,
    clarity: Number,
    relevance: Number,
    questionsCount: Number,
  }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
