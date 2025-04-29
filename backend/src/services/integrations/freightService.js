'use strict';

const axios = require('axios');
const winston = require('winston');
const db = require('../../models');
const { User } = db;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'freight-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/integrations.log' })
  ]
});

// Supported freight forwarders
const SUPPORTED_FORWARDERS = {
  FLEXPORT: {
    name: 'Flexport',
    baseUrl: process.env.FLEXPORT_API_URL || 'https://api.flexport.com',
    authType: 'bearer'
  },
  KUEHNE_NAGEL: {
    name: 'Kuehne+Nagel',
    baseUrl: process.env.KUEHNE_NAGEL_API_URL || 'https://api.kuehne-nagel.com',
    authType: 'basic'
  },
  DHL: {
    name: 'DHL',
    baseUrl: process.env.DHL_API_URL || 'https://api.dhl.com',
    authType: 'apikey'
  }
};

/**
 * Connect to a freight forwarder
 * @param {number} userId - User ID
 * @param {string} forwarder - Forwarder code (e.g., 'FLEXPORT')
 * @param {Object} credentials - API credentials
 * @returns {Promise<Object>} Connection result
 */
const connectFreightForwarder = async (userId, forwarder, credentials) => {
  try {
    if (!SUPPORTED_FORWARDERS[forwarder]) {
      throw new Error(`Unsupported freight forwarder: ${forwarder}`);
    }

    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Validate credentials based on forwarder
    validateCredentials(forwarder, credentials);
    
    // Test connection
    await testConnection(forwarder, credentials);
    
    // Store credentials
    const integrationSettings = user.integration_settings ? 
      JSON.parse(user.integration_settings) : {};
    
    if (!integrationSettings.freightForwarders) {
      integrationSettings.freightForwarders = {};
    }
    
    integrationSettings.freightForwarders[forwarder] = {
      connected: true,
      connectedAt: new Date().toISOString(),
      credentials: encryptCredentials(credentials)
    };
    
    await user.update({
      integration_settings: JSON.stringify(integrationSettings)
    });
    
    logger.info('Freight forwarder connected', { userId, forwarder });
    
    return {
      success: true,
      forwarder: SUPPORTED_FORWARDERS[forwarder].name,
      connectedAt: integrationSettings.freightForwarders[forwarder].connectedAt
    };
  } catch (error) {
    logger.error('Error connecting freight forwarder', { 
      error: error.message, 
      userId, 
      forwarder 
    });
    throw error;
  }
};

/**
 * Validate freight forwarder credentials
 * @param {string} forwarder - Forwarder code
 * @param {Object} credentials - API credentials
 * @throws {Error} If credentials are invalid
 */
const validateCredentials = (forwarder, credentials) => {
  switch (forwarder) {
    case 'FLEXPORT':
      if (!credentials.apiToken) {
        throw new Error('Flexport API token is required');
      }
      break;
    case 'KUEHNE_NAGEL':
      if (!credentials.username || !credentials.password) {
        throw new Error('Kuehne+Nagel username and password are required');
      }
      break;
    case 'DHL':
      if (!credentials.apiKey) {
        throw new Error('DHL API key is required');
      }
      break;
    default:
      throw new Error(`Unsupported freight forwarder: ${forwarder}`);
  }
};

/**
 * Test connection to freight forwarder
 * @param {string} forwarder - Forwarder code
 * @param {Object} credentials - API credentials
 * @returns {Promise<boolean>} Connection success
 */
