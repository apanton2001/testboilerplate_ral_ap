'use strict';

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { promisify } = require('util');
const winston = require('winston');
const SftpClient = require('ssh2-sftp-client');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'submission-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/submission.log' })
  ]
});

// ASYCUDA API configuration
const ASYCUDA_API_URL = process.env.ASYCUDA_API_URL || 'https://api.asycuda.customs.gov/v1';
const ASYCUDA_API_KEY = process.env.ASYCUDA_API_KEY;
const ASYCUDA_API_TIMEOUT = parseInt(process.env.ASYCUDA_API_TIMEOUT) || 30000; // 30 seconds

// SFTP configuration
const SFTP_HOST = process.env.SFTP_HOST || 'sftp.customs.gov';
const SFTP_PORT = parseInt(process.env.SFTP_PORT) || 22;
const SFTP_USERNAME = process.env.SFTP_USERNAME;
const SFTP_PASSWORD = process.env.SFTP_PASSWORD;
const SFTP_PRIVATE_KEY = process.env.SFTP_PRIVATE_KEY_PATH;
const SFTP_REMOTE_PATH = process.env.SFTP_REMOTE_PATH || '/incoming/';

// Retry configuration
const MAX_RETRIES = parseInt(process.env.SUBMISSION_MAX_RETRIES) || 3;
const RETRY_DELAY = parseInt(process.env.SUBMISSION_RETRY_DELAY) || 5000; // 5 seconds

/**
 * Submit document to ASYCUDA API
 * @param {String} xmlPath - Path to XML document
 * @param {Number} invoiceId - Invoice ID
 * @returns {Object} Submission result
 */
const submitToAsycudaApi = async (xmlPath, invoiceId) => {
  try {
    if (!ASYCUDA_API_KEY) {
      throw new Error('ASYCUDA API key is not configured');
    }

    // Read XML file
    const xmlContent = await fs.readFile(xmlPath, 'utf8');
    
    // Submit to API
    const response = await axios.post(
      `${ASYCUDA_API_URL}/declarations`,
      { 
        declaration: xmlContent,
        metadata: {
          invoiceId,
          submittedAt: new Date().toISOString()
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ASYCUDA_API_KEY}`,
          'X-Client-Id': 'automated-customs-platform'
        },
        timeout: ASYCUDA_API_TIMEOUT
      }
    );
    
    logger.info('Document submitted to ASYCUDA API successfully', { 
      invoiceId,
      declarationId: response.data.declarationId
    });
    
    return {
      success: true,
      method: 'api',
      response: response.data,
      message: 'Document submitted successfully'
    };
  } catch (error) {
    logger.error('Error submitting to ASYCUDA API', { 
      error: error.message,
      invoiceId,
      response: error.response?.data
    });
    
    throw new Error(`Failed to submit to ASYCUDA API: ${error.message}`);
  }
};

/**
 * Submit document via SFTP
 * @param {String} xmlPath - Path to XML document
 * @param {Number} invoiceId - Invoice ID
 * @returns {Object} Submission result
 */
const submitViaSftp = async (xmlPath, invoiceId) => {
  const sftp = new SftpClient();
  
  try {
    if (!SFTP_USERNAME || (!SFTP_PASSWORD && !SFTP_PRIVATE_KEY)) {
      throw new Error('SFTP credentials are not configured');
    }
    
    // Connect to SFTP server
    const connectConfig = {
      host: SFTP_HOST,
      port: SFTP_PORT,
      username: SFTP_USERNAME
    };
    
    if (SFTP_PRIVATE_KEY) {
      connectConfig.privateKey = await fs.readFile(SFTP_PRIVATE_KEY);
    } else {
      connectConfig.password = SFTP_PASSWORD;
    }
    
    await sftp.connect(connectConfig);
    
    // Generate remote filename
    const filename = path.basename(xmlPath);
    const timestamp = Date.now();
    const remoteFilename = `invoice_${invoiceId}_${timestamp}.xml`;
    const remotePath = path.join(SFTP_REMOTE_PATH, remoteFilename);
    
    // Upload file
    await sftp.put(xmlPath, remotePath);
    
    logger.info('Document submitted via SFTP successfully', { 
      invoiceId,
      remotePath
    });
    
    return {
      success: true,
      method: 'sftp',
      response: {
        remotePath,
        timestamp
      },
      message: 'Document submitted via SFTP successfully'
    };
  } catch (error) {
    logger.error('Error submitting via SFTP', { 
      error: error.message,
      invoiceId
    });
    
    throw new Error(`Failed to submit via SFTP: ${error.message}`);
  } finally {
    try {
      await sftp.end();
    } catch (e) {
      logger.warn('Error closing SFTP connection', { error: e.message });
    }
  }
};

/**
 * Submit document with retry logic
 * @param {String} xmlPath - Path to XML document
 * @param {Number} invoiceId - Invoice ID
 * @returns {Object} Submission result
 */
const submitWithRetry = async (xmlPath, invoiceId) => {
  let lastError;
  
  // Try API submission first
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info('Attempting ASYCUDA API submission', { 
        invoiceId,
        attempt
      });
      
      const result = await submitToAsycudaApi(xmlPath, invoiceId);
      return result;
    } catch (error) {
      lastError = error;
      logger.warn('API submission attempt failed', { 
        invoiceId,
        attempt,
        error: error.message
      });
      
      if (attempt < MAX_RETRIES) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
  
  // Fallback to SFTP if API submission fails
  logger.info('Falling back to SFTP submission', { invoiceId });
  
  try {
    const result = await submitViaSftp(xmlPath, invoiceId);
    return result;
  } catch (error) {
    logger.error('Both API and SFTP submission methods failed', { 
      invoiceId,
      apiError: lastError.message,
      sftpError: error.message
    });
    
    throw new Error(`All submission methods failed. Last error: ${error.message}`);
  }
};

/**
 * Create submission record in database
 * @param {Number} invoiceId - Invoice ID
 * @param {Object} submissionResult - Result from submission attempt
 * @returns {Object} Created submission record
 */
const createSubmissionRecord = async (invoiceId, submissionResult) => {
  try {
    const db = require('../models');
    const { Submission } = db;
    
    const submission = await Submission.create({
      invoice_id: invoiceId,
      method: submissionResult.method,
      status: submissionResult.success ? 'Submitted' : 'Failed',
      response_message: JSON.stringify(submissionResult.response),
      submitted_at: new Date()
    });
    
    logger.info('Submission record created', { 
      invoiceId,
      submissionId: submission.id
    });
    
    return submission;
  } catch (error) {
    logger.error('Error creating submission record', { 
      error: error.message,
      invoiceId
    });
    
    throw new Error(`Failed to create submission record: ${error.message}`);
  }
};

/**
 * Update invoice status after submission
 * @param {Number} invoiceId - Invoice ID
 * @param {String} status - New status
 * @returns {Object} Updated invoice
 */
const updateInvoiceStatus = async (invoiceId, status) => {
  try {
    const db = require('../models');
    const { Invoice } = db;
    
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice with ID ${invoiceId} not found`);
    }
    
    await invoice.update({ status });
    
    logger.info('Invoice status updated', { 
      invoiceId,
      status
    });
    
    return invoice;
  } catch (error) {
    logger.error('Error updating invoice status', { 
      error: error.message,
      invoiceId
    });
    
    throw new Error(`Failed to update invoice status: ${error.message}`);
  }
};

