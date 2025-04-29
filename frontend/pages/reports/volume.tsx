import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../../components/ProtectedRoute';
import { Card, CardContent } from '../../components/ui/Card';
import ReportConfig from '../../components/analytics/ReportConfig';
import ReportExport from '../../components/analytics/ReportExport';
import VolumeChart from '../../components/analytics/charts/VolumeChart';

const VolumeReportPage: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const queryParams = new URLSearchParams();
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);
        
        const response = await fetch(`/api/v1/reports/volume?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch report data');
        }
        
        const data = await response.json();
        setReportData(data.report);
      } catch (err) {
        console.error('Error fetching report data:', err);
        setError('Failed to load report data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReportData();
  }, [filters.startDate, filters.endDate]);

  // Handle filter changes
  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Import Volume Report</h1>
            <p className="text-gray-600">
              Analyze import volumes, trends, and patterns over time
            </p>
          </div>
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mt-4 md:mt-0">
            <ReportConfig filters={filters} onFilterChange={handleFilterChange} />
            <ReportExport reportType="volume" filters={filters} />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        ) : (
          <div>
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-blue-600 font-medium">Total Invoices</p>
                    <p className="text-3xl font-bold text-blue-800">{reportData?.totalInvoices || 0}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-green-600 font-medium">Total Invoice Lines</p>
                    <p className="text-3xl font-bold text-green-800">{reportData?.totalInvoiceLines || 0}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-purple-600 font-medium">Avg. Lines Per Invoice</p>
                    <p className="text-3xl font-bold text-purple-800">{reportData?.averageLinesPerInvoice || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <VolumeChart data={reportData} />
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default VolumeReportPage;