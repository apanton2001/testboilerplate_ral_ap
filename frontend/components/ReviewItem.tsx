import React, { useState } from 'react';
import { useRouter } from 'next/router';

interface ReviewItemProps {
  item: {
    id: number;
    description: string;
    quantity: number;
    unit_price: number;
    hs_code: string;
    classification_method: string;
    flagged: boolean;
    invoice: {
      id: number;
      supplier: string;
      invoice_date: string;
      status: string;
    };
  };
  onApprove: (id: number, comment: string) => Promise<void>;
  onAdjust: (id: number, hsCode: string, comment: string) => Promise<void>;
}

const ReviewItem: React.FC<ReviewItemProps> = ({ item, onApprove, onAdjust }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newHsCode, setNewHsCode] = useState(item.hs_code || '');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleApprove = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onApprove(item.id, comment);
      setComment('');
    } catch (error) {
      console.error('Error approving item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjust = async () => {
    if (isSubmitting || !newHsCode.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onAdjust(item.id, newHsCode, comment);
      setComment('');
    } catch (error) {
      console.error('Error adjusting item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewInvoice = () => {
    router.push(`/invoices/${item.invoice.id}`);
  };

  const viewDetails = () => {
    router.push(`/reviews/${item.id}`);
  };

  return (
    <div className="border rounded-lg shadow-sm mb-4 overflow-hidden">
      <div 
        className="p-4 bg-white cursor-pointer flex justify-between items-center"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h3 className="text-lg font-medium text-gray-900">{item.description}</h3>
          <div className="mt-1 flex items-center text-sm text-gray-500">
            <span className="mr-2">Supplier: {item.invoice.supplier}</span>
            <span className="mr-2">•</span>
            <span className="mr-2">Invoice: #{item.invoice.id}</span>
            <span className="mr-2">•</span>
            <span>Date: {new Date(item.invoice.invoice_date).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center">
          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 mr-2">
            {item.classification_method}
          </span>
          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
            {item.hs_code || 'No HS Code'}
          </span>
          <svg 
            className={`ml-2 h-5 w-5 text-gray-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4 bg-gray-50 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Item Details</h4>
              <div className="bg-white p-3 rounded border">
                <p><span className="font-medium">Description:</span> {item.description}</p>
                <p><span className="font-medium">Quantity:</span> {item.quantity}</p>
                <p><span className="font-medium">Unit Price:</span> ${item.unit_price.toFixed(2)}</p>
                <p><span className="font-medium">Total:</span> ${(item.quantity * item.unit_price).toFixed(2)}</p>
                <p><span className="font-medium">Current HS Code:</span> {item.hs_code || 'Not classified'}</p>
                <p><span className="font-medium">Classification Method:</span> {item.classification_method}</p>
              </div>
              <div className="mt-3 flex space-x-2">
                <button 
                  onClick={viewInvoice}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                >
                  View Invoice
                </button>
                <button 
                  onClick={viewDetails}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
                >
                  View Full Details
                </button>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Review Actions</h4>
              <div className="bg-white p-3 rounded border">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HS Code
                  </label>
                  <input
                    type="text"
                    value={newHsCode}
                    onChange={(e) => setNewHsCode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    placeholder="Enter HS code"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Comment
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    rows={3}
                    placeholder="Add a comment about this review"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleApprove}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing...' : 'Approve Current HS Code'}
                  </button>
                  <button
                    onClick={handleAdjust}
                    disabled={isSubmitting || !newHsCode.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing...' : 'Adjust HS Code'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewItem;