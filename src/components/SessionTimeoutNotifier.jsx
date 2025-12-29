import { useEffect, useRef, useState } from 'react';
import { Modal } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

// Session timeout configuration
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * SessionTimeoutNotifier Component
 * Handles session timeout with a modal dialog
 */
const SessionTimeoutNotifier = () => {
  const { currentUser, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const inactivityTimerRef = useRef(null);
  const currentUserRef = useRef(null);
  const timeoutTriggeredRef = useRef(false); // Track if timeout was triggered
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Update ref when currentUser changes
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    // Only track inactivity when user is logged in (any role)
    // Don't close modal if timeout was already triggered
    if (!currentUser && !timeoutTriggeredRef.current) {
      // Clear timers if user logs out (but not if timeout modal is showing)
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      setIsModalOpen(false);
      return;
    }
    
    // If user is null but timeout was triggered, keep modal open
    if (!currentUser && timeoutTriggeredRef.current) {
      return;
    }
    
    // Reset timeout flag and close modal when user logs in (fresh session)
    // This ensures clean state after re-login following a timeout
    if (currentUser && timeoutTriggeredRef.current) {
      timeoutTriggeredRef.current = false;
      setIsModalOpen(false);
      // Clear any existing timers to start fresh
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    }

    // Reset inactivity timer function
    const resetInactivityTimer = () => {
      // Clear existing timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }

      // Set logout timer (15 seconds of inactivity)
      inactivityTimerRef.current = setTimeout(async () => {
        // Check if user is still logged in using ref (avoids stale closure)
        if (!currentUserRef.current) return;
        
        // Mark timeout as triggered BEFORE signOut (so modal stays open)
        timeoutTriggeredRef.current = true;
        
        // Show modal first
        setIsModalOpen(true);
        
        // Sign out after showing modal
        await signOut();
      }, INACTIVITY_TIMEOUT);
    };

    // Activity tracking events - mouse, keyboard, scroll, touch
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'focus',
    ];

    // Add event listeners for user activity
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer, true);
    });

    // Reset timer on route change (viewing pages counts as activity)
    resetInactivityTimer();

    // Cleanup function
    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer, true);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [currentUser, location.pathname, signOut]); // location.pathname triggers on route change

  // Handle modal OK button - ensure session is terminated and redirect to login
  const handleModalOk = async () => {
    // Ensure session is fully terminated
    try {
      await signOut();
    } catch (error) {
      // Even if signOut fails, continue to login page
    }
    
    // Reset timeout flag and close modal
    timeoutTriggeredRef.current = false;
    setIsModalOpen(false);
    
    // Clear any timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    // Navigate to login page
    navigate('/login');
  };

  return (
    <Modal
      open={isModalOpen}
      title="Sesija beigusies"
      onOk={handleModalOk}
      onCancel={handleModalOk}
      cancelButtonProps={{ style: { display: 'none' } }}
      okText="Pieslēgties"
      closable={false}
      maskClosable={false}
      centered
    >
      <p>Sesija beigusies. Lūdzu, pieslēdzieties, lai turpinātu.</p>
    </Modal>
  );
};

export default SessionTimeoutNotifier;

