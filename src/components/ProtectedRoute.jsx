import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canAccessPage } from '../utils/rbac';
import { Spin } from 'antd';

const ProtectedRoute = ({ children, requirePage }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      if (requirePage && userProfile) {
        const userRole = userProfile.role;
        if (!canAccessPage(userRole, requirePage)) {
          navigate('/dashboard');
        }
      }
    }
  }, [currentUser, userProfile, loading, navigate, requirePage]);

  if (loading || !currentUser || !userProfile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Spin size="large" tip="Uzgaidiet..." />
      </div>
    );
  }

  if (requirePage && !canAccessPage(userProfile.role, requirePage)) {
    return null;
  }

  return children;
};

export default ProtectedRoute;


