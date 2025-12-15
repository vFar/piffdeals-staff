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
   * Sign out
   */
  const signOut = useCallback(async () => {
    try {
      // Use local scope to avoid 403 errors with proxy
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.error('Sign out error:', error);
        // Even if there's an error, clear local state
      }
    } catch (err) {
      console.error('Sign out exception:', err);
      // Continue with local cleanup even if API call fails
    } finally {
      // Always clear local state
      setUserProfile(null);
      setCurrentUser(null);
      // Clear local storage
      localStorage.clear();
      sessionStorage.clear();
    }
  }, []);

  /**
   * Sign in with email and password (via rate-limited Edge Function)
   */
  const signIn = async (email, password) => {
    // Get Supabase URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Missing Supabase URL');
    }

    // In development, route through proxy to avoid CORS issues
    const isDev = import.meta.env.DEV;
    const baseUrl = isDev 
      ? `${window.location.origin}/supabase-api`
      : supabaseUrl;

    // Call rate-limited login Edge Function
    const response = await fetch(`${baseUrl}/functions/v1/rate-limited-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    // Handle blocked response
    if (response.status === 429 || result.error === 'BLOCKED') {
      const error = new Error(result.message || 'Bloķēts, mēģiniet vēlāk pēc 15 minūtēm!');
      error.status = 429;
      error.blocked_until = result.blocked_until;
      error.minutes_remaining = result.minutes_remaining;
      throw error;
    }

    // Handle other errors
    if (!response.ok || !result.success) {
      const error = new Error(result.error || 'Login failed');
      error.status = response.status;
      throw error;
    }

    // Set session manually since we're using Edge Function
    if (result.session) {
      await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });
    }

    // Profile will be fetched by auth state change listener
    return { user: result.user, session: result.session };
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
