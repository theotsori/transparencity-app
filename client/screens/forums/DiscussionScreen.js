/ client/screens/forums/DiscussionScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format, formatDistance } from 'date-fns';
import commentService from '../../services/commentService';
import { useAuth } from '../../contexts/AuthContext'; // Assume we have an auth context

const DiscussionScreen = ({ route, navigation }) => {
  const { proposalId, proposalTitle } = route.params;
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [replyToId, setReplyToId] = useState(null);
  const [replyToUser, setReplyToUser] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const commentInputRef = useRef(null);

  useEffect(() => {
    fetchComments();
  }, [proposalId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const data = await commentService.getCommentsForProposal(proposalId);
      setComments(data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to load comments');
    }
  };

  const handleSubmitComment = async () => {
    if (commentText.trim() === '') {
      return;
    }

    try {
      setSubmitting(true);
      let newComment;

      if (editingComment) {
        // Update existing comment
        newComment = await commentService.updateComment(editingComment._id, {
          text: commentText
        });

        // Update comment in the list
        setComments(prevComments => 
          prevComments.map(comment => 
            comment._id === newComment._id ? newComment : 
            {
              ...comment,
              replies: comment.replies?.map(reply => 
                reply._id === newComment._id ? newComment : reply
              )
            }
          )
        );

        setEditingComment(null);
      } else if (replyToId) {
        // Submit a reply
        newComment = await commentService.addComment(proposalId, {
          text: commentText,
          parentComment: replyToId
        });

        // Add reply to the parent comment
        setComments(prevComments => 
          prevComments.map(comment => 
            comment._id === replyToId ? 
            {
              ...comment,
              replies: [...(comment.replies || []), newComment]
            } : comment
          )
        );

        setReplyToId(null);
        setReplyToUser(null);
      } else {
        // Submit a new top-level comment
        newComment = await commentService.addComment(proposalId, {
          text: commentText
        });

        // Add new comment to the list
        setComments(prevComments => [newComment, ...prevComments]);
      }

      setCommentText('');
      setSubmitting(false);
    } catch (error) {
      setSubmitting(false);
      Alert.alert('Error', error.message || 'Failed to submit comment');
    }
  };

  // client/screens/forums/DiscussionScreen.js (continued)
  const handleReply = (commentId, userName) => {
    setReplyToId(commentId);
    setReplyToUser(userName);
    setCommentText(`@${userName} `);
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment);
    setCommentText(comment.text);
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  };

  const handleDeleteComment = async (commentId) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await commentService.deleteComment(commentId);
              
              // Remove the comment from the list
              setComments(prevComments => 
                prevComments.filter(comment => {
                  // Filter out the comment if it's a top level comment
                  if (comment._id === commentId) return false;
                  
                  // Filter out the comment from replies if it's a reply
                  if (comment.replies) {
                    comment.replies = comment.replies.filter(reply => reply._id !== commentId);
                  }
                  
                  return true;
                })
              );
              
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete comment');
            }
          }
        }
      ]
    );
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setCommentText('');
    setReplyToId(null);
    setReplyToUser(null);
  };

  const renderCommentActions = (comment) => {
    if (comment.author._id !== user.id) {
      return (
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleReply(comment._id, comment.author.fullName)}
        >
          <Icon name="reply" size={16} color="#3498db" />
          <Text style={styles.actionText}>Reply</Text>
        </TouchableOpacity>
      );
    }
    
    return (
      <View style={styles.userActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleEditComment(comment)}
        >
          <Icon name="pencil" size={16} color="#3498db" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDeleteComment(comment._id)}
        >
          <Icon name="delete" size={16} color="#e74c3c" />
          <Text style={[styles.actionText, { color: '#e74c3c' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderComment = ({ item }) => {
    return (
      <View style={styles.commentContainer}>
        <View style={styles.commentHeader}>
          <View style={styles.authorInfo}>
            <Image 
              source={
                item.author.profilePicture 
                  ? { uri: item.author.profilePicture } 
                  : require('../../assets/default-avatar.png')
              } 
              style={styles.avatar}
            />
            <View>
              <Text style={styles.authorName}>{item.author.fullName}</Text>
              <Text style={styles.commentDate}>
                {formatDistance(new Date(item.createdAt), new Date(), { addSuffix: true })}
              </Text>
            </View>
          </View>
          {item.author._id === user.id && (
            <View style={styles.commentBadge}>
              <Text style={styles.commentBadgeText}>Author</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.commentText}>{item.text}</Text>
        
        <View style={styles.actionsContainer}>
          {renderCommentActions(item)}
        </View>
        
        {/* Render replies */}
        {item.replies && item.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {item.replies.map(reply => (
              <View key={reply._id} style={styles.replyContainer}>
                <View style={styles.commentHeader}>
                  <View style={styles.authorInfo}>
                    <Image 
                      source={
                        reply.author.profilePicture 
                          ? { uri: reply.author.profilePicture } 
                          : require('../../assets/default-avatar.png')
                      } 
                      style={styles.replyAvatar}
                    />
                    <View>
                      <Text style={styles.replyAuthorName}>{reply.author.fullName}</Text>
                      <Text style={styles.commentDate}>
                        {formatDistance(new Date(reply.createdAt), new Date(), { addSuffix: true })}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <Text style={styles.replyText}>{reply.text}</Text>
                
                <View style={styles.actionsContainer}>
                  {renderCommentActions(reply)}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderInputAccessory = () => {
    return (
      <View style={styles.inputAccessory}>
        {(replyToUser || editingComment) && (
          <>
            <Text style={styles.inputAccessoryText}>
              {editingComment ? 'Editing comment' : `Replying to ${replyToUser}`}
            </Text>
            <TouchableOpacity onPress={handleCancelEdit}>
              <Icon name="close" size={20} color="#777" />
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.proposalTitle}>{proposalTitle}</Text>
          <Text style={styles.discussionTitle}>Discussion</Text>
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color="#3498db" style={styles.loader} />
        ) : (
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.commentsList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No comments yet. Be the first to start the discussion.</Text>
              </View>
            }
          />
        )}
        
        <View style={styles.inputContainer}>
          {renderInputAccessory()}
          <View style={styles.commentInputWrapper}>
            <TextInput
              ref={commentInputRef}
              style={styles.commentInput}
              placeholder="Write a comment..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity 
              style={[
                styles.sendButton, 
                (commentText.trim() === '' || submitting) && styles.sendButtonDisabled
              ]}
              onPress={handleSubmitComment}
              disabled={commentText.trim() === '' || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  proposalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  discussionTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsList: {
    padding: 15,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#777',
    textAlign: 'center',
  },
  commentContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  authorName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  commentDate: {
    color: '#888',
    fontSize: 12,
  },
  commentBadge: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  commentBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  actionText: {
    color: '#3498db',
    marginLeft: 5,
    fontSize: 14,
  },
  userActions: {
    flexDirection: 'row',
  },
  repliesContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  replyContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  replyAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  replyAuthorName: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  replyText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    padding: 10,
  },
  inputAccessory: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    display: 'flex',
  },
  inputAccessoryText: {
    color: '#3498db',
    fontSize: 14,
  },
  commentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    backgroundColor: '#f8f8f8',
  },
  sendButton: {
    backgroundColor: '#3498db',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
});

export default DiscussionScreen;