import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  positive?: boolean;
  icon: React.ReactNode;
}

export default function StatCard({ title, value, change, positive = true, icon }: StatCardProps) {
  return (
    <div className="rounded-lg bg-gray-800 p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
          
          {change && (
            <div className="mt-2 flex items-center">
              <span className={`text-xs font-medium ${positive ? 'text-green-500' : 'text-red-500'}`}>
                {positive ? '↑' : '↓'} {change}
              </span>
              <span className="ml-1 text-xs text-gray-400">vs last month</span>
            </div>
          )}
        </div>
        
        <div className="rounded-full bg-gradient-to-br from-blue-900/30 to-teal-600/30 p-3 text-teal-400">
          {icon}
        </div>
      </div>
    </div>
  );
}
