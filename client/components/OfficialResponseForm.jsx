// client/src/components/responses/OfficialResponseForm.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormLabel,
  Grid,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  Chip,
  Divider,
  CircularProgress
} from '@mui/material';
import { Editor } from '@tinymce/tinymce-react';
import FileUpload from '../common/FileUpload';
import { getProposal } from '../../services/proposalService';
import { createOfficialResponse, updateOfficialResponse } from '../../services/responseService';

const OfficialResponseForm = ({ existingResponse = null }) => {
  const { proposalId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [attachments, setAttachments] = useState(existingResponse?.attachments || []);
  
  const [formData, setFormData] = useState({
    status: existingResponse?.status || 'under_review',
    response: existingResponse?.response || '',
    rationale: existingResponse?.rationale || '',
    nextSteps: existingResponse?.nextSteps || '',
    department: existingResponse?.department || '',
    position: existingResponse?.position || '',
    isVerified: existingResponse?.isVerified || false
  });

  useEffect(() => {
    const fetchProposal = async () => {
      setLoading(true);
      try {
        const data = await getProposal(proposalId);
        setProposal(data);
      } catch (err) {
        setError(err.message || 'Error fetching proposal');
      } finally {
        setLoading(false);
      }
    };

    if (proposalId) {
      fetchProposal();
    }
  }, [proposalId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditorChange = (name, content) => {
    setFormData((prev) => ({
      ...prev,
      [name]: content
    }));
  };

  const handleAttachmentUpload = (files) => {
    const newAttachments = Array.from(files).map(file => ({
      title: file.name,
      fileUrl: URL.createObjectURL(file),
      fileType: file.type
    }));
    
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.response || !formData.department || !formData.position) {
      setError('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    setError(null);
    
    try {
      const submitData = {
        ...formData,
        attachments
      };
      
      if (existingResponse) {
        await updateOfficialResponse(existingResponse._id, submitData);
      } else {
        await createOfficialResponse(proposalId, submitData);
      }
      
      setSuccess(true);
      setTimeout(() => {
        navigate(`/proposals/${proposalId}`);
      }, 2000);
    } catch (err) {
      setError(err.message || 'Error submitting response');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>Response submitted successfully!</Alert>}
        
        {proposal && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" color="text.secondary">Responding to:</Typography>
            <Typography variant="h5" gutterBottom>{proposal.title}</Typography>
            <Chip 
              label={proposal.category} 
              size="small" 
              color="primary" 
              variant="outlined" 
              sx={{ mr: 1 }} 
            />
            <Chip 
              label={`Status: ${proposal.status}`} 
              size="small" 
              color="secondary" 
              variant="outlined" 
            />
          </Box>
        )}
        
        <Divider sx={{ mb: 4 }} />
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <FormLabel>Department</FormLabel>
                <TextField 
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="Your government department"
                  required
                />
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <FormLabel>Position</FormLabel>
                <TextField 
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="Your official position"
                  required
                />
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <FormLabel>Response Status</FormLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                >
                  <MenuItem value="under_review">Under Review</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="partially_approved">Partially Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="deferred">Deferred</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <FormLabel>Official Response</FormLabel>
                <Editor
                  apiKey="your-tinymce-api-key"
                  value={formData.response}
                  init={{
                    height: 300,
                    menubar: false,
                    plugins: [
                      'advlist autolink lists link image charmap print preview anchor',
                      'searchreplace visualblocks code fullscreen',
                      'insertdatetime media table paste code help wordcount'
                    ],
                    toolbar:
                      'undo redo | formatselect | bold italic backcolor | \
                      alignleft aligncenter alignright alignjustify | \
                      bullist numlist outdent indent | removeformat | help'
                  }}
                  onEditorChange={(content) => handleEditorChange('response', content)}
                />
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <FormLabel>Rationale</FormLabel>
                <Editor
                  apiKey="your-tinymce-api-key"
                  value={formData.rationale}
                  init={{
                    height: 200,
                    menubar: false,
                    plugins: ['advlist autolink lists link charmap searchreplace'],
                    toolbar: 'undo redo | formatselect | bold italic | bullist numlist'
                  }}
                  onEditorChange={(content) => handleEditorChange('rationale', content)}
                />
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <FormLabel>Next Steps</FormLabel>
                <Editor
                  apiKey="your-tinymce-api-key"
                  value={formData.nextSteps}
                  init={{
                    height: 200,
                    menubar: false,
                    plugins: ['advlist autolink lists link charmap searchreplace'],
                    toolbar: 'undo redo | formatselect | bold italic | bullist numlist'
                  }}
                  onEditorChange={(content) => handleEditorChange('nextSteps', content)}
                />
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <FormLabel>Supporting Documents</FormLabel>
                <FileUpload 
                  onUpload={handleAttachmentUpload}
                  accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                  multiple
                />
                
                {attachments.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Attachments ({attachments.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {attachments.map((file, index) => (
                        <Chip
                          key={index}
                          label={file.title}
                          onDelete={() => handleRemoveAttachment(index)}
                          sx={{ mb: 1 }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl>
                <FormLabel>Blockchain Verification</FormLabel>
                <Select
                  name="isVerified"
                  value={formData.isVerified}
                  onChange={handleChange}
                >
                  <MenuItem value={true}>Verify on blockchain</MenuItem>
                  <MenuItem value={false}>No blockchain verification</MenuItem>
                </Select>
                <Typography variant="caption" color="text.secondary">
                  Blockchain verification adds an immutable record of this response to the public ledger.
                </Typography>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Button 
                variant="outlined" 
                onClick={() => navigate(-1)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                    Submitting...
                  </>
                ) : existingResponse ? 'Update Response' : 'Submit Response'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  );
};

export default OfficialResponseForm;