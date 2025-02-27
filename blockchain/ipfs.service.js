// ipfs.service.js
import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';

class IPFSService {
  constructor() {
    // Configure IPFS client - using Infura's IPFS gateway by default
    this.ipfs = create({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https',
      headers: {
        authorization: 'Basic ' + Buffer.from(
          process.env.IPFS_PROJECT_ID + ':' + process.env.IPFS_PROJECT_SECRET
        ).toString('base64')
      }
    });
  }

  /**
   * Add a file to IPFS
   * @param {File} file - The file to upload
   * @returns {Promise<Object>} - IPFS result with path (hash)
   */
  async addFile(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const result = await this.ipfs.add(buffer, {
        progress: (prog) => console.log(`Upload progress: ${prog}`)
      });
      
      console.log('File uploaded to IPFS with hash:', result.path);
      return result;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw error;
    }
  }

  /**
   * Add multiple files to IPFS
   * @param {File[]} files - Array of files to upload
   * @returns {Promise<Object>} - IPFS directory result
   */
  async addFiles(files) {
    try {
      const fileObjects = [];
      
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        fileObjects.push({
          path: file.name,
          content: buffer
        });
      }
      
      // Create a directory containing all files
      const results = [];
      for await (const result of this.ipfs.addAll(fileObjects)) {
        results.push(result);
      }
      
      // Return the last result (the directory hash)
      const directoryResult = results[results.length - 1];
      console.log('Files uploaded to IPFS with directory hash:', directoryResult.path);
      
      return directoryResult;
    } catch (error) {
      console.error('Error uploading multiple files to IPFS:', error);
      throw error;
    }
  }

  /**
   * Add JSON data to IPFS
   * @param {Object} jsonData - The JSON data to store
   * @returns {Promise<Object>} - IPFS result with path (hash)
   */
  async addJSON(jsonData) {
    try {
      const jsonString = JSON.stringify(jsonData);
      const buffer = Buffer.from(jsonString);
      
      const result = await this.ipfs.add(buffer);
      console.log('JSON uploaded to IPFS with hash:', result.path);
      
      return result;
    } catch (error) {
      console.error('Error uploading JSON to IPFS:', error);
      throw error;
    }
  }

  /**
   * Get content from IPFS by hash
   * @param {string} ipfsHash - The IPFS hash (CID)
   * @returns {Promise<Uint8Array>} - The file content
   */
  async getContent(ipfsHash) {
    try {
      const chunks = [];
      for await (const chunk of this.ipfs.cat(ipfsHash)) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Error getting content from IPFS:', error);
      throw error;
    }
  }

  /**
   * Get and parse JSON content from IPFS
   * @param {string} ipfsHash - The IPFS hash (CID)
   * @returns {Promise<Object>} - The parsed JSON object
   */
  async getJSON(ipfsHash) {
    try {
      const content = await this.getContent(ipfsHash);
      return JSON.parse(content.toString());
    } catch (error) {
      console.error('Error getting JSON from IPFS:', error);
      throw error;
    }
  }

  /**
   * Get a gateway URL for an IPFS hash
   * @param {string} ipfsHash - The IPFS hash (CID)
   * @returns {string} - Public gateway URL
   */
  getGatewayUrl(ipfsHash) {
    return `https://ipfs.io/ipfs/${ipfsHash}`;
  }
}

// Create and export singleton
const ipfsService = new IPFSService();
export default ipfsService;