const testConnection = async (forwarder, credentials) => {
  try {
    const config = SUPPORTED_FORWARDERS[forwarder];
    let headers = {};
    
    switch (config.authType) {
      case 'bearer':
        headers = {
          'Authorization': `Bearer ${credentials.apiToken}`
        };
        break;
      case 'basic':
        const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
        headers = {
          'Authorization': `Basic ${auth}`
        };
        break;
      case 'apikey':
        headers = {
          'API-Key': credentials.apiKey
        };
        break;
    }
    
    // This is a simplified test - in a real implementation, you would call
    // a specific endpoint to validate the connection
    const response = await axios.get(`${config.baseUrl}/api/status`, {
      headers,
      timeout: 10000
    });
    
    return response.status === 200;
  } catch (error) {
    logger.error('Error testing freight forwarder connection', { 
      error: error.message, 
      forwarder 
    });
    
    // In a real implementation, you might want to provide more specific error messages
    // based on the API response
    throw new Error(`Failed to connect to ${SUPPORTED_FORWARDERS[forwarder].name}: ${error.message}`);
  }
};

/**
 * Encrypt sensitive credentials
 * @param {Object} credentials - API credentials
 * @returns {Object} Encrypted credentials
 */
const encryptCredentials = (credentials) => {
  // In a real implementation, you would encrypt sensitive data
  // For this example, we'll just return the credentials as-is
  // with a note that they should be encrypted
  return {
    ...credentials,
    _note: 'These credentials should be encrypted in a production environment'
  };
};

/**
 * Decrypt sensitive credentials
 * @param {Object} encryptedCredentials - Encrypted API credentials
 * @returns {Object} Decrypted credentials
 */
const decryptCredentials = (encryptedCredentials) => {
  // In a real implementation, you would decrypt sensitive data
  // For this example, we'll just return the credentials as-is
  const credentials = { ...encryptedCredentials };
  delete credentials._note;
  return credentials;
};

/**
 * Disconnect from a freight forwarder
 * @param {number} userId - User ID
 * @param {string} forwarder - Forwarder code
 * @returns {Promise<boolean>} Success status
 */
const disconnectFreightForwarder = async (userId, forwarder) => {
  try {
    if (!SUPPORTED_FORWARDERS[forwarder]) {
      throw new Error(`Unsupported freight forwarder: ${forwarder}`);
    }

    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    if (!user.integration_settings) {
      return true; // Already disconnected
    }
    
    const integrationSettings = JSON.parse(user.integration_settings);
    
    if (integrationSettings.freightForwarders && 
        integrationSettings.freightForwarders[forwarder]) {
      delete integrationSettings.freightForwarders[forwarder];
      
      await user.update({
        integration_settings: JSON.stringify(integrationSettings)
      });
    }
    
    logger.info('Freight forwarder disconnected', { userId, forwarder });
    return true;
  } catch (error) {
    logger.error('Error disconnecting freight forwarder', { 
      error: error.message, 
      userId, 
      forwarder 
    });
    throw error;
  }
};

/**
 * Get freight forwarder connection status
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Connection status for all forwarders
 */
const getConnectionStatus = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    if (!user.integration_settings) {
      return { connected: false, forwarders: {} };
    }
    
    const integrationSettings = JSON.parse(user.integration_settings);
    
    if (!integrationSettings.freightForwarders) {
      return { connected: false, forwarders: {} };
    }
    
    const forwarders = {};
    let anyConnected = false;
    
    for (const [code, forwarder] of Object.entries(SUPPORTED_FORWARDERS)) {
      if (integrationSettings.freightForwarders[code] && 
          integrationSettings.freightForwarders[code].connected) {
        forwarders[code] = {
          name: forwarder.name,
          connected: true,
          connectedAt: integrationSettings.freightForwarders[code].connectedAt
        };
        anyConnected = true;
      } else {
        forwarders[code] = {
          name: forwarder.name,
          connected: false
        };
      }
    }
    
    return {
      connected: anyConnected,
      forwarders
    };
  } catch (error) {
    logger.error('Error getting freight forwarder connection status', { 
      error: error.message, 
      userId 
    });
    throw error;
  }
};

/**
 * Get shipment status from freight forwarder
 * @param {number} userId - User ID
 * @param {string} forwarder - Forwarder code
 * @param {string} trackingNumber - Shipment tracking number
 * @returns {Promise<Object>} Shipment status
 */
