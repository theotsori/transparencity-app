// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title Transparent Audit Trail
 * @dev Records all governance actions for public accountability
 */
contract TransparentAuditTrail {
    address public admin;
    address public governanceContract;
    
    // Struct to store audit records
    struct AuditRecord {
        uint256 id;
        uint256 timestamp;
        address actor;
        bytes32 actionType;  // Hash of action type (e.g., "VOTE", "PROPOSE")
        uint256 proposalId;  // Related proposal (if applicable)
        bytes32 ipfsDataHash; // Additional data stored on IPFS
        bytes32 metadataHash; // Hash of any additional metadata
    }
    
    // All audit records
    AuditRecord[] public auditRecords;
    
    // Index by proposal
    mapping(uint256 => uint256[]) public proposalAuditRecords;
    
    // Index by user
    mapping(address => uint256[]) public userAuditRecords;
    
    // Events
    event AuditRecorded(uint256 indexed recordId, address indexed actor, bytes32 indexed actionType);
    event GovernanceContractUpdated(address indexed newContract);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyGovernance() {
        require(msg.sender == governanceContract, "Only governance contract can call");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    /**
     * @dev Set the governance contract address
     * @param _governanceContract Address of the governance contract
     */
    function setGovernanceContract(address _governanceContract) external onlyAdmin {
        require(_governanceContract != address(0), "Invalid address");
        governanceContract = _governanceContract;
        emit GovernanceContractUpdated(_governanceContract);
    }
    
    /**
     * @dev Record an action in the audit trail
     * @param _actor Address that performed the action
     * @param _actionType Type of action performed (as bytes32)
     * @param _proposalId ID of related proposal (if applicable)
     * @param _ipfsDataHash IPFS hash where additional data is stored
     * @param _metadataHash Hash of any additional metadata
     * @return The ID of the recorded audit
     */
    function recordAudit(
        address _actor,
        bytes32 _actionType,
        uint256 _proposalId,
        bytes32 _ipfsDataHash,
        bytes32 _metadataHash
    ) external onlyGovernance returns (uint256) {
        uint256 recordId = auditRecords.length;
        
        auditRecords.push(AuditRecord({
            id: recordId,
            timestamp: block.timestamp,
            actor: _actor,
            actionType: _actionType,
            proposalId: _proposalId,
            ipfsDataHash: _ipfsDataHash,
            metadataHash: _metadataHash
        }));
        
        // Add to indices
        if (_proposalId > 0) {
            proposalAuditRecords[_proposalId].push(recordId);
        }
        
        userAuditRecords[_actor].push(recordId);
        
        emit AuditRecorded(recordId, _actor, _actionType);
        
        return recordId;
    }
    
    /**
     * @dev Get the count of all audit records
     * @return The number of audit records
     */
    function getAuditCount() external view returns (uint256) {
        return auditRecords.length;
    }
    
    /**
     * @dev Get audit records for a specific proposal
     * @param _proposalId ID of the proposal
     * @return Array of audit record IDs
     */
    function getProposalAudits(uint256 _proposalId) external view returns (uint256[] memory) {
        return proposalAuditRecords[_proposalId];
    }
    
    /**
     * @dev Get audit records for a specific user
     * @param _user Address of the user
     * @return Array of audit record IDs
     */
    function getUserAudits(address _user) external view returns (uint256[] memory) {
        return userAuditRecords[_user];
    }
    
    /**
     * @dev Get details of a specific audit record
     * @param _recordId ID of the audit record
     * @return Record details
     */
    function getAuditDetails(uint256 _recordId) external view returns (
        uint256 timestamp,
        address actor,
        bytes32 actionType,
        uint256 proposalId,
        bytes32 ipfsDataHash,
        bytes32 metadataHash
    ) {
        require(_recordId < auditRecords.length, "Invalid record ID");
        AuditRecord storage record = auditRecords[_recordId];
        
        return (
            record.timestamp,
            record.actor,
            record.actionType,
            record.proposalId,
            record.ipfsDataHash,
            record.metadataHash
        );
    }
    
    /**
     * @dev Get a batch of audit records within a range
     * @param _startIndex Start index
     * @param _count Number of records to retrieve
     * @return Array of basic audit information
     */
    function getAuditBatch(uint256 _startIndex, uint256 _count) external view returns (
        uint256[] memory ids,
        uint256[] memory timestamps,
        address[] memory actors,
        bytes32[] memory actionTypes,
        uint256[] memory proposalIds
    ) {
        require(_startIndex < auditRecords.length, "Start index out of bounds");
        
        // Adjust count if it would exceed array bounds
        if (_startIndex + _count > auditRecords.length) {
            _count = auditRecords.length - _startIndex;
        }
        
        ids = new uint256[](_count);
        timestamps = new uint256[](_count);
        actors = new address[](_count);
        actionTypes = new bytes32[](_count);
        proposalIds = new uint256[](_count);
        
        for (uint256 i = 0; i < _count; i++) {
            AuditRecord storage record = auditRecords[_startIndex + i];
            ids[i] = record.id;
            timestamps[i] = record.timestamp;
            actors[i] = record.actor;
            actionTypes[i] = record.actionType;
            proposalIds[i] = record.proposalId;
        }
        
        return (ids, timestamps, actors, actionTypes, proposalIds);
    }
}