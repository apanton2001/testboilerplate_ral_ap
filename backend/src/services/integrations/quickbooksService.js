'use strict';

const QuickBooks = require('quickbooks-js');
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
  defaultMeta: { service: 'quickbooks-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/integrations.log' })
  ]
});

// QuickBooks API configuration
const QB_CLIENT_ID = process.env.QB_CLIENT_ID;
const QB_CLIENT_SECRET = process.env.QB_CLIENT_SECRET;
const QB_REDIRECT_URI = process.env.QB_REDIRECT_URI;
const QB_ENVIRONMENT = process.env.QB_ENVIRONMENT || 'sandbox'; // 'sandbox' or 'production'

/**
 * Get QuickBooks authorization URL
 * @param {number} userId - User ID
 * @returns {string} Authorization URL
 */
const getAuthorizationUrl = (userId) => {
  try {
    if (!QB_CLIENT_ID || !QB_CLIENT_SECRET || !QB_REDIRECT_URI) {
      throw new Error('QuickBooks API credentials are not configured');
    }

    const qbo = new QuickBooks({
      clientId: QB_CLIENT_ID,
      clientSecret: QB_CLIENT_SECRET,
      redirectUri: QB_REDIRECT_URI,
      environment: QB_ENVIRONMENT
    });

    // Generate a state parameter to prevent CSRF attacks
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    
    return qbo.authUri(state);
  } catch (error) {
    logger.error('Error generating QuickBooks authorization URL', { error: error.message });
    throw error;
  }
};

/**
 * Handle QuickBooks OAuth callback
 * @param {string} code - Authorization code
 * @param {string} state - State parameter
 * @returns {Promise<Object>} OAuth tokens
 */
const handleOAuthCallback = async (code, state) => {
  try {
    if (!code) {
      throw new Error('Authorization code is required');
    }

    // Decode state parameter to get user ID
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
    
    if (!userId) {
      throw new Error('Invalid state parameter');
    }

    const qbo = new QuickBooks({
      clientId: QB_CLIENT_ID,
      clientSecret: QB_CLIENT_SECRET,
      redirectUri: QB_REDIRECT_URI,
      environment: QB_ENVIRONMENT
    });

    // Exchange authorization code for tokens
    const tokens = await qbo.createToken(code);
    
    // Store tokens in the database
    await storeQuickBooksTokens(userId, tokens);
    
    logger.info('QuickBooks OAuth flow completed', { userId });
    return tokens;
  } catch (error) {
    logger.error('Error handling QuickBooks OAuth callback', { error: error.message });
    throw error;
  }
};

/**
 * Store QuickBooks tokens for a user
 * @param {number} userId - User ID
 * @param {Object} tokens - OAuth tokens
 * @returns {Promise<boolean>} Success status
 */
const storeQuickBooksTokens = async (userId, tokens) => {
  try {
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Store tokens in the user's integration_settings
    const integrationSettings = user.integration_settings ? 
      JSON.parse(user.integration_settings) : {};
    
    integrationSettings.quickbooks = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      realmId: tokens.realmId,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      connected: true,
      lastSyncAt: null
    };
    
    await user.update({
      integration_settings: JSON.stringify(integrationSettings)
    });
    
    logger.info('QuickBooks tokens stored', { userId });
    return true;
  } catch (error) {
    logger.error('Error storing QuickBooks tokens', { error: error.message, userId });
    throw error;
  }
};

/**
 * Get QuickBooks client for a user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} QuickBooks client
 */
const getQuickBooksClient = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    if (!user.integration_settings) {
      throw new Error('User has no integration settings');
    }
    
    const integrationSettings = JSON.parse(user.integration_settings);
    
    if (!integrationSettings.quickbooks || !integrationSettings.quickbooks.connected) {
      throw new Error('User is not connected to QuickBooks');
    }
    
    const { accessToken, refreshToken, realmId, expiresAt } = integrationSettings.quickbooks;
    
    // Check if token is expired and refresh if needed
    if (Date.now() >= expiresAt) {
      logger.info('QuickBooks token expired, refreshing', { userId });
      const newTokens = await refreshQuickBooksTokens(userId, refreshToken);
      return getQuickBooksClient(userId); // Recursive call with fresh tokens
    }
    
    const qbo = new QuickBooks({
      clientId: QB_CLIENT_ID,
      clientSecret: QB_CLIENT_SECRET,
      redirectUri: QB_REDIRECT_URI,
      environment: QB_ENVIRONMENT,
      accessToken,
      refreshToken,
      realmId
    });
    
    return qbo;
  } catch (error) {
    logger.error('Error getting QuickBooks client', { error: error.message, userId });
    throw error;
  }
};

/**
 * Refresh QuickBooks tokens
 * @param {number} userId - User ID
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New tokens
 */
const refreshQuickBooksTokens = async (userId, refreshToken) => {
  try {
    const qbo = new QuickBooks({
      clientId: QB_CLIENT_ID,
      clientSecret: QB_CLIENT_SECRET,
      redirectUri: QB_REDIRECT_URI,
      environment: QB_ENVIRONMENT,
      refreshToken
    });
    
    const tokens = await qbo.refreshAccessToken();
    
    // Store new tokens
    await storeQuickBooksTokens(userId, tokens);
    
    logger.info('QuickBooks tokens refreshed', { userId });
    return tokens;
  } catch (error) {
    logger.error('Error refreshing QuickBooks tokens', { error: error.message, userId });
    throw error;
  }
};

