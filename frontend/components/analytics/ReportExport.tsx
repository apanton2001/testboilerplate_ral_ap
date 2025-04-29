import React, { useState } from 'react';

interface ReportExportProps {
  reportType: string;
  filters: {
    startDate: string | null;
    endDate: string | null;
    brokerFeePerEntry?: number;
    hourlyRate?: number;
  };
}

const ReportExport: React.FC<ReportExportProps> = ({ reportType, filters }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleExport = async (format: string) => {
    setIsExporting(true);
    setShowDropdown(false);
    
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('format', format);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      
      if (reportType === 'savings') {
        if (filters.brokerFeePerEntry) {
          queryParams.append('brokerFeePerEntry', filters.brokerFeePerEntry.toString());
        }
        if (filters.hourlyRate) {
          queryParams.append('hourlyRate', filters.hourlyRate.toString());
        }
      }
      
      // Create export URL
      const exportUrl = `/api/v1/reports/export/${reportType}?${queryParams.toString()}`;
      
      // Trigger download
      window.location.href = exportUrl;
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded flex items-center"
        aria-label="Export report options"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5 mr-2" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
          />
        </svg>
        {isExporting ? 'Exporting...' : 'Export'}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
          <div className="py-1">
            <button
              onClick={() => handleExport('csv')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              disabled={isExporting}
            >
              Export as CSV
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              disabled={isExporting}
            >
              Export as Excel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportExport;