import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import Head from 'next/head';
import ProtectedRoute from '../../components/ProtectedRoute';
import QuickBooksIntegration from '../../components/integrations/QuickBooksIntegration';
import FreightIntegration from '../../components/integrations/FreightIntegration';
import StripeIntegration from '../../components/integrations/StripeIntegration';

const IntegrationsPage = () => {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<string>('quickbooks');

  const tabs = [
    { id: 'quickbooks', label: 'QuickBooks' },
    { id: 'freight', label: 'Freight Forwarders' },
    { id: 'subscription', label: 'Subscription' }
  ];

  return (
    <ProtectedRoute>
      <Head>
        <title>Integrations | Customs Documentation Platform</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Integrations & Subscriptions</h1>
        
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'quickbooks' && <QuickBooksIntegration />}
          {activeTab === 'freight' && <FreightIntegration />}
          {activeTab === 'subscription' && <StripeIntegration />}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  
  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }
  
  return {
    props: {}
  };
};

export default IntegrationsPage;