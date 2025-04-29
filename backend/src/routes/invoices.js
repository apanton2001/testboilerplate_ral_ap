'use strict';

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const auth = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation'); // Import validation handler
const db = require('../models');
const { Invoice, InvoiceLine } = db; // Removed User as it's not directly used here

// --- Helper Function ---

/**
 * Updates the total_amount field of an invoice based on its lines.
 * @param {number} invoiceId - The ID of the invoice to update.
 * @param {object} [transaction] - Optional Sequelize transaction object.
 */
async function updateInvoiceTotal(invoiceId, transaction) {
  try {
    const result = await InvoiceLine.findAll({
      where: { invoice_id: invoiceId },
      attributes: [
        [db.sequelize.fn('SUM', db.sequelize.literal('quantity * unit_price')), 'total']
      ],
      raw: true,
      transaction // Pass transaction if provided
    });

    const totalAmount = result[0]?.total || 0; // Use optional chaining and default to 0

    await Invoice.update(
      { total_amount: totalAmount },
      { where: { id: invoiceId }, transaction } // Pass transaction if provided
    );
  } catch (error) {
    console.error(`Error updating invoice total for invoiceId ${invoiceId}:`, error);
    // Re-throw the error to be caught by the calling route handler's catch block
    throw error;
  }
}


// --- Swagger Definitions ---

/**
 * @swagger
 * components:
 *   schemas:
 *     Invoice:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the invoice.
 *         user_id:
 *           type: integer
 *           description: ID of the user who owns the invoice.
 *         supplier:
 *           type: string
 *           description: Name of the supplier.
 *         invoice_date:
 *           type: string
 *           format: date
 *           description: Date of the invoice.
 *         total_amount:
 *           type: number
 *           format: float
 *           description: Total amount of the invoice.
 *         status:
 *           type: string
 *           enum: [Draft, Submitted, Approved, Rejected]
 *           description: Current status of the invoice.
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp of creation.
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp of last update.
 *       example:
 *         id: 1
 *         user_id: 1
 *         supplier: "Example Supplier Inc."
 *         invoice_date: "2024-01-15"
 *         total_amount: 150.75
 *         status: "Submitted"
 *         created_at: "2024-01-15T10:00:00.000Z"
 *         updated_at: "2024-01-16T11:30:00.000Z"
 *     InvoiceLine:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the invoice line.
 *         invoice_id:
 *           type: integer
 *           description: ID of the associated invoice.
 *         description:
 *           type: string
 *           description: Description of the item.
 *         quantity:
 *           type: integer
 *           description: Quantity of the item.
 *         unit_price:
 *           type: number
 *           format: float
 *           description: Price per unit of the item.
 *         hs_code:
 *           type: string
 *           description: Harmonized System (HS) code for the item.
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp of creation.
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp of last update.
 *       example:
 *         id: 10
 *         invoice_id: 1
 *         description: "Widget Type A"
 *         quantity: 5
 *         unit_price: 10.50
 *         hs_code: "847100"
 *         created_at: "2024-01-15T10:05:00.000Z"
 *         updated_at: "2024-01-15T10:05:00.000Z"
 *     InvoiceInput:
 *       type: object
 *       properties:
 *         supplier:
 *           type: string
 *         invoice_date:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *           enum: [Draft, Submitted, Approved, Rejected]
 *     InvoiceLineInput:
 *       type: object
 *       required:
 *         - description
 *         - quantity
 *         - unit_price
 *       properties:
 *         description:
 *           type: string
 *         quantity:
 *           type: integer
 *         unit_price:
 *           type: number
 *           format: float
 *         hs_code:
 *           type: string
 *   parameters:
 *     invoiceId:
 *       in: path
 *       name: id
 *       schema:
 *         type: integer
 *       required: true
 *       description: Numeric ID of the invoice to operate on.
 *     lineId:
 *       in: path
 *       name: lineId
 *       schema:
 *         type: integer
 *       required: true
 *       description: Numeric ID of the invoice line to operate on.
 */

// --- Routes ---

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: Retrieve a list of invoices for the authenticated user
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of invoices.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Invoice'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server Error
 */
router.get('/', auth, async (req, res, next) => { // Added next
  try {
    const invoices = await Invoice.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    return res.json(invoices);
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /invoices/{id}:
 *   get:
 *     summary: Retrieve a specific invoice by ID
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/invoiceId'
 *     responses:
 *       200:
 *         description: Invoice details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 *       422:
 *         description: Validation Error (Invalid ID format)
 *       500:
 *         description: Server Error
 */
router.get('/:id', [
  auth,
  param('id').isInt({ gt: 0 }).withMessage('Invoice ID must be a positive integer').toInt(), // Validate and sanitize
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const invoice = await Invoice.findOne({
      where: {
        id: req.params.id, // Use sanitized ID
        user_id: req.user.id
      }
      // Consider including InvoiceLines here if often needed together
      // include: [{ model: InvoiceLine, as: 'lines' }]
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    return res.json(invoice);
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /invoices:
 *   post:
 *     summary: Create a new invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InvoiceInput'
 *     responses:
 *       201:
 *         description: Invoice created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation Error
 *       500:
 *         description: Server Error
 */
router.post('/', [
  auth,
  body('supplier').optional().trim().escape().isString().withMessage('Supplier must be a string'),
  body('invoice_date').optional().toDate().isISO8601().withMessage('Invoice date must be a valid ISO8601 date'),
  body('status').optional().trim().isIn(['Draft', 'Submitted', 'Approved', 'Rejected']).withMessage('Invalid status'),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    // Use validated/sanitized values from req.body
    const { supplier, invoice_date, status = 'Draft' } = req.body;

    const invoice = await Invoice.create({
      user_id: req.user.id,
      supplier,
      invoice_date,
      status,
      total_amount: 0 // Initialize total amount
    });

    return res.status(201).json(invoice);
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /invoices/{id}:
 *   put:
 *     summary: Update an existing invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/invoiceId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InvoiceInput'
 *     responses:
 *       200:
 *         description: Invoice updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 *       422:
 *         description: Validation Error
 *       500:
 *         description: Server Error
 */
router.put('/:id', [
  auth,
  param('id').isInt({ gt: 0 }).withMessage('Invoice ID must be a positive integer').toInt(),
  body('supplier').optional().trim().escape().isString().withMessage('Supplier must be a string'),
  body('invoice_date').optional().toDate().isISO8601().withMessage('Invoice date must be a valid ISO8601 date'),
  body('status').optional().trim().isIn(['Draft', 'Submitted', 'Approved', 'Rejected']).withMessage('Invalid status'),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { id } = req.params; // Use sanitized ID
    // Use validated/sanitized values from req.body
    const { supplier, invoice_date, status } = req.body;

    // Find invoice and ensure it belongs to the user
    const invoice = await Invoice.findOne({
      where: {
        id,
        user_id: req.user.id
      }
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Prepare update data - only include fields that were actually provided
    const updateData = {};
    if (supplier !== undefined) updateData.supplier = supplier;
    if (invoice_date !== undefined) updateData.invoice_date = invoice_date;
    if (status !== undefined) updateData.status = status;

    // Update invoice only if there's data to update
    if (Object.keys(updateData).length > 0) {
        await invoice.update(updateData);
    } else {
        // If no fields were provided to update, maybe return 304 Not Modified?
        // Or just return the current invoice state. For simplicity, return current state.
    }


    // Return the potentially updated invoice
    return res.json(invoice);
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /invoices/{id}:
 *   delete:
 *     summary: Delete an invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/invoiceId'
 *     responses:
 *       200:
 *         description: Invoice deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invoice deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 *       422:
 *         description: Validation Error (Invalid ID format)
 *       500:
 *         description: Server Error
 */
router.delete('/:id', [
  auth,
  param('id').isInt({ gt: 0 }).withMessage('Invoice ID must be a positive integer').toInt(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { id } = req.params; // Use sanitized ID

    // Find invoice and ensure it belongs to the user before deleting
    const invoice = await Invoice.findOne({
      where: {
        id,
        user_id: req.user.id
      },
      attributes: ['id'] // Only need ID for deletion check
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Delete invoice (cascading should be handled by DB constraints)
    await Invoice.destroy({ where: { id } }); // Use the found ID

    return res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});


// --- Invoice Lines Routes ---

/**
 * @swagger
 * /invoices/{id}/lines:
 *   get:
 *     summary: Retrieve all lines for a specific invoice
 *     tags: [Invoice Lines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/invoiceId'
 *     responses:
 *       200:
 *         description: A list of invoice lines.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/InvoiceLine'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 *       422:
 *         description: Validation Error (Invalid ID format)
 *       500:
 *         description: Server Error
 */
router.get('/:id/lines', [
  auth,
  param('id').isInt({ gt: 0 }).withMessage('Invoice ID must be a positive integer').toInt(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { id } = req.params; // Use sanitized ID

    // Verify invoice belongs to user first
    const invoiceExists = await Invoice.count({
        where: { id, user_id: req.user.id }
    });

    if (invoiceExists === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Get invoice lines
    const invoiceLines = await InvoiceLine.findAll({
      where: { invoice_id: id },
      order: [['id', 'ASC']] // Or maybe line number if you add one
    });

    return res.json(invoiceLines);
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /invoices/{id}/lines:
 *   post:
 *     summary: Create a new line item for an invoice
 *     tags: [Invoice Lines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/invoiceId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InvoiceLineInput'
 *     responses:
 *       201:
 *         description: Invoice line created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InvoiceLine'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 *       422:
 *         description: Validation Error
 *       500:
 *         description: Server Error
 */
router.post('/:id/lines', [
  auth,
  param('id').isInt({ gt: 0 }).withMessage('Invoice ID must be a positive integer').toInt(),
  body('description').trim().notEmpty().withMessage('Description is required').escape(),
  body('quantity').isInt({ gt: 0 }).withMessage('Quantity must be a positive integer').toInt(),
  body('unit_price').isFloat({ gt: 0 }).withMessage('Unit price must be a positive number').toFloat(),
  body('hs_code').optional().trim().escape(), // Optional HS code
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { id } = req.params; // Use sanitized ID
    // Use validated/sanitized values
    const { description, quantity, unit_price, hs_code } = req.body;

    // Use transaction to ensure invoice exists and line is created atomically
    const result = await db.sequelize.transaction(async (transaction) => {
        // Verify invoice belongs to user within the transaction
        const invoice = await Invoice.findOne({
          where: { id, user_id: req.user.id },
          attributes: ['id'], // Only need ID
          transaction
        });

        if (!invoice) {
          // Throw an error to rollback transaction and trigger 404 response
          const error = new Error('Invoice not found');
          error.status = 404;
          throw error;
        }

        // Create invoice line
        const invoiceLine = await InvoiceLine.create({
          invoice_id: id,
          description,
          quantity,
          unit_price,
          hs_code
        }, { transaction });

        // Update invoice total within the same transaction
        await updateInvoiceTotal(id, transaction);

        return invoiceLine;
    });


    return res.status(201).json(result); // Return the created line
  } catch (error) {
      // Handle specific 404 error from transaction
      if (error.status === 404) {
          return res.status(404).json({ message: error.message });
      }
      // Pass other errors to centralized handler
      next(error);
  }
});

/**
 * @swagger
 * /invoices/{id}/lines:
 *   put:
 *     summary: Update multiple invoice lines at once (Bulk Update/Create)
 *     tags: [Invoice Lines]
 *     description: Replaces all existing lines for the invoice with the provided array. Lines without an ID will be created, lines with an ID will be updated. Lines not present in the array will be deleted.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/invoiceId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/InvoiceLineInput' # Can include optional ID for updates
 *     responses:
 *       200:
 *         description: Invoice lines updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/InvoiceLine'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 *       422:
 *         description: Validation Error (Invalid ID format or invalid array structure/content)
 *       500:
 *         description: Server Error
 */
router.put('/:id/lines', [
  auth,
  param('id').isInt({ gt: 0 }).withMessage('Invoice ID must be a positive integer').toInt(),
  // Add validation for the array items themselves
  body().isArray().withMessage('Request body must be an array of invoice lines'),
  body('*.description').optional().trim().notEmpty().withMessage('Line description cannot be empty').escape(),
  body('*.quantity').optional().isInt({ gt: 0 }).withMessage('Line quantity must be a positive integer').toInt(),
  body('*.unit_price').optional().isFloat({ gt: 0 }).withMessage('Line unit price must be a positive number').toFloat(),
  body('*.hs_code').optional().trim().escape(),
  body('*.id').optional().isInt({ gt: 0 }).withMessage('Line ID must be a positive integer').toInt(), // Validate optional ID
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { id } = req.params; // Use sanitized ID
    const incomingLines = req.body; // Use validated/sanitized array

    const updatedLines = await db.sequelize.transaction(async (transaction) => {
        // Verify invoice belongs to user
        const invoice = await Invoice.findOne({
          where: { id, user_id: req.user.id },
          attributes: ['id'],
          transaction
        });

        if (!invoice) {
          const error = new Error('Invoice not found');
          error.status = 404;
          throw error;
        }

        // Get IDs of incoming lines that have an ID (for update/keep)
        const incomingLineIds = incomingLines.filter(line => line.id).map(line => line.id);

        // Delete lines associated with the invoice that are NOT in the incoming array
        await InvoiceLine.destroy({
            where: {
                invoice_id: id,
                id: { [db.Sequelize.Op.notIn]: incomingLineIds } // Delete if ID not present
            },
            transaction
        });

        // Upsert (Update or Create) lines
        const results = [];
        for (const line of incomingLines) {
            const lineData = {
                invoice_id: id,
                description: line.description,
                quantity: line.quantity,
                unit_price: line.unit_price,
                hs_code: line.hs_code
            };

            if (line.id) {
                // Update existing line if ID matches and belongs to this invoice
                const [affectedRows] = await InvoiceLine.update(lineData, {
                    where: { id: line.id, invoice_id: id },
                    transaction,
                    returning: false // Don't need the updated record directly here
                });
                // If update was successful, fetch the updated record to return later
                if (affectedRows > 0) {
                   const updatedLine = await InvoiceLine.findByPk(line.id, { transaction });
                   if(updatedLine) results.push(updatedLine);
                } else {
                    // Handle case where line ID was provided but didn't match/belong to invoice?
                    // Could log a warning or ignore. Ignoring for now.
                    console.warn(`Invoice line with ID ${line.id} not found or doesn't belong to invoice ${id}. Skipping update.`);
                }

            } else {
                // Create new line
                const createdLine = await InvoiceLine.create(lineData, { transaction });
                results.push(createdLine);
            }
        }

        // Update invoice total after all line operations
        await updateInvoiceTotal(id, transaction);

        return results; // Return the array of created/updated lines
    });


    return res.json(updatedLines);
  } catch (error) {
      if (error.status === 404) {
          return res.status(404).json({ message: error.message });
      }
      next(error); // Pass other errors to centralized handler
  }
});


/**
 * @swagger
 * /invoices/{invoiceId}/lines/{lineId}:
 *   delete:
 *     summary: Delete a specific invoice line
 *     tags: [Invoice Lines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: invoiceId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the invoice containing the line.
 *       - $ref: '#/components/parameters/lineId'
 *     responses:
 *       200:
 *         description: Invoice line deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invoice line deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice or Invoice Line not found
 *       422:
 *         description: Validation Error (Invalid ID format)
 *       500:
 *         description: Server Error
 */
router.delete('/:invoiceId/lines/:lineId', [
  auth,
  param('invoiceId').isInt({ gt: 0 }).withMessage('Invoice ID must be a positive integer').toInt(),
  param('lineId').isInt({ gt: 0 }).withMessage('Line ID must be a positive integer').toInt(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { invoiceId, lineId } = req.params; // Use sanitized IDs

    await db.sequelize.transaction(async (transaction) => {
        // Verify invoice belongs to user
        const invoice = await Invoice.findOne({
          where: { id: invoiceId, user_id: req.user.id },
          attributes: ['id'],
          transaction
        });

        if (!invoice) {
          const error = new Error('Invoice not found');
          error.status = 404;
          throw error;
        }

        // Delete invoice line
        const result = await InvoiceLine.destroy({
          where: {
            id: lineId,
            invoice_id: invoiceId // Ensure line belongs to the correct invoice
          },
          transaction
        });

        if (result === 0) {
          // If destroy returned 0, the line wasn't found for that invoice
          const error = new Error('Invoice line not found');
          error.status = 404;
          throw error;
        }

        // Update invoice total
        await updateInvoiceTotal(invoiceId, transaction);
    });


    return res.json({ message: 'Invoice line deleted successfully' });
  } catch (error) {
      if (error.status === 404) {
          return res.status(404).json({ message: error.message });
      }
      next(error); // Pass other errors to centralized handler
  }
});


module.exports = router;