import React from 'react';

interface TableRow {
  id: string;
  declarationNumber: string;
  declarationType: string;
  importerName: string;
  hsCode: string;
  status: 'approved' | 'pending' | 'rejected';
  lastUpdated: string;
}

export default function DataTable() {
  // Sample data
  const declarations: TableRow[] = [
    {
      id: '1',
      declarationNumber: 'JM-2025-04568',
      declarationType: 'IM4 - Home Use',
      importerName: 'Kingston Import Co.',
      hsCode: '8471.30.00',
      status: 'approved',
      lastUpdated: '2 hours ago'
    },
    {
      id: '2',
      declarationNumber: 'JM-2025-04570',
      declarationType: 'IM7 - Warehousing',
      importerName: 'Montego Bay Distributors',
      hsCode: '7308.90.00',
      status: 'pending',
      lastUpdated: '3 days ago'
    },
    {
      id: '3',
      declarationNumber: 'JM-2025-04571',
      declarationType: 'EX1 - Permanent Export',
      importerName: 'Blue Mountain Coffee Ltd.',
      hsCode: '0901.11.00',
      status: 'approved',
      lastUpdated: '2 weeks ago'
    },
    {
      id: '4',
      declarationNumber: 'JM-2025-04575',
      declarationType: 'IM5 - Temporary Admission',
      importerName: 'Island Film Productions',
      hsCode: '9007.20.00',
      status: 'rejected',
      lastUpdated: '5 days ago'
    },
    {
      id: '5',
      declarationNumber: 'JM-2025-04580',
      declarationType: 'IM4 - Home Use',
      importerName: 'Ocho Rios Traders',
      hsCode: '8528.72.00',
      status: 'approved',
      lastUpdated: 'Just now'
    },
  ];

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 shadow-lg overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-800 p-4">
        <h2 className="text-lg font-semibold text-white">Recent Declarations</h2>
        <button className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">
          View All
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-800/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Declaration
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                HS Code
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Last Updated
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 bg-gray-900">
            {declarations.map((declaration) => (
              <tr key={declaration.id} className="hover:bg-gray-800/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-700 to-teal-500 flex items-center justify-center text-white font-semibold">
                      {declaration.declarationType.split(' ')[0].replace('-', '')}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-white">{declaration.declarationNumber}</div>
                      <div className="text-xs text-gray-400">{declaration.importerName}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-300">{declaration.declarationType}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-300">{declaration.hsCode}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    declaration.status === 'approved' 
                      ? 'bg-green-900/30 text-green-500' 
                      : declaration.status === 'rejected' 
                        ? 'bg-red-900/30 text-red-500' 
                        : 'bg-blue-900/30 text-blue-500'
                  }`}>
                    {declaration.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {declaration.lastUpdated}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-teal-500 hover:text-teal-400 mr-3">
                    View
                  </button>
                  <button className="text-gray-400 hover:text-white">
                    Export
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex items-center justify-between border-t border-gray-800 px-4 py-3">
        <div className="text-sm text-gray-400">
          Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of <span className="font-medium">28</span> results
        </div>
        <div className="flex items-center space-x-2">
          <button className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1 text-sm text-gray-400 hover:bg-gray-700">
            Previous
          </button>
          <button className="rounded-md border border-gray-700 bg-teal-600 px-3 py-1 text-sm text-white hover:bg-teal-700">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
