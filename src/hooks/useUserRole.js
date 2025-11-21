import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/supabase';

/**
 * Custom hook for managing user roles and permissions
 * @returns {Object} User profile, role checks, and status
 */
export const useUserRole = () => {
  const { currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true); // Track initial load separately

  useEffect(() => {
    if (currentUser) {
      loadProfile();
    } else {
      setUserProfile(null);
      setLoading(false);
      setInitialLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const loadProfile = async () => {
    // Only show loading on initial load, not on refreshes
    if (initialLoad) {
      setLoading(true);
    }
    
    try {
      const profile = await db.getById('user_profiles', currentUser.id);
      setUserProfile(profile);
      console.log('User profile loaded:', { id: profile?.id, role: profile?.role, status: profile?.status });
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUserProfile(null);
    } finally {
      if (initialLoad) {
        setLoading(false);
        setInitialLoad(false); // Mark initial load as complete
      }
    }
  };

  /**
   * Check if user has a specific role
   * @param {string} role - Role to check ('employee', 'admin', 'super_admin')
   * @returns {boolean}
   */
  const hasRole = (role) => userProfile?.role === role;

  /**
   * Check if user has any of the specified roles
   * @param {string[]} roles - Array of roles to check
   * @returns {boolean}
   */
  const hasAnyRole = (roles) => roles.includes(userProfile?.role);

  /**
   * Check if user is admin or super_admin
   * @returns {boolean}
   */
  const isAdmin = hasAnyRole(['admin', 'super_admin']);

  /**
   * Check if user is super_admin
   * @returns {boolean}
   */
  const isSuperAdmin = hasRole('super_admin');

  /**
   * Check if user is employee
   * @returns {boolean}
   */
  const isEmployee = hasRole('employee');

  /**
   * Check if user status is active
   * @returns {boolean}
   */
  const isActive = userProfile?.status === 'active';

  /**
   * Check if user status is inactive
   * @returns {boolean}
   */
  const isInactive = userProfile?.status === 'inactive';

  /**
   * Check if user status is suspended
   * @returns {boolean}
   */
  const isSuspended = userProfile?.status === 'suspended';

  /**
   * Reload user profile from database
   */
  const refreshProfile = () => {
    if (currentUser) {
      loadProfile();
    }
  };

  return {
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

    // Utilities
    refreshProfile,
  };
};

