import React from 'react';
import { useSession } from 'next-auth/react';
import ProtectedRoute from '../../components/ProtectedRoute';
import AnalyticsDashboard from '../../components/analytics/Dashboard';

const ReportsPage: React.FC = () => {
  const { data: session } = useSession();

  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <div className="container mx-auto px-4 py-8">
        <AnalyticsDashboard />
      </div>
    </ProtectedRoute>
  );
};

export default ReportsPage;