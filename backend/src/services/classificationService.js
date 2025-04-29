'use strict';

const axios = require('axios');
const redis = require('redis');
const { promisify } = require('util');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'classification-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/classification.log' })
  ]
});

// Initialize Redis client
let redisClient;
let getAsync;
let setexAsync;

// Wrap Redis initialization in an async function to await connection
(async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        // Exponential backoff strategy for reconnection
        reconnectStrategy: (retries) => Math.min(retries * 50 + Math.random() * 100, 3000)
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
      // Potentially implement logic to disable caching if Redis is down persistently
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connecting...');
    });

     redisClient.on('ready', () => {
      logger.info('Redis client ready and connected to server.');
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis client reconnecting...');
    });

    redisClient.on('end', () => {
      logger.warn('Redis client connection ended.');
    });

    // Explicitly connect and wait
    await redisClient.connect();

    // Promisify Redis commands after connection is established
    getAsync = promisify(redisClient.get).bind(redisClient);
    setexAsync = promisify(redisClient.setex).bind(redisClient);
    // Add delAsync if needed for clearClassificationCache
    // delAsync = promisify(redisClient.del).bind(redisClient);

  } catch (error) {
    logger.error('Failed to initialize and connect Redis client', { error: error.message });
    // Ensure redisClient remains undefined or null if connection fails
    redisClient = null;
    getAsync = null;
    setexAsync = null;
  }
})();


// ContextGem API configuration
const CONTEXTGEM_API_URL = process.env.CONTEXTGEM_API_URL || 'https://api.contextgem.com/v1';
const CONTEXTGEM_API_KEY = process.env.CONTEXTGEM_API_KEY;

// Cache TTL in seconds (default: 7 days)
const CACHE_TTL = parseInt(process.env.CLASSIFICATION_CACHE_TTL) || 604800;

// Confidence threshold for flagging uncertain classifications
const CONFIDENCE_THRESHOLD = parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.7;

/**
 * Classify a product description using ContextGem API
 * @param {string} description - Product description
 * @returns {Promise<Object>} Classification result
 */
