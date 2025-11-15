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
      console.log('Calling Edge Function: fetch-mozello-products');
      
      // Get current session for auth
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session exists:', !!session);
      
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
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge Function error:', errorText);
        throw new Error(`Edge Function returned ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`Successfully fetched ${data.products?.length || 0} products`);
      
      return data;
    } catch (error) {
      console.error('Error fetching Mozello products:', error);
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
      console.error('Error fetching Mozello product:', error);
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
      console.error('Error updating Mozello stock:', error);
      throw error;
    }
  },
};

