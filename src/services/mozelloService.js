import { supabase } from '../lib/supabase';

/**
 * Mozello API Service
 * Handles product fetching and stock updates via Supabase Edge Functions
 */
export const mozelloService = {
  /**
   * Fetch products from Mozello API via Edge Function
   * Only returns products that are visible and available for purchase
   */
  async getProducts() {
    try {
      // Get current session for auth
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated - please log in');
      }
      
      // Call Edge Function with explicit auth header
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/fetch-mozello-products`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': supabase.supabaseKey,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Edge Function returned ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      return data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get a single product by ID
   */
  async getProductById(productId) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_MOZELLO_API_URL}/products/${productId}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_MOZELLO_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch product from Mozello');
      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update stock when invoice is paid (called via Edge Function)
   * This triggers the Supabase Edge Function that handles stock updates
   */
  async updateStock(invoiceId) {
    try {
      const { data, error } = await supabase.functions.invoke(
        'update-mozello-stock',
        {
          body: { invoice_id: invoiceId },
        }
      );
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  },
};