const classifyProduct = async (description) => {
  if (!description) {
    throw new Error('Product description is required');
  }

  try {
    // Check cache first
    const cacheKey = `classification:${Buffer.from(description).toString('base64')}`;
    
    // Check cache only if client initialized and connected successfully
    if (redisClient && getAsync) { // Check if getAsync is defined (implies connection succeeded)
      try {
        const cachedResult = await getAsync(cacheKey);
        if (cachedResult) {
          logger.info('Classification result found in cache', { description });
          // Ensure the cached result has the expected structure, including 'flagged'
          const parsedResult = JSON.parse(cachedResult);
          if (typeof parsedResult.flagged === 'undefined') {
              parsedResult.flagged = parsedResult.confidence < CONFIDENCE_THRESHOLD;
          }
          return parsedResult;
        }
      } catch (cacheError) {
        logger.warn('Error retrieving from Redis cache', { key: cacheKey, error: cacheError.message });
        // Proceed to API call if cache read fails
      }
    } else {
        logger.warn('Redis client not available, skipping cache check.', { description });
    }

    // If not in cache, cache error, or Redis unavailable, call API
    if (!CONTEXTGEM_API_KEY) {
      throw new Error('ContextGem API key is not configured');
    }

    const response = await axios.post(
      `${CONTEXTGEM_API_URL}/classify`,
      { description },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONTEXTGEM_API_KEY}`
        },
        timeout: 10000 // 10 seconds timeout
      }
    );

    const result = response.data;
    
    // Add confidence flag
    result.flagged = result.confidence < CONFIDENCE_THRESHOLD;
    
    // Cache the result
    // Cache the result only if client initialized and connected successfully
    if (redisClient && setexAsync) { // Check if setexAsync is defined
      try {
        // Ensure result is stringified before caching
        await setexAsync(cacheKey, CACHE_TTL, JSON.stringify(result));
        logger.info('Classification result cached successfully', { description, ttl: CACHE_TTL });
      } catch (cacheError) {
        logger.warn('Error saving classification result to Redis cache', { key: cacheKey, error: cacheError.message });
        // Continue even if caching fails
      }
    } else {
         logger.warn('Redis client not available, skipping caching.', { description });
    }

    return result;
  } catch (error) {
    logger.error('Classification API error', { 
      error: error.message,
      description,
      response: error.response?.data
    });

    // Fallback mechanism
    return {
      hs_code: null,
      confidence: 0,
      flagged: true,
      error: error.message,
      classification_method: 'failed'
    };
  }
};

/**
 * Bulk classify multiple product descriptions
 * @param {Array<Object>} items - Array of items with descriptions
 * @returns {Promise<Array<Object>>} Classification results
 */
const bulkClassify = async (items) => {
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array');
  }

  const results = [];
  
  // Process items in batches to avoid overwhelming the API
  const batchSize = 10;
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map(async (item) => {
      try {
        const result = await classifyProduct(item.description);
        return {
          ...item,
          hs_code: result.hs_code,
          confidence: result.confidence,
          flagged: result.flagged,
          classification_method: 'auto'
        };
      } catch (error) {
        logger.error('Error classifying item in batch', { 
          error: error.message,
          item
        });
        return {
          ...item,
          hs_code: null,
          confidence: 0,
          flagged: true,
          classification_method: 'failed'
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
};

/**
 * Manually override a classification
 * @param {number} invoiceLineId - Invoice line ID
 * @param {string} hsCode - HS code
 * @param {number} userId - User ID who made the change
 * @returns {Promise<Object>} Updated classification
 */
const manualClassify = async (invoiceLineId, hsCode, userId) => {
  const db = require('../models');
  const { InvoiceLine, ClassificationHistory } = db;
  
  try {
    // Get current invoice line
    const invoiceLine = await InvoiceLine.findByPk(invoiceLineId);
    if (!invoiceLine) {
      throw new Error(`Invoice line with ID ${invoiceLineId} not found`);
    }
    
    // Store previous HS code for history
    const previousHsCode = invoiceLine.hs_code;
    
    // Update invoice line with new HS code
    await invoiceLine.update({
      hs_code: hsCode,
      classification_method: 'manual',
      flagged: false
    });
    
    // Create classification history record
    const history = await ClassificationHistory.create({
      invoice_line_id: invoiceLineId,
      previous_hs_code: previousHsCode,
      new_hs_code: hsCode,
      changed_by: userId,
      changed_at: new Date()
    });
    
    logger.info('Manual classification completed', {
      invoiceLineId,
      previousHsCode,
      newHsCode: hsCode,
      userId
    });
    
    return {
      invoiceLine,
      history
    };
  } catch (error) {
    logger.error('Error in manual classification', {
      error: error.message,
      invoiceLineId,
      hsCode,
      userId
    });
    throw error;
  }
};

/**
 * Clear classification cache for a specific description
 * @param {string} description - Product description
 * @returns {Promise<boolean>} Success status
 */
const clearClassificationCache = async (description) => {
  // Check cache only if client initialized and connected successfully
  if (redisClient) { // No need to check getAsync/setexAsync here, just the client existence
     const delAsync = promisify(redisClient.del).bind(redisClient); // Promisify DEL here or globally
     if (delAsync) {
        try {
            const cacheKey = `classification:${Buffer.from(description).toString('base64')}`;
            const result = await delAsync(cacheKey);
            if (result > 0) {
                logger.info('Classification cache cleared successfully', { description });
                return true;
            } else {
                 logger.info('Classification cache key not found for clearing', { description });
                 return false; // Key didn't exist, arguably success=false
            }
        } catch (error) {
            logger.error('Error clearing classification cache from Redis', { description, error: error.message });
            return false;
        }
     } else {
         logger.error('Failed to promisify redisClient.del');
         return false;
     }
  } else {
    logger.warn('Redis client not available, cannot clear cache');
    return false;
  }
};

module.exports = {
  classifyProduct,
  bulkClassify,
  manualClassify,
  clearClassificationCache
};