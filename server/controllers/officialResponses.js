// server/controllers/officialResponses.js
const OfficialResponse = require('../models/OfficialResponse');
const Proposal = require('../models/Proposal');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const blockchainService = require('../services/blockchainService');

// @desc    Create official response to a proposal
// @route   POST /api/v1/proposals/:proposalId/official-response
// @access  Private (Government Officials)
exports.createOfficialResponse = asyncHandler(async (req, res, next) => {
  const { proposalId } = req.params;

  // Check if proposal exists
  const proposal = await Proposal.findById(proposalId);
  if (!proposal) {
    return next(new ErrorResponse(`No proposal found with id ${proposalId}`, 404));
  }

  // Check if user is authorized (government official)
  if (!req.user.isGovernmentOfficial) {
    return next(new ErrorResponse('Not authorized to provide official responses', 403));
  }

  // Check if a response already exists
  const existingResponse = await OfficialResponse.findOne({ proposal: proposalId });
  if (existingResponse) {
    return next(new ErrorResponse('An official response already exists for this proposal', 400));
  }

  // Create the response
  const responseData = {
    ...req.body,
    proposal: proposalId,
    respondent: req.user.id
  };

  // If blockchain verification is enabled, add proof
  if (req.body.isVerified) {
    const verificationData = {
      proposalId,
      responseStatus: req.body.status,
      respondentId: req.user.id,
      timestamp: Date.now()
    };
    
    try {
      const proof = await blockchainService.createVerificationProof(verificationData);
      responseData.verificationProof = proof.transactionHash;
    } catch (error) {
      return next(new ErrorResponse('Blockchain verification failed', 500));
    }
  }

  const officialResponse = await OfficialResponse.create(responseData);

  // Update proposal status based on the response
  await Proposal.findByIdAndUpdate(proposalId, {
    status: req.body.status === 'approved' ? 'approved' : 
            req.body.status === 'rejected' ? 'rejected' : 
            req.body.status === 'partially_approved' ? 'partially_approved' : 'under_review'
  });

  res.status(201).json({
    success: true,
    data: officialResponse
  });
});

// @desc    Get official response for a proposal
// @route   GET /api/v1/proposals/:proposalId/official-response
// @access  Public
exports.getOfficialResponse = asyncHandler(async (req, res, next) => {
  const { proposalId } = req.params;

  const response = await OfficialResponse.findOne({ proposal: proposalId })
    .populate({
      path: 'respondent',
      select: 'fullName position department profilePicture'
    });

  if (!response) {
    return next(new ErrorResponse('No official response found for this proposal', 404));
  }

  res.status(200).json({
    success: true,
    data: response
  });
});

// @desc    Update official response
// @route   PUT /api/v1/official-responses/:id
// @access  Private (Government Officials)
exports.updateOfficialResponse = asyncHandler(async (req, res, next) => {
  let response = await OfficialResponse.findById(req.params.id);

  if (!response) {
    return next(new ErrorResponse(`No response found with id ${req.params.id}`, 404));
  }

  // Make sure user is response owner or admin
  if (response.respondent.toString() !== req.user.id && !req.user.isAdmin) {
    return next(new ErrorResponse('Not authorized to update this response', 403));
  }

  // If status is changing and verification is requested, add new proof
  if (req.body.status && req.body.status !== response.status && req.body.isVerified) {
    const verificationData = {
      proposalId: response.proposal,
      responseStatus: req.body.status,
      respondentId: req.user.id,
      timestamp: Date.now()
    };
    
    try {
      const proof = await blockchainService.createVerificationProof(verificationData);
      req.body.verificationProof = proof.transactionHash;
    } catch (error) {
      return next(new ErrorResponse('Blockchain verification failed', 500));
    }
  }

  response = await OfficialResponse.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  // If status changed, update the proposal status as well
  if (req.body.status && req.body.status !== response.status) {
    await Proposal.findByIdAndUpdate(response.proposal, {
      status: req.body.status === 'approved' ? 'approved' : 
              req.body.status === 'rejected' ? 'rejected' : 
              req.body.status === 'partially_approved' ? 'partially_approved' : 'under_review'
    });
  }

  res.status(200).json({
    success: true,
    data: response
  });
});