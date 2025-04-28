'use client'

import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function DataImportPage() {
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
          <h1 className="text-2xl font-bold mb-6">Data Import</h1>
          
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Import Customs Data</h2>
              <p className="text-gray-400 mb-4">
                Upload your CSV, XLSX or XML files to process customs data for automated classification and declaration.
              </p>
              
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
                <div className="mx-auto mb-4">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto text-teal-500">
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-300 mb-1">Drag and drop your files here</p>
                <p className="text-xs text-gray-500 mb-4">or</p>
                <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                  Select Files
                </button>
              </div>
            </div>
            
            <div className="mt-8">
              <h3 className="text-md font-semibold mb-3">Paste Data</h3>
              <p className="text-gray-400 text-sm mb-3">
                You can also paste data directly from your clipboard.
              </p>
              <textarea 
                className="w-full h-32 bg-gray-800 border border-gray-700 rounded-md p-3 text-gray-300 text-sm"
                placeholder="Paste CSV or tabular data here..."
              ></textarea>
              <div className="mt-4 flex justify-end">
                <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                  Process Data
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
