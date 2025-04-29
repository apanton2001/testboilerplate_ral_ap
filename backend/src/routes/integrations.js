'use strict';

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const auth = require('../middleware/auth');
// const roleAuth = require('../middleware/roleAuth'); // Not used in this file currently
const { handleValidationErrors } = require('../middleware/validation'); // Import validation handler
const quickbooksService = require('../services/integrations/quickbooksService');
const freightService = require('../services/integrations/freightService');
const stripeService = require('../services/integrations/stripeService');

// --- Swagger Definitions ---

/**
 * @swagger
 * components:
 *   schemas:
 *     IntegrationStatus:
 *       type: object
 *       properties:
 *         connected:
 *           type: boolean
 *         error:
 *           type: string
 *           nullable: true
 *           description: Error message if connection failed.
 *         # Add other relevant status fields per integration
 *     SubscriptionStatus:
 *       type: object
 *       properties:
 *         active:
 *           type: boolean
 *         plan:
 *           type: string
 *           nullable: true
 *           description: ID or name of the active plan.
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp when the current subscription period ends.
 *     AllIntegrationsStatus:
 *       type: object
 *       properties:
 *         quickbooks:
 *           $ref: '#/components/schemas/IntegrationStatus'
 *         freight:
 *           $ref: '#/components/schemas/IntegrationStatus' # May need more detail if multiple forwarders
 *         subscription:
 *           $ref: '#/components/schemas/SubscriptionStatus'
 *     AuthUrlResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         authUrl:
 *           type: string
 *           format: url
 *     SyncInvoicesInput:
 *       type: object
 *       required:
 *         - invoiceIds
 *       properties:
 *         invoiceIds:
 *           type: array
 *           items:
 *             type: integer
 *           description: Array of invoice IDs to sync.
 *     SyncResult:
 *       type: object
 *       properties:
 *         invoiceId:
 *           type: integer
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         quickbooksId:
 *           type: string
 *           nullable: true
 *     SyncResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         results:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SyncResult'
 *     SupportedForwarder:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *           description: Unique code for the forwarder.
 *         name:
 *           type: string
 *           description: Display name of the forwarder.
 *     ConnectFreightInput:
 *       type: object
 *       required:
 *         - forwarder
 *         - credentials
 *       properties:
 *         forwarder:
 *           type: string
 *           description: Code of the forwarder to connect.
 *         credentials:
 *           type: object # Structure depends on the forwarder
 *           description: API key, username/password, etc.
 *     DisconnectFreightInput:
 *       type: object
 *       required:
 *         - forwarder
 *       properties:
 *         forwarder:
 *           type: string
 *           description: Code of the forwarder to disconnect.
 *     ShipmentStatus:
 *       type: object # Structure depends on forwarder API
 *       properties:
 *         status:
 *           type: string
 *         location:
 *           type: string
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     SubscriptionPlan:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Stripe Price ID.
 *         name:
 *           type: string
 *           description: Plan display name.
 *         price:
 *           type: number
 *           format: float
 *         currency:
 *           type: string
 *         interval:
 *           type: string
 *           enum: [month, year]
 *     CheckoutSessionInput:
 *       type: object
 *       required:
 *         - planId
 *         - successUrl
 *         - cancelUrl
 *       properties:
 *         planId:
 *           type: string
 *           description: Stripe Price ID of the plan to subscribe to.
 *         successUrl:
 *           type: string
 *           format: url
 *           description: URL to redirect to on successful checkout.
 *         cancelUrl:
 *           type: string
 *           format: url
 *           description: URL to redirect to if checkout is canceled.
 *     CheckoutSessionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         sessionId:
 *           type: string
 *           description: Stripe Checkout Session ID.
 *         url:
 *           type: string
 *           format: url
 *           description: URL to redirect the user to for checkout.
 *     CancelSubscriptionInput:
 *       type: object
 *       required:
 *         - subscriptionId
 *       properties:
 *         subscriptionId:
 *           type: string
 *           description: Stripe Subscription ID to cancel.
 *     PortalSessionInput:
 *       type: object
 *       required:
 *         - returnUrl
 *       properties:
 *         returnUrl:
 *           type: string
 *           format: url
 *           description: URL to return to after portal session.
 *     PortalSessionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         url:
 *           type: string
 *           format: url
 *           description: URL for the Stripe Billing Portal session.
 *   parameters:
 *     forwarderCodeParam:
 *       in: path
 *       name: forwarder
 *       schema:
 *         type: string
 *       required: true
 *       description: Code of the freight forwarder.
 *     trackingNumberParam:
 *       in: path
 *       name: trackingNumber
 *       schema:
 *         type: string
 *       required: true
 *       description: Shipment tracking number.
 */

