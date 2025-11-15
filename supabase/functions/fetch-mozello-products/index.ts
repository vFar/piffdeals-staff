import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Mozello API credentials from environment
    const MOZELLO_API_KEY = Deno.env.get('MOZELLO_API_KEY');
    const MOZELLO_API_BASE = 'https://api.mozello.com/v1';

    if (!MOZELLO_API_KEY) {
      console.error('MOZELLO_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'MOZELLO_API_KEY not configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log('Fetching products from Mozello API...');

    // Fetch products from Mozello API
    const response = await fetch(`${MOZELLO_API_BASE}/store/products/`, {
      headers: {
        'Authorization': `ApiKey ${MOZELLO_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mozello API error:', errorText);
      return new Response(
        JSON.stringify({ error: `Failed to fetch products from Mozello: ${response.status}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const data = await response.json();
    console.log(`Fetched ${data.products?.length || 0} products from Mozello`);

    // Filter products to only show available ones
    const availableProducts = (data.products || []).filter((product: any) => {
      // Product must be visible
      if (!product.visible) return false;

      // If stock tracking is enabled (stock is not null), check stock > 0
      // If stock is null, product has unlimited stock
      if (product.stock !== null && product.stock <= 0) return false;

      // If product has variants, check if any variant has stock
      if (product.variants && product.variants.length > 0) {
        const hasAvailableVariant = product.variants.some((variant: any) => {
          return variant.stock === null || variant.stock > 0;
        });
        if (!hasAvailableVariant) return false;
      }

      return true;
    });

    console.log(`Returning ${availableProducts.length} available products`);

    return new Response(
      JSON.stringify({ products: availableProducts }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in fetch-mozello-products function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
