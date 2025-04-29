import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute';
import InvoiceGrid from '../../components/InvoiceGrid';

const NewInvoicePage: React.FC = () => {
  const router = useRouter();
  const [supplier, setSupplier] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplier,
          invoice_date: invoiceDate,
          status: 'Draft',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create invoice');
      }

      const data = await response.json();
      setInvoiceId(data.id);
    } catch (err) {
      setError('Error creating invoice. Please try again.');
      console.error('Error creating invoice:', err);
      setLoading(false);
    }
  };

  const handleSaveAndExit = () => {
    router.push('/invoices');
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/invoices" className="text-blue-600 hover:text-blue-800">
            &larr; Back to Invoices
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">Create New Invoice</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {!invoiceId ? (
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="supplier" className="block text-gray-700 text-sm font-bold mb-2">
                  Supplier
                </label>
                <input
                  type="text"
                  id="supplier"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter supplier name"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="invoiceDate" className="block text-gray-700 text-sm font-bold mb-2">
                  Invoice Date
                </label>
                <input
                  type="date"
                  id="invoiceDate"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">Invoice created successfully! You can now add items to your invoice.</span>
            </div>

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Invoice Items</h2>
              <InvoiceGrid invoiceId={invoiceId} />

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveAndExit}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Save and Exit
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default NewInvoicePage;