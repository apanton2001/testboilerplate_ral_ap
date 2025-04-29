import { NextPage } from 'next';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import Navbar from '../components/Navbar';
import ProtectedRoute from '../components/ProtectedRoute';

const Admin: NextPage = () => {
  const { data: session } = useSession();

  return (
    <ProtectedRoute requiredRoles={['Admin']}>
      <div className="min-h-screen bg-gray-100">
        <Head>
          <title>Admin | Automated Customs Documentation Platform</title>
        </Head>

        <Navbar />

        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-center mb-8">
            Admin Dashboard
          </h1>
          
          <div className="bg-white shadow-md rounded-lg p-6 max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">System Administration</h2>
              <p className="text-gray-600">
                Welcome to the admin dashboard. Here you can manage users, roles, and system settings.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="font-medium text-blue-800 mb-2">User Management</h3>
                <p className="text-sm text-gray-600">Manage user accounts and permissions.</p>
                <button className="mt-3 text-sm text-blue-600 hover:text-blue-800">
                  View All Users
                </button>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <h3 className="font-medium text-green-800 mb-2">Role Management</h3>
                <p className="text-sm text-gray-600">Configure roles and permissions.</p>
                <button className="mt-3 text-sm text-green-600 hover:text-green-800">
                  Manage Roles
                </button>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <h3 className="font-medium text-purple-800 mb-2">System Logs</h3>
                <p className="text-sm text-gray-600">View system activity and audit logs.</p>
                <button className="mt-3 text-sm text-purple-600 hover:text-purple-800">
                  View Logs
                </button>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                <h3 className="font-medium text-yellow-800 mb-2">System Settings</h3>
                <p className="text-sm text-gray-600">Configure global system settings.</p>
                <button className="mt-3 text-sm text-yellow-600 hover:text-yellow-800">
                  Edit Settings
                </button>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-red-50 rounded-lg border border-red-100">
              <h3 className="font-medium text-red-800 mb-2">Danger Zone</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Reset system to default settings</p>
                  <p className="text-xs text-red-600 mt-1">This action cannot be undone</p>
                </div>
                <button className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                  Reset System
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Admin;