import React, { useState, useEffect } from 'react';
import ReviewItem from './ReviewItem';

interface FlaggedItem {
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
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  pages: number;
  currentPage: number;
}

interface ReviewQueueProps {
  initialItems?: FlaggedItem[];
  initialPagination?: PaginationInfo;
}

const ReviewQueue: React.FC<ReviewQueueProps> = ({ 
  initialItems = [], 
  initialPagination = { total: 0, limit: 10, offset: 0, pages: 0, currentPage: 1 } 
}) => {
  const [items, setItems] = useState<FlaggedItem[]>(initialItems);
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<string>('desc');

  // Fetch flagged items
  const fetchFlaggedItems = async (page = 1, limit = 10) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const offset = (page - 1) * limit;
      const response = await fetch(
        `/api/v1/reviews/flagged?limit=${limit}&offset=${offset}&sortBy=${sortBy}&sortOrder=${sortOrder}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch flagged items');
      }
      
      const data = await response.json();
      setItems(data.items);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching flagged items:', error);
      setError('Failed to load review queue. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (initialItems.length === 0) {
      fetchFlaggedItems();
    }
  }, []);

  // Handle sort change
  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to descending for new sort field
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Apply sort and fetch
  useEffect(() => {
    if (initialItems.length === 0) {
      fetchFlaggedItems(pagination.currentPage, pagination.limit);
    }
  }, [sortBy, sortOrder]);

  // Handle pagination
  const handlePageChange = (page: number) => {
    fetchFlaggedItems(page, pagination.limit);
  };

  // Handle approve action
  const handleApprove = async (id: number, comment: string) => {
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
      
      // Refresh the queue
      fetchFlaggedItems(pagination.currentPage, pagination.limit);
    } catch (error) {
      console.error('Error approving item:', error);
      throw error;
    }
  };

  // Handle adjust action
  const handleAdjust = async (id: number, hsCode: string, comment: string) => {
    try {
      const response = await fetch(`/api/v1/reviews/adjust/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hs_code: hsCode, comment }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to adjust item');
      }
      
      // Refresh the queue
      fetchFlaggedItems(pagination.currentPage, pagination.limit);
    } catch (error) {
      console.error('Error adjusting item:', error);
      throw error;
    }
  };

  // Render pagination controls
  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pagination.pages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 mx-1 rounded ${
            pagination.currentPage === i
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {i}
        </button>
      );
    }
    
    return (
      <div className="flex justify-center items-center mt-4">
        <button
          onClick={() => handlePageChange(1)}
          disabled={pagination.currentPage === 1}
          className="px-3 py-1 mx-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          First
        </button>
        <button
          onClick={() => handlePageChange(pagination.currentPage - 1)}
          disabled={pagination.currentPage === 1}
          className="px-3 py-1 mx-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          Prev
        </button>
        
        {pages}
        
        <button
          onClick={() => handlePageChange(pagination.currentPage + 1)}
          disabled={pagination.currentPage === pagination.pages}
          className="px-3 py-1 mx-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          Next
        </button>
        <button
          onClick={() => handlePageChange(pagination.pages)}
          disabled={pagination.currentPage === pagination.pages}
          className="px-3 py-1 mx-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          Last
        </button>
      </div>
    );
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Review Queue</h2>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-2">Sort by:</span>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="border rounded px-2 py-1 text-sm"
            aria-label="Sort options"
          >
            <option value="created_at-desc">Date Added (Newest)</option>
            <option value="created_at-asc">Date Added (Oldest)</option>
            <option value="description-asc">Description (A-Z)</option>
            <option value="description-desc">Description (Z-A)</option>
          </select>
          <button
            onClick={() => fetchFlaggedItems(pagination.currentPage, pagination.limit)}
            className="ml-2 p-1 rounded bg-gray-200 hover:bg-gray-300"
            title="Refresh"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-12 rounded text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium">No items to review</p>
          <p className="text-sm mt-1">All items have been reviewed or there are no flagged items.</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              Showing {items.length} of {pagination.total} items
            </p>
          </div>
          
          <div>
            {items.map((item) => (
              <ReviewItem
                key={item.id}
                item={item}
                onApprove={handleApprove}
                onAdjust={handleAdjust}
              />
            ))}
          </div>
          
          {pagination.pages > 1 && renderPagination()}
        </>
      )}
    </div>
  );
};

export default ReviewQueue;