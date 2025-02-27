// server/models/Vote.js
const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
  proposal: {
    type: mongoose.Schema.ObjectId,
    ref: 'Proposal',
    required: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  vote: {
    type: String,
    enum: ['yes', 'no', 'abstain'],
    required: true
  },
  reason: {
    type: String,
    maxlength: [500, 'Reason cannot be more than 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent user from submitting more than one vote per proposal
VoteSchema.index({ proposal: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Vote', VoteSchema);
