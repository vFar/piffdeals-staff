import { Navigate } from 'react-router-dom';
import { useUserRole } from '../hooks/useUserRole';
import { Spin } from 'antd';

/**
 * Role-based protected route component
 * @param {React.ReactNode} children - Child components to render if authorized
 * @param {string[]} allowedRoles - Array of roles that can access this route
 * @param {string} redirectTo - Path to redirect if unauthorized (default: '/dashboard')
 */
const RoleRoute = ({ children, allowedRoles = [], redirectTo = '/dashboard' }) => {
  const { userProfile, loading } = useUserRole();

  // Show loading spinner while checking role
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#EBF3FF'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  // Check if user has required role
  if (!userProfile || !allowedRoles.includes(userProfile.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check if user is active
  if (userProfile.status !== 'active') {
    return <Navigate to="/account-suspended" replace />;
  }

  return children;
};

export default RoleRoute;

