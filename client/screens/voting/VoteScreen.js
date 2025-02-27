// client/screens/voting/VoteScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { ProgressBar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import voteService from '../../services/voteService';
import proposalService from '../../services/proposalService';

const VoteScreen = ({ route, navigation }) => {
  const { proposalId } = route.params;
  const [proposal, setProposal] = useState(null);
  const [voteCounts, setVoteCounts] = useState(null);
  const [userVote, setUserVote] = useState(null);
  const [selectedVote, setSelectedVote] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [proposalId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const proposalData = await proposalService.getProposal(proposalId);
      setProposal(proposalData);

      const votesData = await voteService.getVotesForProposal(proposalId);
      setVoteCounts(votesData);

      try {
        const userVoteData = await voteService.getUserVote(proposalId);
        if (userVoteData) {
          setUserVote(userVoteData);
          setSelectedVote(userVoteData.vote);
          setReason(userVoteData.reason || '');
        }
      } catch (error) {
        // User might not have voted yet, that's okay
      }
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to load proposal data');
      navigation.goBack();
    }
  };

  const handleVote = async () => {
    if (!selectedVote) {
      return Alert.alert('Error', 'Please select your vote');
    }

    try {
      setSubmitting(true);
      
      const voteData = {
        vote: selectedVote,
        reason: reason
      };
      
      if (userVote) {
        // Update existing vote
        await voteService.updateVote(userVote._id, voteData);
      } else {
        // Submit new vote
        await voteService.addVote(proposalId, voteData);
      }
      
      setSubmitting(false);
      Alert.alert(
        'Success',
        'Your vote has been recorded',
        [{ text: 'OK', onPress: () => fetchData() }]
      );
    } catch (error) {
      setSubmitting(false);
      Alert.alert('Error', error.message || 'Failed to submit your vote');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading proposal data...</Text>
      </View>
    );
  }

  // Calculate percentages for progress bars
  const calculatePercentage = (count, total) => {
    if (total === 0) return 0;
    return count / total;
  };

  const totalVotes = voteCounts ? 
    voteCounts.yes + voteCounts.no + voteCounts.abstain : 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{proposal.title}</Text>
        <View style={styles.categoryContainer}>
          <Text style={styles.category}>{proposal.category}</Text>
        </View>
      </View>
      
      <View style={styles.authorInfo}>
        <Text style={styles.authorName}>
          Proposed by: {proposal.author.fullName}
        </Text>
        <Text style={styles.dateText}>
          {new Date(proposal.createdAt).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.proposalContent}>
        <Text style={styles.description}>{proposal.description}</Text>
      </View>
      
      <View style={styles.voteSection}>
        <Text style={styles.sectionTitle}>Current Votes</Text>
        {voteCounts && (
          <View style={styles.voteCounts}>
            <View style={styles.voteProgressContainer}>
              <View style={styles.progressLabelContainer}>
                <Text style={styles.progressLabel}>Yes</Text>
                <Text style={styles.voteCountText}>{voteCounts.yes}</Text>
              </View>
              <ProgressBar 
                progress={calculatePercentage(voteCounts.yes, totalVotes)} 
                color="#27ae60"
                style={styles.progressBar}
              />
            </View>
            
            <View style={styles.voteProgressContainer}>
              <View style={styles.progressLabelContainer}>
                <Text style={styles.progressLabel}>No</Text>
                <Text style={styles.voteCountText}>{voteCounts.no}</Text>
              </View>
              <ProgressBar 
                progress={calculatePercentage(voteCounts.no, totalVotes)} 
                color="#e74c3c"
                style={styles.progressBar}
              />
            </View>
            
            <View style={styles.voteProgressContainer}>
              <View style={styles.progressLabelContainer}>
                <Text style={styles.progressLabel}>Abstain</Text>
                <Text style={styles.voteCountText}>{voteCounts.abstain}</Text>
              </View>
              <ProgressBar 
                progress={calculatePercentage(voteCounts.abstain, totalVotes)} 
                color="#95a5a6"
                style={styles.progressBar}
              />
            </View>
            
            <Text style={styles.totalVotes}>
              Total votes: {totalVotes}
            </Text>
          </View>
        )}

        {proposal.status === 'voting' ? (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Cast Your Vote</Text>
            
            <View style={styles.voteOptions}>
              <TouchableOpacity 
                style={[
                  styles.voteOption, 
                  selectedVote === 'yes' && styles.selectedYes
                ]}
                onPress={() => setSelectedVote('yes')}
              >
                <Icon 
                  name="thumb-up" 
                  size={24} 
                  color={selectedVote === 'yes' ? '#fff' : '#27ae60'} 
                />
                <Text style={[
                  styles.voteOptionText,
                  selectedVote === 'yes' && styles.selectedOptionText
                ]}>
                  Yes
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.voteOption, 
                  selectedVote === 'no' && styles.selectedNo
                ]}
                onPress={() => setSelectedVote('no')}
              >
                <Icon 
                  name="thumb-down" 
                  size={24} 
                  color={selectedVote === 'no' ? '#fff' : '#e74c3c'} 
                />
                <Text style={[
                  styles.voteOptionText,
                  selectedVote === 'no' && styles.selectedOptionText
                ]}>
                  No
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.voteOption, 
                  selectedVote === 'abstain' && styles.selectedAbstain
                ]}
                onPress={() => setSelectedVote('abstain')}
              >
                <Icon 
                  name="hand-okay" 
                  size={24} 
                  color={selectedVote === 'abstain' ? '#fff' : '#95a5a6'} 
                />
                <Text style={[
                  styles.voteOptionText,
                  selectedVote === 'abstain' && styles.selectedOptionText
                ]}>
                  Abstain
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reason (Optional)</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Share why you voted this way..."
                multiline
                numberOfLines={4}
                value={reason}
                onChangeText={setReason}
                maxLength={500}
              />
            </View>
            
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleVote}
              disabled={submitting || !selectedVote}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : userVote ? 'Update Vote' : 'Submit Vote'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.votingClosed}>
            <Icon name="lock" size={24} color="#95a5a6" />
            <Text style={styles.votingClosedText}>
              Voting is {proposal.status === 'submitted' ? 'not yet open' : 'now closed'} for this proposal
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  categoryContainer: {
    backgroundColor: '#ecf0f1',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  category: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  authorInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  authorName: {
    fontSize: 14,
    color: '#666',
  },
  dateText: {
    fontSize: 14,
    color: '#999',
  },
  proposalContent: {
    padding: 20,
    backgroundColor: '#fff',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  voteSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  voteCounts: {
    marginBottom: 10,
  },
  voteProgressContainer: {
    marginBottom: 15,
  },
  progressLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
  },
  voteCountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
  },
  totalVotes: {
    textAlign: 'right',
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  voteOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  voteOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 5,
  },
  selectedYes: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  selectedNo: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  selectedAbstain: {
    backgroundColor: '#95a5a6',
    borderColor: '#95a5a6',
  },
  voteOptionText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: 'bold',
  },
  selectedOptionText: {
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  reasonInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    height: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#3498db',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  votingClosed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  votingClosedText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default VoteScreen;