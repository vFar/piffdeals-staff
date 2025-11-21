import { supabase } from '../lib/supabase';

/**
 * Stripe Service
 * Handles Stripe payment link generation and status checking
 */
export const stripeService = {
  /**
   * Generate Stripe Payment Link for an invoice
   * This happens when employee clicks "Send Invoice"
   */
  async createPaymentLink(invoiceId) {
    try {
      // Call your Edge Function to create Stripe Payment Link
      const { data, error } = await supabase.functions.invoke(
        'create-stripe-payment-link',
        {
          body: { invoice_id: invoiceId },
        }
      );

      if (error) {
        // Supabase functions.invoke error structure:
        // error.message - usually contains the error
        // error.context - may contain Response object with the actual error body
        
        let errorMessage = error.message || 'Failed to create payment link';
        let errorDetails = null;
        
        // Try to extract error from context (Response object)
        if (error.context) {
          // If context is a Response object, read its body
          if (error.context instanceof Response || (error.context.status && error.context.text)) {
            try {
              // Try to read the response body
              const response = error.context;
              if (response.text) {
                const text = await response.text();
                try {
                  const body = JSON.parse(text);
                  if (body.error) {
                    errorMessage = body.error;
                    errorDetails = body.details || body.message;
                  }
                } catch (e) {
                  // If not JSON, use the text as error message
                  if (text) {
                    errorMessage = text;
                  }
                }
              }
            } catch (e) {
              // Could not read error response body
            }
          } else if (error.context.body) {
            // Context has body property
            try {
              const body = typeof error.context.body === 'string' 
                ? JSON.parse(error.context.body) 
                : error.context.body;
              if (body.error) {
                errorMessage = body.error;
                errorDetails = body.details;
              }
            } catch (e) {
              // Could not parse error context body
            }
          }
        }
        
        // If data exists and contains error, use it (shouldn't happen with 500, but just in case)
        if (data?.error) {
          errorMessage = data.error;
          errorDetails = data.details;
        }
        
        // Create enhanced error with all details
        const enhancedError = new Error(errorMessage + (errorDetails ? `: ${errorDetails}` : ''));
        enhancedError.originalError = error;
        enhancedError.errorDetails = data;
        throw enhancedError;
      }
      
      // Check if response contains an error (edge function returned 200 but with error field)
      if (data?.error) {
        throw new Error(data.error + (data.details ? `: ${data.details}` : ''));
      }
      
      // Handle different possible response structures
      // Supabase functions.invoke returns the JSON response directly
      // But sometimes it might be wrapped or the edge function might return different structure
      let paymentUrl = null;
      let paymentLinkId = null;
      
      // Try different possible structures
      if (data?.payment_url) {
        paymentUrl = data.payment_url;
        paymentLinkId = data.payment_link_id;
      } else if (data?.data?.payment_url) {
        paymentUrl = data.data.payment_url;
        paymentLinkId = data.data.payment_link_id;
      } else if (data?.success && data?.payment_url) {
        paymentUrl = data.payment_url;
        paymentLinkId = data.payment_link_id;
      } else if (typeof data === 'string') {
        // If response is a string, try to parse it
        try {
          const parsed = JSON.parse(data);
          paymentUrl = parsed.payment_url || parsed.data?.payment_url;
          paymentLinkId = parsed.payment_link_id || parsed.data?.payment_link_id;
        } catch (e) {
          // Failed to parse string response
        }
      }
      
      if (!paymentUrl) {
        // Don't throw error - let the database update handle it
        // The edge function should have saved it to the database
        // We'll refresh from database instead
        return null;
      }
      
      return {
        paymentUrl,
        paymentLinkId,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Check payment status (optional - for manual refresh)
   */
  async checkPaymentStatus(invoiceId) {
    const { data, error } = await supabase.functions.invoke(
      'check-stripe-payment-status',
      {
        body: { invoice_id: invoiceId },
      }
    );

    if (error) throw error;
    return data;
  },
};







