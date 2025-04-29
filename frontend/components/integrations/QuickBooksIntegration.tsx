import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface QuickBooksStatus {
  connected: boolean;
  lastSyncAt?: string;
  expiresAt?: string;
  error?: string;
}

const QuickBooksIntegration = () => {
  const { data: session } = useSession();
  const [status, setStatus] = useState<QuickBooksStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [syncInProgress, setSyncInProgress] = useState<boolean>(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);

  // Fetch QuickBooks connection status
  const fetchStatus = async () => {
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
        throw new Error('Failed to fetch integration status');
      }
      
      const data = await response.json();
      setStatus(data.integrations.quickbooks);
    } catch (err) {
      console.error('Error fetching QuickBooks status:', err);
      setError('Failed to load QuickBooks integration status');
    } finally {
      setLoading(false);
    }
  };

  // Fetch invoices that can be synced
  const fetchInvoices = async () => {
    if (!session) return;

    try {
      const response = await fetch('/api/v1/invoices?status=completed', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      
      const data = await response.json();
      setInvoices(data.invoices.filter((invoice: any) => !invoice.external_id));
    } catch (err) {
      console.error('Error fetching invoices:', err);
    }
  };

  // Connect to QuickBooks
  const connectQuickBooks = async () => {
    if (!session) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/v1/integrations/quickbooks/auth-url', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get QuickBooks authorization URL');
      }
      
      const data = await response.json();
      
      // Redirect to QuickBooks authorization page
      window.location.href = data.authUrl;
    } catch (err) {
      console.error('Error connecting to QuickBooks:', err);
      setError('Failed to connect to QuickBooks');
      setLoading(false);
    }
  };

  // Disconnect from QuickBooks
  const disconnectQuickBooks = async () => {
    if (!session) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/v1/integrations/quickbooks/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect from QuickBooks');
      }
      
      // Update status
      setStatus({ connected: false });
    } catch (err) {
      console.error('Error disconnecting from QuickBooks:', err);
      setError('Failed to disconnect from QuickBooks');
    } finally {
      setLoading(false);
    }
  };

  // Sync selected invoices to QuickBooks
  const syncInvoices = async () => {
    if (!session || selectedInvoices.length === 0) return;

    try {
      setSyncInProgress(true);
      setError(null);
      
      const response = await fetch('/api/v1/integrations/quickbooks/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoiceIds: selectedInvoices
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to sync invoices to QuickBooks');
      }
      
      const data = await response.json();
      
      // Update UI based on sync results
      if (data.results.success.length > 0) {
        // Remove synced invoices from the list
        setInvoices(invoices.filter((invoice: any) => 
          !data.results.success.some((result: any) => result.invoiceId === invoice.id)
        ));
        setSelectedInvoices([]);
      }
      
      // Refresh status to get updated lastSyncAt
      fetchStatus();
    } catch (err) {
      console.error('Error syncing invoices to QuickBooks:', err);
      setError('Failed to sync invoices to QuickBooks');
    } finally {
      setSyncInProgress(false);
    }
  };

  // Toggle invoice selection
  const toggleInvoiceSelection = (invoiceId: number) => {
    if (selectedInvoices.includes(invoiceId)) {
      setSelectedInvoices(selectedInvoices.filter(id => id !== invoiceId));
    } else {
      setSelectedInvoices([...selectedInvoices, invoiceId]);
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Load status on component mount
  useEffect(() => {
    if (session) {
      fetchStatus();
    }
  }, [session]);

  // Load invoices when connected
  useEffect(() => {
    if (session && status?.connected) {
      fetchInvoices();
    }
  }, [session, status]);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">QuickBooks Integration</h2>
      
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
          {status?.connected ? (
            <div>
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                Connected to QuickBooks
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Last Sync</p>
                  <p className="font-medium">{formatDate(status.lastSyncAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Token Expires</p>
                  <p className="font-medium">{formatDate(status.expiresAt)}</p>
                </div>
              </div>
              
              <button
                onClick={disconnectQuickBooks}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded mb-6"
                disabled={loading}
              >
                Disconnect QuickBooks
              </button>
              
              <h3 className="text-lg font-medium text-gray-800 mb-2">Sync Invoices</h3>
              
              {invoices.length === 0 ? (
                <p className="text-gray-500">No invoices available for syncing</p>
              ) : (
                <>
                  <div className="border rounded-md overflow-hidden mb-4">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={selectedInvoices.length === invoices.length}
                              onChange={() => {
                                if (selectedInvoices.length === invoices.length) {
                                  setSelectedInvoices([]);
                                } else {
                                  setSelectedInvoices(invoices.map((invoice: any) => invoice.id));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                              aria-label="Select all invoices"
                              title="Select all invoices"
                            />
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Invoice #
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invoices.map((invoice: any) => (
                          <tr key={invoice.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedInvoices.includes(invoice.id)}
                                onChange={() => toggleInvoiceSelection(invoice.id)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                aria-label={`Select invoice ${invoice.invoice_number}`}
                                title={`Select invoice ${invoice.invoice_number}`}
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {invoice.invoice_number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {new Date(invoice.invoice_date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              ${invoice.total_amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <button
                    onClick={syncInvoices}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
                    disabled={syncInProgress || selectedInvoices.length === 0}
                  >
                    {syncInProgress ? 'Syncing...' : `Sync ${selectedInvoices.length} Invoice${selectedInvoices.length !== 1 ? 's' : ''}`}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">
                Connect your QuickBooks account to sync invoices and financial data.
              </p>
              <button
                onClick={connectQuickBooks}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
                disabled={loading}
              >
                Connect QuickBooks
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QuickBooksIntegration;