'use client'

import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function ExportPage() {
  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="ml-64 flex flex-1 flex-col">
        {/* Header */}
        <Header />
        
        {/* Main Content */}
        <main className="mt-16 p-6 overflow-y-auto">
          <h1 className="text-2xl font-bold mb-6">Export Forms</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">Single Administrative Document (SAD)</h2>
              <p className="text-gray-400 mb-6">
                Generate a Single Administrative Document (SAD) for your customs declaration.
                This is the standard document required by Jamaica Customs for import and export declarations.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Declaration Type</label>
                  <select 
                    className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-300 text-sm"
                    aria-label="Declaration Type"
                  >
                    <option>IM4 - Home Use</option>
                    <option>IM5 - Temporary Admission</option>
                    <option>IM7 - Warehousing</option>
                    <option>EX1 - Permanent Export</option>
                    <option>EX2 - Temporary Export</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Declaration Number</label>
                  <input
                    type="text"
                    className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-300 text-sm"
                    placeholder="Auto-generated"
                    disabled
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-md text-sm font-medium mr-2">
                  Preview
                </button>
                <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                  Generate PDF
                </button>
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">XML Export for ASYCUDA</h2>
              <p className="text-gray-400 mb-6">
                Generate an XML file compatible with the ASYCUDA World system.
                This can be directly imported into ASYCUDA to auto-fill your declaration forms.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Format Version</label>
                  <select 
                    className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-300 text-sm"
                    aria-label="Format Version"
                  >
                    <option>ASYCUDA World 4.3.2</option>
                    <option>ASYCUDA World 4.2.1</option>
                    <option>Legacy Format</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Include Attachments</label>
                  <div className="flex items-center h-9 mt-1">
                    <input 
                      id="include-attachments" 
                      type="checkbox" 
                      className="w-4 h-4 text-teal-600 bg-gray-700 border-gray-600 rounded focus:ring-teal-500" 
                    />
                    <label htmlFor="include-attachments" className="ml-2 text-sm font-medium text-gray-300">
                      Attach supporting documents
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-md text-sm font-medium mr-2">
                  Validate
                </button>
                <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                  Generate XML
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4">Recent Exports</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Filename
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Declaration
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 bg-gray-900">
                  <tr>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                      JM-2025-04568_SAD.pdf
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      PDF (SAD)
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      JM-2025-04568
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      Today, 14:30
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-teal-500 hover:text-teal-400 mr-3">
                        Download
                      </button>
                      <button className="text-gray-400 hover:text-white">
                        View
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                      JM-2025-04570_ASYCUDA.xml
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      XML (ASYCUDA)
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      JM-2025-04570
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      Yesterday, 09:15
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-teal-500 hover:text-teal-400 mr-3">
                        Download
                      </button>
                      <button className="text-gray-400 hover:text-white">
                        View
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                      JM-2025-04571_SAD.pdf
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      PDF (SAD)
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      JM-2025-04571
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      Apr 25, 2025
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-teal-500 hover:text-teal-400 mr-3">
                        Download
                      </button>
                      <button className="text-gray-400 hover:text-white">
                        View
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
