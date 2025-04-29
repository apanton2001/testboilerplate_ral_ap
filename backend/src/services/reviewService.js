'use strict';

const winston = require('winston');
const db = require('../models');
const { InvoiceLine, Invoice, ClassificationHistory, User, Notification } = db;
const { Op } = require('sequelize');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'review-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/review.log' })
  ]
});

/**
 * Get all flagged invoice lines that need review
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of items to return
 * @param {number} options.offset - Offset for pagination
 * @param {string} options.sortBy - Field to sort by
 * @param {string} options.sortOrder - Sort order (asc/desc)
 * @returns {Promise<Object>} Flagged items with pagination info
 */
const getFlaggedItems = async (options = {}) => {
  const {
    limit = 10,
    offset = 0,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = options;

  try {
    const { count, rows } = await InvoiceLine.findAndCountAll({
      where: {
        flagged: true
      },
      include: [
        {
          model: Invoice,
          as: 'invoice',
          attributes: ['id', 'supplier', 'invoice_date', 'status']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit,
      offset
    });

    logger.info('Retrieved flagged items for review', {
      count,
      limit,
      offset
    });

    return {
      items: rows,
      pagination: {
        total: count,
        limit,
        offset,
        pages: Math.ceil(count / limit),
        currentPage: Math.floor(offset / limit) + 1
      }
    };
  } catch (error) {
    logger.error('Error retrieving flagged items', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get a specific flagged invoice line by ID
 * @param {number} id - Invoice line ID
 * @returns {Promise<Object>} Invoice line with related data
 */
const getFlaggedItemById = async (id) => {
  try {
    const invoiceLine = await InvoiceLine.findOne({
      where: {
        id,
        flagged: true
      },
      include: [
        {
          model: Invoice,
          as: 'invoice',
          attributes: ['id', 'supplier', 'invoice_date', 'status', 'user_id']
        },
        {
          model: ClassificationHistory,
          as: 'classification_history',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'full_name', 'email']
            }
          ]
        }
      ]
    });

    if (!invoiceLine) {
      throw new Error(`Flagged item with ID ${id} not found`);
    }

    logger.info('Retrieved flagged item by ID', { id });
    return invoiceLine;
  } catch (error) {
    logger.error('Error retrieving flagged item by ID', {
      id,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Approve an HS code for a flagged invoice line
 * @param {number} id - Invoice line ID
 * @param {number} userId - User ID who approved
 * @param {string} comment - Optional comment for the approval
 * @returns {Promise<Object>} Updated invoice line
 */
const approveHsCode = async (id, userId, comment = '') => {
  const transaction = await db.sequelize.transaction();

  try {
    // Get the invoice line
    const invoiceLine = await InvoiceLine.findByPk(id, { transaction });
    if (!invoiceLine) {
      await transaction.rollback();
      throw new Error(`Invoice line with ID ${id} not found`);
    }

    // Check if it's flagged
    if (!invoiceLine.flagged) {
      await transaction.rollback();
      throw new Error(`Invoice line with ID ${id} is not flagged for review`);
    }

    // Update the invoice line to unflag it
    await invoiceLine.update({
      flagged: false
    }, { transaction });

    // Create a history record
    const history = await ClassificationHistory.create({
      invoice_line_id: id,
      previous_hs_code: invoiceLine.hs_code,
      new_hs_code: invoiceLine.hs_code, // Same code, just approved
      changed_by: userId,
      changed_at: new Date(),
      comment: comment || 'Approved without changes'
    }, { transaction });

    // Get the invoice to notify the owner
    const invoice = await Invoice.findByPk(invoiceLine.invoice_id, { transaction });
    
    // Create notification for the invoice owner
    if (invoice && invoice.user_id) {
      await Notification.create({
        user_id: invoice.user_id,
        type: 'ClassificationApproved',
        message: `HS code ${invoiceLine.hs_code} for item "${invoiceLine.description}" has been approved.`,
        read: false
      }, { transaction });
    }

    await transaction.commit();

    logger.info('Approved HS code for flagged item', {
      id,
      userId,
      hsCode: invoiceLine.hs_code
    });

    // Return the updated invoice line with history
    return {
      invoiceLine: await InvoiceLine.findByPk(id, {
        include: [
          {
            model: ClassificationHistory,
            as: 'classification_history',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'full_name', 'email']
              }
            ]
          }
        ]
      }),
      history
    };
  } catch (error) {
    await transaction.rollback();
    logger.error('Error approving HS code', {
      id,
      userId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Adjust HS code for a flagged invoice line
 * @param {number} id - Invoice line ID
 * @param {string} newHsCode - New HS code
 * @param {number} userId - User ID who made the adjustment
 * @param {string} comment - Comment explaining the adjustment
 * @returns {Promise<Object>} Updated invoice line
 */
const adjustHsCode = async (id, newHsCode, userId, comment = '') => {
  const transaction = await db.sequelize.transaction();

  try {
    // Get the invoice line
    const invoiceLine = await InvoiceLine.findByPk(id, { transaction });
    if (!invoiceLine) {
      await transaction.rollback();
      throw new Error(`Invoice line with ID ${id} not found`);
    }

    const previousHsCode = invoiceLine.hs_code;

    // Update the invoice line with new HS code and unflag it
    await invoiceLine.update({
      hs_code: newHsCode,
      flagged: false,
      classification_method: 'manual'
    }, { transaction });

    // Create a history record
    const history = await ClassificationHistory.create({
      invoice_line_id: id,
      previous_hs_code: previousHsCode,
      new_hs_code: newHsCode,
      changed_by: userId,
      changed_at: new Date(),
      comment: comment || `Adjusted HS code from ${previousHsCode} to ${newHsCode}`
    }, { transaction });

    // Get the invoice to notify the owner
    const invoice = await Invoice.findByPk(invoiceLine.invoice_id, { transaction });
    
    // Create notification for the invoice owner
    if (invoice && invoice.user_id) {
      await Notification.create({
        user_id: invoice.user_id,
        type: 'ClassificationAdjusted',
        message: `HS code for item "${invoiceLine.description}" has been adjusted from ${previousHsCode} to ${newHsCode}.`,
        read: false
      }, { transaction });
    }

    await transaction.commit();

    logger.info('Adjusted HS code for flagged item', {
      id,
      userId,
      previousHsCode,
      newHsCode
    });

    // Return the updated invoice line with history
    return {
      invoiceLine: await InvoiceLine.findByPk(id, {
        include: [
          {
            model: ClassificationHistory,
            as: 'classification_history',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'full_name', 'email']
              }
            ]
          }
        ]
      }),
      history
    };
  } catch (error) {
    await transaction.rollback();
    logger.error('Error adjusting HS code', {
      id,
      newHsCode,
      userId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get review statistics
 * @returns {Promise<Object>} Review statistics
 */
const getReviewStats = async () => {
  try {
    const totalFlagged = await InvoiceLine.count({
      where: { flagged: true }
    });

    const reviewedToday = await ClassificationHistory.count({
      where: {
        changed_at: {
          [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    const pendingBySupplier = await InvoiceLine.findAll({
      where: { flagged: true },
      include: [
        {
          model: Invoice,
          as: 'invoice',
          attributes: ['supplier']
        }
      ],
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('InvoiceLine.id')), 'count']
      ],
      group: ['invoice.supplier'],
      raw: true
    });

    logger.info('Retrieved review statistics');

    return {
      totalFlagged,
      reviewedToday,
      pendingBySupplier
    };
  } catch (error) {
    logger.error('Error retrieving review statistics', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Get review history
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of items to return
 * @param {number} options.offset - Offset for pagination
 * @returns {Promise<Object>} Review history with pagination info
 */
const getReviewHistory = async (options = {}) => {
  const {
    limit = 10,
    offset = 0
  } = options;

  try {
    const { count, rows } = await ClassificationHistory.findAndCountAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'full_name', 'email']
        },
        {
          model: InvoiceLine,
          as: 'invoice_line',
          attributes: ['id', 'description', 'hs_code', 'invoice_id']
        }
      ],
      order: [['changed_at', 'DESC']],
      limit,
      offset
    });

    logger.info('Retrieved review history', {
      count,
      limit,
      offset
    });

    return {
      history: rows,
      pagination: {
        total: count,
        limit,
        offset,
        pages: Math.ceil(count / limit),
        currentPage: Math.floor(offset / limit) + 1
      }
    };
  } catch (error) {
    logger.error('Error retrieving review history', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

module.exports = {
  getFlaggedItems,
  getFlaggedItemById,
  approveHsCode,
  adjustHsCode,
  getReviewStats,
  getReviewHistory
};