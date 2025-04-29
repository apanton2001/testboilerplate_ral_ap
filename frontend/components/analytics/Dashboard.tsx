import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import VolumeChart from './charts/VolumeChart';
import AccuracyChart from './charts/AccuracyChart';
import SavingsChart from './charts/SavingsChart';
import ReportConfig from './ReportConfig';
import ReportExport from './ReportExport';

interface DashboardProps {
  defaultTab?: string;
}

interface ReportFilters {
  startDate: string | null;
  endDate: string | null;
  brokerFeePerEntry?: number;
  hourlyRate?: number;
}

const AnalyticsDashboard: React.FC<DashboardProps> = ({ defaultTab = 'volume' }) => {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    brokerFeePerEntry: 150,
    hourlyRate: 75
  });
  const router = useRouter();

  // Fetch summary data
  useEffect(() => {
    const fetchSummaryData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const queryParams = new URLSearchParams();
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);
        
        const response = await fetch(`/api/v1/reports/summary?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch report data');
        }
        
        const data = await response.json();
        setSummaryData(data);
      } catch (err) {
        console.error('Error fetching report data:', err);
        setError('Failed to load report data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSummaryData();
  }, [filters.startDate, filters.endDate]);

  // Handle filter changes
  const handleFilterChange = (newFilters: ReportFilters) => {
    setFilters(newFilters);
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">Analytics Dashboard</h1>
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
          <ReportConfig filters={filters} onFilterChange={handleFilterChange} />
          <ReportExport reportType={activeTab} filters={filters} />
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
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summaryData?.summary?.totalInvoices || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Auto-Classification Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summaryData?.summary?.autoClassificationRate || 0}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Savings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">${summaryData?.summary?.totalSavings?.toLocaleString() || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Time Saved (Hours)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summaryData?.summary?.timeHoursSaved?.toFixed(1) || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Report Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid grid-cols-3 mb-8">
              <TabsTrigger value="volume">Import Volume</TabsTrigger>
              <TabsTrigger value="accuracy">Classification Accuracy</TabsTrigger>
              <TabsTrigger value="savings">Cost Savings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="volume" className="mt-6">
              <VolumeChart data={summaryData?.reports?.volume} />
            </TabsContent>
            
            <TabsContent value="accuracy" className="mt-6">
              <AccuracyChart data={summaryData?.reports?.accuracy} />
            </TabsContent>
            
            <TabsContent value="savings" className="mt-6">
              <SavingsChart 
                data={summaryData?.reports?.savings} 
                brokerFeePerEntry={filters.brokerFeePerEntry} 
                hourlyRate={filters.hourlyRate} 
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;