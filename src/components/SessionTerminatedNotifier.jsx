import { useEffect, useState } from 'react';
import { Modal } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * SessionTerminatedNotifier Component
 * Detects when user's session has been terminated (logged in from another device)
 * and shows a modal notification
 */
const SessionTerminatedNotifier = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wasLoggedIn, setWasLoggedIn] = useState(false);

  useEffect(() => {
    // Track if user was logged in
    if (currentUser) {
      setWasLoggedIn(true);
    } else if (wasLoggedIn && !currentUser) {
      // User was logged in but now is not - check if it was due to session termination
      const sessionId = localStorage.getItem('session_id');
      
      // If session_id exists but user is null, it means session was terminated
      // (not a normal logout, which clears localStorage)
      if (sessionId) {
        setIsModalOpen(true);
        // Clear the session_id
        localStorage.removeItem('session_id');
      }
      
      setWasLoggedIn(false);
    }
  }, [currentUser, wasLoggedIn]);

  // Listen for auth state changes to detect forced sign-outs
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // If we get a SIGNED_OUT event but didn't initiate it, show modal
      if (event === 'SIGNED_OUT' && wasLoggedIn) {
        const sessionId = localStorage.getItem('session_id');
        if (sessionId) {
          setIsModalOpen(true);
          localStorage.removeItem('session_id');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [wasLoggedIn]);

  const handleModalOk = () => {
    setIsModalOpen(false);
    navigate('/login');
  };

  return (
    <Modal
      open={isModalOpen}
      title="Sesija pārtraukta"
      onOk={handleModalOk}
      onCancel={handleModalOk}
      cancelButtonProps={{ style: { display: 'none' } }}
      okText="Pieslēgties"
      closable={false}
      maskClosable={false}
      centered
    >
      <p>
        Jūsu sesija tika pārtraukta, jo pieteicāties no citas ierīces vai pārlūkprogrammas.
        Sistēmā var būt aktīva tikai viena sesija vienlaicīgi.
      </p>
      <p>
        Lūdzu, pieslēdzieties, lai turpinātu.
      </p>
    </Modal>
  );
};

export default SessionTerminatedNotifier;

