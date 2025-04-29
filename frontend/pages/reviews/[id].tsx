import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
// @ts-ignore
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ProtectedRoute from '../../components/ProtectedRoute';

interface ClassificationHistoryItem {
  id: number;
  previous_hs_code: string;
  new_hs_code: string;
  changed_at: string;
  comment?: string;
  user: {
    id: number;
    full_name: string;
    email: string;
  };
}

interface ReviewItemDetail {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  hs_code: string;
  classification_method: string;
  flagged: boolean;
  created_at: string;
  updated_at: string;
  invoice: {
    id: number;
    supplier: string;
    invoice_date: string;
    status: string;
    user_id: number;
  };
  classification_history: ClassificationHistoryItem[];
}

interface ReviewDetailProps {
  initialData?: ReviewItemDetail;
}

const ReviewDetail: React.FC<ReviewDetailProps> = ({ initialData }) => {
  const router = useRouter();
  const { id } = router.query;
  const [item, setItem] = useState<ReviewItemDetail | null>(initialData || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [newHsCode, setNewHsCode] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch item data
  const fetchItemData = async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/reviews/flagged/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch item details');
      }
      
      const data = await response.json();
      setItem(data);
      setNewHsCode(data.hs_code || '');
    } catch (error) {
      console.error('Error fetching item details:', error);
      setError('Failed to load item details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on mount if not provided
  useEffect(() => {
    if (!initialData && id) {
      fetchItemData();
    }
  }, [id, initialData]);

  // Handle approve action
  const handleApprove = async () => {
    if (!id || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/reviews/approve/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve item');
      }
      
      // Redirect to review queue
      router.push('/reviews');
    } catch (error) {
      console.error('Error approving item:', error);
      setError('Failed to approve item. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Handle adjust action
  const handleAdjust = async () => {
    if (!id || isSubmitting || !newHsCode.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/reviews/adjust/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hs_code: newHsCode, comment }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to adjust HS code');
      }
      
      // Redirect to review queue
      router.push('/reviews');
    } catch (error) {
      console.error('Error adjusting HS code:', error);
      setError('Failed to adjust HS code. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <ProtectedRoute requiredRoles={['Admin', 'Reviewer']}>
      <div>
        <Head>
          <title>Review Item | Customs Documentation Platform</title>
          <meta name="description" content="Review flagged item details" />
        </Head>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Review Item</h1>
              <p className="mt-1 text-sm text-gray-600">
                Review and approve or adjust the HS code for this item
              </p>
            </div>
            <button
              onClick={() => router.push('/reviews')}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Queue
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          ) : item ? (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              {/* Item Details */}
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Item Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-500">Description</h3>
                      <p className="mt-1 text-lg text-gray-900">{item.description}</p>
                    </div>
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-500">Quantity</h3>
                      <p className="mt-1 text-lg text-gray-900">{item.quantity}</p>
                    </div>
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-500">Unit Price</h3>
                      <p className="mt-1 text-lg text-gray-900">${item.unit_price.toFixed(2)}</p>
                    </div>
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-500">Total</h3>
                      <p className="mt-1 text-lg text-gray-900">${(item.quantity * item.unit_price).toFixed(2)}</p>
                    </div>
                  </div>
                  <div>
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-500">Current HS Code</h3>
                      <p className="mt-1 text-lg text-gray-900">{item.hs_code || 'Not classified'}</p>
                    </div>
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-500">Classification Method</h3>
                      <p className="mt-1 text-lg text-gray-900">{item.classification_method}</p>
                    </div>
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-500">Invoice</h3>
                      <p className="mt-1 text-lg text-gray-900">
                        #{item.invoice.id} - {item.invoice.supplier}
                      </p>
                    </div>
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-500">Invoice Date</h3>
                      <p className="mt-1 text-lg text-gray-900">
                        {new Date(item.invoice.invoice_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Actions */}
              <div className="p-6 border-b bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Review Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4">
                      <label htmlFor="hs-code" className="block text-sm font-medium text-gray-700">
                        HS Code
                      </label>
                      <input
                        type="text"
                        id="hs-code"
                        value={newHsCode}
                        onChange={(e) => setNewHsCode(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Enter HS code"
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
                        Review Comment
                      </label>
                      <textarea
                        id="comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={4}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Add a comment about this review"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="bg-gray-100 p-4 rounded-md mb-4">
                      <p className="text-sm text-gray-600">
                        <strong>Approve:</strong> Accept the current HS code as correct.
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        <strong>Adjust:</strong> Modify the HS code if it's incorrect.
                      </p>
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={handleApprove}
                        disabled={isSubmitting}
                        className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        {isSubmitting ? 'Processing...' : 'Approve Current HS Code'}
                      </button>
                      <button
                        onClick={handleAdjust}
                        disabled={isSubmitting || !newHsCode.trim()}
                        className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {isSubmitting ? 'Processing...' : 'Adjust HS Code'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Classification History */}
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Classification History</h2>
                {item.classification_history && item.classification_history.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Previous HS Code
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            New HS Code
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Comment
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {item.classification_history.map((history) => (
                          <tr key={history.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(history.changed_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {history.user.full_name || history.user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {history.previous_hs_code || 'None'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {history.new_hs_code}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {history.comment || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No classification history available.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">Item not found or no longer flagged for review.</span>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  const { id } = context.params || {};

  // Redirect if not authenticated or not a reviewer
  if (!session || !['Admin', 'Reviewer'].includes(session.user.role)) {
    return {
      redirect: {
        destination: '/unauthorized',
        permanent: false,
      },
    };
  }

  // Try to fetch initial data
  try {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = context.req.headers.host || 'localhost:3000';
    
    const response = await fetch(`${protocol}://${host}/api/v1/reviews/flagged/${id}`, {
      headers: {
        Cookie: context.req.headers.cookie || '',
      },
    });
    
    if (response.ok) {
      const initialData = await response.json();
      return {
        props: { initialData },
      };
    }
  } catch (error) {
    console.error('Error fetching initial data:', error);
  }

  // Return empty props if data fetch fails
  return {
    props: {},
  };
};

export default ReviewDetail;