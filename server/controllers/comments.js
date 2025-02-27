// server/controllers/comments.js
const Comment = require('../models/Comment');
const Proposal = require('../models/Proposal');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get comments for a proposal
// @route   GET /api/v1/proposals/:proposalId/comments
// @access  Public
exports.getComments = asyncHandler(async (req, res, next) => {
  // Only get top-level comments (those without a parentComment)
  const comments = await Comment.find({
    proposal: req.params.proposalId,
    parentComment: null
  })
    .populate({
      path: 'user',
      select: 'fullName profilePicture'
    })
    .populate({
      path: 'replies',
      populate: {
        path: 'user',
        select: 'fullName profilePicture'
      }
    })
    .sort('-createdAt');
  
  res.status(200).json({
    success: true,
    count: comments.length,
    data: comments
  });
});

// @desc    Add comment to proposal
// @route   POST /api/v1/proposals/:proposalId/comments
// @access  Private
exports.addComment = asyncHandler(async (req, res, next) => {
  // Add user and proposal to req.body
  req.body.user = req.user.id;
  req.body.proposal = req.params.proposalId;

  const proposal = await Proposal.findById(req.params.proposalId);

  if (!proposal) {
    return next(
      new ErrorResponse(`No proposal with the id of ${req.params.proposalId}`, 404)
    );
  }

  const comment = await Comment.create(req.body);

  // Populate the user data for the response
  await comment.populate({
    path: 'user',
    select: 'fullName profilePicture'
  }).execPopulate();

  res.status(201).json({
    success: true,
    data: comment
  });
});

// @desc    Update comment
// @route   PUT /api/v1/comments/:id
// @access  Private
exports.updateComment = asyncHandler(async (req, res, next) => {
  let comment = await Comment.findById(req.params.id);

  if (!comment) {
    return next(
      new ErrorResponse(`No comment with the id of ${req.params.id}`, 404)
    );
  }

  // Make sure comment belongs to user
  if (comment.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User ${req.user.id} is not authorized to update this comment`, 401)
    );
  }

  // Mark as edited if the text is being changed
  if (req.body.text && req.body.text !== comment.text) {
    req.body.isEdited = true;
  }

  comment = await Comment.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate({
    path: 'user',
    select: 'fullName profilePicture'
  });

  res.status(200).json({
    success: true,
    data: comment
  });
});

// @desc    Delete comment
// @route   DELETE /api/v1/comments/:id
// @access  Private
exports.deleteComment = asyncHandler(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    return next(
      new ErrorResponse(`No comment with the id of ${req.params.id}`, 404)
    );
  }

  // Make sure comment belongs to user
  if (comment.user.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`User ${req.user.id} is not authorized to delete this comment`, 401)
    );
  }

  await comment.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Like a comment
// @route   PUT /api/v1/comments/:id/like
// @access  Private
exports.likeComment = asyncHandler(async (req, res, next) => {
  let comment = await Comment.findById(req.params.id);

  if (!comment) {
    return next(
      new ErrorResponse(`No comment with the id of ${req.params.id}`, 404)
    );
  }

  // Check if user already liked this comment
  const alreadyLiked = comment.likedBy.includes(req.user.id);

  if (alreadyLiked) {
    // Unlike the comment
    comment = await Comment.findByIdAndUpdate(
      req.params.id,
      {
        $pull: { likedBy: req.user.id },
        $inc: { likes: -1 }
      },
      { new: true }
    ).populate({
      path: 'user',
      select: 'fullName profilePicture'
    });
  } else {
    // Like the comment
    comment = await Comment.findByIdAndUpdate(
      req.params.id,
      {
        $addToSet: { likedBy: req.user.id },
        $inc: { likes: 1 }
      },
      { new: true }
    ).populate({
      path: 'user',
      select: 'fullName profilePicture'
    });
  }

  res.status(200).json({
    success: true,
    data: comment
  });
});