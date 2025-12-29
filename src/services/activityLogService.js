import { supabase } from '../lib/supabase';

/**
 * Activity Log Service
 * 
 * This service provides functions to log major actions performed in the system.
 * Logs are only accessible by super_admins and are immutable for audit purposes.
 * 
 * Usage:
 *   import { logActivity } from '../services/activityLogService';
 *   
 *   await logActivity({
 *     actionType: 'user_created',
 *     actionCategory: 'user_management',
 *     description: 'Created new user account',
 *     targetType: 'user',
 *     targetId: userId,
 *   });
 */

/**
 * Log an activity
 * 
 * @param {Object} params - Activity log parameters
 * @param {string} params.actionType - Type of action (e.g., 'user_created', 'user_updated', 'invoice_sent')
 * @param {string} params.actionCategory - Category of action ('user_management', 'invoice_management', 'system', 'security')
 * @param {string} params.description - Human-readable description of the action
 * @param {Object} [params.details] - Additional structured data (e.g., { old_value: 'admin', new_value: 'super_admin' })
 * @param {string} [params.targetType] - Type of entity affected ('user', 'invoice', 'system', etc.)
 * @param {string|UUID} [params.targetId] - ID of the affected entity
 * @param {string} [params.ipAddress] - IP address of the user (optional)
 * @param {string} [params.userAgent] - User agent string (optional)
 * @returns {Promise<{success: boolean, logId?: string, error?: Error}>}
 */
