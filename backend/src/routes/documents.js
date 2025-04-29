'use strict';

const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const auth = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation'); // Import validation handler
const path = require('path');
const fs = require('fs').promises; // Use promises version of fs
const documentService = require('../services/documentService');
const db = require('../models');
const { Invoice } = db;

// --- Helper Function to Verify Invoice Access ---
async function verifyInvoiceAccess(invoiceId, userId) {
    const invoice = await Invoice.findOne({
        where: { id: invoiceId, user_id: userId },
        attributes: ['id'] // Only need to confirm existence
    });
    if (!invoice) {
        const error = new Error('Invoice not found or access denied');
        error.status = 404;
        throw error;
    }
    return invoice; // Return the found invoice (or just true)
}

// --- Helper Function to Get Document Path and Type ---
async function getDocumentDetails(invoiceId, type, userId) {
    await verifyInvoiceAccess(invoiceId, userId); // Ensure user has access first

    // Generate documents if they don't exist (service should handle this idempotently)
    const documents = await documentService.generateDocuments(invoiceId);

    let filePath;
    let mimeType;
    let filename;

    if (type === 'xml') {
        filePath = documents.xmlPath;
        mimeType = 'application/xml';
        filename = `invoice_${invoiceId}_customs.xml`;
    } else if (type === 'pdf') {
        filePath = documents.pdfPath;
        mimeType = 'application/pdf';
        filename = `invoice_${invoiceId}_customs.pdf`;
    } else {
        const error = new Error('Invalid document type requested');
        error.status = 400; // Bad request
        throw error;
    }

    // Check if file exists using async fs.access
    try {
        await fs.access(filePath, fs.constants.R_OK); // Check for read access
    } catch (err) {
        console.error(`Document file not found or not readable: ${filePath}`, err);
        const error = new Error('Document file not found or inaccessible');
        error.status = 404;
        throw error;
    }

    return { filePath, mimeType, filename };
}


// --- Swagger Definitions ---

/**
 * @swagger
 * components:
 *   schemas:
 *     GeneratedDocuments:
 *       type: object
 *       properties:
 *         xmlPath:
 *           type: string
 *           description: Server path to the generated XML document.
 *         pdfPath:
 *           type: string
 *           description: Server path to the generated PDF document.
 *       example:
 *         xmlPath: "/path/to/generated/docs/invoice_123_customs.xml"
 *         pdfPath: "/path/to/generated/docs/invoice_123_customs.pdf"
 *   parameters:
 *     docInvoiceIdParam:
 *       in: path
 *       name: invoiceId
 *       schema:
 *         type: integer
 *       required: true
 *       description: Numeric ID of the invoice for document operations.
 *     docTypeParam:
 *       in: path
 *       name: type
 *       schema:
 *         type: string
 *         enum: [xml, pdf]
 *       required: true
 *       description: Type of document to operate on (xml or pdf).
 */

// --- Routes ---

/**
 * @swagger
 * /documents/{invoiceId}/generate:
 *   get:
 *     summary: Generate customs documents (XML, PDF) for a specific invoice
 *     tags: [Documents]
 *     description: Ensures documents are generated for the invoice. Returns paths to the generated files. This is often called implicitly by download/preview if files don't exist.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/docInvoiceIdParam'
 *     responses:
 *       200:
 *         description: Documents generated successfully (or already existed).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 documents:
 *                   $ref: '#/components/schemas/GeneratedDocuments'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found or access denied
 *       422:
 *         description: Validation Error (Invalid ID format)
 *       500:
 *         description: Server Error during document generation.
 */
router.get('/:invoiceId/generate', [
  auth,
  param('invoiceId').isInt({ gt: 0 }).withMessage('Invoice ID must be a positive integer').toInt(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { invoiceId } = req.params; // Use sanitized ID
    const userId = req.user.id;

    // Verify access first
    await verifyInvoiceAccess(invoiceId, userId);

    // Generate documents (service handles idempotency)
    const documents = await documentService.generateDocuments(invoiceId);

    return res.json({
      success: true,
      documents // Return paths
    });
  } catch (error) {
    next(error); // Pass error (including 404 from verifyInvoiceAccess) to centralized handler
  }
});

/**
 * @swagger
 * /documents/{invoiceId}/download/{type}:
 *   get:
 *     summary: Download a generated document (XML or PDF) for an invoice
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/docInvoiceIdParam'
 *       - $ref: '#/components/parameters/docTypeParam'
 *     responses:
 *       200:
 *         description: Document file stream.
 *         content:
 *           application/xml:
 *             schema:
 *               type: string
 *               format: binary
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid document type requested
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice or Document file not found / access denied
 *       422:
 *         description: Validation Error (Invalid ID or type format)
 *       500:
 *         description: Server Error during file retrieval or streaming.
 */
router.get('/:invoiceId/download/:type', [
  auth,
  param('invoiceId').isInt({ gt: 0 }).withMessage('Invoice ID must be a positive integer').toInt(),
  param('type').isIn(['xml', 'pdf']).withMessage('Type must be xml or pdf'),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { invoiceId, type } = req.params; // Use sanitized params
    const userId = req.user.id;

    // Get validated document details (includes access check and generation)
    const { filePath, mimeType, filename } = await getDocumentDetails(invoiceId, type, userId);

    // Set headers for download
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`); // Use consistent filename

    // Stream file
    const fileStream = require('fs').createReadStream(filePath); // Use non-promise fs for stream
    fileStream.on('error', (streamError) => {
        console.error(`Error streaming file ${filePath}:`, streamError);
        // Avoid sending headers twice if already sent
        if (!res.headersSent) {
            next(new Error('Failed to stream document file')); // Pass to central handler
        }
    });
    fileStream.pipe(res);

  } catch (error) {
    next(error); // Pass error (including 404/400 from getDocumentDetails) to centralized handler
  }
});

/**
 * @swagger
 * /documents/{invoiceId}/preview/{type}:
 *   get:
 *     summary: Preview a generated document (XML or PDF) for an invoice in the browser
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/docInvoiceIdParam'
 *       - $ref: '#/components/parameters/docTypeParam'
 *     responses:
 *       200:
 *         description: Document file stream for inline display.
 *         content:
 *           application/xml:
 *             schema:
 *               type: string
 *               format: binary
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid document type requested
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice or Document file not found / access denied
 *       422:
 *         description: Validation Error (Invalid ID or type format)
 *       500:
 *         description: Server Error during file retrieval or streaming.
 */
router.get('/:invoiceId/preview/:type', [
  auth,
  param('invoiceId').isInt({ gt: 0 }).withMessage('Invoice ID must be a positive integer').toInt(),
  param('type').isIn(['xml', 'pdf']).withMessage('Type must be xml or pdf'),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { invoiceId, type } = req.params; // Use sanitized params
    const userId = req.user.id;

    // Get validated document details (includes access check and generation)
    const { filePath, mimeType, filename } = await getDocumentDetails(invoiceId, type, userId);

    // Set headers for inline display
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename=${filename}`); // Use consistent filename

    // Stream file
    const fileStream = require('fs').createReadStream(filePath); // Use non-promise fs for stream
     fileStream.on('error', (streamError) => {
        console.error(`Error streaming file ${filePath}:`, streamError);
        if (!res.headersSent) {
            next(new Error('Failed to stream document file'));
        }
    });
    fileStream.pipe(res);

  } catch (error) {
    next(error); // Pass error (including 404/400 from getDocumentDetails) to centralized handler
  }
});

module.exports = router;