import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="fixed right-0 top-0 z-30 w-[calc(100%-16rem)] flex h-16 items-center justify-between border-b border-gray-800 bg-gray-900 px-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold text-white">ASYCUDA Autofill Dashboard</h1>
        <div className="ml-6 flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500"></span>
          <span className="text-sm text-gray-400">Live Data</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative rounded-full bg-gray-800 p-1 text-gray-400 hover:bg-gray-700">
          <span className="sr-only">Notifications</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-teal-500 text-xs font-semibold text-white flex items-center justify-center">3</span>
        </button>
        
        <div className="h-6 w-px bg-gray-700"></div>
        
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-700 to-teal-500 flex items-center justify-center text-white font-semibold">
            CA
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-white">Customs Admin</div>
            <div className="text-xs text-gray-400">Tariff Officer</div>
          </div>
        </div>
      </div>
    </header>
  );
}
