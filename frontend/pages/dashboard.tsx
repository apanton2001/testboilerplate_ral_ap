import { NextPage } from 'next';
import Head from 'next/head';
import dynamic from 'next/dynamic'; // Import dynamic
import { useSession } from 'next-auth/react';
// import Navbar from '../components/Navbar'; // Import dynamically instead
import ProtectedRoute from '../components/ProtectedRoute';
import { Suspense } from 'react'; // Import Suspense for fallback UI

// Dynamically import components that are large or not needed immediately
const Navbar = dynamic(() => import('../components/Navbar'), {
  suspense: true, // Enable suspense fallback
  // ssr: false // Optional: Disable server-side rendering for this component if needed
});

// Example: Dynamically import a potentially large analytics dashboard component
const AnalyticsDashboard = dynamic(() => import('../components/analytics/Dashboard'), {
  suspense: true,
  // ssr: false // Often good to disable SSR for complex client-side charts
});


const Dashboard: NextPage = () => {
  const { data: session } = useSession();

  // Placeholder loading state for suspense fallback
  const LoadingFallback = () => <div className="text-center p-10">Loading component...</div>;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <Head>
          <title>Dashboard | Automated Customs Documentation Platform</title>
        </Head>

        {/* Wrap dynamic components in Suspense */}
        <Suspense fallback={<div className="h-16 bg-gray-200 animate-pulse"></div>}> {/* Navbar placeholder */}
          <Navbar />
        </Suspense>

        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-center mb-8">
            User Dashboard
          </h1>

          <div className="bg-white shadow-md rounded-lg p-6 max-w-4xl mx-auto mb-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Welcome, {session?.user.name || session?.user.email}</h2>
              <p className="text-gray-600">
                This is your personalized dashboard for the Automated Customs Documentation Platform.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Existing dashboard cards */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="font-medium text-blue-800 mb-2">Recent Invoices</h3>
                <p className="text-sm text-gray-600">No recent invoices found.</p>
                <button className="mt-3 text-sm text-blue-600 hover:text-blue-800">
                  Create New Invoice
                </button>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <h3 className="font-medium text-green-800 mb-2">Pending Submissions</h3>
                <p className="text-sm text-gray-600">No pending submissions.</p>
                <button className="mt-3 text-sm text-green-600 hover:text-green-800">
                  View All Submissions
                </button>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <h3 className="font-medium text-purple-800 mb-2">Classification History</h3>
                <p className="text-sm text-gray-600">No recent classifications.</p>
                <button className="mt-3 text-sm text-purple-600 hover:text-purple-800">
                  View Classification History
                </button>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                <h3 className="font-medium text-yellow-800 mb-2">Notifications</h3>
                <p className="text-sm text-gray-600">No new notifications.</p>
                <button className="mt-3 text-sm text-yellow-600 hover:text-yellow-800">
                  View All Notifications
                </button>
              </div>
            </div>
          </div>

          {/* Example of rendering the dynamically loaded Analytics Dashboard */}
          <div className="bg-white shadow-md rounded-lg p-6 max-w-4xl mx-auto">
             <h2 className="text-xl font-semibold mb-4">Analytics Overview</h2>
             <Suspense fallback={<LoadingFallback />}>
                <AnalyticsDashboard />
             </Suspense>
          </div>

        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;