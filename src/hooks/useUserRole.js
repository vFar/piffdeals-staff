import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook for managing user roles and permissions
 * OPTIMIZED: Uses AuthContext userProfile directly to avoid duplicate fetches
 * @returns {Object} User profile, role checks, and status
 */
export const useUserRole = () => {
  const { userProfile, loading } = useAuth();

  /**
   * Check if user has a specific role
   * @param {string} role - Role to check ('employee', 'admin', 'super_admin')
   * @returns {boolean}
   */
  const hasRole = useMemo(() => (role) => userProfile?.role === role, [userProfile?.role]);

  /**
   * Check if user has any of the specified roles
   * @param {string[]} roles - Array of roles to check
   * @returns {boolean}
   */
  const hasAnyRole = useMemo(() => (roles) => roles.includes(userProfile?.role), [userProfile?.role]);

  /**
   * Check if user is admin or super_admin
   * @returns {boolean}
   */
  const isAdmin = useMemo(() => ['admin', 'super_admin'].includes(userProfile?.role), [userProfile?.role]);

  /**
   * Check if user is super_admin
   * @returns {boolean}
   */
  const isSuperAdmin = useMemo(() => userProfile?.role === 'super_admin', [userProfile?.role]);

  /**
   * Check if user is employee
   * @returns {boolean}
   */
  const isEmployee = useMemo(() => userProfile?.role === 'employee', [userProfile?.role]);

  /**
   * Check if user status is active
   * @returns {boolean}
   */
  const isActive = useMemo(() => userProfile?.status === 'active', [userProfile?.status]);

  /**
   * Check if user status is inactive
   * @returns {boolean}
   */
  const isInactive = useMemo(() => userProfile?.status === 'inactive', [userProfile?.status]);

  /**
   * Check if user status is suspended
   * @returns {boolean}
   */
  const isSuspended = useMemo(() => userProfile?.status === 'suspended', [userProfile?.status]);

  return useMemo(() => ({
    // Profile data
    userProfile,
    loading,

    // Role checks
    hasRole,
    hasAnyRole,
    isAdmin,
    isSuperAdmin,
    isEmployee,

    // Status checks
    isActive,
    isInactive,
    isSuspended,

    // Direct access
    role: userProfile?.role,
    status: userProfile?.status,
    username: userProfile?.username,
    fullName: userProfile?.full_name,
    email: userProfile?.email,
  }), [
    userProfile,
    loading,
    hasRole,
    hasAnyRole,
    isAdmin,
    isSuperAdmin,
    isEmployee,
    isActive,
    isInactive,
    isSuspended,
  ]);
};

