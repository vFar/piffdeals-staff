import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { message } from 'antd';
import { auth } from '../config/firebase';
import { getUser, updateLastLogin } from '../services/userService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Create temporary profile immediately to prevent spinner flicker
        const createTempProfile = () => ({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email || 'User',
          role: 'employee',
          status: 'active',
          createdAt: null,
          updatedAt: null,
          createdBy: null,
          _isTemporary: true,
        });
        
        // Create and set temporary profile first to allow immediate access
        const tempProfile = createTempProfile();
        setUserProfile(tempProfile);
        // Set loading to false immediately so dashboard can render
        setLoading(false);
        
        // Get user profile from Firestore (async, don't block)
        try {
          const profile = await getUser(user.uid);
          if (profile) {
            // Check if user is active
            if (profile.status === 'active') {
              setUserProfile(profile);
              // Update last login timestamp (don't wait for it)
              updateLastLogin(user.uid).catch(err => {
                console.warn('Failed to update last login:', err);
              });
            } else {
              // User is inactive or suspended
              console.warn('User account is not active:', user.uid, profile.status);
              setUserProfile(null);
              message.error('Jūsu konts nav aktīvs. Lūdzu, sazinieties ar administratoru.');
              // Sign out inactive users
              await firebaseSignOut(auth);
            }
          } else {
            // User document doesn't exist in Firestore
            // Keep the temporary profile we already set
            console.warn('User profile not found in Firestore for:', user.uid);
            console.warn('Using temporary profile. Please create a user document in Firestore.');
            console.warn('See CREATE_USER.md for instructions.');
          }
        } catch (error) {
          // Handle Firestore errors (network issues, blocked requests, etc.)
          console.error('Error fetching user profile:', error);
          
          // Check if it's an offline/blocked error - Firestore might be blocked by ad blocker
          const isOfflineError = error.code === 'unavailable' || 
                                 error.code === 'failed-precondition' ||
                                 error.message?.includes('offline') || 
                                 error.message?.includes('Failed to get document') ||
                                 error.message?.includes('network') ||
                                 error.message?.includes('ERR_BLOCKED_BY_CLIENT');
          
          if (isOfflineError) {
            console.warn('Firestore appears to be offline or blocked. Using temporary profile.');
            console.warn('If you have an ad blocker, please whitelist this site or disable it for Firestore to work properly.');
            
            // Keep the temporary profile we already set
            // Don't show warning message on every refresh to avoid spam
          }
          
          // Keep the temporary profile we already set
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    // Helper functions
    isAuthenticated: !!currentUser,
    userRole: userProfile?.role || null,
    userStatus: userProfile?.status || null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

