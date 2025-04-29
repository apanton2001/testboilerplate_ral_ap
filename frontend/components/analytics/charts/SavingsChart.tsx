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

interface SavingsChartProps {
  data: any;
  brokerFeePerEntry?: number;
  hourlyRate?: number;
}

const SavingsChart: React.FC<SavingsChartProps> = ({ 
  data,
  brokerFeePerEntry = 150,
  hourlyRate = 75
}) => {
  if (!data || !data.monthlyBreakdown || data.monthlyBreakdown.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <p className="text-gray-500">No savings data available</p>
      </div>
    );
  }

  // Format data for charts
  const months = data.monthlyBreakdown.map((item: any) => {
    const date = new Date(item.month);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });

  const brokerSavings = data.monthlyBreakdown.map((item: any) => item.brokerFeeSavings);
  const laborSavings = data.monthlyBreakdown.map((item: any) => item.laborCostSavings);
  const totalSavings = data.monthlyBreakdown.map((item: any) => item.totalSavings);

  // Chart options
  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Monthly Cost Savings Breakdown',
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          }
        }
      }
    }
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Cumulative Savings Over Time',
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

  // Calculate cumulative savings
  const cumulativeSavings = [];
  let runningTotal = 0;
  for (const item of totalSavings) {
    runningTotal += item;
    cumulativeSavings.push(runningTotal);
  }

  // Chart data
  const barData = {
    labels: months,
    datasets: [
      {
        label: 'Broker Fee Savings',
        data: brokerSavings,
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      {
        label: 'Labor Cost Savings',
        data: laborSavings,
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  };

  const lineData = {
    labels: months,
    datasets: [
      {
        label: 'Cumulative Savings',
        data: cumulativeSavings,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1,
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
        <h3 className="text-lg font-semibold mb-4">Savings Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-md p-4 text-center">
            <div className="text-lg font-bold">${data.brokerFeeSavings.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Broker Fee Savings</div>
            <div className="text-xs text-gray-400 mt-1">Based on ${brokerFeePerEntry}/entry</div>
          </div>
          <div className="border rounded-md p-4 text-center">
            <div className="text-lg font-bold">${data.laborCostSavings.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Labor Cost Savings</div>
            <div className="text-xs text-gray-400 mt-1">Based on ${hourlyRate}/hour</div>
          </div>
          <div className="border rounded-md p-4 text-center">
            <div className="text-lg font-bold">${data.totalSavings.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Total Savings</div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Time Savings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-md p-4 text-center">
            <div className="text-lg font-bold">{data.timeMinutesSaved.toLocaleString()} minutes</div>
            <div className="text-sm text-gray-500">Total Time Saved</div>
          </div>
          <div className="border rounded-md p-4 text-center">
            <div className="text-lg font-bold">{data.timeHoursSaved.toFixed(1)} hours</div>
            <div className="text-sm text-gray-500">Total Hours Saved</div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Processing Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-md p-4 text-center">
            <div className="text-lg font-bold">{data.totalSubmissions}</div>
            <div className="text-sm text-gray-500">Total Submissions</div>
          </div>
          <div className="border rounded-md p-4 text-center">
            <div className="text-lg font-bold">{data.totalLines}</div>
            <div className="text-sm text-gray-500">Total Lines Processed</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavingsChart;