// blockchain.service.js
import Web3 from 'web3';
import TransparenCityGovernanceABI from '../contracts/TransparenCityGovernance.json';
import IdentityVerificationABI from '../contracts/IdentityVerification.json';
import TransparentAuditTrailABI from '../contracts/TransparentAuditTrail.json';
import { GOVERNANCE_CONTRACT_ADDRESS, IDENTITY_CONTRACT_ADDRESS, AUDIT_CONTRACT_ADDRESS } from '../config';
import { storeData, retrieveData } from './storage.service';
import ipfs from './ipfs.service';

class BlockchainService {
  constructor() {
    // Initialize Web3 with an Ethereum provider (Infura or similar)
    this.web3 = null;
    this.governanceContract = null;
    this.identityContract = null;
    this.auditContract = null;
    this.account = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      if (window.ethereum) {
        // Modern dapp browsers
        this.web3 = new Web3(window.ethereum);
        try {
          // Request account access
          await window.ethereum.request({ method: 'eth_requestAccounts' });
        } catch (error) {
          console.error("User denied account access");
          throw new Error("User denied account access");
        }
      } else if (window.web3) {
        // Legacy dapp browsers
        this.web3 = new Web3(window.web3.currentProvider);
      } else {
        // Fallback to a public provider (read-only)
        const provider = new Web3.providers.HttpProvider(
          "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID"
        );
        this.web3 = new Web3(provider);
      }

      // Get connected account
      const accounts = await this.web3.eth.getAccounts();
      this.account = accounts[0];

      // Initialize contract instances
      this.governanceContract = new this.web3.eth.Contract(
        TransparenCityGovernanceABI.abi,
        GOVERNANCE_CONTRACT_ADDRESS
      );

      this.identityContract = new this.web3.eth.Contract(
        IdentityVerificationABI.abi,
        IDENTITY_CONTRACT_ADDRESS
      );

      this.auditContract = new this.web3.eth.Contract(
        TransparentAuditTrailABI.abi,
        AUDIT_CONTRACT_ADDRESS
      );

      this.initialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize blockchain service:", error);
      return false;
    }
  }

  // ===== Proposal Functions =====

  /**
   * Create a new proposal
   * @param {string} title - The proposal title
   * @param {string} description - The proposal description
   * @param {File} documents - Supporting documents to be stored on IPFS
   */
  async createProposal(title, description, documents) {
    if (!this.initialized) await this.initialize();
    
    try {
      // First upload supporting documents to IPFS
      const ipfsResult = await ipfs.addFile(documents);
      const ipfsHash = ipfsResult.path;
      
      // Then create the proposal
      const result = await this.governanceContract.methods
        .createProposal(title, description, ipfsHash)
        .send({ from: this.account });
      
      // Parse the proposal ID from the transaction result
      const proposalId = this.parseProposalIdFromResult(result);
      
      return {
        success: true,
        proposalId,
        transactionHash: result.transactionHash
      };
    } catch (error) {
      console.error("Error creating proposal:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cast a vote on a proposal
   * @param {number} proposalId - The ID of the proposal
   * @param {boolean} support - Whether to support the proposal
   */
  async castVote(proposalId, support) {
    if (!this.initialized) await this.initialize();
    
    try {
      const result = await this.governanceContract.methods
        .castVote(proposalId, support)
        .send({ from: this.account });
      
      return {
        success: true,
        transactionHash: result.transactionHash
      };
    } catch (error) {
      console.error("Error casting vote:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get proposal details
   * @param {number} proposalId - The ID of the proposal
   */
  async getProposalDetails(proposalId) {
    if (!this.initialized) await this.initialize();
    
    try {
      const proposal = await this.governanceContract.methods
        .getProposalBasicInfo(proposalId)
        .call();
      
      // Check if the current user has voted
      const hasVoted = await this.governanceContract.methods
        .hasVoted(proposalId, this.account)
        .call();
      
      // Get IPFS document content
      let documents = null;
      if (proposal.ipfsDocHash) {
        try {
          documents = await ipfs.getContent(proposal.ipfsDocHash);
        } catch (ipfsError) {
          console.warn("Could not retrieve IPFS content:", ipfsError);
        }
      }
      
      // Format the proposal data
      return {
        id: proposalId,
        title: proposal.title,
        description: proposal.description,
        createdAt: new Date(parseInt(proposal.creationTime) * 1000),
        endTime: new Date(parseInt(proposal.votingEndTime) * 1000),
        proposer: proposal.proposer,
        yesVotes: parseInt(proposal.yesVotes),
        noVotes: parseInt(proposal.noVotes),
        status: this.getStatusText(parseInt(proposal.status)),
        documents,
        hasVoted,
        isActive: parseInt(proposal.status) === 0
      };
    } catch (error) {
      console.error("Error getting proposal details:", error);
      throw error;
    }
  }

  /**
   * Get all proposals with basic information
   * @param {number} limit - Maximum number of proposals to retrieve
   * @param {number} offset - Starting index
   */
  async getProposals(limit = 10, offset = 0) {
    if (!this.initialized) await this.initialize();
    
    try {
      const proposalCount = await this.governanceContract.methods
        .proposalCount()
        .call();
      
      const totalProposals = parseInt(proposalCount);
      const proposals = [];
      
      // Calculate the range to fetch
      const start = Math.max(1, totalProposals - offset);
      const end = Math.max(1, start - limit);
      
      // Fetch proposals in reverse order (newest first)
      for (let i = start; i >= end; i--) {
        try {
          const proposal = await this.getProposalDetails(i);
          proposals.push(proposal);
        } catch (error) {
          console.warn(`Error fetching proposal ${i}:`, error);
        }
      }
      
      return {
        proposals,
        totalCount: totalProposals
      };
    } catch (error) {
      console.error("Error getting proposals:", error);
      throw error;
    }
  }

  // ===== Identity Verification Functions =====

  /**
   * Check if the current user is verified
   */
  async isVerified() {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.identityContract.methods
        .isVerifiedCitizen(this.account)
        .call();
    } catch (error) {
      console.error("Error checking verification status:", error);
      return false;
    }
  }

  /**
   * Delegate voting power to another user
   * @param {string} delegateeAddress - Address to delegate to
   */
  async delegateVote(delegateeAddress) {
    if (!this.initialized) await this.initialize();
    
    try {
      const result = await this.identityContract.methods
        .delegateVote(delegateeAddress)
        .send({ from: this.account });
      
      return {
        success: true,
        transactionHash: result.transactionHash
      };
    } catch (error) {
      console.error("Error delegating vote:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Remove a delegation
   * @param {string} delegateeAddress - Address to remove delegation from
   */
  async removeDelegation(delegateeAddress) {
    if (!this.initialized) await this.initialize();
    
    try {
      const result = await this.identityContract.methods
      .removeDelegation(delegateeAddress)
      .send({ from: this.account });
    
    return {
      success: true,
      transactionHash: result.transactionHash
    };
  } catch (error) {
    console.error("Error removing delegation:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ===== Audit Trail Functions =====

/**
 * Get audit records for a specific proposal
 * @param {number} proposalId - The ID of the proposal
 */
async getProposalAuditTrail(proposalId) {
  if (!this.initialized) await this.initialize();
  
  try {
    const auditIds = await this.auditContract.methods
      .getProposalAudits(proposalId)
      .call();
    
    const auditRecords = [];
    
    for (const id of auditIds) {
      const record = await this.auditContract.methods
        .getAuditDetails(id)
        .call();
      
      auditRecords.push({
        id: parseInt(id),
        timestamp: new Date(parseInt(record.timestamp) * 1000),
        actor: record.actor,
        actionType: this.web3.utils.hexToUtf8(record.actionType),
        proposalId: parseInt(record.proposalId),
        ipfsDataHash: record.ipfsDataHash,
        metadataHash: record.metadataHash
      });
    }
    
    return auditRecords;
  } catch (error) {
    console.error("Error getting audit trail:", error);
    throw error;
  }
}

/**
 * Get audit records for the current user
 */
async getUserAuditTrail() {
  if (!this.initialized) await this.initialize();
  
  try {
    const auditIds = await this.auditContract.methods
      .getUserAudits(this.account)
      .call();
    
    const auditRecords = [];
    
    for (const id of auditIds) {
      const record = await this.auditContract.methods
        .getAuditDetails(id)
        .call();
      
      auditRecords.push({
        id: parseInt(id),
        timestamp: new Date(parseInt(record.timestamp) * 1000),
        actor: record.actor,
        actionType: this.web3.utils.hexToUtf8(record.actionType),
        proposalId: parseInt(record.proposalId),
        ipfsDataHash: record.ipfsDataHash,
        metadataHash: record.metadataHash
      });
    }
    
    return auditRecords;
  } catch (error) {
    console.error("Error getting user audit trail:", error);
    throw error;
  }
}

/**
 * Get a batch of recent audit records
 * @param {number} count - Number of records to retrieve
 */
async getRecentAuditRecords(count = 20) {
  if (!this.initialized) await this.initialize();
  
  try {
    const totalCount = await this.auditContract.methods
      .getAuditCount()
      .call();
    
    const startIndex = Math.max(0, parseInt(totalCount) - count);
    
    const batch = await this.auditContract.methods
      .getAuditBatch(startIndex, count)
      .call();
    
    const auditRecords = [];
    
    for (let i = 0; i < batch.ids.length; i++) {
      auditRecords.push({
        id: parseInt(batch.ids[i]),
        timestamp: new Date(parseInt(batch.timestamps[i]) * 1000),
        actor: batch.actors[i],
        actionType: this.web3.utils.hexToUtf8(batch.actionTypes[i]),
        proposalId: parseInt(batch.proposalIds[i])
      });
    }
    
    return auditRecords;
  } catch (error) {
    console.error("Error getting recent audit records:", error);
    throw error;
  }
}

// ===== Helper Functions =====

/**
 * Parse proposal ID from transaction result
 * @param {Object} result - Transaction result
 * @returns {number} Proposal ID
 */
parseProposalIdFromResult(result) {
  // Check for ProposalCreated event
  const event = result.events.ProposalCreated;
  if (event) {
    return parseInt(event.returnValues.proposalId);
  }
  
  // Fallback: Try to parse from logs
  for (const log of result.logs) {
    try {
      const decoded = this.web3.eth.abi.decodeLog(
        [
          { type: 'uint256', name: 'proposalId', indexed: true },
          { type: 'address', name: 'proposer', indexed: true },
          { type: 'string', name: 'title' }
        ],
        log.data,
        log.topics.slice(1)
      );
      
      if (decoded.proposalId) {
        return parseInt(decoded.proposalId);
      }
    } catch (e) {
      // Not the event we're looking for
    }
  }
  
  // If we can't parse it, estimate based on proposalCount
  return this.governanceContract.methods.proposalCount().call();
}

/**
 * Convert numeric status to text
 * @param {number} statusCode - The status code
 * @returns {string} Status text
 */
getStatusText(statusCode) {
  const statuses = ['Active', 'Passed', 'Rejected', 'Implemented'];
  return statuses[statusCode] || 'Unknown';
}

/**
 * Get the current account address
 * @returns {string} Current account address
 */
getAccount() {
  return this.account;
}

/**
 * Listen for account changes
 * @param {Function} callback - Function to call when account changes
 */
listenForAccountChanges(callback) {
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
      this.account = accounts[0];
      callback(accounts[0]);
    });
  }
}
}

// Create and export a singleton instance
const blockchainService = new BlockchainService();
export default blockchainService;