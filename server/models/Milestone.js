// server/models/Milestone.js
const mongoose = require('mongoose');

const MilestoneSchema = new mongoose.Schema({
  implementation: {
    type: mongoose.Schema.ObjectId,
    ref: 'Implementation',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please add a milestone title'],
    trim: true
  },
  description: String,
  targetDate: {
    type: Date,
    required: [true, 'Please add a target date']
  },
  completionDate: Date,
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'delayed', 'blocked'],
    default: 'pending'
  },
  completionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  assignedTo: [
    {
      name: String,
      department: String
    }
  ],
  verificationMethod: String,
  verificationProof: {
    type: String, // Blockchain transaction hash
    default: null
  },
  dependencies: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Milestone'
    }
  ],
  notes: [
    {
      date: {
        type: Date,
        default: Date.now
      },
      content: String,
      author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    }
  ],
  order: {
    type: Number,
    required: true
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

// Update timestamp
MilestoneSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Milestone', MilestoneSchema);
