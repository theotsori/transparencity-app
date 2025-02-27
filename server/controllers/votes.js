// server/controllers/votes.js
const Vote = require('../models/Vote');
const Proposal = require('../models/Proposal');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Submit a vote
// @route   POST /api/v1/proposals/:proposalId/votes
// @access  Private
exports.addVote = asyncHandler(async (req, res, next) => {
  req.body.proposal = req.params.proposalId;
  req.body.user = req.user.id;

  // Check if proposal exists
  const proposal = await Proposal.findById(req.params.proposalId);

  if (!proposal) {
    return next(
      new ErrorResponse(`No proposal with the id of ${req.params.proposalId}`, 404)
    );
  }

  // Check if proposal is in voting stage
  if (proposal.status !== 'voting') {
    return next(
      new ErrorResponse(`Proposal is not currently open for voting`, 400)
    );
  }

  // Check if vote already exists
  const existingVote = await Vote.findOne({
    user: req.user.id,
    proposal: req.params.proposalId
  });

  if (existingVote) {
    return next(
      new ErrorResponse(`You have already voted on this proposal`, 400)
    );
  }

  // Submit the vote
  const vote = await Vote.create(req.body);

  // Update the proposal vote count
  proposal.voteCount[req.body.vote] += 1;
  await proposal.save();

  res.status(201).json({
    success: true,
    data: vote
  });
});

// @desc    Get votes for a proposal
// @route   GET /api/v1/proposals/:proposalId/votes
// @access  Public
exports.getVotes = asyncHandler(async (req, res, next) => {
  const proposal = await Proposal.findById(req.params.proposalId);

  if (!proposal) {
    return next(
      new ErrorResponse(`No proposal with the id of ${req.params.proposalId}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: {
      yes: proposal.voteCount.yes,
      no: proposal.voteCount.no,
      abstain: proposal.voteCount.abstain,
      total: proposal.voteCount.yes + proposal.voteCount.no + proposal.voteCount.abstain
    }
  });
});

// @desc    Get user's vote on a proposal
// @route   GET /api/v1/proposals/:proposalId/votes/me
// @access  Private
exports.getUserVote = asyncHandler(async (req, res, next) => {
  const vote = await Vote.findOne({
    user: req.user.id,
    proposal: req.params.proposalId
  });

  if (!vote) {
    return res.status(200).json({
      success: true,
      data: null
    });
  }

  res.status(200).json({
    success: true,
    data: vote
  });
});

// @desc    Update vote
// @route   PUT /api/v1/votes/:id
// @access  Private
exports.updateVote = asyncHandler(async (req, res, next) => {
  let vote = await Vote.findById(req.params.id);

  if (!vote) {
    return next(
      new ErrorResponse(`No vote with the id of ${req.params.id}`, 404)
    );
  }

  // Make sure vote belongs to user
  if (vote.user.toString() !== req.user.id) {
    return next(new ErrorResponse(`Not authorized to update this vote`, 401));
  }

  // Get the proposal
  const proposal = await Proposal.findById(vote.proposal);

  // Check if proposal is still in voting stage
  if (proposal.status !== 'voting') {
    return next(
      new ErrorResponse(`Voting period has ended for this proposal`, 400)
    );
  }

  // Update the proposal vote count (decrement old vote type, increment new vote type)
  proposal.voteCount[vote.vote] -= 1;
  proposal.voteCount[req.body.vote] += 1;
  await proposal.save();

  // Update vote
  vote = await Vote.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: vote
  });
});