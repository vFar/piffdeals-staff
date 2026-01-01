/**
 * Error Handler Utility
 * Sanitizes errors for production - hides backend/database details from users
 */

const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

/**
 * Get user-friendly error message (hides backend details in production)
 * @param {Error|string} error - The error object or message
 * @param {string} defaultMessage - Default message to show if error should be hidden (default: generic error message)
 * @returns {string} User-friendly error message
 */
export const getUserFriendlyError = (error, defaultMessage = 'Kaut kas nogāja greizi. Lūdzu, mēģiniet vēlāk.') => {
  // In development, show full error for debugging
  if (isDevelopment) {
    if (error instanceof Error) {
      return error.message || defaultMessage;
    }
    return error || defaultMessage;
  }

  // In production, hide backend/database errors
  if (error instanceof Error) {
    const errorMessage = error.message || '';
    const errorString = errorMessage.toLowerCase();

    // Check if it's a known user-facing error (don't hide these)
    const userFacingErrors = [
      'invalid login credentials',
      'invalid email or password',
      'email already exists',
      'password too short',
      'konts bloķēts',
      'konts nav aktīvs',
      'bloķēts',
      'neizdevās',
    ];

    const isUserFacing = userFacingErrors.some(phrase => errorString.includes(phrase.toLowerCase()));

    if (isUserFacing) {
      return errorMessage;
    }

    // Check if it's a network/connection error
    if (
      errorString.includes('network') ||
      errorString.includes('fetch') ||
      errorString.includes('connection') ||
      errorString.includes('timeout')
    ) {
      return 'Nav savienojuma ar serveri. Pārbaudiet interneta savienojumu un mēģiniet vēlāk.';
    }

    // Hide backend/database/internal errors
    if (
      errorString.includes('database') ||
      errorString.includes('sql') ||
      errorString.includes('query') ||
      errorString.includes('supabase') ||
      errorString.includes('internal server') ||
      errorString.includes('500') ||
      errorString.includes('database error') ||
      errorString.includes('constraint') ||
      errorString.includes('foreign key') ||
      errorString.includes('rpc') ||
      errorString.includes('edge function')
    ) {
      return defaultMessage;
    }

    // Default: show generic message in production
    return defaultMessage;
  }

  // If it's a string, check if it contains backend keywords
  if (typeof error === 'string') {
    const errorLower = error.toLowerCase();
    if (
      errorLower.includes('database') ||
      errorLower.includes('sql') ||
      errorLower.includes('supabase') ||
      errorLower.includes('internal server') ||
      errorLower.includes('500')
    ) {
      return defaultMessage;
    }
  }

  return error || defaultMessage;
};

/**
 * Log error to console (only in development or for debugging)
 * @param {Error|string} error - The error to log
 * @param {string} context - Context where error occurred (optional)
 */
export const logError = (error, context = '') => {
  // Always log to console for debugging (even in production, but developers can see it)
  if (context) {
    console.error(`[Error in ${context}]`, error);
  } else {
    console.error('[Error]', error);
  }

  // In production, you could also send to error tracking service (Sentry, etc.)
  // if (isProduction) {
  //   Sentry.captureException(error, { contexts: { context } });
  // }
};

/**
 * Handle API error and return user-friendly message
 * @param {Response} response - Fetch response object
 * @param {Error} error - Error object
 * @param {string} defaultMessage - Default message
 * @returns {string} User-friendly error message
 */
export const handleApiError = async (response, error, defaultMessage = 'Kaut kas nogāja greizi. Lūdzu, mēģiniet vēlāk.') => {
  // Log full error to console
  logError(error, 'API Request');

  if (response) {
    try {
      const errorData = await response.json();
      const errorMessage = errorData.error || errorData.message || error?.message;
      
      // Check if it's a user-facing error
      if (errorMessage) {
        const lowerMessage = errorMessage.toLowerCase();
        
        // User-facing errors (show to user)
        if (
          lowerMessage.includes('invalid') ||
          lowerMessage.includes('email') ||
          lowerMessage.includes('password') ||
          lowerMessage.includes('konts') ||
          lowerMessage.includes('bloķēts') ||
          lowerMessage.includes('aktīvs')
        ) {
          return errorMessage;
        }

        // Network errors
        if (response.status === 0 || response.status >= 500) {
          return 'Nav savienojuma ar serveri. Pārbaudiet interneta savienojumu un mēģiniet vēlāk.';
        }

        // Client errors (400-499) - might be user-facing
        if (response.status >= 400 && response.status < 500) {
          // Check if it's a known user-facing error
          if (
            lowerMessage.includes('missing') ||
            lowerMessage.includes('required') ||
            lowerMessage.includes('format')
          ) {
            return errorMessage;
          }
          // Otherwise, return generic message
          return defaultMessage;
        }
      }
    } catch (parseError) {
      // Couldn't parse error response, use default
      logError(parseError, 'Error parsing API error response');
    }
  }

  // Use generic error handler
  return getUserFriendlyError(error, defaultMessage);
};

/**
 * Developer contact information (shown in production error pages)
 */
export const DEVELOPER_CONTACT = {
  message: 'Ja kļūda atkārtojas, lūdzu, sazinieties ar izstrādātāju.',
  email: 'support@piffdeals.lv', // Update this with your actual contact
};

