// server/controllers/implementation.js
const Implementation = require('../models/Implementation');
const Milestone = require('../models/Milestone');
const Proposal = require('../models/Proposal');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const blockchainService = require('../services/blockchainService');

// @desc    Create implementation plan for approved proposal
// @route   POST /api/v1/proposals/:proposalId/implementation
// @access  Private (Government Officials)
exports.createImplementation = asyncHandler(async (req, res, next) => {
  const { proposalId } = req.params;

  // Check if proposal exists
  const proposal = await Proposal.findById(proposalId);
  if (!proposal) {
    return next(new ErrorResponse(`No proposal found with id ${proposalId}`, 404));
  }

  // Check if proposal is approved
  if (proposal.status !== 'approved' && proposal.status !== 'partially_approved') {
    return next(new ErrorResponse('Cannot create implementation for non-approved proposal', 400));
  }

  // Check if implementation already exists
  const existingImplementation = await Implementation.findOne({ proposal: proposalId });
  if (existingImplementation) {
    return next(new ErrorResponse('Implementation plan already exists for this proposal', 400));
  }

  // Create implementation
  const implementation = await Implementation.create({
    ...req.body,
    proposal: proposalId
  });

  // If milestones are provided, create them
  if (req.body.milestones && Array.isArray(req.body.milestones)) {
    const milestonePromises = req.body.milestones.map(async (milestone, index) => {
      return Milestone.create({
        ...milestone,
        implementation: implementation._id,
        order: index + 1
      });
    });

    await Promise.all(milestonePromises);
  }

  // Add blockchain proof if requested
  if (req.body.addBlockchainProof) {
    try {
      const proofData = {
        proposalId,
        implementationId: implementation._id,
        status: 'planning',
        timestamp: Date.now()
      };
      
      const proof = await blockchainService.createImplementationProof(proofData);
      
      // Add the proof to the implementation record
      await Implementation.findByIdAndUpdate(implementation._id, {
        $push: {
          blockchainProofs: {
            milestone: 'Implementation Created',
            transactionHash: proof.transactionHash,
            timestamp: new Date()
          }
        }
      });
    } catch (error) {
      console.error('Blockchain proof creation failed:', error);
      // Continue without blockchain proof
    }
  }

  res.status(201).json({
    success: true,
    data: implementation
  });
});

// @desc    Update implementation status
// @route   PUT /api/v1/implementations/:id
// @access  Private (Government Officials)
exports.updateImplementation = asyncHandler(async (req, res, next) => {
  let implementation = await Implementation.findById(req.params.id);

  if (!implementation) {
    return next(new ErrorResponse(`No implementation found with id ${req.params.id}`, 404));
  }

  // Check if user is authorized
  if (!req.user.isGovernmentOfficial) {
    return next(new ErrorResponse('Not authorized to update implementation', 403));
  }

  // If a status update is included and it changes
  if (req.body.status && req.body.status !== implementation.status) {
    // Add a progress update
    if (!req.body.progressUpdates) {
      req.body.progressUpdates = [];
    }
    
    req.body.progressUpdates.unshift({
      date: new Date(),
      update: `Status changed from ${implementation.status} to ${req.body.status}`,
      updatedBy: req.user.id
    });

    // Add blockchain proof for major status changes
    if (req.body.status === 'completed' || req.body.status === 'cancelled') {
      try {
        const proofData = {
          proposalId: implementation.proposal,
          implementationId: implementation._id,
          status: req.body.status,
          timestamp: Date.now()
        };
        
        const proof = await blockchainService.createImplementationProof(proofData);
        
        // Add the proof to the implementation record
        if (!req.body.blockchainProofs) {
          req.body.blockchainProofs = implementation.blockchainProofs || [];
        }
        
        req.body.blockchainProofs.push({
          milestone: `Implementation ${req.body.status.charAt(0).toUpperCase() + req.body.status.slice(1)}`,
          transactionHash: proof.transactionHash,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Blockchain proof creation failed:', error);
        // Continue without blockchain proof
      }
    }
  }

  implementation = await Implementation.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: implementation
  });
});

// @desc    Add progress update
// @route   POST /api/v1/implementations/:id/progress
// @access  Private (Government Officials)
exports.addProgressUpdate = asyncHandler(async (req, res, next) => {
    const { update } = req.body;
  
    // Validate update message
    if (!update) {
      return next(new ErrorResponse('Please provide an update message', 400));
    }
  
    // Find the implementation
    let implementation = await Implementation.findById(req.params.id);
    if (!implementation) {
      return next(new ErrorResponse(`No implementation found with id ${req.params.id}`, 404));
    }
  
    // Check if user is authorized (assumes req.user is set by auth middleware)
    if (!req.user.isGovernmentOfficial) {
      return next(new ErrorResponse('Not authorized to update implementation', 403));
    }
  
    // Create new progress update
    const newUpdate = {
      date: new Date(),
      update,
      updatedBy: req.user.id
    };
  
    // Add to progressUpdates array
    implementation.progressUpdates.push(newUpdate);
  
    // Save the updated implementation
    await implementation.save();
  
    // Return response
    res.status(200).json({
      success: true,
      data: implementation
    });
});