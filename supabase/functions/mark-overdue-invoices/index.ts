// Mark Overdue Invoices Edge Function
// Marks invoices as overdue when due_date has passed (due_date < CURRENT_DATE)
// Should be called daily via cron job (or manually for testing)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get current date in YYYY-MM-DD format (UTC)
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD
    
    // Get all sent/pending invoices with due_date that has passed
    // Use SQL to filter: due_date < CURRENT_DATE
    const { data: allInvoices, error: fetchError } = await supabase
      .from('invoices')
      .select('id, invoice_number, due_date, status')
      .in('status', ['sent', 'pending'])
      .not('due_date', 'is', null)
      .lt('due_date', todayStr) // due_date < today

    if (fetchError) {
      throw fetchError
    }

    // Debug: Log all invoices found
    const debugInfo = {
      total_found: allInvoices?.length || 0,
      current_date: todayStr,
      invoices_checked: (allInvoices || []).map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        status: inv.status,
        due_date: inv.due_date,
        is_overdue: inv.due_date ? inv.due_date < todayStr : false
      }))
    }
    
    const overdueInvoices = allInvoices || []

    if (overdueInvoices.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          marked_overdue: 0,
          invoices: [],
          message: 'No invoices to mark as overdue',
          debug: debugInfo
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Update invoices to overdue status
    const invoiceIds = overdueInvoices.map(inv => inv.id)
    
    const { data: updatedInvoices, error: updateError } = await supabase
      .from('invoices')
      .update({ 
        status: 'overdue',
        updated_at: new Date().toISOString()
      })
      .in('id', invoiceIds)
      .select('id, invoice_number')

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({
        success: true,
        marked_overdue: updatedInvoices?.length || 0,
        invoices: updatedInvoices || [],
        message: `Successfully marked ${updatedInvoices?.length || 0} invoice(s) as overdue`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to mark overdue invoices',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})




