import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserRole } from '../hooks/useUserRole';
import { supabase } from '../lib/supabase';
import { Spin, message } from 'antd';

/**
 * Protected Route Component
 * Redirects to /login if user is not authenticated with Supabase
 * Also checks user status and signs out inactive/suspended users
 */
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading, userProfile } = useAuth();
  const { userProfile: roleProfile, loading: roleLoading } = useUserRole();

  // Use profile from either source
  const profile = userProfile || roleProfile;
  const isLoading = loading || roleLoading;

  // Check user status and sign out if inactive or suspended
  useEffect(() => {
    const checkUserStatus = async () => {
      if (currentUser && profile) {
        if (profile.status === 'suspended' || profile.status === 'inactive') {
          // Sign out inactive/suspended users
          await supabase.auth.signOut();
          const statusMsg = profile.status === 'suspended' 
            ? 'Konts bloķēts. Sazinies ar priekšniecību!'
            : 'Konts nav aktīvs. Sazinies ar priekšniecību!';
          message.error(statusMsg);
        }
      }
    };

    checkUserStatus();
  }, [currentUser, profile]);

  // Show loading spinner while checking authentication
  if (isLoading) {
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

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If user is inactive or suspended, they will be signed out by useEffect above
  // Show loading while sign out is in progress
  if (profile && (profile.status === 'suspended' || profile.status === 'inactive')) {
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

  return children;
};

export default ProtectedRoute;
