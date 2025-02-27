// ProposalAuditTrail.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { Card, Title, Paragraph, Divider, Button } from 'react-native-paper';
import blockchainService from '../services/blockchain.service';
import ipfsService from '../services/ipfs.service';
import { formatDistanceToNow } from 'date-fns';

const ProposalAuditTrail = ({ proposalId, navigation }) => {
  const [auditRecords, setAuditRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRecords, setExpandedRecords] = useState({});

  useEffect(() => {
    loadAuditTrail();
  }, [proposalId]);

  const loadAuditTrail = async () => {
    try {
      setLoading(true);
      const records = await blockchainService.getProposalAuditTrail(proposalId);
      // Sort by timestamp (newest first)
      records.sort((a, b) => b.timestamp - a.timestamp);
      setAuditRecords(records);
      setError(null);
    } catch (err) {
      console.error('Failed to load audit trail:', err);
      setError('Failed to load audit trail. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandRecord = (recordId) => {
    setExpandedRecords((prev) => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  const viewIPFSData = async (ipfsHash) => {
    if (!ipfsHash || ipfsHash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return;
    }
    
    try {
      // Navigate to IPFS viewer screen
      navigation.navigate('IPFSViewer', { ipfsHash });
    } catch (err) {
      console.error('Error viewing IPFS data:', err);
    }
  };

  // Helper function to get color based on action type
  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'PROPOSAL_CREATED':
        return '#4CAF50'; // Green
      case 'VOTE_YES':
        return '#2196F3'; // Blue
      case 'VOTE_NO':
        return '#F44336'; // Red
      case 'STATUS_UPDATED':
      case 'STATUS_UPDATED_AUTO':
        return '#FF9800'; // Orange
      default:
        return '#9E9E9E'; // Gray
    }
  };

  // Helper function to get a friendly description of the action
  const getActionDescription = (record) => {
    switch (record.actionType) {
      case 'PROPOSAL_CREATED':
        return 'Created this proposal';
      case 'VOTE_YES':
        return 'Voted in favor of this proposal';
      case 'VOTE_NO':
        return 'Voted against this proposal';
      case 'STATUS_UPDATED':
        return 'Status was manually updated';
      case 'STATUS_UPDATED_AUTO':
        return 'Status was automatically updated after voting period';
      default:
        return record.actionType;
    }
  };

  // Render a single audit record
  const renderAuditRecord = ({ item }) => {
    const isExpanded = expandedRecords[item.id];
    
    return (
      <Card style={styles.card}>
        <View style={styles.recordHeader}>
          <View style={[styles.actionTag, { backgroundColor: getActionColor(item.actionType) }]}>
            <Text style={styles.actionTagText}>{item.actionType.split('_')[0]}</Text>
          </View>
          <Text style={styles.timestamp}>
            {formatDistanceToNow(item.timestamp, { addSuffix: true })}
          </Text>
        </View>
        
        <Card.Content>
          <Paragraph style={styles.description}>
            {getActionDescription(item)}
          </Paragraph>
          
          <View style={styles.actorContainer}>
            <Text style={styles.actorLabel}>By: </Text>
            <Text style={styles.actorAddress}>{item.actor}</Text>
          </View>
          
          {isExpanded && (
            <View style={styles.expandedContent}>
              <Divider style={styles.divider} />
              
              <Text style={styles.detailLabel}>Record ID:</Text>
              <Text style={styles.detailValue}>{item.id}</Text>
              
              <Text style={styles.detailLabel}>Timestamp:</Text>
              <Text style={styles.detailValue}>{item.timestamp.toLocaleString()}</Text>
              
              {item.ipfsDataHash && 
               item.ipfsDataHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
                <Button 
                  mode="outlined" 
                  style={styles.ipfsButton}
                  onPress={() => viewIPFSData(item.ipfsDataHash)}
                >
                  View Additional Data
                </Button>
              )}
            </View>
          )}
        </Card.Content>
        
        <Card.Actions>
          <Button 
            mode="text" 
            onPress={() => toggleExpandRecord(item.id)}
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  // Main render
  return (
    <View style={styles.container}>
      <Title style={styles.title}>Proposal Audit Trail</Title>
      <Paragraph style={styles.subtitle}>
        Complete history of all actions related to this proposal
      </Paragraph>
      
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={loadAuditTrail}>
            Retry
          </Button>
        </View>
      ) : auditRecords.length === 0 ? (
        <Text style={styles.emptyText}>No audit records found.</Text>
      ) : (
        <FlatList
          data={auditRecords}
          renderItem={renderAuditRecord}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          refreshing={loading}
          onRefresh={loadAuditTrail}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 16,
    color: '#666',
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  actionTag: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionTagText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  timestamp: {
    color: '#666',
    fontSize: 12,
  },
  description: {
    fontSize: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  actorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  actorLabel: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  actorAddress: {
    fontSize: 14,
    color: '#444',
    flex: 1,
  },
  expandedContent: {
    marginTop: 12,
  },
  divider: {
    marginVertical: 8,
  },
  detailLabel: {
    fontWeight: 'bold',
    marginTop: 8,
    fontSize: 14,
  },
  detailValue: {
    marginTop: 2,
    fontSize: 14,
    color: '#444',
  },
  ipfsButton: {
    marginTop: 12,
  },
  loader: {
    marginTop: 32,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    color: '#666',
  },
});

export default ProposalAuditTrail;