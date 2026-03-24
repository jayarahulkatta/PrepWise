const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  company: { type: String, required: true, index: true },
  job: { type: String, required: true },
  type: { type: String, required: true, enum: ['Technical', 'HR', 'Background', 'Behavioral'] },
  diff: { type: String, required: true, enum: ['Easy', 'Medium', 'Hard'] },
  exp: { type: String, required: true },
  text: { type: String, required: true },
  date: { type: String, required: true },
  status: { type: String, default: 'approved', enum: ['approved', 'pending', 'rejected'] },
  submittedBy: { type: String, default: null }, // Firebase UID
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  votedBy: {
    up: [{ type: String }],   // Firebase UIDs
    down: [{ type: String }],
  },
}, { timestamps: true });

questionSchema.index({ company: 1, status: 1 });
questionSchema.index({ text: 'text' });

module.exports = mongoose.model('Question', questionSchema);