/**
 * Submit documents for an invoice
 * @param {Number} invoiceId - Invoice ID
 * @param {Object} documentPaths - Paths to generated documents
 * @returns {Object} Submission result
 */
const submitDocuments = async (invoiceId, documentPaths) => {
  try {
    if (!documentPaths || !documentPaths.xmlPath) {
      throw new Error('Document paths are required');
    }
    
    // Submit document
    const submissionResult = await submitWithRetry(documentPaths.xmlPath, invoiceId);
    
    // Create submission record
    const submission = await createSubmissionRecord(invoiceId, submissionResult);
    
    // Update invoice status
    await updateInvoiceStatus(invoiceId, 'Submitted');
    
    logger.info('Document submission completed', { 
      invoiceId,
      submissionId: submission.id,
      method: submissionResult.method
    });
    
    return {
      success: true,
      submission,
      method: submissionResult.method,
      message: submissionResult.message
    };
  } catch (error) {
    logger.error('Document submission failed', { 
      error: error.message,
      invoiceId
    });
    
    // Create failed submission record
    await createSubmissionRecord(invoiceId, {
      method: 'failed',
      success: false,
      response: { error: error.message }
    });
    
    throw new Error(`Document submission failed: ${error.message}`);
  }
};

/**
 * Check submission status
 * @param {Number} submissionId - Submission ID
 * @returns {Object} Submission status
 */
const checkSubmissionStatus = async (submissionId) => {
  try {
    const db = require('../models');
    const { Submission } = db;
    
    const submission = await Submission.findByPk(submissionId);
    if (!submission) {
      throw new Error(`Submission with ID ${submissionId} not found`);
    }
    
    // For API submissions, check status with ASYCUDA
    if (submission.method === 'api') {
      try {
        const responseMessage = JSON.parse(submission.response_message);
        const declarationId = responseMessage.declarationId;
        
        if (declarationId) {
          const response = await axios.get(
            `${ASYCUDA_API_URL}/declarations/${declarationId}/status`,
            {
              headers: {
                'Authorization': `Bearer ${ASYCUDA_API_KEY}`,
                'X-Client-Id': 'automated-customs-platform'
              },
              timeout: ASYCUDA_API_TIMEOUT
            }
          );
          
          const status = response.data.status;
          
          // Update submission status
          await submission.update({
            status,
            response_message: JSON.stringify(response.data)
          });
          
          // Update invoice status if needed
          if (status === 'Approved') {
            await updateInvoiceStatus(submission.invoice_id, 'Approved');
          } else if (status === 'Rejected') {
            await updateInvoiceStatus(submission.invoice_id, 'Rejected');
          }
          
          logger.info('Submission status updated', { 
            submissionId,
            status
          });
          
          return {
            success: true,
            status,
            details: response.data
          };
        }
      } catch (error) {
        logger.error('Error checking submission status with ASYCUDA', { 
          error: error.message,
          submissionId
        });
      }
    }
    
    // Return current status from database
    return {
      success: true,
      status: submission.status,
      method: submission.method,
      submittedAt: submission.submitted_at
    };
  } catch (error) {
    logger.error('Error checking submission status', { 
      error: error.message,
      submissionId
    });
    
    throw new Error(`Failed to check submission status: ${error.message}`);
  }
};

module.exports = {
  submitToAsycudaApi,
  submitViaSftp,
  submitDocuments,
  checkSubmissionStatus
};