'use strict';

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const auth = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation'); // Import validation handler
const notificationService = require('../services/notificationService');
const db = require('../models'); // Required for User model in test route
const { User, Notification } = db; // Import Notification model for direct checks

// --- Swagger Definitions ---

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         type:
 *           type: string
 *           description: Type of notification (e.g., 'submission_accepted', 'review_required').
 *         message:
 *           type: string
 *           description: Notification message content.
 *         is_read:
 *           type: boolean
 *           description: Whether the notification has been read by the user.
 *         related_entity_id:
 *           type: integer
 *           description: ID of the related entity (e.g., invoice ID, submission ID).
 *         related_entity_type:
 *           type: string
 *           description: Type of the related entity (e.g., 'invoice', 'submission').
 *         created_at:
 *           type: string
 *           format: date-time
 *     NotificationPreferences:
 *       type: object
 *       description: User's notification preferences (structure depends on implementation).
 *       properties:
 *         email_on_submission_status:
 *           type: boolean
 *         email_on_review_required:
 *           type: boolean
 *         # Add other preference keys as needed
 *       example:
 *         email_on_submission_status: true
 *         email_on_review_required: false
 *   parameters:
 *     notificationIdParam:
 *       in: path
 *       name: id
 *       schema:
 *         type: integer
 *       required: true
 *       description: Numeric ID of the notification.
 *     includeReadParam:
 *       in: query
 *       name: includeRead
 *       schema:
 *         type: boolean
 *         default: false
 *       description: Whether to include already read notifications in the list.
 */

// --- Routes ---

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Retrieve notifications for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/paginationLimit'
 *       - $ref: '#/components/parameters/paginationOffset'
 *       - $ref: '#/components/parameters/includeReadParam'
 *     responses:
 *       200:
 *         description: A list of notifications.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 notifications: # Assuming service returns { count, rows }
 *                   type: object
 *                   properties:
 *                      count:
 *                          type: integer
 *                      rows:
 *                          type: array
 *                          items:
 *                              $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation Error (Invalid query parameters)
 *       500:
 *         description: Server Error
 */
