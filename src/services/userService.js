import { supabase } from '../lib/supabase';

/**
 * Create a new user account
 * 
 * NOTE: This function requires Supabase Admin API access.
 * You have two options:
 * 
 * 1. Use Supabase Edge Function (Recommended):
 *    - Create an edge function at supabase/functions/create-user
 *    - Use service role key in the edge function
 *    - Call the edge function from this service
 * 
 * 2. Use Supabase Admin Client (Server-side only):
 *    - Create a backend API endpoint
 *    - Use service role key to create admin client
 *    - Call your backend API from this service
 * 
 * For now, this function will attempt to use RPC or direct insert,
 * but auth user creation must be handled server-side.
 */
export const createUser = async (userData) => {
  const { email, password, username, role, status } = userData;

  try {
    // Option 1: Call Supabase Edge Function (if available)
    // Uncomment and update the function URL when you create the edge function
    /*
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email,
        password,
        username,
        role,
        status,
      },
    });
    
    if (error) throw error;
    return data;
    */

    // Option 2: Call backend API endpoint (if available)
    // Uncomment and update the API URL when you create the backend endpoint
    /*
    const response = await fetch('/api/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        username,
        role,
        status,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create user');
    }
    
    return await response.json();
    */

    // Option 3: Direct approach (requires admin client setup)
    // This will only work if you have set up admin client access
    // For production, use Option 1 or 2 above
    
    // Create auth user using admin API
    // Note: supabase.auth.admin is not available in client SDK
    // You need to use service role key in a server-side function
    
    // For now, we'll create the profile only and return an error
    // indicating that auth user must be created first
    throw new Error(
      'Lietotāja izveide prasa servera piekļuvi. Lūdzu, iestatiet Supabase Edge Function vai backend API.'
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Create user profile (after auth user is created)
 * This can be called directly from the client
 */
export const createUserProfile = async (userId, profileData, createdBy = null) => {
  const { email, username, role, status } = profileData;

  try {
    // Try using the database function first
    const { data, error: rpcError } = await supabase.rpc('create_user_profile', {
      p_user_id: userId,
      p_email: email,
      p_username: username,
      p_role: role,
      p_status: status,
      p_created_by: createdBy,
    });

    if (!rpcError && data) {
      return data;
    }

    // Fallback to direct insert
    const { data: profile, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email,
        username,
        role,
        status,
        created_by: createdBy,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return profile;
  } catch (error) {
    throw error;
  }
};

/**
 * Send password reset email to a user
 * This function calls the edge function to send a password reset email
 */
export const sendPasswordResetEmail = async (userEmail, userName) => {
  try {
    // Use EXACT same pattern as create-user which works
    // Direct URL, no proxy, no apikey header
    const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-password-reset-email`;
    
    // Get the current session to pass auth token
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        userEmail,
        userName,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return result;
    } else {
      // Handle errors - same pattern as create-user
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, try to get text
        const text = await response.text().catch(() => '');
        errorData = { error: text || 'Unknown error' };
      }
      
      // Check if it's a cooldown error (429 status)
      if (response.status === 429) {
        const customError = new Error(errorData.message || 'Please wait before sending another email');
        customError.status = 429;
        customError.context = errorData;
        throw customError;
      }
      
      // Handle other errors
      const error = new Error(errorData.message || errorData.error || 'Failed to send password reset email');
      error.status = response.status;
      throw error;
    }

    if (response.ok) {
      const result = await response.json();
      return result;
    } else {
      // Handle errors - same pattern as create-user
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, try to get text
        const text = await response.text().catch(() => '');
        errorData = { error: text || 'Unknown error' };
      }
      
      // Check if it's a cooldown error (429 status)
      if (response.status === 429) {
        const customError = new Error(errorData.message || 'Please wait before sending another email');
        customError.status = 429;
        customError.context = errorData;
        throw customError;
      }
      
      // Handle other errors
      const error = new Error(errorData.message || errorData.error || 'Failed to send password reset email');
      error.status = response.status;
      throw error;
    }
  } catch (error) {
    // Re-throw with more context if it's a network error
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkError = new Error('Tīkla kļūda. Pārbaudiet interneta savienojumu vai Supabase pieejamību.');
      networkError.originalError = error;
      throw networkError;
    }
    throw error;
  }
};



