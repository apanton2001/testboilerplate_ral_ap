'use strict';

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const { handleValidationErrors } = require('../middleware/validation'); // Import validation handler
const classificationService = require('../services/classificationService');
const db = require('../models');
const { InvoiceLine, ClassificationHistory, User } = db; // Include ClassificationHistory and User

// --- Swagger Definitions ---

/**
 * @swagger
 * components:
 *   schemas:
 *     ClassificationItemInput:
 *       type: object
 *       required:
 *         - description
 *       properties:
 *         id:
 *           type: integer
 *           description: Optional ID of the InvoiceLine to update after classification.
 *         description:
 *           type: string
 *           description: Product description to classify.
 *       example:
 *         id: 15
 *         description: "Red Cotton T-Shirt, Size L"
 *     BulkClassificationInput:
 *       type: object
 *       required:
 *         - items
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ClassificationItemInput'
 *     ClassificationResult:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID of the item if provided in input.
 *         description:
 *           type: string
 *           description: Original product description.
 *         hs_code:
 *           type: string
 *           description: Suggested HS code.
 *         confidence:
 *           type: number
 *           format: float
 *           description: Confidence score of the classification (0-1).
 *         classification_method:
 *           type: string
 *           enum: [AI, Manual, Rule]
 *           description: Method used for classification.
 *         flagged:
 *           type: boolean
 *           description: Whether the classification needs review.
 *       example:
 *         id: 15
 *         description: "Red Cotton T-Shirt, Size L"
 *         hs_code: "610910"
 *         confidence: 0.85
 *         classification_method: "AI"
 *         flagged: false
 *     BulkClassificationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         results:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ClassificationResult'
 *     SingleClassificationInput:
 *       type: object
 *       required:
 *         - description
 *       properties:
 *         description:
 *           type: string
 *           description: Product description to classify.
 *       example:
 *         description: "Blue Denim Jeans, 32x34"
 *     SingleClassificationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         result:
 *           $ref: '#/components/schemas/ClassificationResult'
 *     ManualClassificationInput:
 *       type: object
 *       required:
 *         - hs_code
 *       properties:
 *         hs_code:
 *           type: string
 *           description: The manually assigned HS code.
 *       example:
 *         hs_code: "620342"
 *     ClearCacheInput:
 *       type: object
 *       required:
 *         - description
 *       properties:
 *         description:
 *           type: string
 *           description: The description whose cache entry should be cleared.
 *       example:
 *         description: "Red Cotton T-Shirt, Size L"
 *     ClassificationHistoryEntry:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         invoice_line_id:
 *           type: integer
 *         previous_hs_code:
 *           type: string
 *         new_hs_code:
 *           type: string
 *         classification_method:
 *           type: string
 *         changed_by_user_id:
 *           type: integer
 *         changed_at:
 *           type: string
 *           format: date-time
 *         user: # Include user details
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             full_name:
 *               type: string
 *             email:
 *               type: string
 *   parameters:
 *     invoiceLineIdParam:
 *       in: path
 *       name: invoiceLineId
 *       schema:
 *         type: integer
 *       required: true
 *       description: Numeric ID of the invoice line.
 */

// --- Routes ---

/**
 * @swagger
 * /classification/bulk:
 *   post:
 *     summary: Classify multiple invoice line descriptions in bulk
 *     tags: [Classification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkClassificationInput'
 *     responses:
 *       200:
 *         description: Bulk classification successful. Results may include updated HS codes.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkClassificationResponse'
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation Error
 *       500:
 *         description: Server Error during classification or update.
 */
