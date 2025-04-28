'use client'

import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function ClassifyPage() {
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
          <h1 className="text-2xl font-bold mb-6">HS Classification</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Classification Status</h3>
                <span className="bg-green-900/30 text-green-500 px-2 py-1 rounded-full text-xs font-semibold">Active</span>
              </div>
              <div className="text-3xl font-bold mb-2 text-white">986</div>
              <div className="text-sm text-gray-400">Items classified</div>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Confidence Score</h3>
                <span className="bg-blue-900/30 text-blue-500 px-2 py-1 rounded-full text-xs font-semibold">94.8%</span>
              </div>
              <div className="h-5 bg-gray-800 rounded-full mb-2">
                <div className="h-5 bg-gradient-to-r from-blue-700 to-teal-500 rounded-full" style={{ width: '94.8%' }}></div>
              </div>
              <div className="text-sm text-gray-400">Average confidence rating</div>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-5 border border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Pending Reviews</h3>
                <span className="bg-amber-900/30 text-amber-500 px-2 py-1 rounded-full text-xs font-semibold">12</span>
              </div>
              <div className="text-3xl font-bold mb-2 text-white">12</div>
              <div className="text-sm text-gray-400">Items requiring review</div>
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-4">Automated HS Classification</h2>
            <p className="text-gray-400 mb-6">
              Enter item descriptions below to receive automated HS code classifications with confidence scores.
              Items with confidence scores below 90% will be highlighted for manual review.
            </p>
            
            <div className="flex mb-4 gap-2">
              <input 
                type="text" 
                className="flex-grow bg-gray-800 border border-gray-700 rounded-md p-3 text-gray-300 text-sm"
                placeholder="Enter item description for classification..."
              />
              <button className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-md text-sm font-medium">
                Classify
              </button>
            </div>
            
            <div className="mt-8">
              <h3 className="text-md font-semibold mb-4">Classification Results</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Item Description
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        HS Code
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Confidence
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 bg-gray-900">
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                        Wooden furniture for bedroom (oak)
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                        9403.50.00
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-green-500 font-medium">98.2%</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="bg-green-900/30 text-green-500 px-2 py-1 rounded-full text-xs font-semibold">
                          Approved
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                        Laptop computer with touchscreen
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                        8471.30.00
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-green-500 font-medium">96.5%</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="bg-green-900/30 text-green-500 px-2 py-1 rounded-full text-xs font-semibold">
                          Approved
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                        Metal parts for construction equipment
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                        7326.90.86
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-amber-500 font-medium">84.7%</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="bg-amber-900/30 text-amber-500 px-2 py-1 rounded-full text-xs font-semibold">
                          Review Needed
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
