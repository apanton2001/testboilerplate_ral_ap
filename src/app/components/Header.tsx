/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
/* eslint-enable @typescript-eslint/no-unused-vars */

export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link href="/">
              <div className="flex items-center">
                <Image 
                  src="/next.svg" // Using an existing SVG file in the project
                  alt="Logo"
                  width={80}
                  height={40}
                  className="mr-2"
                />
                <span className="text-xl font-bold">AppName</span>
              </div>
            </Link>
          </div>
          <nav className="flex space-x-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
            <Link href="/settings" className="text-gray-600 hover:text-gray-900">
              Settings
            </Link>
            <Link href="/profile" className="text-gray-600 hover:text-gray-900">
              Profile
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}