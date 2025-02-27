// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title TransparenCity Governance
 * @dev Smart contract for creating, tracking, and voting on civic proposals
 */
contract TransparenCityGovernance {
    // ======== State Variables ========
    address public admin;
    uint256 public proposalCount;
    uint256 public constant VOTING_PERIOD = 7 days;
    
    enum ProposalStatus { Active, Passed, Rejected, Implemented }
    
    struct Proposal {
        uint256 id;
        string title;
        string description;
        string ipfsDocHash;       // IPFS hash for supporting documents
        uint256 creationTime;
        uint256 votingEndTime;
        address proposer;
        uint256 yesVotes;
        uint256 noVotes;
        ProposalStatus status;
        string implementationDetails; // Added by govt once implemented
        mapping(address => bool) hasVoted;
    }
    
    struct AuditRecord {
        address user;
        uint256 proposalId;
        string action;
        uint256 timestamp;
    }
    
    // Proposal ID => Proposal
    mapping(uint256 => Proposal) public proposals;
    
    // User address => verified status
    mapping(address => bool) public verifiedVoters;
    
    // Array of audit records for transparency
    AuditRecord[] public auditTrail;
    
    // ======== Events ========
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support);
    event ProposalStatusChanged(uint256 indexed proposalId, ProposalStatus status);
    event VoterVerified(address indexed voter);
    event AuditRecorded(uint256 indexed proposalId, address indexed user, string action);
    
    // ======== Modifiers ========
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyVerifiedVoter() {
        require(verifiedVoters[msg.sender], "Only verified voters can perform this action");
        _;
    }
    
    // ======== Constructor ========
    constructor() {
        admin = msg.sender;
        proposalCount = 0;
    }
    
    // ======== Admin Functions ========
    /**
     * @dev Verify a voter (would be done after off-chain ID verification)
     * @param _voter Address of the voter to verify
     */
    function verifyVoter(address _voter) external onlyAdmin {
        verifiedVoters[_voter] = true;
        emit VoterVerified(_voter);
        
        // Add audit record
        recordAudit(_voter, 0, "VOTER_VERIFIED");
    }
    
    /**
     * @dev Update proposal status (e.g., mark as implemented)
     * @param _proposalId ID of the proposal
     * @param _newStatus New status to set
     * @param _implementationDetails Optional details about implementation
     */
    function updateProposalStatus(
        uint256 _proposalId, 
        ProposalStatus _newStatus,
        string calldata _implementationDetails
    ) external onlyAdmin {
        require(_proposalId <= proposalCount && _proposalId > 0, "Invalid proposal ID");
        
        proposals[_proposalId].status = _newStatus;
        
        if (_newStatus == ProposalStatus.Implemented) {
            proposals[_proposalId].implementationDetails = _implementationDetails;
        }
        
        emit ProposalStatusChanged(_proposalId, _newStatus);
        
        // Add audit record
        recordAudit(msg.sender, _proposalId, "STATUS_UPDATED");
    }
    
    // ======== Proposal Functions ========
    /**
     * @dev Create a new proposal
     * @param _title Title of the proposal
     * @param _description Description of the proposal
     * @param _ipfsDocHash IPFS hash of supporting documents
     */
    function createProposal(
        string calldata _title,
        string calldata _description,
        string calldata _ipfsDocHash
    ) external onlyVerifiedVoter {
        proposalCount++;
        
        Proposal storage newProposal = proposals[proposalCount];
        newProposal.id = proposalCount;
        newProposal.title = _title;
        newProposal.description = _description;
        newProposal.ipfsDocHash = _ipfsDocHash;
        newProposal.creationTime = block.timestamp;
        newProposal.votingEndTime = block.timestamp + VOTING_PERIOD;
        newProposal.proposer = msg.sender;
        newProposal.status = ProposalStatus.Active;
        
        emit ProposalCreated(proposalCount, msg.sender, _title);
        
        // Add audit record
        recordAudit(msg.sender, proposalCount, "PROPOSAL_CREATED");
    }
    
    /**
     * @dev Cast a vote on a proposal
     * @param _proposalId ID of the proposal
     * @param _support Whether the voter supports the proposal
     */
    function castVote(uint256 _proposalId, bool _support) external onlyVerifiedVoter {
        require(_proposalId <= proposalCount && _proposalId > 0, "Invalid proposal ID");
        
        Proposal storage proposal = proposals[_proposalId];
        
        require(block.timestamp < proposal.votingEndTime, "Voting period has ended");
        require(proposal.status == ProposalStatus.Active, "Proposal is not active");
        require(!proposal.hasVoted[msg.sender], "Already voted on this proposal");
        
        proposal.hasVoted[msg.sender] = true;
        
        if (_support) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }
        
        emit VoteCast(_proposalId, msg.sender, _support);
        
        // Add audit record
        recordAudit(msg.sender, _proposalId, _support ? "VOTE_YES" : "VOTE_NO");
        
        // Automatically check if voting period is over and update status
        checkProposalStatus(_proposalId);
    }
    
    /**
     * @dev Check and update proposal status if voting period is over
     * @param _proposalId ID of the proposal
     */
    function checkProposalStatus(uint256 _proposalId) public {
        Proposal storage proposal = proposals[_proposalId];
        
        if (proposal.status == ProposalStatus.Active && block.timestamp >= proposal.votingEndTime) {
            if (proposal.yesVotes > proposal.noVotes) {
                proposal.status = ProposalStatus.Passed;
            } else {
                proposal.status = ProposalStatus.Rejected;
            }
            
            emit ProposalStatusChanged(_proposalId, proposal.status);
            
            // Add audit record
            recordAudit(address(this), _proposalId, "STATUS_UPDATED_AUTO");
        }
    }
    
    // ======== Audit Trail Functions ========
    /**
     * @dev Record an action in the audit trail
     * @param _user Address performing the action
     * @param _proposalId ID of the relevant proposal (0 for non-proposal actions)
     * @param _action Description of the action
     */
    function recordAudit(address _user, uint256 _proposalId, string memory _action) internal {
        auditTrail.push(AuditRecord({
            user: _user,
            proposalId: _proposalId,
            action: _action,
            timestamp: block.timestamp
        }));
        
        emit AuditRecorded(_proposalId, _user, _action);
    }
    
    /**
     * @dev Get the number of audit records
     * @return The count of audit records
     */
    function getAuditTrailLength() external view returns (uint256) {
        return auditTrail.length;
    }
    
    // ======== View Functions ========
    /**
     * @dev Get basic proposal information
     * @param _proposalId ID of the proposal
     * @return Basic information about the proposal
     */
    function getProposalBasicInfo(uint256 _proposalId) external view returns (
        string memory title,
        string memory description,
        string memory ipfsDocHash,
        uint256 creationTime,
        uint256 votingEndTime,
        address proposer,
        uint256 yesVotes,
        uint256 noVotes,
        ProposalStatus status
    ) {
        require(_proposalId <= proposalCount && _proposalId > 0, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        
        return (
            proposal.title,
            proposal.description,
            proposal.ipfsDocHash,
            proposal.creationTime,
            proposal.votingEndTime,
            proposal.proposer,
            proposal.yesVotes,
            proposal.noVotes,
            proposal.status
        );
    }
    
    /**
     * @dev Check if a voter has voted on a specific proposal
     * @param _proposalId ID of the proposal
     * @param _voter Address of the voter
     * @return Whether the voter has voted
     */
    function hasVoted(uint256 _proposalId, address _voter) external view returns (bool) {
        require(_proposalId <= proposalCount && _proposalId > 0, "Invalid proposal ID");
        return proposals[_proposalId].hasVoted[_voter];
    }
}