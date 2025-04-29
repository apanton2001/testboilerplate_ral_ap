import React, { useState } from 'react';

interface DocumentViewerProps {
  invoiceId: number;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ invoiceId }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<'pdf' | 'xml'>('pdf');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationSuccess, setGenerationSuccess] = useState<boolean>(false);

  // Generate documents
  const generateDocuments = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/documents/${invoiceId}/generate`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate documents');
      }
      
      const data = await response.json();
      setGenerationSuccess(true);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while generating documents');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle document preview
  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Generate documents first if not already generated
      if (!generationSuccess) {
        const result = await generateDocuments();
        if (!result) return;
      }
      
      // Open document in new window
      window.open(`/api/v1/documents/${invoiceId}/preview/${documentType}`, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while previewing the document');
    } finally {
      setLoading(false);
    }
  };

  // Handle document download
  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Generate documents first if not already generated
      if (!generationSuccess) {
        const result = await generateDocuments();
        if (!result) return;
      }
      
      // Open document download in new window
      window.open(`/api/v1/documents/${invoiceId}/download/${documentType}`, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while downloading the document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Document Generation</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Document Type
        </label>
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio"
              name="documentType"
              value="pdf"
              checked={documentType === 'pdf'}
              onChange={() => setDocumentType('pdf')}
            />
            <span className="ml-2">PDF</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio"
              name="documentType"
              value="xml"
              checked={documentType === 'xml'}
              onChange={() => setDocumentType('xml')}
            />
            <span className="ml-2">XML</span>
          </label>
        </div>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={handlePreview}
          disabled={loading || isGenerating}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : loading ? 'Loading...' : 'Preview Document'}
        </button>
        <button
          onClick={handleDownload}
          disabled={loading || isGenerating}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : loading ? 'Loading...' : 'Download Document'}
        </button>
        {!generationSuccess && (
          <button
            onClick={generateDocuments}
            disabled={isGenerating}
            className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate Documents'}
          </button>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;