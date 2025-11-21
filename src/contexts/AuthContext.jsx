import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, db } from '../lib/supabase';

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from user_profiles table
  const fetchUserProfile = useCallback(async (userId) => {
    if (!userId) {
      setUserProfile(null);
      return;
    }

    try {
      // Use supabase directly to get better error handling
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        setUserProfile(null);
        return;
      }
      
      if (profile) {
        setUserProfile(profile);
        
        // Update last_login timestamp only if profile exists
        try {
          await supabase
            .from('user_profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', userId);
        } catch (updateError) {
          // Silently fail if update fails (not critical)
        }
      } else {
        setUserProfile(null);
      }
    } catch (error) {
      setUserProfile(null);
    }
  }, []);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setCurrentUser(session?.user ?? null);
      
      // Set loading to false immediately - don't wait for profile
      setLoading(false);
      
      // Fetch profile in background (non-blocking)
      if (session?.user) {
        // Use setTimeout to make it truly non-blocking
        setTimeout(() => {
          fetchUserProfile(session.user.id).catch(() => {
            // Error fetching profile in auth state change
          });
        }, 0);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  /**
   * Sign in with email and password
   */
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      throw error;
    }
    
    // Profile will be fetched by auth state change listener
    // Don't fetch here to avoid blocking
    
    return data;
  };

  /**
   * Sign up with email and password
   */
  const signUp = async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    
    if (error) throw error;
    return data;
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUserProfile(null);
  };

  /**
   * Reset password request
   */
  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) throw error;
  };

  /**
   * Update user password
   */
  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) throw error;
  };

  /**
   * Update user metadata
   */
  const updateUserMetadata = async (metadata) => {
    const { error } = await supabase.auth.updateUser({
      data: metadata,
    });
    
    if (error) throw error;
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateUserMetadata,
    refreshProfile: () => currentUser && fetchUserProfile(currentUser.id),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