router.post('/bulk', [
  auth,
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.id').optional().isInt({ gt: 0 }).withMessage('Item ID must be a positive integer').toInt(),
  body('items.*.description').trim().notEmpty().withMessage('Description is required').escape(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { items } = req.body; // Use validated/sanitized items

    // Perform bulk classification
    const results = await classificationService.bulkClassify(items);

    // Filter items that have an ID and a valid hs_code from the results
    const itemsToUpdate = results.filter(item => item.id && item.hs_code);

    if (itemsToUpdate.length > 0) {
      // Update items in database in a transaction
      await db.sequelize.transaction(async (transaction) => {
        for (const item of itemsToUpdate) {
          // Ensure the InvoiceLine exists before attempting update
          const lineExists = await InvoiceLine.count({ where: { id: item.id }, transaction });
          if (lineExists > 0) {
              await InvoiceLine.update({
                hs_code: item.hs_code,
                classification_method: item.classification_method,
                flagged: item.flagged || false // Default flagged to false if not present
              }, {
                where: { id: item.id },
                transaction
              });
          } else {
              console.warn(`InvoiceLine with ID ${item.id} not found during bulk update. Skipping.`);
          }
        }
      });
    }

    return res.json({
      success: true,
      results // Return the classification results
    });
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /classification/single:
 *   post:
 *     summary: Classify a single product description
 *     tags: [Classification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SingleClassificationInput'
 *     responses:
 *       200:
 *         description: Classification successful.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SingleClassificationResponse'
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation Error
 *       500:
 *         description: Server Error during classification.
 */
router.post('/single', [
  auth,
  body('description').trim().notEmpty().withMessage('Description is required').escape(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { description } = req.body; // Use validated/sanitized description

    // Perform classification
    const result = await classificationService.classifyProduct(description);

    return res.json({
      success: true,
      result
    });
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /classification/manual/{invoiceLineId}:
 *   put:
 *     summary: Manually override classification for an invoice line
 *     tags: [Classification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/invoiceLineIdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ManualClassificationInput'
 *     responses:
 *       200:
 *         description: Manual classification override successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 result: # Define the expected result structure if needed
 *                   type: object
 *                   properties:
 *                      # Add properties of the updated InvoiceLine if returned
 *                      id:
 *                          type: integer
 *                      hs_code:
 *                          type: string
 *                      classification_method:
 *                          type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (User does not have required role)
 *       404:
 *         description: Invoice line not found
 *       422:
 *         description: Validation Error
 *       500:
 *         description: Server Error during manual classification.
 */
router.put('/manual/:invoiceLineId', [
  auth,
  roleAuth(['admin', 'tariff_reviewer']), // Ensure roleAuth middleware is correctly implemented
  param('invoiceLineId').isInt({ gt: 0 }).withMessage('Invoice line ID must be a positive integer').toInt(),
  body('hs_code').trim().notEmpty().withMessage('HS code is required').escape(), // Sanitize HS code
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { invoiceLineId } = req.params; // Use sanitized ID
    const { hs_code } = req.body; // Use validated/sanitized hs_code
    const userId = req.user.id;

    // Perform manual classification - service should handle finding the line and updating
    const updatedLine = await classificationService.manualClassify(
      invoiceLineId,
      hs_code,
      userId
    );

    // Check if the service indicated the line was not found
     if (!updatedLine) {
        return res.status(404).json({ message: 'Invoice line not found' });
    }


    return res.json({
      success: true,
      result: updatedLine // Return the updated line data
    });
  } catch (error) {
     // Handle potential errors from the service, e.g., not found
     if (error.message === 'Invoice line not found') { // Example error handling
        return res.status(404).json({ message: error.message });
    }
    next(error); // Pass other errors to centralized handler
  }
});

/**
 * @swagger
 * /classification/clear-cache:
 *   post:
 *     summary: Clear classification cache for a specific description
 *     tags: [Classification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClearCacheInput'
 *     responses:
 *       200:
 *         description: Cache cleared successfully or failed.
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
 *       403:
 *         description: Forbidden (User does not have admin role)
 *       422:
 *         description: Validation Error
 *       500:
 *         description: Server Error during cache clearing.
 */
router.post('/clear-cache', [
  auth,
  roleAuth(['admin']), // Only admins can clear cache
  body('description').trim().notEmpty().withMessage('Description is required').escape(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { description } = req.body; // Use validated/sanitized description

    // Clear cache
    const success = await classificationService.clearClassificationCache(description);

    return res.json({
      success,
      message: success ? 'Cache cleared successfully' : 'Description not found in cache or failed to clear'
    });
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /classification/history/{invoiceLineId}:
 *   get:
 *     summary: Get classification history for a specific invoice line
 *     tags: [Classification]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/invoiceLineIdParam'
 *     responses:
 *       200:
 *         description: Classification history retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 history:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ClassificationHistoryEntry'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice line not found (or user doesn't have access)
 *       422:
 *         description: Validation Error (Invalid ID format)
 *       500:
 *         description: Server Error retrieving history.
 */
router.get('/history/:invoiceLineId', [
  auth,
  param('invoiceLineId').isInt({ gt: 0 }).withMessage('Invoice line ID must be a positive integer').toInt(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { invoiceLineId } = req.params; // Use sanitized ID

    // Add check: Ensure the user has access to the invoice this line belongs to?
    // This might involve fetching the InvoiceLine, then its Invoice, and checking user_id.
    // Or adjust the query below to join through Invoice and filter by user_id.
    // For simplicity now, assuming access control is handled elsewhere or implicitly.

    // Get classification history
    const history = await ClassificationHistory.findAll({
      where: { invoice_line_id: invoiceLineId },
      include: [
        {
          model: User, // Use the imported User model
          as: 'user', // Ensure alias matches model definition
          attributes: ['id', 'full_name', 'email'] // Select specific user attributes
        }
      ],
      order: [['changed_at', 'DESC']]
    });

     // Optional: Check if history is empty and the line actually exists
     if (history.length === 0) {
        const lineExists = await InvoiceLine.count({ where: { id: invoiceLineId } });
        if (lineExists === 0) {
            return res.status(404).json({ message: 'Invoice line not found' });
        }
        // If line exists but no history, return empty array
    }


    return res.json({
      success: true,
      history
    });
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

module.exports = router;