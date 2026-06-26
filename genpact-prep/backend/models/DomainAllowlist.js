const mongoose = require('mongoose');

const domainAllowlistSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  addedBy: { type: String },
  addedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('DomainAllowlist', domainAllowlistSchema);