export const logActivity = async ({
  actionType,
  actionCategory,
  description,
  details = null,
  targetType = null,
  targetId = null,
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return { success: false, error: new Error('User not authenticated') };
    }

    // Get user agent from browser if not provided
    let finalUserAgent = userAgent;
    if (!finalUserAgent && typeof navigator !== 'undefined') {
      finalUserAgent = navigator.userAgent;
    }

    // Get user profile first (needed for fallback direct insert)
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('username, email, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      // Could not fetch user profile
    }

    // Prepare user data for logging
    const userUsername = userProfile?.username || user.user_metadata?.username || 'Unknown';
    const userEmail = userProfile?.email || user.email || 'unknown@example.com';
    const userRole = userProfile?.role || 'employee';

    // First, try to call the Edge Function which captures IP address from request headers
    // This ensures all activity logs have IP addresses
    const supabaseUrl = supabase.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/log-activity`;
    
    // Get the session token for authentication
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (token && supabaseUrl) {
      try {
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': supabase.supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            actionType,
            actionCategory,
            description,
            details,
            targetType,
            targetId,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            return { success: true, logId: result.logId };
          } else {
            // Fall through to RPC fallback
          }
        } else {
          // Fall through to RPC fallback
        }
      } catch (edgeFunctionError) {
        // Fall through to RPC fallback
      }
    }

    // Fallback: Call the database function directly (for backward compatibility)
    // Note: This won't have IP address in browser context, but Edge Function should work
    const { data, error } = await supabase.rpc('log_activity', {
      p_user_id: user.id,
      p_action_type: actionType,
      p_action_category: actionCategory,
      p_description: description,
      p_details: details ? JSON.stringify(details) : null,
      p_target_type: targetType,
      p_target_id: targetId,
      p_ip_address: ipAddress, // May be null in browser context
      p_user_agent: finalUserAgent,
    });

    if (error) {
      // Always try direct insert as fallback if RPC fails
      try {
        // Explicitly set created_at to current UTC timestamp for consistency
        const now = new Date().toISOString();
        
        const { data: insertData, error: insertError } = await supabase
          .from('activity_logs')
          .insert({
            user_id: user.id,
            user_username: userUsername,
            user_email: userEmail,
            user_role: userRole,
            action_type: actionType,
            action_category: actionCategory,
            description: description,
            details: details,
            target_type: targetType,
            target_id: targetId,
            ip_address: ipAddress,
            user_agent: finalUserAgent,
            created_at: now, // Explicitly set timestamp
          })
          .select('id')
          .single();
        
        if (insertError) {
          // Return the original RPC error, not the insert error
          return { 
            success: false, 
            error: new Error(`Failed to log activity: ${error.message || 'Unknown error'}. Please ensure the log_activity function exists in the database.`) 
          };
        }
        
        return { success: true, logId: insertData.id };
      } catch (fallbackError) {
        return { 
          success: false, 
          error: new Error(`Failed to log activity: ${error.message || 'Unknown error'}. Please ensure the log_activity function exists in the database.`) 
        };
      }
    }

    if (!data) {
      // RPC succeeded but returned no data, try direct insert
      try {
        // Explicitly set created_at to current UTC timestamp for consistency
        const nowFallback = new Date().toISOString();
        
        const { data: insertData, error: insertError } = await supabase
          .from('activity_logs')
          .insert({
            user_id: user.id,
            user_username: userUsername,
            user_email: userEmail,
            user_role: userRole,
            action_type: actionType,
            action_category: actionCategory,
            description: description,
            details: details,
            target_type: targetType,
            target_id: targetId,
            ip_address: ipAddress,
            user_agent: finalUserAgent,
            created_at: nowFallback, // Explicitly set timestamp
          })
          .select('id')
          .single();
        
        if (insertError) {
          return { success: false, error: new Error('Failed to log activity: RPC returned no data and direct insert failed') };
        }
        
        return { success: true, logId: insertData.id };
      } catch (fallbackError) {
        return { success: false, error: new Error('Failed to log activity: RPC returned no data and direct insert failed') };
      }
    }

    return { success: true, logId: data };
  } catch (error) {
    return { success: false, error };
  }
};

/**
 * Predefined action types for consistency
 */
export const ActionTypes = {
  // User management
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  ROLE_CHANGED: 'role_changed',
  STATUS_CHANGED: 'status_changed',
  PASSWORD_CHANGED: 'password_changed',
  BULK_USER_ACTION: 'bulk_user_action',
  
  // Invoice management
  INVOICE_CREATED: 'invoice_created',
  INVOICE_UPDATED: 'invoice_updated',
  INVOICE_DELETED: 'invoice_deleted',
  INVOICE_SENT: 'invoice_sent',
  INVOICE_RESENT: 'invoice_resent',
  INVOICE_STATUS_CHANGED: 'invoice_status_changed',
  INVOICE_MARKED_AS_NOTIFIED: 'invoice_marked_as_notified',
  INVOICE_PAID: 'invoice_paid',
  INVOICE_CANCELLED: 'invoice_cancelled',
  INVOICE_VIEWED: 'invoice_viewed',
  
  // System
  LOGIN: 'login',
  LOGOUT: 'logout',
  SYSTEM_CONFIG_CHANGED: 'system_config_changed',
  
  // Blacklist management
  BLACKLIST_ADDED: 'blacklist_added',
  BLACKLIST_UPDATED: 'blacklist_updated',
  BLACKLIST_DELETED: 'blacklist_deleted',
  
  // Security
  UNAUTHORIZED_ACCESS_ATTEMPT: 'unauthorized_access_attempt',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  PASSWORD_RESET_REQUESTED: 'password_reset_requested',
};

/**
 * Predefined action categories
 */
export const ActionCategories = {
  USER_MANAGEMENT: 'user_management',
  INVOICE_MANAGEMENT: 'invoice_management',
  BLACKLIST_MANAGEMENT: 'blacklist_management', // Note: Use 'security' if database constraint doesn't allow this
  SYSTEM: 'system',
  SECURITY: 'security',
};

/**
 * Helper function to log user management actions
 */
export const logUserAction = async (actionType, description, details = null, targetUserId = null) => {
  return logActivity({
    actionType,
    actionCategory: ActionCategories.USER_MANAGEMENT,
    description,
    details,
    targetType: 'user',
    targetId: targetUserId,
  });
};

/**
 * Helper function to log invoice management actions
 */
export const logInvoiceAction = async (actionType, description, details = null, targetInvoiceId = null) => {
  return logActivity({
    actionType,
    actionCategory: ActionCategories.INVOICE_MANAGEMENT,
    description,
    details,
    targetType: 'invoice',
    targetId: targetInvoiceId,
  });
};

/**
 * Helper function to log security-related actions
 */
export const logSecurityAction = async (actionType, description, details = null) => {
  return logActivity({
    actionType,
    actionCategory: ActionCategories.SECURITY,
    description,
    details,
    targetType: 'system',
  });
};

