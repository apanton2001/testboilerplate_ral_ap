'use strict';

const fs = require('fs').promises;
const path = require('path');
const xmlbuilder2 = require('xmlbuilder2');
const puppeteer = require('puppeteer');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'document-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/document.log' })
  ]
});

// Document storage location
const DOCUMENT_STORAGE_PATH = process.env.DOCUMENT_STORAGE_PATH || path.join(__dirname, '../../storage/documents');

/**
 * Ensure document storage directory exists
 */
const ensureStorageDirectory = async () => {
  try {
    await fs.mkdir(DOCUMENT_STORAGE_PATH, { recursive: true });
    logger.info('Document storage directory ensured', { path: DOCUMENT_STORAGE_PATH });
  } catch (error) {
    logger.error('Failed to create document storage directory', { error: error.message });
    throw new Error(`Failed to create document storage directory: ${error.message}`);
  }
};

/**
 * Generate ASYCUDA-compliant XML document from invoice data
 * @param {Object} invoice - Invoice object with all related data
 * @returns {String} XML document as string
 */
const generateXmlDocument = async (invoice) => {
  try {
    if (!invoice) {
      throw new Error('Invoice data is required');
    }

    // Create XML document
    const root = xmlbuilder2.create({ version: '1.0', encoding: 'UTF-8' });
    
    const asycudaDoc = root.ele('ASYCUDADocument', {
      version: '1.0',
      xmlns: 'http://www.asycuda.org/schema/declaration'
    });
    
    // Add declaration header
    const header = asycudaDoc.ele('Header');
    header.ele('DeclarationOffice', invoice.id);
    header.ele('DeclarationDate', new Date(invoice.invoice_date || invoice.created_at).toISOString().split('T')[0]);
    header.ele('DeclarationType', 'IM');
    
    // Add exporter information
    const exporter = asycudaDoc.ele('Exporter');
    exporter.ele('Name', invoice.supplier || 'Unknown Supplier');
    
    // Add importer information (from user data)
    const importer = asycudaDoc.ele('Importer');
    if (invoice.user) {
      importer.ele('Name', invoice.user.name || 'Unknown Importer');
      importer.ele('Address', invoice.user.address || 'Unknown Address');
    } else {
      importer.ele('Name', 'Unknown Importer');
    }
    
    // Add items
    const items = asycudaDoc.ele('Items');
    if (invoice.invoice_lines && invoice.invoice_lines.length > 0) {
      invoice.invoice_lines.forEach((line, index) => {
        const item = items.ele('Item');
        item.ele('ItemNumber', index + 1);
        item.ele('Description', line.description || 'No description');
        item.ele('HSCode', line.hs_code || '0000.00.00');
        item.ele('Quantity', line.quantity || 0);
        item.ele('UnitPrice', line.unit_price || 0);
        item.ele('TotalPrice', (line.quantity * line.unit_price) || 0);
      });
    }
    
    // Add totals
    const totals = asycudaDoc.ele('Totals');
    totals.ele('TotalItems', invoice.invoice_lines ? invoice.invoice_lines.length : 0);
    totals.ele('TotalAmount', invoice.total_amount || 0);
    
    // Convert to string
    const xmlString = root.end({ prettyPrint: true });
    
    logger.info('XML document generated successfully', { invoiceId: invoice.id });
    return xmlString;
  } catch (error) {
    logger.error('Error generating XML document', { 
      error: error.message,
      invoiceId: invoice?.id
    });
    throw new Error(`Failed to generate XML document: ${error.message}`);
  }
};

/**
 * Generate PDF document from XML data
 * @param {String} xmlData - XML document as string
 * @param {Object} invoice - Invoice object for metadata
 * @returns {Buffer} PDF document as buffer
 */
const generatePdfDocument = async (xmlData, invoice) => {
  let browser;
  try {
    if (!xmlData) {
      throw new Error('XML data is required');
    }

    // Create HTML template from XML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Customs Declaration - Invoice #${invoice.id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          h1 {
            color: #2c3e50;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
          }
          .section {
            margin-bottom: 20px;
          }
          .section-title {
            font-weight: bold;
            margin-bottom: 5px;
            color: #3498db;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          .footer {
            margin-top: 30px;
            border-top: 1px solid #eee;
            padding-top: 10px;
            font-size: 12px;
            color: #7f8c8d;
          }
        </style>
      </head>
      <body>
        <h1>Customs Declaration</h1>
        <div class="section">
          <div class="section-title">Declaration Details</div>
          <p>Invoice #: ${invoice.id}</p>
          <p>Date: ${new Date(invoice.invoice_date || invoice.created_at).toLocaleDateString()}</p>
          <p>Supplier: ${invoice.supplier || 'Unknown Supplier'}</p>
        </div>
        
        <div class="section">
          <div class="section-title">Items</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>HS Code</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.invoice_lines && invoice.invoice_lines.map((line, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${line.description || 'No description'}</td>
                  <td>${line.hs_code || 'Unclassified'}</td>
                  <td>${line.quantity || 0}</td>
                  <td>$${line.unit_price ? line.unit_price.toFixed(2) : '0.00'}</td>
                  <td>$${line.quantity && line.unit_price ? (line.quantity * line.unit_price).toFixed(2) : '0.00'}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" style="text-align: right;"><strong>Total:</strong></td>
                <td>$${invoice.total_amount ? invoice.total_amount.toFixed(2) : '0.00'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div class="footer">
          <p>This document was automatically generated by the Automated Customs Documentation Platform.</p>
          <p>Document ID: ${invoice.id}-${Date.now()}</p>
        </div>
      </body>
      </html>
    `;

    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    
    logger.info('PDF document generated successfully', { invoiceId: invoice.id });
    return pdfBuffer;
  } catch (error) {
    logger.error('Error generating PDF document', { 
      error: error.message,
      invoiceId: invoice?.id
    });
    throw new Error(`Failed to generate PDF document: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

/**
 * Store document in the file system
 * @param {Buffer|String} document - Document content
 * @param {String} filename - Filename
 * @param {String} type - Document type (xml, pdf)
 * @returns {String} File path
 */
const storeDocument = async (document, filename, type) => {
  try {
    await ensureStorageDirectory();
    
    const filePath = path.join(DOCUMENT_STORAGE_PATH, filename);
    
    if (type === 'xml') {
      await fs.writeFile(filePath, document, 'utf8');
    } else {
      await fs.writeFile(filePath, document);
    }
    
    logger.info('Document stored successfully', { filename, type });
    return filePath;
  } catch (error) {
    logger.error('Error storing document', { 
      error: error.message,
      filename,
      type
    });
    throw new Error(`Failed to store document: ${error.message}`);
  }
};

/**
 * Generate all documents for an invoice
 * @param {Number} invoiceId - Invoice ID
 * @returns {Object} Generated document paths
 */
const generateDocuments = async (invoiceId) => {
  try {
    const db = require('../models');
    const { Invoice, InvoiceLine, User } = db;
    
    // Get invoice with related data
    const invoice = await Invoice.findByPk(invoiceId, {
      include: [
        {
          model: InvoiceLine,
          as: 'invoice_lines'
        },
        {
          model: User,
          as: 'user'
        }
      ]
    });
    
    if (!invoice) {
      throw new Error(`Invoice with ID ${invoiceId} not found`);
    }
    
    // Generate XML document
    const xmlData = await generateXmlDocument(invoice);
    const xmlFilename = `invoice_${invoiceId}_${Date.now()}.xml`;
    const xmlPath = await storeDocument(xmlData, xmlFilename, 'xml');
    
    // Generate PDF document
    const pdfBuffer = await generatePdfDocument(xmlData, invoice);
    const pdfFilename = `invoice_${invoiceId}_${Date.now()}.pdf`;
    const pdfPath = await storeDocument(pdfBuffer, pdfFilename, 'pdf');
    
    logger.info('All documents generated successfully', { 
      invoiceId,
      xmlPath,
      pdfPath
    });
    
    return {
      invoiceId,
      xmlPath,
      pdfPath,
      xmlFilename,
      pdfFilename
    };
  } catch (error) {
    logger.error('Error generating documents', { 
      error: error.message,
      invoiceId
    });
    throw new Error(`Failed to generate documents: ${error.message}`);
  }
};

module.exports = {
  generateXmlDocument,
  generatePdfDocument,
  storeDocument,
  generateDocuments
};