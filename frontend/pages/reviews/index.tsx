import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
// @ts-ignore
import { getSession } from 'next-auth/react';
import Head from 'next/head';
import ProtectedRoute from '../../components/ProtectedRoute';
import ReviewQueue from '../../components/ReviewQueue';

interface ReviewStats {
  totalFlagged: number;
  reviewedToday: number;
  pendingBySupplier: Array<{
    supplier: string;
    count: number;
  }>;
}

interface ReviewDashboardProps {
  initialStats?: ReviewStats;
}

const ReviewDashboard: React.FC<ReviewDashboardProps> = ({ initialStats }) => {
  const [stats, setStats] = useState<ReviewStats | null>(initialStats || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialStats);

  // Fetch review statistics
  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/reviews/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch review statistics');
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching review statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch stats on mount if not provided
  useEffect(() => {
    if (!initialStats) {
      fetchStats();
    }
  }, [initialStats]);

  return (
    <ProtectedRoute requiredRoles={['Admin', 'Reviewer']}>
      <div>
        <Head>
          <title>Review Dashboard | Customs Documentation Platform</title>
          <meta name="description" content="Review flagged items for customs documentation" />
        </Head>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Review Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600">
              Review and approve flagged items that need tariff classification review
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-medium text-gray-900">Items Pending Review</h2>
                  <p className="text-3xl font-semibold text-gray-700">
                    {isLoading ? (
                      <span className="text-gray-400">Loading...</span>
                    ) : (
                      stats?.totalFlagged || 0
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-medium text-gray-900">Reviewed Today</h2>
                  <p className="text-3xl font-semibold text-gray-700">
                    {isLoading ? (
                      <span className="text-gray-400">Loading...</span>
                    ) : (
                      stats?.reviewedToday || 0
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-medium text-gray-900">Average Review Time</h2>
                  <p className="text-3xl font-semibold text-gray-700">
                    <span className="text-gray-400">N/A</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Review Queue */}
          <ReviewQueue />

          {/* Supplier Breakdown */}
          {stats?.pendingBySupplier && stats.pendingBySupplier.length > 0 && (
            <div className="mt-8 bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Pending Reviews by Supplier</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pending Items
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.pendingBySupplier.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.supplier || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  // Redirect if not authenticated or not a reviewer
  if (!session || !['Admin', 'Reviewer'].includes(session.user.role)) {
    return {
      redirect: {
        destination: '/unauthorized',
        permanent: false,
      },
    };
  }

  // Try to fetch initial stats
  try {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = context.req.headers.host || 'localhost:3000';
    
    const response = await fetch(`${protocol}://${host}/api/v1/reviews/stats`, {
      headers: {
        Cookie: context.req.headers.cookie || '',
      },
    });
    
    if (response.ok) {
      const initialStats = await response.json();
      return {
        props: { initialStats },
      };
    }
  } catch (error) {
    console.error('Error fetching initial stats:', error);
  }

  // Return empty props if stats fetch fails
  return {
    props: {},
  };
};

export default ReviewDashboard;