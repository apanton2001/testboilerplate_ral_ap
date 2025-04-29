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
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface AccuracyChartProps {
  data: any;
}

const AccuracyChart: React.FC<AccuracyChartProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <p className="text-gray-500">No accuracy data available</p>
      </div>
    );
  }

  // Classification method breakdown
  const classificationMethodData = {
    labels: ['Auto-Classified', 'Manual Classification'],
    datasets: [
      {
        data: [data.autoClassified, data.manualClassified],
        backgroundColor: [
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 99, 132, 0.5)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Classification Method Distribution',
      },
    },
  };

  // Frequent changes data
  const frequentChanges = data.frequentChanges || [];
  const frequentChangesLabels = frequentChanges.slice(0, 10).map((item: any) => 
    `${item.previous_hs_code || 'None'} → ${item.new_hs_code}`
  );
  const frequentChangesCounts = frequentChanges.slice(0, 10).map((item: any) => item.change_count);

  const barOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Most Frequent HS Code Changes',
      },
    },
  };

  const barData = {
    labels: frequentChangesLabels,
    datasets: [
      {
        data: frequentChangesCounts,
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Classification Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-md p-4 text-center">
              <div className="text-lg font-bold">{data.autoClassificationRate}%</div>
              <div className="text-sm text-gray-500">Auto-Classification Rate</div>
            </div>
            <div className="border rounded-md p-4 text-center">
              <div className="text-lg font-bold">{data.manualOverrideRate}%</div>
              <div className="text-sm text-gray-500">Manual Override Rate</div>
            </div>
            <div className="border rounded-md p-4 text-center">
              <div className="text-lg font-bold">{data.flaggedRate}%</div>
              <div className="text-sm text-gray-500">Flagged Rate</div>
            </div>
            <div className="border rounded-md p-4 text-center">
              <div className="text-lg font-bold">{data.classificationChanges}</div>
              <div className="text-sm text-gray-500">Total Changes</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md">
          <Doughnut options={doughnutOptions} data={classificationMethodData} />
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-md">
        <Bar options={barOptions} data={barData} height={300} />
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Classification Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-md p-4 text-center">
            <div className="text-lg font-bold">{data.totalClassifications}</div>
            <div className="text-sm text-gray-500">Total Classifications</div>
          </div>
          <div className="border rounded-md p-4 text-center">
            <div className="text-lg font-bold">{data.autoClassified}</div>
            <div className="text-sm text-gray-500">Auto-Classified</div>
          </div>
          <div className="border rounded-md p-4 text-center">
            <div className="text-lg font-bold">{data.flaggedItems}</div>
            <div className="text-sm text-gray-500">Flagged Items</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccuracyChart;