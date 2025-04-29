'use strict';

const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const auth = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation'); // Import validation handler
const documentService = require('../services/documentService');
const submissionService = require('../services/submissionService');
const db = require('../models');
const { Invoice, Submission } = db;

// --- Helper Function to Verify Invoice and Submission Access ---
async function verifySubmissionAccess(invoiceId, submissionId, userId) {
    const submission = await Submission.findOne({
        where: {
            id: submissionId,
            invoice_id: invoiceId
        },
        include: [{
            model: Invoice,
            as: 'invoice',
            where: { user_id: userId }, // Ensure the associated invoice belongs to the user
            attributes: [] // No need to fetch invoice attributes here
        }]
    });

    if (!submission) {
        // Determine if the invoice exists but submission doesn't, or if invoice access is denied
        const invoiceExists = await Invoice.count({ where: { id: invoiceId, user_id: userId } });
        let message = 'Submission not found';
        if (invoiceExists === 0) {
            message = 'Invoice not found or access denied';
        }
        const error = new Error(message);
        error.status = 404;
        throw error;
    }
    return submission;
}

// --- Helper Function to Verify Invoice Access ---
async function verifyInvoiceAccess(invoiceId, userId) {
    const invoice = await Invoice.findOne({
        where: { id: invoiceId, user_id: userId },
        // attributes: ['id', 'status'] // Fetch status needed for checks
    });
    if (!invoice) {
        const error = new Error('Invoice not found or access denied');
        error.status = 404;
        throw error;
    }
    return invoice;
}


// --- Swagger Definitions ---

/**
 * @swagger
 * components:
 *   schemas:
 *     Submission:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated ID of the submission.
 *         invoice_id:
 *           type: integer
 *           description: ID of the associated invoice.
 *         status:
 *           type: string
 *           enum: [Pending, Submitted, Accepted, Rejected, Failed]
 *           description: Current status of the submission.
 *         submitted_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the submission was made.
 *         response_message:
 *           type: string
 *           description: Response message from the customs authority or system.
 *         transaction_id:
 *           type: string
 *           description: External transaction ID from the customs system (if applicable).
 *         submission_method:
 *           type: string
 *           description: Method used for submission (e.g., API, SFTP).
 *       example:
 *         id: 5
 *         invoice_id: 1
 *         status: "Accepted"
 *         submitted_at: "2024-01-16T14:00:00.000Z"
 *         response_message: "Declaration accepted by customs."
 *         transaction_id: "CUST123456789"
 *         submission_method: "API"
 *     SubmissionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         submission:
 *           $ref: '#/components/schemas/Submission'
 *         method:
 *           type: string
 *           description: Method used for submission.
 *         message:
 *           type: string
 *           description: Result message.
 *     SubmissionStatus:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [Pending, Submitted, Accepted, Rejected, Failed]
 *         response_message:
 *           type: string
 *         updated_at:
 *           type: string
 *           format: date-time
 *   parameters:
 *     subInvoiceIdParam:
 *       in: path
 *       name: invoiceId
 *       schema:
 *         type: integer
 *       required: true
 *       description: Numeric ID of the invoice for submission operations.
 *     submissionIdParam:
 *       in: path
 *       name: submissionId
 *       schema:
 *         type: integer
 *       required: true
 *       description: Numeric ID of the submission.
 */

// --- Routes ---

/**
 * @swagger
 * /submissions/{invoiceId}:
 *   post:
 *     summary: Submit an invoice and its generated documents to customs
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/subInvoiceIdParam'
 *     responses:
 *       200:
 *         description: Invoice submitted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmissionResponse'
 *       400:
 *         description: Bad Request (e.g., invoice already submitted or not in correct state)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found or access denied
 *       422:
 *         description: Validation Error (Invalid ID format)
 *       500:
 *         description: Server Error during document generation or submission.
 */
router.post('/:invoiceId', [
  auth,
  param('invoiceId').isInt({ gt: 0 }).withMessage('Invoice ID must be a positive integer').toInt(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { invoiceId } = req.params; // Use sanitized ID
    const userId = req.user.id;

    // Verify invoice access and get its status
    const invoice = await verifyInvoiceAccess(invoiceId, userId);

    // Check if invoice is in a submittable state (e.g., 'Draft' or 'Approved' depending on workflow)
    // For now, allowing submission from 'Draft' or 'Rejected'
    if (invoice.status === 'Submitted' || invoice.status === 'Accepted') { // Assuming 'Accepted' means approved by customs
        const error = new Error('Invoice has already been submitted and processed');
        error.status = 400; // Bad Request
        throw error;
    }
     if (invoice.status !== 'Draft' && invoice.status !== 'Rejected' && invoice.status !== 'Approved') { // Allow submission if Approved internally but not yet sent
        const error = new Error(`Invoice in status '${invoice.status}' cannot be submitted.`);
        error.status = 400; // Bad Request
        throw error;
    }


    // Generate documents (service handles idempotency)
    const documents = await documentService.generateDocuments(invoiceId);

    // Submit documents via the service
    const result = await submissionService.submitDocuments(invoiceId, documents, userId); // Pass userId if needed by service

    return res.json({
      success: true,
      submission: result.submission, // The created/updated submission record
      method: result.method,
      message: result.message
    });
  } catch (error) {
    next(error); // Pass error (including 404/400) to centralized handler
  }
});

