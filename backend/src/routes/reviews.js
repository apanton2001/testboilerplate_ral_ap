'use strict';

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const { handleValidationErrors } = require('../middleware/validation'); // Import validation handler
const reviewService = require('../services/reviewService');

// --- Swagger Definitions ---

/**
 * @swagger
 * components:
 *   schemas:
 *     FlaggedItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID of the InvoiceLine that is flagged.
 *         invoice_id:
 *           type: integer
 *         description:
 *           type: string
 *         quantity:
 *           type: integer
 *         unit_price:
 *           type: number
 *           format: float
 *         hs_code:
 *           type: string
 *           description: The currently assigned (potentially incorrect) HS code.
 *         classification_method:
 *           type: string
 *         flagged:
 *           type: boolean
 *           description: Should always be true for items in this queue.
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         # Add related invoice/supplier info if needed by frontend
 *     ReviewActionInput:
 *       type: object
 *       properties:
 *         comment:
 *           type: string
 *           description: Optional comment explaining the review action.
 *     AdjustHsCodeInput:
 *       type: object
 *       required:
 *         - hs_code
 *       properties:
 *         hs_code:
 *           type: string
 *           description: The new, correct HS code.
 *         comment:
 *           type: string
 *           description: Optional comment explaining the adjustment.
 *     ReviewStats:
 *       type: object
 *       properties:
 *         pending_review_count:
 *           type: integer
 *         approved_today_count:
 *           type: integer
 *         adjusted_today_count:
 *           type: integer
 *         # Add more stats as needed
 *     ReviewHistoryEntry:
 *       type: object
 *       # Define properties based on what reviewService.getReviewHistory returns
 *       # Likely includes item ID, action (approved/adjusted), old/new HS code, reviewer, timestamp, comment
 *       properties:
 *          id:
 *              type: integer
 *          invoice_line_id:
 *              type: integer
 *          action:
 *              type: string
 *              enum: [Approved, Adjusted]
 *          previous_hs_code:
 *              type: string
 *          new_hs_code:
 *              type: string
 *          comment:
 *              type: string
 *          reviewed_by_user_id:
 *              type: integer
 *          reviewed_at:
 *              type: string
 *              format: date-time
 *          # Include user details if needed
 *   parameters:
 *     flaggedItemIdParam:
 *       in: path
 *       name: id
 *       schema:
 *         type: integer
 *       required: true
 *       description: Numeric ID of the flagged invoice line item.
 *     paginationLimit:
 *       in: query
 *       name: limit
 *       schema:
 *         type: integer
 *         minimum: 1
 *         default: 10
 *       description: Maximum number of items to return.
 *     paginationOffset:
 *       in: query
 *       name: offset
 *       schema:
 *         type: integer
 *         minimum: 0
 *         default: 0
 *       description: Number of items to skip for pagination.
 *     sortByParam:
 *       in: query
 *       name: sortBy
 *       schema:
 *         type: string
 *         default: created_at
 *       description: Field to sort by (e.g., created_at, description).
 *     sortOrderParam:
 *       in: query
 *       name: sortOrder
 *       schema:
 *         type: string
 *         enum: [asc, desc]
 *         default: desc
 *       description: Sort order.
 */

// --- Routes ---

/**
 * @swagger
 * /reviews/flagged:
 *   get:
 *     summary: Retrieve a list of flagged invoice line items needing review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/paginationLimit'
 *       - $ref: '#/components/parameters/paginationOffset'
 *       - $ref: '#/components/parameters/sortByParam'
 *       - $ref: '#/components/parameters/sortOrderParam'
 *     responses:
 *       200:
 *         description: A list of flagged items.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: Total number of flagged items available.
 *                 rows:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FlaggedItem'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (User lacks reviewer role)
 *       422:
 *         description: Validation Error (Invalid query parameters)
 *       500:
 *         description: Server Error
 */
