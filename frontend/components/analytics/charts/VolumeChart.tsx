import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface VolumeChartProps {
  data: any;
}

const VolumeChart: React.FC<VolumeChartProps> = ({ data }) => {
  if (!data || !data.monthlyData || data.monthlyData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <p className="text-gray-500">No volume data available</p>
      </div>
    );
  }

  // Format data for charts
  const months = data.monthlyData.map((item: any) => {
    const date = new Date(item.month);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });

  const invoiceCounts = data.monthlyData.map((item: any) => item.invoice_count);
  const totalValues = data.monthlyData.map((item: any) => parseFloat(item.total_value || 0));

  // Chart options
  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Monthly Invoice Volume',
      },
    },
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Monthly Invoice Value',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          }
        }
      }
    }
  };

  // Chart data
  const barData = {
    labels: months,
    datasets: [
      {
        label: 'Invoice Count',
        data: invoiceCounts,
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };

  const lineData = {
    labels: months,
    datasets: [
      {
        label: 'Total Value',
        data: totalValues,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.1,
      },
    ],
  };

  // Status breakdown data
  const statusLabels = data.statusBreakdown.map((item: any) => item.status);
  const statusCounts = data.statusBreakdown.map((item: any) => item.count);
  
  const statusData = {
    labels: statusLabels,
    datasets: [
      {
        label: 'Status Count',
        data: statusCounts,
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
        ],
      },
    ],
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <Bar options={barOptions} data={barData} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <Line options={lineOptions} data={lineData} />
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Invoice Status Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.statusBreakdown.map((item: any, index: number) => (
            <div key={index} className="border rounded-md p-4 text-center">
              <div className="text-lg font-bold">{item.count}</div>
              <div className="text-sm text-gray-500">{item.status}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Summary Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-md p-4 text-center">
            <div className="text-lg font-bold">{data.totalInvoices}</div>
            <div className="text-sm text-gray-500">Total Invoices</div>
          </div>
          <div className="border rounded-md p-4 text-center">
            <div className="text-lg font-bold">{data.totalInvoiceLines}</div>
            <div className="text-sm text-gray-500">Total Invoice Lines</div>
          </div>
          <div className="border rounded-md p-4 text-center">
            <div className="text-lg font-bold">{data.averageLinesPerInvoice}</div>
            <div className="text-sm text-gray-500">Avg. Lines Per Invoice</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VolumeChart;