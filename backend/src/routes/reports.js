'use strict';

const express = require('express');
const router = express.Router();
const { query, param } = require('express-validator'); // Removed body as it's not used
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const { handleValidationErrors } = require('../middleware/validation'); // Import validation handler
const reportingService = require('../services/reportingService');

// --- Helper Function to Build Filters ---
function buildReportFilters(queryParams) {
    const filters = {};
    if (queryParams.startDate) filters.startDate = queryParams.startDate; // Already validated/sanitized
    if (queryParams.endDate) filters.endDate = queryParams.endDate;     // Already validated/sanitized
    if (queryParams.userId) filters.userId = queryParams.userId;         // Already validated/sanitized
    // Add defaults or specific logic for savings report
    if (queryParams.brokerFeePerEntry !== undefined) {
        filters.brokerFeePerEntry = queryParams.brokerFeePerEntry; // Already validated/sanitized
    } else {
        filters.brokerFeePerEntry = 150; // Default value
    }
    if (queryParams.hourlyRate !== undefined) {
        filters.hourlyRate = queryParams.hourlyRate; // Already validated/sanitized
    } else {
        filters.hourlyRate = 75; // Default value
    }
    return filters;
}

// --- Swagger Definitions ---

/**
 * @swagger
 * components:
 *   schemas:
 *     ReportFilters:
 *       type: object
 *       properties:
 *         startDate:
 *           type: string
 *           format: date
 *           description: Start date for the report period (YYYY-MM-DD).
 *         endDate:
 *           type: string
 *           format: date
 *           description: End date for the report period (YYYY-MM-DD).
 *         userId:
 *           type: integer
 *           description: Optional user ID to filter volume report.
 *         brokerFeePerEntry:
 *           type: number
 *           format: float
 *           description: Broker fee per entry (for savings report). Default 150.
 *         hourlyRate:
 *           type: number
 *           format: float
 *           description: Internal hourly rate (for savings report). Default 75.
 *     VolumeReport:
 *       type: object
 *       properties:
 *         totalInvoices:
 *           type: integer
 *         totalInvoiceLines:
 *           type: integer
 *         volumeByDate:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               count:
 *                 type: integer
 *         # Add other relevant volume metrics
 *     AccuracyReport:
 *       type: object
 *       properties:
 *         autoClassificationRate:
 *           type: number
 *           format: float
 *           description: Percentage of lines auto-classified (0-1).
 *         manualOverrideRate:
 *           type: number
 *           format: float
 *           description: Percentage of lines manually overridden (0-1).
 *         accuracyByHsCode:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               hs_code:
 *                 type: string
 *               accuracy:
 *                 type: number
 *                 format: float
 *         # Add other relevant accuracy metrics
 *     SavingsReport:
 *       type: object
 *       properties:
 *         totalSavings:
 *           type: number
 *           format: float
 *           description: Estimated total cost savings.
 *         brokerFeeSavings:
 *           type: number
 *           format: float
 *           description: Savings from reduced broker fees.
 *         timeHoursSaved:
 *           type: number
 *           format: float
 *           description: Estimated hours saved.
 *         timeCostSavings:
 *           type: number
 *           format: float
 *           description: Cost savings from time saved.
 *         # Add other relevant savings metrics
 *     ReportSummary:
 *       type: object
 *       properties:
 *         totalInvoices:
 *           type: integer
 *         totalInvoiceLines:
 *           type: integer
 *         autoClassificationRate:
 *           type: number
 *           format: float
 *         manualOverrideRate:
 *           type: number
 *           format: float
 *         totalSavings:
 *           type: number
 *           format: float
 *         timeHoursSaved:
 *           type: number
 *           format: float
 *   parameters:
 *     reportStartDate:
 *       in: query
 *       name: startDate
 *       schema:
 *         type: string
 *         format: date
 *       description: Start date for report data (YYYY-MM-DD).
 *     reportEndDate:
 *       in: query
 *       name: endDate
 *       schema:
 *         type: string
 *         format: date
 *       description: End date for report data (YYYY-MM-DD).
 *     reportUserId:
 *       in: query
 *       name: userId
 *       schema:
 *         type: integer
 *       description: Optional user ID to filter volume report.
 *     reportBrokerFee:
 *       in: query
 *       name: brokerFeePerEntry
 *       schema:
 *         type: number
 *         format: float
 *         default: 150
 *       description: Broker fee per entry (for savings report).
 *     reportHourlyRate:
 *       in: query
 *       name: hourlyRate
 *       schema:
 *         type: number
 *         format: float
 *         default: 75
 *       description: Internal hourly rate (for savings report).
 *     reportFormat:
 *       in: query
 *       name: format
 *       schema:
 *         type: string
 *         enum: [csv, excel]
 *       required: true
 *       description: Format for exporting the report.
 *     reportTypeParam:
 *       in: path
 *       name: reportType
 *       schema:
 *         type: string
 *         enum: [volume, accuracy, savings]
 *       required: true
 *       description: The type of report to export.
 */

// --- Routes ---

/**
 * @swagger
 * /reports/volume:
 *   get:
 *     summary: Retrieve the import volume report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/reportStartDate'
 *       - $ref: '#/components/parameters/reportEndDate'
 *       - $ref: '#/components/parameters/reportUserId'
 *     responses:
 *       200:
 *         description: Volume report data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 report:
 *                   $ref: '#/components/schemas/VolumeReport'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (User lacks admin role)
 *       422:
 *         description: Validation Error (Invalid query parameters)
 *       500:
 *         description: Server Error generating report.
 */
router.get('/volume', [
  auth,
  roleAuth(['admin']),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO8601 date').toDate(), // Validate and sanitize
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO8601 date').toDate(),     // Validate and sanitize
  query('userId').optional().isInt({ gt: 0 }).withMessage('User ID must be a positive integer').toInt(),      // Validate and sanitize
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const filters = buildReportFilters(req.query); // Use helper
    const report = await reportingService.generateVolumeReport(filters);

    return res.json({
      success: true,
      report
    });
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /reports/accuracy:
 *   get:
 *     summary: Retrieve the classification accuracy report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/reportStartDate'
 *       - $ref: '#/components/parameters/reportEndDate'
 *     responses:
 *       200:
 *         description: Accuracy report data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 report:
 *                   $ref: '#/components/schemas/AccuracyReport'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (User lacks admin role)
 *       422:
 *         description: Validation Error (Invalid query parameters)
 *       500:
 *         description: Server Error generating report.
 */
router.get('/accuracy', [
  auth,
  roleAuth(['admin']),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO8601 date').toDate(),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO8601 date').toDate(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const filters = buildReportFilters(req.query); // Use helper
    const report = await reportingService.generateAccuracyReport(filters);

    return res.json({
      success: true,
      report
    });
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /reports/savings:
 *   get:
 *     summary: Retrieve the cost savings report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/reportStartDate'
 *       - $ref: '#/components/parameters/reportEndDate'
 *       - $ref: '#/components/parameters/reportBrokerFee'
 *       - $ref: '#/components/parameters/reportHourlyRate'
 *     responses:
 *       200:
 *         description: Savings report data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 report:
 *                   $ref: '#/components/schemas/SavingsReport'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (User lacks admin role)
 *       422:
 *         description: Validation Error (Invalid query parameters)
 *       500:
 *         description: Server Error generating report.
 */
router.get('/savings', [
  auth,
  roleAuth(['admin']),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO8601 date').toDate(),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO8601 date').toDate(),
  query('brokerFeePerEntry').optional().isFloat({ gt: 0 }).withMessage('Broker fee must be a positive number').toFloat(), // Validate and sanitize
  query('hourlyRate').optional().isFloat({ gt: 0 }).withMessage('Hourly rate must be a positive number').toFloat(),       // Validate and sanitize
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const filters = buildReportFilters(req.query); // Use helper
    const report = await reportingService.generateSavingsReport(filters);

    return res.json({
      success: true,
      report
    });
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /reports/export/{reportType}:
 *   get:
 *     summary: Export report data as CSV or Excel
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/reportTypeParam'
 *       - $ref: '#/components/parameters/reportFormat'
 *       - $ref: '#/components/parameters/reportStartDate'
 *       - $ref: '#/components/parameters/reportEndDate'
 *       # Add other relevant filter params depending on reportType (e.g., savings params)
 *       - $ref: '#/components/parameters/reportBrokerFee' # Only relevant if reportType is 'savings'
 *       - $ref: '#/components/parameters/reportHourlyRate' # Only relevant if reportType is 'savings'
 *     responses:
 *       200:
 *         description: Report file stream (CSV or Excel).
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Bad Request (Invalid report type).
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (User lacks admin role)
 *       422:
 *         description: Validation Error (Invalid query/param format).
 *       500:
 *         description: Server Error generating or exporting report.
 */
router.get('/export/:reportType', [
  auth,
  roleAuth(['admin']),
  param('reportType').trim().isIn(['volume', 'accuracy', 'savings']).withMessage('Report type must be volume, accuracy, or savings'), // Validate param
  query('format').trim().isIn(['csv', 'excel']).withMessage('Format must be csv or excel'), // Validate query
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO8601 date').toDate(),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO8601 date').toDate(),
  // Conditionally validate savings params - express-validator doesn't easily support this, handle in logic or service
  query('brokerFeePerEntry').optional().isFloat({ gt: 0 }).withMessage('Broker fee must be a positive number').toFloat(),
  query('hourlyRate').optional().isFloat({ gt: 0 }).withMessage('Hourly rate must be a positive number').toFloat(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const { reportType } = req.params; // Use validated param
    const { format } = req.query;     // Use validated query
    const filters = buildReportFilters(req.query); // Use helper

    // Generate report data based on type
    let reportData;
    switch (reportType) {
      case 'volume':
        reportData = await reportingService.generateVolumeReport(filters);
        break;
      case 'accuracy':
        reportData = await reportingService.generateAccuracyReport(filters);
        break;
      case 'savings':
        // Ensure savings-specific filters are present if needed by the service
        if (filters.brokerFeePerEntry === undefined || filters.hourlyRate === undefined) {
             console.warn("Savings report export called without brokerFee or hourlyRate, using defaults.");
             // Defaults are already set in buildReportFilters, but could add explicit check/error if required
        }
        reportData = await reportingService.generateSavingsReport(filters);
        break;
      default:
        // This case should be prevented by validation, but good practice to include
        const error = new Error('Invalid report type specified.');
        error.status = 400;
        throw error;
    }

    // Export data in requested format
    let buffer;
    let contentType;
    const filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;

    if (format === 'csv') {
      buffer = await reportingService.exportToCSV(reportData, reportType); // Service needs to handle different report structures
      contentType = 'text/csv';
    } else { // excel
      buffer = await reportingService.exportToExcel(reportData, reportType); // Service needs to handle different report structures
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`); // Quote filename

    // Send file buffer
    return res.send(buffer);
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /reports/summary:
 *   get:
 *     summary: Retrieve a summary of key metrics from all reports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/reportStartDate'
 *       - $ref: '#/components/parameters/reportEndDate'
 *     responses:
 *       200:
 *         description: Report summary data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 summary:
 *                   $ref: '#/components/schemas/ReportSummary'
 *                 # Optionally remove the full reports from summary endpoint
 *                 # reports:
 *                 #   type: object
 *                 #   properties:
 *                 #     volume: $ref: '#/components/schemas/VolumeReport'
 *                 #     accuracy: $ref: '#/components/schemas/AccuracyReport'
 *                 #     savings: $ref: '#/components/schemas/SavingsReport'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (User lacks admin role)
 *       422:
 *         description: Validation Error (Invalid query parameters)
 *       500:
 *         description: Server Error generating reports.
 */
router.get('/summary', [
  auth,
  roleAuth(['admin']),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO8601 date').toDate(),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO8601 date').toDate(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    // Use default savings params for summary calculation
    const filters = buildReportFilters(req.query);

    // Generate all reports in parallel
    // Consider if the reporting service can provide a dedicated summary function
    // to avoid generating full reports if only summary needed.
    const [volumeReport, accuracyReport, savingsReport] = await Promise.all([
      reportingService.generateVolumeReport(filters).catch(err => { console.error("Error generating volume report for summary:", err); return {}; }), // Gracefully handle individual report errors
      reportingService.generateAccuracyReport(filters).catch(err => { console.error("Error generating accuracy report for summary:", err); return {}; }),
      reportingService.generateSavingsReport(filters).catch(err => { console.error("Error generating savings report for summary:", err); return {}; })
    ]);

    // Combine key metrics into a summary, checking for existence
    const summary = {
      totalInvoices: volumeReport?.totalInvoices ?? null,
      totalInvoiceLines: volumeReport?.totalInvoiceLines ?? null,
      autoClassificationRate: accuracyReport?.autoClassificationRate ?? null,
      manualOverrideRate: accuracyReport?.manualOverrideRate ?? null,
      totalSavings: savingsReport?.totalSavings ?? null,
      timeHoursSaved: savingsReport?.timeHoursSaved ?? null
    };

    return res.json({
      success: true,
      summary
      // Optionally exclude full reports from summary response for brevity
      // reports: { volume: volumeReport, accuracy: accuracyReport, savings: savingsReport }
    });
  } catch (error) {
     // Catch errors from Promise.all or other issues
    next(error); // Pass error to centralized handler
  }
});

module.exports = router;