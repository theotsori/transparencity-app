const mockComments = [
    { _id: '1', text: 'Great proposal!', author: { _id: 'userId', fullName: 'Test User' }, createdAt: new Date() }
  ];
  
  export default {
    getCommentsForProposal: async () => mockComments,
    addComment: async (proposalId, comment) => {
      const newComment = { _id: Date.now().toString(), ...comment, author: { _id: 'userId', fullName: 'Test User' }, createdAt: new Date() };
      mockComments.push(newComment);
      return newComment;
    },
    updateComment: async (commentId, updates) => {
      const comment = mockComments.find(c => c._id === commentId);
      if (comment) {
        Object.assign(comment, updates);
        return comment;
      }
      throw new Error('Comment not found');
    },
    deleteComment: async (commentId) => {
      const index = mockComments.findIndex(c => c._id === commentId);
      if (index !== -1) mockComments.splice(index, 1);
    },
};
