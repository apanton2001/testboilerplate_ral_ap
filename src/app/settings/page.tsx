'use client'

import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function SettingsPage() {
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
          <h1 className="text-2xl font-bold mb-6">Settings</h1>
          
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">User Profile</h2>
              <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                Save Changes
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-300 text-sm"
                  defaultValue="Customs Admin"
                  placeholder="Enter your full name"
                  aria-label="Full Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                <input
                  type="email"
                  className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-300 text-sm"
                  defaultValue="admin@jamaicacustoms.gov.jm"
                  placeholder="Enter your email address"
                  aria-label="Email Address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Job Title</label>
                <input
                  type="text"
                  className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-300 text-sm"
                  defaultValue="Tariff Officer"
                  placeholder="Enter your job title"
                  aria-label="Job Title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Department</label>
                <select 
                  className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-300 text-sm"
                  aria-label="Department"
                >
                  <option>Customs Administration</option>
                  <option>Tariff & Classification</option>
                  <option>Valuation</option>
                  <option>Enforcement</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">API Connections</h2>
              <p className="text-gray-400 mb-4">
                Configure API keys and connections for integration with external services.
              </p>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-300">ASYCUDA Web Services</label>
                    <span className="bg-green-900/30 text-green-500 px-2 py-1 rounded-full text-xs font-semibold">
                      Connected
                    </span>
                  </div>
                  <input
                    type="password"
                    className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-300 text-sm"
                    defaultValue="••••••••••••••••"
                    aria-label="ASYCUDA Web Services API Key"
                    placeholder="Enter API key"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-300">ContextGem Classification API</label>
                    <span className="bg-green-900/30 text-green-500 px-2 py-1 rounded-full text-xs font-semibold">
                      Connected
                    </span>
                  </div>
                  <input
                    type="password"
                    className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-300 text-sm"
                    defaultValue="••••••••••••••••"
                    aria-label="ContextGem Classification API Key"
                    placeholder="Enter API key"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-300">Document OCR Service</label>
                    <span className="bg-green-900/30 text-green-500 px-2 py-1 rounded-full text-xs font-semibold">
                      Connected
                    </span>
                  </div>
                  <input
                    type="password"
                    className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-300 text-sm"
                    defaultValue="••••••••••••••••"
                    aria-label="Document OCR Service API Key"
                    placeholder="Enter API key"
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4">System Preferences</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-300">Enable dark mode</span>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-300">Auto-classify on document upload</span>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-300">Enable email notifications</span>
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Default Export Format</label>
                  <select 
                    className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-300 text-sm"
                    aria-label="Default Export Format"
                  >
                    <option>PDF (SAD)</option>
                    <option>XML (ASYCUDA)</option>
                    <option>CSV</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