router.get('/', [
  auth,
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100').toInt(),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer').toInt(),
  query('includeRead').optional().isBoolean().withMessage('includeRead must be a boolean').toBoolean(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const userId = req.user.id;
    // Use validated/sanitized query parameters
    const options = {
      limit: req.query.limit || 20, // Default limit
      offset: req.query.offset || 0,
      includeRead: req.query.includeRead || false // Default to false
    };

    // Service should handle fetching based on userId and options
    const result = await notificationService.getUserNotifications(userId, options);

    return res.json({
      success: true,
      notifications: result // Expect { count, rows } from service
    });
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /notifications/{id}/read:
 *   put:
 *     summary: Mark a specific notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/notificationIdParam'
 *     responses:
 *       200:
 *         description: Notification marked as read successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found or access denied
 *       422:
 *         description: Validation Error (Invalid ID format)
 *       500:
 *         description: Server Error
 */
router.put('/:id/read', [
  auth,
  param('id').isInt({ gt: 0 }).withMessage('Notification ID must be a positive integer').toInt(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const notificationId = req.params.id; // Use sanitized ID
    const userId = req.user.id;

    // Service should handle verifying ownership and marking as read
    const success = await notificationService.markAsRead(notificationId, userId);

    if (!success) {
        // If service returns false, it means notification wasn't found or didn't belong to user
        return res.status(404).json({ message: 'Notification not found or access denied' });
    }

    return res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
     // Handle potential specific errors from service if needed
    next(error); // Pass other errors to centralized handler
  }
});

/**
 * @swagger
 * /notifications/read-all:
 *   put:
 *     summary: Mark all unread notifications for the user as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All unread notifications marked as read.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "5 notifications marked as read"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server Error
 */
router.put('/read-all', [
  auth
  // No validation needed here
], async (req, res, next) => { // Added next
  try {
    const userId = req.user.id;
    const count = await notificationService.markAllAsRead(userId); // Service handles the logic

    return res.json({
      success: true,
      message: `${count} notifications marked as read`
    });
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Delete a specific notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/notificationIdParam'
 *     responses:
 *       200:
 *         description: Notification deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found or access denied
 *       422:
 *         description: Validation Error (Invalid ID format)
 *       500:
 *         description: Server Error
 */
router.delete('/:id', [
  auth,
  param('id').isInt({ gt: 0 }).withMessage('Notification ID must be a positive integer').toInt(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const notificationId = req.params.id; // Use sanitized ID
    const userId = req.user.id;

    // Service should handle verifying ownership and deleting
    const success = await notificationService.deleteNotification(notificationId, userId);

     if (!success) {
        // If service returns false, it means notification wasn't found or didn't belong to user
        return res.status(404).json({ message: 'Notification not found or access denied' });
    }

    return res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
     // Handle potential specific errors from service if needed
    next(error); // Pass other errors to centralized handler
  }
});

/**
 * @swagger
 * /notifications/preferences:
 *   get:
 *     summary: Retrieve the authenticated user's notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's notification preferences.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 preferences:
 *                   $ref: '#/components/schemas/NotificationPreferences'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server Error
 */
router.get('/preferences', [
  auth
  // No validation needed
], async (req, res, next) => { // Added next
  try {
    const userId = req.user.id;
    const preferences = await notificationService.getUserNotificationPreferences(userId);

    return res.json({
      success: true,
      preferences
    });
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /notifications/preferences:
 *   put:
 *     summary: Update the authenticated user's notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationPreferences'
 *     responses:
 *       200:
 *         description: Notification preferences updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 preferences:
 *                   $ref: '#/components/schemas/NotificationPreferences' # Return updated preferences
 *       400:
 *         description: Bad Request (Invalid preferences format/keys)
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation Error (Preferences not an object)
 *       500:
 *         description: Server Error
 */
router.put('/preferences', [
  auth,
  // Add more specific validation if the structure of 'preferences' is known
  body('preferences').isObject().withMessage('Preferences must be an object'),
  // Example: body('preferences.email_on_submission_status').optional().isBoolean(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const userId = req.user.id;
    const { preferences } = req.body; // Use validated preferences object

    // Add sanitization/validation for specific preference keys within the service if needed
    const updatedPreferences = await notificationService.updateNotificationPreferences(userId, preferences);

    return res.json({
      success: true,
      preferences: updatedPreferences
    });
  } catch (error) {
     // Handle potential validation errors from the service (e.g., invalid keys)
     if (error.message.includes('Invalid preference key')) {
         return res.status(400).json({ message: error.message });
     }
    next(error); // Pass other errors to centralized handler
  }
});

/**
 * @swagger
 * /notifications/test-email:
 *   post:
 *     summary: Send a test email notification to the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test email sent successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found (should not happen if auth middleware works)
 *       500:
 *         description: Server Error sending email.
 */
router.post('/test-email', [
  auth
  // No validation needed
], async (req, res, next) => { // Added next
  try {
    const userId = req.user.id;

    // Fetch user email securely
    const user = await User.findByPk(userId, { attributes: ['email'] });
    if (!user || !user.email) {
        // This case should ideally be prevented by the auth middleware
        const error = new Error('User not found or email missing');
        error.status = 404; // Or 500 if this indicates an internal issue
        throw error;
    }

    // Use a dedicated method in the service if possible, otherwise construct here
    await notificationService.sendEmailNotification(
      user.email,
      'Test Email Notification',
      `<h1>Test Email Notification</h1><p>This is a test email notification from the Customs Documentation Platform.</p><p>If you received this email, your email notifications are working correctly.</p>` // Consider using templates
    );

    return res.json({
      success: true,
      message: 'Test email sent successfully'
    });
  } catch (error) {
    // Log the specific email sending error
    console.error(`Failed to send test email to user ${req.user.id}:`, error);
    next(new Error('Failed to send test email. Please check mail server configuration and logs.')); // Pass a more specific error
  }
});

module.exports = router;