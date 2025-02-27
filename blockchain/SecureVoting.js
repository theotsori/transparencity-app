// SecureVoting.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  TouchableOpacity 
} from 'react-native';
import { 
  Card, 
  Button, 
  Title, 
  Paragraph, 
  Divider, 
  ProgressBar,
  IconButton
} from 'react-native-paper';
import { FontAwesome } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';
import blockchainService from '../services/blockchain.service';
import ipfsService from '../services/ipfs.service';

const SecureVoting = ({ route, navigation }) => {
  const { proposalId } = route.params;
  
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votingInProgress, setVotingInProgress] = useState(false);
  const [error, setError] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);

  useEffect(() => {
    checkVerificationStatus();
    loadProposalDetails();
  }, [proposalId]);

  const checkVerificationStatus = async () => {
    try {
      const verified = await blockchainService.isVerified();
      setIsVerified(verified);
    } catch (err) {
      console.error('Failed to check verification status:', err);
    }
  };

  const loadProposalDetails = async () => {
    try {
      setLoading(true);
      const details = await blockchainService.getProposalDetails(proposalId);
      setProposal(details);
      setError(null);
    } catch (err) {
      console.error('Failed to load proposal details:', err);
      setError('Failed to load proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (support) => {
    if (!isVerified) {
      setShowVerificationDialog(true);
      return;
    }

    // Confirm vote
    Alert.alert(
      'Confirm Vote',
      `Are you sure you want to vote ${support ? 'in favor of' : 'against'} this proposal?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => submitVote(support) 
        }
      ]
    );
  };

  const submitVote = async (support) => {
    try {
      setVotingInProgress(true);
      const result = await blockchainService.castVote(proposalId, support);
      
      if (result.success) {
        Alert.alert(
          'Vote Submitted',
          'Your vote has been recorded on the blockchain.',
          [{ text: 'OK', onPress: () => loadProposalDetails() }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit vote');
      }
    } catch (err) {
      console.error('Vote submission error:', err);
      Alert.alert('Error', 'Failed to submit vote. Please try again.');
    } finally {
      setVotingInProgress(false);
    }
  };

  const handleVerificationRequest = () => {
    // Navigate to verification screen
    navigation.navigate('IdentityVerification');
  };

  const viewAuditTrail = () => {
    navigation.navigate('ProposalAuditTrail', { proposalId });
  };

  const viewDocuments = () => {
    if (proposal && proposal.documents) {
      navigation.navigate('DocumentViewer', { 
        documentHash: proposal.ipfsDocHash,
        title: proposal.title
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading proposal details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          mode="contained" 
          onPress={loadProposalDetails}
          style={styles.retryButton}
        >
          Retry
        </Button>
      </View>
    );
  }

  if (!proposal) {
    return (
      <View style={styles.centerContainer}>
        <Text>Proposal not found</Text>
      </View>
    );
  }

  const totalVotes = proposal.yesVotes + proposal.noVotes;
  const yesPercentage = totalVotes > 0 ? (proposal.yesVotes / totalVotes) : 0;
  const noPercentage = totalVotes > 0 ? (proposal.noVotes / totalVotes) : 0;
  
  const isActive = proposal.status === 'Active';
  const hasVoted = proposal.hasVoted;
  const timeRemaining = new Date(proposal.endTime) - new Date();
  const isExpired = timeRemaining <= 0;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title style={styles.title}>{proposal.title}</Title>
          
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: isActive ? '#4CAF50' : '#9E9E9E' }
            ]}>
              <Text style={styles.statusText}>{proposal.status}</Text>
            </View>
            
            {hasVoted && (
              <View style={styles.votedBadge}>
                <FontAwesome name="check-circle" size={14} color="white" />
                <Text style={styles.votedText}>Voted</Text>
              </View>
            )}
          </View>
          
          <Paragraph style={styles.proposer}>
            Proposed by: {proposal.proposer.substring(0, 8)}...{proposal.proposer.substring(36)}
          </Paragraph>
          
          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>Created: </Text>
            <Text style={styles.timeValue}>
              {format(proposal.createdAt, 'MMM d, yyyy')}
            </Text>
          </View>
          
          {isActive && (
            <View style={styles.timeContainer}>
              <Text style={styles.timeLabel}>Ends: </Text>
              <Text style={[
                styles.timeValue, 
                isExpired ? styles.expired : null
              ]}>
                {isExpired 
                  ? 'Voting period ended' 
                  : formatDistanceToNow(proposal.endTime, { addSuffix: true })}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Description</Title>
          <Paragraph style={styles.description}>{proposal.description}</Paragraph>
          
          {proposal.ipfsDocHash && (
            <Button 
              mode="outlined" 
              icon="file-document" 
              onPress={viewDocuments}
              style={styles.documentButton}
            >
              View Supporting Documents
            </Button>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Voting Results</Title>
          
          <View style={styles.resultContainer}>
            <Text style={styles.voteLabel}>Yes</Text>
            <View style={styles.progressContainer}>
              <ProgressBar progress={yesPercentage} color="#4CAF50" style={styles.progressBar} />
              <Text style={styles.percentage}>{Math.round(yesPercentage * 100)}%</Text>
            </View>
            <Text style={styles.voteCount}>{proposal.yesVotes}</Text>
          </View>
          
          <View style={styles.resultContainer}>
            <Text style={styles.voteLabel}>No</Text>
            <View style={styles.progressContainer}>
              <ProgressBar progress={noPercentage} color="#F44336" style={styles.progressBar} />
              <Text style={styles.percentage}>{Math.round(noPercentage * 100)}%</Text>
            </View>
            <Text style={styles.voteCount}>{proposal.noVotes}</Text>
          </View>
          
          <Text style={styles.totalVotes}>Total votes: {totalVotes}</Text>
        </Card.Content>
      </Card>

      {isActive && !hasVoted && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Cast Your Vote</Title>
            
            {!isVerified && (
              <View style={styles.verificationWarning}>
                <FontAwesome name="exclamation-triangle" size={16} color="#FF9800" />
                <Text style={styles.warningText}>
                  You need to verify your identity before voting
                </Text>
              </View>
            )}
            
            <View style={styles.voteButtonContainer}>
              <Button 
                mode="contained" 
                icon="thumb-up" 
                onPress={() => handleVote(true)}
                style={[styles.voteButton, styles.yesButton]}
                loading={votingInProgress}
                disabled={votingInProgress || isExpired}
              >
                Vote Yes
              </Button>
              
              <Button 
                mode="contained" 
                icon="thumb-down" 
                onPress={() => handleVote(false)}
                style={[styles.voteButton, styles.noButton]}
                loading={votingInProgress}
                disabled={votingInProgress || isExpired}
              >
                Vote No
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}

      <Button 
        mode="outlined" 
        icon="clipboard-list" 
        onPress={viewAuditTrail}
        style={styles.auditButton}
      >
        View Audit Trail
      </Button>

      {/* Identity Verification Dialog */}
      {showVerificationDialog && (
        <Card style={styles.verificationDialog}>
          <Card.Content>
            <Title style={styles.dialogTitle}>Identity Verification Required</Title>
            <Paragraph>
              To participate in voting, you must first verify your identity. This ensures the integrity of our democratic process.
            </Paragraph>
            <Paragraph style={styles.securityNote}>
              Your identity data will be securely verified and only a cryptographic proof will be stored on the blockchain.
            </Paragraph>
            <View style={styles.dialogButtons}>
              <Button 
                mode="outlined" 
                onPress={() => setShowVerificationDialog(false)}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={handleVerificationRequest}
                style={styles.verifyButton}
              >
                Verify Now
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerCard: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 8,
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  votedBadge: {
    backgroundColor: '#2196F3',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  votedText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  proposer: {
    color: '#666',
    fontSize: 14,
    marginBottom: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  timeLabel: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#555',
  },
  timeValue: {
    fontSize: 14,
    color: '#555',
  },
  expired: {
    color: '#F44336',
  },
  description: {
    marginVertical: 12,
    lineHeight: 22,
  },
  documentButton: {
    marginTop: 12,
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  voteLabel: {
    width: 40,
    fontWeight: 'bold',
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  progressBar: {
    flex: 1,
    height: 10,
    borderRadius: 5,
  },
  percentage: {
    width: 40,
    textAlign: 'right',
    fontSize: 12,
    marginLeft: 8,
  },
  voteCount: {
    width: 40,
    textAlign: 'right',
    color: '#666',
  },
  totalVotes: {
    marginTop: 12,
    textAlign: 'right',
    fontStyle: 'italic',
    color: '#666',
  },
  verificationWarning: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginVertical: 12,
  },
  warningText: {
    marginLeft: 8,
    color: '#E65100',
    flex: 1,
  },
  voteButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  voteButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  yesButton: {
    backgroundColor: '#4CAF50',
  },
  noButton: {
    backgroundColor: '#F44336',
  },
  auditButton: {
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorText: {
    color: '#F44336',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
  },
  verificationDialog: {
    marginVertical: 24,
    elevation: 5,
  },
  dialogTitle: {
    marginBottom: 12,
  },
  securityNote: {
    fontStyle: 'italic',
    marginTop: 12,
    fontSize: 13,
    color: '#666',
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  cancelButton: {
    marginRight: 12,
  },
  verifyButton: {
    backgroundColor: '#2196F3',
  }
});

export default SecureVoting;