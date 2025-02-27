// server/models/OfficialResponse.js
const mongoose = require('mongoose');

const OfficialResponseSchema = new mongoose.Schema({
  proposal: {
    type: mongoose.Schema.ObjectId,
    ref: 'Proposal',
    required: true
  },
  respondent: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['under_review', 'approved', 'rejected', 'partially_approved', 'deferred'],
    required: true
  },
  response: {
    type: String,
    required: [true, 'Please provide a response'],
    maxlength: [10000, 'Response cannot be more than 10000 characters']
  },
  rationale: {
    type: String,
    maxlength: [5000, 'Rationale cannot be more than 5000 characters']
  },
  nextSteps: {
    type: String,
    maxlength: [5000, 'Next steps cannot be more than 5000 characters']
  },
  attachments: [
    {
      title: String,
      fileUrl: String,
      fileType: String
    }
  ],
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationProof: {
    type: String  // Blockchain transaction hash for verification
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create one official response per proposal
OfficialResponseSchema.index({ proposal: 1 }, { unique: true });

// Update the updatedAt field on save
OfficialResponseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('OfficialResponse', OfficialResponseSchema);
