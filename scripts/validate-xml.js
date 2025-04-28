#!/usr/bin/env node

/**
 * XML Validation Script for ASYCUDA Exports
 * 
 * This script validates XML exports against the ASYCUDA XSD schema
 * using xmllint. It's used in the CI/CD pipeline to ensure that
 * all XML exports conform to the required schema.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const XML_SAMPLE_PATH = path.join(__dirname, '../sample-data/export-sample.xml');
const XSD_SCHEMA_PATH = path.join(__dirname, '../schemas/asycuda-schema.xsd');
const VALIDATION_TIMEOUT = 10000; // 10 seconds

/**
 * Validates an XML file against an XSD schema using xmllint
 * 
 * @param {string} xmlPath - Path to the XML file to validate
 * @param {string} xsdPath - Path to the XSD schema file
 * @returns {boolean} - True if validation passes, false otherwise
 */
function validateXml(xmlPath, xsdPath) {
  try {
    // Check if files exist
    if (!fs.existsSync(xmlPath)) {
      console.error(`Error: XML file not found at ${xmlPath}`);
      return false;
    }

    if (!fs.existsSync(xsdPath)) {
      console.error(`Error: XSD schema file not found at ${xsdPath}`);
      return false;
    }

    // Run xmllint validation
    const command = `xmllint --noout --schema "${xsdPath}" "${xmlPath}"`;
    
    console.log(`Validating ${path.basename(xmlPath)} against ${path.basename(xsdPath)}...`);
    
    const output = execSync(command, { 
      timeout: VALIDATION_TIMEOUT,
      encoding: 'utf8'
    });
    
    console.log('Validation successful!');
    return true;
  } catch (error) {
    console.error('Validation failed:');
    console.error(error.message || error);
    return false;
  }
}

/**
 * Main function to run validation
 */
function main() {
  const args = process.argv.slice(2);
  const xmlPath = args[0] || XML_SAMPLE_PATH;
  const xsdPath = args[1] || XSD_SCHEMA_PATH;
  
  console.log('ASYCUDA XML Validation');
  console.log('=====================');
  
  const isValid = validateXml(xmlPath, xsdPath);
  
  if (isValid) {
    console.log('✅ XML is valid according to the ASYCUDA schema');
    process.exit(0);
  } else {
    console.error('❌ XML validation failed');
    process.exit(1);
  }
}

// Run the script
main();