import React, { useState, useEffect } from 'react';

interface SubmissionFormProps {
  invoiceId: number;
  onSubmissionComplete?: (success: boolean) => void;
}

interface Submission {
  id: number;
  invoice_id: number;
  method: string;
  status: string;
  response_message: string;
  submitted_at: string;
}

const SubmissionForm: React.FC<SubmissionFormProps> = ({ invoiceId, onSubmissionComplete }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Fetch submission history
  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/submissions/${invoiceId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch submissions');
      }
      
      const data = await response.json();
      setSubmissions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching submissions');
    } finally {
      setLoading(false);
    }
  };

  // Submit invoice to customs
  const submitInvoice = async () => {
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/submissions/${invoiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit invoice');
      }
      
      const data = await response.json();
      
      // Refresh submission history
      await fetchSubmissions();
      
      // Notify parent component
      if (onSubmissionComplete) {
        onSubmissionComplete(true);
      }
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while submitting the invoice');
      
      // Notify parent component
      if (onSubmissionComplete) {
        onSubmissionComplete(false);
      }
      
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // Retry failed submission
  const retrySubmission = async (submissionId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/submissions/${invoiceId}/${submissionId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to retry submission');
      }
      
      // Refresh submission history
      await fetchSubmissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while retrying the submission');
    } finally {
      setLoading(false);
    }
  };

  // Check submission status
  const checkStatus = async (submissionId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/submissions/${invoiceId}/${submissionId}/status`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to check submission status');
      }
      
      // Refresh submission history
      await fetchSubmissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while checking submission status');
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Load submissions on component mount
  useEffect(() => {
    fetchSubmissions();
  }, [invoiceId]);

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Customs Submission</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <div className="mb-4">
        <p className="text-gray-600 mb-2">
          Submit this invoice to customs authorities for processing. The system will automatically generate the required documentation in ASYCUDA format.
        </p>
        
        <button
          onClick={submitInvoice}
          disabled={submitting || loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 mb-4"
        >
          {submitting ? 'Submitting...' : 'Submit to Customs'}
        </button>
        
        <div className="flex items-center mb-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-blue-500 hover:text-blue-700 font-medium"
          >
            {showHistory ? 'Hide Submission History' : 'Show Submission History'}
          </button>
          
          {loading && (
            <div className="ml-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
          )}
          
          <button
            onClick={fetchSubmissions}
            disabled={loading}
            className="ml-auto text-gray-500 hover:text-gray-700"
          >
            Refresh
          </button>
        </div>
        
        {showHistory && (
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted At
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No submissions found
                    </td>
                  </tr>
                ) : (
                  submissions.map((submission) => (
                    <tr key={submission.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {submission.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {submission.method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          submission.status === 'Submitted' ? 'bg-blue-100 text-blue-800' :
                          submission.status === 'Approved' ? 'bg-green-100 text-green-800' :
                          submission.status === 'Failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {submission.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(submission.submitted_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => checkStatus(submission.id)}
                          disabled={loading}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Check Status
                        </button>
                        {submission.status === 'Failed' && (
                          <button
                            onClick={() => retrySubmission(submission.id)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-900"
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmissionForm;