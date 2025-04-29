import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  features: string[];
}

interface Subscription {
  active: boolean;
  plan?: {
    id: string;
    name: string;
    features: string[];
  };
  expiresAt?: string;
}

const StripeIntegration = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<boolean>(false);

  // Fetch subscription status
  const fetchSubscriptionStatus = async () => {
    if (!session) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/v1/integrations/status', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }
      
      const data = await response.json();
      setSubscription(data.integrations.subscription);
    } catch (err) {
      console.error('Error fetching subscription status:', err);
      setError('Failed to load subscription status');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available subscription plans
  const fetchSubscriptionPlans = async () => {
    if (!session) return;

    try {
      const response = await fetch('/api/v1/integrations/subscription/plans', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription plans');
      }
      
      const data = await response.json();
      setPlans(data.plans);
      
      // Set default selected plan if none selected
      if (!selectedPlan && data.plans.length > 0) {
        setSelectedPlan(data.plans[0].id);
      }
    } catch (err) {
      console.error('Error fetching subscription plans:', err);
    }
  };

  // Create checkout session for subscription
  const createCheckoutSession = async () => {
    if (!session || !selectedPlan) return;

    try {
      setProcessingAction(true);
      setError(null);
      
      const response = await fetch('/api/v1/integrations/subscription/checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId: selectedPlan,
          successUrl: `${window.location.origin}/settings/integrations?subscription=success`,
          cancelUrl: `${window.location.origin}/settings/integrations?subscription=canceled`
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }
      
      const data = await response.json();
      
      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError('Failed to create checkout session');
      setProcessingAction(false);
    }
  };

  // Cancel subscription
  const cancelSubscription = async () => {
    if (!session || !subscription?.active) return;

    try {
      setProcessingAction(true);
      setError(null);
      
      const response = await fetch('/api/v1/integrations/subscription/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscriptionId: subscription.plan?.id
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }
      
      // Update subscription status
      await fetchSubscriptionStatus();
    } catch (err) {
      console.error('Error canceling subscription:', err);
      setError('Failed to cancel subscription');
    } finally {
      setProcessingAction(false);
    }
  };

  // Open billing portal
  const openBillingPortal = async () => {
    if (!session) return;

    try {
      setProcessingAction(true);
      setError(null);
      
      const response = await fetch('/api/v1/integrations/subscription/portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/settings/integrations`
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create billing portal session');
      }
      
      const data = await response.json();
      
      // Redirect to Stripe billing portal
      window.location.href = data.url;
    } catch (err) {
      console.error('Error opening billing portal:', err);
      setError('Failed to open billing portal');
      setProcessingAction(false);
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Check for subscription status in URL query params
  useEffect(() => {
    const { subscription: subscriptionStatus } = router.query;
    
    if (subscriptionStatus === 'success') {
      // Refresh subscription status after successful checkout
      fetchSubscriptionStatus();
    }
  }, [router.query]);

  // Load subscription status and plans on component mount
  useEffect(() => {
    if (session) {
      fetchSubscriptionStatus();
      fetchSubscriptionPlans();
    }
  }, [session]);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Subscription Management</h2>
      
      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      ) : (
        <>
          {/* Current Subscription */}
          {subscription?.active ? (
            <div className="mb-8">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                Active Subscription: {subscription.plan?.name}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Plan</p>
                  <p className="font-medium">{subscription.plan?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Expires</p>
                  <p className="font-medium">{formatDate(subscription.expiresAt)}</p>
                </div>
              </div>
              
              {subscription.plan?.features && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-2">Features</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {subscription.plan.features.map((feature, index) => (
                      <li key={index} className="text-gray-600">{feature}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex space-x-4">
                <button
                  onClick={openBillingPortal}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
                  disabled={processingAction}
                >
                  {processingAction ? 'Processing...' : 'Manage Billing'}
                </button>
                
                <button
                  onClick={cancelSubscription}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
                  disabled={processingAction}
                >
                  {processingAction ? 'Processing...' : 'Cancel Subscription'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4">
                No active subscription
              </div>
              
              <p className="text-gray-600 mb-6">
                Subscribe to a plan to access premium features and support.
              </p>
              
              {/* Subscription Plans */}
              {plans.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Available Plans</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {plans.map((plan) => (
                      <div 
                        key={plan.id}
                        className={`border rounded-lg p-4 cursor-pointer ${
                          selectedPlan === plan.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                        onClick={() => setSelectedPlan(plan.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-800">{plan.name}</h4>
                          <input
                            type="radio"
                            checked={selectedPlan === plan.id}
                            onChange={() => setSelectedPlan(plan.id)}
                            className="h-4 w-4 text-blue-600 border-gray-300"
                            aria-label={`Select ${plan.name} plan`}
                          />
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
                        <ul className="text-sm space-y-1">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-start">
                              <svg className="h-4 w-4 text-green-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={createCheckoutSession}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
                    disabled={processingAction || !selectedPlan}
                  >
                    {processingAction ? 'Processing...' : 'Subscribe Now'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StripeIntegration;