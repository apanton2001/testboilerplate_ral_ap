'use strict';

const { Resend } = require('resend');
const winston = require('winston');
const db = require('../models');
const { Notification, User } = db;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'notification-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/notification.log' })
  ]
});

// Initialize Resend for email notifications
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Create a new notification
 * @param {number} userId - User ID
 * @param {string} type - Notification type
 * @param {string} message - Notification message
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Created notification
 */
const createNotification = async (userId, type, message, metadata = {}) => {
  try {
    const notification = await Notification.create({
      user_id: userId,
      type,
      message,
      read: false,
      metadata: JSON.stringify(metadata),
      created_at: new Date()
    });

    logger.info('Notification created', { userId, type, notificationId: notification.id });
    return notification;
  } catch (error) {
    logger.error('Error creating notification', { error: error.message, userId, type });
    throw error;
  }
};

/**
 * Get notifications for a user
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} List of notifications
 */
const getUserNotifications = async (userId, options = {}) => {
  const { limit = 20, offset = 0, includeRead = false } = options;
  
  try {
    const query = {
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit,
      offset
    };
    
    if (!includeRead) {
      query.where.read = false;
    }
    
    const notifications = await Notification.findAll(query);
    
    return notifications;
  } catch (error) {
    logger.error('Error fetching user notifications', { error: error.message, userId });
    throw error;
  }
};

/**
 * Mark notification as read
 * @param {number} notificationId - Notification ID
 * @returns {Promise<boolean>} Success status
 */
const markAsRead = async (notificationId) => {
  try {
    const notification = await Notification.findByPk(notificationId);
    
    if (!notification) {
      throw new Error(`Notification with ID ${notificationId} not found`);
    }
    
    await notification.update({ read: true });
    
    logger.info('Notification marked as read', { notificationId });
    return true;
  } catch (error) {
    logger.error('Error marking notification as read', { error: error.message, notificationId });
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Number of updated notifications
 */
const markAllAsRead = async (userId) => {
  try {
    const result = await Notification.update(
      { read: true },
      { where: { user_id: userId, read: false } }
    );
    
    logger.info('All notifications marked as read', { userId, count: result[0] });
    return result[0]; // Number of updated rows
  } catch (error) {
    logger.error('Error marking all notifications as read', { error: error.message, userId });
    throw error;
  }
};

/**
 * Delete a notification
 * @param {number} notificationId - Notification ID
 * @returns {Promise<boolean>} Success status
 */
const deleteNotification = async (notificationId) => {
  try {
    const notification = await Notification.findByPk(notificationId);
    
    if (!notification) {
      throw new Error(`Notification with ID ${notificationId} not found`);
    }
    
    await notification.destroy();
    
    logger.info('Notification deleted', { notificationId });
    return true;
  } catch (error) {
    logger.error('Error deleting notification', { error: error.message, notificationId });
    throw error;
  }
};

/**
 * Send email notification
 * @param {string} email - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlContent - Email HTML content
 * @returns {Promise<Object>} Email send result
 */
const sendEmailNotification = async (email, subject, htmlContent) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('Resend API key is not configured');
    }

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'notifications@customs-docs.com',
      to: email,
      subject,
      html: htmlContent
    });
    
    logger.info('Email notification sent', { email, subject, id: result.id });
    return result;
  } catch (error) {
    logger.error('Error sending email notification', { error: error.message, email, subject });
    throw error;
  }
};

/**
 * Get user notification preferences
 * @param {number} userId - User ID
 * @returns {Promise<Object>} User notification preferences
 */
const getUserNotificationPreferences = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Assuming notification_preferences is stored as JSON in the User model
    // If not, you may need to create a separate table for notification preferences
    const preferences = user.notification_preferences ? 
      JSON.parse(user.notification_preferences) : 
      getDefaultNotificationPreferences();
    
    return preferences;
  } catch (error) {
    logger.error('Error fetching user notification preferences', { error: error.message, userId });
    throw error;
  }
};

/**
 * Update user notification preferences
 * @param {number} userId - User ID
 * @param {Object} preferences - Notification preferences
 * @returns {Promise<Object>} Updated preferences
 */
const updateNotificationPreferences = async (userId, preferences) => {
  try {
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Validate preferences
    validateNotificationPreferences(preferences);
    
    // Update user preferences
    await user.update({
      notification_preferences: JSON.stringify(preferences)
    });
    
    logger.info('User notification preferences updated', { userId });
    return preferences;
  } catch (error) {
    logger.error('Error updating notification preferences', { error: error.message, userId });
    throw error;
  }
};

/**
 * Get default notification preferences
 * @returns {Object} Default preferences
 */
const getDefaultNotificationPreferences = () => {
  return {
    email: {
      classification_complete: true,
      review_needed: true,
      submission_status: true,
      system_updates: true
    },
    inApp: {
      classification_complete: true,
      review_needed: true,
      submission_status: true,
      system_updates: true,
      daily_digest: true
    }
  };
};

