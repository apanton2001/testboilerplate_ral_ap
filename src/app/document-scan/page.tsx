'use client'

import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function DocumentScanPage() {
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
          <h1 className="text-2xl font-bold mb-6">Document Scan</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">Upload Document</h2>
              <p className="text-gray-400 mb-6">
                Upload invoices, packing lists, or other customs documents for automatic data extraction and classification.
                Supported formats: PDF, JPG, PNG.
              </p>
              
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
                <div className="mx-auto mb-4">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto text-teal-500">
                    <path d="M4 4H10V10H4V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 4H20V10H14V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4 14H10V20H4V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17 14V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-300 mb-1">Drag and drop your document here</p>
                <p className="text-xs text-gray-500 mb-4">or</p>
                <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                  Select Document
                </button>
              </div>
              
              <div className="mt-6">
                <div className="flex items-center mb-4">
                  <input 
                    id="use-ocr" 
                    type="checkbox" 
                    className="w-4 h-4 text-teal-600 bg-gray-700 border-gray-600 rounded focus:ring-teal-500" 
                    defaultChecked 
                  />
                  <label htmlFor="use-ocr" className="ml-2 text-sm font-medium text-gray-300">
                    Use OCR for text extraction
                  </label>
                </div>
                <div className="flex items-center">
                  <input 
                    id="auto-classify" 
                    type="checkbox" 
                    className="w-4 h-4 text-teal-600 bg-gray-700 border-gray-600 rounded focus:ring-teal-500" 
                    defaultChecked 
                  />
                  <label htmlFor="auto-classify" className="ml-2 text-sm font-medium text-gray-300">
                    Auto-classify extracted items
                  </label>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">Document Preview</h2>
              <div className="h-64 bg-gray-800 rounded-lg flex items-center justify-center mb-4">
                <p className="text-gray-500 text-sm">No document uploaded</p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4 h-48 overflow-y-auto">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Extracted Data</h3>
                <p className="text-xs text-gray-500">Upload a document to extract data</p>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button className="bg-gray-800 text-gray-400 px-4 py-2 rounded-md text-sm font-medium mr-2" disabled>
                  Edit Data
                </button>
                <button className="bg-gray-800 text-gray-400 px-4 py-2 rounded-md text-sm font-medium" disabled>
                  Process
                </button>
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 lg:col-span-2">
              <h2 className="text-lg font-semibold mb-4">Recent Scans</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Document
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Items
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Scanned
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 bg-gray-900">
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                        Invoice-2025-042.pdf
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                        Commercial Invoice
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                        12
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="bg-green-900/30 text-green-500 px-2 py-1 rounded-full text-xs font-semibold">
                          Processed
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                        2 hours ago
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-teal-500 hover:text-teal-400">
                          View
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                        PackingList-0428.pdf
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                        Packing List
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                        8
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="bg-green-900/30 text-green-500 px-2 py-1 rounded-full text-xs font-semibold">
                          Processed
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                        Yesterday
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-teal-500 hover:text-teal-400">
                          View
                        </button>
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
