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
      console.warn('Cannot log activity: User not authenticated', userError);
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

    // Call the database function to log activity
    // Note: This requires the user to be a super_admin OR we need to use service role
    // For now, we'll use RPC call which will be restricted by RLS
    // The function accepts details as TEXT (JSON string) and converts to JSONB internally
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
      // If error is permission denied, it's expected for non-super-admins
      // We'll log it but not throw (activity logging should not break the main flow)
      if (error.code === '42501' || error.message?.includes('permission')) {
        console.warn('Activity logging not available (permission denied):', error.message);
        return { success: false, error: new Error('Permission denied') };
      }
      
      console.error('Error logging activity:', error);
      return { success: false, error };
    }

    return { success: true, logId: data };
  } catch (error) {
    console.error('Exception logging activity:', error);
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
  INVOICE_STATUS_CHANGED: 'invoice_status_changed',
  INVOICE_PAID: 'invoice_paid',
  
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