router.get('/flagged', [
  auth,
  roleAuth(['admin', 'reviewer']),
  query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer').toInt(),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer').toInt(),
  query('sortBy').optional().trim().escape().isString().withMessage('Sort field must be a string'), // Sanitize sortBy
  query('sortOrder').optional().trim().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    // Use validated/sanitized query parameters
    const options = {
      limit: req.query.limit || 10, // Use default if not provided
      offset: req.query.offset || 0,
      sortBy: req.query.sortBy || 'created_at', // Default sort field
      sortOrder: req.query.sortOrder || 'desc' // Default sort order
    };

    // Validate sortBy against allowed fields if necessary
    const allowedSortFields = ['id', 'description', 'hs_code', 'created_at', 'updated_at']; // Example allowed fields
    if (!allowedSortFields.includes(options.sortBy)) {
        options.sortBy = 'created_at'; // Default to a safe field if invalid
    }


    const result = await reviewService.getFlaggedItems(options);
    return res.json(result); // Service should return { count, rows }
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /reviews/flagged/{id}:
 *   get:
 *     summary: Retrieve details of a specific flagged item
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/flaggedItemIdParam'
 *     responses:
 *       200:
 *         description: Details of the flagged item.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FlaggedItem'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (User lacks reviewer role)
 *       404:
 *         description: Flagged item not found
 *       422:
 *         description: Validation Error (Invalid ID format)
 *       500:
 *         description: Server Error
 */
router.get('/flagged/:id', [
  auth,
  roleAuth(['admin', 'reviewer']),
  param('id').isInt({ gt: 0 }).withMessage('ID must be a positive integer').toInt(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { id } = req.params; // Use sanitized ID
    const item = await reviewService.getFlaggedItemById(id);

    // Service should throw error if not found, which will be caught below
    return res.json(item);
  } catch (error) {
     // Handle specific "not found" error from service
     if (error.message && error.message.toLowerCase().includes('not found')) {
        return res.status(404).json({ message: error.message });
    }
    next(error); // Pass other errors to centralized handler
  }
});

/**
 * @swagger
 * /reviews/approve/{id}:
 *   post:
 *     summary: Approve the currently assigned HS code for a flagged item
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/flaggedItemIdParam'
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewActionInput' # Only optional comment
 *     responses:
 *       200:
 *         description: HS code approved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 result: # Include updated item details
 *                   $ref: '#/components/schemas/FlaggedItem'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (User lacks reviewer role)
 *       404:
 *         description: Flagged item not found
 *       422:
 *         description: Validation Error
 *       500:
 *         description: Server Error
 */
router.post('/approve/:id', [
  auth,
  roleAuth(['admin', 'reviewer']),
  param('id').isInt({ gt: 0 }).withMessage('ID must be a positive integer').toInt(),
  body('comment').optional().trim().escape().isString().withMessage('Comment must be a string'),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { id } = req.params; // Use sanitized ID
    const userId = req.user.id;
    const { comment } = req.body; // Use sanitized comment

    const result = await reviewService.approveHsCode(id, userId, comment);
     // Service should throw error if not found
    return res.json({
      success: true,
      message: 'HS code approved successfully',
      result // Return updated item from service
    });
  } catch (error) {
     if (error.message && error.message.toLowerCase().includes('not found')) {
        return res.status(404).json({ message: error.message });
    }
    next(error); // Pass other errors to centralized handler
  }
});

/**
 * @swagger
 * /reviews/adjust/{id}:
 *   post:
 *     summary: Adjust the HS code for a flagged item
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/flaggedItemIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdjustHsCodeInput'
 *     responses:
 *       200:
 *         description: HS code adjusted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 result: # Include updated item details
 *                   $ref: '#/components/schemas/FlaggedItem'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (User lacks reviewer role)
 *       404:
 *         description: Flagged item not found
 *       422:
 *         description: Validation Error
 *       500:
 *         description: Server Error
 */
router.post('/adjust/:id', [
  auth,
  roleAuth(['admin', 'reviewer']),
  param('id').isInt({ gt: 0 }).withMessage('ID must be a positive integer').toInt(),
  body('hs_code').trim().notEmpty().withMessage('HS code is required').escape(), // Sanitize HS code
  body('comment').optional().trim().escape().isString().withMessage('Comment must be a string'),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { id } = req.params; // Use sanitized ID
    const userId = req.user.id;
    const { hs_code, comment } = req.body; // Use sanitized inputs

    const result = await reviewService.adjustHsCode(id, hs_code, userId, comment);
     // Service should throw error if not found
    return res.json({
      success: true,
      message: 'HS code adjusted successfully',
      result // Return updated item from service
    });
  } catch (error) {
     if (error.message && error.message.toLowerCase().includes('not found')) {
        return res.status(404).json({ message: error.message });
    }
    next(error); // Pass other errors to centralized handler
  }
});

/**
 * @swagger
 * /reviews/stats:
 *   get:
 *     summary: Retrieve review statistics
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Review statistics.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewStats'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (User lacks reviewer role)
 *       500:
 *         description: Server Error
 */
router.get('/stats', [
  auth,
  roleAuth(['admin', 'reviewer'])
  // No validation needed for this route
], async (req, res, next) => { // Added next
  try {
    const stats = await reviewService.getReviewStats();
    return res.json(stats);
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /reviews/history:
 *   get:
 *     summary: Retrieve review action history (approvals/adjustments)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/paginationLimit'
 *       - $ref: '#/components/parameters/paginationOffset'
 *       # Add more query params for filtering if needed (e.g., by user, by date range)
 *     responses:
 *       200:
 *         description: A list of review history records.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: Total number of history records available.
 *                 rows:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ReviewHistoryEntry'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (User lacks reviewer role)
 *       422:
 *         description: Validation Error (Invalid query parameters)
 *       500:
 *         description: Server Error
 */
router.get('/history', [
  auth,
  roleAuth(['admin', 'reviewer']),
  query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer').toInt(),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer').toInt(),
  // Add validation for any other filter params here
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    // Use validated/sanitized query parameters
    const options = {
      limit: req.query.limit || 10,
      offset: req.query.offset || 0,
      // Add other filter options based on validated query params
    };

    const result = await reviewService.getReviewHistory(options);
    return res.json(result); // Service should return { count, rows }
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

module.exports = router;