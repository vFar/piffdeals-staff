// Supabase Edge Function: Delete Old Draft Invoices
// This function runs as a cron job to delete draft invoices older than 3 days

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Calculate the date 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const cutoffDate = threeDaysAgo.toISOString();

    // Find draft invoices older than 3 days
    const { data: oldDrafts, error: selectError } = await supabaseClient
      .from('invoices')
      .select('id, invoice_number, created_at, customer_name')
      .eq('status', 'draft')
      .lt('created_at', cutoffDate);

    if (selectError) {
      throw selectError;
    }

    if (!oldDrafts || oldDrafts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No old draft invoices to delete',
          deleted_count: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get all invoice IDs
    const invoiceIds = oldDrafts.map((invoice) => invoice.id);

    // Delete associated invoice items first (foreign key constraint)
    const { error: itemsDeleteError } = await supabaseClient
      .from('invoice_items')
      .delete()
      .in('invoice_id', invoiceIds);

    if (itemsDeleteError) {
      throw itemsDeleteError;
    }

    // Delete the invoices
    const { error: invoicesDeleteError } = await supabaseClient
      .from('invoices')
      .delete()
      .in('id', invoiceIds);

    if (invoicesDeleteError) {
      throw invoicesDeleteError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted ${oldDrafts.length} old draft invoice(s)`,
        deleted_count: oldDrafts.length,
        deleted_invoices: oldDrafts.map((inv) => ({
          invoice_number: inv.invoice_number,
          customer_name: inv.customer_name,
          created_at: inv.created_at,
        })),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});






