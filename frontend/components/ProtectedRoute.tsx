import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

/**
 * Component to protect routes that require authentication
 * Optionally checks for specific roles
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles = [] 
}) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const loading = status === 'loading';

  useEffect(() => {
    // If session is loading, do nothing yet
    if (loading) return;

    // If not authenticated, redirect to login
    if (!session) {
      router.push({
        pathname: '/login',
        query: { callbackUrl: router.asPath },
      });
      return;
    }

    // If roles are required, check if user has any of the required roles
    if (requiredRoles.length > 0) {
      const userRole = session.user.role;
      const hasRequiredRole = requiredRoles.includes(userRole);

      if (!hasRequiredRole) {
        // Redirect to unauthorized page or home
        router.push('/unauthorized');
      }
    }
  }, [loading, session, router, requiredRoles]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not authenticated or doesn't have required role, don't render children
  if (!session || (requiredRoles.length > 0 && !requiredRoles.includes(session.user.role))) {
    return null;
  }

  // If authenticated and has required role, render children
  return <>{children}</>;
};

export default ProtectedRoute;