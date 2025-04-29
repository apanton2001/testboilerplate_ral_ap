import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute';
import InvoiceGrid from '../../components/InvoiceGrid';
import DocumentViewer from '../../components/DocumentViewer';
import SubmissionForm from '../../components/SubmissionForm';

interface Invoice {
  id: number;
  supplier: string;
  invoice_date: string;
  total_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

const InvoiceDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchInvoice = async () => {
      try {
        const response = await fetch(`/api/v1/invoices/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch invoice');
        }
        const data = await response.json();
        setInvoice(data);
        setLoading(false);
      } catch (err) {
        setError('Error loading invoice. Please try again later.');
        setLoading(false);
        console.error('Error fetching invoice:', err);
      }
    };

    fetchInvoice();
  }, [id]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-200 text-gray-800';
      case 'submitted':
        return 'bg-blue-200 text-blue-800';
      case 'approved':
        return 'bg-green-200 text-green-800';
      case 'rejected':
        return 'bg-red-200 text-red-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/invoices" className="text-blue-600 hover:text-blue-800">
            &larr; Back to Invoices
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        ) : invoice ? (
          <div>
            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Invoice #{invoice.id}</h1>
                <span className={`px-3 py-1 rounded-full text-sm ${getStatusBadgeClass(invoice.status)}`}>
                  {invoice.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Supplier</p>
                  <p className="font-medium">{invoice.supplier || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Invoice Date</p>
                  <p className="font-medium">{formatDate(invoice.invoice_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-medium">{formatCurrency(invoice.total_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="font-medium">{formatDate(invoice.updated_at)}</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Link
                  href={`/invoices/${invoice.id}/edit`}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Edit Invoice
                </Link>
                {/* Edit button is the only action in the header now */}
              </div>
            </div>

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Invoice Items</h2>
              <InvoiceGrid invoiceId={Number(id)} readOnly={invoice.status !== 'Draft'} />
            </div>

            {/* Document Generation Section */}
            <DocumentViewer invoiceId={Number(id)} />

            {/* Submission Section - Only show for Draft or Failed status */}
            {(invoice.status === 'Draft' || invoice.status === 'Failed') && (
              <SubmissionForm
                invoiceId={Number(id)}
                onSubmissionComplete={(success) => {
                  if (success) {
                    // Refresh the invoice data to update status
                    router.reload();
                  }
                }}
              />
            )}
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">Invoice not found.</span>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default InvoiceDetailPage;