/**
 * Validate notification preferences
 * @param {Object} preferences - Notification preferences to validate
 * @throws {Error} If preferences are invalid
 */
const validateNotificationPreferences = (preferences) => {
  const requiredChannels = ['email', 'inApp'];
  const requiredTypes = [
    'classification_complete',
    'review_needed',
    'submission_status',
    'system_updates'
  ];
  
  // Check if all required channels exist
  for (const channel of requiredChannels) {
    if (!preferences[channel]) {
      throw new Error(`Missing required notification channel: ${channel}`);
    }
    
    // Check if all required notification types exist for this channel
    for (const type of requiredTypes) {
      if (preferences[channel][type] === undefined) {
        throw new Error(`Missing required notification type ${type} for channel ${channel}`);
      }
      
      if (typeof preferences[channel][type] !== 'boolean') {
        throw new Error(`Notification preference for ${type} in channel ${channel} must be a boolean`);
      }
    }
  }
};

/**
 * Notify user about classification completion
 * @param {number} userId - User ID
 * @param {number} invoiceId - Invoice ID
 * @param {Object} classificationData - Classification data
 * @returns {Promise<Object>} Notification result
 */
const notifyClassificationComplete = async (userId, invoiceId, classificationData) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const preferences = await getUserNotificationPreferences(userId);
    const message = `Classification completed for invoice #${invoiceId}`;
    const metadata = { invoiceId, classificationData };
    
    // Create in-app notification if enabled
    if (preferences.inApp.classification_complete) {
      await createNotification(userId, 'classification_complete', message, metadata);
    }
    
    // Send email notification if enabled
    if (preferences.email.classification_complete) {
      const htmlContent = `
        <h1>Classification Completed</h1>
        <p>The classification for invoice #${invoiceId} has been completed.</p>
        <p>Please review the classification results in your dashboard.</p>
      `;
      
      await sendEmailNotification(user.email, 'Classification Completed', htmlContent);
    }
    
    return { success: true };
  } catch (error) {
    logger.error('Error sending classification completion notification', { 
      error: error.message, 
      userId, 
      invoiceId 
    });
    throw error;
  }
};

/**
 * Notify user about review needed
 * @param {number} userId - User ID
 * @param {number} invoiceId - Invoice ID
 * @param {string} reason - Reason for review
 * @returns {Promise<Object>} Notification result
 */
const notifyReviewNeeded = async (userId, invoiceId, reason) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const preferences = await getUserNotificationPreferences(userId);
    const message = `Review needed for invoice #${invoiceId}: ${reason}`;
    const metadata = { invoiceId, reason };
    
    // Create in-app notification if enabled
    if (preferences.inApp.review_needed) {
      await createNotification(userId, 'review_needed', message, metadata);
    }
    
    // Send email notification if enabled
    if (preferences.email.review_needed) {
      const htmlContent = `
        <h1>Review Needed</h1>
        <p>Your invoice #${invoiceId} requires review.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please log in to your account to review the invoice.</p>
      `;
      
      await sendEmailNotification(user.email, 'Review Needed for Your Invoice', htmlContent);
    }
    
    return { success: true };
  } catch (error) {
    logger.error('Error sending review needed notification', { 
      error: error.message, 
      userId, 
      invoiceId 
    });
    throw error;
  }
};

/**
 * Notify user about submission status change
 * @param {number} userId - User ID
 * @param {number} submissionId - Submission ID
 * @param {string} status - New status
 * @param {string} details - Additional details
 * @returns {Promise<Object>} Notification result
 */
const notifySubmissionStatus = async (userId, submissionId, status, details = '') => {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const preferences = await getUserNotificationPreferences(userId);
    const message = `Submission #${submissionId} status updated to: ${status}`;
    const metadata = { submissionId, status, details };
    
    // Create in-app notification if enabled
    if (preferences.inApp.submission_status) {
      await createNotification(userId, 'submission_status', message, metadata);
    }
    
    // Send email notification if enabled
    if (preferences.email.submission_status) {
      const htmlContent = `
        <h1>Submission Status Update</h1>
        <p>Your submission #${submissionId} has been updated to: <strong>${status}</strong></p>
        ${details ? `<p><strong>Details:</strong> ${details}</p>` : ''}
        <p>Please log in to your account for more information.</p>
      `;
      
      await sendEmailNotification(user.email, `Submission Status: ${status}`, htmlContent);
    }
    
    return { success: true };
  } catch (error) {
    logger.error('Error sending submission status notification', { 
      error: error.message, 
      userId, 
      submissionId,
      status 
    });
    throw error;
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendEmailNotification,
  getUserNotificationPreferences,
  updateNotificationPreferences,
  getDefaultNotificationPreferences,
  notifyClassificationComplete,
  notifyReviewNeeded,
  notifySubmissionStatus
};