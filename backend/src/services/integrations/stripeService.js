'use strict';

const Stripe = require('stripe');
const winston = require('winston');
const db = require('../../models');
const { User, Subscription } = db;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'stripe-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/integrations.log' })
  ]
});

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16' // Use the latest stable API version
});

// Subscription plans
const SUBSCRIPTION_PLANS = {
  BASIC: {
    id: 'basic',
    name: 'Basic Plan',
    description: 'Basic customs documentation features',
    priceId: process.env.STRIPE_BASIC_PRICE_ID,
    features: [
      'Up to 50 invoices per month',
      'Basic classification',
      'Standard support'
    ]
  },
  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional Plan',
    description: 'Advanced features for growing businesses',
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    features: [
      'Up to 500 invoices per month',
      'Advanced classification',
      'Priority support',
      'Basic integrations'
    ]
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise Plan',
    description: 'Full-featured solution for large organizations',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: [
      'Unlimited invoices',
      'Advanced classification with AI',
      'Premium support',
      'All integrations',
      'Custom workflows'
    ]
  }
};

/**
 * Create a Stripe customer
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Stripe customer
 */
const createCustomer = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Check if user already has a Stripe customer ID
    if (user.stripe_customer_id) {
      // Retrieve existing customer
      const customer = await stripe.customers.retrieve(user.stripe_customer_id);
      return customer;
    }
    
    // Create new customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.full_name,
      metadata: {
        userId: userId.toString()
      }
    });
    
    // Update user with Stripe customer ID
    await user.update({
      stripe_customer_id: customer.id
    });
    
    logger.info('Stripe customer created', { userId, customerId: customer.id });
    return customer;
  } catch (error) {
    logger.error('Error creating Stripe customer', { error: error.message, userId });
    throw error;
  }
};

/**
 * Get or create a Stripe customer
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Stripe customer
 */
const getOrCreateCustomer = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    if (user.stripe_customer_id) {
      try {
        // Try to retrieve existing customer
        const customer = await stripe.customers.retrieve(user.stripe_customer_id);
        
        if (customer && !customer.deleted) {
          return customer;
        }
      } catch (retrieveError) {
        logger.warn('Error retrieving Stripe customer, will create new one', { 
          error: retrieveError.message, 
          userId 
        });
      }
    }
    
    // Create new customer if not found or error
    return createCustomer(userId);
  } catch (error) {
    logger.error('Error in getOrCreateCustomer', { error: error.message, userId });
    throw error;
  }
};

/**
 * Create a checkout session for subscription
 * @param {number} userId - User ID
 * @param {string} planId - Subscription plan ID
 * @param {string} successUrl - Checkout success URL
 * @param {string} cancelUrl - Checkout cancel URL
 * @returns {Promise<Object>} Checkout session
 */
const createCheckoutSession = async (userId, planId, successUrl, cancelUrl) => {
  try {
    if (!SUBSCRIPTION_PLANS[planId.toUpperCase()]) {
      throw new Error(`Invalid subscription plan: ${planId}`);
    }
    
    const plan = SUBSCRIPTION_PLANS[planId.toUpperCase()];
    
    if (!plan.priceId) {
      throw new Error(`Price ID not configured for plan: ${planId}`);
    }
    
    // Get or create customer
    const customer = await getOrCreateCustomer(userId);
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId.toString(),
        planId: planId
      }
    });
    
    logger.info('Checkout session created', { userId, planId, sessionId: session.id });
    return session;
  } catch (error) {
    logger.error('Error creating checkout session', { error: error.message, userId, planId });
    throw error;
  }
};

/**
 * Handle Stripe webhook event
 * @param {Object} event - Stripe event
 * @returns {Promise<Object>} Processing result
 */
