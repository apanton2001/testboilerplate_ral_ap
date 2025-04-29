'use strict';

const db = require('../models');
const { Op } = require('sequelize');
const winston = require('winston');
const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'reporting-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/reporting.log' })
  ]
});

/**
 * Generate import volume report
 * @param {Object} filters - Report filters (date range, etc.)
 * @returns {Promise<Object>} Report data
 */
const generateVolumeReport = async (filters = {}) => {
  try {
    const { startDate, endDate, userId } = filters;
    
    // Build query conditions
    const whereConditions = {};
    
    if (startDate && endDate) {
      whereConditions.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereConditions.created_at = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereConditions.created_at = {
        [Op.lte]: new Date(endDate)
      };
    }
    
    if (userId) {
      whereConditions.user_id = userId;
    }
    
    // Get invoice counts
    const totalInvoices = await db.Invoice.count({
      where: whereConditions
    });
    
    // Get invoice line counts
    const totalInvoiceLines = await db.InvoiceLine.count({
      include: [{
        model: db.Invoice,
        as: 'invoice',
        where: whereConditions
      }]
    });
    
    // Get monthly breakdown
    const monthlyData = await db.sequelize.query(`
      SELECT 
        DATE_TRUNC('month', created_at) AS month,
        COUNT(*) AS invoice_count,
        SUM(total_amount) AS total_value
      FROM 
        invoices
      WHERE
        created_at BETWEEN :startDate AND :endDate
      GROUP BY 
        DATE_TRUNC('month', created_at)
      ORDER BY 
        month ASC
    `, {
      replacements: { 
        startDate: startDate || new Date(0), 
        endDate: endDate || new Date() 
      },
      type: db.sequelize.QueryTypes.SELECT
    });
    
    // Get status breakdown
    const statusBreakdown = await db.Invoice.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      where: whereConditions,
      group: ['status']
    });
    
    return {
      totalInvoices,
      totalInvoiceLines,
      averageLinesPerInvoice: totalInvoices > 0 ? (totalInvoiceLines / totalInvoices).toFixed(2) : 0,
      monthlyData,
      statusBreakdown: statusBreakdown.map(item => ({
        status: item.status,
        count: parseInt(item.get('count'))
      }))
    };
  } catch (error) {
    logger.error('Error generating volume report', { error: error.message });
    throw error;
  }
};

/**
 * Generate classification accuracy report
 * @param {Object} filters - Report filters (date range, etc.)
 * @returns {Promise<Object>} Report data
 */
const generateAccuracyReport = async (filters = {}) => {
  try {
    const { startDate, endDate } = filters;
    
    // Build date range condition
    const dateCondition = {};
    if (startDate && endDate) {
      dateCondition.changed_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      dateCondition.changed_at = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      dateCondition.changed_at = {
        [Op.lte]: new Date(endDate)
      };
    }
    
    // Get total classifications
    const totalLines = await db.InvoiceLine.count({
      where: {
        hs_code: {
          [Op.not]: null
        }
      }
    });
    
    // Get auto-classified count
    const autoClassified = await db.InvoiceLine.count({
      where: {
        classification_method: 'auto',
        hs_code: {
          [Op.not]: null
        }
      }
    });
    
    // Get manual classifications
    const manualClassified = await db.InvoiceLine.count({
      where: {
        classification_method: 'manual'
      }
    });
    
    // Get flagged items
    const flaggedItems = await db.InvoiceLine.count({
      where: {
        flagged: true
      }
    });
    
    // Get classification changes (corrections)
    const classificationChanges = await db.ClassificationHistory.count({
      where: dateCondition
    });
    
    // Calculate accuracy metrics
    const autoClassificationRate = totalLines > 0 ? (autoClassified / totalLines * 100).toFixed(2) : 0;
    const manualOverrideRate = autoClassified > 0 ? (classificationChanges / autoClassified * 100).toFixed(2) : 0;
    const flaggedRate = totalLines > 0 ? (flaggedItems / totalLines * 100).toFixed(2) : 0;
    
    // Get most frequently changed HS codes
    const frequentChanges = await db.sequelize.query(`
      SELECT 
        previous_hs_code,
        new_hs_code,
        COUNT(*) as change_count
      FROM 
        classification_history
      WHERE
        changed_at BETWEEN :startDate AND :endDate
      GROUP BY 
        previous_hs_code, new_hs_code
      ORDER BY 
        change_count DESC
      LIMIT 10
    `, {
      replacements: { 
        startDate: startDate || new Date(0), 
        endDate: endDate || new Date() 
      },
      type: db.sequelize.QueryTypes.SELECT
    });
    
    return {
      totalClassifications: totalLines,
      autoClassified,
      manualClassified,
      flaggedItems,
      classificationChanges,
      autoClassificationRate,
      manualOverrideRate,
      flaggedRate,
      frequentChanges
    };
  } catch (error) {
    logger.error('Error generating accuracy report', { error: error.message });
    throw error;
  }
};

/**
 * Generate cost savings report
 * @param {Object} filters - Report filters (date range, etc.)
 * @returns {Promise<Object>} Report data
 */
const generateSavingsReport = async (filters = {}) => {
  try {
    const { startDate, endDate, brokerFeePerEntry = 150, hourlyRate = 75 } = filters;
    
    // Build date range condition
    const whereConditions = {};
    if (startDate && endDate) {
      whereConditions.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereConditions.created_at = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereConditions.created_at = {
        [Op.lte]: new Date(endDate)
      };
    }
    
    // Get total submissions
    const totalSubmissions = await db.Submission.count({
      where: {
        ...whereConditions,
        status: 'Success'
      }
    });
    
    // Get total invoice lines processed
    const totalLines = await db.InvoiceLine.count({
      include: [{
        model: db.Invoice,
        as: 'invoice',
        where: whereConditions
      }]
    });
    
    // Calculate broker fee savings
    const brokerFeeSavings = totalSubmissions * brokerFeePerEntry;
    
    // Estimate time savings (assume 5 minutes per line item for manual processing)
    const timeMinutesSaved = totalLines * 5;
    const timeHoursSaved = timeMinutesSaved / 60;
    
    // Calculate labor cost savings
    const laborCostSavings = timeHoursSaved * hourlyRate;
    
    // Calculate total savings
    const totalSavings = brokerFeeSavings + laborCostSavings;
    
    // Get monthly savings trend
    const monthlySavings = await db.sequelize.query(`
      SELECT 
        DATE_TRUNC('month', s.submitted_at) AS month,
        COUNT(DISTINCT s.id) AS submission_count,
        COUNT(il.id) AS line_count
      FROM 
        submissions s
      JOIN 
        invoices i ON s.invoice_id = i.id
      JOIN 
        invoice_lines il ON i.id = il.invoice_id
      WHERE
        s.status = 'Success' AND
        s.submitted_at BETWEEN :startDate AND :endDate
      GROUP BY 
        DATE_TRUNC('month', s.submitted_at)
      ORDER BY 
        month ASC
    `, {
      replacements: { 
        startDate: startDate || new Date(0), 
        endDate: endDate || new Date() 
      },
      type: db.sequelize.QueryTypes.SELECT
    });
    
    // Calculate savings for each month
    const monthlyBreakdown = monthlySavings.map(month => ({
      month: month.month,
      submissionCount: parseInt(month.submission_count),
      lineCount: parseInt(month.line_count),
      brokerFeeSavings: parseInt(month.submission_count) * brokerFeePerEntry,
      laborCostSavings: (parseInt(month.line_count) * 5 / 60) * hourlyRate,
      totalSavings: (parseInt(month.submission_count) * brokerFeePerEntry) + 
                   ((parseInt(month.line_count) * 5 / 60) * hourlyRate)
    }));
    
    return {
      totalSubmissions,
      totalLines,
      brokerFeeSavings,
      timeMinutesSaved,
      timeHoursSaved,
      laborCostSavings,
      totalSavings,
      monthlyBreakdown
    };
  } catch (error) {
    logger.error('Error generating savings report', { error: error.message });
    throw error;
  }
};

/**
 * Export report data to CSV format
 * @param {Object} data - Report data
 * @param {string} reportType - Type of report
 * @returns {Promise<Buffer>} CSV buffer
 */
const exportToCSV = async (data, reportType) => {
  try {
    let fields = [];
    let flattenedData = [];
    
    // Flatten and prepare data based on report type
    switch (reportType) {
      case 'volume':
        fields = ['month', 'invoice_count', 'total_value'];
        flattenedData = data.monthlyData.map(item => ({
          month: new Date(item.month).toISOString().split('T')[0],
          invoice_count: item.invoice_count,
          total_value: item.total_value
        }));
        break;
        
      case 'accuracy':
        fields = ['previous_hs_code', 'new_hs_code', 'change_count'];
        flattenedData = data.frequentChanges;
        break;
        
      case 'savings':
        fields = ['month', 'submission_count', 'line_count', 'broker_fee_savings', 'labor_cost_savings', 'total_savings'];
        flattenedData = data.monthlyBreakdown.map(item => ({
          month: new Date(item.month).toISOString().split('T')[0],
          submission_count: item.submissionCount,
          line_count: item.lineCount,
          broker_fee_savings: item.brokerFeeSavings,
          labor_cost_savings: item.laborCostSavings,
          total_savings: item.totalSavings
        }));
        break;
        
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }
    
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(flattenedData);
    
    return Buffer.from(csv);
  } catch (error) {
    logger.error('Error exporting to CSV', { error: error.message });
    throw error;
  }
};