// --- Routes ---

/**
 * @swagger
 * /integrations/status:
 *   get:
 *     summary: Retrieve the connection status of all configured integrations
 *     tags: [Integrations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status of integrations.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 integrations:
 *                   $ref: '#/components/schemas/AllIntegrationsStatus'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server Error fetching status.
 */
router.get('/status', [
  auth
  // No validation needed
], async (req, res, next) => { // Added next
  try {
    const userId = req.user.id;

    // Get status of all integrations, catching errors individually
    const [quickbooks, freight, subscription] = await Promise.all([
      quickbooksService.getConnectionStatus(userId).catch(err => ({
        connected: false,
        error: `Failed to get QuickBooks status: ${err.message}` // More specific error
      })),
      freightService.getConnectionStatus(userId).catch(err => ({
        connected: false,
        error: `Failed to get Freight status: ${err.message}` // More specific error
      })),
      stripeService.getActiveSubscription(userId).catch(err => {
          console.error("Error fetching Stripe subscription status:", err); // Log Stripe specific error
          return null; // Return null on error
      })
    ]);

    return res.json({
      success: true,
      integrations: {
        quickbooks,
        freight,
        subscription: subscription ? {
          active: true,
          plan: subscription.plan?.id, // Use plan ID if available
          expiresAt: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null // Convert timestamp
        } : {
          active: false
        }
      }
    });
  } catch (error) {
    // This catch block might be less likely to be hit due to individual catches,
    // but keep it for unexpected errors.
    next(error); // Pass error to centralized handler
  }
});

// --- QuickBooks Integration Routes ---

/**
 * @swagger
 * /integrations/quickbooks/auth-url:
 *   get:
 *     summary: Get the authorization URL to initiate QuickBooks connection
 *     tags: [Integrations - QuickBooks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QuickBooks authorization URL.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthUrlResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server Error generating URL.
 */