const handleWebhookEvent = async (event) => {
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        return await handleCheckoutSessionCompleted(event.data.object);
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        return await handleSubscriptionUpdated(event.data.object);
      
      case 'customer.subscription.deleted':
        return await handleSubscriptionDeleted(event.data.object);
      
      case 'invoice.payment_succeeded':
        return await handleInvoicePaymentSucceeded(event.data.object);
      
      case 'invoice.payment_failed':
        return await handleInvoicePaymentFailed(event.data.object);
      
      default:
        logger.info('Unhandled Stripe event', { type: event.type, id: event.id });
        return { status: 'ignored', event: event.type };
    }
  } catch (error) {
    logger.error('Error handling Stripe webhook', { error: error.message, eventType: event.type });
    throw error;
  }
};

/**
 * Handle checkout.session.completed event
 * @param {Object} session - Checkout session
 * @returns {Promise<Object>} Processing result
 */
const handleCheckoutSessionCompleted = async (session) => {
  try {
    const { userId, planId } = session.metadata;
    
    if (!userId || !planId) {
      throw new Error('Missing metadata in checkout session');
    }
    
    logger.info('Checkout session completed', { 
      userId, 
      planId, 
      sessionId: session.id,
      subscriptionId: session.subscription
    });
    
    // The subscription will be handled by the subscription.created event
    return {
      status: 'success',
      userId,
      planId,
      sessionId: session.id
    };
  } catch (error) {
    logger.error('Error handling checkout session completed', { 
      error: error.message, 
      sessionId: session.id 
    });
    throw error;
  }
};

/**
 * Handle customer.subscription.created or customer.subscription.updated event
 * @param {Object} subscription - Stripe subscription
 * @returns {Promise<Object>} Processing result
 */
