// client/screens/proposals/CreateProposalScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import proposalService from '../../services/proposalService';

const CreateProposalScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: {
      city: '',
      region: '',
      country: ''
    },
    documents: []
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (name, value) => {
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'text/plain', 'image/*'],
        copyToCacheDirectory: true
      });
      
      if (result.type === 'success') {
        const newDocument = {
          title: result.name,
          fileUrl: result.uri, // In a real app, you'd upload this to your server
          fileType: result.mimeType
        };
        
        setFormData({
          ...formData,
          documents: [...formData.documents, newDocument]
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select document');
    }
  };

  const removeDocument = (index) => {
    const updatedDocs = [...formData.documents];
    updatedDocs.splice(index, 1);
    setFormData({
      ...formData,
      documents: updatedDocs
    });
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.title || !formData.description || !formData.category) {
      return Alert.alert('Error', 'Please fill all required fields');
    }

    try {
      setLoading(true);
      // In a real app, you would upload documents first, then create the proposal with the file URLs
      await proposalService.createProposal(formData);
      setLoading(false);
      Alert.alert(
        'Success',
        'Your proposal has been submitted for review',
        [{ text: 'OK', onPress: () => navigation.navigate('ProposalsList') }]
      );
    } catch (error) {
      setLoading(false);
      Alert.alert('Submission Failed', error.message || 'Could not submit proposal');
    }
  };

  const categories = [
    'Environment', 
    'Infrastructure', 
    'Education', 
    'Healthcare', 
    'Public Safety', 
    'Economy', 
    'Housing', 
    'Transportation', 
    'Culture', 
    'Other'
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
    >
      <ScrollView style={styles.container}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Create New Proposal</Text>
          <Text style={styles.subtitle}>Share your ideas to improve your community</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter a clear, descriptive title"
              value={formData.title}
              onChangeText={(value) => handleChange('title', value)}
              maxLength={100}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.category}
                onValueChange={(value) => handleChange('category', value)}
                style={styles.picker}
              >
                <Picker.Item label="Select a category" value="" />
                {categories.map((category, index) => (
                  <Picker.Item key={index} label={category} value={category} />
                ))}
              </Picker>
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe your proposal in detail. Include the problem you're addressing and your proposed solution."
              multiline
              numberOfLines={10}
              value={formData.description}
              onChangeText={(value) => handleChange('description', value)}
              maxLength={5000}
            />
          </View>
          
          <Text style={styles.sectionTitle}>Location</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              placeholder="City"
              value={formData.location.city}
              onChangeText={(value) => handleChange('location.city', value)}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Region/State</Text>
            <TextInput
              style={styles.input}
              placeholder="Region or State"
              value={formData.location.region}
              onChangeText={(value) => handleChange('location.region', value)}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Country</Text>
            <TextInput
              style={styles.input}
              placeholder="Country"
              value={formData.location.country}
              onChangeText={(value) => handleChange('location.country', value)}
            />
          </View>
          
          <Text style={styles.sectionTitle}>Supporting Documents</Text>
          
          <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
            <Text style={styles.uploadButtonText}>+ Add Document</Text>
          </TouchableOpacity>
          
          {formData.documents.length > 0 && (
            <View style={styles.documentsList}>
              {formData.documents.map((doc, index) => (
                <View key={index} style={styles.documentItem}>
                  <Text style={styles.documentTitle} numberOfLines={1}>
                    {doc.title}
                  </Text>
                  <TouchableOpacity onPress={() => removeDocument(index)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Submitting...' : 'Submit Proposal'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#444',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#fff',
    height: 50,
    borderRadius: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingTop: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    height: 200,
    textAlignVertical: 'top',
  },
  uploadButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#3498db',
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  uploadButtonText: {
    color: '#3498db',
    fontSize: 16,
  },
  documentsList: {
    marginBottom: 15,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  documentTitle: {
    flex: 1,
    fontSize: 14,
  },
  removeText: {
    color: '#e74c3c',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#3498db',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreateProposalScreen;