import { test, expect } from '@playwright/test';

/**
 * Smoke tests for ASYCUDA Autofill application
 * These tests verify that critical functionality works after deployment
 */

test.describe('Smoke Tests - Critical Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Use the deployed URL for testing
    // In a real scenario, this would be set via environment variables
    const baseUrl = process.env.TEST_URL || 'https://asycuda-autofill.vercel.app';
    await page.goto(baseUrl);
  });

  test('Home page loads successfully', async ({ page }) => {
    // Verify the page title
    await expect(page).toHaveTitle(/ASYCUDA Autofill/);
    
    // Verify critical UI elements are present
    await expect(page.getByRole('heading', { name: /ASYCUDA Autofill/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Data Import/i })).toBeVisible();
  });

  test('Data grid loads correctly', async ({ page }) => {
    // Navigate to data import page
    await page.getByRole('link', { name: /Data Import/i }).click();
    
    // Verify the data grid is present
    await expect(page.locator('.ag-root-wrapper')).toBeVisible();
    
    // Verify grid controls are present
    await expect(page.getByTestId('add-row-button')).toBeVisible();
    await expect(page.getByTestId('file-upload-input')).toBeVisible();
  });

  test('Classification functionality works', async ({ page }) => {
    // Navigate to data import page
    await page.getByRole('link', { name: /Data Import/i }).click();
    
    // Add a test row
    await page.getByTestId('add-row-button').click();
    
    // Fill in test data (find a cell in the description column and enter text)
    const descriptionCell = page.locator('.ag-cell[col-id="description"]').first();
    await descriptionCell.click();
    await descriptionCell.fill('Wooden furniture for bedroom');
    
    // Trigger classification
    await page.getByTestId('classify-button').click();
    
    // Wait for classification to complete and verify results
    await expect(page.getByTestId('classification-success')).toBeVisible({ timeout: 15000 });
    
    // Verify HS code cell contains a value
    const hsCodeCell = page.locator('.ag-cell[col-id="hsCode"]').first();
    await expect(hsCodeCell).not.toBeEmpty();
  });

  test('Export functionality works', async ({ page }) => {
    // Navigate to data import page
    await page.getByRole('link', { name: /Data Import/i }).click();
    
    // Add a test row and classify
    await page.getByTestId('add-row-button').click();
    const descriptionCell = page.locator('.ag-cell[col-id="description"]').first();
    await descriptionCell.click();
    await descriptionCell.fill('Wooden furniture for bedroom');
    await page.getByTestId('classify-button').click();
    
    // Wait for classification to complete
    await expect(page.getByTestId('classification-success')).toBeVisible({ timeout: 15000 });
    
    // Test PDF export
    const pdfDownloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-pdf-button').click();
    const pdfDownload = await pdfDownloadPromise;
    expect(pdfDownload.suggestedFilename()).toContain('.pdf');
    
    // Test XML export
    const xmlDownloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-xml-button').click();
    const xmlDownload = await xmlDownloadPromise;
    expect(xmlDownload.suggestedFilename()).toContain('.xml');
  });

  test('Document scan page loads', async ({ page }) => {
    // Navigate to document scan page
    await page.getByRole('link', { name: /Document Scan/i }).click();
    
    // Verify the document upload area is present
    await expect(page.getByTestId('document-upload-area')).toBeVisible();
  });

  test('Performance metrics are within acceptable ranges', async ({ page }) => {
    // This is a basic performance test that could be expanded with more sophisticated metrics
    const startTime = Date.now();
    await page.goto(page.url());
    const loadTime = Date.now() - startTime;
    
    // Check if load time is under 2 seconds (2000ms)
    expect(loadTime).toBeLessThan(2000);
    
    // More sophisticated performance testing would be done with tools like Lighthouse
  });
});