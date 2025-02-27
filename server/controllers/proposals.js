// server/controllers/proposals.js
const Proposal = require('../models/Proposal');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Create new proposal
// @route   POST /api/v1/proposals
// @access  Private
exports.createProposal = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.author = req.user.id;

  const proposal = await Proposal.create(req.body);

  res.status(201).json({
    success: true,
    data: proposal
  });
});

// @desc    Get all proposals
// @route   GET /api/v1/proposals
// @access  Public
exports.getProposals = asyncHandler(async (req, res, next) => {
  let query;

  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  query = Proposal.find(JSON.parse(queryStr)).populate({
    path: 'author',
    select: 'fullName profilePicture'
  });

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Proposal.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const proposals = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: proposals.length,
    pagination,
    data: proposals
  });
});

// @desc    Get single proposal
// @route   GET /api/v1/proposals/:id
// @access  Public
exports.getProposal = asyncHandler(async (req, res, next) => {
  const proposal = await Proposal.findById(req.params.id).populate({
    path: 'author',
    select: 'fullName profilePicture'
  });

  if (!proposal) {
    return next(
      new ErrorResponse(`Proposal not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: proposal
  });
});