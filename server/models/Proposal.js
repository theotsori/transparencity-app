// server/models/Proposal.js
const mongoose = require('mongoose');

const ProposalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [5000, 'Description cannot be more than 5000 characters']
  },
  category: {
    type: String,
    required: [true, 'Please select a category'],
    enum: [
      'Environment',
      'Infrastructure',
      'Education',
      'Healthcare',
      'Public Safety',
      'Economy',
      'Housing',
      'Transportation',
      'Culture',
      'Other'
    ]
  },
  location: {
    city: String,
    region: String,
    country: String
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'voting', 'approved', 'rejected', 'implemented'],
    default: 'submitted'
  },
  documents: [
    {
      title: String,
      fileUrl: String,
      fileType: String
    }
  ],
  voteCount: {
    yes: {
      type: Number,
      default: 0
    },
    no: {
      type: Number,
      default: 0
    },
    abstain: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  votingDeadline: Date,
  implementationDeadline: Date
});

// Create slug from the title
ProposalSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Proposal', ProposalSchema);
