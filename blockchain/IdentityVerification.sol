// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title Identity Verification
 * @dev Smart contract for managing verified identities for governance
 */
contract IdentityVerification {
    address public admin;
    address public governanceContract;
    
    // Identity verification types
    enum VerificationType { Government, ThirdParty, MultiSig }
    
    struct Citizen {
        bool isVerified;
        uint256 verifiedAt;
        VerificationType verificationType;
        bytes32 identityHash;    // Hash of identity data (stored off-chain)
        uint256 reputationScore; // Optional: can be used for weighted voting
        mapping(address => bool) delegatedTo; // Optional: for vote delegation
    }
    
    // Citizen address => Citizen data
    mapping(address => Citizen) public citizens;
    
    // Authorized verifiers who can add citizens
    mapping(address => bool) public authorizedVerifiers;
    
    // Events
    event CitizenVerified(address indexed citizen, VerificationType verificationType);
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    event GovernanceContractUpdated(address indexed newContract);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyVerifier() {
        require(authorizedVerifiers[msg.sender] || msg.sender == admin, "Not an authorized verifier");
        _;
    }
    
    modifier onlyGovernance() {
        require(msg.sender == governanceContract, "Only governance contract can call");
        _;
    }
    
    constructor() {
        admin = msg.sender;
        authorizedVerifiers[msg.sender] = true;
    }
    
    /**
     * @dev Set the address of the governance contract
     * @param _governanceContract Address of the governance contract
     */
    function setGovernanceContract(address _governanceContract) external onlyAdmin {
        require(_governanceContract != address(0), "Invalid address");
        governanceContract = _governanceContract;
        emit GovernanceContractUpdated(_governanceContract);
    }
    
    /**
     * @dev Add an authorized verifier
     * @param _verifier Address to authorize as verifier
     */
    function addVerifier(address _verifier) external onlyAdmin {
        require(_verifier != address(0), "Invalid address");
        authorizedVerifiers[_verifier] = true;
        emit VerifierAdded(_verifier);
    }
    
    /**
     * @dev Remove an authorized verifier
     * @param _verifier Address to remove authorization from
     */
    function removeVerifier(address _verifier) external onlyAdmin {
        require(_verifier != admin, "Cannot remove admin as verifier");
        authorizedVerifiers[_verifier] = false;
        emit VerifierRemoved(_verifier);
    }
    
    /**
     * @dev Verify a citizen's identity
     * @param _citizen Address of the citizen to verify
     * @param _identityHash Hash of the identity documents (stored off-chain)
     * @param _verificationType Type of verification performed
     */
    function verifyCitizen(
        address _citizen, 
        bytes32 _identityHash, 
        VerificationType _verificationType
    ) external onlyVerifier {
        require(_citizen != address(0), "Invalid address");
        require(!citizens[_citizen].isVerified, "Citizen already verified");
        
        Citizen storage citizen = citizens[_citizen];
        citizen.isVerified = true;
        citizen.verifiedAt = block.timestamp;
        citizen.verificationType = _verificationType;
        citizen.identityHash = _identityHash;
        citizen.reputationScore = 1; // Initialize with base reputation
        
        emit CitizenVerified(_citizen, _verificationType);
    }
    
    /**
     * @dev Check if an address is a verified citizen
     * @param _address Address to check
     * @return Whether the address is verified
     */
    function isVerifiedCitizen(address _address) external view returns (bool) {
        return citizens[_address].isVerified;
    }
    
    /**
     * @dev Update a citizen's reputation score (could be based on participation)
     * @param _citizen Address of the citizen
     * @param _newScore New reputation score
     */
    function updateReputationScore(address _citizen, uint256 _newScore) external onlyGovernance {
        require(citizens[_citizen].isVerified, "Citizen not verified");
        citizens[_citizen].reputationScore = _newScore;
    }
    
    /**
     * @dev Allow a citizen to delegate their vote to another address
     * @param _delegatee Address to delegate to
     */
    function delegateVote(address _delegatee) external {
        require(citizens[msg.sender].isVerified, "Not a verified citizen");
        require(citizens[_delegatee].isVerified, "Delegatee not a verified citizen");
        citizens[msg.sender].delegatedTo[_delegatee] = true;
    }
    
    /**
     * @dev Remove a vote delegation
     * @param _delegatee Address to remove delegation from
     */
    function removeDelegation(address _delegatee) external {
        require(citizens[msg.sender].isVerified, "Not a verified citizen");
        citizens[msg.sender].delegatedTo[_delegatee] = false;
    }
    
    /**
     * @dev Check if a citizen has delegated to another address
     * @param _citizen Address of the delegating citizen
     * @param _delegatee Address of the potential delegatee
     * @return Whether delegation exists
     */
    function hasDelegated(address _citizen, address _delegatee) external view returns (bool) {
        return citizens[_citizen].delegatedTo[_delegatee];
    }
}