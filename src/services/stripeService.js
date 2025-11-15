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

      if (error) throw error;
      
      return {
        paymentUrl: data.payment_url,
        paymentLinkId: data.payment_link_id,
      };
    } catch (error) {
      console.error('Error creating Stripe payment link:', error);
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


