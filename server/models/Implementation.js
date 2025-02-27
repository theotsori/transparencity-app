// server/models/Implementation.js
const mongoose = require('mongoose');

const ImplementationSchema = new mongoose.Schema({
  proposal: {
    type: mongoose.Schema.ObjectId,
    ref: 'Proposal',
    required: true
  },
  status: {
    type: String,
    enum: ['planning', 'in_progress', 'delayed', 'completed', 'cancelled'],
    default: 'planning'
  },
  startDate: {
    type: Date
  },
  targetCompletionDate: {
    type: Date
  },
  actualCompletionDate: {
    type: Date
  },
  budget: {
    allocated: {
      type: Number
    },
    spent: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  implementationLead: {
    name: String,
    department: String,
    contactInfo: String
  },
  progressUpdates: [
    {
      date: {
        type: Date,
        default: Date.now
      },
      update: String,
      updatedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    }
  ],
  completionSummary: String,
  blockedBy: [String],
  riskFactors: [String],
  stakeholders: [String],
  documents: [
    {
      title: String,
      fileUrl: String,
      fileType: String,
      uploadDate: {
        type: Date,
        default: Date.now
      }
    }
  ],
  blockchainProofs: [
    {
      milestone: String,
      transactionHash: String,
      timestamp: Date
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create one implementation per proposal
ImplementationSchema.index({ proposal: 1 }, { unique: true });

// Update timestamp
ImplementationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Implementation', ImplementationSchema);
