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
      console.error('[ActivityLog] User not authenticated:', userError);
      return { success: false, error: new Error('User not authenticated') };
    }

    // Get IP address and user agent from browser if not provided
    let finalIpAddress = ipAddress;
    let finalUserAgent = userAgent;
    
    // Try to get IP from request headers (if available in Edge Function context)
    // In browser context, we can't get real IP, but we can get user agent
    if (!finalUserAgent && typeof navigator !== 'undefined') {
      finalUserAgent = navigator.userAgent;
    }

    // Get user profile first (needed for both RPC and direct insert)
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('username, email, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.warn('[ActivityLog] Could not fetch user profile:', profileError);
    }

    // Prepare user data for logging
    const userUsername = userProfile?.username || user.user_metadata?.username || 'Unknown';
    const userEmail = userProfile?.email || user.email || 'unknown@example.com';
    const userRole = userProfile?.role || 'employee';

    // Call the database function to log activity
    // The function uses SECURITY DEFINER so any authenticated user can call it
    // The function accepts details as TEXT (JSON string) and converts to JSONB internally
    console.log('[ActivityLog] Attempting to log:', {
      actionType,
      actionCategory,
      description,
      userId: user.id,
      username: userUsername
    });
    
    const { data, error } = await supabase.rpc('log_activity', {
      p_user_id: user.id,
      p_action_type: actionType,
      p_action_category: actionCategory,
      p_description: description,
      p_details: details ? JSON.stringify(details) : null,
      p_target_type: targetType,
      p_target_id: targetId,
      p_ip_address: finalIpAddress,
      p_user_agent: finalUserAgent,
    });

    if (error) {
      console.error('[ActivityLog] RPC call failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // Always try direct insert as fallback if RPC fails
      console.warn('[ActivityLog] Attempting direct insert as fallback...');
      try {
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
            ip_address: finalIpAddress,
            user_agent: finalUserAgent,
          })
          .select('id')
          .single();
        
        if (insertError) {
          console.error('[ActivityLog] Direct insert also failed:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint
          });
          
          // Return the original RPC error, not the insert error
          return { 
            success: false, 
            error: new Error(`Failed to log activity: ${error.message || 'Unknown error'}. Please ensure the log_activity function exists in the database.`) 
          };
        }
        
        console.log('[ActivityLog] Successfully logged via direct insert, log ID:', insertData.id);
        return { success: true, logId: insertData.id };
      } catch (fallbackError) {
        console.error('[ActivityLog] Fallback insert exception:', fallbackError);
        return { 
          success: false, 
          error: new Error(`Failed to log activity: ${error.message || 'Unknown error'}. Please ensure the log_activity function exists in the database.`) 
        };
      }
    }

    if (!data) {
      console.warn('[ActivityLog] RPC returned no data, trying direct insert...');
      // RPC succeeded but returned no data, try direct insert
      try {
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
            ip_address: finalIpAddress,
            user_agent: finalUserAgent,
          })
          .select('id')
          .single();
        
        if (insertError) {
          console.error('[ActivityLog] Direct insert failed:', insertError);
          return { success: false, error: new Error('Failed to log activity: RPC returned no data and direct insert failed') };
        }
        
        console.log('[ActivityLog] Successfully logged via direct insert, log ID:', insertData.id);
        return { success: true, logId: insertData.id };
      } catch (fallbackError) {
        console.error('[ActivityLog] Fallback insert exception:', fallbackError);
        return { success: false, error: new Error('Failed to log activity: RPC returned no data and direct insert failed') };
      }
    }

    console.log('[ActivityLog] Successfully logged via RPC, log ID:', data);
    return { success: true, logId: data };
  } catch (error) {
    console.error('[ActivityLog] Unexpected error:', error);
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
  INVOICE_PAID: 'invoice_paid',
  INVOICE_CANCELLED: 'invoice_cancelled',
  INVOICE_VIEWED: 'invoice_viewed',
  
  // System
  LOGIN: 'login',
  LOGOUT: 'logout',
  SYSTEM_CONFIG_CHANGED: 'system_config_changed',
  
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