const getShipmentStatus = async (userId, forwarder, trackingNumber) => {
  try {
    if (!SUPPORTED_FORWARDERS[forwarder]) {
      throw new Error(`Unsupported freight forwarder: ${forwarder}`);
    }

    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    if (!user.integration_settings) {
      throw new Error('User has no integration settings');
    }
    
    const integrationSettings = JSON.parse(user.integration_settings);
    
    if (!integrationSettings.freightForwarders || 
        !integrationSettings.freightForwarders[forwarder] ||
        !integrationSettings.freightForwarders[forwarder].connected) {
      throw new Error(`User is not connected to ${SUPPORTED_FORWARDERS[forwarder].name}`);
    }
    
    const credentials = decryptCredentials(integrationSettings.freightForwarders[forwarder].credentials);
    const config = SUPPORTED_FORWARDERS[forwarder];
    let headers = {};
    
    switch (config.authType) {
      case 'bearer':
        headers = {
          'Authorization': `Bearer ${credentials.apiToken}`
        };
        break;
      case 'basic':
        const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
        headers = {
          'Authorization': `Basic ${auth}`
        };
        break;
      case 'apikey':
        headers = {
          'API-Key': credentials.apiKey
        };
        break;
    }
    
    // Call the freight forwarder API to get shipment status
    const response = await axios.get(
      `${config.baseUrl}/api/shipments/${trackingNumber}`,
      {
        headers,
        timeout: 10000
      }
    );
    
    logger.info('Shipment status retrieved', { userId, forwarder, trackingNumber });
    
    // Process and normalize the response based on the forwarder
    return normalizeShipmentStatus(forwarder, response.data);
  } catch (error) {
    logger.error('Error getting shipment status', { 
      error: error.message, 
      userId, 
      forwarder,
      trackingNumber
    });
    throw error;
  }
};

/**
 * Normalize shipment status from different forwarders
 * @param {string} forwarder - Forwarder code
 * @param {Object} data - API response data
 * @returns {Object} Normalized shipment status
 */
const normalizeShipmentStatus = (forwarder, data) => {
  // This is a simplified example - in a real implementation, you would
  // map the different API responses to a common format
  switch (forwarder) {
    case 'FLEXPORT':
      return {
        trackingNumber: data.tracking_number,
        status: data.status,
        estimatedDelivery: data.estimated_delivery_date,
        currentLocation: data.current_location,
        events: data.events.map(event => ({
          timestamp: event.timestamp,
          location: event.location,
          description: event.description
        }))
      };
    case 'KUEHNE_NAGEL':
      return {
        trackingNumber: data.shipmentId,
        status: data.shipmentStatus,
        estimatedDelivery: data.eta,
        currentLocation: data.currentLocation,
        events: data.statusHistory.map(event => ({
          timestamp: event.timestamp,
          location: event.location,
          description: event.statusDescription
        }))
      };
    case 'DHL':
      return {
        trackingNumber: data.trackingNumber,
        status: data.status,
        estimatedDelivery: data.estimatedTimeOfDelivery,
        currentLocation: data.currentLocation.address,
        events: data.events.map(event => ({
          timestamp: event.timestamp,
          location: event.location.address,
          description: event.description
        }))
      };
    default:
      throw new Error(`Unsupported freight forwarder: ${forwarder}`);
  }
};

/**
 * Get supported freight forwarders
 * @returns {Object} Supported forwarders
 */
const getSupportedForwarders = () => {
  return Object.entries(SUPPORTED_FORWARDERS).map(([code, forwarder]) => ({
    code,
    name: forwarder.name
  }));
};

module.exports = {
  connectFreightForwarder,
  disconnectFreightForwarder,
  getConnectionStatus,
  getShipmentStatus,
  getSupportedForwarders
};