/**
 * Disconnect QuickBooks integration
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
const disconnectQuickBooks = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    if (!user.integration_settings) {
      return true; // Already disconnected
    }
    
    const integrationSettings = JSON.parse(user.integration_settings);
    
    if (integrationSettings.quickbooks) {
      // Revoke token if possible
      try {
        if (integrationSettings.quickbooks.accessToken) {
          const qbo = new QuickBooks({
            clientId: QB_CLIENT_ID,
            clientSecret: QB_CLIENT_SECRET,
            redirectUri: QB_REDIRECT_URI,
            environment: QB_ENVIRONMENT,
            accessToken: integrationSettings.quickbooks.accessToken
          });
          
          await qbo.revokeToken();
        }
      } catch (revokeError) {
        logger.warn('Error revoking QuickBooks token', { error: revokeError.message, userId });
        // Continue with disconnection even if revoke fails
      }
      
      // Remove QuickBooks settings
      delete integrationSettings.quickbooks;
      
      await user.update({
        integration_settings: JSON.stringify(integrationSettings)
      });
    }
    
    logger.info('QuickBooks disconnected', { userId });
    return true;
  } catch (error) {
    logger.error('Error disconnecting QuickBooks', { error: error.message, userId });
    throw error;
  }
};

/**
 * Sync invoices to QuickBooks
 * @param {number} userId - User ID
 * @param {Array<number>} invoiceIds - Invoice IDs to sync
 * @returns {Promise<Object>} Sync results
 */
const syncInvoicesToQuickBooks = async (userId, invoiceIds) => {
  try {
    const qbo = await getQuickBooksClient(userId);
    const db = require('../../models');
    const { Invoice, InvoiceLine } = db;
    
    const results = {
      success: [],
      failed: []
    };
    
    for (const invoiceId of invoiceIds) {
      try {
        // Get invoice with lines
        const invoice = await Invoice.findByPk(invoiceId, {
          include: [{
            model: InvoiceLine,
            as: 'lines'
          }]
        });
        
        if (!invoice) {
          throw new Error(`Invoice with ID ${invoiceId} not found`);
        }
        
        // Format invoice for QuickBooks
        const qbInvoice = formatInvoiceForQuickBooks(invoice);
        
        // Create invoice in QuickBooks
        const response = await qbo.createInvoice(qbInvoice);
        
        // Update invoice with QuickBooks ID
        await invoice.update({
          external_id: response.Id,
          last_synced_at: new Date()
        });
        
        results.success.push({
          invoiceId,
          qbInvoiceId: response.Id
        });
        
        logger.info('Invoice synced to QuickBooks', { userId, invoiceId, qbInvoiceId: response.Id });
      } catch (invoiceError) {
        logger.error('Error syncing invoice to QuickBooks', { 
          error: invoiceError.message, 
          userId, 
          invoiceId 
        });
        
        results.failed.push({
          invoiceId,
          error: invoiceError.message
        });
      }
    }
    
    // Update last sync timestamp
    const user = await User.findByPk(userId);
    const integrationSettings = JSON.parse(user.integration_settings);
    integrationSettings.quickbooks.lastSyncAt = new Date().toISOString();
    await user.update({
      integration_settings: JSON.stringify(integrationSettings)
    });
    
    return results;
  } catch (error) {
    logger.error('Error in QuickBooks sync', { error: error.message, userId });
    throw error;
  }
};

/**
 * Format invoice for QuickBooks API
 * @param {Object} invoice - Invoice object
 * @returns {Object} QuickBooks formatted invoice
 */
const formatInvoiceForQuickBooks = (invoice) => {
  // This is a simplified example - actual implementation would be more complex
  // and would need to map fields correctly based on QuickBooks API requirements
  const qbInvoice = {
    DocNumber: invoice.invoice_number,
    CustomerRef: {
      value: "1" // This would need to be mapped to a real QuickBooks customer ID
    },
    TxnDate: invoice.invoice_date,
    Line: invoice.lines.map(line => ({
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: {
          value: "1" // This would need to be mapped to a real QuickBooks item ID
        },
        Qty: line.quantity,
        UnitPrice: line.unit_price
      },
      Amount: line.quantity * line.unit_price,
      Description: line.description
    }))
  };
  
  return qbInvoice;
};

/**
 * Get QuickBooks connection status
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Connection status
 */
const getConnectionStatus = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    if (!user.integration_settings) {
      return { connected: false };
    }
    
    const integrationSettings = JSON.parse(user.integration_settings);
    
    if (!integrationSettings.quickbooks || !integrationSettings.quickbooks.connected) {
      return { connected: false };
    }
    
    return {
      connected: true,
      lastSyncAt: integrationSettings.quickbooks.lastSyncAt,
      expiresAt: integrationSettings.quickbooks.expiresAt
    };
  } catch (error) {
    logger.error('Error getting QuickBooks connection status', { error: error.message, userId });
    throw error;
  }
};

module.exports = {
  getAuthorizationUrl,
  handleOAuthCallback,
  getQuickBooksClient,
  disconnectQuickBooks,
  syncInvoicesToQuickBooks,
  getConnectionStatus
};