/**
 * @swagger
 * /submissions/{invoiceId}:
 *   get:
 *     summary: Retrieve all submission records for a specific invoice
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/subInvoiceIdParam'
 *     responses:
 *       200:
 *         description: A list of submission records.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Submission'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found or access denied
 *       422:
 *         description: Validation Error (Invalid ID format)
 *       500:
 *         description: Server Error
 */
router.get('/:invoiceId', [
  auth,
  param('invoiceId').isInt({ gt: 0 }).withMessage('Invoice ID must be a positive integer').toInt(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { invoiceId } = req.params; // Use sanitized ID
    const userId = req.user.id;

    // Verify invoice access first
    await verifyInvoiceAccess(invoiceId, userId);

    // Get submissions
    const submissions = await Submission.findAll({
      where: { invoice_id: invoiceId },
      order: [['submitted_at', 'DESC']]
    });

    return res.json(submissions);
  } catch (error) {
    next(error); // Pass error (including 404) to centralized handler
  }
});

/**
 * @swagger
 * /submissions/{invoiceId}/{submissionId}/status:
 *   get:
 *     summary: Check the current status of a specific submission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/subInvoiceIdParam'
 *       - $ref: '#/components/parameters/submissionIdParam'
 *     responses:
 *       200:
 *         description: Current submission status.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmissionStatus'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice or Submission not found / access denied
 *       422:
 *         description: Validation Error (Invalid ID format)
 *       500:
 *         description: Server Error checking status.
 */
router.get('/:invoiceId/:submissionId/status', [
  auth,
  param('invoiceId').isInt({ gt: 0 }).withMessage('Invoice ID must be a positive integer').toInt(),
  param('submissionId').isInt({ gt: 0 }).withMessage('Submission ID must be a positive integer').toInt(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { invoiceId, submissionId } = req.params; // Use sanitized IDs
    const userId = req.user.id;

    // Verify access to the specific submission (implicitly checks invoice access)
    await verifySubmissionAccess(invoiceId, submissionId, userId);

    // Check submission status via the service
    // The service might interact with an external system or just return DB status
    const status = await submissionService.checkSubmissionStatus(submissionId);

    return res.json(status); // Return status object from service
  } catch (error) {
    next(error); // Pass error (including 404) to centralized handler
  }
});

/**
 * @swagger
 * /submissions/{invoiceId}/{submissionId}/retry:
 *   post:
 *     summary: Retry a failed submission
 *     tags: [Submissions]
 *     description: Attempts to resubmit an invoice associated with a previously failed submission record. Creates a new submission record.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/subInvoiceIdParam'
 *       - $ref: '#/components/parameters/submissionIdParam'
 *     responses:
 *       200:
 *         description: Submission retried successfully. Returns the new submission details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmissionResponse'
 *       400:
 *         description: Bad Request (e.g., submission was not in 'Failed' state)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice or original Submission not found / access denied
 *       422:
 *         description: Validation Error (Invalid ID format)
 *       500:
 *         description: Server Error during document generation or resubmission.
 */
router.post('/:invoiceId/:submissionId/retry', [
  auth,
  param('invoiceId').isInt({ gt: 0 }).withMessage('Invoice ID must be a positive integer').toInt(),
  param('submissionId').isInt({ gt: 0 }).withMessage('Submission ID must be a positive integer').toInt(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { invoiceId, submissionId } = req.params; // Use sanitized IDs
    const userId = req.user.id;

    // Verify access to the original submission and check its status
    const originalSubmission = await verifySubmissionAccess(invoiceId, submissionId, userId);

    // Check if the original submission actually failed
    if (originalSubmission.status !== 'Failed') {
        const error = new Error(`Only submissions with status 'Failed' can be retried. Current status: '${originalSubmission.status}'`);
        error.status = 400; // Bad Request
        throw error;
    }

    // --- Proceed with retry (similar logic to initial submission) ---

     // Verify invoice access and get its status (redundant check, but safe)
    const invoice = await verifyInvoiceAccess(invoiceId, userId);

    // Generate documents again (in case data changed)
    const documents = await documentService.generateDocuments(invoiceId);

    // Submit documents via the service (this should create a NEW submission record)
    const result = await submissionService.submitDocuments(invoiceId, documents, userId); // Pass userId if needed

    return res.json({
      success: true,
      submission: result.submission, // The NEW submission record
      method: result.method,
      message: `Retry successful. New submission ID: ${result.submission.id}` // Adjusted message
    });
  } catch (error) {
    next(error); // Pass error (including 404/400) to centralized handler
  }
});

module.exports = router;