// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the login page before each test
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    // Check if the login form is displayed
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    // Fill in the login form with invalid credentials
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    
    // Submit the form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check if error message is displayed
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    // Click on the signup link
    await page.getByRole('link', { name: /sign up/i }).click();
    
    // Check if we're on the signup page
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    // This test assumes there's a mock or test user available
    // In a real test, you might want to create a test user first or use a mock
    
    // Fill in the login form with valid credentials
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    
    // Submit the form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check if we're redirected to the dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Check if the dashboard elements are visible
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    
    // Check if user info is displayed in the navbar
    await expect(page.getByText(/test user/i)).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access a protected route
    await page.goto('/invoices');
    
    // Check if we're redirected to the login page
    await expect(page).toHaveURL(/\/login/);
  });
});