router.get('/quickbooks/auth-url', [
  auth
  // No validation needed
], async (req, res, next) => { // Added next
  try {
    const userId = req.user.id;
    // Service generates the URL, potentially including state parameter logic
    const authUrl = quickbooksService.getAuthorizationUrl(userId);

    return res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /integrations/quickbooks/callback:
 *   get:
 *     summary: Handle the OAuth callback from QuickBooks after user authorization
 *     tags: [Integrations - QuickBooks]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Authorization code from QuickBooks.
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         required: true
 *         description: State parameter for CSRF protection, should match the one sent initially.
 *       - in: query
 *         name: realmId
 *         schema:
 *           type: string
 *         required: true # Usually required by QB
 *         description: QuickBooks company ID.
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         description: Error code if authorization failed on QuickBooks side.
 *     responses:
 *       302:
 *         description: Redirects back to the frontend integration settings page with success or error status.
 *       400:
 *         description: Bad Request (Missing parameters, invalid state, or OAuth error from QB).
 *       500:
 *         description: Server Error handling callback.
 */
router.get('/quickbooks/callback', async (req, res, next) => { // Added next for potential internal errors
  const { code, state, realmId, error: qbError } = req.query;
  const frontendRedirectBase = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/integrations`;

  try {
    if (qbError) {
        console.error('QuickBooks OAuth Error:', qbError);
        // Redirect with specific error if possible
        return res.redirect(`${frontendRedirectBase}?quickbooks=error&message=${encodeURIComponent(`QuickBooks authorization failed: ${qbError}`)}`);
    }

    if (!code || !state || !realmId) {
        console.error('QuickBooks Callback Missing Parameters:', { code: !!code, state: !!state, realmId: !!realmId });
        return res.redirect(`${frontendRedirectBase}?quickbooks=error&message=${encodeURIComponent('Invalid callback request from QuickBooks.')}`);
    }

    // Service handles exchanging code for tokens, validating state, and storing tokens/realmId
    await quickbooksService.handleOAuthCallback(code, state, realmId);

    // Redirect to frontend with success message
    return res.redirect(`${frontendRedirectBase}?quickbooks=success`);
  } catch (error) {
    console.error('Error handling QuickBooks callback:', error);
    // Pass a generic error message or specific if known (e.g., invalid state)
    const message = error.message.includes('Invalid state') ? 'Invalid state parameter.' : 'Failed to connect QuickBooks.';
    return res.redirect(`${frontendRedirectBase}?quickbooks=error&message=${encodeURIComponent(message)}`);
    // Or use next(error) if you want the central handler to manage the response (less ideal for redirects)
  }
});

/**
 * @swagger
 * /integrations/quickbooks/disconnect:
 *   post:
 *     summary: Disconnect the QuickBooks integration for the user
 *     tags: [Integrations - QuickBooks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QuickBooks disconnected successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server Error during disconnection.
 */
router.post('/quickbooks/disconnect', [
  auth
  // No validation needed
], async (req, res, next) => { // Added next
  try {
    const userId = req.user.id;
    // Service handles token revocation and clearing stored credentials
    await quickbooksService.disconnectQuickBooks(userId);

    return res.json({
      success: true,
      message: 'QuickBooks disconnected successfully'
    });
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /integrations/quickbooks/sync:
 *   post:
 *     summary: Synchronize selected invoices to QuickBooks
 *     tags: [Integrations - QuickBooks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SyncInvoicesInput'
 *     responses:
 *       200:
 *         description: Sync operation attempted. Check results array for individual invoice status.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SyncResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: QuickBooks not connected for this user.
 *       422:
 *         description: Validation Error (Invalid input format).
 *       500:
 *         description: Server Error during sync process.
 */
router.post('/quickbooks/sync', [
  auth,
  body('invoiceIds').isArray({ min: 1 }).withMessage('invoiceIds must be a non-empty array'),
  body('invoiceIds.*').isInt({ gt: 0 }).withMessage('All invoice IDs must be positive integers').toInt(),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const userId = req.user.id;
    const { invoiceIds } = req.body; // Use validated/sanitized IDs

    // Service handles fetching invoice data, formatting, and sending to QB API
    const results = await quickbooksService.syncInvoicesToQuickBooks(userId, invoiceIds);

    return res.json({
      success: true, // Overall request success, individual results may vary
      results
    });
  } catch (error) {
     // Handle specific errors like QB not connected
     if (error.message.includes('QuickBooks not connected')) {
        return res.status(404).json({ message: error.message });
    }
    next(error); // Pass other errors to centralized handler
  }
});

// --- Freight Forwarder Integration Routes ---

/**
 * @swagger
 * /integrations/freight/supported:
 *   get:
 *     summary: Retrieve a list of supported freight forwarders
 *     tags: [Integrations - Freight]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of supported freight forwarders.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 forwarders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SupportedForwarder'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server Error.
 */
router.get('/freight/supported', [
  auth
  // No validation needed
], async (req, res, next) => { // Added next
  try {
    // Service likely returns a static or configured list
    const forwarders = freightService.getSupportedForwarders();

    return res.json({
      success: true,
      forwarders
    });
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /integrations/freight/connect:
 *   post:
 *     summary: Connect to a specific freight forwarder using provided credentials
 *     tags: [Integrations - Freight]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConnectFreightInput'
 *     responses:
 *       200:
 *         description: Connection successful (or credentials saved).
 *         content:
 *           application/json:
 *             schema:
 *               # Define response structure if needed, e.g., confirming connection
 *               type: object
 *               properties:
 *                  success:
 *                      type: boolean
 *                  message:
 *                      type: string
 *       400:
 *         description: Bad Request (Invalid forwarder code or credentials format).
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation Error.
 *       500:
 *         description: Server Error saving credentials or testing connection.
 */
router.post('/freight/connect', [
  auth,
  body('forwarder').trim().notEmpty().withMessage('Forwarder code is required').escape(), // Sanitize
  body('credentials').isObject().withMessage('Credentials must be an object'),
  // Add specific validation for credential fields based on forwarder if possible/needed
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const userId = req.user.id;
    const { forwarder, credentials } = req.body; // Use validated/sanitized forwarder code

    // Service handles validating forwarder code, encrypting/storing credentials,
    // and potentially testing the connection.
    const result = await freightService.connectFreightForwarder(userId, forwarder, credentials);

    return res.json({
      success: true,
      message: `Successfully connected to ${forwarder}.`, // Example message
      result // Optional: return confirmation details from service
    });
  } catch (error) {
     // Handle specific errors like invalid forwarder code
     if (error.message.includes('Unsupported forwarder')) {
        return res.status(400).json({ message: error.message });
    }
    next(error); // Pass other errors to centralized handler
  }
});

/**
 * @swagger
 * /integrations/freight/disconnect:
 *   post:
 *     summary: Disconnect from a specific freight forwarder
 *     tags: [Integrations - Freight]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DisconnectFreightInput'
 *     responses:
 *       200:
 *         description: Disconnection successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad Request (Invalid forwarder code).
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation Error.
 *       500:
 *         description: Server Error removing credentials.
 */
router.post('/freight/disconnect', [
  auth,
  body('forwarder').trim().notEmpty().withMessage('Forwarder code is required').escape(), // Sanitize
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const userId = req.user.id;
    const { forwarder } = req.body; // Use validated/sanitized forwarder code

    // Service handles removing stored credentials for this user/forwarder
    await freightService.disconnectFreightForwarder(userId, forwarder);

    return res.json({
      success: true,
      message: `Freight forwarder ${forwarder} disconnected successfully`
    });
  } catch (error) {
     // Handle specific errors like forwarder not found/connected
     if (error.message.includes('not connected')) {
        return res.status(400).json({ message: error.message });
    }
    next(error); // Pass other errors to centralized handler
  }
});

/**
 * @swagger
 * /integrations/freight/shipment/{forwarder}/{trackingNumber}:
 *   get:
 *     summary: Get the current status of a shipment from a freight forwarder
 *     tags: [Integrations - Freight]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/forwarderCodeParam'
 *       - $ref: '#/components/parameters/trackingNumberParam'
 *     responses:
 *       200:
 *         description: Shipment status details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   $ref: '#/components/schemas/ShipmentStatus'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Freight forwarder connection not found for user, or shipment not found.
 *       422:
 *         description: Validation Error (Invalid parameters).
 *       500:
 *         description: Server Error communicating with forwarder API.
 */
router.get('/freight/shipment/:forwarder/:trackingNumber', [
  auth,
  param('forwarder').trim().notEmpty().withMessage('Forwarder code is required').escape(), // Sanitize
  param('trackingNumber').trim().notEmpty().withMessage('Tracking number is required').escape(), // Sanitize
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const userId = req.user.id;
    const { forwarder, trackingNumber } = req.params; // Use validated/sanitized params

    // Service handles fetching credentials, calling forwarder API, parsing response
    const status = await freightService.getShipmentStatus(userId, forwarder, trackingNumber);

    return res.json({
      success: true,
      status
    });
  } catch (error) {
     // Handle specific errors like connection not found or API errors
     if (error.message.includes('not connected') || error.message.includes('Shipment not found')) {
        return res.status(404).json({ message: error.message });
    }
    next(error); // Pass other errors to centralized handler
  }
});

// --- Stripe Subscription Routes ---

/**
 * @swagger
 * /integrations/subscription/plans:
 *   get:
 *     summary: Retrieve available subscription plans
 *     tags: [Integrations - Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available subscription plans.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 plans:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SubscriptionPlan'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server Error fetching plans from Stripe or config.
 */
router.get('/subscription/plans', [
  auth
  // No validation needed
], async (req, res, next) => { // Added next
  try {
    // Service fetches/returns plan details (from Stripe API or config)
    const plans = await stripeService.getSubscriptionPlans();

    return res.json({
      success: true,
      plans
    });
  } catch (error) {
    next(error); // Pass error to centralized handler
  }
});

/**
 * @swagger
 * /integrations/subscription/checkout:
 *   post:
 *     summary: Create a Stripe Checkout session for subscribing to a plan
 *     tags: [Integrations - Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckoutSessionInput'
 *     responses:
 *       200:
 *         description: Checkout session created successfully. Redirect user to the URL.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckoutSessionResponse'
 *       400:
 *         description: Bad Request (Invalid plan ID).
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation Error.
 *       500:
 *         description: Server Error creating Stripe session.
 */
router.post('/subscription/checkout', [
  auth,
  body('planId').trim().notEmpty().withMessage('Plan ID is required').escape(), // Sanitize planId
  body('successUrl').trim().isURL().withMessage('Success URL must be a valid URL'),
  body('cancelUrl').trim().isURL().withMessage('Cancel URL must be a valid URL'),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const userId = req.user.id;
    const { planId, successUrl, cancelUrl } = req.body; // Use validated/sanitized inputs

    // Service handles interaction with Stripe API
    const session = await stripeService.createCheckoutSession(userId, planId, successUrl, cancelUrl);

    return res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
     // Handle specific errors like invalid plan ID from Stripe
     if (error.type === 'StripeInvalidRequestError' || error.message.includes('No such price')) {
         return res.status(400).json({ message: 'Invalid subscription plan ID provided.' });
     }
    next(error); // Pass other errors to centralized handler
  }
});

/**
 * @swagger
 * /integrations/subscription/cancel:
 *   post:
 *     summary: Cancel an active Stripe subscription
 *     tags: [Integrations - Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CancelSubscriptionInput'
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully (or scheduled for cancellation at period end).
 *         content:
 *           application/json:
 *             schema:
 *               # Define response, maybe return updated subscription status
 *               type: object
 *               properties:
 *                  success:
 *                      type: boolean
 *                  message:
 *                      type: string
 *                  subscription: # Return updated subscription object
 *                      $ref: '#/components/schemas/SubscriptionStatus'
 *       400:
 *         description: Bad Request (e.g., subscription already canceled).
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Active subscription not found for the user or ID mismatch.
 *       422:
 *         description: Validation Error.
 *       500:
 *         description: Server Error cancelling subscription with Stripe.
 */
router.post('/subscription/cancel', [
  auth,
  body('subscriptionId').trim().notEmpty().withMessage('Subscription ID is required').escape(), // Sanitize ID
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const userId = req.user.id;
    const { subscriptionId } = req.body; // Use validated/sanitized ID

    // Service handles finding the user's active subscription, verifying the ID,
    // and calling Stripe API to cancel.
    const updatedSubscription = await stripeService.cancelSubscription(userId, subscriptionId);

    return res.json({
      success: true,
      message: 'Subscription cancelled successfully.',
      subscription: { // Provide updated status
          active: false, // Or based on Stripe response (cancel_at_period_end)
          plan: updatedSubscription.plan?.id,
          expiresAt: updatedSubscription.current_period_end ? new Date(updatedSubscription.current_period_end * 1000).toISOString() : null
      }
    });
  } catch (error) {
     // Handle specific errors like subscription not found or already canceled
     if (error.message.includes('not found') || error.message.includes('No such subscription')) {
        return res.status(404).json({ message: 'Active subscription not found or ID is invalid.' });
    }
     if (error.message.includes('already canceled')) {
        return res.status(400).json({ message: 'Subscription is already canceled.' });
    }
    next(error); // Pass other errors to centralized handler
  }
});

/**
 * @swagger
 * /integrations/subscription/portal:
 *   post:
 *     summary: Create a Stripe Billing Portal session for the user to manage their subscription
 *     tags: [Integrations - Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PortalSessionInput'
 *     responses:
 *       200:
 *         description: Billing Portal session created successfully. Redirect user to the URL.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PortalSessionResponse'
 *       400:
 *         description: Bad Request (e.g., user has no active subscription or customer ID).
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation Error.
 *       500:
 *         description: Server Error creating Stripe portal session.
 */
router.post('/subscription/portal', [
  auth,
  body('returnUrl').trim().isURL().withMessage('Return URL must be a valid URL'),
  handleValidationErrors // Apply validation handler
], async (req, res, next) => { // Added next
  try {
    const userId = req.user.id;
    const { returnUrl } = req.body; // Use validated/sanitized URL

    // Service handles finding the user's Stripe Customer ID and creating the portal session
    const session = await stripeService.createBillingPortalSession(userId, returnUrl);

    return res.json({
      success: true,
      url: session.url
    });
  } catch (error) {
     // Handle specific errors like customer not found
     if (error.message.includes('No Stripe customer found')) {
        return res.status(400).json({ message: 'Cannot manage billing: No subscription found for this user.' });
    }
    next(error); // Pass other errors to centralized handler
  }
});

/**
 * @swagger
 * /integrations/subscription/webhook:
 *   post:
 *     summary: Handle incoming webhook events from Stripe
 *     tags: [Integrations - Subscription]
 *     description: Endpoint for Stripe to send events (e.g., payment success, subscription updates). Requires raw body parsing and signature verification.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object # Stripe event object structure
 *     parameters:
 *       - in: header
 *         name: stripe-signature
 *         schema:
 *           type: string
 *         required: true
 *         description: Stripe webhook signature for verification.
 *     responses:
 *       200:
 *         description: Webhook received and processed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad Request (Missing or invalid signature).
 *       500:
 *         description: Server Error handling webhook event.
 */
// IMPORTANT: Ensure express.raw middleware is applied *before* this route in index.js or here specifically
router.post('/subscription/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => { // Added next
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
      console.warn('Stripe webhook missing signature.');
      return res.status(400).json({ message: 'Missing Stripe signature.' });
  }
   if (!webhookSecret) {
      console.error('Stripe webhook secret is not configured.');
      return res.status(500).json({ message: 'Webhook processing is not configured correctly.' });
  }


  let event;
  try {
    // Use the stripe instance from the service if it's configured globally, otherwise init here
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(
      req.body, // Raw body buffer
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed.', err.message);
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  try {
    // Handle the verified event using the service
    const result = await stripeService.handleWebhookEvent(event);
    console.log('Stripe webhook processed:', { type: event.type, result });
    // Return success, even if the specific event wasn't handled by our logic,
    // as long as processing didn't throw an error.
    return res.json({ received: true });
  } catch (error) {
     // Log the error from the handler service
     console.error(`Error handling Stripe webhook event ${event.id} (Type: ${event.type}):`, error);
     // Don't pass internal errors back to Stripe, just return 500
     return res.status(500).json({ message: 'Internal server error handling webhook.' });
     // Consider using next(error) only if you want the main error handler to respond,
     // but for webhooks, often a simple 500 is preferred by the sender.
  }
});

module.exports = router;