/* eslint-disable @typescript-eslint/no-unused-vars */
import Image from 'next/image';
import React from 'react';
/* eslint-enable @typescript-eslint/no-unused-vars */

export default function Sidebar() {
  // Using unicode icons as a simpler alternative to SVG files
  const menuItems = [
    { name: 'Dashboard', icon: '📊' },
    { name: 'Analytics', icon: '📈' },
    { name: 'Reports', icon: '📄' },
    { name: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside className="w-64 h-screen bg-gray-800 text-white">
      <div className="p-4">
        <div className="flex items-center justify-center mb-8">
          <Image 
            src="/vercel.svg" // Using an existing SVG file
            alt="Logo" 
            width={40} 
            height={40} 
            className="mr-2" 
          />
          <span className="text-xl font-bold">AppName</span>
        </div>
        <nav>
          <ul>
            {menuItems.map((item, index) => (
              <li key={index} className="mb-2">
                <a 
                  href="#" 
                  className="flex items-center p-2 rounded hover:bg-gray-700"
                >
                  <span className="text-2xl mr-3">{item.icon}</span>
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}