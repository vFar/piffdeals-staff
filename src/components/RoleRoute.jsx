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
  const { userProfile, loading, isAdmin, isSuperAdmin, isActive } = useUserRole();

  // Debug logging
  console.log('RoleRoute check:', {
    hasProfile: !!userProfile,
    profileRole: userProfile?.role,
    allowedRoles,
    isAdmin,
    isSuperAdmin,
    isActive,
    loading,
  });

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

  // Check if user profile exists
  if (!userProfile) {
    console.warn('RoleRoute: No user profile found');
    return <Navigate to={redirectTo} replace />;
  }

  // Check role access using helper functions (more reliable than string comparison)
  let hasAccess = false;
  if (allowedRoles.includes('admin') || allowedRoles.includes('super_admin')) {
    // If route allows admin or super_admin, check using isAdmin helper
    hasAccess = isAdmin;
  } else if (allowedRoles.includes('super_admin')) {
    // If route only allows super_admin
    hasAccess = isSuperAdmin;
  } else {
    // For other roles, check directly
    hasAccess = allowedRoles.includes(userProfile.role);
  }

  if (!hasAccess) {
    console.warn('RoleRoute: Access denied', {
      profileRole: userProfile.role,
      allowedRoles,
      isAdmin,
      isSuperAdmin,
    });
    return <Navigate to={redirectTo} replace />;
  }

  // Check if user is active - allow inactive users to access (they can't login anyway)
  // Only block suspended users
  if (userProfile.status === 'suspended') {
    console.warn('RoleRoute: User suspended', { status: userProfile.status });
    return <Navigate to="/account-suspended" replace />;
  }

  // Note: inactive users are handled by ProtectedRoute (they get signed out)
  // So if we reach here, user is either active or inactive (but will be signed out)
  // We allow access here and let ProtectedRoute handle the sign out

  console.log('RoleRoute: Access granted');
  return children;
};

export default RoleRoute;