/**
 * Export report data to Excel format
 * @param {Object} data - Report data
 * @param {string} reportType - Type of report
 * @returns {Promise<Buffer>} Excel buffer
 */
const exportToExcel = async (data, reportType) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report Data');
    
    // Prepare data based on report type
    switch (reportType) {
      case 'volume':
        // Add summary sheet
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.addRow(['Total Invoices', data.totalInvoices]);
        summarySheet.addRow(['Total Invoice Lines', data.totalInvoiceLines]);
        summarySheet.addRow(['Average Lines Per Invoice', data.averageLinesPerInvoice]);
        
        // Add status breakdown
        summarySheet.addRow([]);
        summarySheet.addRow(['Status Breakdown']);
        summarySheet.addRow(['Status', 'Count']);
        data.statusBreakdown.forEach(item => {
          summarySheet.addRow([item.status, item.count]);
        });
        
        // Add monthly data
        worksheet.addRow(['Month', 'Invoice Count', 'Total Value']);
        data.monthlyData.forEach(item => {
          worksheet.addRow([
            new Date(item.month).toISOString().split('T')[0],
            item.invoice_count,
            item.total_value
          ]);
        });
        break;
        
      case 'accuracy':
        // Add summary sheet
        const accuracySummary = workbook.addWorksheet('Summary');
        accuracySummary.addRow(['Total Classifications', data.totalClassifications]);
        accuracySummary.addRow(['Auto-Classified', data.autoClassified]);
        accuracySummary.addRow(['Manual Classifications', data.manualClassified]);
        accuracySummary.addRow(['Flagged Items', data.flaggedItems]);
        accuracySummary.addRow(['Classification Changes', data.classificationChanges]);
        accuracySummary.addRow(['Auto Classification Rate', `${data.autoClassificationRate}%`]);
        accuracySummary.addRow(['Manual Override Rate', `${data.manualOverrideRate}%`]);
        accuracySummary.addRow(['Flagged Rate', `${data.flaggedRate}%`]);
        
        // Add frequent changes
        worksheet.addRow(['Previous HS Code', 'New HS Code', 'Change Count']);
        data.frequentChanges.forEach(item => {
          worksheet.addRow([
            item.previous_hs_code || 'None',
            item.new_hs_code,
            item.change_count
          ]);
        });
        break;
        
      case 'savings':
        // Add summary sheet
        const savingsSummary = workbook.addWorksheet('Summary');
        savingsSummary.addRow(['Total Submissions', data.totalSubmissions]);
        savingsSummary.addRow(['Total Lines Processed', data.totalLines]);
        savingsSummary.addRow(['Broker Fee Savings', `$${data.brokerFeeSavings.toFixed(2)}`]);
        savingsSummary.addRow(['Time Saved (Hours)', data.timeHoursSaved.toFixed(2)]);
        savingsSummary.addRow(['Labor Cost Savings', `$${data.laborCostSavings.toFixed(2)}`]);
        savingsSummary.addRow(['Total Savings', `$${data.totalSavings.toFixed(2)}`]);
        
        // Add monthly breakdown
        worksheet.addRow(['Month', 'Submissions', 'Lines', 'Broker Fee Savings', 'Labor Cost Savings', 'Total Savings']);
        data.monthlyBreakdown.forEach(item => {
          worksheet.addRow([
            new Date(item.month).toISOString().split('T')[0],
            item.submissionCount,
            item.lineCount,
            `$${item.brokerFeeSavings.toFixed(2)}`,
            `$${item.laborCostSavings.toFixed(2)}`,
            `$${item.totalSavings.toFixed(2)}`
          ]);
        });
        break;
        
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }
    
    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    logger.error('Error exporting to Excel', { error: error.message });
    throw error;
  }
};

module.exports = {
  generateVolumeReport,
  generateAccuracyReport,
  generateSavingsReport,
  exportToCSV,
  exportToExcel
};