const handleSubscriptionUpdated = async (subscription) => {
  try {
    // Get customer to find user
    const customer = await stripe.customers.retrieve(subscription.customer);
    
    if (!customer || !customer.metadata || !customer.metadata.userId) {
      throw new Error('Cannot identify user from subscription');
    }
    
    const userId = parseInt(customer.metadata.userId);
    const user = await User.findByPk(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Find or create subscription record
    let dbSubscription = await Subscription.findOne({
      where: {
        user_id: userId,
        stripe_sub_id: subscription.id
      }
    });
    
    if (!dbSubscription) {
      dbSubscription = await Subscription.create({
        user_id: userId,
        stripe_customer_id: customer.id,
        stripe_sub_id: subscription.id,
        status: subscription.status,
        started_at: new Date(subscription.current_period_start * 1000),
        ended_at: subscription.canceled_at ? 
          new Date(subscription.canceled_at * 1000) : 
          new Date(subscription.current_period_end * 1000)
      });
    } else {
      await dbSubscription.update({
        status: subscription.status,
        started_at: new Date(subscription.current_period_start * 1000),
        ended_at: subscription.canceled_at ? 
          new Date(subscription.canceled_at * 1000) : 
          new Date(subscription.current_period_end * 1000)
      });
    }
    
    logger.info('Subscription updated', { 
      userId, 
      subscriptionId: subscription.id,
      status: subscription.status
    });
    
    return {
      status: 'success',
      userId,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status
    };
  } catch (error) {
    logger.error('Error handling subscription update', { 
      error: error.message, 
      subscriptionId: subscription.id 
    });
    throw error;
  }
};

/**
 * Handle customer.subscription.deleted event
 * @param {Object} subscription - Stripe subscription
 * @returns {Promise<Object>} Processing result
 */
const handleSubscriptionDeleted = async (subscription) => {
  try {
    // Find subscription in database
    const dbSubscription = await Subscription.findOne({
      where: {
        stripe_sub_id: subscription.id
      }
    });
    
    if (!dbSubscription) {
      logger.warn('Subscription not found in database', { subscriptionId: subscription.id });
      return {
        status: 'warning',
        message: 'Subscription not found in database',
        subscriptionId: subscription.id
      };
    }
    
    // Update subscription status
    await dbSubscription.update({
      status: 'canceled',
      ended_at: new Date()
    });
    
    logger.info('Subscription canceled', { 
      userId: dbSubscription.user_id, 
      subscriptionId: subscription.id 
    });
    
    return {
      status: 'success',
      userId: dbSubscription.user_id,
      subscriptionId: subscription.id
    };
  } catch (error) {
    logger.error('Error handling subscription deletion', { 
      error: error.message, 
      subscriptionId: subscription.id 
    });
    throw error;
  }
};

/**
 * Handle invoice.payment_succeeded event
 * @param {Object} invoice - Stripe invoice
 * @returns {Promise<Object>} Processing result
 */
const handleInvoicePaymentSucceeded = async (invoice) => {
  try {
    if (!invoice.subscription) {
      // Not a subscription invoice
      return { status: 'ignored', reason: 'Not a subscription invoice' };
    }
    
    // Find subscription in database
    const dbSubscription = await Subscription.findOne({
      where: {
        stripe_sub_id: invoice.subscription
      }
    });
    
    if (!dbSubscription) {
      logger.warn('Subscription not found for invoice', { 
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription
      });
      return {
        status: 'warning',
        message: 'Subscription not found for invoice',
        invoiceId: invoice.id
      };
    }
    
    // Update subscription status if needed
    if (dbSubscription.status !== 'active') {
      await dbSubscription.update({
        status: 'active'
      });
    }
    
    // Get the notification service to send a payment success notification
    const notificationService = require('../../services/notificationService');
    
    await notificationService.createNotification(
      dbSubscription.user_id,
      'payment_success',
      `Your payment of ${(invoice.amount_paid / 100).toFixed(2)} ${invoice.currency.toUpperCase()} was successful.`,
      {
        invoiceId: invoice.id,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency
      }
    );
    
    logger.info('Invoice payment succeeded', { 
      userId: dbSubscription.user_id, 
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription
    });
    
    return {
      status: 'success',
      userId: dbSubscription.user_id,
      invoiceId: invoice.id
    };
  } catch (error) {
    logger.error('Error handling invoice payment success', { 
      error: error.message, 
      invoiceId: invoice.id 
    });
    throw error;
  }
};

/**
 * Handle invoice.payment_failed event
 * @param {Object} invoice - Stripe invoice
 * @returns {Promise<Object>} Processing result
 */
const handleInvoicePaymentFailed = async (invoice) => {
  try {
    if (!invoice.subscription) {
      // Not a subscription invoice
      return { status: 'ignored', reason: 'Not a subscription invoice' };
    }
    
    // Find subscription in database
    const dbSubscription = await Subscription.findOne({
      where: {
        stripe_sub_id: invoice.subscription
      }
    });
    
    if (!dbSubscription) {
      logger.warn('Subscription not found for invoice', { 
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription
      });
      return {
        status: 'warning',
        message: 'Subscription not found for invoice',
        invoiceId: invoice.id
      };
    }
    
    // Update subscription status
    await dbSubscription.update({
      status: 'past_due'
    });
    
    // Get the notification service to send a payment failure notification
    const notificationService = require('../../services/notificationService');
    
    await notificationService.createNotification(
      dbSubscription.user_id,
      'payment_failed',
      `Your payment of ${(invoice.amount_due / 100).toFixed(2)} ${invoice.currency.toUpperCase()} failed. Please update your payment method.`,
      {
        invoiceId: invoice.id,
        amount: invoice.amount_due / 100,
        currency: invoice.currency
      }
    );
    
    // Also send an email notification
    const user = await User.findByPk(dbSubscription.user_id);
    
    if (user) {
      await notificationService.sendEmailNotification(
        user.email,
        'Payment Failed',
        `
        <h1>Payment Failed</h1>
        <p>Your payment of ${(invoice.amount_due / 100).toFixed(2)} ${invoice.currency.toUpperCase()} failed.</p>
        <p>Please update your payment method to avoid service interruption.</p>
        <p><a href="${process.env.FRONTEND_URL}/billing">Update Payment Method</a></p>
        `
      );
    }
    
    logger.info('Invoice payment failed', { 
      userId: dbSubscription.user_id, 
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription
    });
    
    return {
      status: 'success',
      userId: dbSubscription.user_id,
      invoiceId: invoice.id
    };
  } catch (error) {
    logger.error('Error handling invoice payment failure', { 
      error: error.message, 
      invoiceId: invoice.id 
    });
    throw error;
  }
};

/**
 * Cancel a subscription
 * @param {number} userId - User ID
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<Object>} Cancellation result
 */
const cancelSubscription = async (userId, subscriptionId) => {
  try {
    // Verify subscription belongs to user
    const dbSubscription = await Subscription.findOne({
      where: {
        user_id: userId,
        stripe_sub_id: subscriptionId
      }
    });
    
    if (!dbSubscription) {
      throw new Error('Subscription not found or does not belong to user');
    }
    
    // Cancel subscription in Stripe
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    
    // Update subscription in database
    await dbSubscription.update({
      status: 'canceled',
      ended_at: new Date()
    });
    
    logger.info('Subscription canceled', { userId, subscriptionId });
    
    return {
      status: 'success',
      subscriptionId,
      canceledAt: new Date()
    };
  } catch (error) {
    logger.error('Error canceling subscription', { 
      error: error.message, 
      userId, 
      subscriptionId 
    });
    throw error;
  }
};

/**
 * Get user's active subscription
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} Subscription or null if none
 */
const getActiveSubscription = async (userId) => {
  try {
    const subscription = await Subscription.findOne({
      where: {
        user_id: userId,
        status: 'active'
      },
      order: [['started_at', 'DESC']]
    });
    
    if (!subscription) {
      return null;
    }
    
    // Get subscription details from Stripe
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_sub_id);
      
      // Get plan details
      const planId = Object.keys(SUBSCRIPTION_PLANS).find(key => 
        SUBSCRIPTION_PLANS[key].priceId === stripeSubscription.items.data[0].price.id
      );
      
      const plan = planId ? SUBSCRIPTION_PLANS[planId] : null;
      
      return {
        id: subscription.id,
        stripeId: subscription.stripe_sub_id,
        status: subscription.status,
        startedAt: subscription.started_at,
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        plan: plan ? {
          id: plan.id,
          name: plan.name,
          features: plan.features
        } : null
      };
    } catch (stripeError) {
      logger.error('Error retrieving Stripe subscription', { 
        error: stripeError.message, 
        subscriptionId: subscription.stripe_sub_id 
      });
      
      // Return basic info without Stripe details
      return {
        id: subscription.id,
        stripeId: subscription.stripe_sub_id,
        status: subscription.status,
        startedAt: subscription.started_at,
        endedAt: subscription.ended_at
      };
    }
  } catch (error) {
    logger.error('Error getting active subscription', { error: error.message, userId });
    throw error;
  }
};

/**
 * Get available subscription plans
 * @returns {Array<Object>} Subscription plans
 */
const getSubscriptionPlans = () => {
  return Object.values(SUBSCRIPTION_PLANS).map(plan => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    features: plan.features
  }));
};

/**
 * Create a billing portal session
 * @param {number} userId - User ID
 * @param {string} returnUrl - Return URL after portal session
 * @returns {Promise<Object>} Portal session
 */
const createBillingPortalSession = async (userId, returnUrl) => {
  try {
    const customer = await getOrCreateCustomer(userId);
    
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl
    });
    
    logger.info('Billing portal session created', { userId, sessionId: session.id });
    
    return session;
  } catch (error) {
    logger.error('Error creating billing portal session', { error: error.message, userId });
    throw error;
  }
};

module.exports = {
  createCustomer,
  getOrCreateCustomer,
  createCheckoutSession,
  handleWebhookEvent,
  cancelSubscription,
  getActiveSubscription,
  getSubscriptionPlans,
  createBillingPortalSession
};